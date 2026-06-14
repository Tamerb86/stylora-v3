import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  CheckCircle,
  ExternalLink,
  Settings,
  Zap,
  AlertCircle,
  ArrowRight,
  FileText,
  RefreshCw,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface AccountingProvider {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: "connected" | "available" | "coming_soon";
  features: string[];
  settingsPath?: string;
  website: string;
  popular?: boolean;
}

const accountingProviders: AccountingProvider[] = [
  {
    id: "unimicro",
    name: "Unimicro",
    description:
      "Komplett regnskapssystem for små og mellomstore bedrifter. Automatisk synkronisering av kunder, fakturaer og betalinger.",
    logo: "🏢",
    status: "available",
    features: [
      "Automatisk kundesynkronisering",
      "Fakturering direkte fra Stylora",
      "Betalingsoppfølging",
      "MVA-rapportering",
    ],
    settingsPath: "/unimicro",
    website: "https://unimicro.no",
    popular: true,
  },
  {
    id: "fiken",
    name: "Fiken",
    description:
      "Norges mest populære regnskapsprogram for små bedrifter. Enkelt og brukervennlig med automatisk bokføring.",
    logo: "📊",
    status: "available",
    features: [
      "Automatisk bokføring",
      "Fakturering",
      "Bankavstemming",
      "Årsoppgjør",
    ],
    settingsPath: "/fiken",
    website: "https://fiken.no",
    popular: true,
  },
  {
    id: "visma",
    name: "Visma eAccounting",
    description:
      "Skybasert regnskapsprogram fra Visma. Perfekt for bedrifter som ønsker fleksibilitet og mobilitet.",
    logo: "💼",
    status: "coming_soon",
    features: [
      "Skybasert løsning",
      "Mobil-app",
      "Automatisk bankimport",
      "Integrasjon med Visma-produkter",
    ],
    website: "https://visma.no/eaccounting",
  },
  {
    id: "tripletex",
    name: "Tripletex",
    description:
      "Komplett ERP-system med regnskap, prosjektstyring og timeføring. Ideelt for voksende bedrifter.",
    logo: "📈",
    status: "coming_soon",
    features: ["Prosjektstyring", "Timeføring", "Fakturering", "Rapportering"],
    website: "https://tripletex.no",
  },
  {
    id: "dnb",
    name: "DNB Regnskap",
    description:
      "Regnskapsløsning fra DNB med direkte bankintegrasjon. Sømløs kobling til din DNB-konto.",
    logo: "🏦",
    status: "coming_soon",
    features: [
      "Direkte bankintegrasjon",
      "Automatisk bokføring",
      "Fakturering",
      "Betalingsløsninger",
    ],
    website: "https://dnb.no/bedrift/regnskap",
  },
  {
    id: "sparebank1",
    name: "SpareBank 1 Regnskap",
    description:
      "Regnskapsprogram fra SpareBank 1 med enkel bankkobling og automatisk avstemming.",
    logo: "🔴",
    status: "coming_soon",
    features: [
      "Bankintegrasjon",
      "Automatisk avstemming",
      "Fakturering",
      "Lønn og personal",
    ],
    website: "https://sparebank1.no/bedrift",
  },
  {
    id: "poweroffice",
    name: "PowerOffice Go",
    description:
      "Moderne skybasert regnskapssystem med fokus på automatisering og brukervennlighet.",
    logo: "⚡",
    status: "coming_soon",
    features: [
      "Automatisk bokføring",
      "AI-drevet kategorisering",
      "Fakturering",
      "Rapportering",
    ],
    website: "https://poweroffice.no",
  },
  {
    id: "24sevenoffice",
    name: "24SevenOffice",
    description:
      "Alt-i-ett forretningssystem med regnskap, CRM og prosjektstyring i én løsning.",
    logo: "🌐",
    status: "coming_soon",
    features: [
      "CRM-integrasjon",
      "Prosjektstyring",
      "Fakturering",
      "Dokumenthåndtering",
    ],
    website: "https://24sevenoffice.com",
  },
];

export default function AccountingIntegrations() {
  const { t } = useTranslation();
  const [selectedProvider, setSelectedProvider] =
    useState<AccountingProvider | null>(null);
  const [infoDialog, setInfoDialog] = useState(false);

  const connectedProviders = accountingProviders.filter(
    p => p.status === "connected"
  );
  const availableProviders = accountingProviders.filter(
    p => p.status === "available"
  );
  const comingSoonProviders = accountingProviders.filter(
    p => p.status === "coming_soon"
  );

  const handleConnect = (provider: AccountingProvider) => {
    if (provider.settingsPath) {
      window.location.href = provider.settingsPath;
    } else {
      setSelectedProvider(provider);
      setInfoDialog(true);
    }
  };

  const handleRequestIntegration = () => {
    toast.success(t("accountingIntegrations.toastRequestSent"));
    setInfoDialog(false);
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        {
          label: t("accountingIntegrations.breadcrumbDashboard"),
          href: "/dashboard",
        },
        { label: t("accountingIntegrations.breadcrumbIntegrations") },
      ]}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t("accountingIntegrations.headerTitle")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("accountingIntegrations.headerSubtitle")}
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {t("accountingIntegrations.whyConnect")}
              </h3>
              <div className="grid gap-3 mt-3 md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {t("accountingIntegrations.benefitAutoInvoicing")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {t("accountingIntegrations.benefitSyncedCustomers")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {t("accountingIntegrations.benefitSaveTime")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {t("accountingIntegrations.benefitFewerErrors")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {t("accountingIntegrations.benefitVatReporting")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    {t("accountingIntegrations.benefitBetterOverview")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Connected Providers */}
        {connectedProviders.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {t("accountingIntegrations.connectedTitle")}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connectedProviders.map(provider => (
                <Card
                  key={provider.id}
                  className="p-6 border-0 shadow-lg border-l-4 border-l-green-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{provider.logo}</span>
                      <div>
                        <h3 className="font-semibold">{provider.name}</h3>
                        <Badge variant="default" className="bg-green-500 mt-1">
                          {t("accountingIntegrations.statusConnected")}
                        </Badge>
                      </div>
                    </div>
                    <Link href={provider.settingsPath || "#"}>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        {t("accountingIntegrations.settings")}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Providers */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            {t("accountingIntegrations.availableTitle")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {availableProviders.map(provider => (
              <Card
                key={provider.id}
                className="p-6 border-0 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{provider.logo}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      {provider.popular && (
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-700"
                        >
                          {t("accountingIntegrations.popular")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {provider.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {provider.features.slice(0, 3).map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        onClick={() => handleConnect(provider)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {t("accountingIntegrations.connect")}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                      <a
                        href={provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Coming Soon Providers */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-gray-500" />
            {t("accountingIntegrations.comingSoonTitle")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {comingSoonProviders.map(provider => (
              <Card
                key={provider.id}
                className="p-6 border-0 shadow-lg opacity-80"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl grayscale">{provider.logo}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{provider.name}</h3>
                      <Badge variant="secondary">
                        {t("accountingIntegrations.comingSoonBadge")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {provider.description}
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProvider(provider);
                          setInfoDialog(true);
                        }}
                      >
                        {t("accountingIntegrations.notifyMe")}
                      </Button>
                      <a
                        href={provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Security Note */}
        <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {t("accountingIntegrations.securityTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("accountingIntegrations.securityText")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Dialog */}
      <Dialog open={infoDialog} onOpenChange={setInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedProvider?.logo}</span>
              {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider?.status === "coming_soon"
                ? t("accountingIntegrations.dialogComingSoonDesc")
                : selectedProvider?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">
                  {t("accountingIntegrations.featuresLabel")}
                </h4>
                <ul className="space-y-1">
                  {selectedProvider.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoDialog(false)}>
              {t("accountingIntegrations.close")}
            </Button>
            {selectedProvider?.status === "coming_soon" ? (
              <Button onClick={handleRequestIntegration}>
                {t("accountingIntegrations.notifyWhenReady")}
              </Button>
            ) : (
              <a
                href={selectedProvider?.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>
                  {t("accountingIntegrations.visit", {
                    name: selectedProvider?.name,
                  })}
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
