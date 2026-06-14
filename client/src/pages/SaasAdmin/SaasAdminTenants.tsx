import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ArrowLeft,
  LogIn,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function SaasAdminTenants() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "all" | "trial" | "active" | "suspended" | "canceled"
  >("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Activation dialog state
  const [activationDialog, setActivationDialog] = useState<{
    open: boolean;
    tenantId: string;
    tenantName: string;
    action: "activate" | "suspend";
  }>({ open: false, tenantId: "", tenantName: "", action: "activate" });

  const { data, isLoading, refetch } = trpc.saasAdmin.listTenants.useQuery({
    search: search || undefined,
    status,
    page,
    pageSize,
  });

  const { data: plans } = trpc.saasAdmin.getSubscriptionPlans.useQuery();

  const utils = trpc.useUtils();

  const impersonateMutation = trpc.saasAdmin.impersonateTenant.useMutation({
    onSuccess: async result => {
      // The admin session is preserved server-side and restored on exit; do not
      // stash session tokens in localStorage (the real cookie is httpOnly).

      // Clear all tRPC/ReactQuery caches to prevent stale admin data
      await utils.invalidate();

      toast.success(t("saasAdminTenants.loggedInAs", { name: result.tenantName }));
      
      // Hard reload to ensure fresh state and navigate to dashboard
      window.location.href = result.redirectUrl;
    },
    onError: error => {
      toast.error(t("saasAdminTenants.loginError", { message: error.message }));
    },
  });

  const updateMutation = trpc.saasAdmin.updateTenantPlanAndStatus.useMutation({
    onSuccess: () => {
      toast.success(
        activationDialog.action === "activate"
          ? t("saasAdminTenants.tenantActivated")
          : t("saasAdminTenants.tenantSuspended")
      );
      setActivationDialog({
        open: false,
        tenantId: "",
        tenantName: "",
        action: "activate",
      });
      refetch();
    },
    onError: error => {
      toast.error(t("saasAdminTenants.error", { message: error.message }));
    },
  });

  const handleImpersonate = (tenantId: string) => {
    impersonateMutation.mutate({ tenantId });
  };

  const handleQuickActivate = (tenantId: string, tenantName: string) => {
    setActivationDialog({
      open: true,
      tenantId,
      tenantName,
      action: "activate",
    });
  };

  const handleQuickSuspend = (tenantId: string, tenantName: string) => {
    setActivationDialog({
      open: true,
      tenantId,
      tenantName,
      action: "suspend",
    });
  };

  const confirmActivation = () => {
    // Get the first available plan (Basic) for activation
    const basicPlan = plans?.find((p: any) => p.name === "basic") || plans?.[0];

    updateMutation.mutate({
      tenantId: activationDialog.tenantId,
      status: activationDialog.action === "activate" ? "active" : "suspended",
      planId: activationDialog.action === "activate" ? basicPlan?.id : null,
    });
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/saas-admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t("saasAdminTenants.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("saasAdminTenants.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/saas-admin/subscriptions">
            <Button variant="outline">{t("saasAdminTenants.subscriptions")}</Button>
          </Link>
          <Link href="/saas-admin/tenants/new">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              {t("saasAdminTenants.createNewTenant")}
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("saasAdminTenants.logOut")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 border-0 shadow-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("saasAdminTenants.searchPlaceholder")}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value: typeof status) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t("saasAdminTenants.selectStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("saasAdminTenants.statusAll")}</SelectItem>
              <SelectItem value="trial">{t("saasAdminTenants.statusTrial")}</SelectItem>
              <SelectItem value="active">{t("saasAdminTenants.statusActive")}</SelectItem>
              <SelectItem value="suspended">{t("saasAdminTenants.statusSuspended")}</SelectItem>
              <SelectItem value="canceled">{t("saasAdminTenants.statusCanceled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">{t("saasAdminTenants.loading")}</div>
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t("saasAdminTenants.noTenantsFound")}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t("saasAdminTenants.tryChangingSearch")}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("saasAdminTenants.colName")}</TableHead>
                    <TableHead>{t("saasAdminTenants.colSubdomain")}</TableHead>
                    <TableHead>{t("saasAdminTenants.colStatus")}</TableHead>
                    <TableHead>{t("saasAdminTenants.colPlan")}</TableHead>
                    <TableHead>{t("saasAdminTenants.colCreated")}</TableHead>
                    <TableHead className="text-right">{t("saasAdminTenants.colLast30Days")}</TableHead>
                    <TableHead className="text-right">{t("saasAdminTenants.colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map(tenant => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        {tenant.name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {tenant.subdomain}
                        </code>
                      </TableCell>
                      <TableCell>
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
                            ? t("saasAdminTenants.statusActive")
                            : tenant.status === "trial"
                              ? t("saasAdminTenants.statusTrial")
                              : tenant.status === "suspended"
                                ? t("saasAdminTenants.statusSuspended")
                                : t("saasAdminTenants.statusCanceled")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {tenant.planName || t("saasAdminTenants.noPlan")}
                        </span>
                        {tenant.planPriceMonthly && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({tenant.planPriceMonthly} kr/mnd)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString("no-NO")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="font-medium">
                              {tenant.appointmentCountLast30Days}
                            </span>{" "}
                            {t("saasAdminTenants.appointmentsSuffix")}
                          </div>
                          <div>
                            <span className="font-medium">
                              {tenant.orderCountLast30Days}
                            </span>{" "}
                            {t("saasAdminTenants.ordersSuffix")}
                          </div>
                          <div className="text-muted-foreground">
                            {tenant.totalOrderAmountLast30Days.toLocaleString(
                              "no-NO"
                            )}{" "}
                            kr
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Activate/Suspend Button */}
                          {tenant.status === "trial" ||
                          tenant.status === "suspended" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleQuickActivate(tenant.id, tenant.name)
                              }
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t("saasAdminTenants.activate")}
                            </Button>
                          ) : tenant.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleQuickSuspend(tenant.id, tenant.name)
                              }
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {t("saasAdminTenants.suspend")}
                            </Button>
                          ) : null}

                          <Link href={`/saas-admin/tenants/${tenant.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              {t("saasAdminTenants.details")}
                            </Button>
                          </Link>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleImpersonate(tenant.id)}
                            disabled={impersonateMutation.isPending}
                            className="bg-gradient-to-r from-blue-600 to-purple-600"
                          >
                            <LogIn className="h-4 w-4 mr-1" />
                            {t("saasAdminTenants.logIn")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <div className="text-sm text-muted-foreground">
                    {t("saasAdminTenants.showingRange", {
                      from: (page - 1) * pageSize + 1,
                      to: Math.min(page * pageSize, data.totalItems),
                      total: data.totalItems,
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t("saasAdminTenants.previous")}
                    </Button>
                    <div className="text-sm">
                      {t("saasAdminTenants.pageOf", { page, totalPages: data.totalPages })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(p => Math.min(data.totalPages, p + 1))
                      }
                      disabled={page === data.totalPages}
                    >
                      {t("saasAdminTenants.next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Activation Confirmation Dialog */}
      <Dialog
        open={activationDialog.open}
        onOpenChange={open => setActivationDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activationDialog.action === "activate"
                ? t("saasAdminTenants.activateTenant")
                : t("saasAdminTenants.suspendTenant")}
            </DialogTitle>
            <DialogDescription>
              {activationDialog.action === "activate" ? (
                <>
                  {t("saasAdminTenants.confirmActivatePrefix")}{" "}
                  <strong>{activationDialog.tenantName}</strong>?
                  <br />
                  <br />
                  {t("saasAdminTenants.confirmActivateBody")}
                </>
              ) : (
                <>
                  {t("saasAdminTenants.confirmSuspendPrefix")}{" "}
                  <strong>{activationDialog.tenantName}</strong>?
                  <br />
                  <br />
                  {t("saasAdminTenants.confirmSuspendBody")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActivationDialog(prev => ({ ...prev, open: false }))
              }
            >
              {t("saasAdminTenants.cancel")}
            </Button>
            <Button
              onClick={confirmActivation}
              disabled={updateMutation.isPending}
              className={
                activationDialog.action === "activate"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saasAdminTenants.processing")}
                </>
              ) : activationDialog.action === "activate" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("saasAdminTenants.activate")}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("saasAdminTenants.suspend")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
