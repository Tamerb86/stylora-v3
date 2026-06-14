/**
 * Environment variable validation
 * Ensures all required environment variables are present before starting the server
 */

import { logger, logError } from "./logger";

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * List of required environment variables for the application to function
 */
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "OWNER_OPEN_ID",
] as const;

/**
 * List of recommended but not strictly required environment variables.
 *
 * VITE_APP_ID and the SUPABASE_* keys are RECOMMENDED, not required: the app's
 * primary auth is email/password + JWT, and Supabase is an optional integration
 * (deployments without it run fine). Hard-requiring them previously crash-looped
 * production whenever they were unset. They warn loudly but don't block startup.
 */
const RECOMMENDED_ENV_VARS = [
  "VITE_APP_ID",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_KEY",
  "VITE_APP_TITLE",
  "VITE_APP_LOGO",
] as const;

/**
 * Optional environment variables for external integrations
 */
const OPTIONAL_ENV_VARS = [
  "OPENAI_API_KEY", // For AI features (image generation, voice transcription)
  "VITE_GOOGLE_MAPS_API_KEY", // For Google Maps integration
  "SMTP_HOST", // For email notifications
  "AWS_ACCESS_KEY_ID", // For S3 storage
  "STRIPE_SECRET_KEY", // For payment processing
] as const;

/**
 * Validate that all required environment variables are present
 */
export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check recommended variables
  for (const varName of RECOMMENDED_ENV_VARS) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validate environment and exit if critical variables are missing
 * Should be called at application startup
 */
export function validateEnvironmentOrExit(): void {
  logger.info("Validating environment variables...");

  const result = validateEnvironment();

  // Log warnings for missing recommended variables
  if (result.warnings.length > 0) {
    logger.warn("Some recommended environment variables are missing:", {
      missing: result.warnings,
    });
  }

  // Exit if required variables are missing
  if (!result.valid) {
    logError(
      "Critical environment variables are missing. Cannot start server.",
      undefined,
      {
        missing: result.missing,
      }
    );

    console.error("\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:");
    result.missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error(
      "\nPlease set these variables in your .env file or environment.\n"
    );

    process.exit(1);
  }

  logger.info("✅ All required environment variables are present");

  // Log additional validation info
  validateDatabaseUrl();
  validateJwtSecret();
  validateStripeWebhookSecret();
}

/**
 * Warn loudly when Stripe is enabled but the webhook signing secret is missing.
 * The webhook handler hard-rejects in this state, so payments confirmed via
 * webhook will silently fail until the secret is configured.
 */
function validateStripeWebhookSecret(): void {
  const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

  if (stripeEnabled && !hasWebhookSecret) {
    logger.error(
      "STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is missing. " +
        "Stripe webhooks will be REJECTED until this is configured."
    );
  }
}

/**
 * Validate DATABASE_URL format
 */
function validateDatabaseUrl(): void {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  try {
    const url = new URL(dbUrl);

    if (!url.protocol.startsWith("mysql")) {
      logger.warn(
        "DATABASE_URL does not appear to be a MySQL connection string",
        {
          protocol: url.protocol,
        }
      );
    }

    if (!url.hostname) {
      logger.warn("DATABASE_URL is missing hostname");
    }

    logger.info("Database URL validated", {
      protocol: url.protocol,
      host: url.hostname,
      database: url.pathname.slice(1),
    });
  } catch (error) {
    logger.warn("DATABASE_URL format could not be parsed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Validate JWT_SECRET strength
 */
function validateJwtSecret(): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) return;

  if (secret.length < 32) {
    logger.warn(
      "JWT_SECRET is shorter than recommended (should be at least 32 characters)",
      {
        length: secret.length,
      }
    );
  }

  if (
    secret === "your-secret-key" ||
    secret === "change-me" ||
    secret === "secret"
  ) {
    logger.error(
      "JWT_SECRET is using a default/weak value. This is a CRITICAL security risk!"
    );
  }

  logger.info("JWT_SECRET validated", {
    length: secret.length,
    strong: secret.length >= 32,
  });
}

/**
 * Get a safe summary of environment configuration (without sensitive values)
 */
export function getEnvironmentSummary(): Record<string, string> {
  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    DATABASE_CONFIGURED: process.env.DATABASE_URL ? "Yes" : "No",
    JWT_CONFIGURED: process.env.JWT_SECRET ? "Yes" : "No",
    OPENAI_CONFIGURED: process.env.OPENAI_API_KEY ? "Yes" : "No",
    GOOGLE_MAPS_CONFIGURED: process.env.VITE_GOOGLE_MAPS_API_KEY ? "Yes" : "No",
    STRIPE_CONFIGURED: process.env.STRIPE_SECRET_KEY ? "Yes" : "No",
    APP_ID: process.env.VITE_APP_ID || "Not set",
    APP_TITLE: process.env.VITE_APP_TITLE || "Not set",
  };
}
