import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface QueryErrorProps {
  /** Optional retry handler — usually the query's `refetch`. */
  onRetry?: () => void;
  /** Optional override message. */
  message?: string;
  className?: string;
}

/**
 * Shared empty/error state for failed tRPC queries. Without this a failed query
 * renders the same "no data" UI as an empty result, hiding real backend/network
 * failures from the user.
 */
export function QueryError({ onRetry, message, className }: QueryErrorProps) {
  const { t } = useTranslation();
  return (
    <div
      className={
        "flex flex-col items-center justify-center text-center py-12 px-4 text-muted-foreground " +
        (className || "")
      }
    >
      <AlertTriangle className="h-10 w-10 mb-3 text-destructive opacity-80" />
      <p className="mb-4">{message || t("common.loadError")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export default QueryError;
