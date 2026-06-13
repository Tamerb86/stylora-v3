/**
 * SAFE, additive-only schema repair for the `tenants` table.
 *
 * Symptom this fixes: the deployed Drizzle schema references tenant columns
 * (wizardDraftData, sms*, requirePrepayment, …) that an older production DB is
 * missing. Because Drizzle `select()` lists every column, EVERY query on
 * `tenants` fails with "Unknown column", which blocks signup/onboarding from its
 * very first step (subdomain check).
 *
 * This script ONLY runs `ALTER TABLE tenants ADD COLUMN` for columns that are
 * genuinely absent. It never drops, renames, or retypes anything, so it is safe
 * to run against a live database and is idempotent (re-running is a no-op).
 *
 * Usage:
 *   DATABASE_URL="mysql://…(production)…" node scripts/sync-tenant-columns.mjs
 *   # or, with Railway linked + logged in:
 *   railway run node scripts/sync-tenant-columns.mjs
 *
 * Pass --dry to preview the ALTERs without applying them.
 */

import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry");

// Column name → MySQL DDL, mirroring drizzle/schema.ts `tenants`. Only feature
// columns that commonly drift are listed; core columns are assumed present.
const REQUIRED_COLUMNS = {
  emailVerified: "BOOLEAN NOT NULL DEFAULT 0",
  emailVerifiedAt: "TIMESTAMP NULL",
  onboardingCompleted: "BOOLEAN NOT NULL DEFAULT 0",
  onboardingStep:
    "ENUM('welcome','service','employee','hours','complete') DEFAULT 'welcome'",
  onboardingCompletedAt: "TIMESTAMP NULL",
  wizardDraftData: "JSON NULL",
  cancellationWindowHours: "INT DEFAULT 24",
  noShowThresholdForPrepayment: "INT DEFAULT 2",
  requirePrepayment: "BOOLEAN NOT NULL DEFAULT 0",
  smsPhoneNumber: "VARCHAR(20) NULL",
  smsProvider: "ENUM('mock','pswincom','linkmobility','twilio') NULL",
  smsApiKey: "VARCHAR(255) NULL",
  smsApiSecret: "VARCHAR(255) NULL",
};

const conn = await mysql.createConnection(databaseUrl);

try {
  try {
    const u = new URL(databaseUrl);
    console.log(
      `\nTarget: host=${u.hostname} db=${u.pathname.slice(1)}${dryRun ? "  (DRY RUN)" : ""}\n`
    );
  } catch {}

  const [cols] = await conn.query("SHOW COLUMNS FROM `tenants`");
  const existing = new Set(cols.map(c => c.Field));

  const missing = Object.entries(REQUIRED_COLUMNS).filter(
    ([name]) => !existing.has(name)
  );

  if (missing.length === 0) {
    console.log("✅ tenants table already has every required column. Nothing to do.");
  } else {
    console.log(`Adding ${missing.length} missing column(s):`);
    for (const [name, ddl] of missing) {
      const sql = `ALTER TABLE \`tenants\` ADD COLUMN \`${name}\` ${ddl}`;
      if (dryRun) {
        console.log(`  [dry] ${sql}`);
      } else {
        await conn.execute(sql);
        console.log(`  + ${name}`);
      }
    }
    console.log(
      dryRun
        ? "\n(dry run — no changes applied)"
        : "\n✅ Done. Re-run onboarding; the subdomain check and signup should now work."
    );
  }
} catch (e) {
  console.error("❌ Failed:", e.message);
  process.exit(1);
} finally {
  await conn.end();
}
