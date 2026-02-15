import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: user } = trpc.auth.me.useQuery();
  const { data: tenant } = trpc.tenants.getCurrent.useQuery(undefined, {
    enabled: !!user?.tenantId,
  });

  const clearImpersonation = trpc.saasAdmin.clearImpersonation.useMutation({
    onSuccess: async data => {
      // Clear all caches
      utils.invalidate();
      await utils.client.resetQueries();
      
      toast.success("Impersonasjon avsluttet");
      
      // Attempt to restore admin token if available
      const adminToken = localStorage.getItem("admin-token-backup");
      if (adminToken) {
        // Clear the backup
        localStorage.removeItem("admin-token-backup");
        // Set the admin cookie back
        document.cookie = `stylora-session=${adminToken}; path=/; max-age=2592000`; // 30 days
        
        // Reload to admin panel
        window.location.href = "/saas-admin";
      } else {
        // Force re-login - redirect to home
        window.location.href = data.redirectUrl;
      }
    },
    onError: error => {
      toast.error(`Feil ved avslutning: ${error.message}`);
    },
  });

  const handleExit = () => {
    if (confirm("Er du sikker på at du vil avslutte impersonasjon?")) {
      clearImpersonation.mutate();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-semibold text-sm">
              Impersonering: {tenant?.name || "Laster..."}
            </p>
            <p className="text-xs opacity-90">
              Du ser og endrer data som denne salongen. Alle handlinger lagres i revisjonsloggen.
            </p>
          </div>
        </div>
        <Button
          onClick={handleExit}
          disabled={clearImpersonation.isPending}
          variant="outline"
          size="sm"
          className="bg-white text-orange-600 hover:bg-gray-100 border-none"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {clearImpersonation.isPending ? "Avslutter..." : "Avslutt impersonasjon"}
        </Button>
      </div>
    </div>
  );
}
