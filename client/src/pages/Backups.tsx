import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
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
  Database,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function Backups() {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);

  const { data: backups, refetch } = trpc.backups.list.useQuery();
  const createBackup = trpc.backups.create.useMutation({
    onSuccess: data => {
      toast.success(t("backups.toast.created"));
      setIsCreating(false);
      refetch();

      // Auto-download the backup
      if (data.sqlContent) {
        downloadBackupFile(data.sqlContent, data.fileName);
      }
    },
    onError: error => {
      toast.error(error.message || t("backups.toast.createFailed"));
      setIsCreating(false);
    },
  });

  const deleteBackup = trpc.backups.delete.useMutation({
    onSuccess: () => {
      toast.success(t("backups.toast.deleted"));
      refetch();
    },
    onError: error => {
      toast.error(error.message || t("backups.toast.deleteFailed"));
    },
  });

  const handleCreateBackup = () => {
    if (
      confirm(t("backups.confirmCreate"))
    ) {
      setIsCreating(true);
      createBackup.mutate();
    }
  };

  const handleDelete = (id: number, createdAt: Date) => {
    const dateStr = format(new Date(createdAt), "PPP 'kl.' HH:mm", {
      locale: nb,
    });
    if (
      confirm(t("backups.confirmDelete", { date: dateStr }))
    ) {
      deleteBackup.mutate({ id });
    }
  };

  const downloadBackupFile = (sqlContent: string, fileName: string) => {
    const blob = new Blob([sqlContent], { type: "application/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadBackupMutation = trpc.backups.download.useQuery(
    { id: 0 },
    { enabled: false }
  );

  const handleDownload = async (backupId: number) => {
    try {
      toast.info(t("backups.toast.generating"));
      const utils = trpc.useUtils();
      const result = await utils.backups.download.fetch({ id: backupId });
      if (result?.sqlContent) {
        const fileName = `backup-${backupId}-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
        downloadBackupFile(result.sqlContent, fileName);
        toast.success(t("backups.toast.downloaded"));
      }
    } catch (error: any) {
      toast.error(error.message || t("backups.toast.downloadFailed"));
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return t("backups.unknownSize");
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {t("backups.status.completed")}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {t("backups.status.failed")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-4 w-4" />
            {t("backups.status.inProgress")}
          </span>
        );
    }
  };

  const completedBackups = backups?.filter(b => b.status === "completed") || [];
  const totalSize = completedBackups.reduce(
    (sum, b) => sum + (Number(b.fileSize) || 0),
    0
  );

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">{t("backups.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("backups.subtitle")}
            </p>
          </div>
          <Button
            size="lg"
            className="h-14 gap-2"
            onClick={handleCreateBackup}
            disabled={isCreating || createBackup.isPending}
          >
            <Database className="h-5 w-5" />
            {isCreating || createBackup.isPending
              ? t("backups.creating")
              : t("backups.createButton")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("backups.totalCount")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {completedBackups.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("backups.completedBackups")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("backups.totalSize")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatFileSize(totalSize)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("backups.storageUsed")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("backups.lastBackup")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {completedBackups.length > 0
                  ? format(new Date(completedBackups[0].createdAt), "PPP", {
                      locale: nb,
                    })
                  : t("backups.none")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedBackups.length > 0
                  ? format(new Date(completedBackups[0].createdAt), "HH:mm", {
                      locale: nb,
                    })
                  : t("backups.createFirst")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-2">
                  {t("backups.info.heading")}
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>{t("backups.info.point1")}</li>
                  <li>{t("backups.info.point2")}</li>
                  <li>{t("backups.info.point3")}</li>
                  <li>{t("backups.info.point4")}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backups List */}
        <Card>
          <CardHeader>
            <CardTitle>{t("backups.availableTitle")}</CardTitle>
            <CardDescription>
              {t("backups.availableDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!backups || backups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{t("backups.emptyTitle")}</p>
                <p className="text-sm mt-2">
                  {t("backups.emptyHint")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup: any) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Database className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">
                          {format(
                            new Date(backup.createdAt),
                            "PPP 'kl.' HH:mm",
                            { locale: nb }
                          )}
                        </span>
                        {getStatusBadge(backup.status)}
                        {backup.backupType === "manual" && (
                          <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            {t("backups.manual")}
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {t("backups.sizeLabel")}: {formatFileSize(backup.fileSize)}
                      </div>

                      {backup.status === "failed" && backup.errorMessage && (
                        <div className="text-sm mt-2 text-red-600 dark:text-red-400">
                          {t("backups.errorLabel")}: {backup.errorMessage}
                        </div>
                      )}

                      {backup.status === "completed" && backup.fileKey && (
                        <div className="text-xs mt-2 text-muted-foreground font-mono truncate max-w-md">
                          {backup.fileKey}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-6">
                      {backup.status === "completed" && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => handleDownload(backup.id)}
                          title={t("backups.downloadTitle")}
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() =>
                          handleDelete(backup.id, backup.createdAt)
                        }
                        disabled={deleteBackup.isPending}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
