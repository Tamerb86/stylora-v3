import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { registerAuthRoutes } from "./auth-simple";
import { registerRefreshEndpoint } from "./auth-refresh-endpoint";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startNotificationScheduler } from "../notificationScheduler";
import { scheduleBackups } from "../services/backup";
import { handleStripeWebhook } from "../stripe-webhook";
import { handleVippsCallback } from "../vipps-callback";
import * as Sentry from "@sentry/node";
import { getDb } from "../db";

const getRequestPath = (req: express.Request) =>
  req.path || (req.url ? req.url.split("?")[0] : "");

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Ignore known errors
    ignoreErrors: [
      "Can't add new command when connection is in closed state",
      "Connection lost: The server closed the connection",
    ],
  });
}

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "For mange forespørsler. Vennligst vent litt før du prøver igjen.",
    retryAfter: "15 minutter",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: req => {
      // Skip rate limiting for specific webhook, callback, and tRPC URLs
      // Use req.path (excludes query params) for consistent matching, fallback to req.url without query string
      const path = getRequestPath(req);
      return (
        path.startsWith("/api/trpc") || // Exclude tRPC requests
        path === "/api/stripe/webhook" ||
        path === "/api/vipps/callback"
      );
  },
});

// Webhook/callback rate limiter - lighter limits for payment webhooks
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Allow up to 100 webhook calls per minute
  message: {
    error: "For mange webhook forespørsler.",
    retryAfter: "1 minutt",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication - 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login attempts per windowMs
  message: {
    error: "For mange innloggingsforsøk. Vennligst vent 15 minutter.",
    retryAfter: "15 minutter",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public booking rate limiter - 20 requests per minute
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per minute
  message: {
    error: "For mange bookingforespørsler. Vennligst vent litt.",
    retryAfter: "1 minutt",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload rate limiter - 30 requests per minute for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: "For mange opplastingsforespørsler. Vennligst vent litt.",
    retryAfter: "1 minutt",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.listen(port, () => {
      srv.close(() => resolve(true));
    });
    srv.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy for rate limiting behind reverse proxy
  app.set(
    "trust proxy",
    process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 1
  );

  // ============================================================================
  // SECURITY MIDDLEWARE
  // ============================================================================

  // Helmet for HTTP security headers (CSP disabled - handled manually below)
  const isDev = process.env.NODE_ENV === "development";

  // NOTE: CSP is intentionally disabled in Helmet and implemented manually below.
  // This is required for route-based CSP to enable Stripe Terminal local reader connections.
  // See extensive documentation in the CSP middleware section below.
  // codeql[js/insecure-helmet-configuration] - CSP is implemented securely via custom middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled - CSP is set manually below
      crossOriginEmbedderPolicy: false, // Allow embedding for Stripe
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
    })
  );

  // ============================================================================
  // ROUTE-BASED CONTENT SECURITY POLICY (CSP)
  // ============================================================================
  //
  // WHY ROUTE-BASED CSP IS NECESSARY:
  //
  // Stripe Terminal SDK connects to local readers (WisePOS E) using:
  // 1. Multi-level subdomains: https://192-168-10-199.k427i2stwjn76ximqdeu.device.stripe-terminal-local-reader.net
  // 2. Direct IP:PORT fallback: https://192.168.10.199:4427
  //
  // PROBLEM WITH CSP WILDCARDS:
  // - CSP wildcard patterns like https://*.stripe-terminal-local-reader.net do NOT match
  //   multi-level subdomains (*.*.stripe-terminal-local-reader.net)
  // - This is a fundamental limitation of CSP wildcard matching
  // - Cannot safely whitelist all possible IP addresses (192.168.*, 10.*, etc.) globally
  //
  // SOLUTION: ROUTE-BASED CSP
  // - Keep STRICT CSP (limited connect-src) for the entire application
  // - Apply RELAXED CSP (connect-src https: wss:) ONLY to Stripe Terminal routes:
  //   * /reader-management - Reader connection and management UI
  //   * /terminal-test - Terminal SDK testing page
  //   * /terminal - Terminal settings and configuration
  //   * /pos - Point of Sale (uses Terminal for payments)
  // - This minimizes security risk by limiting relaxed CSP to specific routes
  // - Other directives (script-src, frame-src, etc.) remain strict on all routes
  //
  // SECURITY: This is the recommended approach per Stripe Terminal documentation
  // and follows the principle of least privilege.
  // ============================================================================

  // Default Helmet CSP directives as baseline
  const defaultCspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();

  // Base connect-src for Stripe services (used in both strict and relaxed CSP)
  const baseStripeConnectSrc = [
    "https://api.stripe.com",
    "https://gator.stripe.com",
    "https://terminal-simulator.stripe.com",
    "https://ppp.stripe.com",
    "https://merchant-terminal-api.stripe.com",
    "wss://stripeterminalconnection.stripe.com",
    "https://*.stripe.com",
  ];

  // STRICT CSP: Applied to all routes by default
  // Does NOT include 'unsafe-inline' to maintain security
  const strictConnectSrc = [
    "'self'",
    ...baseStripeConnectSrc,
  ].join(" ");

  const strictCspDirectives = {
    ...defaultCspDirectives,
    "script-src": ["'self'", "https://js.stripe.com"].join(" "),
    "style-src": ["'self'"].join(" "),
    "font-src": ["'self'"].join(" "),
    "frame-src": [
      "'self'",
      "https://js.stripe.com",
      "https://checkout.stripe.com",
    ].join(" "),
    "connect-src": strictConnectSrc,
    "img-src": ["'self'", "data:", "https:"].join(" "),
  };

  // TERMINAL CSP: Applied ONLY to terminal-related routes
  // 
  // ⚠️ SECURITY NOTE: This policy includes 'unsafe-inline' for Stripe Terminal SDK
  // Stripe Terminal SDK (https://js.stripe.com/terminal/v1) requires:
  // - 'unsafe-inline' for script-src and style-src (SDK injects inline styles/scripts)
  // - https: and wss: wildcards for connect-src (local reader connections to dynamic IPs)
  // - Broad font-src for Terminal UI fonts
  //
  // This relaxed policy is ONLY applied to terminal pages:
  //   /reader-management, /terminal-test, /terminal, /pos
  // All other pages use STRICT_CSP without 'unsafe-inline'
  const terminalConnectSrc = [
    "'self'",
    "https:",  // Allows all HTTPS connections (for Stripe Terminal local readers)
    "wss:",    // Allows all WSS connections (for Stripe Terminal WebSocket)
    ...baseStripeConnectSrc,
  ].join(" ");

  const terminalCspDirectives = {
    ...defaultCspDirectives,
    "script-src": ["'self'", "https://js.stripe.com", "'unsafe-inline'"].join(" "),
    "style-src": ["'self'", "'unsafe-inline'"].join(" "),
    "font-src": ["'self'", "https:", "data:"].join(" "),
    "frame-src": [
      "'self'",
      "https://js.stripe.com",
      "https://checkout.stripe.com",
    ].join(" "),
    "connect-src": terminalConnectSrc,
    "img-src": ["'self'", "https:", "data:", "blob:"].join(" "),
  };

  // Convert CSP directives object to header string
  const cspDirectivesToString = (directives: Record<string, string>) => {
    return Object.entries(directives)
      .map(([key, value]) => `${key} ${value}`)
      .join("; ");
  };

  const strictCspHeader = cspDirectivesToString(strictCspDirectives);
  const terminalCspHeader = cspDirectivesToString(terminalCspDirectives);

  // Terminal route paths that require relaxed CSP
  // These are the ONLY routes where Stripe Terminal SDK is used
  const terminalPaths = [
    "/reader-management",
    "/terminal-test",
    "/terminal",
    "/pos",
  ];

  // Manual CSP middleware - applies appropriate CSP based on route
  app.use((req, res, next) => {
    // Skip CSP in development mode
    if (isDev) return next();

    const path = getRequestPath(req);
    
    // Check if current path is a terminal route
    const isTerminalPath = terminalPaths.some(terminalPath => {
      // Exact match
      if (path === terminalPath) return true;
      // Prefix match with path separator (prevents /pos matching /position)
      return path.startsWith(terminalPath) && path[terminalPath.length] === "/";
    });

    // Apply appropriate CSP header
    if (isTerminalPath) {
      res.setHeader("Content-Security-Policy", terminalCspHeader);
    } else {
      res.setHeader("Content-Security-Policy", strictCspHeader);
    }

    next();
  });

  // Apply rate limiting to API routes
  app.use("/api/auth", authLimiter); // Strict limit for auth
  app.use("/api/trpc/publicBooking", bookingLimiter); // Moderate limit for public booking
  app.use("/api", generalLimiter); // General limit for all API

  // Stripe webhook must receive raw body for signature verification
  // Register this route BEFORE the JSON body parser
  app.post(
    "/api/stripe/webhook",
    webhookLimiter,
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  // Vipps callback endpoint (must be registered before JSON parser)
  app.post(
    "/api/vipps/callback",
    webhookLimiter,
    express.json(),
    handleVippsCallback
  );

  // iZettle OAuth callback endpoint
  app.get("/api/izettle/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      console.log("[iZettle Callback] Received:", {
        code: code ? "present" : "missing",
        state: state ? "present" : "missing",
      });

      if (!code || !state) {
        console.error("[iZettle Callback] Missing parameters:", { code, state });
        return res.redirect(
          "/izettle/callback?izettle=error&message=" +
            encodeURIComponent("Missing code or state parameter")
        );
      }

      // Verify and decode state with HMAC signature
      const { verifyAndDecodeState } = await import("../services/izettle");
      const stateData = verifyAndDecodeState(state);

      if (!stateData || !stateData.tenantId) {
        console.error("[iZettle Callback] Invalid or expired state parameter");
        return res.redirect(
          "/izettle/callback?izettle=error&message=" +
            encodeURIComponent("Invalid or expired state parameter")
        );
      }

      const tenantId = stateData.tenantId;
      console.log("[iZettle Callback] Verified state:", { tenantId });

      // Exchange code for tokens
      console.log("[iZettle Callback] Exchanging code for tokens...");
      const { exchangeCodeForToken, encryptToken } = await import(
        "../services/izettle"
      );
      const tokens = await exchangeCodeForToken(code);
      console.log("[iZettle Callback] Tokens received successfully");

      // Save tokens to database
      console.log(
        "[iZettle Callback] Saving tokens to database for tenant:",
        tenantId
      );
      const { getDb } = await import("../db");
      const dbInstance = await getDb();
      console.log(
        "[iZettle Callback] Database instance:",
        dbInstance ? "connected" : "null"
      );

      if (!dbInstance) {
        console.error("[iZettle Callback] Database not available!");
        return res.redirect(
          "/izettle/callback?izettle=error&message=" +
            encodeURIComponent(
              "Database connection failed. Please contact support."
            )
        );
      }

      try {
        const { paymentProviders } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // Check if provider already exists (with tenantId filter)
        let existing: any;
        try {
          console.log(
            "[iZettle Callback] Querying existing provider for tenant:",
            tenantId
          );
          [existing] = await dbInstance
            .select()
            .from(paymentProviders)
            .where(
              and(
                eq(paymentProviders.providerType, "izettle"),
                eq(
                  paymentProviders.tenantId,
                  tenantId || "platform-admin-tenant"
                )
              )
            )
            .limit(1);
          console.log(
            "[iZettle Callback] Query result:",
            existing ? "found" : "not found"
          );
        } catch (dbError: any) {
          console.error(
            "[iZettle Callback] Database query failed:",
            dbError?.message
          );
          existing = null;
        }

        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        try {
          if (existing) {
            console.log(
              "[iZettle Callback] Updating existing provider:",
              existing.id
            );
            await dbInstance
              .update(paymentProviders)
              .set({
                accessToken: encryptToken(tokens.access_token),
                refreshToken: encryptToken(tokens.refresh_token),
                tokenExpiresAt: expiresAt,
                isActive: true,
                updatedAt: new Date(),
              })
              .where(eq(paymentProviders.id, existing.id));
            console.log("[iZettle Callback] Provider updated successfully");
          } else {
            console.log("[iZettle Callback] Creating new provider entry");

            const insertResult = await dbInstance
              .insert(paymentProviders)
              .values({
                tenantId: tenantId || "platform-admin-tenant",
                providerType: "izettle",
                providerName: "iZettle",
                accessToken: encryptToken(tokens.access_token),
                refreshToken: encryptToken(tokens.refresh_token),
                tokenExpiresAt: expiresAt,
                providerAccountId: null,
                providerEmail: null,
                config: null,
                isActive: true,
                isDefault: false,
              });

            console.log("[iZettle Callback] Insert result:", insertResult);

            // Verify insert
            const [verifyProvider] = await dbInstance
              .select()
              .from(paymentProviders)
              .where(
                and(
                  eq(
                    paymentProviders.tenantId,
                    tenantId || "platform-admin-tenant"
                  ),
                  eq(paymentProviders.providerType, "izettle")
                )
              )
              .limit(1);

            if (verifyProvider) {
              console.log(
                "[iZettle Callback] ✅ Provider saved with ID:",
                verifyProvider.id
              );
            } else {
              console.error(
                "[iZettle Callback] ❌ Provider not found after insert!"
              );
              throw new Error("Failed to verify provider insertion");
            }
          }
        } catch (dbError: any) {
          console.error("[iZettle Callback] Database save failed:", {
            message: dbError?.message,
            code: dbError?.code,
            errno: dbError?.errno,
            sqlState: dbError?.sqlState,
            sqlMessage: dbError?.sqlMessage,
            sql: dbError?.sql,
            stack: dbError?.stack,
          });
          return res.redirect(
            "/izettle/callback?izettle=error&message=" +
              encodeURIComponent("Failed to save connection. Please try again.")
          );
        }
      } catch (dbError: any) {
        console.error(
          "[iZettle Callback] Database operation failed:",
          dbError?.message
        );
        return res.redirect(
          "/izettle/callback?izettle=error&message=" +
            encodeURIComponent("Database error. Please try again.")
        );
      }

      res.redirect("/izettle/callback?izettle=connected");
    } catch (error: any) {
      console.error("iZettle callback error:", error);
      res.redirect(
        "/izettle/callback?izettle=error&message=" +
          encodeURIComponent(error?.message || "Unknown error")
      );
    }
  });

  // Storage upload endpoint with authentication and validation
  const ALLOWED_UPLOAD_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

  app.post(
    "/api/storage/upload",
    uploadLimiter,
    express.raw({ type: "*/*", limit: "10mb" }),
    async (req, res) => {
      try {
        // Authentication check
        const { authenticateRequest } = await import("./auth-simple");
        let authResult;
        try {
          authResult = await authenticateRequest(req);
        } catch (error) {
          console.error("[Storage Upload] Authentication error:", error);
          return res.status(401).json({ 
            error: "Authentication required",
            messageKey: "errors.notAuthenticated"
          });
        }

        if (!authResult) {
          return res.status(401).json({ 
            error: "Authentication required",
            messageKey: "errors.notAuthenticated"
          });
        }

        // Validate content type
        const contentType = String(req.headers["content-type"] || "");
        if (!ALLOWED_UPLOAD_TYPES.has(contentType)) {
          return res.status(415).json({
            error: "Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF",
            messageKey: "errors.invalidFileType"
          });
        }

        // Validate body
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ 
            error: "Empty body",
            messageKey: "errors.emptyFile"
          });
        }

        const { storagePut } = await import("../storage");
        const { nanoid } = await import("nanoid");

        const extensionMap: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "application/pdf": "pdf",
        };

        const ext = extensionMap[contentType];
        if (!ext) {
          return res.status(500).json({ 
            error: "Failed to determine file extension",
            messageKey: "errors.fileExtensionError"
          });
        }

        const filename = `uploads/${nanoid()}.${ext}`;
        const { url } = await storagePut(filename, req.body, contentType);
        res.json({ url });
      } catch (error: any) {
        console.error("Storage upload error:", error);
        res.status(500).json({ 
          error: error?.message || "Upload failed",
          messageKey: "errors.uploadFailed"
        });
      }
    }
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Auth routes
  registerAuthRoutes(app);
  registerRefreshEndpoint(app);

  // SEO routes - sitemap and robots.txt
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const { generateSitemap } = await import("../sitemap");
      const sitemap = generateSitemap();
      res.header("Content-Type", "application/xml");
      res.send(sitemap);
    } catch (error) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/robots.txt", (req, res) => {
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://www.stylora.no/sitemap.xml`;
    res.header("Content-Type", "text/plain");
    res.send(robotsTxt);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Sentry error handler (must be after all routes)
  if (process.env.SENTRY_DSN) {
    app.use((err: any, req: any, res: any, next: any) => {
      Sentry.captureException(err);
      console.error("Error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  } else {
    app.use((err: any, req: any, res: any, next: any) => {
      console.error("Error:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");

  const port =
    process.env.NODE_ENV === "production"
      ? preferredPort
      : await findAvailablePort(preferredPort);

  if (port !== preferredPort && process.env.NODE_ENV !== "production") {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Validate database connectivity on startup
    console.log("[Database] Validating database connection...");
    try {
      const dbInstance = await getDb();
      if (!dbInstance) {
        console.error("❌ [Database] CRITICAL: Database connection failed!");
        console.error(
          "[Database] Please check your DATABASE_URL environment variable"
        );
        console.error(
          "[Database] Server will continue but authentication will not work"
        );
      } else {
        console.log("✅ [Database] Connection validated successfully");
      }
    } catch (error) {
      console.error("❌ [Database] CRITICAL: Database validation error:", error);
      console.error(
        "[Database] Server will continue but authentication will not work"
      );
    }

    const instanceType = process.env.INSTANCE_TYPE;

    if (!instanceType || instanceType === "worker") {
      console.log(
        "[Scheduler] Starting schedulers (INSTANCE_TYPE:",
        instanceType || "not set",
        ")"
      );

      // Start notification scheduler for SMS reminders
      startNotificationScheduler();

      // Start database backup scheduler
      scheduleBackups();

      // Start auto clock-out scheduler
      const { startAutoClockOutScheduler } = await import(
        "../autoClockOutScheduler"
      );
      startAutoClockOutScheduler();

      // Start email notification scheduler
      const { startEmailScheduler } = await import("../emailScheduler");
      startEmailScheduler();
    } else {
      console.log(
        "[Scheduler] Skipping schedulers (INSTANCE_TYPE:",
        instanceType,
        ")"
      );
    }
  });
}

startServer().catch(console.error);
