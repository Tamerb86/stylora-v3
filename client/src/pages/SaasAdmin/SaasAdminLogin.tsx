import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function SaasAdminLogin() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is platform owner by checking tenantId
  // Platform owner has tenantId = "platform-admin-tenant"
  const isPlatformOwner = user && user.tenantId === "platform-admin-tenant";

  useEffect(() => {
    // If user is logged in and is platform owner, redirect to /saas-admin
    if (user && isPlatformOwner) {
      setLocation("/saas-admin");
    }
  }, [user, setLocation, isPlatformOwner]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t("saasAdminLogin.fillEmailAndPassword"));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error(t("saasAdminLogin.invalidEmailFormat"));
      return;
    }

    // Validate password length
    if (password.length < 6) {
      toast.error(t("saasAdminLogin.passwordTooShort"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(t("saasAdminLogin.loggedIn"));
        await refetch();
        // Check if user is platform owner after login
        setTimeout(() => {
          window.location.href = "/saas-admin";
        }, 500);
      } else {
        // Provide more specific error messages
        if (response.status === 401) {
          toast.error(t("saasAdminLogin.invalidCredentials"));
        } else if (response.status === 403) {
          toast.error(data.error || t("saasAdminLogin.accountDeactivated"));
        } else if (response.status === 500) {
          toast.error(t("saasAdminLogin.serverError"));
        } else {
          toast.error(data.error || t("saasAdminLogin.loginFailed"));
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("saasAdminLogin.networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">{t("saasAdminLogin.loading")}</p>
        </div>
      </div>
    );
  }

  // If logged in but not platform owner, show access denied
  const showAccessDenied = user && !isPlatformOwner;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 mb-4 shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Stylora
          </h1>
          <p className="text-xl font-semibold text-gray-700">Platform Admin</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200">
          {showAccessDenied ? (
            // Access Denied Message
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("saasAdminLogin.noAccessTitle")}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("saasAdminLogin.noAccessDescription")}
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  className="w-full"
                >
                  {t("saasAdminLogin.goToHome")}
                </Button>
                <Button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/saas-admin/login";
                  }}
                  variant="ghost"
                  className="w-full text-gray-600"
                >
                  {t("saasAdminLogin.logout")}
                </Button>
              </div>
            </div>
          ) : (
            // Login Form
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                {t("saasAdminLogin.welcomeBack")}
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                {t("saasAdminLogin.loginSubtitle")}
              </p>

              <div className="space-y-2">
                <Label htmlFor="email">{t("saasAdminLogin.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("saasAdminLogin.passwordLabel")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t("saasAdminLogin.loggingIn")}
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    {t("saasAdminLogin.loginAsOwner")}
                  </>
                )}
              </Button>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  {t("saasAdminLogin.ownerOnlyNote")}
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            {t("saasAdminLogin.secureLoginNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
