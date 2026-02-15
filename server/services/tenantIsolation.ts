/**
 * Tenant Isolation Service
 * 
 * This service ensures complete data isolation between tenants (salons).
 * All database queries MUST go through this service to guarantee tenantId filtering.
 */

import { eq, and, SQL } from "drizzle-orm";
import { getDb } from "../db";
import {
  payments,
  orders,
  orderItems,
  refunds,
  paymentSplits,
  paymentSettings,
  paymentProviders,
  customers,
  appointments,
  services,
  users,
} from "../../drizzle/schema";
import { logPayment } from "./paymentLogger";

// ============================================================================
// TENANT CONTEXT VALIDATION
// ============================================================================

/**
 * Validates that a record belongs to the specified tenant
 * Throws an error if the record doesn't exist or belongs to a different tenant
 */
export async function validateTenantOwnership<T extends { tenantId: string }>(
  record: T | undefined,
  tenantId: string,
  entityName: string
): Promise<T> {
  if (!record) {
    throw new Error(`${entityName} not found`);
  }
  
  if (record.tenantId !== tenantId) {
    // Log potential security breach attempt
    console.error(`[SECURITY] Tenant isolation breach attempt: ${entityName}`, {
      requestedTenantId: tenantId,
      actualTenantId: record.tenantId,
      timestamp: new Date().toISOString(),
    });
    throw new Error("Access denied");
  }
  
  return record;
}

// ============================================================================
// PAYMENT QUERIES WITH TENANT ISOLATION
// ============================================================================

/**
 * Get payment by ID with tenant isolation
 */
export async function getPaymentByIdSecure(paymentId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
    .limit(1);

  return payment;
}

/**
 * Get payments for a tenant with pagination
 */
export async function getPaymentsByTenant(
  tenantId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: "pending" | "completed" | "failed" | "refunded";
    orderId?: number;
    appointmentId?: number;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const { limit = 50, offset = 0, status, orderId, appointmentId } = options;

  const conditions: SQL[] = [eq(payments.tenantId, tenantId)];
  
  if (status) {
    conditions.push(eq(payments.status, status));
  }
  if (orderId) {
    conditions.push(eq(payments.orderId, orderId));
  }
  if (appointmentId) {
    conditions.push(eq(payments.appointmentId, appointmentId));
  }

  return db
    .select()
    .from(payments)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);
}

// ============================================================================
// ORDER QUERIES WITH TENANT ISOLATION
// ============================================================================

/**
 * Get order by ID with tenant isolation
 */
export async function getOrderByIdSecure(orderId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
    .limit(1);

  return order;
}

/**
 * Get orders for a tenant with pagination
 */
export async function getOrdersByTenant(
  tenantId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: "pending" | "completed" | "refunded" | "partially_refunded";
    employeeId?: number;
    customerId?: number;
    startDate?: string;
    endDate?: string;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const { limit = 50, offset = 0, status, employeeId, customerId } = options;

  const conditions: SQL[] = [eq(orders.tenantId, tenantId)];
  
  if (status) {
    conditions.push(eq(orders.status, status));
  }
  if (employeeId) {
    conditions.push(eq(orders.employeeId, employeeId));
  }
  if (customerId) {
    conditions.push(eq(orders.customerId, customerId));
  }

  return db
    .select()
    .from(orders)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);
}

// ============================================================================
// REFUND QUERIES WITH TENANT ISOLATION
// ============================================================================

/**
 * Get refund by ID with tenant isolation
 */
export async function getRefundByIdSecure(refundId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [refund] = await db
    .select()
    .from(refunds)
    .where(and(eq(refunds.id, refundId), eq(refunds.tenantId, tenantId)))
    .limit(1);

  return refund;
}

/**
 * Get refunds for a payment with tenant isolation
 */
export async function getRefundsByPayment(paymentId: number, tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(refunds)
    .where(and(eq(refunds.paymentId, paymentId), eq(refunds.tenantId, tenantId)));
}

// ============================================================================
// PAYMENT SETTINGS WITH TENANT ISOLATION
// ============================================================================

/**
 * Get payment settings for a tenant
 */
export async function getPaymentSettingsSecure(tenantId: string) {
  const db = await getDb();
  if (!db) return null;

  const [settings] = await db
    .select()
    .from(paymentSettings)
    .where(eq(paymentSettings.tenantId, tenantId))
    .limit(1);

  return settings;
}

/**
 * Upsert payment settings for a tenant
 */
export async function upsertPaymentSettings(
  tenantId: string,
  data: Partial<{
    vippsEnabled: boolean;
    cardEnabled: boolean;
    cashEnabled: boolean;
    payAtSalonEnabled: boolean;
    stripeConnectedAccountId: string | null;
    stripeAccountStatus: "connected" | "disconnected" | "pending";
    stripeConnectedAt: Date | null;
    defaultPaymentMethod: "vipps" | "card" | "cash" | "pay_at_salon";
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getPaymentSettingsSecure(tenantId);

  if (existing) {
    await db
      .update(paymentSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(paymentSettings.tenantId, tenantId));
  } else {
    await db.insert(paymentSettings).values({
      tenantId,
      vippsEnabled: data.vippsEnabled ?? false,
      cardEnabled: data.cardEnabled ?? false,
      cashEnabled: data.cashEnabled ?? true,
      payAtSalonEnabled: data.payAtSalonEnabled ?? true,
      stripeConnectedAccountId: data.stripeConnectedAccountId ?? null,
      stripeAccountStatus: data.stripeAccountStatus ?? "disconnected",
      stripeConnectedAt: data.stripeConnectedAt ?? null,
      defaultPaymentMethod: data.defaultPaymentMethod ?? "pay_at_salon",
    });
  }

  return getPaymentSettingsSecure(tenantId);
}

// ============================================================================
// PAYMENT PROVIDER QUERIES WITH TENANT ISOLATION
// ============================================================================

/**
 * Get payment provider by ID with tenant isolation
 */
export async function getPaymentProviderSecure(providerId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [provider] = await db
    .select()
    .from(paymentProviders)
    .where(and(eq(paymentProviders.id, providerId), eq(paymentProviders.tenantId, tenantId)))
    .limit(1);

  return provider;
}

/**
 * Get all payment providers for a tenant
 */
export async function getPaymentProvidersByTenant(
  tenantId: string,
  providerType?: "stripe_terminal" | "vipps" | "izettle"
) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [eq(paymentProviders.tenantId, tenantId)];
  
  if (providerType) {
    conditions.push(eq(paymentProviders.providerType, providerType));
  }

  return db
    .select()
    .from(paymentProviders)
    .where(and(...conditions));
}

// ============================================================================
// CUSTOMER QUERIES WITH TENANT ISOLATION
// ============================================================================

/**
 * Get customer by ID with tenant isolation
 */
export async function getCustomerByIdSecure(customerId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .limit(1);

  return customer;
}

// ============================================================================
// APPOINTMENT QUERIES WITH TENANT ISOLATION
// ============================================================================

/**
 * Get appointment by ID with tenant isolation
 */
export async function getAppointmentByIdSecure(appointmentId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)))
    .limit(1);

  return appointment;
}

// ============================================================================
// USER/EMPLOYEE QUERIES WITH TENANT ISOLATION
// ============================================================================

/**
 * Get user by ID with tenant isolation
 */
export async function getUserByIdSecure(userId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);

  return user;
}

/**
 * Get all active employees for a tenant
 */
export async function getEmployeesByTenant(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));
}

// ============================================================================
// SERVICE QUERIES WITH TENANT ISOLATION
// ============================================================================

/**
 * Get service by ID with tenant isolation
 */
export async function getServiceByIdSecure(serviceId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
    .limit(1);

  return service;
}
