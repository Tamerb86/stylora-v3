import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MapPin,
  Plus,
  Settings,
  AlertCircle,
  Wifi,
  WifiOff,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { useStripeTerminal } from "@/contexts/StripeTerminalContext";
import { Reader } from "@stripe/terminal-js";
import { useTranslation } from "react-i18next";

export default function ReaderManagement() {
  const { t } = useTranslation();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredReaders, setDiscoveredReaders] = useState<Reader[]>([]);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState<"real" | "simulated">("real");
  const [setupForm, setSetupForm] = useState({
    salonName: "",
    line1: "",
    city: "",
    postal_code: "",
  });

  // Use shared Stripe Terminal context
  const {
    terminal,
    connectedReader,
    isInitialized,
    isConnecting,
    discoverReaders: contextDiscoverReaders,
    connectReader,
    disconnectReader,
  } = useStripeTerminal();

  // List registered readers from Stripe account
  const {
    data: registeredReaders,
    isLoading: loadingReaders,
    refetch: refetchReaders,
  } = trpc.stripeTerminal.listReaders.useQuery({});

  // List locations
  const {
    data: locations,
    isLoading: loadingLocations,
    refetch: refetchLocations,
  } = trpc.stripeTerminal.listLocations.useQuery();

  // Setup terminal mutation
  const setupTerminalMutation = trpc.stripeTerminal.setupTerminal.useMutation({
    onSuccess: (data) => {
      toast.success(t("readerManagement.setupCompleted"), {
        description: data.message,
      });
      setShowSetupDialog(false);
      refetchLocations();
      refetchReaders();
    },
    onError: (error) => {
      toast.error(t("readerManagement.setupFailed"), {
        description: error.message,
      });
    },
  });

  // Discover readers - supports both real and simulated
  const handleDiscoverReaders = async (simulated: boolean = false) => {
    if (!isInitialized) {
      toast.error(t("readerManagement.cardSystemNotReady"), {
        description: t("readerManagement.waitAndTryAgain"),
      });
      return;
    }

    setIsDiscovering(true);
    setDiscoveredReaders([]);

    try {
      const readers = await contextDiscoverReaders(simulated);
      setDiscoveredReaders(readers);
      
      if (readers.length === 0) {
        toast.info(t("readerManagement.noReadersFound"), {
          description: simulated
            ? t("readerManagement.noSimulatedReaders")
            : t("readerManagement.ensureWisePosOnline"),
        });
      } else {
        toast.success(t("readerManagement.foundReaders", { count: readers.length }));
      }
    } catch (error: any) {
      console.error("Error discovering readers:", error);
      toast.error(t("readerManagement.errorSearchingReaders"), {
        description: error.message || t("readerManagement.unexpectedError"),
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  // Connect to a reader
  const handleConnectReader = async (reader: Reader) => {
    try {
      await connectReader(reader);
    } catch (error: any) {
      console.error("Error connecting to reader:", error);
      toast.error(t("readerManagement.connectionError"), {
        description: error.message || t("readerManagement.unexpectedError"),
      });
    }
  };

  // Disconnect from reader
  const handleDisconnectReader = async () => {
    try {
      await disconnectReader();
    } catch (error: any) {
      console.error("Error disconnecting reader:", error);
      toast.error(t("readerManagement.disconnectFailed"), {
        description: error.message,
      });
    }
  };

  // Handle setup form submit
  const handleSetup = () => {
    if (!setupForm.salonName || !setupForm.line1 || !setupForm.city || !setupForm.postal_code) {
      toast.error(t("readerManagement.fillAllFields"));
      return;
    }

    setupTerminalMutation.mutate({
      salonName: setupForm.salonName,
      address: {
        line1: setupForm.line1,
        city: setupForm.city,
        postal_code: setupForm.postal_code,
        country: "NO",
      },
      createSimulatedReader: false,
    });
  };

  const hasLocation = locations && locations.length > 0;
  const hasReaders = registeredReaders && registeredReaders.length > 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              {t("readerManagement.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("readerManagement.subtitle")}
            </p>
          </div>
          <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                {t("readerManagement.setupTerminal")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("readerManagement.setupStripeTerminal")}</DialogTitle>
                <DialogDescription>
                  {t("readerManagement.createLocationForSalon")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="salonName">{t("readerManagement.salonName")}</Label>
                  <Input
                    id="salonName"
                    placeholder="Min Salong"
                    value={setupForm.salonName}
                    onChange={(e) =>
                      setSetupForm({ ...setupForm, salonName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line1">{t("readerManagement.address")}</Label>
                  <Input
                    id="line1"
                    placeholder="Storgata 1"
                    value={setupForm.line1}
                    onChange={(e) =>
                      setSetupForm({ ...setupForm, line1: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t("readerManagement.city")}</Label>
                    <Input
                      id="city"
                      placeholder="Oslo"
                      value={setupForm.city}
                      onChange={(e) =>
                        setSetupForm({ ...setupForm, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">{t("readerManagement.postalCode")}</Label>
                    <Input
                      id="postal_code"
                      placeholder="0150"
                      value={setupForm.postal_code}
                      onChange={(e) =>
                        setSetupForm({ ...setupForm, postal_code: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSetup}
                  disabled={setupTerminalMutation.isPending}
                  className="w-full"
                >
                  {setupTerminalMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("readerManagement.settingUp")}
                    </>
                  ) : (
                    t("readerManagement.createLocation")
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Connection Status Banner */}
        {connectedReader && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700">{t("readerManagement.readerConnected")}</AlertTitle>
            <AlertDescription className="text-green-600">
              {t("readerManagement.youAreConnectedTo")} {connectedReader.label || connectedReader.id}
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={handleDisconnectReader}
              >
                {t("readerManagement.disconnect")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Terminal Status */}
        {!isInitialized && (
          <Alert className="mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>{t("readerManagement.initializingCardSystem")}</AlertTitle>
            <AlertDescription>
              {t("readerManagement.pleaseWaitStripeInit")}
            </AlertDescription>
          </Alert>
        )}

        {/* Locations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("readerManagement.terminalLocations")}
            </CardTitle>
            <CardDescription>
              {t("readerManagement.locationsRegisteredForReaders")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLocations ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : hasLocation ? (
              <div className="space-y-2">
                {locations?.map((location: any) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{location.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {location.address?.line1}, {location.address?.postal_code} {location.address?.city}
                      </p>
                    </div>
                    <Badge>{t("readerManagement.active")}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("readerManagement.noLocations")}</AlertTitle>
                <AlertDescription>
                  {t("readerManagement.noLocationsDescription")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Discover Readers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              {t("readerManagement.searchForReaders")}
            </CardTitle>
            <CardDescription>
              {t("readerManagement.findAvailableReaders")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="real" onValueChange={(v) => setDiscoveryMode(v as "real" | "simulated")}>
              <TabsList className="mb-4">
                <TabsTrigger value="real" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  {t("readerManagement.realReaders")}
                </TabsTrigger>
                <TabsTrigger value="simulated" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t("readerManagement.simulatedReaders")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="real">
                <div className="space-y-4">
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertTitle>WisePOS E</AlertTitle>
                    <AlertDescription>
                      {t("readerManagement.wisePosInstructions")}
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() => handleDiscoverReaders(false)}
                    disabled={isDiscovering || !isInitialized}
                    className="w-full"
                  >
                    {isDiscovering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("readerManagement.searching")}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t("readerManagement.searchRealReaders")}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="simulated">
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t("readerManagement.testMode")}</AlertTitle>
                    <AlertDescription>
                      {t("readerManagement.testModeDescription")}
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() => handleDiscoverReaders(true)}
                    disabled={isDiscovering || !isInitialized}
                    className="w-full"
                  >
                    {isDiscovering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("readerManagement.searching")}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t("readerManagement.searchSimulatedReaders")}
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Discovered Readers */}
            {discoveredReaders.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">{t("readerManagement.foundReadersLabel", { count: discoveredReaders.length })}</p>
                {discoveredReaders.map((reader: any) => (
                  <div
                    key={reader.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{reader.label || t("readerManagement.cardReader")}</p>
                        <p className="text-sm text-muted-foreground">
                          {reader.device_type} - {reader.serial_number || reader.id}
                        </p>
                      </div>
                    </div>
                    {connectedReader?.id === reader.id ? (
                      <Badge variant="default" className="bg-green-500">
                        {t("readerManagement.connected")}
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => handleConnectReader(reader)}
                        disabled={isConnecting}
                        size="sm"
                      >
                        {isConnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t("readerManagement.connect")
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registered Readers from Stripe */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("readerManagement.registeredReaders")}
                </CardTitle>
                <CardDescription>
                  {t("readerManagement.allReadersInStripeAccount")}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchReaders()}
                disabled={loadingReaders}
              >
                <RefreshCw className={`h-4 w-4 ${loadingReaders ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingReaders ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : hasReaders ? (
              <div className="space-y-2">
                {registeredReaders?.map((reader: any) => (
                  <div
                    key={reader.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{reader.label || t("readerManagement.cardReader")}</p>
                        <p className="text-sm text-muted-foreground">
                          {reader.device_type} - {reader.serial_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          IP: {reader.ip_address || "N/A"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={reader.status === "online" ? "default" : "secondary"}>
                      {reader.status === "online" ? "online" : reader.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("readerManagement.noReadersRegistered")}</AlertTitle>
                <AlertDescription>
                  {t("readerManagement.noReadersRegisteredDescription")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
