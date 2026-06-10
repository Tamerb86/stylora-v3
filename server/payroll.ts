/**
 * Payroll computation
 *
 * Computes monthly earnings for staff from completed appointments and each
 * user's commission rate. Earnings the data model does not capture (base
 * salary, product commission, tips, bonus, per-month leave) are reported as 0
 * rather than fabricated. Tax (30%) and pension (2%) are withheld on earnings.
 */

import { getDb } from "./db";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { users, appointments, appointmentServices } from "../drizzle/schema";

const TAX_RATE = 0.3;
const PENSION_RATE = 0.02;

export interface PayrollEmployee {
  employeeId: number;
  employeeName: string;
  role: string;
  appointmentsCompleted: number;
  totalEarnings: number;
  totalDeductions: number;
  leaveDays: number;
  netSalary: number;
}

export interface Payslip {
  employee: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    commissionType: string | null;
    commissionRate: string | null;
  };
  period: { month: number; year: number; startDate: string; endDate: string };
  earnings: {
    baseSalary: number;
    serviceCommission: number;
    productCommission: number;
    tips: number;
    bonus: number;
    totalEarnings: number;
  };
  deductions: {
    tax: number;
    insurance: number;
    pension: number;
    unpaidLeave: number;
    other: number;
    totalDeductions: number;
  };
  leaves: {
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    sickLeaveDays: number;
  };
  performance: {
    appointmentsCompleted: number;
    totalServiceRevenue: number;
    totalProductRevenue: number;
  };
  netSalary: number;
}

/** Local YYYY-MM-DD without UTC shift. */
function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** [start, end) date range for a given 1-based month. */
function monthRange(month: number, year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

/**
 * Completed-appointment count and service revenue for one employee in a month.
 */
async function getEmployeeRevenue(
  tenantId: string,
  employeeId: number,
  month: number,
  year: number
): Promise<{ appointmentsCompleted: number; serviceRevenue: number }> {
  const db = await getDb();
  if (!db) return { appointmentsCompleted: 0, serviceRevenue: 0 };

  const { start, end } = monthRange(month, year);

  const [row] = await db
    .select({
      appointmentsCompleted: sql<number>`COUNT(DISTINCT ${appointments.id})`,
      serviceRevenue: sql<number>`COALESCE(SUM(${appointmentServices.price}), 0)`,
    })
    .from(appointments)
    .leftJoin(
      appointmentServices,
      eq(appointmentServices.appointmentId, appointments.id)
    )
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.employeeId, employeeId),
        eq(appointments.status, "completed"),
        gte(appointments.appointmentDate, start),
        lt(appointments.appointmentDate, end)
      )
    );

  return {
    appointmentsCompleted: Number(row?.appointmentsCompleted ?? 0),
    serviceRevenue: Number(row?.serviceRevenue ?? 0),
  };
}

function computeEarnings(serviceRevenue: number, commissionRate: number) {
  const serviceCommission = Math.round(serviceRevenue * (commissionRate / 100));
  const totalEarnings = serviceCommission; // base/product/tips/bonus unmodelled
  const tax = Math.round(totalEarnings * TAX_RATE);
  const pension = Math.round(totalEarnings * PENSION_RATE);
  const totalDeductions = tax + pension;
  return {
    serviceCommission,
    totalEarnings,
    tax,
    pension,
    totalDeductions,
    netSalary: totalEarnings - totalDeductions,
  };
}

/** Active staff for a tenant. */
async function getStaff(tenantId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));
}

export async function getMonthlyPayrollData(
  tenantId: string,
  month: number,
  year: number
): Promise<PayrollEmployee[]> {
  const staff = await getStaff(tenantId);

  const rows: PayrollEmployee[] = [];
  for (const employee of staff) {
    const commissionRate = Number(employee.commissionRate ?? 0);
    const { appointmentsCompleted, serviceRevenue } = await getEmployeeRevenue(
      tenantId,
      employee.id,
      month,
      year
    );
    const e = computeEarnings(serviceRevenue, commissionRate);

    rows.push({
      employeeId: employee.id,
      employeeName: employee.name || employee.email || `#${employee.id}`,
      role: employee.role,
      appointmentsCompleted,
      totalEarnings: e.totalEarnings,
      totalDeductions: e.totalDeductions,
      leaveDays: 0,
      netSalary: e.netSalary,
    });
  }

  return rows;
}

export async function getEmployeePayslipData(
  tenantId: string,
  employeeId: number,
  month: number,
  year: number
): Promise<Payslip | null> {
  const db = await getDb();
  if (!db) return null;

  const [employee] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, employeeId), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!employee) return null;

  const commissionRate = Number(employee.commissionRate ?? 0);
  const { appointmentsCompleted, serviceRevenue } = await getEmployeeRevenue(
    tenantId,
    employeeId,
    month,
    year
  );
  const e = computeEarnings(serviceRevenue, commissionRate);
  const { start, end } = monthRange(month, year);

  return {
    employee: {
      id: employee.id,
      name: employee.name || employee.email || `#${employee.id}`,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      commissionType: employee.commissionType,
      commissionRate: employee.commissionRate,
    },
    period: {
      month,
      year,
      startDate: isoDate(start),
      endDate: isoDate(new Date(end.getTime() - 24 * 60 * 60 * 1000)),
    },
    earnings: {
      baseSalary: 0,
      serviceCommission: e.serviceCommission,
      productCommission: 0,
      tips: 0,
      bonus: 0,
      totalEarnings: e.totalEarnings,
    },
    deductions: {
      tax: e.tax,
      insurance: 0,
      pension: e.pension,
      unpaidLeave: 0,
      other: 0,
      totalDeductions: e.totalDeductions,
    },
    leaves: {
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      sickLeaveDays: 0,
    },
    performance: {
      appointmentsCompleted,
      totalServiceRevenue: serviceRevenue,
      totalProductRevenue: 0,
    },
    netSalary: e.netSalary,
  };
}
