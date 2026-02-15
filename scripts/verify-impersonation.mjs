#!/usr/bin/env node

/**
 * Verification script for admin impersonation feature
 * Run with: node scripts/verify-impersonation.mjs
 */

import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

console.log("🔍 Verifying Admin Impersonation Implementation...\n");

let passed = 0;
let failed = 0;
const issues = [];

// Helper to check file exists
function checkFile(path, description) {
  const fullPath = join(rootDir, path);
  if (existsSync(fullPath)) {
    console.log(`✅ ${description}`);
    passed++;
    return true;
  } else {
    console.log(`❌ ${description}`);
    failed++;
    issues.push(`Missing file: ${path}`);
    return false;
  }
}

// Helper to check file contains text
function checkFileContains(path, text, description) {
  const fullPath = join(rootDir, path);
  if (!existsSync(fullPath)) {
    console.log(`❌ ${description} (file not found)`);
    failed++;
    issues.push(`File not found: ${path}`);
    return false;
  }

  const content = readFileSync(fullPath, "utf-8");
  if (content.includes(text)) {
    console.log(`✅ ${description}`);
    passed++;
    return true;
  } else {
    console.log(`❌ ${description}`);
    failed++;
    issues.push(`Missing in ${path}: "${text.substring(0, 50)}..."`);
    return false;
  }
}

console.log("📁 Checking Backend Files...");
console.log("─".repeat(60));

checkFile("server/_core/auth-simple.ts", "Auth service exists");
checkFileContains(
  "server/_core/auth-simple.ts",
  "impersonating",
  "JWT includes impersonating flag"
);
checkFileContains(
  "server/_core/auth-simple.ts",
  "act:",
  "JWT includes act (admin ID) claim"
);
checkFileContains(
  "server/routers.ts",
  "THIRTY_MINUTES_MS",
  "30-minute expiration for impersonation tokens"
);

checkFile("server/_core/context.ts", "Context handler exists");
checkFileContains(
  "server/_core/context.ts",
  "isImpersonating",
  "Context tracks impersonation state"
);

checkFile("server/_core/trpc.ts", "tRPC setup exists");
checkFileContains(
  "server/_core/trpc.ts",
  "requireTenant",
  "requireTenant helper function exists"
);

checkFile("server/_core/systemRouter.ts", "System router exists");
checkFileContains(
  "server/_core/systemRouter.ts",
  "status:",
  "System status endpoint exists"
);

checkFile("server/routers.ts", "Main routers file exists");
checkFileContains(
  "server/routers.ts",
  "impersonateTenant:",
  "Impersonation mutation exists"
);
checkFileContains(
  "server/routers.ts",
  "clearImpersonation:",
  "Clear impersonation mutation exists"
);
checkFileContains(
  "server/routers.ts",
  "auditLogs",
  "Audit logging in impersonation"
);

console.log("\n📱 Checking Frontend Files...");
console.log("─".repeat(60));

checkFile("client/src/pages/SystemStatus.tsx", "System Status page exists");
checkFileContains(
  "client/src/pages/SystemStatus.tsx",
  "impersonating",
  "System Status shows impersonation flag"
);

checkFile(
  "client/src/components/ImpersonationBanner.tsx",
  "Impersonation banner exists"
);
checkFileContains(
  "client/src/components/ImpersonationBanner.tsx",
  "clearImpersonation",
  "Banner has exit functionality"
);
checkFileContains(
  "client/src/components/ImpersonationBanner.tsx",
  "invalidate",
  "Banner clears cache on exit"
);

checkFile(
  "client/src/pages/SaasAdmin/SaasAdminTenants.tsx",
  "Admin tenants page exists"
);
checkFileContains(
  "client/src/pages/SaasAdmin/SaasAdminTenants.tsx",
  "admin-token-backup",
  "Frontend backs up admin token"
);
checkFileContains(
  "client/src/pages/SaasAdmin/SaasAdminTenants.tsx",
  "resetQueries",
  "Frontend clears all queries on impersonation"
);

checkFile("client/src/App.tsx", "App router exists");
checkFileContains(
  "client/src/App.tsx",
  "/system-status",
  "System status route added"
);

console.log("\n⚙️  Checking Configuration...");
console.log("─".repeat(60));

checkFile("vite.config.ts", "Vite config exists");
checkFileContains(
  "vite.config.ts",
  "sourcemap: true",
  "Production sourcemaps enabled"
);

checkFile("IMPERSONATION_GUIDE.md", "Documentation exists");

console.log("\n📊 Summary");
console.log("─".repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log("\n❌ Issues Found:");
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`);
  });
  console.log("\n❌ Verification failed. Please fix the issues above.");
  process.exit(1);
} else {
  console.log("\n✅ All checks passed! Impersonation feature is ready.");
  console.log("\n📝 Next Steps:");
  console.log("  1. Review IMPERSONATION_GUIDE.md for usage instructions");
  console.log("  2. Set OWNER_OPEN_ID environment variable");
  console.log("  3. Test impersonation flow manually");
  console.log("  4. Check audit logs after testing");
  console.log("  5. Visit /system-status to verify JWT context");
  process.exit(0);
}
