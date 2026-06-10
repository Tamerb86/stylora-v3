import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import {
  loyaltyPoints,
  loyaltyTransactions,
  loyaltyRewards,
  loyaltyRedemptions,
  customers,
  appointments,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { deductPoints } from "./loyalty";

export const loyaltyRouter = router({
  // Get customer's current points balance
  getCustomerPoints: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Find customer by phone
      const [customer] = await dbInstance
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, input.tenantId),
            eq(customers.phone, ctx.user.phone || "")
          )
        )
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Get or create loyalty points record
      let [loyaltyRecord] = await dbInstance
        .select()
        .from(loyaltyPoints)
        .where(
          and(
            eq(loyaltyPoints.tenantId, input.tenantId),
            eq(loyaltyPoints.customerId, customer.id)
          )
        )
        .limit(1);

      if (!loyaltyRecord) {
        // Create new loyalty record
        const [inserted] = await dbInstance.insert(loyaltyPoints).values({
          tenantId: input.tenantId,
          customerId: customer.id,
          currentPoints: 0,
          lifetimePoints: 0,
        });

        [loyaltyRecord] = await dbInstance
          .select()
          .from(loyaltyPoints)
          .where(eq(loyaltyPoints.id, inserted.insertId))
          .limit(1);
      }

      return loyaltyRecord;
    }),

  // Get transaction history
  getTransactionHistory: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Find customer
      const [customer] = await dbInstance
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, input.tenantId),
            eq(customers.phone, ctx.user.phone || "")
          )
        )
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Get transactions
      const transactions = await dbInstance
        .select()
        .from(loyaltyTransactions)
        .where(
          and(
            eq(loyaltyTransactions.tenantId, input.tenantId),
            eq(loyaltyTransactions.customerId, customer.id)
          )
        )
        .orderBy(desc(loyaltyTransactions.createdAt))
        .limit(input.limit);

      return transactions;
    }),

  // Get available rewards
  getAvailableRewards: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const rewards = await dbInstance
        .select()
        .from(loyaltyRewards)
        .where(
          and(
            eq(loyaltyRewards.tenantId, input.tenantId),
            eq(loyaltyRewards.isActive, true)
          )
        )
        .orderBy(loyaltyRewards.pointsCost);

      return rewards;
    }),

  // Redeem a reward
  redeemReward: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        rewardId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Find customer
      const [customer] = await dbInstance
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, input.tenantId),
            eq(customers.phone, ctx.user.phone || "")
          )
        )
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Get reward details
      const [reward] = await dbInstance
        .select()
        .from(loyaltyRewards)
        .where(
          and(
            eq(loyaltyRewards.id, input.rewardId),
            eq(loyaltyRewards.tenantId, input.tenantId),
            eq(loyaltyRewards.isActive, true)
          )
        )
        .limit(1);

      if (!reward) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reward not found or inactive",
        });
      }

      // Atomically deduct the reward cost. deductPoints guards against
      // double-spend (WHERE currentPoints >= cost) and records the ledger
      // entry in a transaction; it throws "Insufficient points" if the balance
      // is too low.
      let deduction;
      try {
        deduction = await deductPoints(
          input.tenantId,
          customer.id,
          reward.pointsCost,
          `Redeemed reward: ${reward.name}`,
          "redeem",
          "reward",
          reward.id
        );
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            e instanceof Error ? e.message : "Insufficient points",
        });
      }

      // Create redemption record with unique code
      const redemptionCode = nanoid(12).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (reward.validityDays || 30));

      const [redemption] = await dbInstance.insert(loyaltyRedemptions).values({
        tenantId: input.tenantId,
        customerId: customer.id,
        rewardId: reward.id,
        transactionId: deduction.transactionId,
        code: redemptionCode,
        status: "active",
        expiresAt,
      });

      return {
        success: true,
        message: "Reward redeemed successfully!",
        code: redemptionCode,
        expiresAt,
        reward: {
          name: reward.name,
          description: reward.description,
          discountType: reward.discountType,
          discountValue: reward.discountValue,
        },
      };
    }),

  // Get customer's active redemptions
  getActiveRedemptions: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Find customer
      const [customer] = await dbInstance
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, input.tenantId),
            eq(customers.phone, ctx.user.phone || "")
          )
        )
        .limit(1);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Get active redemptions with reward details
      const redemptions = await dbInstance
        .select({
          id: loyaltyRedemptions.id,
          code: loyaltyRedemptions.code,
          status: loyaltyRedemptions.status,
          expiresAt: loyaltyRedemptions.expiresAt,
          createdAt: loyaltyRedemptions.createdAt,
          rewardName: loyaltyRewards.name,
          rewardDescription: loyaltyRewards.description,
          discountType: loyaltyRewards.discountType,
          discountValue: loyaltyRewards.discountValue,
        })
        .from(loyaltyRedemptions)
        .innerJoin(
          loyaltyRewards,
          eq(loyaltyRedemptions.rewardId, loyaltyRewards.id)
        )
        .where(
          and(
            eq(loyaltyRedemptions.tenantId, input.tenantId),
            eq(loyaltyRedemptions.customerId, customer.id),
            eq(loyaltyRedemptions.status, "active")
          )
        )
        .orderBy(desc(loyaltyRedemptions.createdAt));

      return redemptions;
    }),

  // Earn points (called after appointment completion)
  earnPoints: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        appointmentId: z.number(),
        amount: z.number(), // Total amount spent
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // SECURITY: derive the tenant from the caller, never from input — and
      // only internal staff may award points. This stops any authenticated
      // user from minting redeemable points for any customer in any tenant.
      const tenantId = String(ctx.user.tenantId);
      if (!["owner", "admin", "employee"].includes(ctx.user.role as string)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify the target customer belongs to the caller's tenant.
      const [targetCustomer] = await dbInstance
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!targetCustomer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Calculate points (1 point per 100 kr spent)
      const pointsEarned = Math.floor(input.amount / 100);

      if (pointsEarned === 0) {
        return {
          success: true,
          pointsEarned: 0,
          message: "No points earned (minimum 100 kr required)",
        };
      }

      // Get or create loyalty record
      let [loyaltyRecord] = await dbInstance
        .select()
        .from(loyaltyPoints)
        .where(
          and(
            eq(loyaltyPoints.tenantId, tenantId),
            eq(loyaltyPoints.customerId, input.customerId)
          )
        )
        .limit(1);

      if (!loyaltyRecord) {
        const [inserted] = await dbInstance.insert(loyaltyPoints).values({
          tenantId,
          customerId: input.customerId,
          currentPoints: 0,
          lifetimePoints: 0,
        });

        [loyaltyRecord] = await dbInstance
          .select()
          .from(loyaltyPoints)
          .where(eq(loyaltyPoints.id, inserted.insertId))
          .limit(1);
      }

      // Add points
      await dbInstance
        .update(loyaltyPoints)
        .set({
          currentPoints: loyaltyRecord.currentPoints + pointsEarned,
          lifetimePoints: loyaltyRecord.lifetimePoints + pointsEarned,
        })
        .where(eq(loyaltyPoints.id, loyaltyRecord.id));

      // Create transaction record
      await dbInstance.insert(loyaltyTransactions).values({
        tenantId,
        customerId: input.customerId,
        type: "earn",
        points: pointsEarned,
        reason: `Earned from appointment #${input.appointmentId}`,
        referenceType: "appointment",
        referenceId: input.appointmentId,
      });

      return {
        success: true,
        pointsEarned,
        newBalance: loyaltyRecord.currentPoints + pointsEarned,
        message: `You earned ${pointsEarned} points!`,
      };
    }),
});
