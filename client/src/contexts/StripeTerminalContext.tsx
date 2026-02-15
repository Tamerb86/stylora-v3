import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { loadStripeTerminal, Terminal, Reader } from "@stripe/terminal-js";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface StripeTerminalContextType {
  terminal: Terminal | null;
  connectedReader: Reader | null;
  isInitialized: boolean;
  isConnecting: boolean;
  discoverReaders: (simulated?: boolean) => Promise<Reader[]>;
  connectReader: (reader: Reader) => Promise<void>;
  disconnectReader: () => Promise<void>;
  processPayment: (
    amount: number,
    currency?: string
  ) => Promise<{
    success: boolean;
    paymentIntentId?: string;
    cardBrand?: string;
    lastFour?: string;
    error?: string;
  }>;
}

const StripeTerminalContext = createContext<
  StripeTerminalContextType | undefined
>(undefined);

export function StripeTerminalProvider({
  children,
  providerId,
}: {
  children: ReactNode;
  providerId?: number;
}) {
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [connectedReader, setConnectedReader] = useState<Reader | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const createConnectionTokenMutation =
    trpc.stripeTerminal.createConnectionToken.useMutation();
  const createPaymentIntentMutation =
    trpc.stripeTerminal.createPaymentIntent.useMutation();

  // Initialize Stripe Terminal SDK
  useEffect(() => {
    const initTerminal = async () => {
      try {
        const StripeTerminal = await loadStripeTerminal();

        if (!StripeTerminal) {
          throw new Error("Failed to load Stripe Terminal SDK");
        }

        const terminalInstance = StripeTerminal.create({
          onFetchConnectionToken: async () => {
            const result = await createConnectionTokenMutation.mutateAsync({
              providerId,
            });
            return result.secret;
          },
          onUnexpectedReaderDisconnect: () => {
            toast.error("Reader disconnected unexpectedly");
            setConnectedReader(null);
          },
        });

        setTerminal(terminalInstance);
        setIsInitialized(true);
        console.log("Stripe Terminal initialized successfully");
      } catch (error: any) {
        console.error("Failed to initialize Stripe Terminal:", error);
        toast.error(`Failed to initialize terminal: ${error.message}`);
      }
    };

    initTerminal();
  }, [providerId]);

  // Discover readers - supports both simulated and real readers
  const discoverReaders = async (simulated: boolean = false): Promise<Reader[]> => {
    if (!terminal) {
      toast.error("Terminal not initialized");
      return [];
    }

    try {
      console.log(`Discovering readers (simulated: ${simulated})...`);
      
      // For real WisePOS E readers, use internet discovery method
      const discoverConfig: any = {
        simulated: simulated,
      };
      
      // If not simulated, use internet discovery for smart readers like WisePOS E
      if (!simulated) {
        // Internet-connected readers don't need location for discovery
        // They are discovered via Stripe's cloud
      }

      const discoverResult = await terminal.discoverReaders(discoverConfig);

      if ("error" in discoverResult && discoverResult.error) {
        console.error("Discovery error:", discoverResult.error);
        toast.error(`Discovery failed: ${discoverResult.error.message}`);
        return [];
      }

      const readers = ("discoveredReaders" in discoverResult &&
          discoverResult.discoveredReaders) || [];
      
      console.log("Discovered readers:", readers);
      return readers;
    } catch (error: any) {
      console.error("Discovery exception:", error);
      toast.error(`Discovery error: ${error.message}`);
      return [];
    }
  };

  const connectReader = async (reader: Reader) => {
    if (!terminal) {
      toast.error("Terminal not initialized");
      return;
    }

    setIsConnecting(true);
    try {
      console.log("Connecting to reader:", reader);
      const connectResult = await terminal.connectReader(reader);

      if ("error" in connectResult && connectResult.error) {
        toast.error(`Connection failed: ${connectResult.error.message}`);
      } else if ("reader" in connectResult && connectResult.reader) {
        setConnectedReader(connectResult.reader);
        toast.success(`Connected to ${reader.label || "reader"}`);
      }
    } catch (error: any) {
      toast.error(`Connection error: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectReader = async () => {
    if (!terminal) {
      return;
    }

    try {
      await terminal.disconnectReader();
      setConnectedReader(null);
      toast.success("Reader disconnected");
    } catch (error: any) {
      toast.error(`Disconnect error: ${error.message}`);
    }
  };

  const processPayment = async (
    amount: number,
    currency: string = "nok"
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    cardBrand?: string;
    lastFour?: string;
    error?: string;
  }> => {
    if (!terminal || !connectedReader) {
      return {
        success: false,
        error: "Terminal not connected",
      };
    }

    try {
      // Create payment intent on backend
      const paymentIntent = await createPaymentIntentMutation.mutateAsync({
        amount,
        currency,
        providerId,
      });

      // Collect payment method
      const collectResult = await terminal.collectPaymentMethod(
        paymentIntent.clientSecret!
      );

      if ("error" in collectResult && collectResult.error) {
        return {
          success: false,
          error: collectResult.error.message,
        };
      }

      if (!("paymentIntent" in collectResult) || !collectResult.paymentIntent) {
        return {
          success: false,
          error: "Failed to collect payment method",
        };
      }

      // Process payment
      const processResult = await terminal.processPayment(
        collectResult.paymentIntent
      );

      if ("error" in processResult && processResult.error) {
        return {
          success: false,
          error: processResult.error.message,
        };
      }

      if (
        "paymentIntent" in processResult &&
        processResult.paymentIntent?.status === "succeeded"
      ) {
        const paymentIntent = processResult.paymentIntent;
        const charges = paymentIntent.charges?.data?.[0];
        const paymentMethodDetails = charges?.payment_method_details;

        return {
          success: true,
          paymentIntentId: paymentIntent.id,
          cardBrand:
            paymentMethodDetails?.card_present?.brand ||
            paymentMethodDetails?.type ||
            "Unknown",
          lastFour: paymentMethodDetails?.card_present?.last4 || undefined,
        };
      }

      return {
        success: false,
        error:
          "paymentIntent" in processResult
            ? `Payment status: ${processResult.paymentIntent?.status}`
            : "Payment failed",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Payment failed",
      };
    }
  };

  return (
    <StripeTerminalContext.Provider
      value={{
        terminal,
        connectedReader,
        isInitialized,
        isConnecting,
        discoverReaders,
        connectReader,
        disconnectReader,
        processPayment,
      }}
    >
      {children}
    </StripeTerminalContext.Provider>
  );
}

export function useStripeTerminal() {
  const context = useContext(StripeTerminalContext);
  if (context === undefined) {
    throw new Error(
      "useStripeTerminal must be used within a StripeTerminalProvider"
    );
  }
  return context;
}
