import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  FileDown,
  FileSpreadsheet,
  Filter,
  X,
} from "lucide-react";
import { useState } from "react";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { safeToFixed } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function Reports() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("week");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Calculate date range based on period
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    // Priority 1: Custom date range
    if (customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    // Priority 2: Selected month
    if (selectedMonth && selectedYear) {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth) - 1; // JS months are 0-indexed
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return {
        startDate: firstDay.toISOString().split("T")[0],
        endDate: lastDay.toISOString().split("T")[0],
      };
    }

    // Priority 3: Period selector
    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start.setDate(end.getDate() - 7);
        break;
      case "month":
        start.setDate(end.getDate() - 30);
        break;
      case "year":
        start.setDate(end.getDate() - 365);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  };

  const dateRange = getDateRange();

  const { data: customers = [] } = trpc.customers.list.useQuery();
  const { data: employees = [] } = trpc.employees.list.useQuery();
  const { data: services = [] } = trpc.services.list.useQuery();

  // Fetch employee sales data
  const { data: salesByEmployee = [], isLoading: employeeSalesLoading } =
    trpc.financialReports.salesByEmployee.useQuery({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      paymentMethod: "all",
    });

  // Fetch detailed orders for export
  const { data: ordersData = [] } =
    trpc.financialReports.detailedOrdersList.useQuery({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      employeeId:
        selectedEmployee !== "all" ? parseInt(selectedEmployee) : undefined,
      serviceId:
        selectedService !== "all" ? parseInt(selectedService) : undefined,
    });

  const filteredCount = ordersData.length;
  const totalCount = ordersData.length;

  const resetFilters = () => {
    setSelectedEmployee("all");
    setSelectedService("all");
    setSelectedMonth("");
    setSelectedYear(new Date().getFullYear().toString());
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const totalRevenue = ordersData.reduce(
    (sum, order) => sum + parseFloat(order.total || "0"),
    0
  );
  const completedOrders = ordersData.length;

  const handleExportPDF = () => {
    const exportData = ordersData.map((order: any) => ({
      date: new Date(order.orderDate),
      customer: order.customerName || t("reports.exportUnknownCustomer"),
      service: order.serviceName || t("reports.exportMiscService"),
      employee: order.employeeName || t("reports.exportDefaultEmployee"),
      amount: parseFloat(order.total || "0"),
      status: t("reports.exportStatusCompleted"),
    }));

    const columns = [
      { header: t("reports.exportColDate"), key: "date" },
      { header: t("reports.exportColCustomer"), key: "customer" },
      { header: t("reports.exportColService"), key: "service" },
      { header: t("reports.exportColEmployee"), key: "employee" },
      { header: t("reports.exportColAmount"), key: "amount" },
      { header: t("reports.exportColStatus"), key: "status" },
    ];

    const filename =
      selectedMonth && selectedYear
        ? `salgsrapport_${selectedYear}_${selectedMonth}`
        : customStartDate && customEndDate
          ? `salgsrapport_${customStartDate}_til_${customEndDate}`
          : `salgsrapport_${period}`;

    exportToPDF(exportData, columns, t("reports.exportTitle"), filename, {
      filters: { period },
    });
  };

  const handleExportExcel = () => {
    const exportData = ordersData.map((order: any) => ({
      date: new Date(order.orderDate),
      customer: order.customerName || t("reports.exportUnknownCustomer"),
      service: order.serviceName || t("reports.exportMiscService"),
      employee: order.employeeName || t("reports.exportDefaultEmployee"),
      amount: parseFloat(order.total || "0"),
      status: t("reports.exportStatusCompleted"),
    }));

    const columns = [
      { header: t("reports.exportColDate"), key: "date" },
      { header: t("reports.exportColCustomer"), key: "customer" },
      { header: t("reports.exportColService"), key: "service" },
      { header: t("reports.exportColEmployee"), key: "employee" },
      { header: t("reports.exportColAmount"), key: "amount" },
      { header: t("reports.exportColStatus"), key: "status" },
    ];

    const filename =
      selectedMonth && selectedYear
        ? `salgsrapport_${selectedYear}_${selectedMonth}`
        : customStartDate && customEndDate
          ? `salgsrapport_${customStartDate}_til_${customEndDate}`
          : `salgsrapport_${period}`;

    exportToExcel(exportData, columns, t("reports.exportTitle"), filename);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              {t("reports.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("reports.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">{t("reports.last7Days")}</SelectItem>
                <SelectItem value="month">{t("reports.last30Days")}</SelectItem>
                <SelectItem value="quarter">{t("reports.last90Days")}</SelectItem>
                <SelectItem value="year">{t("reports.lastYear")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => handleExportPDF()}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={() => handleExportExcel()}
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {t("reports.export")}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full sm:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                {t("reports.advancedFilters")}
              </Button>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-orange-600">
                  {filteredCount}
                </span>{" "}
                {t("reports.ofConnector")}{" "}
                <span className="font-semibold">{totalCount}</span>{" "}
                {t("reports.entriesWillBeExported")}
              </div>
            </div>
          </CardHeader>
          {showAdvancedFilters && (
            <CardContent>
              {/* Row 1: Month, Year, Employee, Service */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("reports.monthLabel")}
                  </label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("reports.selectMonth")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("reports.allMonths")}</SelectItem>
                      <SelectItem value="01">{t("reports.month01")}</SelectItem>
                      <SelectItem value="02">{t("reports.month02")}</SelectItem>
                      <SelectItem value="03">{t("reports.month03")}</SelectItem>
                      <SelectItem value="04">{t("reports.month04")}</SelectItem>
                      <SelectItem value="05">{t("reports.month05")}</SelectItem>
                      <SelectItem value="06">{t("reports.month06")}</SelectItem>
                      <SelectItem value="07">{t("reports.month07")}</SelectItem>
                      <SelectItem value="08">{t("reports.month08")}</SelectItem>
                      <SelectItem value="09">{t("reports.month09")}</SelectItem>
                      <SelectItem value="10">{t("reports.month10")}</SelectItem>
                      <SelectItem value="11">{t("reports.month11")}</SelectItem>
                      <SelectItem value="12">{t("reports.month12")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">{t("reports.yearLabel")}</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("reports.employeeLabel")}
                  </label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("reports.selectEmployee")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("reports.allEmployees")}</SelectItem>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("reports.serviceLabel")}
                  </label>
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("reports.selectService")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("reports.allServices")}</SelectItem>
                      {services.map((svc: any) => (
                        <SelectItem key={svc.id} value={svc.id.toString()}>
                          {svc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Custom Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("reports.fromDate")}
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("reports.toDate")}
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="hidden">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Egendefinert periode (OLD)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Fra dato"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Til dato"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("reports.resetFilters")}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("reports.totalRevenue")}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalRevenue.toLocaleString()} NOK
              </div>
              <p className="text-xs text-muted-foreground">
                {t("reports.vsPreviousPeriod")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("reports.completedAppointments")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedOrders}</div>
              <p className="text-xs text-muted-foreground">{t("reports.cancelledCount", { count: 0 })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("reports.completionRate")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completedOrders > 0 ? "100" : "0"}%
              </div>
              <p className="text-xs text-muted-foreground">
                {t("reports.ofTotalAppointments", { count: completedOrders })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("reports.activeCustomers")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-xs text-muted-foreground">
                {t("reports.newThisMonth", { count: Math.floor(customers.length * 0.08) })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("reports.revenuePerWeek")}</CardTitle>
              <CardDescription>{t("reports.last8Weeks")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>{t("reports.chartComingSoon")}</p>
                  <p className="text-sm">{t("reports.chartRequiresChartjs")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("reports.popularServices")}</CardTitle>
              <CardDescription>{t("reports.mostBookedServices")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>{t("reports.chartComingSoon")}</p>
                  <p className="text-sm">{t("reports.chartRequiresChartjs")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Sales Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("reports.salesPerEmployee")}</CardTitle>
            <CardDescription>
              {t("reports.salesPerEmployeeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employeeSalesLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("reports.loading")}
              </div>
            ) : salesByEmployee.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("reports.noSalesData")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {salesByEmployee.map((emp: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-white font-bold">
                        {emp.employeeName?.charAt(0) || "A"}
                      </div>
                      <div>
                        <p className="font-medium">
                          {emp.employeeName || t("reports.unknownEmployee")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("reports.orderCount", { count: emp.orderCount || 0 })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {parseFloat(emp.totalRevenue || 0).toLocaleString(
                          "nb-NO"
                        )}{" "}
                        kr
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("reports.average")}{" "}
                        {emp.orderCount > 0
                          ? safeToFixed(
                              parseFloat(emp.totalRevenue) / emp.orderCount,
                              0
                            )
                          : 0}{" "}
                        kr
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t("reports.detailedStats")}</CardTitle>
            <CardDescription>
              {t("reports.detailedStatsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{t("reports.avgAppointmentValue")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("reports.perCompletedAppointment")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">500 NOK</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{t("reports.avgDuration")}</p>
                  <p className="text-sm text-muted-foreground">{t("reports.perAppointment")}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{t("reports.durationMinutes", { count: 45 })}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{t("reports.customerLoyalty")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("reports.returningCustomers")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">68%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("reports.bestDay")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("reports.mostBookedDay")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{t("reports.saturday")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
