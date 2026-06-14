import { getDb } from "./db";
import { webhookEvents } from "../drizzle/schema";

/**
 * Atomically claim a webhook/callback event so it is processed at most once.
 * Returns true if THIS call claimed it (caller should process the event),
 * false if it was already processed (caller should skip and ack with 200).
 *
 * Fails OPEN: if the ledger table doesn't exist yet (migration not run) or any
 * other DB error occurs, returns true so event processing is never blocked —
 * the worst case reverts to the prior at-least-once behaviour.
 */
export async function claimWebhookEvent(
  provider: "stripe" | "vipps",
  eventId: string
): Promise<boolean> {
  if (!eventId) return true;
  try {
    const db = await getDb();
    if (!db) return true;
    await db.insert(webhookEvents).values({ provider, eventId });
    return true; // inserted now → first time → process
  } catch (error: any) {
    // MySQL duplicate-key (ER_DUP_ENTRY / 1062) → already processed → skip.
    const code = error?.code || error?.errno;
    if (
      code === "ER_DUP_ENTRY" ||
      code === 1062 ||
      String(error?.message || "").includes("Duplicate entry")
    ) {
      return false;
    }
    // Any other error (e.g. table missing) → fail open.
    console.warn(
      `[Webhook] idempotency check failed open for ${provider}:${eventId}:`,
      error?.message || error
    );
    return true;
  }
}
