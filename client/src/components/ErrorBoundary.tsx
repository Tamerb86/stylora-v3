import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";
import i18n from "@/i18n/config";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Report so client crashes are visible (Sentry if wired, else console).
    console.error("[ErrorBoundary]", error, info.componentStack);
    const sentry = (window as unknown as { Sentry?: { captureException?: (e: unknown) => void } }).Sentry;
    sentry?.captureException?.(error);
  }

  render() {
    if (this.state.hasError) {
      // Only expose the raw stack in development — never leak internal paths to
      // end users in production.
      const isDev = import.meta.env.DEV;
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-2">
              {i18n.t("errorBoundary.title", "Noe gikk galt")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              {i18n.t(
                "errorBoundary.description",
                "En uventet feil oppstod. Last inn siden på nytt for å fortsette."
              )}
            </p>

            {isDev && this.state.error?.stack && (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
                <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              {i18n.t("errorBoundary.reload", "Last inn på nytt")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
