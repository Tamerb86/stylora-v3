/**
 * Fiken Settings Page
 *
 * Manage Fiken accounting integration
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Settings,
  Users,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function FikenSettings() {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Queries
  const { data: settings, refetch: refetchSettings } =
    trpc.fiken.getSettings.useQuery();
  const { data: syncStatus, refetch: refetchSyncStatus } =
    trpc.fiken.getSyncStatus.useQuery();
  const { data: syncLogs } = trpc.fiken.getSyncLogs.useQuery({ limit: 20 });

  // Mutations
  const saveCredentialsMutation = trpc.fiken.saveCredentials.useMutation();
  const handleCallbackMutation = trpc.fiken.handleCallback.useMutation();
  const testConnectionMutation = trpc.fiken.testConnection.useMutation();
  const disconnectMutation = trpc.fiken.disconnect.useMutation();
  const syncAllCustomersMutation = trpc.fiken.syncAllCustomers.useMutation();
  const syncAllOrdersMutation = trpc.fiken.syncAllOrders.useMutation();
  const syncAllServicesMutation = trpc.fiken.syncAllServices.useMutation();
  const syncAllProductsMutation = trpc.fiken.syncAllProducts.useMutation();
  const manualFullSyncMutation = trpc.fiken.manualFullSync.useMutation();

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      toast.error(t("fikenSettings.connectionFailed", { error }));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/fiken`;

      const result = await handleCallbackMutation.mutateAsync({
        code,
        state,
        redirectUri,
      });

      toast.success(t("fikenSettings.connectedToast", { companyName: result.companyName }));

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Refresh settings
      refetchSettings();
      refetchSyncStatus();
    } catch (error) {
      toast.error(
        t("fikenSettings.couldNotConnect", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!clientId || !clientSecret) {
      toast.error(t("fikenSettings.fillBothCredentials"));
      return;
    }

    try {
      await saveCredentialsMutation.mutateAsync({
        clientId,
        clientSecret,
      });

      toast.success(t("fikenSettings.credentialsSaved"));

      refetchSettings();
      setClientId("");
      setClientSecret("");
    } catch (error) {
      toast.error(
        t("fikenSettings.couldNotSave", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    }
  };

  const handleConnect = () => {
    const redirectUri = `${window.location.origin}/fiken`;
    // Build auth URL manually from settings
    if (!settings?.hasCredentials) {
      toast.error(t("fikenSettings.addCredentialsFirst"));
      return;
    }

    // Redirect to backend endpoint that will generate auth URL
    window.location.href = `/api/fiken/auth?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const handleDisconnect = async () => {
    if (!confirm(t("fikenSettings.confirmDisconnect"))) {
      return;
    }

    try {
      await disconnectMutation.mutateAsync();
      toast.success(t("fikenSettings.disconnected"));
      refetchSettings();
      refetchSyncStatus();
    } catch (error) {
      toast.error(
        t("fikenSettings.couldNotDisconnect", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnectionMutation.mutateAsync();

      if (result.success) {
        toast.success(t("fikenSettings.connectionOk", { companyName: result.companyName }));
      } else {
        toast.error(t("fikenSettings.connectionTestFailed", { error: result.error }));
      }
    } catch (error) {
      toast.error(
        t("fikenSettings.couldNotTestConnection", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    }
  };

  const handleSyncCustomers = async () => {
    try {
      const result = await syncAllCustomersMutation.mutateAsync();

      if (result.success) {
        toast.success(
          t("fikenSettings.syncCustomersDone", { count: result.totalProcessed })
        );
      } else {
        toast.error(
          t("fikenSettings.syncPartialProcessed", {
            processed: result.totalProcessed,
            failed: result.totalFailed,
          })
        );
      }

      refetchSyncStatus();
    } catch (error) {
      toast.error(
        t("fikenSettings.syncFailed", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    }
  };

  const handleSyncOrders = async () => {
    try {
      const result = await syncAllOrdersMutation.mutateAsync();

      if (result.success) {
        toast.success(
          t("fikenSettings.syncOrdersDone", { count: result.totalProcessed })
        );
      } else {
        toast.error(
          t("fikenSettings.syncPartialProcessed", {
            processed: result.totalProcessed,
            failed: result.totalFailed,
          })
        );
      }

      refetchSyncStatus();
    } catch (error) {
      toast.error(
        t("fikenSettings.syncFailed", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    }
  };

  const handleSyncServices = async () => {
    try {
      const result = await syncAllServicesMutation.mutateAsync();

      if (result.success) {
        toast.success(
          t("fikenSettings.syncServicesDone", { count: result.synced })
        );
      } else {
        toast.error(
          t("fikenSettings.syncPartialSynced", {
            synced: result.synced,
            failed: result.failed,
          })
        );
      }

      refetchSyncStatus();
    } catch (error) {
      toast.error(
        t("fikenSettings.syncFailed", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    }
  };

  const handleSyncProducts = async () => {
    try {
      const result = await syncAllProductsMutation.mutateAsync();

      if (result.success) {
        toast.success(
          t("fikenSettings.syncProductsDone", { count: result.synced })
        );
      } else {
        toast.error(
          t("fikenSettings.syncPartialSynced", {
            synced: result.synced,
            failed: result.failed,
          })
        );
      }

      refetchSyncStatus();
    } catch (error) {
      toast.error(
        t("fikenSettings.syncFailed", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    }
  };

  const handleFullSync = async () => {
    try {
      const result = await manualFullSyncMutation.mutateAsync();

      const totalSynced =
        (result.customers?.totalProcessed || 0) +
        (result.services?.synced || 0) +
        (result.products?.synced || 0) +
        (result.orders?.totalProcessed || 0);

      const totalFailed =
        (result.customers?.totalFailed || 0) +
        (result.services?.failed || 0) +
        (result.products?.failed || 0) +
        (result.orders?.totalFailed || 0);

      if (totalFailed === 0) {
        toast.success(
          t("fikenSettings.fullSyncDone", { count: totalSynced })
        );
      } else {
        toast.warning(
          t("fikenSettings.syncPartialSynced", {
            synced: totalSynced,
            failed: totalFailed,
          })
        );
      }

      refetchSyncStatus();
    } catch (error) {
      toast.error(
        t("fikenSettings.syncFailed", {
          message: error instanceof Error ? error.message : t("fikenSettings.unknownError"),
        })
      );
    }
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("fikenSettings.connecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("fikenSettings.title")}</h1>
        <p className="text-muted-foreground">
          {t("fikenSettings.subtitle")}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t("fikenSettings.tabOverview")}</TabsTrigger>
          <TabsTrigger value="sync">{t("fikenSettings.tabSync")}</TabsTrigger>
          <TabsTrigger value="logs">{t("fikenSettings.tabLogs")}</TabsTrigger>
          <TabsTrigger value="settings">{t("fikenSettings.tabSettings")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("fikenSettings.connectionStatusTitle")}</CardTitle>
              <CardDescription>{t("fikenSettings.connectionStatusDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{t("fikenSettings.connectedStatus")}</span>
                  </div>

                  {settings.companyName && (
                    <div>
                      <Label className="text-muted-foreground">{t("fikenSettings.companyLabel")}</Label>
                      <p className="font-medium">{settings.companyName}</p>
                    </div>
                  )}

                  {settings.organizationNumber && (
                    <div>
                      <Label className="text-muted-foreground">{t("fikenSettings.orgNumberLabel")}</Label>
                      <p className="font-medium">
                        {settings.organizationNumber}
                      </p>
                    </div>
                  )}

                  {settings.lastSyncAt && (
                    <div>
                      <Label className="text-muted-foreground">
                        {t("fikenSettings.lastSyncLabel")}
                      </Label>
                      <p className="font-medium">
                        {new Date(settings.lastSyncAt).toLocaleString("no-NO")}
                      </p>
                      {settings.lastSyncStatus && (
                        <Badge
                          variant={
                            settings.lastSyncStatus === "success"
                              ? "default"
                              : settings.lastSyncStatus === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className="mt-1"
                        >
                          {settings.lastSyncStatus === "success"
                            ? t("fikenSettings.syncStatusSuccess")
                            : settings.lastSyncStatus === "failed"
                              ? t("fikenSettings.syncStatusFailed")
                              : t("fikenSettings.syncStatusPartial")}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleTestConnection}
                      disabled={testConnectionMutation.isPending}
                      variant="outline"
                    >
                      {testConnectionMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("fikenSettings.testConnection")}
                    </Button>
                    <Button
                      onClick={handleDisconnect}
                      disabled={disconnectMutation.isPending}
                      variant="destructive"
                    >
                      {t("fikenSettings.disconnect")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span>{t("fikenSettings.notConnected")}</span>
                  </div>

                  {!settings?.hasCredentials ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t("fikenSettings.addCredentialsInSettingsTab")}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button onClick={handleConnect}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t("fikenSettings.connectToFiken")}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {settings?.isConnected && syncStatus && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("fikenSettings.unsyncedCustomers")}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {syncStatus.unsyncedCustomers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("fikenSettings.unsyncedCustomersSub")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("fikenSettings.unsyncedOrders")}
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {syncStatus.unsyncedOrders}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("fikenSettings.unsyncedOrdersSub")}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("fikenSettings.manualSyncTitle")}</CardTitle>
              <CardDescription>
                {t("fikenSettings.manualSyncDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings?.isConnected ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("fikenSettings.mustConnectBeforeSync")}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{t("fikenSettings.syncCustomersTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("fikenSettings.unsyncedCustomersCount", {
                          count: syncStatus?.unsyncedCustomers || 0,
                        })}
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncCustomers}
                      disabled={
                        syncAllCustomersMutation.isPending ||
                        (syncStatus?.unsyncedCustomers || 0) === 0
                      }
                    >
                      {syncAllCustomersMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {syncAllCustomersMutation.isPending
                        ? t("fikenSettings.syncing")
                        : t("fikenSettings.sync")}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{t("fikenSettings.syncOrdersTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("fikenSettings.unsyncedOrdersCount", {
                          count: syncStatus?.unsyncedOrders || 0,
                        })}
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncOrders}
                      disabled={
                        syncAllOrdersMutation.isPending ||
                        (syncStatus?.unsyncedOrders || 0) === 0
                      }
                    >
                      {syncAllOrdersMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {syncAllOrdersMutation.isPending
                        ? t("fikenSettings.syncing")
                        : t("fikenSettings.sync")}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{t("fikenSettings.syncServicesTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("fikenSettings.syncServicesDescription")}
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncServices}
                      disabled={syncAllServicesMutation.isPending}
                    >
                      {syncAllServicesMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {syncAllServicesMutation.isPending
                        ? t("fikenSettings.syncing")
                        : t("fikenSettings.sync")}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{t("fikenSettings.syncProductsTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("fikenSettings.syncProductsDescription")}
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncProducts}
                      disabled={syncAllProductsMutation.isPending}
                    >
                      {syncAllProductsMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {syncAllProductsMutation.isPending
                        ? t("fikenSettings.syncing")
                        : t("fikenSettings.sync")}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <h3 className="font-medium">{t("fikenSettings.fullSyncTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("fikenSettings.fullSyncDescription")}
                      </p>
                    </div>
                    <Button
                      onClick={handleFullSync}
                      disabled={manualFullSyncMutation.isPending}
                      variant="default"
                    >
                      {manualFullSyncMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {manualFullSyncMutation.isPending
                        ? t("fikenSettings.syncing")
                        : t("fikenSettings.syncAll")}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("fikenSettings.syncLogTitle")}</CardTitle>
              <CardDescription>{t("fikenSettings.syncLogDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {!syncLogs || syncLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {t("fikenSettings.noLogEntries")}
                </p>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <div className="mt-0.5">
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : log.status === "failed" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">
                            {log.operation.replace("_", " ")}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString("no-NO")}
                          </span>
                        </div>
                        {log.itemsProcessed > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {t("fikenSettings.logProcessedFailed", {
                              processed: log.itemsProcessed,
                              failed: log.itemsFailed,
                            })}
                          </p>
                        )}
                        {log.errorMessage && (
                          <p className="text-sm text-red-500">
                            {log.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("fikenSettings.oauthCredentialsTitle")}</CardTitle>
              <CardDescription>
                {t("fikenSettings.oauthCredentialsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t("fikenSettings.howToGetCredentials")}</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>{t("fikenSettings.credentialsStep1")}</li>
                    <li>{t("fikenSettings.credentialsStep2")}</li>
                    <li>{t("fikenSettings.credentialsStep3")}</li>
                    <li>{t("fikenSettings.credentialsStep4")}</li>
                    <li>{t("fikenSettings.credentialsStep5")}</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder={t("fikenSettings.clientIdPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  placeholder={t("fikenSettings.clientSecretPlaceholder")}
                />
              </div>

              <Button
                onClick={handleSaveCredentials}
                disabled={saveCredentialsMutation.isPending}
              >
                {saveCredentialsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("fikenSettings.saveCredentials")}
              </Button>

              {settings?.hasCredentials && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {t("fikenSettings.credentialsSavedAlert")}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
