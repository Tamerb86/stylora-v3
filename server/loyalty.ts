import { getDb } from "./db";
import {
  loyaltyPoints,
  loyaltyTransactions,
  loyaltyRewards,
  loyaltyRedemptions,
  settings,
} from "../drizzle/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Robustly read the affected-row count from a drizzle/mysql2 write result.
 * mysql2 returns [ResultSetHeader, FieldPacket[]] where the count lives in
 * ResultSetHeader.affectedRows (NOT `rowsAffected`).
 */
function getAffectedRows(result: any): number {
  if (Array.isArray(result)) return Number(result[0]?.affectedRows ?? 0);
  return Number(result?.affectedRows ?? result?.rowsAffected ?? 0);
}

/**
 * Get or create loyalty points record for a customer
 */
export async function getOrCreateLoyaltyPoints(
  tenantId: string,
  customerId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(loyaltyPoints)
    .where(
      and(
        eq(loyaltyPoints.tenantId, tenantId),
        eq(loyaltyPoints.customerId, customerId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new loyalty points record
  await db.insert(loyaltyPoints).values({
    tenantId,
    customerId,
    currentPoints: 0,
    lifetimePoints: 0,
  });

  const newRecord = await db
    .select()
    .from(loyaltyPoints)
    .where(
      and(
        eq(loyaltyPoints.tenantId, tenantId),
        eq(loyaltyPoints.customerId, customerId)
      )
    )
    .limit(1);

  return newRecord[0];
}

/**
 * Get loyalty settings for a tenant
 */
export async function getLoyaltySettings(tenantId: string) {
  const db = await getDb();
  if (!db) return { enabled: false, pointsPerVisit: 10, pointsPerNOK: 1.0 };

  const settingsData = await db
    .select()
    .from(settings)
    .where(
      and(
        eq(settings.tenantId, tenantId),
        sql`${settings.settingKey} IN ('loyaltyEnabled', 'loyaltyPointsPerVisit', 'loyaltyPointsPerNOK')`
      )
    );

  const config = {
    enabled: true,
    pointsPerVisit: 10,
    pointsPerNOK: 1.0,
  };

  settingsData.forEach(setting => {
    if (setting.settingKey === "loyaltyEnabled") {
      config.enabled = setting.settingValue === "true";
    } else if (setting.settingKey === "loyaltyPointsPerVisit") {
      config.pointsPerVisit = parseInt(setting.settingValue || "10");
    } else if (setting.settingKey === "loyaltyPointsPerNOK") {
      config.pointsPerNOK = parseFloat(setting.settingValue || "1.0");
    }
  });

  return config;
}

/**
 * Award points to a customer
 */
export async function awardPoints(
  tenantId: string,
  customerId: number,
  points: number,
  reason: string,
  referenceType?: string,
  referenceId?: number,
  performedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get or create loyalty points record
  const loyaltyRecord = await getOrCreateLoyaltyPoints(tenantId, customerId);

  // Increment and record atomically.
  await db.transaction(async tx => {
    await tx
      .update(loyaltyPoints)
      .set({
        currentPoints: sql`${loyaltyPoints.currentPoints} + ${points}`,
        lifetimePoints: sql`${loyaltyPoints.lifetimePoints} + ${points}`,
      })
      .where(eq(loyaltyPoints.id, loyaltyRecord!.id));

    await tx.insert(loyaltyTransactions).values({
      tenantId,
      customerId,
      type: "earn",
      points,
      reason,
      referenceType,
      referenceId,
      performedBy,
    });
  });

  // Re-read the authoritative balance (the pre-read value is stale under
  // concurrency).
  const [fresh] = await db
    .select()
    .from(loyaltyPoints)
    .where(eq(loyaltyPoints.id, loyaltyRecord!.id))
    .limit(1);

  return {
    success: true,
    newBalance: fresh?.currentPoints ?? 0,
  };
}

/**
 * Deduct points from a customer (for redemption or adjustment)
 */
export async function deductPoints(
  tenantId: string,
  customerId: number,
  points: number,
  reason: string,
  type: "redeem" | "adjustment" | "expire" = "redeem",
  referenceType?: string,
  referenceId?: number,
  performedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get loyalty points record
  const loyaltyRecord = await getOrCreateLoyaltyPoints(tenantId, customerId);

  let transactionId: number | undefined;

  // Deduct and record atomically. The decrement is guarded by
  // `currentPoints >= points` in the WHERE clause, so two concurrent
  // redemptions can't both pass a stale JS check and drive the balance
  // negative (double-spend). If the guarded update affects 0 rows, there
  // weren't enough points and the transaction rolls back.
  await db.transaction(async tx => {
    const result = await tx
      .update(loyaltyPoints)
      .set({
        currentPoints: sql`${loyaltyPoints.currentPoints} - ${points}`,
      })
      .where(
        and(
          eq(loyaltyPoints.id, loyaltyRecord!.id),
          gte(loyaltyPoints.currentPoints, points)
        )
      );

    if (getAffectedRows(result) === 0) {
      throw new Error("Insufficient points");
    }

    const [inserted] = await tx.insert(loyaltyTransactions).values({
      tenantId,
      customerId,
      type,
      points: -points,
      reason,
      referenceType,
      referenceId,
      performedBy,
    });
    transactionId = (inserted as any)?.insertId;
  });

  // Re-read the authoritative balance after the committed transaction.
  const [fresh] = await db
    .select()
    .from(loyaltyPoints)
    .where(eq(loyaltyPoints.id, loyaltyRecord!.id))
    .limit(1);

  return {
    success: true,
    newBalance: fresh?.currentPoints ?? 0,
    transactionId,
  };
}

/**
 * Redeem a reward
 */
export async function redeemReward(
  tenantId: string,
  customerId: number,
  rewardId: number,
  performedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get reward details
  const reward = await db
    .select()
    .from(loyaltyRewards)
    .where(
      and(
        eq(loyaltyRewards.id, rewardId),
        eq(loyaltyRewards.tenantId, tenantId)
      )
    )
    .limit(1);

  if (reward.length === 0 || !reward[0]?.isActive) {
    throw new Error("Reward not found or inactive");
  }

  const rewardData = reward[0];

  // Deduct points
  const deduction = await deductPoints(
    tenantId,
    customerId,
    rewardData.pointsCost,
    `Redeemed: ${rewardData.name}`,
    "redeem",
    "reward",
    rewardId,
    performedBy
  );

  // Create redemption record
  const code = nanoid(12).toUpperCase();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (rewardData.validityDays || 30));

  await db.insert(loyaltyRedemptions).values({
    tenantId,
    customerId,
    rewardId,
    transactionId: deduction.transactionId,
    code,
    status: "active",
    expiresAt,
  });

  return {
    success: true,
    code,
    expiresAt,
    reward: rewardData,
    newBalance: deduction.newBalance,
  };
}

/**
 * Get customer loyalty history
 */
export async function getCustomerLoyaltyHistory(
  tenantId: string,
  customerId: number,
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(loyaltyTransactions)
    .where(
      and(
        eq(loyaltyTransactions.tenantId, tenantId),
        eq(loyaltyTransactions.customerId, customerId)
      )
    )
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(limit);
}

/**
 * Get customer active redemptions
 */
export async function getCustomerRedemptions(
  tenantId: string,
  customerId: number
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      redemption: loyaltyRedemptions,
      reward: loyaltyRewards,
    })
    .from(loyaltyRedemptions)
    .leftJoin(
      loyaltyRewards,
      eq(loyaltyRedemptions.rewardId, loyaltyRewards.id)
    )
    .where(
      and(
        eq(loyaltyRedemptions.tenantId, tenantId),
        eq(loyaltyRedemptions.customerId, customerId),
        eq(loyaltyRedemptions.status, "active"),
        sql`${loyaltyRedemptions.expiresAt} > NOW()`
      )
    )
    .orderBy(desc(loyaltyRedemptions.createdAt));
}
