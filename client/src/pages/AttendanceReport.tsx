import { useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Download,
  Calendar,
  User,
  Pencil,
  Trash2,
  AlertCircle,
  FileDown,
  FileSpreadsheet,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import {
  exportToPDF,
  exportToExcel,
  formatHours,
  formatDuration,
} from "../lib/exportUtils";

export default function AttendanceReport() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState("thisMonth");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    clockIn: "",
    clockOut: "",
    editReason: "",
  });
  const [deleteReason, setDeleteReason] = useState("");

  const utils = trpc.useUtils();

  // Calculate date range
  const getDateRange = () => {
    // If custom dates are set, use them
    if (dateRange === "custom" && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    const today = new Date();
    let startDate: string;
    let endDate: string = today.toISOString().split("T")[0];

    switch (dateRange) {
      case "today":
        startDate = endDate;
        break;
      case "thisWeek": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        startDate = weekStart.toISOString().split("T")[0];
        break;
      }
      case "thisMonth": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = monthStart.toISOString().split("T")[0];
        break;
      }
      case "lastMonth": {
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonthStart.toISOString().split("T")[0];
        endDate = lastMonthEnd.toISOString().split("T")[0];
        break;
      }
      case "custom":
        // Fallback to this month if custom dates not set
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = monthStart.toISOString().split("T")[0];
        break;
      default:
        startDate = endDate;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const { data: timesheets = [], isLoading } =
    trpc.attendance.getAllTimesheets.useQuery({
      startDate,
      endDate,
      employeeId:
        selectedEmployee === "all" ? undefined : parseInt(selectedEmployee),
    });

  const { data: employeeTotals = [] } =
    trpc.attendance.getEmployeeTotals.useQuery({
      startDate,
      endDate,
    });

  const { data: employees = [] } = trpc.employees.list.useQuery();

  const updateMutation = trpc.attendance.updateTimesheet.useMutation({
    onSuccess: () => {
      utils.attendance.getAllTimesheets.invalidate();
      utils.attendance.getEmployeeTotals.invalidate();
      setEditDialogOpen(false);
      setSelectedTimesheet(null);
      setEditForm({ clockIn: "", clockOut: "", editReason: "" });
    },
  });

  const deleteMutation = trpc.attendance.deleteTimesheet.useMutation({
    onSuccess: () => {
      utils.attendance.getAllTimesheets.invalidate();
      utils.attendance.getEmployeeTotals.invalidate();
      setDeleteDialogOpen(false);
      setSelectedTimesheet(null);
      setDeleteReason("");
    },
  });

  const handleEdit = (timesheet: any) => {
    setSelectedTimesheet(timesheet);
    const clockInDate = new Date(timesheet.clockIn);
    const clockOutDate = timesheet.clockOut
      ? new Date(timesheet.clockOut)
      : null;

    setEditForm({
      clockIn: clockInDate.toISOString().slice(0, 16),
      clockOut: clockOutDate ? clockOutDate.toISOString().slice(0, 16) : "",
      editReason: "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (timesheet: any) => {
    setSelectedTimesheet(timesheet);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTimesheet || !editForm.editReason.trim()) {
      alert(t("attendanceReport.editReasonRequired"));
      return;
    }

    updateMutation.mutate({
      id: selectedTimesheet.id,
      clockIn: editForm.clockIn,
      clockOut: editForm.clockOut || undefined,
      editReason: editForm.editReason,
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedTimesheet || !deleteReason.trim()) {
      alert(t("attendanceReport.deleteReasonRequired"));
      return;
    }

    deleteMutation.mutate({
      id: selectedTimesheet.id,
      reason: deleteReason,
    });
  };

  // Filter data based on current filters
  const getFilteredData = () => {
    return timesheets.filter((t: any) => {
      // Employee filter
      if (
        selectedEmployee !== "all" &&
        t.employeeId?.toString() !== selectedEmployee
      ) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && t.clockOut) {
        return false;
      }
      if (statusFilter === "completed" && !t.clockOut) {
        return false;
      }
      return true;
    });
  };

  const filteredTimesheets = getFilteredData();

  const handleExportPDF = () => {
    const exportData = filteredTimesheets.map((row: any) => ({
      employeeName: row.employeeName || t("attendanceReport.unknown"),
      workDate: new Date(row.workDate),
      clockIn: row.clockIn
        ? new Date(row.clockIn).toLocaleTimeString("no-NO", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
      clockOut: row.clockOut
        ? new Date(row.clockOut).toLocaleTimeString("no-NO", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : t("attendanceReport.active"),
      duration: formatDuration(row.totalHours || 0),
      edited: row.editReason
        ? t("attendanceReport.yes")
        : t("attendanceReport.no"),
    }));

    const columns = [
      { header: t("attendanceReport.columns.employee"), key: "employeeName" },
      { header: t("attendanceReport.columns.date"), key: "workDate" },
      { header: t("attendanceReport.columns.in"), key: "clockIn" },
      { header: t("attendanceReport.columns.out"), key: "clockOut" },
      { header: t("attendanceReport.columns.duration"), key: "duration" },
      { header: t("attendanceReport.columns.edited"), key: "edited" },
    ];

    // Prepare period label
    const periodLabels: Record<string, string> = {
      today: t("attendanceReport.period.today"),
      thisWeek: t("attendanceReport.period.thisWeek"),
      thisMonth: t("attendanceReport.period.thisMonth"),
      lastMonth: t("attendanceReport.period.lastMonth"),
      custom: t("attendanceReport.period.custom"),
    };

    // Prepare employee name
    const selectedEmployeeName =
      selectedEmployee === "all"
        ? t("attendanceReport.allEmployees")
        : employees.find((e: any) => e.id === parseInt(selectedEmployee))
            ?.name || t("attendanceReport.unknown");

    // Prepare metadata
    const metadata = {
      filters: {
        period: periodLabels[dateRange] || dateRange,
        dateRange: `${new Date(startDate).toLocaleDateString("no-NO")} - ${new Date(endDate).toLocaleDateString("no-NO")}`,
        employee: selectedEmployeeName,
      },
      totals: employeeTotals.map((et: any) => ({
        employeeName: et.employeeName,
        totalHours: parseFloat(et.totalHours || 0),
        totalShifts: et.shiftCount,
      })),
    };

    exportToPDF(
      exportData,
      columns,
      t("attendanceReport.title"),
      `timeregistrering_${startDate}_${endDate}`,
      metadata
    );
  };

  const handleExportExcel = () => {
    const exportData = filteredTimesheets.map((row: any) => ({
      employeeName: row.employeeName || t("attendanceReport.unknown"),
      workDate: new Date(row.workDate),
      clockIn: row.clockIn
        ? new Date(row.clockIn).toLocaleTimeString("no-NO", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
      clockOut: row.clockOut
        ? new Date(row.clockOut).toLocaleTimeString("no-NO", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : t("attendanceReport.active"),
      duration: formatDuration(row.totalHours || 0),
      edited: row.editReason
        ? t("attendanceReport.yes")
        : t("attendanceReport.no"),
    }));

    const columns = [
      { header: t("attendanceReport.columns.employee"), key: "employeeName" },
      { header: t("attendanceReport.columns.date"), key: "workDate" },
      { header: t("attendanceReport.columns.in"), key: "clockIn" },
      { header: t("attendanceReport.columns.out"), key: "clockOut" },
      { header: t("attendanceReport.columns.duration"), key: "duration" },
      { header: t("attendanceReport.columns.edited"), key: "edited" },
    ];

    exportToExcel(
      exportData,
      columns,
      t("attendanceReport.title"),
      `timeregistrering_${startDate}_${endDate}`
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              {t("attendanceReport.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("attendanceReport.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={handleExportExcel}
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t("attendanceReport.periodLabel")}
              </Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("attendanceReport.period.today")}</SelectItem>
                  <SelectItem value="thisWeek">{t("attendanceReport.period.thisWeek")}</SelectItem>
                  <SelectItem value="thisMonth">{t("attendanceReport.period.thisMonth")}</SelectItem>
                  <SelectItem value="lastMonth">{t("attendanceReport.period.lastMonth")}</SelectItem>
                  <SelectItem value="custom">{t("attendanceReport.period.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t("attendanceReport.employeeLabel")}
              </Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("attendanceReport.allEmployees")}</SelectItem>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="mt-4 border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                {t("attendanceReport.advancedFilters")}
              </span>
              {showFilters ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Custom Date Range */}
                {dateRange === "custom" && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("attendanceReport.fromDate")}</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("attendanceReport.toDate")}</Label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>{t("attendanceReport.statusLabel")}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("attendanceReport.statusAll")}</SelectItem>
                      <SelectItem value="active">
                        {t("attendanceReport.statusActive")}
                      </SelectItem>
                      <SelectItem value="completed">{t("attendanceReport.statusCompleted")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Filters Button */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateRange("thisMonth");
                      setSelectedEmployee("all");
                      setStatusFilter("all");
                      setCustomStartDate("");
                      setCustomEndDate("");
                    }}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t("attendanceReport.resetFilters")}
                  </Button>
                </div>
              </div>
            )}

            {/* Record Count Preview */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>{filteredTimesheets.length}</strong>{" "}
                {t("attendanceReport.exportCountOf")}{" "}
                <strong>{timesheets.length}</strong>{" "}
                {t("attendanceReport.exportCountSuffix")}
              </p>
            </div>
          </div>
        </Card>

        {/* Overall Summary Statistics */}
        {employeeTotals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{t("attendanceReport.totalHours")}</p>
                  <p className="text-3xl font-bold mt-1">
                    {employeeTotals
                      .reduce(
                        (sum: number, emp: any) =>
                          sum + (parseFloat(emp.totalHours) || 0),
                        0
                      )
                      .toFixed(2)}
                  </p>
                  <p className="text-xs opacity-75 mt-1">{t("attendanceReport.hoursUnit")}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{t("attendanceReport.totalShifts")}</p>
                  <p className="text-3xl font-bold mt-1">
                    {employeeTotals.reduce(
                      (sum: number, emp: any) => sum + (emp.shiftCount || 0),
                      0
                    )}
                  </p>
                  <p className="text-xs opacity-75 mt-1">{t("attendanceReport.shiftsUnit")}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{t("attendanceReport.averagePerDay")}</p>
                  <p className="text-3xl font-bold mt-1">
                    {(
                      employeeTotals.reduce(
                        (sum: number, emp: any) =>
                          sum + (parseFloat(emp.totalHours) || 0),
                        0
                      ) /
                      Math.max(
                        employeeTotals.reduce(
                          (sum: number, emp: any) =>
                            sum + (emp.shiftCount || 0),
                          0
                        ),
                        1
                      )
                    ).toFixed(2)}
                  </p>
                  <p className="text-xs opacity-75 mt-1">{t("attendanceReport.hoursPerShiftUnit")}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{t("attendanceReport.activeEmployees")}</p>
                  <p className="text-3xl font-bold mt-1">
                    {employeeTotals.length}
                  </p>
                  <p className="text-xs opacity-75 mt-1">{t("attendanceReport.employeesUnit")}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="h-6 w-6" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Employee Totals */}
        {employeeTotals.length > 0 && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">{t("attendanceReport.totalPerEmployee")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {employeeTotals.map((emp: any) => (
                <div
                  key={emp.employeeId}
                  className="p-4 bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg"
                >
                  <p className="font-medium">{emp.employeeName}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {emp.totalHours || "0.00"} {t("attendanceReport.hoursUnit")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {emp.shiftCount} {t("attendanceReport.shiftsUnit")}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Timesheets Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-orange-50">
                <tr>
                  <th className="text-left p-4 font-semibold">{t("attendanceReport.columns.employee")}</th>
                  <th className="text-left p-4 font-semibold">{t("attendanceReport.columns.date")}</th>
                  <th className="text-left p-4 font-semibold">{t("attendanceReport.columns.in")}</th>
                  <th className="text-left p-4 font-semibold">{t("attendanceReport.columns.out")}</th>
                  <th className="text-left p-4 font-semibold">{t("attendanceReport.columns.hours")}</th>
                  <th className="text-left p-4 font-semibold">{t("attendanceReport.columns.status")}</th>
                  <th className="text-left p-4 font-semibold">{t("attendanceReport.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center p-8 text-muted-foreground"
                    >
                      {t("attendanceReport.loading")}
                    </td>
                  </tr>
                ) : timesheets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center p-8 text-muted-foreground"
                    >
                      {t("attendanceReport.noRecords")}
                    </td>
                  </tr>
                ) : (
                  timesheets.map((row: any) => (
                    <tr key={row.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{row.employeeName || t("attendanceReport.unknown")}</td>
                      <td className="p-4">
                        {new Date(row.workDate).toLocaleDateString("no-NO")}
                      </td>
                      <td className="p-4">
                        {row.clockIn
                          ? new Date(row.clockIn).toLocaleTimeString("no-NO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="p-4">
                        {row.clockOut ? (
                          new Date(row.clockOut).toLocaleTimeString("no-NO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          <span className="text-green-600 font-medium">
                            {t("attendanceReport.active")}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-medium">
                        {row.totalHours || "0.00"}
                      </td>
                      <td className="p-4">
                        {row.editReason ? (
                          <div className="flex items-center gap-1 text-amber-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {t("attendanceReport.edited")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t("attendanceReport.original")}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(row)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("attendanceReport.editDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("attendanceReport.editDialog.description", { name: selectedTimesheet?.employeeName })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("attendanceReport.editDialog.clockInLabel")}</Label>
                <Input
                  type="datetime-local"
                  value={editForm.clockIn}
                  onChange={e =>
                    setEditForm({ ...editForm, clockIn: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("attendanceReport.editDialog.clockOutLabel")}</Label>
                <Input
                  type="datetime-local"
                  value={editForm.clockOut}
                  onChange={e =>
                    setEditForm({ ...editForm, clockOut: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("attendanceReport.editDialog.reasonLabel")}</Label>
                <Textarea
                  placeholder={t("attendanceReport.editDialog.reasonPlaceholder")}
                  value={editForm.editReason}
                  onChange={e =>
                    setEditForm({ ...editForm, editReason: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                {t("attendanceReport.cancel")}
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
              >
                {updateMutation.isPending
                  ? t("attendanceReport.saving")
                  : t("attendanceReport.saveChanges")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("attendanceReport.deleteDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("attendanceReport.deleteDialog.description", { name: selectedTimesheet?.employeeName })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>{t("attendanceReport.deleteDialog.warningLabel")}</strong>{" "}
                  {t("attendanceReport.deleteDialog.warningText")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t("attendanceReport.deleteDialog.reasonLabel")}</Label>
                <Textarea
                  placeholder={t("attendanceReport.deleteDialog.reasonPlaceholder")}
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                {t("attendanceReport.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending
                  ? t("attendanceReport.deleting")
                  : t("attendanceReport.deleteRecord")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
