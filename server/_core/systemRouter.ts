import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./trpc";
import { ENV } from "./env";
import * as db from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  // System status for diagnostics
  status: protectedProcedure.query(async ({ ctx }) => {
    const dbInstance = await db.getDb();
    
    // Test DB connectivity
    let dbConnected = false;
    let dbError = null;
    try {
      if (dbInstance) {
        await dbInstance.execute(db.sql`SELECT 1`);
        dbConnected = true;
      }
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error);
    }

    // Get JWT info from context
    const jwtInfo = {
      userId: ctx.user?.id,
      openId: ctx.user?.openId,
      email: ctx.user?.email,
      role: ctx.user?.role,
      tenantId: ctx.user?.tenantId,
      impersonating: ctx.user?.isImpersonating ?? false,
      impersonatedTenantId: ctx.user?.impersonatedTenantId,
    };

    return {
      environment: ENV.isProduction ? "production" : "development",
      nodeEnv: process.env.NODE_ENV || "development",
      database: {
        connected: dbConnected,
        error: dbError,
      },
      currentUser: jwtInfo,
      timestamp: new Date().toISOString(),
    };
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
