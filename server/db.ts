import { eq, and, isNull, like, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  tenants,
  customers,
  services,
  appointments,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _connection: mysql.Connection | null = null;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log(
        "[Database] Connecting to:",
        process.env.DATABASE_URL.replace(/:\/\/.*@/, "://***@")
      );

      _connection = await mysql.createConnection(process.env.DATABASE_URL);
      await _connection.ping();

      console.log("[Database] Connection successful");
      _db = drizzle(_connection);
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _connection = null;
    }
  }
  return _db;
}

// Graceful shutdown
export async function closeDb() {
  if (_connection) {
    await _connection.end();
    _connection = null;
    _db = null;
    console.log("[Database] Connection closed");
  }
}

// ============================================================================
// USER HELPERS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  if (!user.tenantId) throw new Error("User tenantId is required");

  const db = await getDb();
  if (!db) return;

  const values: InsertUser = {
    openId: user.openId,
    tenantId: user.tenantId,
    role:
      user.role || (user.openId === ENV.ownerOpenId ? "owner" : "employee"),
  };

  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "phone"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.lastSignedIn) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  if (!values.lastSignedIn) {
    values.lastSignedIn = new Date();
    updateSet.lastSignedIn = new Date();
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0];
}

// ============================================================================
// TENANT HELPERS
// ============================================================================

export async function getTenantBySubdomain(subdomain: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.subdomain, subdomain))
    .limit(1);

  return result[0];
}

export async function getTenantById(tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return result[0];
}

// ============================================================================
// CUSTOMER HELPERS
// ============================================================================

export async function getCustomersByTenant(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), isNull(customers.deletedAt)));
}

export async function getCustomerById(customerId: number, tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .limit(1);

  return result[0];
}

// ============================================================================
// SERVICE HELPERS
// ============================================================================

export async function getServicesByTenant(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(services)
    .where(and(eq(services.tenantId, tenantId), eq(services.isActive, true)));
}

export async function getServiceById(serviceId: number, tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
    .limit(1);

  return result[0];
}

// ============================================================================
// APPOINTMENT HELPERS
// ============================================================================

export async function getAppointmentsByTenant(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);

  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        sql`${appointments.appointmentDate} >= ${start}`,
        sql`${appointments.appointmentDate} <= ${end}`
      )
    );
}

export async function getAppointmentById(
  appointmentId: number,
  tenantId: string
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId)
      )
    )
    .limit(1);

  return result[0];
}

// ============================================================================
// GLOBAL SEARCH (SAFE / SIMPLE)
// ============================================================================

export async function globalSearch(tenantId: string, query: string) {
  const db = await getDb();
  if (!db) return { customers: [], appointments: [], services: [] };

  const term = `%${query}%`;

  const customerResults = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.tenantId, tenantId),
        like(customers.firstName, term)
      )
    )
    .limit(5);

  const appointmentResults = await db
    .select()
    .from(appointments)
    .where(eq(appointments.tenantId, tenantId))
    .limit(5);

  const serviceResults = await db
    .select()
    .from(services)
    .where(and(eq(services.tenantId, tenantId), like(services.name, term)))
    .limit(5);

  return {
    customers: customerResults,
    appointments: appointmentResults,
    services: serviceResults,
  };
}

// ============================================================================
// POS & ORDER HELPERS
// ============================================================================

export async function createOrderWithItems(orderData: any, items: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { orders, orderItems } = await import("../drizzle/schema");

  return await db.transaction(async (tx) => {
    // 1. Create the order
    const [orderResult] = await tx.insert(orders).values(orderData);
    const orderId = orderResult.insertId;

    // 2. Create order items
    const itemsWithOrderId = items.map((item) => ({
      ...item,
      orderId,
    }));

    if (itemsWithOrderId.length > 0) {
      await tx.insert(orderItems).values(itemsWithOrderId);
    }

    // 3. Fetch created order and items
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    
    const createdItems = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return { order, items: createdItems };
  });
}

export async function recordPayment(paymentData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payments, orders } = await import("../drizzle/schema");

  return await db.transaction(async (tx) => {
    // 1. Create payment record
    const [paymentResult] = await tx.insert(payments).values(paymentData);
    const paymentId = paymentResult.insertId;

    // 2. Update order status to completed
    await tx
      .update(orders)
      .set({ status: "completed" })
      .where(eq(orders.id, paymentData.orderId));

    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    return payment;
  });
}


// ============================================================================
// PAYMENT HELPERS
// ============================================================================

export async function createPayment(paymentData: {
  tenantId: string;
  orderId: number | null;
  appointmentId: number | null;
  paymentMethod: string;
  paymentGateway: string | null;
  amount: string;
  currency: string;
  status: string;
  gatewaySessionId: string | null;
  gatewayPaymentId: string | null;
  gatewayMetadata: any;
  lastFour: string | null;
  cardBrand: string | null;
  processedBy: number | null;
  processedAt: Date | null;
  errorMessage: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { payments } = await import("../drizzle/schema");

  const [result] = await db.insert(payments).values({
    tenantId: paymentData.tenantId,
    orderId: paymentData.orderId,
    appointmentId: paymentData.appointmentId,
    paymentMethod: paymentData.paymentMethod,
    paymentGateway: paymentData.paymentGateway,
    amount: paymentData.amount,
    currency: paymentData.currency,
    status: paymentData.status,
    gatewaySessionId: paymentData.gatewaySessionId,
    gatewayPaymentId: paymentData.gatewayPaymentId,
    gatewayMetadata: paymentData.gatewayMetadata,
    lastFour: paymentData.lastFour,
    cardBrand: paymentData.cardBrand,
    processedBy: paymentData.processedBy,
    processedAt: paymentData.processedAt,
    errorMessage: paymentData.errorMessage,
  });

  const paymentId = result.insertId;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  return payment;
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { orders } = await import("../drizzle/schema");

  await db
    .update(orders)
    .set({ status })
    .where(eq(orders.id, orderId));

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return order;
}


// ============================================================================
// ORDER HELPERS
// ============================================================================

export async function getOrderById(orderId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { orders, users, customers } = await import("../drizzle/schema");

  const [order] = await db
    .select({
      id: orders.id,
      tenantId: orders.tenantId,
      customerId: orders.customerId,
      employeeId: orders.employeeId,
      appointmentId: orders.appointmentId,
      subtotal: orders.subtotal,
      vatAmount: orders.vatAmount,
      total: orders.total,
      status: orders.status,
      notes: orders.notes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: customers.name,
      employeeName: users.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(users, eq(orders.employeeId, users.id))
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
    .limit(1);

  return order || null;
}

export async function getOrderItems(orderId: number, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { orderItems, services, products } = await import("../drizzle/schema");

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      itemType: orderItems.itemType,
      itemId: orderItems.itemId,
      itemName: orderItems.itemName,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      vatRate: orderItems.vatRate,
      vatAmount: orderItems.vatAmount,
      total: orderItems.total,
      serviceName: services.name,
      productName: products.name,
    })
    .from(orderItems)
    .leftJoin(services, and(eq(orderItems.itemType, "service"), eq(orderItems.itemId, services.id)))
    .leftJoin(products, and(eq(orderItems.itemType, "product"), eq(orderItems.itemId, products.id)))
    .where(eq(orderItems.orderId, orderId));

  return items.map(item => ({
    ...item,
    name: item.itemName || item.serviceName || item.productName || "Unknown Item",
  }));
}
