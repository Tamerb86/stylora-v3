/**
 * Seed the platform's subscription plans (Basis / Pro / Enterprise).
 *
 * The SaaS Admin "Opprett ny salong" wizard requires at least one ACTIVE plan in
 * the `subscriptionPlans` table — step 2 ("Velg abonnementsplan") blocks the
 * Next button until a plan is selected. A freshly provisioned platform database
 * has zero plans, so salon onboarding is impossible until this runs once.
 *
 * Idempotent: matches existing rows by `name` and updates them in place, so it
 * is safe to run on every deploy. Pass --force to also overwrite price/limits of
 * plans that an operator may have customised via the SaaS Admin UI; without it,
 * existing plans keep their current values and only missing plans are inserted.
 *
 * Usage:
 *   railway run node scripts/seed-subscription-plans.mjs
 *   # or: DATABASE_URL="mysql://..." node scripts/seed-subscription-plans.mjs [--force]
 */

import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const force = process.argv.includes("--force");

// Norwegian salon market defaults. Prices in NOK/month. `features` is a JSON
// array of human-readable feature labels the onboarding UI renders as a checklist.
const PLANS = [
  {
    name: "basis",
    displayNameNo: "Basis",
    priceMonthly: "299.00",
    maxEmployees: 3,
    maxLocations: 1,
    smsQuota: 100,
    features: ["Timebok", "Kundeadministrasjon", "POS"],
  },
  {
    name: "pro",
    displayNameNo: "Pro",
    priceMonthly: "599.00",
    maxEmployees: 10,
    maxLocations: 3,
    smsQuota: 500,
    features: ["Alt i Basis", "Lojalitet", "SMS-påminnelser", "Rapporter"],
  },
  {
    name: "enterprise",
    displayNameNo: "Enterprise",
    priceMonthly: "1299.00",
    maxEmployees: 50,
    maxLocations: 10,
    smsQuota: 2000,
    features: [
      "Alt i Pro",
      "Flere lokasjoner",
      "Prioritert support",
      "API-tilgang",
    ],
  },
];

const conn = await mysql.createConnection(databaseUrl);

try {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of PLANS) {
    const [[existing]] = await conn.query(
      "SELECT id FROM subscriptionPlans WHERE name = ?",
      [p.name]
    );

    if (!existing) {
      await conn.execute(
        `INSERT INTO subscriptionPlans
           (name, displayNameNo, priceMonthly, maxEmployees, maxLocations, smsQuota, features, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          p.name,
          p.displayNameNo,
          p.priceMonthly,
          p.maxEmployees,
          p.maxLocations,
          p.smsQuota,
          JSON.stringify(p.features),
        ]
      );
      inserted++;
      console.log(`  + inserted "${p.displayNameNo}" (${p.priceMonthly} kr/mnd)`);
    } else if (force) {
      await conn.execute(
        `UPDATE subscriptionPlans
            SET displayNameNo = ?, priceMonthly = ?, maxEmployees = ?,
                maxLocations = ?, smsQuota = ?, features = ?, isActive = 1
          WHERE id = ?`,
        [
          p.displayNameNo,
          p.priceMonthly,
          p.maxEmployees,
          p.maxLocations,
          p.smsQuota,
          JSON.stringify(p.features),
          existing.id,
        ]
      );
      updated++;
      console.log(`  ~ updated "${p.displayNameNo}" (--force)`);
    } else {
      skipped++;
      console.log(`  = kept existing "${p.displayNameNo}" (use --force to overwrite)`);
    }
  }

  console.log(
    `\n✅ Subscription plans ready — ${inserted} inserted, ${updated} updated, ${skipped} unchanged.`
  );
} catch (e) {
  console.error("❌ Failed:", e.message);
  process.exit(1);
} finally {
  await conn.end();
}
