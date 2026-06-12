/**
 * Print which database the app is connected to and row counts for the key
 * tables. Helps distinguish "data was lost" from "DATABASE_URL points at the
 * wrong/empty database".
 *
 *   railway run node scripts/db-status.mjs
 *   # or: DATABASE_URL="mysql://..." node scripts/db-status.mjs
 */

import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

// Show host/db (mask credentials) so you can confirm WHICH database this is.
try {
  const u = new URL(databaseUrl);
  console.log(
    `\nConnected target: host=${u.hostname} port=${u.port || "3306"} db=${u.pathname.slice(1)}\n`
  );
} catch {
  console.log("\n(could not parse DATABASE_URL)\n");
}

const conn = await mysql.createConnection(databaseUrl);

try {
  const tables = [
    "tenants",
    "users",
    "customers",
    "appointments",
    "services",
    "orders",
    "payments",
  ];

  let total = 0;
  let userCount = 0;
  for (const t of tables) {
    try {
      const [rows] = await conn.execute(`SELECT COUNT(*) AS c FROM \`${t}\``);
      const c = Number(rows[0].c);
      total += c;
      if (t === "users") userCount = c;
      console.log(`  ${t.padEnd(14)} ${c}`);
    } catch (e) {
      console.log(`  ${t.padEnd(14)} (table missing: ${e.code || e.message})`);
    }
  }

  console.log("");
  if (total === 0) {
    console.log(
      "⚠️  Every table is empty → fresh/empty database. Either this is a brand-new\n" +
        "    install (create the first account with scripts/bootstrap-admin.mjs), or\n" +
        "    DATABASE_URL points at the wrong MySQL service (your data may be in\n" +
        "    another database)."
    );
  } else if (userCount === 0) {
    console.log(
      "⚠️  There is data but no users → no account to log in with. Create one with\n" +
        "    scripts/bootstrap-admin.mjs."
    );
  } else {
    console.log(
      `✅ ${userCount} user account(s) present — you can log in (reset a password\n` +
        "    with scripts/reset-password.mjs if needed)."
    );
  }
} finally {
  await conn.end();
}
