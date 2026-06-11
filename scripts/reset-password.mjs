/**
 * Admin/user login diagnostics & password reset.
 *
 * Login uses the MySQL `users` table with a bcrypt `passwordHash`. A
 * "Ugyldig e-post eller passord" (invalid credentials) error means the account
 * was not found OR has no/another passwordHash in THIS database.
 *
 * Usage (run against the same DATABASE_URL the deployed app uses):
 *
 *   # 1) Diagnose — list accounts and whether they can log in with a password:
 *   DATABASE_URL="mysql://USER:PASS@HOST:PORT/DB" node scripts/reset-password.mjs
 *
 *   # 2) Reset a specific account's password:
 *   DATABASE_URL="mysql://..." node scripts/reset-password.mjs you@example.com "NewPass123"
 *
 * On Railway you can run it against production with:
 *   railway run node scripts/reset-password.mjs you@example.com "NewPass123"
 */

import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10; // must match server/_core/auth-simple.ts

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const [, , emailArg, newPassword] = process.argv;

const conn = await mysql.createConnection(databaseUrl);

try {
  if (!emailArg) {
    // Diagnostics mode
    const [rows] = await conn.execute(
      `SELECT id, email, role, tenantId, isActive,
              (passwordHash IS NOT NULL AND passwordHash <> '') AS hasPassword
         FROM users
        ORDER BY role, email
        LIMIT 50`
    );
    console.log(`\nFound ${rows.length} user(s):\n`);
    for (const u of rows) {
      console.log(
        `  ${u.email ?? "(no email)"}  | role=${u.role} | active=${u.isActive} | canLoginWithPassword=${u.hasPassword ? "YES" : "NO"}`
      );
    }
    if (rows.length === 0) {
      console.log(
        "\n⚠️  No users in this database. The deployed app is pointing at an\n" +
          "    empty/different database than you expect (check DATABASE_URL)."
      );
    } else {
      console.log(
        "\nℹ️  Accounts with canLoginWithPassword=NO cannot use email/password\n" +
          "    login. Reset one with:\n" +
          '    DATABASE_URL="..." node scripts/reset-password.mjs <email> "<newPassword>"'
      );
    }
    process.exit(0);
  }

  if (!newPassword || newPassword.length < 6) {
    console.error("❌ Provide a new password of at least 6 characters.");
    process.exit(1);
  }

  const email = emailArg.trim();
  const [found] = await conn.execute(
    "SELECT id, email, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
    [email]
  );

  if (found.length === 0) {
    console.error(
      `❌ No user with email "${email}" in this database. ` +
        "Run without arguments to list existing accounts."
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await conn.execute(
    "UPDATE users SET passwordHash = ?, isActive = TRUE WHERE id = ?",
    [hash, found[0].id]
  );

  console.log(
    `✅ Password reset for ${found[0].email} (role=${found[0].role}). You can now log in.`
  );
} finally {
  await conn.end();
}
