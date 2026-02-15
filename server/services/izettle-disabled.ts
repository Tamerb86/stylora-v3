/**
 * iZettle Payment Integration Service - DISABLED
 * 
 * This service has been disabled in favor of Stripe Connect.
 * All functions throw errors indicating that iZettle is no longer supported.
 * 
 * Reason for deprecation:
 * - Stripe Connect provides better SaaS integration with destination charges
 * - Simpler onboarding experience for salons
 * - Better multi-tenant support
 * - More reliable payment processing
 * 
 * Migration path:
 * - Salons should connect their Stripe accounts via Settings > Payments
 * - Existing iZettle connections will continue to work but new connections are disabled
 */

const IZETTLE_DEPRECATED_MESSAGE = 
  "iZettle-integrasjonen er deaktivert. Vennligst bruk Stripe Connect i stedet. " +
  "Gå til Innstillinger > Betalinger for å koble til Stripe-kontoen din.";

const IZETTLE_DEPRECATED_MESSAGE_EN = 
  "iZettle integration has been disabled. Please use Stripe Connect instead. " +
  "Go to Settings > Payments to connect your Stripe account.";

/**
 * Check if iZettle is enabled (always returns false)
 */
export function isIZettleEnabled(): boolean {
  return false;
}

/**
 * Get deprecation message
 */
export function getDeprecationMessage(language: "no" | "en" = "no"): string {
  return language === "no" ? IZETTLE_DEPRECATED_MESSAGE : IZETTLE_DEPRECATED_MESSAGE_EN;
}

/**
 * Generate iZettle OAuth authorization URL - DISABLED
 * @deprecated Use Stripe Connect instead
 */
export function getAuthorizationUrl(_tenantId: string): never {
  throw new Error(IZETTLE_DEPRECATED_MESSAGE);
}

/**
 * Exchange authorization code for access token - DISABLED
 * @deprecated Use Stripe Connect instead
 */
export async function exchangeCodeForToken(_code: string): Promise<never> {
  throw new Error(IZETTLE_DEPRECATED_MESSAGE);
}

/**
 * Refresh access token - DISABLED
 * @deprecated Use Stripe Connect instead
 */
export async function refreshAccessToken(_refreshToken: string): Promise<never> {
  throw new Error(IZETTLE_DEPRECATED_MESSAGE);
}

/**
 * Create Reader Link - DISABLED
 * @deprecated Use Stripe Terminal instead
 */
export async function createReaderLink(
  _accessToken: string,
  _linkName?: string
): Promise<never> {
  throw new Error(IZETTLE_DEPRECATED_MESSAGE);
}

/**
 * Pair Reader with Code - DISABLED
 * @deprecated Use Stripe Terminal instead
 */
export async function pairReaderWithCode(
  _accessToken: string,
  _code: string,
  _deviceName?: string
): Promise<never> {
  throw new Error(IZETTLE_DEPRECATED_MESSAGE);
}

/**
 * Create Payment - DISABLED
 * @deprecated Use Stripe Connect instead
 */
export async function createPayment(
  _accessToken: string,
  _amount: number,
  _currency?: string
): Promise<never> {
  throw new Error(IZETTLE_DEPRECATED_MESSAGE);
}

/**
 * Get Payment Status - DISABLED
 * @deprecated Use Stripe Connect instead
 */
export async function getPaymentStatus(
  _accessToken: string,
  _purchaseUUID: string
): Promise<never> {
  throw new Error(IZETTLE_DEPRECATED_MESSAGE);
}

// Re-export encryption functions for backwards compatibility with existing data
export { encryptToken, decryptToken } from "./izettle-encryption";
