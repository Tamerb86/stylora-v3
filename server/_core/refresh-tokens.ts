/**
 * Refresh Token Service
 * Handles generation, validation, and revocation of refresh tokens
 */

import { nanoid } from "nanoid";
import { getDb } from "../db";
import { refreshTokens, users } from "../../drizzle/schema";
import { eq, and, or, lt } from "drizzle-orm";
import { logger, logAuth, logSecurity } from "./logger";

const REFRESH_TOKEN_EXPIRY_DAYS = 90;

/**
 * Read the affected-row count from a mysql2/drizzle write result. The driver
 * returns a ResultSetHeader (affectedRows), sometimes wrapped in a tuple — not
 * an array with `.length`.
 */
function affectedRowsOf(result: unknown): number {
  const r = result as any;
  return r?.rowsAffected ?? r?.affectedRows ?? r?.[0]?.affectedRows ?? 0;
}

export interface RefreshTokenData {
  token: string;
  userId: number;
  tenantId: string;
  expiresAt: Date;
}

/**
 * Generate a new refresh token for a user
 */
export async function createRefreshToken(
  userId: number,
  tenantId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Generate secure random token
  const token = nanoid(64); // 64 characters = ~384 bits of entropy

  // Calculate expiry date (90 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Insert into database
  await db.insert(refreshTokens).values({
    token,
    userId,
    tenantId,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    revoked: false,
  });

  logger.info("Refresh token created", {
    userId,
    tenantId,
    expiresAt,
    ipAddress,
  });

  return token;
}

/**
 * Validate and retrieve refresh token data
 * Returns null if token is invalid, expired, or revoked
 */
export async function validateRefreshToken(
  token: string
): Promise<RefreshTokenData | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Find token in database
  const [tokenRecord] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .limit(1);

  if (!tokenRecord) {
    logger.warn("Refresh token not found", {
      token: token.substring(0, 10) + "...",
    });
    return null;
  }

  // Check if revoked
  if (tokenRecord.revoked) {
    logSecurity.unauthorizedAccess(
      "/auth/refresh",
      tokenRecord.ipAddress || undefined
    );
    logger.warn("Attempted use of revoked refresh token", {
      tokenId: tokenRecord.id,
      userId: tokenRecord.userId,
      revokedAt: tokenRecord.revokedAt,
      revokedReason: tokenRecord.revokedReason,
    });
    return null;
  }

  // Check if expired
  if (tokenRecord.expiresAt < new Date()) {
    logger.info("Refresh token expired", {
      tokenId: tokenRecord.id,
      userId: tokenRecord.userId,
      expiresAt: tokenRecord.expiresAt,
    });
    return null;
  }

  // Update last used timestamp
  await db
    .update(refreshTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(refreshTokens.id, tokenRecord.id));

  return {
    token: tokenRecord.token,
    userId: tokenRecord.userId,
    tenantId: tokenRecord.tenantId,
    expiresAt: tokenRecord.expiresAt,
  };
}

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(
  token: string,
  reason?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .update(refreshTokens)
    .set({
      revoked: true,
      revokedAt: new Date(),
      revokedReason: reason || "User logout",
    })
    .where(eq(refreshTokens.token, token));

  // mysql2 returns a ResultSetHeader (affectedRows), not an array — reading
  // .length always yielded undefined/false here.
  const affected = affectedRowsOf(result);
  const revoked = affected > 0;

  if (revoked) {
    logger.info("Refresh token revoked", {
      token: token.substring(0, 10) + "...",
      reason,
    });
  }

  return revoked;
}

/**
 * Revoke all refresh tokens for a user
 * Useful for "logout from all devices"
 */
export async function revokeAllUserTokens(
  userId: number,
  reason?: string
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .update(refreshTokens)
    .set({
      revoked: true,
      revokedAt: new Date(),
      revokedReason: reason || "Logout from all devices",
    })
    .where(
      and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false))
    );

  const count = affectedRowsOf(result);

  logger.info("All user refresh tokens revoked", { userId, count, reason });

  return count;
}

/**
 * Revoke all refresh tokens for a tenant
 * Useful for security incidents
 */
export async function revokeAllTenantTokens(
  tenantId: string,
  reason?: string
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .update(refreshTokens)
    .set({
      revoked: true,
      revokedAt: new Date(),
      revokedReason: reason || "Tenant security action",
    })
    .where(
      and(
        eq(refreshTokens.tenantId, tenantId),
        eq(refreshTokens.revoked, false)
      )
    );

  const count = affectedRowsOf(result);

  logger.warn("All tenant refresh tokens revoked", { tenantId, count, reason });

  return count;
}

/**
 * Get user data from refresh token
 * Returns user info if token is valid
 */
export async function getUserFromRefreshToken(token: string) {
  const tokenData = await validateRefreshToken(token);
  if (!tokenData) {
    return null;
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get user data
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, tokenData.userId),
        eq(users.tenantId, tokenData.tenantId),
        eq(users.isActive, true)
      )
    )
    .limit(1);

  if (!user) {
    logger.warn("User not found or inactive for valid refresh token", {
      userId: tokenData.userId,
      tenantId: tokenData.tenantId,
    });
    return null;
  }

  return user;
}

/**
 * Rotate a refresh token: validate the presented token, revoke it, and issue a
 * fresh one — returning the active user and the new token. This limits the
 * lifetime of any single stolen token to one refresh cycle.
 *
 * Reuse detection: if a token that is ALREADY revoked is presented, a
 * previously-rotated (or logged-out) token is being replayed — a strong theft
 * signal — so the entire token family for that user is revoked.
 *
 * Returns null if the token is unknown, expired, reused, or the user is gone.
 */
export async function rotateRefreshToken(
  oldToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: typeof users.$inferSelect; newToken: string } | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const [tokenRecord] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, oldToken))
    .limit(1);

  if (!tokenRecord) {
    return null;
  }

  // Reuse of a revoked token → treat as theft and kill the whole family.
  if (tokenRecord.revoked) {
    logSecurity.unauthorizedAccess(
      "/auth/refresh",
      tokenRecord.ipAddress || undefined
    );
    logger.error(
      "Refresh token reuse detected — revoking all tokens for user",
      {
        tokenId: tokenRecord.id,
        userId: tokenRecord.userId,
      }
    );
    await revokeAllUserTokens(
      tokenRecord.userId,
      "Refresh token reuse detected"
    );
    return null;
  }

  if (tokenRecord.expiresAt < new Date()) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, tokenRecord.userId),
        eq(users.tenantId, tokenRecord.tenantId),
        eq(users.isActive, true)
      )
    )
    .limit(1);

  if (!user) {
    return null;
  }

  const newToken = nanoid(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Revoke the old token and insert the new one atomically.
  await db.transaction(async tx => {
    await tx
      .update(refreshTokens)
      .set({
        revoked: true,
        revokedAt: new Date(),
        revokedReason: "Rotated on refresh",
      })
      .where(eq(refreshTokens.id, tokenRecord.id));

    await tx.insert(refreshTokens).values({
      token: newToken,
      userId: tokenRecord.userId,
      tenantId: tokenRecord.tenantId,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      revoked: false,
    });
  });

  return { user, newToken };
}

/**
 * Cleanup expired and old revoked tokens
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Delete expired tokens OR revoked tokens older than 30 days
  const result = await db.delete(refreshTokens).where(
    or(
      lt(refreshTokens.expiresAt, now),
      // Also delete old revoked tokens
      and(
        eq(refreshTokens.revoked, true),
        lt(refreshTokens.revokedAt, thirtyDaysAgo)
      )
    )
  );

  const count = affectedRowsOf(result);

  logger.info("Expired refresh tokens cleaned up", { count });

  return count;
}

/**
 * Get all active refresh tokens for a user
 * Useful for "active sessions" management UI
 */
export async function getUserActiveTokens(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const tokens = await db
    .select({
      id: refreshTokens.id,
      createdAt: refreshTokens.createdAt,
      lastUsedAt: refreshTokens.lastUsedAt,
      expiresAt: refreshTokens.expiresAt,
      ipAddress: refreshTokens.ipAddress,
      userAgent: refreshTokens.userAgent,
    })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.revoked, false),
        lt(new Date(), refreshTokens.expiresAt) // Not expired
      )
    )
    .orderBy(refreshTokens.lastUsedAt);

  return tokens;
}
