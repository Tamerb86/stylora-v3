import Stripe from "stripe";

// Initialize Stripe with secret key from environment
// Supports both platform key (for Connected Accounts) and direct API keys
const getStripeClient = (
  apiKey?: string,
  connectedAccountId?: string
): Stripe => {
  const key = apiKey || process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe API key not configured");
  }

  const config: Stripe.StripeConfig = {
    apiVersion: "2025-11-17.clover",
  };

  // If connectedAccountId is provided, use Stripe Connect
  if (connectedAccountId) {
    config.stripeAccount = connectedAccountId;
  }

  return new Stripe(key, config);
};

/**
 * Create a connection token for Stripe Terminal SDK
 * Required by the frontend SDK to discover and connect to readers
 */
export async function createConnectionToken(
  apiKey?: string,
  connectedAccountId?: string
): Promise<string> {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  const connectionToken = await stripe.terminal.connectionTokens.create();
  return connectionToken.secret;
}

/**
 * List all registered readers for this Stripe account
 */
export async function listReaders(
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  const readers = await stripe.terminal.readers.list({ limit: 100 });
  return readers.data;
}

/**
 * Get a specific reader by ID
 */
export async function getReader(
  readerId: string,
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  return await stripe.terminal.readers.retrieve(readerId);
}

/**
 * Create a payment intent for terminal payment
 */
export async function createTerminalPaymentIntent(
  amount: number,
  currency: string = "nok",
  metadata?: Record<string, string>,
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    payment_method_types: ["card_present"],
    capture_method: "automatic",
    metadata: metadata || {},
  });
}

/**
 * Capture a payment intent (if using manual capture)
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  return await stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string,
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  return await stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Process a refund for a terminal payment
 */
export async function refundTerminalPayment(
  paymentIntentId: string,
  amount?: number,
  apiKey?: string
) {
  const stripe = getStripeClient(apiKey);

  const refundData: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amount) {
    refundData.amount = Math.round(amount * 100);
  }

  return await stripe.refunds.create(refundData);
}

/**
 * Simulate a test payment (for development)
 */
export async function simulateTestPayment(readerId: string, apiKey?: string) {
  const stripe = getStripeClient(apiKey);
  return await stripe.testHelpers.terminal.readers.presentPaymentMethod(
    readerId
  );
}

/**
 * Create a Terminal Location (required for registering readers)
 */
export async function createLocation(
  displayName: string,
  address: {
    line1: string;
    city: string;
    postal_code: string;
    country: string;
  },
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  return await stripe.terminal.locations.create({
    display_name: displayName,
    address: {
      line1: address.line1,
      city: address.city,
      postal_code: address.postal_code,
      country: address.country,
    },
  });
}

/**
 * List all Terminal Locations
 */
export async function listLocations(
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  const locations = await stripe.terminal.locations.list({ limit: 100 });
  return locations.data;
}

/**
 * Get or create default location for a salon
 */
export async function getOrCreateDefaultLocation(
  salonName: string,
  address: {
    line1: string;
    city: string;
    postal_code: string;
    country: string;
  },
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  
  // Check if location already exists
  const locations = await stripe.terminal.locations.list({ limit: 100 });
  
  if (locations.data.length > 0) {
    return locations.data[0]; // Return first location
  }
  
  // Create new location
  return await stripe.terminal.locations.create({
    display_name: salonName,
    address: {
      line1: address.line1,
      city: address.city,
      postal_code: address.postal_code,
      country: address.country,
    },
  });
}

/**
 * Register a simulated reader (for testing)
 */
export async function registerSimulatedReader(
  locationId: string,
  label: string = "Simulated Reader",
  apiKey?: string,
  connectedAccountId?: string
) {
  const stripe = getStripeClient(apiKey, connectedAccountId);
  
  return await stripe.terminal.readers.create({
    registration_code: "simulated-wpe", // Special code for simulated WisePOS E
    label: label,
    location: locationId,
  });
}
