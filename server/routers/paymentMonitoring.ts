/**
 * Payment Monitoring Router
 * 
 * Provides comprehensive monitoring and alerting for payment operations:
 * - Real-time failure tracking
 * - Success rate monitoring
 * - Alert system for payment issues
 * - Detailed logs for debugging
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { payments, refunds, paymentSettings } from "../../drizzle/schema";
import {
  getRecentLogs,
  getPaymentFailureSummary,
  getPaymentSuccessRate,
  shouldAlertOnFailureRate,
  getFailureRateAlertMessage,
  PaymentLogEntry,
} from "../services/paymentLogger";
import { getStripeConnectStatus } from "../services/stripeConnectService";

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
// TYPES
// ============================================================================

interface PaymentHealthStatus {
  status: "healthy" | "warning" | "critical";
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
}

interface PaymentMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  totalRevenue: number;
  averagePaymentAmount: number;
  successRate: number;
  refundRate: number;
}

// ============================================================================
// PAYMENT MONITORING ROUTER
// ============================================================================

export const paymentMonitoringRouter = router({
  /**
   * Get payment health status
   */
  getHealthStatus: adminProcedure.query(async ({ ctx }): Promise<PaymentHealthStatus> => {
    const stripeStatus = await getStripeConnectStatus(ctx.tenantId);
    const successRate = getPaymentSuccessRate(ctx.tenantId, 24);
    const failureSummary = getPaymentFailureSummary(ctx.tenantId, 24);

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check Stripe connection
    if (!stripeStatus.connected) {
      issues.push("Stripe account not connected");
      recommendations.push("Connect your Stripe account to accept card payments");
      score -= 30;
    } else if (!stripeStatus.chargesEnabled) {
      issues.push("Stripe account verification incomplete");
      recommendations.push("Complete your Stripe account verification to enable payments");
      score -= 20;
    }

    // Check success rate
    if (successRate.totalAttempts > 0) {
      if (successRate.successRate < 80) {
        issues.push(`Low payment success rate: ${successRate.successRate.toFixed(1)}%`);
        recommendations.push("Review failed payments and address common issues");
        score -= 25;
      } else if (successRate.successRate < 95) {
        issues.push(`Payment success rate below optimal: ${successRate.successRate.toFixed(1)}%`);
        score -= 10;
      }
    }

    // Check for recent failures
    if (failureSummary.totalFailures > 5) {
      issues.push(`${failureSummary.totalFailures} payment failures in the last 24 hours`);
      
      // Analyze error codes
      const topErrors = Object.entries(failureSummary.byErrorCode)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      for (const [code, count] of topErrors) {
        if (code === "card_declined") {
          recommendations.push("Multiple card declines detected. Consider offering alternative payment methods.");
        } else if (code === "insufficient_funds") {
          recommendations.push("Some customers have insufficient funds. Consider offering payment plans.");
        } else if (code === "ACCOUNT_NOT_READY") {
          recommendations.push("Complete your Stripe account setup to resolve payment issues.");
        }
      }

      score -= Math.min(failureSummary.totalFailures * 2, 20);
    }

    // Determine status
    let status: PaymentHealthStatus["status"] = "healthy";
    if (score < 50) {
      status = "critical";
    } else if (score < 80) {
      status = "warning";
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }),

  /**
   * Get payment metrics for a time period
   */
  getMetrics: adminProcedure
    .input(
      z.object({
        hoursBack: z.number().min(1).max(720).default(24), // Max 30 days
      })
    )
    .query(async ({ ctx, input }): Promise<PaymentMetrics> => {
      const db = await getDb();
      if (!db) {
        return {
          totalPayments: 0,
          successfulPayments: 0,
          failedPayments: 0,
          refundedPayments: 0,
          totalRevenue: 0,
          averagePaymentAmount: 0,
          successRate: 100,
          refundRate: 0,
        };
      }

      const cutoffDate = new Date(Date.now() - input.hoursBack * 60 * 60 * 1000);

      // Get payment stats
      const paymentStats = await db
        .select({
          status: payments.status,
          count: sql<number>`count(*)`,
          total: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL(10,2))), 0)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, ctx.tenantId),
            gte(payments.createdAt, cutoffDate)
          )
        )
        .groupBy(payments.status);

      let totalPayments = 0;
      let successfulPayments = 0;
      let failedPayments = 0;
      let refundedPayments = 0;
      let totalRevenue = 0;

      for (const stat of paymentStats) {
        const count = Number(stat.count);
        const total = Number(stat.total);
        totalPayments += count;

        switch (stat.status) {
          case "completed":
            successfulPayments += count;
            totalRevenue += total;
            break;
          case "failed":
            failedPayments += count;
            break;
          case "refunded":
            refundedPayments += count;
            break;
        }
      }

      return {
        totalPayments,
        successfulPayments,
        failedPayments,
        refundedPayments,
        totalRevenue,
        averagePaymentAmount: successfulPayments > 0 ? totalRevenue / successfulPayments : 0,
        successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 100,
        refundRate: successfulPayments > 0 ? (refundedPayments / successfulPayments) * 100 : 0,
      };
    }),

  /**
   * Get recent payment logs
   */
  getLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(100),
        level: z.enum(["info", "warning", "error", "critical"]).optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<PaymentLogEntry[]> => {
      return getRecentLogs(ctx.tenantId, {
        limit: input.limit,
        level: input.level as any,
        category: input.category as any,
      });
    }),

  /**
   * Get failure analysis
   */
  getFailureAnalysis: adminProcedure
    .input(
      z.object({
        hoursBack: z.number().min(1).max(168).default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      const summary = getPaymentFailureSummary(ctx.tenantId, input.hoursBack);
      
      // Provide human-readable analysis
      const analysis: {
        errorCode: string;
        count: number;
        description: string;
        descriptionNo: string;
        recommendation: string;
        recommendationNo: string;
      }[] = [];

      const errorDescriptions: Record<string, { desc: string; descNo: string; rec: string; recNo: string }> = {
        card_declined: {
          desc: "Card was declined by the issuing bank",
          descNo: "Kortet ble avvist av utstedende bank",
          rec: "Ask customer to try a different card or contact their bank",
          recNo: "Be kunden prøve et annet kort eller kontakte banken sin",
        },
        insufficient_funds: {
          desc: "Customer has insufficient funds",
          descNo: "Kunden har ikke nok penger på kontoen",
          rec: "Offer alternative payment methods or payment plans",
          recNo: "Tilby alternative betalingsmetoder eller betalingsplaner",
        },
        expired_card: {
          desc: "Card has expired",
          descNo: "Kortet har utløpt",
          rec: "Ask customer to update their card information",
          recNo: "Be kunden oppdatere kortinformasjonen sin",
        },
        incorrect_cvc: {
          desc: "Incorrect security code (CVC)",
          descNo: "Feil sikkerhetskode (CVC)",
          rec: "Ask customer to re-enter their card details",
          recNo: "Be kunden skrive inn kortdetaljene på nytt",
        },
        ACCOUNT_NOT_READY: {
          desc: "Stripe account not fully set up",
          descNo: "Stripe-kontoen er ikke fullstendig konfigurert",
          rec: "Complete your Stripe account verification",
          recNo: "Fullfør verifiseringen av Stripe-kontoen din",
        },
        STRIPE_ERROR: {
          desc: "General Stripe processing error",
          descNo: "Generell Stripe-behandlingsfeil",
          rec: "If this persists, contact support",
          recNo: "Hvis dette vedvarer, kontakt support",
        },
        DB_ERROR: {
          desc: "Database error during payment processing",
          descNo: "Databasefeil under betalingsbehandling",
          rec: "This is a system issue. Contact support if it persists.",
          recNo: "Dette er et systemfeil. Kontakt support hvis det vedvarer.",
        },
      };

      for (const [code, count] of Object.entries(summary.byErrorCode)) {
        const info = errorDescriptions[code] || {
          desc: `Unknown error: ${code}`,
          descNo: `Ukjent feil: ${code}`,
          rec: "Contact support for assistance",
          recNo: "Kontakt support for hjelp",
        };

        analysis.push({
          errorCode: code,
          count,
          description: info.desc,
          descriptionNo: info.descNo,
          recommendation: info.rec,
          recommendationNo: info.recNo,
        });
      }

      // Sort by count descending
      analysis.sort((a, b) => b.count - a.count);

      return {
        totalFailures: summary.totalFailures,
        analysis,
        recentFailures: summary.recentFailures.slice(0, 5),
      };
    }),

  /**
   * Get alerts
   */
  getAlerts: adminProcedure.query(async ({ ctx }) => {
    const alerts: {
      id: string;
      type: "warning" | "error" | "critical";
      title: string;
      titleNo: string;
      message: string;
      messageNo: string;
      timestamp: Date;
    }[] = [];

    // Check for high failure rate
    if (shouldAlertOnFailureRate(ctx.tenantId)) {
      const alertMessage = getFailureRateAlertMessage(ctx.tenantId);
      if (alertMessage) {
        alerts.push({
          id: "high_failure_rate",
          type: "error",
          title: "High Payment Failure Rate",
          titleNo: "Høy betalingsfeilrate",
          message: alertMessage,
          messageNo: "Høy betalingsfeilrate oppdaget. Sjekk betalingsloggene for detaljer.",
          timestamp: new Date(),
        });
      }
    }

    // Check Stripe status
    const stripeStatus = await getStripeConnectStatus(ctx.tenantId);
    if (!stripeStatus.connected) {
      alerts.push({
        id: "stripe_not_connected",
        type: "warning",
        title: "Stripe Not Connected",
        titleNo: "Stripe ikke tilkoblet",
        message: "Connect your Stripe account to accept card payments.",
        messageNo: "Koble til Stripe-kontoen din for å motta kortbetalinger.",
        timestamp: new Date(),
      });
    } else if (!stripeStatus.chargesEnabled) {
      alerts.push({
        id: "stripe_verification_pending",
        type: "warning",
        title: "Stripe Verification Pending",
        titleNo: "Stripe-verifisering venter",
        message: "Complete your Stripe account verification to enable payments.",
        messageNo: "Fullfør verifiseringen av Stripe-kontoen din for å aktivere betalinger.",
        timestamp: new Date(),
      });

      if (stripeStatus.requirements?.pastDue?.length) {
        alerts.push({
          id: "stripe_requirements_past_due",
          type: "critical",
          title: "Stripe Requirements Past Due",
          titleNo: "Stripe-krav forfalt",
          message: `Missing required information: ${stripeStatus.requirements.pastDue.join(", ")}`,
          messageNo: `Manglende påkrevd informasjon: ${stripeStatus.requirements.pastDue.join(", ")}`,
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }),

  /**
   * Get dashboard summary
   */
  getDashboardSummary: adminProcedure.query(async ({ ctx }) => {
    const [health, metrics24h, metrics7d, alerts] = await Promise.all([
      paymentMonitoringRouter.createCaller(ctx).getHealthStatus(),
      paymentMonitoringRouter.createCaller(ctx).getMetrics({ hoursBack: 24 }),
      paymentMonitoringRouter.createCaller(ctx).getMetrics({ hoursBack: 168 }),
      paymentMonitoringRouter.createCaller(ctx).getAlerts(),
    ]);

    return {
      health,
      today: {
        revenue: metrics24h.totalRevenue,
        transactions: metrics24h.totalPayments,
        successRate: metrics24h.successRate,
      },
      week: {
        revenue: metrics7d.totalRevenue,
        transactions: metrics7d.totalPayments,
        successRate: metrics7d.successRate,
        refundRate: metrics7d.refundRate,
      },
      alerts,
      alertCount: alerts.length,
      criticalAlerts: alerts.filter((a) => a.type === "critical").length,
    };
  }),
});
