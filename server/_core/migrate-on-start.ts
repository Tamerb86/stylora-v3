import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

/**
 * Apply pending Drizzle migrations at boot when MIGRATE_ON_START === "true".
 *
 * Production (Railway) starts the app with `node dist/index.js` and no separate
 * migration step, so a freshly-provisioned database stays empty and every query
 * fails ("Table … doesn't exist"), which silently breaks signup/onboarding. With
 * MIGRATE_ON_START enabled, the schema is created/updated on the first boot of a
 * new environment. The migrator records applied migrations in
 * `__drizzle_migrations`, so re-running on later boots is a safe no-op.
 *
 * The `drizzle/` folder (migration SQL + meta journal) is shipped in the runtime
 * image (see Dockerfile), so `migrationsFolder: "drizzle"` resolves at runtime.
 *
 * A failure here is logged but does NOT crash the process: a transient DB
 * hiccup at boot shouldn't trigger a restart loop, and the next deploy/restart
 * retries automatically.
 */
export async function runStartupMigrations(): Promise<void> {
  // Accept common truthy spellings so a "TRUE"/"1"/"yes" value still works.
  const flag = (process.env.MIGRATE_ON_START || "").trim().toLowerCase();
  if (!["true", "1", "yes", "on"].includes(flag)) return;

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate-on-start] MIGRATE_ON_START set but DATABASE_URL missing — skipping.");
    return;
  }

  console.log("[migrate-on-start] Applying database migrations…");
  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(url);
    const db = drizzle(connection);
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("[migrate-on-start] ✅ Migrations applied (or already up to date).");
  } catch (error) {
    console.error(
      "[migrate-on-start] ❌ Migration failed:",
      error instanceof Error ? error.message : error
    );
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
}
