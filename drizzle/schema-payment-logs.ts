/**
 * Payment Logs Schema Extension
 * 
 * Add this to your main schema.ts file to include payment logging support.
 */

import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  index,
} from "drizzle-orm/mysql-core";

// ============================================================================
// PAYMENT LOGS (for monitoring and debugging)
// ============================================================================

export const paymentLogs = mysqlTable(
  "payment_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    tenantId: varchar("tenant_id", { length: 36 }).notNull(),
    level: mysqlEnum("level", ["info", "warning", "error", "critical"])
      .default("info")
      .notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    message: text("message").notNull(),
    details: json("details"),
    paymentId: int("payment_id"),
    orderId: int("order_id"),
    appointmentId: int("appointment_id"),
    userId: int("user_id"),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_tenant_id").on(table.tenantId),
    levelIdx: index("idx_level").on(table.level),
    categoryIdx: index("idx_category").on(table.category),
    paymentIdx: index("idx_payment_id").on(table.paymentId),
    createdAtIdx: index("idx_created_at").on(table.createdAt),
    tenantLevelCreatedIdx: index("idx_tenant_level_created").on(
      table.tenantId,
      table.level,
      table.createdAt
    ),
  })
);

export type PaymentLog = typeof paymentLogs.$inferSelect;
export type InsertPaymentLog = typeof paymentLogs.$inferInsert;
