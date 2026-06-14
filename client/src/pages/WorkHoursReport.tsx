import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { nb } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, User } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EmployeeWorkData {
  employeeId: number;
  employeeName: string;
  totalHours: string;
  shiftCount: number;
  daysWorked: number;
  avgHoursPerShift: string;
  firstDay: string | null;
  lastDay: string | null;
}

export default function WorkHoursReport() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<
    number | undefined
  >(undefined);

  // Calculate date ranges
  const today = new Date();
  const startDate =
    period === "week"
      ? format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")
      : format(startOfMonth(today), "yyyy-MM-dd");
  const endDate =
    period === "week"
      ? format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")
      : format(endOfMonth(today), "yyyy-MM-dd");

  // Fetch employees
  const { data: employees } = trpc.employees.list.useQuery();

  // Fetch work hours report
  const { data: report, isLoading } =
    trpc.attendance.getEmployeeWorkReport.useQuery({
      employeeId: selectedEmployeeId,
      startDate,
      endDate,
    });

  const handlePeriodChange = (value: "week" | "month") => {
    setPeriod(value);
  };

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployeeId(value === "all" ? undefined : parseInt(value));
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("workHoursReport.timeRegistration"), href: "/timeclock" },
        { label: t("workHoursReport.title") },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("workHoursReport.title")}
            </h1>
            <p className="text-gray-600 mt-1">
              {t("workHoursReport.subtitle")}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t("workHoursReport.filterTitle")}</CardTitle>
            <CardDescription>
              {t("workHoursReport.filterDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Period selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("workHoursReport.periodLabel")}
                </label>
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">
                      {t("workHoursReport.thisWeek")}
                    </SelectItem>
                    <SelectItem value="month">
                      {t("workHoursReport.thisMonth")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employee selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("workHoursReport.employeeLabel")}
                </label>
                <Select
                  value={selectedEmployeeId?.toString() || "all"}
                  onValueChange={handleEmployeeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("workHoursReport.allEmployees")}
                    </SelectItem>
                    {employees?.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {t("workHoursReport.periodLabel")}:{" "}
                {format(new Date(startDate), "d. MMM yyyy", { locale: nb })} -{" "}
                {format(new Date(endDate), "d. MMM yyyy", { locale: nb })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {!isLoading && report && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t("workHoursReport.totalHours")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-8 h-8 text-blue-500" />
                  <span className="text-3xl font-bold">
                    {report.summary.totalHours}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t("workHoursReport.totalShifts")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="w-8 h-8 text-green-500" />
                  <span className="text-3xl font-bold">
                    {report.summary.totalShifts}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t("workHoursReport.avgHoursPerDay")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <User className="w-8 h-8 text-purple-500" />
                  <span className="text-3xl font-bold">
                    {report.summary.averageHoursPerDay}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employee Details */}
        {!isLoading && report && report.employees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("workHoursReport.detailsTitle")}</CardTitle>
              <CardDescription>
                {t("workHoursReport.detailsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        {t("workHoursReport.employeeLabel")}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        {t("workHoursReport.totalHours")}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        {t("workHoursReport.shiftCount")}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        {t("workHoursReport.daysWorked")}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        {t("workHoursReport.avgHoursPerShift")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.employees.map((emp: EmployeeWorkData) => (
                      <tr
                        key={emp.employeeId}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {emp.employeeName}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-blue-600">
                          {parseFloat(emp.totalHours).toFixed(2)}h
                        </td>
                        <td className="text-right py-3 px-4">
                          {emp.shiftCount}
                        </td>
                        <td className="text-right py-3 px-4">
                          {emp.daysWorked}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-600">
                          {parseFloat(emp.avgHoursPerShift).toFixed(2)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="text-gray-600">
                  {t("workHoursReport.loading")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && report && report.employees.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-600">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>{t("workHoursReport.noData")}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
