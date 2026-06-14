import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function SaasAdminSubscriptions() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [editPlanDialog, setEditPlanDialog] = useState<{
    open: boolean;
    plan: any | null;
  }>({ open: false, plan: null });
  const [newPlanDialog, setNewPlanDialog] = useState(false);

  // Form state for new/edit plan
  const [planForm, setPlanForm] = useState({
    name: "",
    displayNameNo: "",
    displayNameEn: "",
    priceMonthly: 0,
    priceYearly: 0,
    maxEmployees: 0,
    maxCustomers: 0,
    maxAppointmentsPerMonth: 0,
    features: "",
    isActive: true,
  });

  const {
    data: plans,
    isLoading: plansLoading,
    refetch: refetchPlans,
  } = trpc.saasAdmin.getSubscriptionPlans.useQuery();
  const { data: tenants } = trpc.saasAdmin.listTenants.useQuery({
    page: 1,
    pageSize: 1000,
  });

  // Mutations for creating and updating plans
  const createPlanMutation = trpc.saasAdmin.createSubscriptionPlan.useMutation({
    onSuccess: () => {
      toast.success(t("saasAdminSubscriptions.planCreated"));
      setNewPlanDialog(false);
      resetPlanForm();
      refetchPlans();
    },
    onError: error => {
      toast.error(t("saasAdminSubscriptions.error", { message: error.message }));
    },
  });

  const updatePlanMutation = trpc.saasAdmin.updateSubscriptionPlan.useMutation({
    onSuccess: () => {
      toast.success(t("saasAdminSubscriptions.planUpdated"));
      setEditPlanDialog({ open: false, plan: null });
      refetchPlans();
    },
    onError: error => {
      toast.error(t("saasAdminSubscriptions.error", { message: error.message }));
    },
  });

  const deletePlanMutation = trpc.saasAdmin.deleteSubscriptionPlan.useMutation({
    onSuccess: () => {
      toast.success(t("saasAdminSubscriptions.planDeleted"));
      refetchPlans();
    },
    onError: error => {
      toast.error(t("saasAdminSubscriptions.error", { message: error.message }));
    },
  });

  const handleCreatePlan = () => {
    createPlanMutation.mutate({
      name: planForm.name,
      displayNameNo: planForm.displayNameNo,
      displayNameEn: planForm.displayNameEn || undefined,
      priceMonthly: planForm.priceMonthly,
      priceYearly: planForm.priceYearly || undefined,
      maxEmployees: planForm.maxEmployees || undefined,
      maxCustomers: planForm.maxCustomers || undefined,
      maxAppointmentsPerMonth: planForm.maxAppointmentsPerMonth || undefined,
      features: planForm.features || undefined,
      isActive: planForm.isActive,
    });
  };

  const handleUpdatePlan = () => {
    if (!editPlanDialog.plan) return;
    updatePlanMutation.mutate({
      planId: editPlanDialog.plan.id,
      name: planForm.name,
      displayNameNo: planForm.displayNameNo,
      displayNameEn: planForm.displayNameEn || undefined,
      priceMonthly: planForm.priceMonthly,
      priceYearly: planForm.priceYearly || undefined,
      maxEmployees: planForm.maxEmployees || null,
      maxCustomers: planForm.maxCustomers || null,
      maxAppointmentsPerMonth: planForm.maxAppointmentsPerMonth || null,
      features: planForm.features || null,
      isActive: planForm.isActive,
    });
  };

  // Calculate subscription statistics
  const stats = {
    totalActive: tenants?.items.filter(t => t.status === "active").length || 0,
    totalTrial: tenants?.items.filter(t => t.status === "trial").length || 0,
    totalSuspended:
      tenants?.items.filter(t => t.status === "suspended").length || 0,
    totalCanceled:
      tenants?.items.filter(t => t.status === "canceled").length || 0,
    monthlyRevenue:
      tenants?.items
        .filter(t => t.status === "active" && t.planPriceMonthly)
        .reduce((sum, t) => sum + (Number(t.planPriceMonthly) || 0), 0) || 0,
  };

  // Group tenants by plan
  const tenantsByPlan =
    plans?.reduce((acc: any, plan: any) => {
      acc[plan.id] =
        tenants?.items.filter(t => t.planName === plan.displayNameNo) || [];
      return acc;
    }, {}) || {};

  const resetPlanForm = () => {
    setPlanForm({
      name: "",
      displayNameNo: "",
      displayNameEn: "",
      priceMonthly: 0,
      priceYearly: 0,
      maxEmployees: 0,
      maxCustomers: 0,
      maxAppointmentsPerMonth: 0,
      features: "",
      isActive: true,
    });
  };

  const openEditPlan = (plan: any) => {
    setPlanForm({
      name: plan.name,
      displayNameNo: plan.displayNameNo,
      displayNameEn: plan.displayNameEn || "",
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly || plan.priceMonthly * 10,
      maxEmployees: plan.maxEmployees || 0,
      maxCustomers: plan.maxCustomers || 0,
      maxAppointmentsPerMonth: plan.maxAppointmentsPerMonth || 0,
      features: plan.features || "",
      isActive: plan.isActive !== false,
    });
    setEditPlanDialog({ open: true, plan });
  };

  const openNewPlan = () => {
    resetPlanForm();
    setNewPlanDialog(true);
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
              {t("saasAdminSubscriptions.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("saasAdminSubscriptions.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={openNewPlan}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("saasAdminSubscriptions.newPlan")}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("saasAdminSubscriptions.logOut")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("saasAdminSubscriptions.statActive")}</p>
              <p className="text-2xl font-bold">{stats.totalActive}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("saasAdminSubscriptions.statTrial")}</p>
              <p className="text-2xl font-bold">{stats.totalTrial}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("saasAdminSubscriptions.statSuspended")}</p>
              <p className="text-2xl font-bold">{stats.totalSuspended}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-gray-500 to-slate-500">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("saasAdminSubscriptions.statCanceled")}</p>
              <p className="text-2xl font-bold">{stats.totalCanceled}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">MRR</p>
              <p className="text-2xl font-bold">
                {stats.monthlyRevenue.toLocaleString("no-NO")} kr
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">{t("saasAdminSubscriptions.tabOverview")}</TabsTrigger>
          <TabsTrigger value="plans">{t("saasAdminSubscriptions.tabPlans")}</TabsTrigger>
          <TabsTrigger value="active">{t("saasAdminSubscriptions.tabActiveSubscribers")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans?.map((plan: any) => {
              const subscriberCount = tenantsByPlan[plan.id]?.length || 0;
              const activeCount =
                tenantsByPlan[plan.id]?.filter(
                  (t: any) => t.status === "active"
                ).length || 0;

              return (
                <Card key={plan.id} className="p-6 border-0 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold">
                        {plan.displayNameNo}
                      </h3>
                      <p className="text-2xl font-bold text-primary mt-1">
                        {plan.priceMonthly} kr
                        <span className="text-sm font-normal text-muted-foreground">
                          {t("saasAdminSubscriptions.perMonth")}
                        </span>
                      </p>
                    </div>
                    <Badge
                      variant={
                        plan.isActive !== false ? "default" : "secondary"
                      }
                    >
                      {plan.isActive !== false ? t("saasAdminSubscriptions.statusActive") : t("saasAdminSubscriptions.statusInactive")}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex justify-between">
                      <span>{t("saasAdminSubscriptions.maxEmployees")}:</span>
                      <span className="font-medium text-foreground">
                        {plan.maxEmployees || t("saasAdminSubscriptions.unlimited")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("saasAdminSubscriptions.maxCustomers")}:</span>
                      <span className="font-medium text-foreground">
                        {plan.maxCustomers || t("saasAdminSubscriptions.unlimited")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("saasAdminSubscriptions.appointmentsPerMonth")}:</span>
                      <span className="font-medium text-foreground">
                        {plan.maxAppointmentsPerMonth || t("saasAdminSubscriptions.unlimited")}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>{activeCount}</strong>{" "}
                          {t("saasAdminSubscriptions.activeOfTotal", {
                            total: subscriberCount,
                          })}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditPlan(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card className="border-0 shadow-lg">
            <div className="p-6">
              {plansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("saasAdminSubscriptions.colPlan")}</TableHead>
                      <TableHead>{t("saasAdminSubscriptions.colPriceMonthly")}</TableHead>
                      <TableHead>{t("saasAdminSubscriptions.colPriceYearly")}</TableHead>
                      <TableHead>{t("saasAdminSubscriptions.colMaxEmployees")}</TableHead>
                      <TableHead>{t("saasAdminSubscriptions.colMaxCustomers")}</TableHead>
                      <TableHead>{t("saasAdminSubscriptions.colStatus")}</TableHead>
                      <TableHead>{t("saasAdminSubscriptions.colSubscribers")}</TableHead>
                      <TableHead className="text-right">{t("saasAdminSubscriptions.colActions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans?.map((plan: any) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {plan.displayNameNo}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {plan.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{plan.priceMonthly} kr</TableCell>
                        <TableCell>
                          {plan.priceYearly || plan.priceMonthly * 10} kr
                        </TableCell>
                        <TableCell>{plan.maxEmployees || "∞"}</TableCell>
                        <TableCell>{plan.maxCustomers || "∞"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              plan.isActive !== false ? "default" : "secondary"
                            }
                          >
                            {plan.isActive !== false ? t("saasAdminSubscriptions.statusActive") : t("saasAdminSubscriptions.statusInactive")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tenantsByPlan[plan.id]?.length || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditPlan(plan)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {t("saasAdminSubscriptions.edit")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Active Subscribers Tab */}
        <TabsContent value="active">
          <Card className="border-0 shadow-lg">
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("saasAdminSubscriptions.colTenant")}</TableHead>
                    <TableHead>{t("saasAdminSubscriptions.colPlan")}</TableHead>
                    <TableHead>{t("saasAdminSubscriptions.colStatus")}</TableHead>
                    <TableHead>{t("saasAdminSubscriptions.colStarted")}</TableHead>
                    <TableHead>{t("saasAdminSubscriptions.colNextInvoice")}</TableHead>
                    <TableHead className="text-right">{t("saasAdminSubscriptions.colMonthly")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants?.items
                    .filter(t => t.status === "active" || t.status === "trial")
                    .map(tenant => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <Link
                            href={`/saas-admin/tenants/${tenant.id}`}
                            className="hover:underline"
                          >
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {tenant.subdomain}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>{tenant.planName || t("saasAdminSubscriptions.noPlan")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tenant.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {tenant.status === "active" ? t("saasAdminSubscriptions.statusActive") : t("saasAdminSubscriptions.statusTrial")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(tenant.createdAt).toLocaleDateString(
                            "no-NO"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tenant.status === "trial" && tenant.trialEndsAt
                            ? new Date(tenant.trialEndsAt).toLocaleDateString(
                                "no-NO"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {tenant.planPriceMonthly
                            ? `${tenant.planPriceMonthly} kr`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog
        open={editPlanDialog.open}
        onOpenChange={open => setEditPlanDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("saasAdminSubscriptions.editPlanTitle")}</DialogTitle>
            <DialogDescription>
              {t("saasAdminSubscriptions.editPlanDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelInternalName")}</Label>
                <Input
                  value={planForm.name}
                  onChange={e =>
                    setPlanForm(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="basic"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelDisplayNameNo")}</Label>
                <Input
                  value={planForm.displayNameNo}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      displayNameNo: e.target.value,
                    }))
                  }
                  placeholder="Basis"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelPriceMonthly")}</Label>
                <Input
                  type="number"
                  value={planForm.priceMonthly}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      priceMonthly: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelPriceYearly")}</Label>
                <Input
                  type="number"
                  value={planForm.priceYearly}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      priceYearly: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelMaxEmployees")}</Label>
                <Input
                  type="number"
                  value={planForm.maxEmployees}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      maxEmployees: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t("saasAdminSubscriptions.unlimitedPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelMaxCustomers")}</Label>
                <Input
                  type="number"
                  value={planForm.maxCustomers}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      maxCustomers: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t("saasAdminSubscriptions.unlimitedPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelAppointmentsPerMonth")}</Label>
                <Input
                  type="number"
                  value={planForm.maxAppointmentsPerMonth}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      maxAppointmentsPerMonth: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t("saasAdminSubscriptions.unlimitedPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("saasAdminSubscriptions.labelFeatures")}</Label>
              <Input
                value={planForm.features}
                onChange={e =>
                  setPlanForm(prev => ({ ...prev, features: e.target.value }))
                }
                placeholder={t("saasAdminSubscriptions.featuresPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPlanDialog({ open: false, plan: null })}
            >
              {t("saasAdminSubscriptions.cancel")}
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600"
              onClick={handleUpdatePlan}
              disabled={updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saasAdminSubscriptions.saving")}
                </>
              ) : (
                t("saasAdminSubscriptions.saveChanges")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Plan Dialog */}
      <Dialog open={newPlanDialog} onOpenChange={setNewPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("saasAdminSubscriptions.newPlanTitle")}</DialogTitle>
            <DialogDescription>
              {t("saasAdminSubscriptions.newPlanDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelInternalName")}</Label>
                <Input
                  value={planForm.name}
                  onChange={e =>
                    setPlanForm(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="premium"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelDisplayNameNo")}</Label>
                <Input
                  value={planForm.displayNameNo}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      displayNameNo: e.target.value,
                    }))
                  }
                  placeholder="Premium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelPriceMonthly")}</Label>
                <Input
                  type="number"
                  value={planForm.priceMonthly}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      priceMonthly: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelPriceYearly")}</Label>
                <Input
                  type="number"
                  value={planForm.priceYearly}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      priceYearly: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelMaxEmployees")}</Label>
                <Input
                  type="number"
                  value={planForm.maxEmployees}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      maxEmployees: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t("saasAdminSubscriptions.unlimitedPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelMaxCustomers")}</Label>
                <Input
                  type="number"
                  value={planForm.maxCustomers}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      maxCustomers: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t("saasAdminSubscriptions.unlimitedPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("saasAdminSubscriptions.labelAppointmentsPerMonth")}</Label>
                <Input
                  type="number"
                  value={planForm.maxAppointmentsPerMonth}
                  onChange={e =>
                    setPlanForm(prev => ({
                      ...prev,
                      maxAppointmentsPerMonth: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder={t("saasAdminSubscriptions.unlimitedPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("saasAdminSubscriptions.labelFeatures")}</Label>
              <Input
                value={planForm.features}
                onChange={e =>
                  setPlanForm(prev => ({ ...prev, features: e.target.value }))
                }
                placeholder={t("saasAdminSubscriptions.featuresPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPlanDialog(false)}>
              {t("saasAdminSubscriptions.cancel")}
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600"
              onClick={handleCreatePlan}
              disabled={
                createPlanMutation.isPending ||
                !planForm.name ||
                !planForm.displayNameNo
              }
            >
              {createPlanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saasAdminSubscriptions.creating")}
                </>
              ) : (
                t("saasAdminSubscriptions.createPlan")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
