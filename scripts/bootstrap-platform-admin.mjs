/**
 * Bootstrap the SaaS PLATFORM ADMIN (super-admin) account — the operator login
 * for the /saas-admin panel that manages every salon.
 *
 * The platform admin is special and needs BOTH:
 *   - a tenant row whose id is exactly "platform-admin-tenant"
 *     (login verifies the user's tenant exists; the UI gates /saas-admin on
 *      tenantId === "platform-admin-tenant")
 *   - a user whose openId equals OWNER_OPEN_ID
 *     (the server authorizes saasAdmin procedures on openId === OWNER_OPEN_ID)
 *
 * Requires OWNER_OPEN_ID to be set (the same value your deployment uses).
 *
 * Usage:
 *   railway run node scripts/bootstrap-platform-admin.mjs <email> "<password>"
 */

import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const PLATFORM_TENANT_ID = "platform-admin-tenant";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const ownerOpenId = process.env.OWNER_OPEN_ID;
if (!ownerOpenId) {
  console.error(
    "❌ OWNER_OPEN_ID is not set. The platform admin's openId must equal the\n" +
      "   server's OWNER_OPEN_ID, or the SaaS Admin panel will deny access."
  );
  process.exit(1);
}

const [, , email, password] = process.argv;
if (!email || !password || password.length < 6) {
  console.error(
    'Usage: node scripts/bootstrap-platform-admin.mjs <email> "<password (>=6)>"'
  );
  process.exit(1);
}

const conn = await mysql.createConnection(databaseUrl);

try {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await conn.beginTransaction();

  // 1) Ensure the platform-admin tenant exists (verified + onboarded).
  await conn.execute(
    `INSERT INTO tenants
       (id, name, subdomain, status, emailVerified, emailVerifiedAt,
        onboardingCompleted, onboardingStep, onboardingCompletedAt, requirePrepayment)
     VALUES (?, 'Platform Admin', 'platform-admin', 'active', TRUE, NOW(), TRUE, 'complete', NOW(), FALSE)
     ON DUPLICATE KEY UPDATE status = 'active'`,
    [PLATFORM_TENANT_ID]
  );

  // 2) Create or update the super-admin user (openId = OWNER_OPEN_ID).
  await conn.execute(
    `INSERT INTO users
       (tenantId, openId, email, name, role, passwordHash, isActive, loginMethod)
     VALUES (?, ?, ?, 'Platform Admin', 'owner', ?, TRUE, 'email')
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       passwordHash = VALUES(passwordHash),
       tenantId = VALUES(tenantId),
       isActive = TRUE`,
    [PLATFORM_TENANT_ID, ownerOpenId, email, passwordHash]
  );

  await conn.commit();

  console.log("\n✅ Platform admin ready.");
  console.log(`   Login as: ${email}`);
  console.log("   Then open /saas-admin on the site to manage all salons.\n");
} catch (e) {
  await conn.rollback().catch(() => {});
  console.error("❌ Failed:", e.message);
  process.exit(1);
} finally {
  await conn.end();
}
