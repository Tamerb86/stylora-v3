import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { logger } from "./logger";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Audit (do not block) every write performed while impersonating, so each
// change is attributable to the acting platform admin. Impersonation is used
// by support to fix tenant data, so writes must still be allowed.
const auditImpersonatedWrites = t.middleware(async opts => {
  const { ctx, next, type, path } = opts;

  if (type === "mutation" && ctx.user?.isImpersonating) {
    logger.warn("Mutation performed during impersonation", {
      event: "impersonation.write",
      actingOpenId: ctx.user.openId,
      targetTenantId: ctx.user.tenantId,
      procedure: path,
    });
  }

  return next();
});

export const protectedProcedure = t.procedure
  .use(requireUser)
  .use(auditImpersonatedWrites);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);

// Helper function to require valid tenant context
export function requireTenant(ctx: TrpcContext): string {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  if (!ctx.user.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No tenant access. User must be associated with a tenant.",
    });
  }

  return ctx.user.tenantId;
}
