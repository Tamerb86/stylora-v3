import { useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  CreditCard,
  Banknote,
  Smartphone,
  Settings,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Wifi,
  Monitor,
} from "lucide-react";

type ProviderType =
  | "stripe_terminal"
  | "vipps"
  | "nets"
  | "manual_card"
  | "cash"
  | "generic";

interface ProviderConfig {
  // Stripe Terminal
  apiKey?: string;
  terminalId?: string;

  // Vipps
  merchantSerialNumber?: string;
  clientId?: string;
  clientSecret?: string;

  // Nets/BankAxept
  merchantId?: string;
  accountNumber?: string;

  // Generic
  [key: string]: any;
}

export default function PaymentProviders() {
  const { t } = useTranslation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [providerType, setProviderType] = useState<ProviderType>("cash");
  const [providerName, setProviderName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [config, setConfig] = useState<ProviderConfig>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const { data: providers, refetch } =
    trpc.paymentTerminal.listProviders.useQuery();
  const addProvider = trpc.paymentTerminal.addProvider.useMutation();
  const updateProvider = trpc.paymentTerminal.updateProvider.useMutation();
  const deleteProvider = trpc.paymentTerminal.deleteProvider.useMutation();
  const testConnection = trpc.paymentTerminal.testConnection.useMutation();

  // Stripe Connect status
  const { data: stripeConnectStatus, refetch: refetchStripeStatus } =
    trpc.stripeConnect?.getStatus?.useQuery?.() ?? { data: null, refetch: () => {} };

  const handleAddProvider = async () => {
    if (!providerName.trim()) {
      toast.error(t("paymentProviders.errorNameRequired"));
      return;
    }

    try {
      await addProvider.mutateAsync({
        providerType,
        providerName,
        config: Object.keys(config).length > 0 ? config : undefined,
        isDefault,
      });

      toast.success(t("paymentProviders.terminalAdded"));
      resetForm();
      setIsAddDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(t("paymentProviders.errorWithMessage", { message: error.message }));
    }
  };

  const handleUpdateProvider = async () => {
    if (!editingProvider) return;

    try {
      await updateProvider.mutateAsync({
        providerId: editingProvider.id,
        providerName,
        config: Object.keys(config).length > 0 ? config : undefined,
        isDefault,
      });

      toast.success(t("paymentProviders.terminalUpdated"));
      resetForm();
      setIsEditDialogOpen(false);
      setEditingProvider(null);
      refetch();
    } catch (error: any) {
      toast.error(t("paymentProviders.errorWithMessage", { message: error.message }));
    }
  };

  const handleDeleteProvider = async (
    providerId: number,
    providerName: string
  ) => {
    if (!confirm(t("paymentProviders.confirmDelete", { name: providerName }))) {
      return;
    }

    try {
      await deleteProvider.mutateAsync({ providerId });
      toast.success(t("paymentProviders.terminalDeleted"));
      refetch();
    } catch (error: any) {
      toast.error(t("paymentProviders.errorWithMessage", { message: error.message }));
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testConnection.mutateAsync({
        providerType,
        config,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(`Feil: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const openEditDialog = (provider: any) => {
    setEditingProvider(provider);
    setProviderType(provider.providerType);
    setProviderName(provider.providerName);
    setIsDefault(provider.isDefault);
    setConfig(provider.config || {});
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setProviderName("");
    setProviderType("cash");
    setIsDefault(false);
    setConfig({});
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "cash":
        return <Banknote className="h-5 w-5" />;
      case "stripe_terminal":
      case "manual_card":
        return <CreditCard className="h-5 w-5" />;
      case "vipps":
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const getProviderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stripe_terminal: "Stripe Terminal",
      vipps: "Vipps",
      nets: "Nets/BankAxept",
      manual_card: t("paymentProviders.typeManualCard"),
      cash: t("paymentProviders.typeCash"),
      generic: t("paymentProviders.typeGeneric"),
    };
    return labels[type] || type;
  };

  const renderConfigFields = () => {
    switch (providerType) {
      case "stripe_terminal":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk_test_..."
                value={config.apiKey || ""}
                onChange={e => setConfig({ ...config, apiKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terminalId">{t("paymentProviders.terminalIdOptional")}</Label>
              <Input
                id="terminalId"
                placeholder="tmr_..."
                value={config.terminalId || ""}
                onChange={e =>
                  setConfig({ ...config, terminalId: e.target.value })
                }
              />
            </div>
          </>
        );

      case "vipps":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="merchantSerialNumber">
                Merchant Serial Number *
              </Label>
              <Input
                id="merchantSerialNumber"
                placeholder="123456"
                value={config.merchantSerialNumber || ""}
                onChange={e =>
                  setConfig({ ...config, merchantSerialNumber: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={config.clientId || ""}
                onChange={e =>
                  setConfig({ ...config, clientId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret *</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="••••••••"
                value={config.clientSecret || ""}
                onChange={e =>
                  setConfig({ ...config, clientSecret: e.target.value })
                }
              />
            </div>
          </>
        );

      case "nets":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="terminalId">Terminal ID *</Label>
              <Input
                id="terminalId"
                placeholder="12345678"
                value={config.terminalId || ""}
                onChange={e =>
                  setConfig({ ...config, terminalId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchantId">Merchant ID *</Label>
              <Input
                id="merchantId"
                placeholder="987654321"
                value={config.merchantId || ""}
                onChange={e =>
                  setConfig({ ...config, merchantId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">{t("paymentProviders.accountNumberOptional")}</Label>
              <Input
                id="accountNumber"
                placeholder="1234.56.78910"
                value={config.accountNumber || ""}
                onChange={e =>
                  setConfig({ ...config, accountNumber: e.target.value })
                }
              />
            </div>
          </>
        );

      case "cash":
      case "manual_card":
        return (
          <p className="text-sm text-muted-foreground">
            {t("paymentProviders.noExtraConfig")}
          </p>
        );

      default:
        return null;
    }
  };

  const ConfigDialog = ({ isOpen, onClose, onSave, title }: any) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t("paymentProviders.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="providerType">{t("paymentProviders.typeLabel")}</Label>
            <Select
              value={providerType}
              onValueChange={(value: any) => {
                setProviderType(value);
                setConfig({}); // Reset config when type changes
              }}
              disabled={!!editingProvider}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("paymentProviders.typeCash")}</SelectItem>
                <SelectItem value="stripe_terminal">Stripe Terminal</SelectItem>
                <SelectItem value="vipps">Vipps</SelectItem>
                <SelectItem value="nets">Nets/BankAxept</SelectItem>
                <SelectItem value="manual_card">
                  {t("paymentProviders.typeManualCard")}
                </SelectItem>
                <SelectItem value="generic">{t("paymentProviders.typeGeneric")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="providerName">{t("paymentProviders.nameLabel")}</Label>
            <Input
              id="providerName"
              placeholder={t("paymentProviders.namePlaceholder")}
              value={providerName}
              onChange={e => setProviderName(e.target.value)}
            />
          </div>

          {renderConfigFields()}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isDefault" className="cursor-pointer">
              {t("paymentProviders.setAsDefault")}
            </Label>
          </div>

          {providerType !== "cash" && providerType !== "manual_card" && (
            <Button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              variant="outline"
              className="w-full"
            >
              {isTestingConnection ? t("paymentProviders.testingConnection") : t("paymentProviders.testConnection")}
            </Button>
          )}

          <Button
            onClick={onSave}
            disabled={addProvider.isPending || updateProvider.isPending}
            className="w-full"
          >
            {addProvider.isPending || updateProvider.isPending
              ? t("paymentProviders.saving")
              : t("paymentProviders.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t("paymentProviders.title")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("paymentProviders.subtitle")}
            </p>
          </div>

          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("paymentProviders.addTerminal")}
          </Button>
        </div>

        {/* Stripe Terminal Setup Guide */}
        <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Stripe Terminal</CardTitle>
                  <CardDescription>
                    {t("paymentProviders.stripeCardDescription")}
                  </CardDescription>
                </div>
              </div>
              {stripeConnectStatus?.connected && (
                <Badge
                  variant="default"
                  className="bg-green-500 text-white px-4 py-2"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("paymentProviders.stripeConnected")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Setup Guide Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="setup-guide" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold">{t("paymentProviders.setupGuideTitle")}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{t("paymentProviders.step1Title")}</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {t("paymentProviders.step1Before")} <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium">stripe.com</a> {t("paymentProviders.step1After")}
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{t("paymentProviders.step2Title")}</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {t("paymentProviders.step2Before")} <strong>Terminal</strong> {t("paymentProviders.step2After")}
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{t("paymentProviders.step3Title")}</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {t("paymentProviders.step3Text")}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="bg-white border rounded-lg p-3 flex items-start gap-3">
                            <Wifi className="h-5 w-5 text-purple-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">BBPOS WisePOS E</p>
                              <p className="text-xs text-gray-500">{t("paymentProviders.readerWisePosDesc")}</p>
                            </div>
                          </div>
                          <div className="bg-white border rounded-lg p-3 flex items-start gap-3">
                            <Monitor className="h-5 w-5 text-purple-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">Stripe Reader M2</p>
                              <p className="text-xs text-gray-500">{t("paymentProviders.readerM2Desc")}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{t("paymentProviders.step4Title")}</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {t("paymentProviders.step4Before")} <strong>Terminal → Readers</strong>{t("paymentProviders.step4Middle")} <code className="bg-gray-100 px-1 rounded">tmr_</code>{t("paymentProviders.step4After")}
                        </p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                        5
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{t("paymentProviders.step5Title")}</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {t("paymentProviders.step5Text")}
                        </p>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                          <li><strong>API Key:</strong> {t("paymentProviders.step5ApiKey")}</li>
                          <li><strong>Terminal ID:</strong> {t("paymentProviders.step5TerminalId")}</li>
                        </ul>
                      </div>
                    </div>

                    {/* Help Link */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                      <div className="flex items-start gap-3">
                        <ExternalLink className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-purple-900">{t("paymentProviders.needMoreHelp")}</p>
                          <p className="text-sm text-purple-700 mt-1">
                            {t("paymentProviders.readOfficialGuide")}{" "}
                            <a 
                              href="https://stripe.com/docs/terminal" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:text-purple-900"
                            >
                              stripe.com/docs/terminal
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Quick Action Button */}
            <Button
              onClick={() => {
                setProviderType("stripe_terminal");
                setProviderName("Stripe Terminal");
                setIsAddDialogOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("paymentProviders.addStripeTerminal")}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Terminals */}
        <div className="grid gap-4">
          {!providers || providers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t("paymentProviders.emptyState")}
              </CardContent>
            </Card>
          ) : (
            providers.map(provider => (
              <Card key={provider.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getProviderIcon(provider.providerType)}
                      <div>
                        <CardTitle>{provider.providerName}</CardTitle>
                        <CardDescription>
                          {getProviderTypeLabel(provider.providerType)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      {provider.isDefault && (
                        <Badge variant="secondary">{t("paymentProviders.badgeDefault")}</Badge>
                      )}
                      {provider.isActive ? (
                        <Badge variant="default">{t("paymentProviders.badgeActive")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("paymentProviders.badgeInactive")}</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(provider)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDeleteProvider(
                            provider.id,
                            provider.providerName
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {provider.config &&
                typeof provider.config === "object" &&
                Object.keys(provider.config).length > 0 ? (
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <strong>{t("paymentProviders.configuredLabel")}</strong>{" "}
                      {t("paymentProviders.configuredFields", {
                        count: Object.keys(
                          provider.config as Record<string, any>
                        ).filter(
                          k => (provider.config as Record<string, any>)[k]
                        ).length,
                      })}
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            ))
          )}
        </div>

        <ConfigDialog
          isOpen={isAddDialogOpen}
          onClose={() => {
            setIsAddDialogOpen(false);
            resetForm();
          }}
          onSave={handleAddProvider}
          title={t("paymentProviders.addDialogTitle")}
        />

        <ConfigDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingProvider(null);
            resetForm();
          }}
          onSave={handleUpdateProvider}
          title={t("paymentProviders.editDialogTitle")}
        />
      </div>
    </DashboardLayout>
  );
}
