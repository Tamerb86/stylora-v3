/**
 * Vipps Callback Handler
 *
 * This module handles callbacks from Vipps when payment status changes.
 * Vipps sends POST requests to the callback URL with payment status updates.
 *
 * Documentation: https://developer.vippsmobilepay.com/docs/APIs/ecom-api/vipps-ecom-api/#callbacks
 *
 * Callback payload example:
 * {
 *   "merchantSerialNumber": "123456",
 *   "orderId": "apt-123-abc123",
 *   "transactionInfo": {
 *     "amount": 49900,
 *     "status": "RESERVE",
 *     "timeStamp": "2023-01-01T12:00:00Z",
 *     "transactionId": "5001420062"
 *   }
 * }
 *
 * Status values:
 * - INITIATE: Payment initiated
 * - REGISTER: User opened payment in Vipps app
 * - RESERVE: Payment reserved (user approved)
 * - SALE: Payment captured (auto-capture enabled)
 * - CANCEL: Payment cancelled
 * - VOID: Reserved payment voided
 * - REFUND: Payment refunded
 */

import type { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import * as db from "./db";
import { ENV } from "./_core/env";
import { getVippsPaymentDetails } from "./vipps";
import { sendAppointmentConfirmationIfPossible } from "./notifications-appointments";

interface VippsCallbackPayload {
  merchantSerialNumber: string;
  orderId: string;
  transactionInfo: {
    amount: number; // Amount in øre
    status:
      | "INITIATE"
      | "REGISTER"
      | "RESERVE"
      | "SALE"
      | "CANCEL"
      | "VOID"
      | "REFUND";
    timeStamp: string;
    transactionId: string;
  };
}

/**
 * Handle Vipps callback
 *
 * This function is called by Express when Vipps sends a callback.
 * It updates the payment status in the database and triggers confirmation emails.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export async function handleVippsCallback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Defense in depth: if a callback auth token is configured, the incoming
    // request must carry the matching Authorization header. The body is never
    // trusted for state regardless (see below), but this rejects forged pings.
    if (!verifyVippsCallback(req)) {
      console.error("[Vipps Callback] Rejected: invalid Authorization header");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload: VippsCallbackPayload = req.body;

    // We only ever read orderId from the body — purely as a lookup key. ALL
    // payment state (status, amount) is taken from an authenticated
    // server-to-server fetch against Vipps, so a forged/replayed callback body
    // cannot mark a payment paid or tamper with the amount.
    if (!payload || !payload.orderId) {
      console.error("[Vipps Callback] Invalid payload: missing orderId");
      res.status(400).json({ error: "Invalid callback payload" });
      return;
    }

    const { orderId } = payload;

    // Authoritative payment details from Vipps. This is the ONLY source of truth.
    // If we cannot verify with Vipps, we must NOT mutate any state.
    let paymentDetails;
    try {
      paymentDetails = await getVippsPaymentDetails(orderId);
    } catch (error) {
      console.error("[Vipps Callback] Failed to verify with Vipps:", error);
      // 503 so Vipps retries later; we never fall back to trusting the body.
      res.status(503).json({ error: "Could not verify payment with Vipps" });
      return;
    }

    if (!paymentDetails?.transactionInfo) {
      console.error("[Vipps Callback] Vipps returned no transactionInfo");
      res.status(502).json({ error: "Invalid response from Vipps" });
      return;
    }

    // Source of truth — derived from Vipps, never from req.body.
    const { status, transactionId, amount } = paymentDetails.transactionInfo;

    // Find payment record in database by gatewaySessionId (vippsOrderId)
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      console.error("[Vipps Callback] Database not available");
      res.status(500).json({ error: "Database not available" });
      return;
    }

    const { payments, appointments } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const [payment] = await dbInstance
      .select()
      .from(payments)
      .where(eq(payments.gatewaySessionId, orderId));

    if (!payment) {
      console.error(
        `[Vipps Callback] Payment not found for orderId: ${orderId}`
      );
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    console.log(
      `[Vipps Callback] Found payment ID: ${payment.id}, current status: ${payment.status}`
    );

    // Determine new payment status based on Vipps status
    let newPaymentStatus: "pending" | "completed" | "failed" | "refunded" =
      payment.status as any;
    let shouldConfirmAppointment = false;

    switch (status) {
      case "RESERVE":
      case "SALE": {
        // Payment successful (reserved or captured) — but only if the amount
        // Vipps reserved/captured covers what we actually expect. payment.amount
        // is stored in NOK; Vipps amounts are in øre.
        const expectedOre = Math.round(Number(payment.amount) * 100);
        if (!Number.isFinite(expectedOre) || amount < expectedOre) {
          console.error(
            `[Vipps Callback] Amount mismatch for ${orderId}: Vipps=${amount} øre, expected>=${expectedOre} øre. Not confirming.`
          );
          newPaymentStatus = "failed";
          break;
        }
        newPaymentStatus = "completed";
        shouldConfirmAppointment = true;
        console.log(`[Vipps Callback] Payment ${status}: marking as completed`);
        break;
      }

      case "CANCEL":
      case "VOID":
        // Payment cancelled or voided
        newPaymentStatus = "failed";
        console.log(`[Vipps Callback] Payment ${status}: marking as failed`);
        break;

      case "REFUND":
        // Payment refunded
        newPaymentStatus = "refunded";
        console.log(`[Vipps Callback] Payment ${status}: marking as refunded`);
        break;

      case "INITIATE":
      case "REGISTER":
        // Payment in progress, keep as pending
        console.log(`[Vipps Callback] Payment ${status}: keeping as pending`);
        break;

      default:
        console.log(`[Vipps Callback] Unknown status: ${status}`);
    }

    // Update payment record
    if (newPaymentStatus !== payment.status) {
      await dbInstance
        .update(payments)
        .set({
          status: newPaymentStatus,
          gatewayPaymentId: transactionId,
          gatewayMetadata: {
            ...(payment.gatewayMetadata as any),
            vippsStatus: status,
            vippsTransactionId: transactionId,
            vippsAmount: amount,
            vippsTimestamp: paymentDetails.transactionInfo.timeStamp,
            callbackReceived: new Date().toISOString(),
          },
          processedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      console.log(
        `[Vipps Callback] Updated payment ${payment.id} status to: ${newPaymentStatus}`
      );
    }

    // Update appointment status if payment successful
    if (shouldConfirmAppointment && payment.appointmentId) {
      const [appointment] = await dbInstance
        .select()
        .from(appointments)
        .where(eq(appointments.id, payment.appointmentId));

      // Only act on a real transition into "confirmed". This makes the handler
      // idempotent so Vipps retries / replayed callbacks don't re-send emails.
      if (
        appointment &&
        appointment.status !== "canceled" &&
        appointment.status !== "confirmed"
      ) {
        // Update appointment to confirmed
        await dbInstance
          .update(appointments)
          .set({ status: "confirmed" })
          .where(eq(appointments.id, appointment.id));

        console.log(
          `[Vipps Callback] Updated appointment ${appointment.id} status to: confirmed`
        );

        // Send confirmation email
        try {
          await sendAppointmentConfirmationIfPossible(
            appointment.id,
            payment.tenantId
          );
          console.log(
            `[Vipps Callback] Sent confirmation email for appointment ${appointment.id}`
          );
        } catch (emailError) {
          console.error(
            `[Vipps Callback] Failed to send confirmation email:`,
            emailError
          );
          // Don't fail the callback if email fails
        }
      }
    }

    // Respond to Vipps with 200 OK
    res.status(200).json({ success: true });
    console.log(
      `[Vipps Callback] Callback processed successfully for orderId: ${orderId}`
    );
  } catch (error) {
    console.error("[Vipps Callback] Error processing callback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Verify Vipps callback authenticity.
 *
 * If VIPPS_CALLBACK_AUTH_TOKEN is configured, Vipps must echo it back in the
 * callback's Authorization header (set it as the `Authorization` value when
 * initiating the payment). The comparison is constant-time.
 *
 * If no token is configured, this returns true and the handler relies solely
 * on the authenticated server-to-server fetch of payment details as its source
 * of truth — a forged callback body still cannot change any payment state.
 */
export function verifyVippsCallback(req: Request): boolean {
  const expected = ENV.vippsCallbackAuthToken;
  if (!expected) {
    return true; // Not configured — fall back to fetch-as-source-of-truth.
  }

  const provided = req.headers["authorization"];
  if (typeof provided !== "string" || provided.length === 0) {
    return false;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
