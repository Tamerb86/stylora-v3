/**
 * Payment Logger Service
 * 
 * This service provides comprehensive logging for all payment operations.
 * It logs successes, failures, and suspicious activities for debugging and monitoring.
 */

import { getDb } from "../db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export type PaymentLogLevel = "info" | "warning" | "error" | "critical";

export type PaymentLogCategory = 
  | "payment_created"
  | "payment_completed"
  | "payment_failed"
  | "payment_refunded"
  | "stripe_connect"
  | "stripe_webhook"
  | "vipps_payment"
  | "terminal_payment"
  | "security_breach"
  | "tenant_isolation";

export interface PaymentLogEntry {
  id?: number;
  tenantId: string;
  level: PaymentLogLevel;
  category: PaymentLogCategory;
  message: string;
  details?: Record<string, unknown>;
  paymentId?: number;
  orderId?: number;
  appointmentId?: number;
  userId?: number;
  stripePaymentIntentId?: string;
  errorCode?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

// ============================================================================
// IN-MEMORY LOG BUFFER (for development/debugging)
// ============================================================================

const logBuffer: PaymentLogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Log a payment event
 */
export async function logPayment(entry: PaymentLogEntry): Promise<void> {
  const logEntry: PaymentLogEntry = {
    ...entry,
    createdAt: new Date(),
  };

  // Add to in-memory buffer
  logBuffer.push(logEntry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift(); // Remove oldest entry
  }

  // Console log based on level
  const logMessage = `[Payment ${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}`;
  
  switch (entry.level) {
    case "critical":
    case "error":
      console.error(logMessage, {
        tenantId: entry.tenantId,
        paymentId: entry.paymentId,
        orderId: entry.orderId,
        errorCode: entry.errorCode,
        errorMessage: entry.errorMessage,
        details: entry.details,
      });
      break;
    case "warning":
      console.warn(logMessage, {
        tenantId: entry.tenantId,
        details: entry.details,
      });
      break;
    default:
      console.log(logMessage, {
        tenantId: entry.tenantId,
        paymentId: entry.paymentId,
      });
  }

  // Try to persist to database (optional - don't fail if DB unavailable)
  try {
    await persistLogToDatabase(logEntry);
  } catch (error) {
    console.error("[PaymentLogger] Failed to persist log to database:", error);
  }
}

/**
 * Log payment creation
 */
export async function logPaymentCreated(
  tenantId: string,
  paymentId: number,
  amount: number,
  paymentMethod: string,
  orderId?: number,
  appointmentId?: number,
  userId?: number
): Promise<void> {
  await logPayment({
    tenantId,
    level: "info",
    category: "payment_created",
    message: `Payment created: ${amount} NOK via ${paymentMethod}`,
    paymentId,
    orderId,
    appointmentId,
    userId,
    details: {
      amount,
      paymentMethod,
    },
  });
}

/**
 * Log payment completion
 */
export async function logPaymentCompleted(
  tenantId: string,
  paymentId: number,
  amount: number,
  paymentMethod: string,
  gatewayPaymentId?: string
): Promise<void> {
  await logPayment({
    tenantId,
    level: "info",
    category: "payment_completed",
    message: `Payment completed: ${amount} NOK via ${paymentMethod}`,
    paymentId,
    stripePaymentIntentId: gatewayPaymentId,
    details: {
      amount,
      paymentMethod,
      gatewayPaymentId,
    },
  });
}

/**
 * Log payment failure
 */
export async function logPaymentFailed(
  tenantId: string,
  paymentId: number | undefined,
  amount: number,
  paymentMethod: string,
  errorCode: string,
  errorMessage: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logPayment({
    tenantId,
    level: "error",
    category: "payment_failed",
    message: `Payment failed: ${amount} NOK via ${paymentMethod} - ${errorMessage}`,
    paymentId,
    errorCode,
    errorMessage,
    details: {
      amount,
      paymentMethod,
      ...details,
    },
  });
}

/**
 * Log payment refund
 */
export async function logPaymentRefunded(
  tenantId: string,
  paymentId: number,
  refundAmount: number,
  reason: string,
  refundId?: number,
  gatewayRefundId?: string
): Promise<void> {
  await logPayment({
    tenantId,
    level: "info",
    category: "payment_refunded",
    message: `Payment refunded: ${refundAmount} NOK - ${reason}`,
    paymentId,
    details: {
      refundAmount,
      reason,
      refundId,
      gatewayRefundId,
    },
  });
}

/**
 * Log Stripe Connect event
 */
export async function logStripeConnect(
  tenantId: string,
  event: "connected" | "disconnected" | "webhook_received" | "account_updated",
  accountId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logPayment({
    tenantId,
    level: "info",
    category: "stripe_connect",
    message: `Stripe Connect: ${event}`,
    details: {
      event,
      accountId,
      ...details,
    },
  });
}

/**
 * Log Stripe webhook event
 */
export async function logStripeWebhook(
  tenantId: string,
  eventType: string,
  eventId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await logPayment({
    tenantId,
    level: success ? "info" : "error",
    category: "stripe_webhook",
    message: `Stripe webhook: ${eventType} - ${success ? "processed" : "failed"}`,
    errorMessage,
    details: {
      eventType,
      eventId,
      success,
    },
  });
}

/**
 * Log security breach attempt
 */
export async function logSecurityBreach(
  tenantId: string,
  breachType: string,
  requestedResource: string,
  actualOwner: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logPayment({
    tenantId,
    level: "critical",
    category: "security_breach",
    message: `Security breach attempt: ${breachType}`,
    ipAddress,
    userAgent,
    details: {
      breachType,
      requestedResource,
      actualOwner,
    },
  });
}

/**
 * Log tenant isolation event
 */
export async function logTenantIsolation(
  tenantId: string,
  action: string,
  resourceType: string,
  resourceId: number | string,
  success: boolean
): Promise<void> {
  await logPayment({
    tenantId,
    level: success ? "info" : "warning",
    category: "tenant_isolation",
    message: `Tenant isolation: ${action} ${resourceType} ${resourceId}`,
    details: {
      action,
      resourceType,
      resourceId,
      success,
    },
  });
}

// ============================================================================
// LOG RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get recent payment logs for a tenant
 */
export function getRecentLogs(
  tenantId: string,
  options: {
    limit?: number;
    level?: PaymentLogLevel;
    category?: PaymentLogCategory;
  } = {}
): PaymentLogEntry[] {
  const { limit = 100, level, category } = options;

  let filtered = logBuffer.filter((log) => log.tenantId === tenantId);

  if (level) {
    filtered = filtered.filter((log) => log.level === level);
  }

  if (category) {
    filtered = filtered.filter((log) => log.category === category);
  }

  return filtered.slice(-limit).reverse();
}

/**
 * Get payment failure summary for a tenant
 */
export function getPaymentFailureSummary(
  tenantId: string,
  hoursBack: number = 24
): {
  totalFailures: number;
  byErrorCode: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  recentFailures: PaymentLogEntry[];
} {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  const failures = logBuffer.filter(
    (log) =>
      log.tenantId === tenantId &&
      log.category === "payment_failed" &&
      log.createdAt &&
      log.createdAt >= cutoff
  );

  const byErrorCode: Record<string, number> = {};
  const byPaymentMethod: Record<string, number> = {};

  for (const failure of failures) {
    const errorCode = failure.errorCode || "unknown";
    const paymentMethod = (failure.details?.paymentMethod as string) || "unknown";

    byErrorCode[errorCode] = (byErrorCode[errorCode] || 0) + 1;
    byPaymentMethod[paymentMethod] = (byPaymentMethod[paymentMethod] || 0) + 1;
  }

  return {
    totalFailures: failures.length,
    byErrorCode,
    byPaymentMethod,
    recentFailures: failures.slice(-10).reverse(),
  };
}

/**
 * Get payment success rate for a tenant
 */
export function getPaymentSuccessRate(
  tenantId: string,
  hoursBack: number = 24
): {
  successRate: number;
  totalAttempts: number;
  successful: number;
  failed: number;
} {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  const relevantLogs = logBuffer.filter(
    (log) =>
      log.tenantId === tenantId &&
      (log.category === "payment_completed" || log.category === "payment_failed") &&
      log.createdAt &&
      log.createdAt >= cutoff
  );

  const successful = relevantLogs.filter((log) => log.category === "payment_completed").length;
  const failed = relevantLogs.filter((log) => log.category === "payment_failed").length;
  const totalAttempts = successful + failed;

  return {
    successRate: totalAttempts > 0 ? (successful / totalAttempts) * 100 : 100,
    totalAttempts,
    successful,
    failed,
  };
}

// ============================================================================
// DATABASE PERSISTENCE (Optional)
// ============================================================================

/**
 * Persist log entry to database
 * This creates a payment_logs table if it doesn't exist
 */
async function persistLogToDatabase(entry: PaymentLogEntry): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Use raw SQL to insert into payment_logs table
  // The table will be created via migration
  try {
    await db.execute(sql`
      INSERT INTO payment_logs (
        tenant_id, level, category, message, details,
        payment_id, order_id, appointment_id, user_id,
        stripe_payment_intent_id, error_code, error_message,
        ip_address, user_agent, created_at
      ) VALUES (
        ${entry.tenantId},
        ${entry.level},
        ${entry.category},
        ${entry.message},
        ${JSON.stringify(entry.details || {})},
        ${entry.paymentId || null},
        ${entry.orderId || null},
        ${entry.appointmentId || null},
        ${entry.userId || null},
        ${entry.stripePaymentIntentId || null},
        ${entry.errorCode || null},
        ${entry.errorMessage || null},
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        NOW()
      )
    `);
  } catch (error) {
    // Table might not exist yet - that's okay
    // The migration will create it
  }
}

// ============================================================================
// ALERT FUNCTIONS
// ============================================================================

/**
 * Check if payment failure rate exceeds threshold
 */
export function shouldAlertOnFailureRate(
  tenantId: string,
  thresholdPercent: number = 20,
  minAttempts: number = 5
): boolean {
  const stats = getPaymentSuccessRate(tenantId, 1); // Last hour
  
  if (stats.totalAttempts < minAttempts) {
    return false;
  }

  const failureRate = 100 - stats.successRate;
  return failureRate >= thresholdPercent;
}

/**
 * Get alert message for high failure rate
 */
export function getFailureRateAlertMessage(tenantId: string): string | null {
  if (!shouldAlertOnFailureRate(tenantId)) {
    return null;
  }

  const stats = getPaymentSuccessRate(tenantId, 1);
  const summary = getPaymentFailureSummary(tenantId, 1);

  const topErrorCodes = Object.entries(summary.byErrorCode)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code, count]) => `${code}: ${count}`)
    .join(", ");

  return `High payment failure rate detected: ${(100 - stats.successRate).toFixed(1)}% failures in the last hour. ` +
    `Total attempts: ${stats.totalAttempts}, Failed: ${stats.failed}. ` +
    `Top error codes: ${topErrorCodes || "N/A"}`;
}
