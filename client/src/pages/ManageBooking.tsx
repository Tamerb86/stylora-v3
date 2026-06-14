import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { nb } from "date-fns/locale";
import { safeToFixed } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// =======================
// Helpers (top-level, once)
// =======================
const DEFAULT_VAT = 25;

const toGross = (net: number, vatRate: number = DEFAULT_VAT): number => {
  return net * (1 + vatRate / 100);
};

const formatKr = (value: number, decimals: number = 0): string => {
  return `${safeToFixed(value, decimals)} kr`;
};

// Normalize slot data from API (handles both {time: string} and string formats)
const normalizeSlotTime = (slot: any): string => {
  if (typeof slot === "string") return slot;
  if (slot && typeof slot === "object" && typeof slot.time === "string")
    return slot.time;
  return "";
};

export default function ManageBooking() {
  const { t } = useTranslation();
  const [, params] = useRoute("/manage-booking/:token");
  const token = params?.token || "";

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");

  const {
    data: booking,
    isLoading,
    refetch,
  } = trpc.publicBooking.getBookingByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  const { data: availableSlots = [] } =
    trpc.publicBooking.getAvailableTimeSlots.useQuery(
      {
        tenantId: booking?.tenantId || "",
        date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
        serviceId: booking?.services?.[0]?.id || 0,
        employeeId: booking?.employeeId,
      },
      {
        enabled: !!selectedDate && !!booking && !!booking.services?.[0]?.id,
      }
    );

  // Normalize and filter slots (also removes past times if selected date is today)
  const filteredSlots = useMemo(() => {
    if (!availableSlots || availableSlots.length === 0) return [];

    const normalized = availableSlots
      .map(normalizeSlotTime)
      .map(t => (t ? t.substring(0, 5) : ""))
      .filter(Boolean);

    if (selectedDate && isSameDay(selectedDate, new Date())) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      return normalized.filter((timeStr: string) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const slotMinutes = hours * 60 + minutes;
        return slotMinutes > currentMinutes;
      });
    }

    return normalized;
  }, [availableSlots, selectedDate]);

  const cancelMutation = trpc.publicBooking.cancelBooking.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      setShowCancelDialog(false);
      refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const rescheduleMutation = trpc.publicBooking.rescheduleBooking.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      setShowRescheduleDialog(false);
      setSelectedDate(undefined);
      setSelectedTime("");
      refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleCancel = () => {
    if (!token) return;
    cancelMutation.mutate({
      token,
      reason: cancellationReason || undefined,
    });
  };

  const handleReschedule = () => {
    if (!token || !selectedDate || !selectedTime) {
      toast.error(t("manageBooking.selectDateTimeError"));
      return;
    }

    // Ensure selectedTime is in HH:mm format
    const timeStr = selectedTime.substring(0, 5);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const newDateTime = new Date(`${dateStr}T${timeStr}:00`);

    if (isNaN(newDateTime.getTime())) {
      toast.error(t("manageBooking.invalidDateTime"));
      return;
    }

    if (newDateTime <= new Date()) {
      toast.error(t("manageBooking.timeMustBeFuture"));
      return;
    }

    rescheduleMutation.mutate({
      token,
      newDate: dateStr,
      newTime: timeStr,
    });
  };

  const handleRescheduleDialogOpen = () => {
    if (!booking?.canReschedule) {
      toast.error(t("manageBooking.cannotReschedule"), {
        description: t("manageBooking.cannotRescheduleDescription"),
      });
      return;
    }
    setShowRescheduleDialog(true);
  };

  const handleCancelDialogOpen = () => {
    if (!booking?.canCancel) {
      toast.error(t("manageBooking.cannotCancel"), {
        description: t("manageBooking.cannotCancelDescription"),
      });
      return;
    }
    setShowCancelDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t("manageBooking.loading")}</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <XCircle className="h-8 w-8" />
              <CardTitle>{t("manageBooking.notFoundTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("manageBooking.notFoundDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const appointmentDate = new Date(booking.startTime);
  const isCompleted = booking.status === "completed";
  const isCanceled = booking.status === "canceled";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("manageBooking.heading")}</h1>
          <p className="text-gray-600">
            {t("manageBooking.subtitle", { salon: booking.salonName })}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mb-6">
          {isCanceled && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{t("manageBooking.statusCanceled")}</span>
            </div>
          )}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{t("manageBooking.statusCompleted")}</span>
            </div>
          )}
          {!isCanceled && !isCompleted && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{t("manageBooking.statusConfirmed")}</span>
            </div>
          )}
        </div>

        {/* Booking Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("manageBooking.detailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t("manageBooking.dateTimeLabel")}</p>
                  <p className="font-medium">
                    {format(appointmentDate, "EEEE d. MMMM yyyy", {
                      locale: nb,
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t("manageBooking.timePrefix", { time: format(appointmentDate, "HH:mm") })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t("manageBooking.hairdresserLabel")}</p>
                  <p className="font-medium">{booking.employeeName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t("manageBooking.customerLabel")}</p>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-gray-600">{booking.customerPhone}</p>
                  {booking.customerEmail && (
                    <p className="text-sm text-gray-600">{booking.customerEmail}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t("manageBooking.salonLabel")}</p>
                  <p className="font-medium">{booking.salonName}</p>
                  {booking.salonAddress && (
                    <p className="text-sm text-gray-600">{booking.salonAddress}</p>
                  )}
                  {booking.salonPhone && (
                    <p className="text-sm text-gray-600">{booking.salonPhone}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">{t("manageBooking.servicesLabel")}</p>
              {booking.services.map((service: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center mb-1">
                  <span className="font-medium">{service.name}</span>
                  <span className="text-gray-600">
                    {formatKr(toGross(service.price))}{" "}
                    <span className="text-xs text-gray-500">{t("manageBooking.inclVat")}</span>
                  </span>
                </div>
              ))}

              <div className="flex justify-between items-center mt-3 pt-3 border-t font-bold">
                <span>
                  {t("manageBooking.total")}{" "}
                  <span className="text-xs font-normal text-gray-500">
                    {t("manageBooking.inclVat")}
                  </span>
                </span>
                <span>{formatKr(toGross(booking.totalPrice))}</span>
              </div>
            </div>

            {booking.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-1">{t("manageBooking.notesLabel")}</p>
                <p className="text-gray-700">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Policy */}
        {!isCanceled && !isCompleted && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <CardTitle className="text-blue-900">
                    {t("manageBooking.cancellationPolicyTitle")}
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    {t("manageBooking.cancellationPolicyDescription", { hours: booking.cancellationWindowHours })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Action Buttons */}
        {!isCanceled && !isCompleted && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleRescheduleDialogOpen}
              disabled={!booking.canReschedule}
              className="flex-1"
              variant="outline"
            >
              <Clock className="h-4 w-4 mr-2" />
              {t("manageBooking.rescheduleButton")}
            </Button>

            <Button
              onClick={handleCancelDialogOpen}
              disabled={!booking.canCancel}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t("manageBooking.cancelButton")}
            </Button>
          </div>
        )}

        {!booking.canCancel && !isCanceled && !isCompleted && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {t("manageBooking.noOnlineChangesNotice", { phone: booking.salonPhone })}
          </p>
        )}

        {/* Cancel Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("manageBooking.cancelDialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("manageBooking.cancelDialogQuestion")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("manageBooking.cancellationReasonLabel")}
                </label>
                <Textarea
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder={t("manageBooking.cancellationReasonPlaceholder")}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                {t("manageBooking.cancelDialogAbort")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending
                  ? t("manageBooking.canceling")
                  : t("manageBooking.confirmCancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("manageBooking.rescheduleDialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("manageBooking.rescheduleDialogDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("manageBooking.selectNewDate")}
                </label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={date => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  className="rounded-md border"
                  locale={nb}
                />
              </div>

              {selectedDate && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("manageBooking.selectNewTime")}
                  </label>

                  {filteredSlots.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {t("manageBooking.noAvailableSlots")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {filteredSlots.map((timeStr: string) => (
                        <Button
                          key={timeStr}
                          variant={selectedTime === timeStr ? "default" : "outline"}
                          onClick={() => setSelectedTime(timeStr)}
                          className="text-sm"
                        >
                          {timeStr}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRescheduleDialog(false);
                  setSelectedDate(undefined);
                  setSelectedTime("");
                }}
              >
                {t("manageBooking.rescheduleDialogAbort")}
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={!selectedDate || !selectedTime || rescheduleMutation.isPending}
              >
                {rescheduleMutation.isPending ? t("manageBooking.rescheduling") : t("manageBooking.confirmReschedule")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
