/**
 * Bootstrap the FIRST salon (tenant) + owner account for a fresh install, so you
 * can log in. Safe: refuses to run if the database already has users (so it
 * can't overwrite real data) unless you pass --force.
 *
 * Usage (against the deployed DATABASE_URL):
 *   railway run node scripts/bootstrap-admin.mjs <email> "<password>" [salonName] [subdomain]
 *
 * Example:
 *   railway run node scripts/bootstrap-admin.mjs owner@mysalon.no "StrongPass123" "My Salon" mysalon
 *
 * After it runs, log in on the site with that email + password.
 */

import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const SALT_ROUNDS = 10; // must match server/_core/auth-simple.ts

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const [email, password, salonNameArg, subdomainArg] = args.filter(
  a => a !== "--force"
);

if (!email || !password || password.length < 6) {
  console.error(
    'Usage: node scripts/bootstrap-admin.mjs <email> "<password (>=6)>" [salonName] [subdomain]'
  );
  process.exit(1);
}

const salonName = salonNameArg || "My Salon";
const subdomain = (subdomainArg || email.split("@")[0] || "salon")
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "-")
  .slice(0, 63);

const conn = await mysql.createConnection(databaseUrl);

try {
  const [[{ userCount }]] = await conn.query(
    "SELECT COUNT(*) AS userCount FROM users"
  );
  if (userCount > 0 && !force) {
    console.error(
      `❌ Database already has ${userCount} user(s). Refusing to run without --force ` +
        "so existing data isn't disturbed. To reset a password instead, use " +
        "scripts/reset-password.mjs."
    );
    process.exit(1);
  }

  const tenantId = randomUUID();
  // A salon owner must get a UNIQUE openId — never OWNER_OPEN_ID, which the
  // server treats as the platform super-admin (SaaS Admin) identity.
  const ownerOpenId = `owner-${randomUUID()}`.slice(0, 64);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await conn.beginTransaction();

  // Create the salon — verified and onboarded so login isn't blocked.
  await conn.execute(
    `INSERT INTO tenants
       (id, name, subdomain, email, status, emailVerified, emailVerifiedAt,
        onboardingCompleted, onboardingStep, onboardingCompletedAt, requirePrepayment)
     VALUES (?, ?, ?, ?, 'active', TRUE, NOW(), TRUE, 'complete', NOW(), FALSE)`,
    [tenantId, salonName, subdomain, email]
  );

  // Create the owner account.
  await conn.execute(
    `INSERT INTO users
       (tenantId, openId, email, name, role, passwordHash, isActive, loginMethod)
     VALUES (?, ?, ?, ?, 'owner', ?, TRUE, 'email')`,
    [tenantId, ownerOpenId, email, salonName + " Owner", passwordHash]
  );

  await conn.commit();

  console.log("\n✅ Bootstrap complete.\n");
  console.log(`   Salon:     ${salonName}  (subdomain: ${subdomain})`);
  console.log(`   Login as:  ${email}`);
  console.log(`   Role:      owner`);
  console.log("\nGo to the site and log in with that email + password.\n");
} catch (e) {
  await conn.rollback().catch(() => {});
  console.error("❌ Failed:", e.message);
  process.exit(1);
} finally {
  await conn.end();
}
