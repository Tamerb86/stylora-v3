/**
 * Stripe Connect Service
 * 
 * This service handles all Stripe Connect operations for the SaaS platform.
 * It uses Destination Charges to ensure payments go directly to salon accounts.
 * 
 * Key Features:
 * - OAuth-based account connection
 * - Destination Charges (money goes directly to salon)
 * - Account status monitoring
 * - Automatic retry on failures
 */

import Stripe from "stripe";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { paymentSettings, tenants } from "../../drizzle/schema";
import {
  logStripeConnect,
  logPaymentCreated,
  logPaymentCompleted,
  logPaymentFailed,
} from "./paymentLogger";

// ============================================================================
// STRIPE CLIENT INITIALIZATION
// ============================================================================

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = ENV.stripeSecretKey;
    if (!secretKey) {
      throw new Error("Stripe secret key not configured");
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-11-17.clover",
    });
  }
  return stripeClient;
}

// ============================================================================
// TYPES
// ============================================================================

export interface StripeConnectStatus {
  connected: boolean;
  accountId: string | null;
  status: "connected" | "disconnected" | "pending" | "restricted";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
  connectedAt: Date | null;
}

export interface CreatePaymentIntentOptions {
  tenantId: string;
  amount: number; // In NOK (will be converted to øre)
  currency?: string;
  customerId?: number;
  appointmentId?: number;
  orderId?: number;
  description?: string;
  metadata?: Record<string, string>;
  applicationFeePercent?: number; // Platform fee percentage (e.g., 2.5 for 2.5%)
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  connectedAccountId: string;
}

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Generate OAuth authorization URL for Stripe Connect
 */
export function getStripeConnectAuthUrl(tenantId: string): string {
  const clientId = ENV.stripeConnectClientId;
  if (!clientId) {
    throw new Error("Stripe Connect client ID not configured");
  }

  const frontendUrl = process.env.VITE_FRONTEND_URL || "http://localhost:3000";
  const redirectUri = `${frontendUrl}/stripe/callback`;

  // Use tenantId as state for security verification
  const state = tenantId;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state: state,
    // Pre-fill some account information
    "stripe_user[business_type]": "company",
    "stripe_user[country]": "NO", // Norway
    "stripe_user[currency]": "nok",
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * Handle OAuth callback and connect account
 */
export async function handleStripeConnectCallback(
  code: string,
  tenantId: string
): Promise<{ success: boolean; accountId: string }> {
  const stripe = getStripe();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const accountId = response.stripe_user_id;
    if (!accountId) {
      throw new Error("No account ID received from Stripe");
    }

    // Get account details to check status
    const account = await stripe.accounts.retrieve(accountId);

    // Save to database
    const existing = await db
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.tenantId, tenantId))
      .limit(1);

    const settingsData = {
      stripeConnectedAccountId: accountId,
      stripeAccountStatus: account.charges_enabled ? "connected" : "pending",
      stripeConnectedAt: new Date(),
      cardEnabled: true,
    };

    if (existing.length > 0) {
      await db
        .update(paymentSettings)
        .set(settingsData)
        .where(eq(paymentSettings.tenantId, tenantId));
    } else {
      await db.insert(paymentSettings).values({
        tenantId,
        ...settingsData,
        vippsEnabled: false,
        cashEnabled: true,
        payAtSalonEnabled: true,
      });
    }

    // Log the connection
    await logStripeConnect(tenantId, "connected", accountId, {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });

    return { success: true, accountId };
  } catch (error: any) {
    console.error("[StripeConnect] OAuth callback error:", error);
    await logStripeConnect(tenantId, "disconnected", undefined, {
      error: error.message,
    });
    throw new Error(`Failed to connect Stripe account: ${error.message}`);
  }
}

// ============================================================================
// ACCOUNT STATUS
// ============================================================================

/**
 * Get Stripe Connect status for a tenant
 */
export async function getStripeConnectStatus(
  tenantId: string
): Promise<StripeConnectStatus> {
  const db = await getDb();
  if (!db) {
    return {
      connected: false,
      accountId: null,
      status: "disconnected",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      connectedAt: null,
    };
  }

  const [settings] = await db
    .select()
    .from(paymentSettings)
    .where(eq(paymentSettings.tenantId, tenantId))
    .limit(1);

  if (!settings?.stripeConnectedAccountId) {
    return {
      connected: false,
      accountId: null,
      status: "disconnected",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      connectedAt: null,
    };
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(
      settings.stripeConnectedAccountId
    );

    // Determine status
    let status: StripeConnectStatus["status"] = "connected";
    if (!account.charges_enabled) {
      status = account.details_submitted ? "restricted" : "pending";
    }

    return {
      connected: true,
      accountId: settings.stripeConnectedAccountId,
      status,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      requirements: account.requirements
        ? {
            currentlyDue: account.requirements.currently_due || [],
            eventuallyDue: account.requirements.eventually_due || [],
            pastDue: account.requirements.past_due || [],
          }
        : undefined,
      connectedAt: settings.stripeConnectedAt,
    };
  } catch (error: any) {
    console.error("[StripeConnect] Failed to get account status:", error);
    return {
      connected: true,
      accountId: settings.stripeConnectedAccountId,
      status: "disconnected",
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      connectedAt: settings.stripeConnectedAt,
    };
  }
}

/**
 * Check if a tenant can accept payments
 */
export async function canAcceptPayments(tenantId: string): Promise<{
  canAccept: boolean;
  reason?: string;
}> {
  const status = await getStripeConnectStatus(tenantId);

  if (!status.connected) {
    return {
      canAccept: false,
      reason: "Stripe account not connected. Please connect your Stripe account in Settings.",
    };
  }

  if (!status.chargesEnabled) {
    if (status.requirements?.currentlyDue?.length) {
      return {
        canAccept: false,
        reason: `Please complete your Stripe account setup. Missing: ${status.requirements.currentlyDue.join(", ")}`,
      };
    }
    return {
      canAccept: false,
      reason: "Stripe account is pending verification. Please check your Stripe dashboard.",
    };
  }

  return { canAccept: true };
}

// ============================================================================
// PAYMENT INTENTS (DESTINATION CHARGES)
// ============================================================================

/**
 * Create a payment intent using Destination Charges
 * This ensures the payment goes directly to the salon's Stripe account
 */
export async function createDestinationPaymentIntent(
  options: CreatePaymentIntentOptions
): Promise<PaymentIntentResult> {
  const {
    tenantId,
    amount,
    currency = "nok",
    customerId,
    appointmentId,
    orderId,
    description,
    metadata = {},
    applicationFeePercent = 2.5, // Default 2.5% platform fee
  } = options;

  // Validate tenant can accept payments
  const { canAccept, reason } = await canAcceptPayments(tenantId);
  if (!canAccept) {
    await logPaymentFailed(
      tenantId,
      undefined,
      amount,
      "stripe",
      "ACCOUNT_NOT_READY",
      reason || "Account not ready"
    );
    throw new Error(reason);
  }

  const status = await getStripeConnectStatus(tenantId);
  if (!status.accountId) {
    throw new Error("No connected Stripe account found");
  }

  const stripe = getStripe();

  // Convert amount to øre (smallest currency unit)
  const amountInOre = Math.round(amount * 100);

  // Calculate application fee (platform's cut)
  const applicationFeeAmount = Math.round(amountInOre * (applicationFeePercent / 100));

  try {
    // Get tenant name for description
    const db = await getDb();
    let tenantName = "Stylora Salon";
    if (db) {
      const [tenant] = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      if (tenant) {
        tenantName = tenant.name;
      }
    }

    // Create payment intent with destination charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInOre,
      currency: currency.toLowerCase(),
      description: description || `Payment to ${tenantName}`,
      metadata: {
        tenantId,
        customerId: customerId?.toString() || "",
        appointmentId: appointmentId?.toString() || "",
        orderId: orderId?.toString() || "",
        ...metadata,
      },
      // DESTINATION CHARGE: Money goes to connected account
      transfer_data: {
        destination: status.accountId,
      },
      // Platform fee
      application_fee_amount: applicationFeeAmount,
      // Automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Log payment creation
    await logPaymentCreated(
      tenantId,
      0, // Payment ID will be assigned later
      amount,
      "stripe",
      orderId,
      appointmentId
    );

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || "",
      amount: amountInOre,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      connectedAccountId: status.accountId,
    };
  } catch (error: any) {
    console.error("[StripeConnect] Failed to create payment intent:", error);

    await logPaymentFailed(
      tenantId,
      undefined,
      amount,
      "stripe",
      error.code || "STRIPE_ERROR",
      error.message,
      { stripeError: error.raw }
    );

    throw new Error(`Failed to create payment: ${error.message}`);
  }
}

/**
 * Create a payment intent for Stripe Terminal (in-person payments)
 */
export async function createTerminalDestinationPaymentIntent(
  tenantId: string,
  amount: number,
  currency: string = "nok",
  metadata?: Record<string, string>
): Promise<PaymentIntentResult> {
  const { canAccept, reason } = await canAcceptPayments(tenantId);
  if (!canAccept) {
    throw new Error(reason);
  }

  const status = await getStripeConnectStatus(tenantId);
  if (!status.accountId) {
    throw new Error("No connected Stripe account found");
  }

  const stripe = getStripe();
  const amountInOre = Math.round(amount * 100);
  const applicationFeeAmount = Math.round(amountInOre * 0.025); // 2.5% fee

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInOre,
      currency: currency.toLowerCase(),
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: {
        tenantId,
        ...metadata,
      },
      transfer_data: {
        destination: status.accountId,
      },
      application_fee_amount: applicationFeeAmount,
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || "",
      amount: amountInOre,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      connectedAccountId: status.accountId,
    };
  } catch (error: any) {
    console.error("[StripeConnect] Failed to create terminal payment intent:", error);
    throw new Error(`Failed to create terminal payment: ${error.message}`);
  }
}

// ============================================================================
// REFUNDS
// ============================================================================

/**
 * Process a refund for a Stripe payment
 */
export async function processStripeRefund(
  tenantId: string,
  paymentIntentId: string,
  amount?: number, // If not provided, full refund
  reason?: string
): Promise<{ success: boolean; refundId: string }> {
  const status = await getStripeConnectStatus(tenantId);
  if (!status.accountId) {
    throw new Error("No connected Stripe account found");
  }

  const stripe = getStripe();

  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
      metadata: {
        tenantId,
        refundReason: reason || "Customer requested refund",
      },
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    // Refund is automatically reversed from the connected account
    const refund = await stripe.refunds.create(refundParams);

    return {
      success: true,
      refundId: refund.id,
    };
  } catch (error: any) {
    console.error("[StripeConnect] Failed to process refund:", error);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
}

// ============================================================================
// DISCONNECT
// ============================================================================

/**
 * Disconnect Stripe account
 */
export async function disconnectStripeAccount(tenantId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [settings] = await db
    .select()
    .from(paymentSettings)
    .where(eq(paymentSettings.tenantId, tenantId))
    .limit(1);

  if (!settings?.stripeConnectedAccountId) {
    return; // Already disconnected
  }

  // Update database
  await db
    .update(paymentSettings)
    .set({
      stripeConnectedAccountId: null,
      stripeAccountStatus: "disconnected",
      stripeConnectedAt: null,
      cardEnabled: false,
    })
    .where(eq(paymentSettings.tenantId, tenantId));

  // Log disconnection
  await logStripeConnect(tenantId, "disconnected", settings.stripeConnectedAccountId);
}

// ============================================================================
// ACCOUNT LINK (for completing onboarding)
// ============================================================================

/**
 * Create an account link for completing Stripe onboarding
 */
export async function createAccountLink(
  tenantId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const status = await getStripeConnectStatus(tenantId);
  if (!status.accountId) {
    throw new Error("No connected Stripe account found");
  }

  const stripe = getStripe();

  const accountLink = await stripe.accountLinks.create({
    account: status.accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Create a login link for the Stripe dashboard
 */
export async function createDashboardLink(tenantId: string): Promise<string> {
  const status = await getStripeConnectStatus(tenantId);
  if (!status.accountId) {
    throw new Error("No connected Stripe account found");
  }

  const stripe = getStripe();

  const loginLink = await stripe.accounts.createLoginLink(status.accountId);

  return loginLink.url;
}
