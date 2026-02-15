import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authService } from "./auth-simple";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type UserWithImpersonation = User & {
  impersonatedTenantId?: string | null;
  isImpersonating?: boolean;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: UserWithImpersonation | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let impersonatedTenantId: string | null = null;
  let isImpersonating = false;

  try {
    const result = await authService.authenticateRequest(opts.req);
    if (result) {
      user = result.user;
      impersonatedTenantId = result.impersonatedTenantId;
      isImpersonating = result.isImpersonating ?? false;
    }

    // Fix: If tenantId looks like an email (contains @), fetch fresh data from DB
    if (user && user.tenantId && user.tenantId.includes("@")) {
      const db = await getDb();
      if (db) {
        const freshUser = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        if (freshUser.length > 0) {
          user = freshUser[0];
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user: user ? { ...user, impersonatedTenantId, isImpersonating } : null,
  };
}
