/**
 * Router Updates for Payment System
 * 
 * Add these imports and router registrations to your main routers.ts file.
 * 
 * INSTRUCTIONS:
 * 1. Add the imports at the top of routers.ts
 * 2. Add the router registrations inside appRouter
 */

// ============================================================================
// IMPORTS TO ADD (at the top of routers.ts)
// ============================================================================

/*
// Payment system routers
import { paymentRouter } from "./routers/paymentRouter";
import { paymentOnboardingRouter } from "./routers/paymentOnboarding";
import { paymentMonitoringRouter } from "./routers/paymentMonitoring";
*/

// ============================================================================
// ROUTER REGISTRATIONS (inside appRouter definition)
// ============================================================================

/*
export const appRouter = router({
  // ... existing routers ...
  
  // NEW: Payment system routers
  payment: paymentRouter,
  paymentOnboarding: paymentOnboardingRouter,
  paymentMonitoring: paymentMonitoringRouter,
  
  // ... rest of existing routers ...
});
*/

// ============================================================================
// EXAMPLE USAGE IN FRONTEND
// ============================================================================

/*
// Get payment onboarding status
const { data: onboardingStatus } = trpc.paymentOnboarding.getStatus.useQuery();

// Get Stripe Connect URL
const { data: connectUrl } = trpc.paymentOnboarding.getConnectUrl.useQuery();

// Create payment intent
const createPayment = trpc.payment.createPaymentIntent.useMutation();
await createPayment.mutateAsync({
  amount: 500, // 500 NOK
  appointmentId: 123,
});

// Get payment health status
const { data: health } = trpc.paymentMonitoring.getHealthStatus.useQuery();

// Get payment metrics
const { data: metrics } = trpc.paymentMonitoring.getMetrics.useQuery({ hoursBack: 24 });
*/
