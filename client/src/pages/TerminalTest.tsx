import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  CreditCard, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Play,
  AlertTriangle,
  Settings,
  Terminal as TerminalIcon,
  Zap
} from "lucide-react";
import { useStripeTerminal } from "@/contexts/StripeTerminalContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Reader } from "@stripe/terminal-js";
import { useTranslation } from "react-i18next";

interface TestResult {
  name: string;
  status: "pending" | "running" | "success" | "error";
  message?: string;
  duration?: number;
}

export default function TerminalTest() {
  const { t } = useTranslation();
  const {
    terminal,
    connectedReader,
    isInitialized,
    isConnecting,
    discoverReaders,
    connectReader,
    disconnectReader,
    processPayment,
  } = useStripeTerminal();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [discoveredReaders, setDiscoveredReaders] = useState<Reader[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [testAmount, setTestAmount] = useState("10.00");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Check Stripe connection
  const { data: stripeStatus } = trpc.stripeConnect.getStatus.useQuery();
  const { data: paymentSettings } = trpc.paymentSettings.get.useQuery();

  // Update test result
  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTestResults(prev => 
      prev.map(t => t.name === name ? { ...t, ...updates } : t)
    );
  };

  // Run all diagnostic tests
  const runDiagnostics = async () => {
    setIsRunningTests(true);
    
    const tests: TestResult[] = [
      { name: "Stripe-tilkobling", status: "pending" },
      { name: "Stripe Terminal SDK", status: "pending" },
      { name: "Terminal initialisering", status: "pending" },
      { name: "API-nøkkel konfigurasjon", status: "pending" },
      { name: "Kortleser-søk", status: "pending" },
    ];
    
    setTestResults(tests);

    // Test 1: Stripe Connection
    updateTest("Stripe-tilkobling", { status: "running" });
    const start1 = Date.now();
    try {
      if (stripeStatus?.connected) {
        updateTest("Stripe-tilkobling", {
          status: "success",
          message: t("terminalTest.connectedTo", { accountId: stripeStatus.accountId }),
          duration: Date.now() - start1
        });
      } else {
        updateTest("Stripe-tilkobling", {
          status: "error",
          message: t("terminalTest.stripeNotConnected"),
          duration: Date.now() - start1
        });
      }
    } catch (error: any) {
      updateTest("Stripe-tilkobling", { 
        status: "error", 
        message: error.message,
        duration: Date.now() - start1
      });
    }

    // Test 2: Stripe Terminal SDK
    updateTest("Stripe Terminal SDK", { status: "running" });
    const start2 = Date.now();
    try {
      if (typeof window !== "undefined" && (window as any).StripeTerminal) {
        updateTest("Stripe Terminal SDK", {
          status: "success",
          message: t("terminalTest.sdkLoadedCorrectly"),
          duration: Date.now() - start2
        });
      } else {
        updateTest("Stripe Terminal SDK", {
          status: "error",
          message: t("terminalTest.sdkNotLoaded"),
          duration: Date.now() - start2
        });
      }
    } catch (error: any) {
      updateTest("Stripe Terminal SDK", { 
        status: "error", 
        message: error.message,
        duration: Date.now() - start2
      });
    }

    // Test 3: Terminal Initialization
    updateTest("Terminal initialisering", { status: "running" });
    const start3 = Date.now();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for init
    if (isInitialized && terminal) {
      updateTest("Terminal initialisering", {
        status: "success",
        message: t("terminalTest.terminalReady"),
        duration: Date.now() - start3
      });
    } else {
      updateTest("Terminal initialisering", {
        status: "error",
        message: t("terminalTest.terminalNotInitialized"),
        duration: Date.now() - start3
      });
    }

    // Test 4: API Key Configuration
    updateTest("API-nøkkel konfigurasjon", { status: "running" });
    const start4 = Date.now();
    try {
      if ((paymentSettings as any)?.stripePublishableKey || stripeStatus?.connected) {
        updateTest("API-nøkkel konfigurasjon", {
          status: "success",
          message: t("terminalTest.apiKeysConfigured"),
          duration: Date.now() - start4
        });
      } else {
        updateTest("API-nøkkel konfigurasjon", {
          status: "error",
          message: t("terminalTest.apiKeysMissing"),
          duration: Date.now() - start4
        });
      }
    } catch (error: any) {
      updateTest("API-nøkkel konfigurasjon", { 
        status: "error", 
        message: error.message,
        duration: Date.now() - start4
      });
    }

    // Test 5: Reader Discovery
    updateTest("Kortleser-søk", { status: "running" });
    const start5 = Date.now();
    try {
      if (terminal) {
        const readers = await discoverReaders();
        if (readers.length > 0) {
          updateTest("Kortleser-søk", {
            status: "success",
            message: t("terminalTest.foundReaders", { count: readers.length }),
            duration: Date.now() - start5
          });
          setDiscoveredReaders(readers);
        } else {
          updateTest("Kortleser-søk", {
            status: "error",
            message: t("terminalTest.noReadersFound"),
            duration: Date.now() - start5
          });
        }
      } else {
        updateTest("Kortleser-søk", {
          status: "error",
          message: t("terminalTest.terminalNotAvailable"),
          duration: Date.now() - start5
        });
      }
    } catch (error: any) {
      updateTest("Kortleser-søk", { 
        status: "error", 
        message: error.message,
        duration: Date.now() - start5
      });
    }

    setIsRunningTests(false);
  };

  // Discover readers manually
  const handleDiscoverReaders = async () => {
    setIsDiscovering(true);
    try {
      const readers = await discoverReaders();
      setDiscoveredReaders(readers);
      if (readers.length === 0) {
        toast.info(t("terminalTest.noReadersFoundCheckOn"));
      } else {
        toast.success(t("terminalTest.foundReaders", { count: readers.length }));
      }
    } catch (error: any) {
      toast.error(t("terminalTest.searchError", { message: error.message }));
    } finally {
      setIsDiscovering(false);
    }
  };

  // Connect to reader
  const handleConnect = async (reader: Reader) => {
    try {
      await connectReader(reader);
      toast.success(t("terminalTest.readerConnected"));
    } catch (error: any) {
      toast.error(t("terminalTest.connectionFailed", { message: error.message }));
    }
  };

  // Test payment
  const handleTestPayment = async () => {
    if (!connectedReader) {
      toast.error(t("terminalTest.connectReaderFirst"));
      return;
    }

    const amount = parseFloat(testAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("terminalTest.invalidAmount"));
      return;
    }

    setIsProcessingPayment(true);
    try {
      const result = await processPayment(amount * 100, "nok"); // Convert to øre
      if (result.success) {
        toast.success(t("terminalTest.paymentSuccessful", { cardBrand: result.cardBrand, lastFour: result.lastFour }));
      } else {
        toast.error(t("terminalTest.paymentFailed", { error: result.error }));
      }
    } catch (error: any) {
      toast.error(t("terminalTest.genericError", { message: error.message }));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-5 h-5 rounded-full bg-gray-200" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">{t("terminalTest.title")}</h1>
            <p className="text-muted-foreground">
              {t("terminalTest.subtitle")}
            </p>
          </div>
          <Button onClick={runDiagnostics} disabled={isRunningTests}>
            {isRunningTests ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("terminalTest.runningTests")}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {t("terminalTest.runDiagnostics")}
              </>
            )}
          </Button>
        </div>

        {/* Connection Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {stripeStatus?.connected ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <p className="font-medium">Stripe Connect</p>
                  <p className="text-sm text-muted-foreground">
                    {stripeStatus?.connected ? t("terminalTest.connected") : t("terminalTest.notConnected")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {isInitialized ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
                )}
                <div>
                  <p className="font-medium">Terminal SDK</p>
                  <p className="text-sm text-muted-foreground">
                    {isInitialized ? t("terminalTest.initialized") : t("terminalTest.loading")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {connectedReader ? (
                  <Wifi className="h-8 w-8 text-green-500" />
                ) : (
                  <WifiOff className="h-8 w-8 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">{t("terminalTest.cardReader")}</p>
                  <p className="text-sm text-muted-foreground">
                    {connectedReader ? connectedReader.label || t("terminalTest.connected") : t("terminalTest.notConnected")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnostic Results */}
        {testResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t("terminalTest.diagnosticResults")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((test, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <p className="font-medium">{test.name}</p>
                        {test.message && (
                          <p className="text-sm text-muted-foreground">{test.message}</p>
                        )}
                      </div>
                    </div>
                    {test.duration && (
                      <Badge variant="outline">{test.duration}ms</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reader Discovery */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TerminalIcon className="h-5 w-5" />
              {t("terminalTest.readerManagement")}
            </CardTitle>
            <CardDescription>
              {t("terminalTest.readerManagementDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectedReader ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">{t("terminalTest.readerConnectedTitle")}</AlertTitle>
                  <AlertDescription className="text-green-700">
                    <p><strong>{t("terminalTest.nameLabel")}</strong> {connectedReader.label || t("terminalTest.unknown")}</p>
                    <p><strong>{t("terminalTest.serialNumberLabel")}</strong> {connectedReader.serial_number}</p>
                    <p><strong>{t("terminalTest.typeLabel")}</strong> {connectedReader.device_type}</p>
                  </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={disconnectReader}>
                  <WifiOff className="mr-2 h-4 w-4" />
                  {t("terminalTest.disconnect")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button onClick={handleDiscoverReaders} disabled={isDiscovering || !isInitialized}>
                  {isDiscovering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("terminalTest.searching")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("terminalTest.searchForReaders")}
                    </>
                  )}
                </Button>

                {discoveredReaders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("terminalTest.foundReadersList", { count: discoveredReaders.length })}</p>
                    {discoveredReaders.map((reader) => (
                      <div 
                        key={reader.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Wifi className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{reader.label || t("terminalTest.cardReader")}</p>
                            <p className="text-sm text-muted-foreground">
                              {reader.serial_number} • {reader.device_type}
                            </p>
                          </div>
                          <Badge variant={reader.status === "online" ? "default" : "secondary"}>
                            {reader.status}
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleConnect(reader)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            t("terminalTest.connect")
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {!isInitialized && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t("terminalTest.terminalNotInitializedTitle")}</AlertTitle>
                    <AlertDescription>
                      {t("terminalTest.terminalNotInitializedDesc")}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("terminalTest.testPayment")}
            </CardTitle>
            <CardDescription>
              {t("terminalTest.testPaymentDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectedReader ? (
              <div className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="amount">{t("terminalTest.amountLabel")}</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      value={testAmount}
                      onChange={(e) => setTestAmount(e.target.value)}
                      placeholder="10.00"
                    />
                  </div>
                  <Button 
                    onClick={handleTestPayment}
                    disabled={isProcessingPayment}
                    className="gap-2"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("terminalTest.processing")}
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        {t("terminalTest.runTestPayment")}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>{t("terminalTest.tipsLabel")}</strong> {t("terminalTest.testCardTip")}
                </p>
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("terminalTest.readerRequired")}</AlertTitle>
                <AlertDescription>
                  {t("terminalTest.readerRequiredDesc")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
