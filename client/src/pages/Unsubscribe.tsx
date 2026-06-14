import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, Loader2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Unsubscribe() {
  const { t } = useTranslation();
  const [params, setParams] = useState<{
    tenantId: string;
    customerId: number;
    token: string;
    channel: "sms" | "email" | "all";
  } | null>(null);

  const unsubscribe = trpc.publicBooking.unsubscribe.useMutation();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const tenantId = q.get("tenantId");
    const customerId = q.get("customerId");
    const token = q.get("token");
    const channelRaw = q.get("channel");
    const channel =
      channelRaw === "sms" || channelRaw === "email" ? channelRaw : "all";
    if (tenantId && customerId && token) {
      const parsed = {
        tenantId,
        customerId: parseInt(customerId, 10),
        token,
        channel: channel as "sms" | "email" | "all",
      };
      setParams(parsed);
      unsubscribe.mutate(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderBody = () => {
    if (!params) {
      return (
        <>
          <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-700">{t("unsubscribe.invalidLink")}</p>
        </>
      );
    }
    if (unsubscribe.isPending) {
      return (
        <>
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-[#ff6b35] mb-4" />
          <p className="text-gray-600">{t("unsubscribe.processing")}</p>
        </>
      );
    }
    if (unsubscribe.isError) {
      return (
        <>
          <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-700">{t("unsubscribe.failed")}</p>
        </>
      );
    }
    return (
      <>
        <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("unsubscribe.successTitle")}
        </h1>
        <p className="text-gray-600">{t("unsubscribe.successDescription")}</p>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md">
        {renderBody()}
        <Link href="/">
          <Button variant="outline" className="mt-6">
            <Home className="w-4 h-4 mr-2" />
            {t("unsubscribe.backToHome")}
          </Button>
        </Link>
      </Card>
    </div>
  );
}
