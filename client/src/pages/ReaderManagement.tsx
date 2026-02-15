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

export default function ReaderManagement() {
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
      toast.success("Terminal oppsett fullført!", {
        description: data.message,
      });
      setShowSetupDialog(false);
      refetchLocations();
      refetchReaders();
    },
    onError: (error) => {
      toast.error("Kunne ikke sette opp terminal", {
        description: error.message,
      });
    },
  });

  // Discover readers - supports both real and simulated
  const handleDiscoverReaders = async (simulated: boolean = false) => {
    if (!isInitialized) {
      toast.error("Kortsystemet er ikke klart", {
        description: "Vennligst vent litt og prøv igjen",
      });
      return;
    }

    setIsDiscovering(true);
    setDiscoveredReaders([]);

    try {
      const readers = await contextDiscoverReaders(simulated);
      setDiscoveredReaders(readers);
      
      if (readers.length === 0) {
        toast.info("Ingen kortlesere funnet", {
          description: simulated 
            ? "Ingen simulerte lesere tilgjengelig" 
            : "Sørg for at WisePOS E er på og koblet til internett",
        });
      } else {
        toast.success(`Fant ${readers.length} leser(e)`);
      }
    } catch (error: any) {
      console.error("Error discovering readers:", error);
      toast.error("Feil ved søk etter lesere", {
        description: error.message || "En uventet feil oppstod",
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
      toast.error("Tilkoblingsfeil", {
        description: error.message || "En uventet feil oppstod",
      });
    }
  };

  // Disconnect from reader
  const handleDisconnectReader = async () => {
    try {
      await disconnectReader();
    } catch (error: any) {
      console.error("Error disconnecting reader:", error);
      toast.error("Kunne ikke frakoble", {
        description: error.message,
      });
    }
  };

  // Handle setup form submit
  const handleSetup = () => {
    if (!setupForm.salonName || !setupForm.line1 || !setupForm.city || !setupForm.postal_code) {
      toast.error("Vennligst fyll ut alle feltene");
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
              Kortleser Administrasjon
            </h1>
            <p className="text-muted-foreground mt-1">
              Koble til kortleser for å behandle betalinger
            </p>
          </div>
          <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Sett opp Terminal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sett opp Stripe Terminal</DialogTitle>
                <DialogDescription>
                  Opprett en lokasjon for din salong
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="salonName">Salongsnavn</Label>
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
                  <Label htmlFor="line1">Adresse</Label>
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
                    <Label htmlFor="city">By</Label>
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
                    <Label htmlFor="postal_code">Postnummer</Label>
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
                      Setter opp...
                    </>
                  ) : (
                    "Opprett lokasjon"
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
            <AlertTitle className="text-green-700">Kortleser tilkoblet</AlertTitle>
            <AlertDescription className="text-green-600">
              Du er koblet til: {connectedReader.label || connectedReader.id}
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={handleDisconnectReader}
              >
                Koble fra
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Terminal Status */}
        {!isInitialized && (
          <Alert className="mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Initialiserer kortsystem...</AlertTitle>
            <AlertDescription>
              Vennligst vent mens Stripe Terminal initialiseres.
            </AlertDescription>
          </Alert>
        )}

        {/* Locations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Terminal Lokasjoner
            </CardTitle>
            <CardDescription>
              Lokasjoner registrert for kortlesere
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
                    <Badge>Aktiv</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ingen lokasjoner</AlertTitle>
                <AlertDescription>
                  Du må sette opp en lokasjon før du kan bruke kortlesere.
                  Klikk "Sett opp Terminal" for å komme i gang.
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
              Søk etter kortlesere
            </CardTitle>
            <CardDescription>
              Finn tilgjengelige kortlesere på nettverket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="real" onValueChange={(v) => setDiscoveryMode(v as "real" | "simulated")}>
              <TabsList className="mb-4">
                <TabsTrigger value="real" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Ekte Lesere (WisePOS E)
                </TabsTrigger>
                <TabsTrigger value="simulated" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Simulerte Lesere (Test)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="real">
                <div className="space-y-4">
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertTitle>WisePOS E</AlertTitle>
                    <AlertDescription>
                      Sørg for at WisePOS E er påslått og koblet til internett. 
                      Leseren må være registrert i Stripe Dashboard først.
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
                        Søker...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Søk etter ekte lesere
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="simulated">
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Testmodus</AlertTitle>
                    <AlertDescription>
                      Simulerte lesere brukes kun for testing. 
                      Ingen ekte betalinger vil bli behandlet.
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
                        Søker...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Søk etter simulerte lesere
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Discovered Readers */}
            {discoveredReaders.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Funnet {discoveredReaders.length} leser(e):</p>
                {discoveredReaders.map((reader: any) => (
                  <div
                    key={reader.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{reader.label || "Kortleser"}</p>
                        <p className="text-sm text-muted-foreground">
                          {reader.device_type} - {reader.serial_number || reader.id}
                        </p>
                      </div>
                    </div>
                    {connectedReader?.id === reader.id ? (
                      <Badge variant="default" className="bg-green-500">
                        Tilkoblet
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
                          "Koble til"
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
                  Registrerte lesere
                </CardTitle>
                <CardDescription>
                  Alle lesere registrert i din Stripe-konto
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
                        <p className="font-medium">{reader.label || "Kortleser"}</p>
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
                <AlertTitle>Ingen lesere registrert</AlertTitle>
                <AlertDescription>
                  Du har ingen kortlesere registrert i Stripe. 
                  Registrer en WisePOS E i Stripe Dashboard først.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
