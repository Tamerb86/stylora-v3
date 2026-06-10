/**
 * Unimicro Sync Monitoring Service
 *
 * Provides comprehensive monitoring and alerting for Unimicro integration
 * - Real-time sync status tracking
 * - Error detection and logging
 * - Performance metrics
 * - Automated alerts for failures
 *
 * NOTE: unimicroSyncLog stores one row per completed sync with a pre-computed
 * `duration` (ms) and the row's `createdAt` as the sync time. Earlier code
 * referenced syncStartedAt/syncCompletedAt/syncType/recordsSynced columns that
 * do not exist on the table; this module uses the real columns.
 */

import { getDb } from "../db";
import { logSecurity, logDb } from "../_core/logger";
import { eq, and, gte, desc } from "drizzle-orm";
import { unimicroSyncLog } from "../../drizzle/schema";

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
  averageDuration: number;
  lastSyncTime: Date | null;
  lastSyncStatus: string | null;
}

export interface SyncAlert {
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  timestamp: Date;
  tenantId: string;
  syncLogId?: number;
  details?: any;
}

type SyncLogRow = typeof unimicroSyncLog.$inferSelect;

/** Average of the stored per-sync duration (ms), expressed in seconds. */
function averageDurationSeconds(logs: SyncLogRow[]): number {
  const withDuration = logs.filter(log => log.duration != null);
  if (withDuration.length === 0) return 0;
  const totalMs = withDuration.reduce((sum, log) => sum + (log.duration ?? 0), 0);
  return Math.round((totalMs / withDuration.length / 1000) * 100) / 100;
}

/**
 * Get sync metrics for a tenant within a time period
 */
export async function getUnimicroSyncMetrics(
  tenantId: string,
  hoursAgo: number = 24
): Promise<SyncMetrics> {
  try {
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not available");
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    // Get all sync logs for the period
    const syncLogs = await dbInstance
      .select()
      .from(unimicroSyncLog)
      .where(
        and(
          eq(unimicroSyncLog.tenantId, tenantId),
          gte(unimicroSyncLog.createdAt, cutoffTime)
        )
      )
      .orderBy(desc(unimicroSyncLog.createdAt));

    if (syncLogs.length === 0) {
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        successRate: 0,
        averageDuration: 0,
        lastSyncTime: null,
        lastSyncStatus: null,
      };
    }

    const successfulSyncs = syncLogs.filter(
      log => log.status === "success"
    ).length;
    const failedSyncs = syncLogs.filter(log => log.status === "failed").length;

    const lastSync = syncLogs[0];

    return {
      totalSyncs: syncLogs.length,
      successfulSyncs,
      failedSyncs,
      successRate:
        syncLogs.length > 0 ? (successfulSyncs / syncLogs.length) * 100 : 0,
      averageDuration: averageDurationSeconds(syncLogs),
      lastSyncTime: lastSync.createdAt,
      lastSyncStatus: lastSync.status,
    };
  } catch (error) {
    logDb.error("Failed to get Unimicro sync metrics", {
      error,
      tenantId,
      hoursAgo,
    });
    throw error;
  }
}

/**
 * Check for sync failures and generate alerts
 */
export async function checkUnimicroSyncHealth(
  tenantId: string
): Promise<SyncAlert[]> {
  const alerts: SyncAlert[] = [];

  try {
    const metrics = await getUnimicroSyncMetrics(tenantId, 24);

    // Alert: No syncs in last 24 hours
    if (metrics.totalSyncs === 0) {
      alerts.push({
        severity: "warning",
        message: "No Unimicro syncs detected in the last 24 hours",
        timestamp: new Date(),
        tenantId,
        details: { metrics },
      });
    }

    // Alert: Success rate below 80%
    if (metrics.successRate < 80 && metrics.totalSyncs > 0) {
      alerts.push({
        severity: "error",
        message: `Unimicro sync success rate is low: ${metrics.successRate.toFixed(1)}%`,
        timestamp: new Date(),
        tenantId,
        details: { metrics },
      });
    }

    // Alert: Last sync failed
    if (metrics.lastSyncStatus === "failed") {
      alerts.push({
        severity: "error",
        message: "Last Unimicro sync failed",
        timestamp: new Date(),
        tenantId,
        details: {
          lastSyncTime: metrics.lastSyncTime,
          metrics,
        },
      });
    }

    // Alert: Multiple consecutive failures
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not available");
    const recentSyncs = await dbInstance
      .select()
      .from(unimicroSyncLog)
      .where(eq(unimicroSyncLog.tenantId, tenantId))
      .orderBy(desc(unimicroSyncLog.createdAt))
      .limit(5);

    const consecutiveFailures = recentSyncs.filter(
      log => log.status === "failed"
    ).length;
    if (consecutiveFailures >= 3) {
      alerts.push({
        severity: "critical",
        message: `${consecutiveFailures} consecutive Unimicro sync failures detected`,
        timestamp: new Date(),
        tenantId,
        details: {
          consecutiveFailures,
          recentSyncs: recentSyncs.map(s => ({
            id: s.id,
            status: s.status,
            startedAt: s.createdAt,
            error: s.errorMessage,
          })),
        },
      });
    }

    // Alert: Average sync duration too high (>60 seconds)
    if (metrics.averageDuration > 60) {
      alerts.push({
        severity: "warning",
        message: `Unimicro sync duration is high: ${metrics.averageDuration.toFixed(1)}s average`,
        timestamp: new Date(),
        tenantId,
        details: { metrics },
      });
    }

    // Log alerts
    if (alerts.length > 0) {
      logSecurity.warn("Unimicro sync health alerts generated", {
        tenantId,
        alertCount: alerts.length,
        alerts: alerts.map(a => ({ severity: a.severity, message: a.message })),
      });
    }

    return alerts;
  } catch (error) {
    logDb.error(
      "Failed to check Unimicro sync health",
      error instanceof Error ? error : new Error(String(error))
    );
    return [
      {
        severity: "error",
        message: "Failed to check Unimicro sync health",
        timestamp: new Date(),
        tenantId,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
    ];
  }
}

/**
 * Get recent sync failures with details
 */
export async function getRecentSyncFailures(
  tenantId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not available");

    const failures = await dbInstance
      .select()
      .from(unimicroSyncLog)
      .where(
        and(
          eq(unimicroSyncLog.tenantId, tenantId),
          eq(unimicroSyncLog.status, "failed")
        )
      )
      .orderBy(desc(unimicroSyncLog.createdAt))
      .limit(limit);

    return failures.map(failure => ({
      id: failure.id,
      startedAt: failure.createdAt,
      completedAt: failure.createdAt,
      syncType: failure.operation,
      errorMessage: failure.errorMessage,
      errorDetails: failure.details,
      recordsSynced: failure.itemsProcessed,
    }));
  } catch (error) {
    logDb.error("Failed to get recent sync failures", {
      error,
      tenantId,
      limit,
    });
    throw error;
  }
}

/**
 * Get sync statistics by type (invoices, customers, products, etc.)
 */
export async function getSyncStatsByType(
  tenantId: string,
  hoursAgo: number = 24
): Promise<Record<string, SyncMetrics>> {
  try {
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not available");
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const syncLogs = await dbInstance
      .select()
      .from(unimicroSyncLog)
      .where(
        and(
          eq(unimicroSyncLog.tenantId, tenantId),
          gte(unimicroSyncLog.createdAt, cutoffTime)
        )
      );

    // Group by sync operation
    const statsByType: Record<string, SyncLogRow[]> = {};
    syncLogs.forEach(log => {
      const type = log.operation || "unknown";
      if (!statsByType[type]) {
        statsByType[type] = [];
      }
      statsByType[type].push(log);
    });

    // Calculate metrics for each type
    const result: Record<string, SyncMetrics> = {};
    for (const [type, logs] of Object.entries(statsByType)) {
      const successfulSyncs = logs.filter(
        log => log.status === "success"
      ).length;
      const failedSyncs = logs.filter(log => log.status === "failed").length;

      const lastSync = [...logs].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )[0];

      result[type] = {
        totalSyncs: logs.length,
        successfulSyncs,
        failedSyncs,
        successRate:
          logs.length > 0 ? (successfulSyncs / logs.length) * 100 : 0,
        averageDuration: averageDurationSeconds(logs),
        lastSyncTime: lastSync.createdAt,
        lastSyncStatus: lastSync.status,
      };
    }

    return result;
  } catch (error) {
    logDb.error("Failed to get sync stats by type", {
      error,
      tenantId,
      hoursAgo,
    });
    throw error;
  }
}

/**
 * Monitor sync performance and log warnings
 */
export async function monitorSyncPerformance(tenantId: string): Promise<void> {
  try {
    const metrics = await getUnimicroSyncMetrics(tenantId, 24);
    const alerts = await checkUnimicroSyncHealth(tenantId);

    // Log performance summary
    logDb.info("Unimicro sync performance summary", {
      tenantId,
      metrics,
      alertCount: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === "critical").length,
    });

    // Log critical alerts separately
    const criticalAlerts = alerts.filter(a => a.severity === "critical");
    if (criticalAlerts.length > 0) {
      logSecurity.error("Critical Unimicro sync alerts", {
        tenantId,
        alerts: criticalAlerts,
      });
    }
  } catch (error) {
    logDb.error("Failed to monitor sync performance", { error, tenantId });
  }
}

/**
 * Schedule periodic monitoring (call this from a cron job or scheduler)
 */
export async function scheduleUnimicroMonitoring(): Promise<void> {
  try {
    // Get all tenants with Unimicro enabled
    const dbInstance = await getDb();
    if (!dbInstance) throw new Error("Database not available");

    // This would need to query tenants with Unimicro settings
    // For now, we'll log that monitoring is scheduled
    console.log("Unimicro monitoring scheduled", new Date());

    // TODO: Implement tenant query and monitoring loop
    // const tenants = await getTenantsWithUnimicro();
    // for (const tenant of tenants) {
    //   await monitorSyncPerformance(tenant.id);
    // }
  } catch (error) {
    logDb.error(
      "Failed to schedule Unimicro monitoring",
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
