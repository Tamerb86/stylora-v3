-- =============================================================================
-- Stylora — Phase 2 production migration (RUN MANUALLY, NOT via the deploy)
-- =============================================================================
-- The deploy pipeline auto-applies only JOURNALED drizzle migrations. This
-- script is intentionally NOT journaled — run it by hand against production so
-- you stay in control. Order of operations:
--
--   1. TAKE A FULL DATABASE BACKUP FIRST.
--   2. Run STEP 1 (webhook_events) — safe/additive, run any time.
--   3. Run the STEP 2 DETECTION queries and review the row counts.
--   4. Only if detection is clean (or after you clean the orphans), run the
--      STEP 2 CONSTRAINT statements. Test on a staging copy first if possible.
--
-- All statements are written to be safe to re-run.
-- =============================================================================


-- =============================================================================
-- STEP 1 — Webhook idempotency ledger (additive, zero risk to existing data)
-- =============================================================================
-- Backs the claimWebhookEvent() helper. Until this table exists the helper
-- "fails open" (events still process), so deploying the code before running
-- this is safe — it just doesn't dedupe yet.
CREATE TABLE IF NOT EXISTS `webhook_events` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `eventId`     VARCHAR(255) NOT NULL,
  `provider`    VARCHAR(20)  NOT NULL,
  `processedAt` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `webhook_event_id_idx` (`eventId`)
);


-- =============================================================================
-- STEP 2 — Foreign keys (referential integrity). REVIEW BEFORE RUNNING.
-- =============================================================================
-- The schema currently has ZERO foreign keys, so deleting a parent row silently
-- orphans children. Add FKs with deliberate ON DELETE semantics:
--   * CASCADE   — true children that have no meaning without the parent
--   * RESTRICT  — financial rows that must never be silently destroyed
-- A FK cannot be added while orphan rows exist, so detect + clean first.

-- ---- 2a. DETECTION (read-only — run these and inspect the counts) ----------
-- Any non-zero count must be cleaned (delete or repair) before the matching
-- ALTER below will succeed.
SELECT 'orderItems->orders'        AS rel, COUNT(*) AS orphans FROM `orderItems` oi        LEFT JOIN `orders` o   ON oi.orderId = o.id        WHERE o.id IS NULL
UNION ALL SELECT 'appointmentServices->appointments', COUNT(*) FROM `appointmentServices` a LEFT JOIN `appointments` ap ON a.appointmentId = ap.id WHERE ap.id IS NULL
UNION ALL SELECT 'appointmentServices->services',     COUNT(*) FROM `appointmentServices` a LEFT JOIN `services` s      ON a.serviceId = s.id        WHERE s.id IS NULL
UNION ALL SELECT 'payments->orders (non-null)',       COUNT(*) FROM `payments` p   LEFT JOIN `orders` o        ON p.orderId = o.id          WHERE p.orderId IS NOT NULL AND o.id IS NULL
UNION ALL SELECT 'refunds->payments',                 COUNT(*) FROM `refunds` r    LEFT JOIN `payments` p      ON r.paymentId = p.id        WHERE p.id IS NULL;

-- ---- 2b. CONSTRAINTS (run only after detection is clean) -------------------
-- CASCADE children:
ALTER TABLE `orderItems`
  ADD CONSTRAINT `fk_orderItems_order`
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE;

ALTER TABLE `appointmentServices`
  ADD CONSTRAINT `fk_apptServices_appt`
  FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE CASCADE;

-- RESTRICT references (protect financial / catalogue integrity):
ALTER TABLE `appointmentServices`
  ADD CONSTRAINT `fk_apptServices_service`
  FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT;

ALTER TABLE `refunds`
  ADD CONSTRAINT `fk_refunds_payment`
  FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT;

-- payments.orderId is nullable (appointment payments have no order) → SET NULL:
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_order`
  FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL;

-- NOTE: extend this list (loyaltyTransactions->customers, appointments->customers,
-- etc.) once the above are verified. customer-referencing FKs interact with the
-- GDPR hard-delete flow — prefer ON DELETE SET NULL or anonymise-in-place there
-- rather than CASCADE, so erasing a customer doesn't wipe financial history.


-- =============================================================================
-- STEP 3 — Migration-journal note (no SQL — repo hygiene)
-- =============================================================================
-- drizzle/0011_add_use_system_email_defaults.sql is NOT in meta/_journal.json,
-- and drizzle/0000_jittery_professor_monster.sql is a stale/contradictory
-- template. These only affect FRESH environments (production already has the
-- columns). Fixing them safely means reconciling __drizzle_migrations on prod
-- with the journal — do that as a separate, supervised step; do NOT simply
-- re-journal 0011 or the next deploy will try to re-add an existing column.
