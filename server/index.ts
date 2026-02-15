import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  validateEnvironmentOrExit,
  getEnvironmentSummary,
} from "./_core/validate-env";
import { logger } from "./_core/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Validate environment variables before starting
  validateEnvironmentOrExit();

  // Log environment summary
  const envSummary = getEnvironmentSummary();
  logger.info("Starting server with configuration", envSummary);
  const app = express();
  const server = createServer(app);

  // Add CSP headers to allow Stripe Terminal connections
  app.use((_req, res, next) => {
    // Permissive CSP for Stripe Terminal local reader connections
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://*.stripe.com https://*.cloudinary.com https://*.googleapis.com",
        "connect-src 'self' https://*.stripe.com https://*.stripe-terminal-local-reader.net wss://*.stripe-terminal-local-reader.net https://api.stripe.com https://merchant-terminal-api.stripe.com wss://stripeterminalconnection.stripe.com https://terminal-simulator.stripe.com https://ppm.stripe.com https://gator.stripe.com",
        "frame-src 'self' https://js.stripe.com https://*.stripe.com",
        "worker-src 'self' blob:",
      ].join("; ")
    );
    next();
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(error => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
