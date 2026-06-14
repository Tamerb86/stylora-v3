import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  Calendar,
  ShoppingCart,
  DollarSign,
  Building2,
  LogOut,
} from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function SaasAdminOverview() {
  const { t } = useTranslation();
  const { data: overview, isLoading } = trpc.saasAdmin.getOverview.useQuery();
  const { data: recentTenants } = trpc.saasAdmin.listTenants.useQuery({
    page: 1,
    pageSize: 5,
    status: "all",
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">{t("saasAdminOverview.loading")}</div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">{t("saasAdminOverview.noData")}</div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: t("saasAdminOverview.totalTenants"),
      value: overview.totalTenants,
      icon: Building2,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: t("saasAdminOverview.activeTenants"),
      value: overview.activeTenants,
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      title: t("saasAdminOverview.trialTenants"),
      value: overview.trialTenants,
      icon: Users,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: t("saasAdminOverview.completedAppointments30d"),
      value: overview.totalAppointmentsLast30Days,
      icon: Calendar,
      gradient: "from-orange-500 to-red-500",
    },
    {
      title: t("saasAdminOverview.orders30d"),
      value: overview.totalOrdersLast30Days,
      icon: ShoppingCart,
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      title: t("saasAdminOverview.revenue30d"),
      value: `${overview.totalRevenueFromOrdersLast30Days.toLocaleString("no-NO")} kr`,
      icon: DollarSign,
      gradient: "from-yellow-500 to-orange-500",
    },
  ];

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t("saasAdminOverview.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("saasAdminOverview.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/saas-admin/tenants">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {t("saasAdminOverview.seeAllTenants")}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              localStorage.removeItem("saas_admin_token");
              window.location.href = "/login";
            }}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("saasAdminOverview.logOut")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`}
              />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div
                    className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient}`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Tenants */}
      <Card className="border-0 shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{t("saasAdminOverview.recentTenants")}</h2>
            <Link href="/saas-admin/tenants">
              <Button variant="outline" size="sm">
                {t("saasAdminOverview.seeAll")}
              </Button>
            </Link>
          </div>

          {recentTenants?.items && recentTenants.items.length > 0 ? (
            <div className="space-y-4">
              {recentTenants.items.map(tenant => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{tenant.name}</h3>
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
                          ? t("saasAdminOverview.statusActive")
                          : tenant.status === "trial"
                            ? t("saasAdminOverview.statusTrial")
                            : tenant.status === "suspended"
                              ? t("saasAdminOverview.statusSuspended")
                              : t("saasAdminOverview.statusCanceled")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{tenant.subdomain}.stylora.app</span>
                      <span>•</span>
                      <span>{tenant.planName || t("saasAdminOverview.noPlan")}</span>
                      <span>•</span>
                      <span>
                        {t("saasAdminOverview.created")}:{" "}
                        {new Date(tenant.createdAt).toLocaleDateString("no-NO")}
                      </span>
                    </div>
                  </div>
                  <Link href={`/saas-admin/tenants/${tenant.id}`}>
                    <Button variant="outline" size="sm">
                      {t("saasAdminOverview.viewDetails")}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("saasAdminOverview.noTenantsFound")}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
