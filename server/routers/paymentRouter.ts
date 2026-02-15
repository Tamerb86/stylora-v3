/**
 * Payment Router
 * 
 * Centralized payment handling with:
 * - Complete tenant isolation
 * - Stripe Connect destination charges
 * - Comprehensive logging
 * - Error handling and monitoring
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  payments,
  orders,
  paymentSettings,
  paymentSplits,
  refunds,
} from "../../drizzle/schema";
import {
  getStripeConnectAuthUrl,
  handleStripeConnectCallback,
  getStripeConnectStatus,
  canAcceptPayments,
  createDestinationPaymentIntent,
  createTerminalDestinationPaymentIntent,
  processStripeRefund,
  disconnectStripeAccount,
  createAccountLink,
  createDashboardLink,
} from "../services/stripeConnectService";
import {
  getPaymentByIdSecure,
  getOrderByIdSecure,
  getPaymentSettingsSecure,
  upsertPaymentSettings,
} from "../services/tenantIsolation";
import {
  logPaymentCreated,
  logPaymentCompleted,
  logPaymentFailed,
  logPaymentRefunded,
  getRecentLogs,
  getPaymentFailureSummary,
  getPaymentSuccessRate,
} from "../services/paymentLogger";

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Tenant procedure with email verification
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

// Admin procedure (owner/admin only)
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
// PAYMENT ROUTER
// ============================================================================

export const paymentRouter = router({
  // ==========================================================================
  // STRIPE CONNECT
  // ==========================================================================

  /**
   * Get Stripe Connect authorization URL
   */
  getConnectAuthUrl: adminProcedure.query(async ({ ctx }) => {
    try {
      const authUrl = getStripeConnectAuthUrl(ctx.tenantId);
      return { authUrl };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Failed to generate Stripe Connect URL",
      });
    }
  }),

  /**
   * Handle Stripe Connect OAuth callback
   */
  handleConnectCallback: publicProcedure
    .input(
      z.object({
        code: z.string(),
        state: z.string(), // tenantId
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await handleStripeConnectCallback(input.code, input.state);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to connect Stripe account",
        });
      }
    }),

  /**
   * Get Stripe Connect status
   */
  getConnectStatus: tenantProcedure.query(async ({ ctx }) => {
    return getStripeConnectStatus(ctx.tenantId);
  }),

  /**
   * Check if tenant can accept payments
   */
  canAcceptPayments: tenantProcedure.query(async ({ ctx }) => {
    return canAcceptPayments(ctx.tenantId);
  }),

  /**
   * Disconnect Stripe account
   */
  disconnectStripe: adminProcedure.mutation(async ({ ctx }) => {
    await disconnectStripeAccount(ctx.tenantId);
    return { success: true };
  }),

  /**
   * Get account link for completing Stripe onboarding
   */
  getAccountLink: adminProcedure
    .input(
      z.object({
        refreshUrl: z.string().url(),
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const url = await createAccountLink(
          ctx.tenantId,
          input.refreshUrl,
          input.returnUrl
        );
        return { url };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create account link",
        });
      }
    }),

  /**
   * Get Stripe dashboard link
   */
  getDashboardLink: adminProcedure.query(async ({ ctx }) => {
    try {
      const url = await createDashboardLink(ctx.tenantId);
      return { url };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Failed to create dashboard link",
      });
    }
  }),

  // ==========================================================================
  // PAYMENT SETTINGS
  // ==========================================================================

  /**
   * Get payment settings
   */
  getSettings: tenantProcedure.query(async ({ ctx }) => {
    const settings = await getPaymentSettingsSecure(ctx.tenantId);
    return settings || {
      vippsEnabled: false,
      cardEnabled: false,
      cashEnabled: true,
      payAtSalonEnabled: true,
      stripeConnectedAccountId: null,
      stripeAccountStatus: "disconnected",
      defaultPaymentMethod: "pay_at_salon",
    };
  }),

  /**
   * Update payment settings
   */
  updateSettings: adminProcedure
    .input(
      z.object({
        vippsEnabled: z.boolean().optional(),
        cardEnabled: z.boolean().optional(),
        cashEnabled: z.boolean().optional(),
        payAtSalonEnabled: z.boolean().optional(),
        defaultPaymentMethod: z
          .enum(["vipps", "card", "cash", "pay_at_salon"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await upsertPaymentSettings(ctx.tenantId, input);
      return settings;
    }),

  // ==========================================================================
  // PAYMENT INTENTS
  // ==========================================================================

  /**
   * Create a payment intent for online payments
   */
  createPaymentIntent: tenantProcedure
    .input(
      z.object({
        amount: z.number().min(1, "Amount must be at least 1 NOK"),
        customerId: z.number().optional(),
        appointmentId: z.number().optional(),
        orderId: z.number().optional(),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await createDestinationPaymentIntent({
          tenantId: ctx.tenantId,
          amount: input.amount,
          customerId: input.customerId,
          appointmentId: input.appointmentId,
          orderId: input.orderId,
          description: input.description,
          metadata: input.metadata,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create payment intent",
        });
      }
    }),

  /**
   * Create a payment intent for terminal (in-person) payments
   */
  createTerminalPaymentIntent: tenantProcedure
    .input(
      z.object({
        amount: z.number().min(1),
        currency: z.string().default("nok"),
        metadata: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await createTerminalDestinationPaymentIntent(
          ctx.tenantId,
          input.amount,
          input.currency,
          input.metadata
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create terminal payment intent",
        });
      }
    }),

  // ==========================================================================
  // PAYMENT PROCESSING
  // ==========================================================================

  /**
   * Record a completed payment
   */
  recordPayment: tenantProcedure
    .input(
      z.object({
        orderId: z.number().optional(),
        appointmentId: z.number().optional(),
        amount: z.number().min(0.01),
        paymentMethod: z.enum(["cash", "card", "vipps", "stripe"]),
        gatewayPaymentId: z.string().optional(),
        cardLast4: z.string().max(4).optional(),
        cardBrand: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Validate order belongs to tenant if provided
      if (input.orderId) {
        const order = await getOrderByIdSecure(input.orderId, ctx.tenantId);
        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }
      }

      try {
        const [result] = await db.insert(payments).values({
          tenantId: ctx.tenantId,
          orderId: input.orderId || null,
          appointmentId: input.appointmentId || null,
          amount: input.amount.toString(),
          currency: "NOK",
          paymentMethod: input.paymentMethod,
          status: "completed",
          paymentGateway: input.paymentMethod === "stripe" ? "stripe" : null,
          gatewayPaymentId: input.gatewayPaymentId || null,
          cardLast4: input.cardLast4 || null,
          cardBrand: input.cardBrand || null,
          notes: input.notes || null,
          processedBy: ctx.user.id,
          processedAt: new Date(),
          paidAt: new Date(),
        });

        const paymentId = result.insertId;

        // Update order status if applicable
        if (input.orderId) {
          await db
            .update(orders)
            .set({ status: "completed" })
            .where(
              and(
                eq(orders.id, input.orderId),
                eq(orders.tenantId, ctx.tenantId)
              )
            );
        }

        // Log payment
        await logPaymentCompleted(
          ctx.tenantId,
          paymentId,
          input.amount,
          input.paymentMethod,
          input.gatewayPaymentId
        );

        return {
          success: true,
          paymentId,
          receiptNumber: `RCP-${paymentId}`,
        };
      } catch (error: any) {
        await logPaymentFailed(
          ctx.tenantId,
          undefined,
          input.amount,
          input.paymentMethod,
          "DB_ERROR",
          error.message
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record payment",
        });
      }
    }),

  /**
   * Process split payment
   */
  processSplitPayment: tenantProcedure
    .input(
      z.object({
        orderId: z.number().optional(),
        appointmentId: z.number().optional(),
        totalAmount: z.number().min(0.01),
        splits: z.array(
          z.object({
            amount: z.number().min(0.01),
            paymentMethod: z.enum(["cash", "card", "vipps", "stripe"]),
            transactionId: z.string().optional(),
            cardLast4: z.string().max(4).optional(),
            cardBrand: z.string().optional(),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Validate split amounts
      const splitTotal = input.splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitTotal - input.totalAmount) > 0.01) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Split amounts must equal total amount",
        });
      }

      // Validate order belongs to tenant
      if (input.orderId) {
        const order = await getOrderByIdSecure(input.orderId, ctx.tenantId);
        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }
      }

      try {
        // Create parent payment
        const [parentResult] = await db.insert(payments).values({
          tenantId: ctx.tenantId,
          orderId: input.orderId || null,
          appointmentId: input.appointmentId || null,
          amount: input.totalAmount.toString(),
          currency: "NOK",
          paymentMethod: "split",
          status: "completed",
          notes: input.notes || null,
          processedBy: ctx.user.id,
          processedAt: new Date(),
          paidAt: new Date(),
        });

        const paymentId = parentResult.insertId;

        // Create split records
        for (const split of input.splits) {
          await db.insert(paymentSplits).values({
            tenantId: ctx.tenantId,
            orderId: input.orderId || null,
            paymentId,
            amount: split.amount.toString(),
            paymentMethod: split.paymentMethod,
            transactionId: split.transactionId || null,
            cardLast4: split.cardLast4 || null,
            cardBrand: split.cardBrand || null,
            status: "completed",
            processedBy: ctx.user.id,
          });
        }

        // Update order status
        if (input.orderId) {
          await db
            .update(orders)
            .set({ status: "completed" })
            .where(
              and(
                eq(orders.id, input.orderId),
                eq(orders.tenantId, ctx.tenantId)
              )
            );
        }

        // Log payment
        await logPaymentCompleted(
          ctx.tenantId,
          paymentId,
          input.totalAmount,
          "split"
        );

        return {
          success: true,
          paymentId,
          receiptNumber: `RCP-${paymentId}`,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process split payment",
        });
      }
    }),

  // ==========================================================================
  // REFUNDS
  // ==========================================================================

  /**
   * Process a refund
   */
  processRefund: tenantProcedure
    .input(
      z.object({
        paymentId: z.number(),
        amount: z.number().min(0.01).optional(), // If not provided, full refund
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get payment with tenant isolation
      const payment = await getPaymentByIdSecure(input.paymentId, ctx.tenantId);
      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      const originalAmount = parseFloat(payment.amount);
      const refundAmount = input.amount || originalAmount;

      if (refundAmount > originalAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund amount cannot exceed original payment",
        });
      }

      try {
        let gatewayRefundId: string | null = null;

        // Process Stripe refund if applicable
        if (payment.gatewayPaymentId && payment.paymentMethod === "stripe") {
          const stripeResult = await processStripeRefund(
            ctx.tenantId,
            payment.gatewayPaymentId,
            refundAmount,
            input.reason
          );
          gatewayRefundId = stripeResult.refundId;
        }

        // Create refund record
        const [refundResult] = await db.insert(refunds).values({
          tenantId: ctx.tenantId,
          paymentId: input.paymentId,
          orderId: payment.orderId || null,
          appointmentId: payment.appointmentId || null,
          amount: refundAmount.toString(),
          reason: input.reason,
          refundMethod: payment.paymentMethod === "stripe" ? "stripe" : "manual",
          status: "completed",
          gatewayRefundId,
          processedBy: ctx.user.id,
          processedAt: new Date(),
        });

        // Update payment status
        const isFullRefund = refundAmount >= originalAmount;
        await db
          .update(payments)
          .set({
            status: isFullRefund ? "refunded" : "completed",
            refundedAt: new Date(),
            refundAmount: refundAmount.toString(),
            refundReason: input.reason,
          })
          .where(
            and(
              eq(payments.id, input.paymentId),
              eq(payments.tenantId, ctx.tenantId)
            )
          );

        // Update order status if applicable
        if (payment.orderId) {
          await db
            .update(orders)
            .set({ status: isFullRefund ? "refunded" : "partially_refunded" })
            .where(
              and(
                eq(orders.id, payment.orderId),
                eq(orders.tenantId, ctx.tenantId)
              )
            );
        }

        // Log refund
        await logPaymentRefunded(
          ctx.tenantId,
          input.paymentId,
          refundAmount,
          input.reason,
          refundResult.insertId,
          gatewayRefundId || undefined
        );

        return {
          success: true,
          refundId: refundResult.insertId,
          gatewayRefundId,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to process refund",
        });
      }
    }),

  // ==========================================================================
  // PAYMENT HISTORY & REPORTS
  // ==========================================================================

  /**
   * Get payment history
   */
  getHistory: tenantProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { payments: [], total: 0 };

      const conditions = [eq(payments.tenantId, ctx.tenantId)];
      if (input.status) {
        conditions.push(eq(payments.status, input.status));
      }

      const [paymentList, countResult] = await Promise.all([
        db
          .select()
          .from(payments)
          .where(and(...conditions))
          .orderBy(desc(payments.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(payments)
          .where(and(...conditions)),
      ]);

      return {
        payments: paymentList,
        total: countResult[0]?.count || 0,
      };
    }),

  /**
   * Get payment by ID
   */
  getById: tenantProcedure
    .input(z.object({ paymentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const payment = await getPaymentByIdSecure(input.paymentId, ctx.tenantId);
      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }
      return payment;
    }),

  // ==========================================================================
  // MONITORING & LOGS
  // ==========================================================================

  /**
   * Get payment logs (admin only)
   */
  getLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(100),
        level: z.enum(["info", "warning", "error", "critical"]).optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getRecentLogs(ctx.tenantId, {
        limit: input.limit,
        level: input.level as any,
        category: input.category as any,
      });
    }),

  /**
   * Get payment failure summary (admin only)
   */
  getFailureSummary: adminProcedure
    .input(
      z.object({
        hoursBack: z.number().min(1).max(168).default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      return getPaymentFailureSummary(ctx.tenantId, input.hoursBack);
    }),

  /**
   * Get payment success rate (admin only)
   */
  getSuccessRate: adminProcedure
    .input(
      z.object({
        hoursBack: z.number().min(1).max(168).default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      return getPaymentSuccessRate(ctx.tenantId, input.hoursBack);
    }),
});
