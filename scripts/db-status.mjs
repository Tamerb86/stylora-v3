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
  for (const t of tables) {
    try {
      const [rows] = await conn.execute(`SELECT COUNT(*) AS c FROM \`${t}\``);
      const c = Number(rows[0].c);
      total += c;
      console.log(`  ${t.padEnd(14)} ${c}`);
    } catch (e) {
      console.log(`  ${t.padEnd(14)} (table missing: ${e.code || e.message})`);
    }
  }

  console.log("");
  if (total === 0) {
    console.log(
      "⚠️  Every table is empty → this is a fresh/empty database. Your data is\n" +
        "    most likely intact in a DIFFERENT database. In Railway, check that the\n" +
        "    app's DATABASE_URL variable points at the MySQL service that holds\n" +
        "    your data (re-provisioning MySQL creates a new, empty one)."
    );
  } else {
    console.log(
      "ℹ️  Some tables have data but `users` is empty — that's unusual; tell me\n" +
        "    the counts above and I'll help recover access."
    );
  }
} finally {
  await conn.end();
}
