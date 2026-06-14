import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Settings,
  Database,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function UnimicroSettings() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } =
    trpc.unimicro.getSettings.useQuery();

  // Fetch sync logs
  const { data: syncLogs, isLoading: logsLoading } =
    trpc.unimicro.getSyncLogs.useQuery({ limit: 20 });

  // Fetch unsynced data
  const { data: unsyncedCustomers } =
    trpc.unimicro.getUnsyncedCustomers.useQuery();
  const { data: unsyncedOrders } = trpc.unimicro.getUnsyncedOrders.useQuery();

  // Form state
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState<
    "daily" | "weekly" | "monthly" | "manual" | "custom"
  >("daily");
  const [syncHour, setSyncHour] = useState(23);
  const [syncDayOfWeek, setSyncDayOfWeek] = useState<number | undefined>();
  const [syncDayOfMonth, setSyncDayOfMonth] = useState<number | undefined>();

  // Mutations
  const updateSettings = trpc.unimicro.updateSettings.useMutation({
    onSuccess: () => {
      toast.success(t("unimicroSettings.settingsSavedTitle"), {
        description: t("unimicroSettings.settingsSavedDescription"),
      });
      utils.unimicro.getSettings.invalidate();
    },
    onError: error => {
      toast.error(t("unimicroSettings.errorPrefix", { message: error.message }));
    },
  });

  const testConnection = trpc.unimicro.testConnection.useMutation({
    onSuccess: data => {
      if (data.success) {
        toast.success(t("unimicroSettings.connectionSuccessTitle"), {
          description: t("unimicroSettings.connectionSuccessDescription"),
        });
      } else {
        toast.error(
          t("unimicroSettings.connectionFailed", { message: data.message })
        );
      }
      utils.unimicro.getSyncLogs.invalidate();
    },
    onError: error => {
      toast.error(t("unimicroSettings.errorPrefix", { message: error.message }));
    },
  });

  const manualSync = trpc.unimicro.manualSync.useMutation({
    onSuccess: data => {
      if (data.success) {
        toast.success(t("unimicroSettings.syncCompletedTitle"), {
          description: data.message,
        });
      } else {
        toast.warning(t("unimicroSettings.syncPartialTitle"), {
          description: data.message,
        });
      }
      utils.unimicro.getSettings.invalidate();
      utils.unimicro.getSyncLogs.invalidate();
      utils.unimicro.getUnsyncedCustomers.invalidate();
      utils.unimicro.getUnsyncedOrders.invalidate();
    },
    onError: error => {
      toast.error(
        t("unimicroSettings.syncFailed", { message: error.message })
      );
    },
  });

  // Initialize form with settings
  useState(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setSyncFrequency(settings.syncFrequency);
      setSyncHour(settings.syncHour);
      setSyncDayOfWeek(settings.syncDayOfWeek || undefined);
      setSyncDayOfMonth(settings.syncDayOfMonth || undefined);
      if (settings.companyId) setCompanyId(settings.companyId.toString());
    }
  });

  const handleSaveSettings = () => {
    updateSettings.mutate({
      enabled,
      clientId: clientId || undefined,
      clientSecret: clientSecret || undefined,
      companyId: companyId ? parseInt(companyId) : undefined,
      syncFrequency,
      syncHour,
      syncDayOfWeek,
      syncDayOfMonth,
    });
  };

  const handleTestConnection = () => {
    testConnection.mutate();
  };

  const handleManualSync = () => {
    manualSync.mutate();
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const lastSyncStatus = settings?.lastSyncStatus;
  const lastSyncAt = settings?.lastSyncAt;
  const nextSyncAt = settings?.nextSyncAt;

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {t("unimicroSettings.pageTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("unimicroSettings.pageSubtitle")}
          </p>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              {t("unimicroSettings.tabSettings")}
            </TabsTrigger>
            <TabsTrigger value="status">
              <Database className="h-4 w-4 mr-2" />
              {t("unimicroSettings.tabStatus")}
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Clock className="h-4 w-4 mr-2" />
              {t("unimicroSettings.tabLogs")}
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle>{t("unimicroSettings.connectionStatusTitle")}</CardTitle>
                <CardDescription>
                  {t("unimicroSettings.connectionStatusDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">
                        {enabled
                          ? t("unimicroSettings.enabled")
                          : t("unimicroSettings.disabled")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {enabled
                          ? t("unimicroSettings.integrationActive")
                          : t("unimicroSettings.integrationInactive")}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleTestConnection}
                    disabled={!enabled || testConnection.isPending}
                    variant="outline"
                  >
                    {testConnection.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {t("unimicroSettings.testConnection")}
                  </Button>
                </div>

                {lastSyncAt && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("unimicroSettings.lastSync")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>
                          {new Date(lastSyncAt).toLocaleString("no-NO")}
                        </span>
                        {lastSyncStatus === "success" && (
                          <Badge variant="default" className="bg-green-600">
                            {t("unimicroSettings.statusSuccess")}
                          </Badge>
                        )}
                        {lastSyncStatus === "failed" && (
                          <Badge variant="destructive">
                            {t("unimicroSettings.statusFailed")}
                          </Badge>
                        )}
                        {lastSyncStatus === "partial" && (
                          <Badge variant="secondary">
                            {t("unimicroSettings.statusPartial")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {nextSyncAt && syncFrequency !== "manual" && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-muted-foreground">
                          {t("unimicroSettings.nextSync")}
                        </span>
                        <span>
                          {new Date(nextSyncAt).toLocaleString("no-NO")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Credentials */}
            <Card>
              <CardHeader>
                <CardTitle>{t("unimicroSettings.apiCredentialsTitle")}</CardTitle>
                <CardDescription>
                  {t("unimicroSettings.apiCredentialsDescription")}{" "}
                  <a
                    href="https://developer.unimicro.no/guide/authentication/server-application"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {t("unimicroSettings.readMore")}{" "}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    type="text"
                    placeholder="din-client-id"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyId">Company ID</Label>
                  <Input
                    id="companyId"
                    type="number"
                    placeholder="12345"
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled">
                      {t("unimicroSettings.enableIntegration")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("unimicroSettings.enableIntegrationHint")}
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sync Frequency */}
            <Card>
              <CardHeader>
                <CardTitle>{t("unimicroSettings.syncFrequencyTitle")}</CardTitle>
                <CardDescription>
                  {t("unimicroSettings.syncFrequencyDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="syncFrequency">
                    {t("unimicroSettings.frequencyLabel")}
                  </Label>
                  <Select
                    value={syncFrequency}
                    onValueChange={(v: any) => setSyncFrequency(v)}
                  >
                    <SelectTrigger id="syncFrequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">
                        {t("unimicroSettings.freqDaily")}
                      </SelectItem>
                      <SelectItem value="weekly">
                        {t("unimicroSettings.freqWeekly")}
                      </SelectItem>
                      <SelectItem value="monthly">
                        {t("unimicroSettings.freqMonthly")}
                      </SelectItem>
                      <SelectItem value="manual">
                        {t("unimicroSettings.freqManual")}
                      </SelectItem>
                      <SelectItem value="custom">
                        {t("unimicroSettings.freqCustom")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {syncFrequency === "weekly" && (
                  <div className="space-y-2">
                    <Label htmlFor="syncDayOfWeek">
                      {t("unimicroSettings.dayOfWeekLabel")}
                    </Label>
                    <Select
                      value={syncDayOfWeek?.toString()}
                      onValueChange={v => setSyncDayOfWeek(parseInt(v))}
                    >
                      <SelectTrigger id="syncDayOfWeek">
                        <SelectValue
                          placeholder={t("unimicroSettings.selectDayPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">
                          {t("unimicroSettings.sunday")}
                        </SelectItem>
                        <SelectItem value="1">
                          {t("unimicroSettings.monday")}
                        </SelectItem>
                        <SelectItem value="2">
                          {t("unimicroSettings.tuesday")}
                        </SelectItem>
                        <SelectItem value="3">
                          {t("unimicroSettings.wednesday")}
                        </SelectItem>
                        <SelectItem value="4">
                          {t("unimicroSettings.thursday")}
                        </SelectItem>
                        <SelectItem value="5">
                          {t("unimicroSettings.friday")}
                        </SelectItem>
                        <SelectItem value="6">
                          {t("unimicroSettings.saturday")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {syncFrequency === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="syncDayOfMonth">
                      {t("unimicroSettings.dayOfMonthLabel")}
                    </Label>
                    <Select
                      value={syncDayOfMonth?.toString()}
                      onValueChange={v => setSyncDayOfMonth(parseInt(v))}
                    >
                      <SelectTrigger id="syncDayOfMonth">
                        <SelectValue placeholder="Velg dag" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(
                          day => (
                            <SelectItem key={day} value={day.toString()}>
                              {t("unimicroSettings.dayOrdinal", { day })}
                            </SelectItem>
                          )
                        )}
                        <SelectItem value="-1">
                          {t("unimicroSettings.lastDayOfMonth")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {syncFrequency !== "manual" && (
                  <div className="space-y-2">
                    <Label htmlFor="syncHour">
                      {t("unimicroSettings.timeLabel")}
                    </Label>
                    <Select
                      value={syncHour.toString()}
                      onValueChange={v => setSyncHour(parseInt(v))}
                    >
                      <SelectTrigger id="syncHour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {syncFrequency === "manual" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t("unimicroSettings.manualSyncAlert")}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
                size="lg"
              >
                {updateSettings.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {t("unimicroSettings.saveSettings")}
              </Button>
            </div>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Unsynced Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("unimicroSettings.customersTitle")}</CardTitle>
                  <CardDescription>
                    {t("unimicroSettings.customersDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {unsyncedCustomers?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("unimicroSettings.unsyncedCustomers")}
                  </p>
                </CardContent>
              </Card>

              {/* Unsynced Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("unimicroSettings.invoicesTitle")}</CardTitle>
                  <CardDescription>
                    {t("unimicroSettings.invoicesDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {unsyncedOrders?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("unimicroSettings.unsyncedOrders")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Manual Sync */}
            <Card>
              <CardHeader>
                <CardTitle>{t("unimicroSettings.manualSyncTitle")}</CardTitle>
                <CardDescription>
                  {t("unimicroSettings.manualSyncDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleManualSync}
                  disabled={manualSync.isPending || !enabled}
                  size="lg"
                  className="w-full"
                >
                  {manualSync.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t("unimicroSettings.syncNow")}
                </Button>
                {!enabled && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {t("unimicroSettings.enableFirstHint")}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("unimicroSettings.syncLogTitle")}</CardTitle>
                <CardDescription>
                  {t("unimicroSettings.syncLogDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : syncLogs && syncLogs.length > 0 ? (
                  <div className="space-y-4">
                    {syncLogs.map(log => (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className="mt-1">
                          {log.status === "success" && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          {log.status === "failed" && (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          {log.status === "partial" && (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">
                              {log.operation === "customer_sync" &&
                                t("unimicroSettings.opCustomerSync")}
                              {log.operation === "invoice_sync" &&
                                t("unimicroSettings.opInvoiceSync")}
                              {log.operation === "payment_sync" &&
                                t("unimicroSettings.opPaymentSync")}
                              {log.operation === "full_sync" &&
                                t("unimicroSettings.opFullSync")}
                              {log.operation === "test_connection" &&
                                t("unimicroSettings.opTestConnection")}
                            </p>
                            <Badge
                              variant={
                                log.triggeredBy === "manual"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {log.triggeredBy === "manual"
                                ? t("unimicroSettings.triggerManual")
                                : t("unimicroSettings.triggerAutomatic")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString("no-NO")}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-600">
                              ✓{" "}
                              {t("unimicroSettings.itemsProcessed", {
                                count: log.itemsProcessed ?? 0,
                              })}
                            </span>
                            {(log.itemsFailed || 0) > 0 && (
                              <span className="text-red-600">
                                ✗{" "}
                                {t("unimicroSettings.itemsFailed", {
                                  count: log.itemsFailed ?? 0,
                                })}
                              </span>
                            )}
                            {log.duration && (
                              <span className="text-muted-foreground">
                                {(log.duration / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>
                          {log.errorMessage && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertDescription className="text-sm">
                                {log.errorMessage}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("unimicroSettings.noLogs")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
