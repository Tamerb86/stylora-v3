import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTranslation } from "react-i18next";

export default function Notifications() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<
    "all" | "pending" | "sent" | "delivered" | "failed"
  >("all");

  const {
    data: notifications,
    isLoading,
    refetch,
  } = trpc.notifications.list.useQuery({
    limit: 50,
    status: filter === "all" ? undefined : filter,
  });

  const triggerReminders = trpc.notifications.triggerReminders.useMutation({
    onSuccess: result => {
      toast.success(
        t("notifications.remindersSent", {
          sent: result.sent,
          failed: result.failed,
        })
      );
      refetch();
    },
    onError: error => {
      toast.error(
        t("notifications.remindersError", { message: error.message })
      );
    },
  });

  const getStatusBadge = (status: string | null) => {
    if (!status)
      return <Badge variant="outline">{t("notifications.statusUnknown")}</Badge>;
    switch (status) {
      case "sent":
      case "delivered":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("notifications.statusSent")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t("notifications.statusFailed")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {t("notifications.statusPending")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("no-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="w-8 h-8" />
              {t("notifications.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("notifications.subtitle")}
            </p>
          </div>
          <Button
            onClick={() => triggerReminders.mutate()}
            disabled={triggerReminders.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {triggerReminders.isPending
              ? t("notifications.sending")
              : t("notifications.sendRemindersNow")}
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("notifications.autoSmsTitle")}</CardTitle>
            <CardDescription>
              {t("notifications.autoSmsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                {t("notifications.filterAll")}
              </Button>
              <Button
                variant={filter === "sent" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("sent")}
              >
                {t("notifications.statusSent")}
              </Button>
              <Button
                variant={filter === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("failed")}
              >
                {t("notifications.statusFailed")}
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("pending")}
              >
                {t("notifications.statusPending")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t("notifications.loading")}
            </CardContent>
          </Card>
        ) : !notifications || notifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("notifications.empty")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map(notification => (
              <Card key={notification.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(notification.status)}
                        <span className="text-sm text-muted-foreground">
                          {notification.notificationType.toUpperCase()}
                        </span>
                        {notification.template != null && (
                          <Badge variant="outline" className="text-xs">
                            {notification.template}
                          </Badge>
                        )}
                      </div>
                      <div className="mb-2">
                        {notification.subject && (
                          <p className="font-medium">{notification.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {t("notifications.recipientLabel")}{" "}
                          {notification.recipientContact}
                        </p>
                      </div>
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {notification.content}
                      </p>
                      {notification.errorMessage && (
                        <p className="text-sm text-destructive mt-2">
                          {t("notifications.errorLabel")}{" "}
                          {notification.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground ml-4">
                      <p>
                        {t("notifications.scheduledLabel")}{" "}
                        {formatDate(notification.scheduledAt)}
                      </p>
                      {notification.sentAt && (
                        <p>
                          {t("notifications.sentLabel")}{" "}
                          {formatDate(notification.sentAt)}
                        </p>
                      )}
                      {notification.attempts != null &&
                        notification.attempts > 0 && (
                          <p className="mt-1">
                            {t("notifications.attemptsLabel")}{" "}
                            {notification.attempts}/{notification.maxAttempts}
                          </p>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
