import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  LogIn,
  Save,
  Users,
  Calendar,
  ShoppingCart,
  DollarSign,
  Pause,
  Play,
  Trash2,
  AlertTriangle,
  Loader2,
  Key,
  Mail,
  Phone,
  User,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function SaasAdminTenantDetails() {
  const { t } = useTranslation();
  const [match, params] = useRoute("/saas-admin/tenants/:tenantId");
  const [, setLocation] = useLocation();
  const tenantId = params?.tenantId as string;

  // Validate tenantId
  const isValidTenantId =
    tenantId && tenantId !== ":tenantId" && !tenantId.includes(":");

  const [selectedStatus, setSelectedStatus] = useState<
    "trial" | "active" | "suspended" | "canceled"
  >("active");
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // Dialog states
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] =
    useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState("");

  // Owner credentials state
  const [showEditOwnerDialog, setShowEditOwnerDialog] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerNewPassword, setOwnerNewPassword] = useState("");

  const {
    data: details,
    isLoading,
    refetch,
  } = trpc.saasAdmin.getTenantDetails.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const { data: plans } = trpc.saasAdmin.getSubscriptionPlans.useQuery();

  const impersonateMutation = trpc.saasAdmin.impersonateTenant.useMutation({
    onSuccess: result => {
      setLocation(result.redirectUrl);
    },
    onError: error => {
      toast.error(t("saasAdminTenantDetails.error", { message: error.message }));
    },
  });

  const updateMutation = trpc.saasAdmin.updateTenantPlanAndStatus.useMutation({
    onSuccess: () => {
      toast.success(t("saasAdminTenantDetails.updated"));
      refetch();
    },
    onError: error => {
      toast.error(t("saasAdminTenantDetails.error", { message: error.message }));
    },
  });

  const suspendMutation = trpc.saasAdmin.suspendTenant.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setShowSuspendDialog(false);
      refetch();
    },
    onError: error => {
      toast.error(t("saasAdminTenantDetails.error", { message: error.message }));
    },
  });

  const reactivateMutation = trpc.saasAdmin.reactivateTenant.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      refetch();
    },
    onError: error => {
      toast.error(t("saasAdminTenantDetails.error", { message: error.message }));
    },
  });

  const deleteMutation = trpc.saasAdmin.deleteTenant.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setShowDeleteDialog(false);
      setLocation("/saas-admin/tenants");
    },
    onError: error => {
      toast.error(t("saasAdminTenantDetails.error", { message: error.message }));
    },
  });

  const permanentDeleteMutation =
    trpc.saasAdmin.permanentlyDeleteTenant.useMutation({
      onSuccess: result => {
        toast.success(result.message);
        setShowPermanentDeleteDialog(false);
        setLocation("/saas-admin/tenants");
      },
      onError: error => {
        toast.error(t("saasAdminTenantDetails.error", { message: error.message }));
      },
    });

  // Owner credentials queries and mutations
  const { data: ownerData, refetch: refetchOwner } =
    trpc.saasAdmin.getTenantOwner.useQuery(
      { tenantId },
      { enabled: !!tenantId }
    );

  const updateOwnerMutation =
    trpc.saasAdmin.updateTenantOwnerCredentials.useMutation({
      onSuccess: () => {
        toast.success(t("saasAdminTenantDetails.ownerUpdated"));
        setShowEditOwnerDialog(false);
        setOwnerNewPassword("");
        refetchOwner();
      },
      onError: error => {
        toast.error(t("saasAdminTenantDetails.error", { message: error.message }));
      },
    });

  // Initialize owner form when data loads
  useEffect(() => {
    if (ownerData) {
      setOwnerEmail(ownerData.email || "");
      setOwnerName(ownerData.name || "");
      setOwnerPhone(ownerData.phone || "");
    }
  }, [ownerData]);

  const handleUpdateOwner = () => {
    updateOwnerMutation.mutate({
      tenantId,
      email: ownerEmail || undefined,
      name: ownerName || undefined,
      phone: ownerPhone || undefined,
      newPassword: ownerNewPassword || undefined,
    });
  };

  // Initialize form values when data loads
  useEffect(() => {
    if (details) {
      if (details.tenant.status) {
        setSelectedStatus(details.tenant.status);
      }
      setSelectedPlanId(details.subscription?.planId ?? null);
    }
  }, [details]);

  const handleSave = () => {
    updateMutation.mutate({
      tenantId,
      status: selectedStatus,
      planId: selectedPlanId,
    });
  };

  const handleSuspend = () => {
    suspendMutation.mutate({ tenantId });
  };

  const handleReactivate = () => {
    reactivateMutation.mutate({ tenantId });
  };

  const handleDelete = () => {
    if (deleteConfirmName !== details?.tenant.name) {
      toast.error(t("saasAdminTenantDetails.nameMismatch"));
      return;
    }
    deleteMutation.mutate({ tenantId, confirmName: deleteConfirmName });
  };

  const handlePermanentDelete = () => {
    if (deleteConfirmName !== details?.tenant.name) {
      toast.error(t("saasAdminTenantDetails.nameMismatch"));
      return;
    }
    if (permanentDeleteConfirm !== "DELETE PERMANENTLY") {
      toast.error(t("saasAdminTenantDetails.typeDeletePermanently"));
      return;
    }
    permanentDeleteMutation.mutate({
      tenantId,
      confirmName: deleteConfirmName,
      confirmPermanent: "DELETE PERMANENTLY",
    });
  };

  // Show error if tenantId is invalid
  if (!isValidTenantId) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-red-600 text-lg font-semibold">
            {t("saasAdminTenantDetails.invalidTenantId")}
          </div>
          <div className="text-muted-foreground">
            {t("saasAdminTenantDetails.invalidUrl")}
          </div>
          <Button onClick={() => setLocation("/saas-admin/tenants")}>
            {t("saasAdminTenantDetails.backToTenants")}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">{t("saasAdminTenantDetails.loading")}</div>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-muted-foreground text-lg">
            {t("saasAdminTenantDetails.tenantNotFound")}
          </div>
          <Button onClick={() => setLocation("/saas-admin/tenants")}>
            {t("saasAdminTenantDetails.backToTenants")}
          </Button>
        </div>
      </div>
    );
  }

  const { tenant, subscription, usage } = details;

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/saas-admin/tenants">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground mt-1">
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {tenant.subdomain}.stylora.app
              </code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => impersonateMutation.mutate({ tenantId })}
            disabled={impersonateMutation.isPending}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <LogIn className="h-4 w-4 mr-2" />
            {t("saasAdminTenantDetails.logInAsTenant")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("saasAdminTenantDetails.logOut")}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card className="p-6 border-0 shadow-lg">
        <h2 className="text-xl font-bold mb-4">{t("saasAdminTenantDetails.basicInfo")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("saasAdminTenantDetails.name")}
            </label>
            <p className="text-lg font-medium mt-1">{tenant.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("saasAdminTenantDetails.subdomain")}
            </label>
            <p className="text-lg font-medium mt-1">{tenant.subdomain}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("saasAdminTenantDetails.orgNumber")}
            </label>
            <p className="text-lg font-medium mt-1">
              {tenant.orgNumber || t("saasAdminTenantDetails.notSet")}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("saasAdminTenantDetails.created")}
            </label>
            <p className="text-lg font-medium mt-1">
              {new Date(tenant.createdAt).toLocaleDateString("no-NO")}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t("saasAdminTenantDetails.status")}
            </label>
            <div className="mt-1">
              <Badge
                variant={
                  tenant.status === "active"
                    ? "default"
                    : tenant.status === "trial"
                      ? "secondary"
                      : "destructive"
                }
              >
                {tenant.status === "active"
                  ? t("saasAdminTenantDetails.statusActive")
                  : tenant.status === "trial"
                    ? t("saasAdminTenantDetails.statusTrial")
                    : tenant.status === "suspended"
                      ? t("saasAdminTenantDetails.statusSuspended")
                      : t("saasAdminTenantDetails.statusCanceled")}
              </Badge>
            </div>
          </div>
          {tenant.trialEndsAt && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("saasAdminTenantDetails.trialEnds")}
              </label>
              <p className="text-lg font-medium mt-1">
                {new Date(tenant.trialEndsAt).toLocaleDateString("no-NO")}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Owner Credentials */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t("saasAdminTenantDetails.ownerLogin")}</h2>
          <Button
            variant="outline"
            onClick={() => setShowEditOwnerDialog(true)}
          >
            <Key className="h-4 w-4 mr-2" />
            {t("saasAdminTenantDetails.editLogin")}
          </Button>
        </div>

        {ownerData ? (
          <div className="grid gap-4 md:grid-cols-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("saasAdminTenantDetails.name")}
                </label>
                <p className="font-medium">{ownerData.name || t("saasAdminTenantDetails.notSet")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("saasAdminTenantDetails.email")}
                </label>
                <p className="font-medium">
                  {ownerData.email || t("saasAdminTenantDetails.notSet")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("saasAdminTenantDetails.phone")}
                </label>
                <p className="font-medium">
                  {ownerData.phone || t("saasAdminTenantDetails.notSet")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("saasAdminTenantDetails.password")}
                </label>
                <p className="font-medium text-muted-foreground">••••••••</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("saasAdminTenantDetails.loadingOwner")}</p>
        )}
      </Card>

      {/* Subscription Management */}
      <Card className="p-6 border-0 shadow-lg">
        <h2 className="text-xl font-bold mb-4">{t("saasAdminTenantDetails.subscription")}</h2>

        {subscription && (
          <div className="grid gap-4 md:grid-cols-2 mb-6 p-4 bg-muted/50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("saasAdminTenantDetails.currentPlan")}
              </label>
              <p className="text-lg font-medium mt-1">
                {subscription.planName}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("saasAdminTenantDetails.price")}
              </label>
              <p className="text-lg font-medium mt-1">
                {subscription.priceMonthly} kr/mnd
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("saasAdminTenantDetails.subscriptionStatus")}
              </label>
              <p className="text-lg font-medium mt-1 capitalize">
                {subscription.status}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {t("saasAdminTenantDetails.period")}
              </label>
              <p className="text-lg font-medium mt-1">
                {new Date(subscription.currentPeriodStart).toLocaleDateString(
                  "no-NO"
                )}{" "}
                -{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                  "no-NO"
                )}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("saasAdminTenantDetails.changeStatus")}
            </label>
            <Select
              value={selectedStatus}
              onValueChange={(value: typeof selectedStatus) =>
                setSelectedStatus(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">{t("saasAdminTenantDetails.statusTrial")}</SelectItem>
                <SelectItem value="active">{t("saasAdminTenantDetails.statusActive")}</SelectItem>
                <SelectItem value="suspended">{t("saasAdminTenantDetails.statusSuspended")}</SelectItem>
                <SelectItem value="canceled">{t("saasAdminTenantDetails.statusCanceled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t("saasAdminTenantDetails.changePlan")}</label>
            <Select
              value={selectedPlanId?.toString() || "none"}
              onValueChange={value =>
                setSelectedPlanId(value === "none" ? null : parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("saasAdminTenantDetails.noPlan")}</SelectItem>
                {plans?.map((plan: any) => (
                  <SelectItem key={plan.id} value={plan.id.toString()}>
                    {plan.displayNameNo} - {plan.priceMonthly} kr/mnd
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Save className="h-4 w-4 mr-2" />
            {t("saasAdminTenantDetails.saveChanges")}
          </Button>
        </div>
      </Card>

      {/* Usage Stats */}
      <Card className="p-6 border-0 shadow-lg">
        <h2 className="text-xl font-bold mb-4">{t("saasAdminTenantDetails.usageStats")}</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("saasAdminTenantDetails.customers")}</p>
              <p className="text-2xl font-bold">{usage.totalCustomers}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("saasAdminTenantDetails.employees")}</p>
              <p className="text-2xl font-bold">{usage.totalEmployees}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("saasAdminTenantDetails.appointmentsTotal")}</p>
              <p className="text-2xl font-bold">{usage.totalAppointments}</p>
              <p className="text-xs text-muted-foreground">
                {t("saasAdminTenantDetails.completedCount", { count: usage.totalCompletedAppointments })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("saasAdminTenantDetails.ordersTotal")}</p>
              <p className="text-2xl font-bold">{usage.totalOrders}</p>
              <p className="text-xs text-muted-foreground">
                {usage.totalOrderAmount.toLocaleString("no-NO")} kr
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-4">{t("saasAdminTenantDetails.last30Days")}</h3>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("saasAdminTenantDetails.appointments")}</p>
                <p className="text-2xl font-bold">
                  {usage.last30DaysAppointments}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("saasAdminTenantDetails.orders")}</p>
                <p className="text-2xl font-bold">{usage.last30DaysOrders}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-teal-500">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("saasAdminTenantDetails.revenue")}</p>
                <p className="text-2xl font-bold">
                  {usage.last30DaysOrderAmount.toLocaleString("no-NO")} kr
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-0 shadow-lg border-red-200 bg-red-50/50 dark:bg-red-950/10">
        <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t("saasAdminTenantDetails.dangerZone")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("saasAdminTenantDetails.dangerZoneWarning")}
        </p>

        <div className="space-y-4">
          {/* Suspend/Reactivate */}
          {tenant.status === "suspended" ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-900">
              <div>
                <h3 className="font-semibold">{t("saasAdminTenantDetails.reactivateTenant")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("saasAdminTenantDetails.reactivateDescription")}
                </p>
              </div>
              <Button
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
                onClick={handleReactivate}
                disabled={reactivateMutation.isPending}
              >
                {reactivateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {t("saasAdminTenantDetails.reactivate")}
              </Button>
            </div>
          ) : (
            tenant.status !== "canceled" && (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-900">
                <div>
                  <h3 className="font-semibold">{t("saasAdminTenantDetails.suspendTenant")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("saasAdminTenantDetails.suspendDescription")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={() => setShowSuspendDialog(true)}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  {t("saasAdminTenantDetails.suspend")}
                </Button>
              </div>
            )
          )}

          {/* Soft Delete */}
          {tenant.status !== "canceled" && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-900">
              <div>
                <h3 className="font-semibold">{t("saasAdminTenantDetails.deleteTenant")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("saasAdminTenantDetails.deleteDescription")}
                </p>
              </div>
              <Button
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => {
                  setDeleteConfirmName("");
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("saasAdminTenantDetails.delete")}
              </Button>
            </div>
          )}

          {/* Permanent Delete */}
          <div className="flex items-center justify-between p-4 border-2 border-red-300 rounded-lg bg-white dark:bg-gray-900">
            <div>
              <h3 className="font-semibold text-red-600">{t("saasAdminTenantDetails.deletePermanently")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("saasAdminTenantDetails.deletePermanentlyDescription")}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteConfirmName("");
                setPermanentDeleteConfirm("");
                setShowPermanentDeleteDialog(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("saasAdminTenantDetails.deletePermanently")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Suspend Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("saasAdminTenantDetails.suspendDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("saasAdminTenantDetails.suspendDialogDescription", { name: tenant.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("saasAdminTenantDetails.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              {t("saasAdminTenantDetails.suspend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{t("saasAdminTenantDetails.deleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("saasAdminTenantDetails.deleteDialogDescription", { name: tenant.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="confirmName">
                {t("saasAdminTenantDetails.confirmNameLabel")}:{" "}
                <strong>{tenant.name}</strong>
              </Label>
              <Input
                id="confirmName"
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                placeholder={t("saasAdminTenantDetails.tenantNamePlaceholder")}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              {t("saasAdminTenantDetails.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                deleteMutation.isPending || deleteConfirmName !== tenant.name
              }
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("saasAdminTenantDetails.deleteTenant")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Owner Credentials Dialog */}
      <Dialog open={showEditOwnerDialog} onOpenChange={setShowEditOwnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saasAdminTenantDetails.editOwnerDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("saasAdminTenantDetails.editOwnerDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="ownerName">{t("saasAdminTenantDetails.name")}</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder={t("saasAdminTenantDetails.fullNamePlaceholder")}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="ownerEmail">{t("saasAdminTenantDetails.email")}</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                placeholder={t("saasAdminTenantDetails.emailPlaceholder")}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="ownerPhone">{t("saasAdminTenantDetails.phone")}</Label>
              <Input
                id="ownerPhone"
                type="tel"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value)}
                placeholder="+47 xxx xx xxx"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="ownerPassword">{t("saasAdminTenantDetails.newPasswordLabel")}</Label>
              <Input
                id="ownerPassword"
                type="password"
                value={ownerNewPassword}
                onChange={e => setOwnerNewPassword(e.target.value)}
                placeholder={t("saasAdminTenantDetails.newPasswordPlaceholder")}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("saasAdminTenantDetails.newPasswordHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditOwnerDialog(false)}
            >
              {t("saasAdminTenantDetails.cancel")}
            </Button>
            <Button
              onClick={handleUpdateOwner}
              disabled={updateOwnerMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {updateOwnerMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t("saasAdminTenantDetails.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog
        open={showPermanentDeleteDialog}
        onOpenChange={setShowPermanentDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("saasAdminTenantDetails.permanentDeleteDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              <strong className="text-red-600">{t("saasAdminTenantDetails.warning")}:</strong>{" "}
              {t("saasAdminTenantDetails.permanentDeleteDialogDescription", { name: tenant.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="confirmNamePerm">
                {t("saasAdminTenantDetails.enterTenantNameLabel")}: <strong>{tenant.name}</strong>
              </Label>
              <Input
                id="confirmNamePerm"
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                placeholder={t("saasAdminTenantDetails.tenantNamePlaceholder")}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="confirmPerm">
                {t("saasAdminTenantDetails.typeWord")}{" "}
                <strong>DELETE PERMANENTLY</strong>{" "}
                {t("saasAdminTenantDetails.toConfirm")}
              </Label>
              <Input
                id="confirmPerm"
                value={permanentDeleteConfirm}
                onChange={e => setPermanentDeleteConfirm(e.target.value)}
                placeholder="DELETE PERMANENTLY"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPermanentDeleteDialog(false)}
            >
              {t("saasAdminTenantDetails.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={
                permanentDeleteMutation.isPending ||
                deleteConfirmName !== tenant.name ||
                permanentDeleteConfirm !== "DELETE PERMANENTLY"
              }
            >
              {permanentDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("saasAdminTenantDetails.deletePermanently")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
