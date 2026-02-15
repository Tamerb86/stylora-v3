/**
 * Payment Onboarding Router
 * 
 * Provides a simple "one-click" setup experience for salons to:
 * 1. Connect their Stripe account
 * 2. Configure payment methods
 * 3. Verify account status
 * 
 * Norwegian language support included.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { paymentSettings, tenants } from "../../drizzle/schema";
import {
  getStripeConnectAuthUrl,
  getStripeConnectStatus,
  canAcceptPayments,
  createAccountLink,
} from "../services/stripeConnectService";
import { getPaymentSettingsSecure } from "../services/tenantIsolation";

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingStep {
  id: string;
  title: string;
  titleNo: string; // Norwegian
  description: string;
  descriptionNo: string;
  status: "pending" | "in_progress" | "completed" | "error";
  action?: string;
  actionUrl?: string;
  errorMessage?: string;
}

export interface OnboardingStatus {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  canAcceptPayments: boolean;
  steps: OnboardingStep[];
  nextAction?: {
    type: "connect_stripe" | "complete_verification" | "configure_methods" | "ready";
    url?: string;
    message: string;
    messageNo: string;
  };
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tenant access",
    });
  }
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.user.tenantId,
    },
  });
});

const adminProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

// ============================================================================
// PAYMENT ONBOARDING ROUTER
// ============================================================================

export const paymentOnboardingRouter = router({
  /**
   * Get current onboarding status
   * Returns a step-by-step guide for setting up payments
   */
  getStatus: tenantProcedure.query(async ({ ctx }): Promise<OnboardingStatus> => {
    const stripeStatus = await getStripeConnectStatus(ctx.tenantId);
    const paymentCheck = await canAcceptPayments(ctx.tenantId);
    const settings = await getPaymentSettingsSecure(ctx.tenantId);

    const steps: OnboardingStep[] = [];
    let currentStep = 0;

    // Step 1: Connect Stripe Account
    const step1: OnboardingStep = {
      id: "connect_stripe",
      title: "Connect Stripe Account",
      titleNo: "Koble til Stripe-konto",
      description: "Link your Stripe account to receive payments directly",
      descriptionNo: "Koble Stripe-kontoen din for å motta betalinger direkte",
      status: stripeStatus.connected ? "completed" : "pending",
    };

    if (!stripeStatus.connected) {
      step1.action = "Connect Stripe";
      step1.actionUrl = getStripeConnectAuthUrl(ctx.tenantId);
    }

    steps.push(step1);

    // Step 2: Complete Stripe Verification
    const step2: OnboardingStep = {
      id: "verify_account",
      title: "Complete Account Verification",
      titleNo: "Fullfør kontoverifisering",
      description: "Verify your identity to enable payouts",
      descriptionNo: "Verifiser identiteten din for å aktivere utbetalinger",
      status: "pending",
    };

    if (stripeStatus.connected) {
      currentStep = 1;
      
      if (stripeStatus.detailsSubmitted && stripeStatus.chargesEnabled) {
        step2.status = "completed";
        currentStep = 2;
      } else if (stripeStatus.detailsSubmitted) {
        step2.status = "in_progress";
        step2.description = "Verification in progress. This may take 1-2 business days.";
        step2.descriptionNo = "Verifisering pågår. Dette kan ta 1-2 virkedager.";
      } else {
        step2.status = "in_progress";
        step2.action = "Complete Verification";
        
        if (stripeStatus.requirements?.currentlyDue?.length) {
          step2.errorMessage = `Missing: ${stripeStatus.requirements.currentlyDue.join(", ")}`;
        }
      }
    }

    steps.push(step2);

    // Step 3: Configure Payment Methods
    const step3: OnboardingStep = {
      id: "configure_methods",
      title: "Configure Payment Methods",
      titleNo: "Konfigurer betalingsmetoder",
      description: "Enable the payment methods you want to accept",
      descriptionNo: "Aktiver betalingsmetodene du vil akseptere",
      status: "pending",
    };

    if (stripeStatus.chargesEnabled) {
      currentStep = 2;
      
      const hasConfiguredMethods = settings && (
        settings.cardEnabled ||
        settings.vippsEnabled ||
        settings.cashEnabled
      );

      if (hasConfiguredMethods) {
        step3.status = "completed";
        currentStep = 3;
      } else {
        step3.status = "in_progress";
        step3.action = "Configure Methods";
      }
    }

    steps.push(step3);

    // Step 4: Ready to Accept Payments
    const step4: OnboardingStep = {
      id: "ready",
      title: "Ready to Accept Payments",
      titleNo: "Klar til å motta betalinger",
      description: "Your payment setup is complete!",
      descriptionNo: "Betalingsoppsettet ditt er fullført!",
      status: paymentCheck.canAccept ? "completed" : "pending",
    };

    steps.push(step4);

    // Determine next action
    let nextAction: OnboardingStatus["nextAction"];

    if (!stripeStatus.connected) {
      nextAction = {
        type: "connect_stripe",
        url: getStripeConnectAuthUrl(ctx.tenantId),
        message: "Click the button below to connect your Stripe account and start accepting payments.",
        messageNo: "Klikk på knappen nedenfor for å koble til Stripe-kontoen din og begynne å motta betalinger.",
      };
    } else if (!stripeStatus.chargesEnabled) {
      nextAction = {
        type: "complete_verification",
        message: "Complete your Stripe account verification to enable payments.",
        messageNo: "Fullfør verifiseringen av Stripe-kontoen din for å aktivere betalinger.",
      };
    } else if (!settings?.cardEnabled && !settings?.vippsEnabled) {
      nextAction = {
        type: "configure_methods",
        message: "Configure which payment methods you want to accept.",
        messageNo: "Konfigurer hvilke betalingsmetoder du vil akseptere.",
      };
    } else {
      nextAction = {
        type: "ready",
        message: "You're all set! Your salon can now accept payments.",
        messageNo: "Alt er klart! Salongen din kan nå motta betalinger.",
      };
    }

    return {
      currentStep,
      totalSteps: steps.length,
      isComplete: paymentCheck.canAccept,
      canAcceptPayments: paymentCheck.canAccept,
      steps,
      nextAction,
    };
  }),

  /**
   * Get Stripe Connect URL for onboarding
   */
  getConnectUrl: adminProcedure.query(async ({ ctx }) => {
    const status = await getStripeConnectStatus(ctx.tenantId);
    
    if (status.connected) {
      // If already connected but needs verification, return account link
      if (!status.chargesEnabled) {
        const frontendUrl = process.env.VITE_FRONTEND_URL || "http://localhost:3000";
        const accountLink = await createAccountLink(
          ctx.tenantId,
          `${frontendUrl}/settings/payments`,
          `${frontendUrl}/settings/payments`
        );
        return {
          type: "account_link" as const,
          url: accountLink,
          message: "Complete your account verification",
          messageNo: "Fullfør kontoverifiseringen din",
        };
      }
      
      return {
        type: "already_connected" as const,
        url: null,
        message: "Your Stripe account is already connected",
        messageNo: "Stripe-kontoen din er allerede tilkoblet",
      };
    }

    return {
      type: "oauth" as const,
      url: getStripeConnectAuthUrl(ctx.tenantId),
      message: "Connect your Stripe account",
      messageNo: "Koble til Stripe-kontoen din",
    };
  }),

  /**
   * Quick setup - Enable recommended payment methods
   */
  quickSetup: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const stripeStatus = await getStripeConnectStatus(ctx.tenantId);
    
    if (!stripeStatus.connected) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Please connect your Stripe account first",
      });
    }

    // Enable recommended payment methods
    const existing = await db
      .select()
      .from(paymentSettings)
      .where(eq(paymentSettings.tenantId, ctx.tenantId))
      .limit(1);

    const recommendedSettings = {
      cardEnabled: stripeStatus.chargesEnabled,
      cashEnabled: true,
      payAtSalonEnabled: true,
      vippsEnabled: false, // Vipps requires separate setup
      defaultPaymentMethod: "pay_at_salon" as const,
    };

    if (existing.length > 0) {
      await db
        .update(paymentSettings)
        .set(recommendedSettings)
        .where(eq(paymentSettings.tenantId, ctx.tenantId));
    } else {
      await db.insert(paymentSettings).values({
        tenantId: ctx.tenantId,
        ...recommendedSettings,
        stripeConnectedAccountId: stripeStatus.accountId,
        stripeAccountStatus: stripeStatus.status,
        stripeConnectedAt: stripeStatus.connectedAt,
      });
    }

    return {
      success: true,
      message: "Payment methods configured successfully",
      messageNo: "Betalingsmetoder konfigurert",
      enabledMethods: {
        card: recommendedSettings.cardEnabled,
        cash: recommendedSettings.cashEnabled,
        payAtSalon: recommendedSettings.payAtSalonEnabled,
        vipps: recommendedSettings.vippsEnabled,
      },
    };
  }),

  /**
   * Get Norwegian setup guide
   */
  getSetupGuide: tenantProcedure.query(async ({ ctx }) => {
    const status = await getStripeConnectStatus(ctx.tenantId);

    return {
      title: "Betalingsoppsett for din salong",
      subtitle: "Følg disse enkle trinnene for å begynne å motta betalinger",
      steps: [
        {
          number: 1,
          title: "Koble til Stripe",
          description: "Stripe er en sikker betalingsplattform som håndterer kortbetalinger. Du trenger en Stripe-konto for å motta betalinger.",
          tips: [
            "Du kan opprette en gratis Stripe-konto på stripe.com",
            "Ha organisasjonsnummeret ditt klart",
            "Du trenger BankID for verifisering",
          ],
          completed: status.connected,
        },
        {
          number: 2,
          title: "Verifiser identiteten din",
          description: "Stripe krever verifisering for å sikre trygge transaksjoner. Dette inkluderer ID-verifisering og bankkontobekreftelse.",
          tips: [
            "Prosessen tar vanligvis 1-2 virkedager",
            "Ha pass eller førerkort klart",
            "Du må bekrefte bankkontoen din",
          ],
          completed: status.detailsSubmitted && status.chargesEnabled,
        },
        {
          number: 3,
          title: "Velg betalingsmetoder",
          description: "Velg hvilke betalingsmetoder du vil akseptere i salongen din.",
          tips: [
            "Kortbetaling er mest populært",
            "Kontant er fortsatt viktig for noen kunder",
            "Vipps kan legges til senere",
          ],
          completed: false, // Will be updated based on settings
        },
        {
          number: 4,
          title: "Test en betaling",
          description: "Før du går live, anbefaler vi å teste betalingssystemet.",
          tips: [
            "Bruk testmodus først",
            "Prøv både kort og kontant",
            "Sjekk at kvitteringer fungerer",
          ],
          completed: false,
        },
      ],
      support: {
        title: "Trenger du hjelp?",
        description: "Kontakt oss hvis du har spørsmål om betalingsoppsettet.",
        email: "support@stylora.no",
        phone: "+47 XXX XX XXX",
      },
    };
  }),

  /**
   * Check if salon needs to complete payment setup
   */
  needsSetup: tenantProcedure.query(async ({ ctx }) => {
    const paymentCheck = await canAcceptPayments(ctx.tenantId);
    const stripeStatus = await getStripeConnectStatus(ctx.tenantId);

    return {
      needsSetup: !paymentCheck.canAccept,
      reason: paymentCheck.reason,
      stripeConnected: stripeStatus.connected,
      chargesEnabled: stripeStatus.chargesEnabled,
      // Show setup prompt if:
      // 1. Stripe not connected, OR
      // 2. Stripe connected but charges not enabled
      showSetupPrompt: !stripeStatus.connected || !stripeStatus.chargesEnabled,
      promptMessage: !stripeStatus.connected
        ? "Aktiver betalinger for å motta kortbetalinger fra kunder"
        : "Fullfør Stripe-verifiseringen for å aktivere betalinger",
      promptAction: !stripeStatus.connected
        ? "Aktiver betalinger"
        : "Fullfør verifisering",
    };
  }),
});
