import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SystemStatus() {
  const { data, isLoading, refetch } = trpc.system.status.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">System Status</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">System Status</h1>
        <p>Failed to load system status</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">System Status</h1>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {/* Environment */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Environment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Environment</p>
              <Badge variant={data.environment === "production" ? "default" : "secondary"}>
                {data.environment}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Node Environment</p>
              <p className="font-mono">{data.nodeEnv}</p>
            </div>
          </div>
        </Card>

        {/* Database */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Database</h2>
          <div className="flex items-center gap-2">
            {data.database.connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-600">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-600">Disconnected</span>
              </>
            )}
          </div>
          {data.database.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
              Error: {data.database.error}
            </div>
          )}
        </Card>

        {/* Current User / JWT Info */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Current Session (JWT)</h2>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{data.currentUser.userId || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open ID</p>
                <p className="font-mono text-sm truncate">{data.currentUser.openId || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-mono text-sm">{data.currentUser.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant="outline">{data.currentUser.role || "N/A"}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tenant ID</p>
                <p className="font-mono text-sm truncate">{data.currentUser.tenantId || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Impersonating</p>
                <Badge variant={data.currentUser.impersonating ? "destructive" : "secondary"}>
                  {data.currentUser.impersonating ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
            {data.currentUser.impersonating && data.currentUser.impersonatedTenantId && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="text-sm font-semibold text-orange-800">Impersonation Active</p>
                <p className="text-sm text-orange-600 mt-1">
                  Impersonated Tenant: <span className="font-mono">{data.currentUser.impersonatedTenantId}</span>
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Timestamp */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Server Time</h2>
          <p className="font-mono text-sm">{new Date(data.timestamp).toLocaleString()}</p>
        </Card>
      </div>
    </div>
  );
}
