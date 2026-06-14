import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Scissors,
  CreditCard,
  Smartphone,
  Calendar as CalendarIcon,
  Sparkles,
  Star,
  History,
  Info,
  XCircle,
  AlertCircle,
  CheckCircle,
  CalendarClock,
  Heart,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { safeToFixed } from "@/lib/utils";

type BookingStep =
  | "service"
  | "employee"
  | "datetime"
  | "info"
  | "payment"
  | "confirmation";

// =======================
// Helpers (top-level, once)
// =======================
const DEFAULT_VAT = 25;

const toGross = (net: number, vatRate: number = DEFAULT_VAT): number =>
  net * (1 + vatRate / 100);

const formatKr = (value: number, decimals: number = 0): string =>
  `${safeToFixed(value, decimals)} kr`;

export default function PublicBooking() {
  const { t } = useTranslation();
  // Extract subdomain from URL or use tenant ID from URL parameter
  // Priority: 1. URL parameter (?tenantId=xxx), 2. Subdomain extraction, 3. Fallback
  const subdomain = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantIdParam = urlParams.get("tenantId");

    if (tenantIdParam) {
      console.log("[Booking] Using tenantId from URL parameter:", tenantIdParam);
      return tenantIdParam;
    }

    const hostname = window.location.hostname;
    console.log("[Booking] Hostname:", hostname);

    if (hostname.includes("localhost") || hostname.includes("railway")) {
      console.warn(
        "[Booking] Development environment detected. Please provide ?tenantId=xxx parameter."
      );
      return null;
    }

    const parts = hostname.split(".");
    console.log("[Booking] Hostname parts:", parts);

    if (parts.length >= 3) {
      const extractedSubdomain = parts[0];
      console.log("[Booking] Extracted subdomain:", extractedSubdomain);
      return extractedSubdomain;
    }

    if (parts.length === 2) {
      console.warn("[Booking] No subdomain found - accessing root domain");
      return null;
    }

    console.warn("[Booking] Could not extract subdomain from hostname");
    return null;
  }, []);

  // Get tenant ID from subdomain
  const { data: tenantData, isLoading: tenantLoading } =
    trpc.publicBooking.getTenantBySubdomain.useQuery(
      { subdomain: subdomain || "" },
      { enabled: !!subdomain }
    );

  const TENANT_ID = tenantData?.id || "";

  const [currentStep, setCurrentStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "Ola",
    lastName: "Nordmann",
    phone: "12345678",
    email: "ola@example.com",
  });
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "stripe" | "vipps" | "cash" | "pay_at_salon" | null
  >(null);

  const { data: branding } = trpc.publicBooking.getBranding.useQuery(
    { tenantId: TENANT_ID },
    { enabled: !!TENANT_ID }
  );

  const { data: salonInfo } = trpc.publicBooking.getSalonInfo.useQuery(
    { tenantId: TENANT_ID },
    { enabled: !!TENANT_ID }
  );

  const { data: services = [], isLoading: servicesLoading } =
    trpc.publicBooking.getAvailableServices.useQuery(
      { tenantId: TENANT_ID },
      { enabled: !!TENANT_ID }
    );

  const { data: employees = [], isLoading: employeesLoading } =
    trpc.publicBooking.getAvailableEmployees.useQuery(
      { tenantId: TENANT_ID },
      { enabled: !!TENANT_ID }
    );

  const { data: paymentSettings } = (trpc as any).paymentSettings.getPublic.useQuery(
    { tenantId: TENANT_ID },
    { enabled: !!TENANT_ID }
  );

  const { data: timeSlots = [], isLoading: timeSlotsLoading } =
    trpc.publicBooking.getAvailableTimeSlots.useQuery(
      {
        tenantId: TENANT_ID,
        date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
        serviceId: selectedService || 0,
        employeeId: selectedEmployee || undefined,
      },
      { enabled: !!selectedDate && !!selectedService && !!TENANT_ID }
    );

  const createBookingMutation = trpc.publicBooking.createBooking.useMutation({
    onSuccess: data => {
      setBookingId(data.appointmentId);
      setCurrentStep("confirmation");
      toast.success(t("publicBooking.bookingConfirmed"), {
        description: t("publicBooking.bookingReserved"),
      });
    },
    onError: error => {
      toast.error(t("publicBooking.bookingError"), { description: error.message });
    },
  });

  const createBookingWithPaymentMutation =
    trpc.publicBooking.createBookingAndStartPayment.useMutation({
      onSuccess: data => {
        setBookingId(data.appointmentId);
        if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      },
      onError: error => {
        toast.error(t("publicBooking.paymentError"), { description: error.message });
      },
    });

  const createVippsPaymentMutation =
    trpc.publicBooking.createBookingAndStartVippsPayment.useMutation({
      onSuccess: data => {
        setBookingId(data.appointmentId);
        if (data.vippsUrl) window.location.href = data.vippsUrl;
      },
      onError: error => {
        toast.error(t("publicBooking.vippsPaymentError"), { description: error.message });
      },
    });

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);

  const handleServiceSelect = (serviceId: number) => {
    setSelectedService(serviceId);
    setCurrentStep("employee");
  };

  const handleEmployeeSelect = (employeeId: number | null) => {
    setSelectedEmployee(employeeId);
    setCurrentStep("datetime");
  };

  const handleDateTimeSelect = () => {
    if (!selectedDate || !selectedTime) {
      toast.error(t("publicBooking.missingInfo"), {
        description: t("publicBooking.mustSelectDateTime"),
      });
      return;
    }
    setCurrentStep("info");
  };

  const handleSubmitBooking = () => {
    if (!TENANT_ID) {
      toast.error(t("publicBooking.error"), {
        description: t("publicBooking.couldNotIdentifySalon"),
      });
      return;
    }

    if (!customerInfo.firstName || !customerInfo.phone) {
      toast.error(t("publicBooking.missingInfo"), {
        description: t("publicBooking.firstNamePhoneRequired"),
      });
      return;
    }

    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error(t("publicBooking.incompleteBooking"), {
        description: t("publicBooking.completeAllSteps"),
      });
      return;
    }

    if (!paymentMethod) {
      toast.error(t("publicBooking.selectPaymentMethod"), {
        description: t("publicBooking.chooseHowToPay"),
      });
      return;
    }

    // "Ingen preferanse" (no preference) → assign the first available employee,
    // since an appointment must have a concrete staff member.
    const resolvedEmployeeId = selectedEmployee ?? employees[0]?.id;
    if (!resolvedEmployeeId) {
      toast.error(t("publicBooking.error"), {
        description: t("publicBooking.noEmployeeAvailable"),
      });
      return;
    }

    const bookingData = {
      tenantId: TENANT_ID,
      serviceId: selectedService,
      employeeId: resolvedEmployeeId,
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime,
      customerInfo,
    };

    if (paymentMethod === "stripe") {
      createBookingWithPaymentMutation.mutate({
        ...bookingData,
        successUrl: `${window.location.origin}/book/success?token={MANAGEMENT_TOKEN}`,
        cancelUrl: `${window.location.origin}/book?canceled=true`,
      });
    } else if (paymentMethod === "vipps") {
      createVippsPaymentMutation.mutate({
        ...bookingData,
        callbackUrl: `${window.location.origin}/book/success?token={MANAGEMENT_TOKEN}`,
        fallbackUrl: `${window.location.origin}/book?canceled=true`,
      });
    } else {
      createBookingMutation.mutate(bookingData);
    }
  };

  const goBack = () => {
    const steps: BookingStep[] = [
      "service",
      "employee",
      "datetime",
      "info",
      "payment",
      "confirmation",
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) setCurrentStep(steps[currentIndex - 1]);
  };

  const progressPercentage = {
    service: 16,
    employee: 33,
    datetime: 50,
    info: 66,
    payment: 83,
    confirmation: 100,
  }[currentStep];

  const stepTitles = {
    service: t("publicBooking.stepService"),
    employee: t("publicBooking.stepEmployee"),
    datetime: t("publicBooking.stepDateTime"),
    info: t("publicBooking.stepInfo"),
    payment: t("publicBooking.stepPayment"),
    confirmation: t("publicBooking.stepConfirmation"),
  } as const;

  // Loading while fetching tenant
  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t("publicBooking.loadingBookingPage")}</p>
        </div>
      </div>
    );
  }

  // Error if tenant not found
  if (!tenantData && !tenantLoading) {
    const isDevEnvironment =
      window.location.hostname.includes("localhost") ||
      window.location.hostname.includes("railway");

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {t("publicBooking.salonNotFound")}
          </h1>

          {isDevEnvironment && !subdomain ? (
            <>
              <p className="text-gray-600 mb-4">
                {t("publicBooking.devEnvAddParam")}{" "}
                <code className="bg-gray-200 px-2 py-1 rounded">
                  ?tenantId=xxx
                </code>{" "}
                {t("publicBooking.inTheUrl")}
              </p>
              <p className="text-sm text-gray-500 mb-2">{t("publicBooking.example")}</p>
              <code className="text-xs bg-gray-100 p-2 rounded block mb-4">
                {window.location.origin}/book?tenantId=demo-tenant-stylora
              </code>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                {t("publicBooking.couldNotFindSalonSubdomain")}{" "}
                <strong>"{String(subdomain)}"</strong>
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>{t("publicBooking.possiblecauses")}</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>{t("publicBooking.causeSubdomainMisconfigured")}</li>
                  <li>{t("publicBooking.causeSalonNotActivated")}</li>
                  <li>{t("publicBooking.causeUrlTypo")}</li>
                </ul>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {t("publicBooking.contactSalonOrCheckUrl")}
              </p>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-700 underline text-sm"
              >
                {t("publicBooking.goToHomepage")}
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root {
          --booking-primary: ${branding?.primaryColor || "#1e3a5f"};
          --booking-accent: ${branding?.accentColor || "#ff6b35"};
        }
        .booking-gradient {
          background: linear-gradient(135deg, var(--booking-primary) 0%, ${branding?.primaryColor ? `${branding.primaryColor}dd` : "#2563eb"} 100%);
        }
        .service-card-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .service-card-hover:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--booking-primary), var(--booking-accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .time-slot-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .time-slot-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 16px rgba(0,0,0,0.12);
        }
        .time-slot-btn:active {
          transform: scale(0.98);
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30">
        {/* Header */}
        <div className="booking-gradient text-white py-16 shadow-2xl">
          <div className="container max-w-6xl">
            <div className="flex items-center gap-6">
              {(branding?.logoUrl || salonInfo?.logoUrl) && (
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
                  <img
                    src={branding?.logoUrl || salonInfo?.logoUrl}
                    alt={salonInfo?.name || "Salon"}
                    className="relative h-20 w-20 rounded-full bg-white p-2 shadow-lg ring-4 ring-white/30"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-7 w-7 text-yellow-300 animate-pulse" />
                  <h1 className="text-5xl font-bold drop-shadow-lg">
                    {branding?.welcomeTitle || salonInfo?.name || t("publicBooking.welcome")}
                  </h1>
                </div>
                <p className="text-blue-100 text-xl font-light">
                  {branding?.welcomeSubtitle ||
                    t("publicBooking.welcomeSubtitle")}
                </p>
              </div>
            </div>

            {salonInfo && (
              <div className="flex flex-wrap gap-6 mt-6 text-sm text-blue-100">
                {salonInfo.address && (
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{salonInfo.address}</span>
                  </div>
                )}
                {salonInfo.phone && (
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                    <Phone className="h-4 w-4" />
                    <span>{salonInfo.phone}</span>
                  </div>
                )}
                {salonInfo.email && (
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                    <Mail className="h-4 w-4" />
                    <span>{salonInfo.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 shadow-lg sticky top-0 z-10">
          <div className="container max-w-6xl py-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold shadow-xl">
                  {currentStep === "service" && "1"}
                  {currentStep === "employee" && "2"}
                  {currentStep === "datetime" && "3"}
                  {currentStep === "info" && "4"}
                  {currentStep === "payment" && "5"}
                  {currentStep === "confirmation" && <Check className="h-6 w-6" />}
                </div>
                <div>
                  <span className="text-base font-bold text-gray-800 block gradient-text">
                    {stepTitles[currentStep]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {t("publicBooking.stepCounter", {
                      current:
                        currentStep === "confirmation"
                          ? 6
                          : [
                              "service",
                              "employee",
                              "datetime",
                              "info",
                              "payment",
                            ].indexOf(currentStep) + 1,
                      total: 6,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-bold text-gray-700 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full shadow-sm">
                  {progressPercentage}%
                </span>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div
                className="h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
                style={{
                  width: `${progressPercentage}%`,
                  background: `linear-gradient(90deg, ${branding?.accentColor || "#ff6b35"}, ${branding?.primaryColor || "#1e3a5f"})`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="container max-w-6xl py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Step 1: Service */}
              {currentStep === "service" && (
                <div className="space-y-8 fade-in">
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-3 gradient-text">
                      {t("publicBooking.stepService")}
                    </h2>
                    <p className="text-gray-600 text-lg">
                      {t("publicBooking.whatToBook")}
                    </p>
                  </div>

                  {servicesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="animate-pulse shadow-lg">
                          <CardContent className="p-8">
                            <div className="h-7 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4 mb-4"></div>
                            <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full mb-3"></div>
                            <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {services.map(service => (
                        <Card
                          key={service.id}
                          className={`cursor-pointer service-card-hover border-2 ${
                            selectedService === service.id
                              ? "ring-4 ring-[var(--booking-accent)]/40 border-[var(--booking-accent)] shadow-2xl bg-gradient-to-br from-white to-blue-50"
                              : "hover:shadow-2xl hover:border-blue-300 bg-white"
                          }`}
                          onClick={() => handleServiceSelect(service.id)}
                        >
                          <CardContent className="p-8">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                                    <Scissors className="h-5 w-5 text-white" />
                                  </div>
                                  <h3 className="font-bold text-xl text-gray-900">
                                    {service.name}
                                  </h3>
                                </div>

                                {service.description && (
                                  <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                                    {service.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-6 text-sm">
                                  <div className="flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-2 rounded-full">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">
                                      {service.durationMinutes} {t("publicBooking.min")}
                                    </span>
                                  </div>
                                  <div className="font-bold text-2xl gradient-text">
                                    {formatKr(toGross(Number(service.price)))}{" "}
                                    <span className="text-sm font-normal text-gray-600">
                                      {t("publicBooking.inclVat")}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {selectedService === service.id && (
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg animate-pulse">
                                    <Check className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Employee */}
              {currentStep === "employee" && (
                <div className="space-y-8 fade-in">
                  <Button variant="ghost" onClick={goBack} className="mb-4">
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    {t("publicBooking.back")}
                  </Button>

                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-3 gradient-text">
                      {t("publicBooking.stepEmployee")}
                    </h2>
                    <p className="text-gray-600 text-lg">
                      {t("publicBooking.whoShouldPerform")}
                    </p>
                  </div>

                  {employeesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse shadow-lg">
                          <CardContent className="p-8">
                            <div className="h-7 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card
                        className={`cursor-pointer service-card-hover border-2 ${
                          selectedEmployee === null
                            ? "ring-4 ring-[var(--booking-accent)]/40 border-[var(--booking-accent)] shadow-2xl bg-gradient-to-br from-white to-purple-50"
                            : "hover:shadow-2xl hover:border-purple-300 bg-white"
                        }`}
                        onClick={() => handleEmployeeSelect(null)}
                      >
                        <CardContent className="p-8">
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-xl">
                              <User className="h-8 w-8 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-xl mb-1">
                                {t("publicBooking.noPreference")}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {t("publicBooking.firstAvailableHairdresser")}
                              </p>
                            </div>
                            {selectedEmployee === null && (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg animate-pulse">
                                <Check className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {employees.map(employee => (
                        <Card
                          key={employee.id}
                          className={`cursor-pointer service-card-hover border-2 ${
                            selectedEmployee === employee.id
                              ? "ring-4 ring-[var(--booking-accent)]/40 border-[var(--booking-accent)] shadow-2xl bg-gradient-to-br from-white to-blue-50"
                              : "hover:shadow-2xl hover:border-blue-300 bg-white"
                          }`}
                          onClick={() => handleEmployeeSelect(employee.id)}
                        >
                          <CardContent className="p-8">
                            <div className="flex items-center gap-4">
                              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                                {(employee.name || "E").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-xl mb-1">
                                  {employee.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {t("publicBooking.professionalHairdresser")}
                                </p>
                              </div>
                              {selectedEmployee === employee.id && (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg animate-pulse">
                                  <Check className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: DateTime */}
              {currentStep === "datetime" && (
                <div className="space-y-6">
                  <Button variant="ghost" onClick={goBack} className="mb-2">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t("publicBooking.back")}
                  </Button>

                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {t("publicBooking.stepDateTime")}
                    </h2>
                    <p className="text-gray-600">{t("publicBooking.whenSuitsYou")}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5 text-[var(--booking-primary)]" />
                          {t("publicBooking.selectDate")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={date =>
                            date < new Date() || date > addDays(new Date(), 60)
                          }
                          locale={nb}
                          className="rounded-md border"
                        />
                      </CardContent>
                    </Card>

                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-[var(--booking-primary)]" />
                          {t("publicBooking.selectTime")}
                        </CardTitle>
                        {selectedDate && (
                          <CardDescription className="text-base font-medium">
                            {format(selectedDate, "EEEE d. MMMM yyyy", {
                              locale: nb,
                            })}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {!selectedDate ? (
                          <div className="text-center py-12">
                            <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">{t("publicBooking.selectDateFirst")}</p>
                          </div>
                        ) : timeSlotsLoading ? (
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <div
                                key={i}
                                className="h-10 bg-gray-200 rounded animate-pulse"
                              />
                            ))}
                          </div>
                        ) : timeSlots.length === 0 ? (
                          <div className="text-center py-12">
                            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">
                              {t("publicBooking.noAvailableTimes")}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              {t("publicBooking.tryAnotherDate")}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                            {timeSlots.map((slot: any) => {
                              const t =
                                typeof slot === "string"
                                  ? slot
                                  : typeof slot?.time === "string"
                                  ? slot.time
                                  : "";
                              if (!t) return null;

                              return (
                                <Button
                                  key={t}
                                  variant={selectedTime === t ? "default" : "outline"}
                                  className={`time-slot-btn ${
                                    selectedTime === t
                                      ? "bg-gradient-to-r from-[var(--booking-accent)] to-[var(--booking-primary)] hover:opacity-90 text-white shadow-lg"
                                      : "hover:border-[var(--booking-accent)] hover:text-[var(--booking-accent)]"
                                  }`}
                                  onClick={() => setSelectedTime(t)}
                                >
                                  {t.substring(0, 5)}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleDateTimeSelect}
                      disabled={!selectedDate || !selectedTime}
                      className="bg-gradient-to-r from-[var(--booking-accent)] to-[var(--booking-primary)] hover:opacity-90 text-white shadow-lg px-8 py-6 text-lg"
                      size="lg"
                    >
                      {t("publicBooking.next")}
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Info */}
              {currentStep === "info" && (
                <div className="space-y-6">
                  <Button variant="ghost" onClick={goBack} className="mb-2">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t("publicBooking.back")}
                  </Button>

                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {t("publicBooking.stepInfo")}
                    </h2>
                    <p className="text-gray-600">
                      {t("publicBooking.weNeedThisToConfirm")}
                    </p>
                  </div>

                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>{t("publicBooking.contactInfo")}</CardTitle>
                      <CardDescription>
                        {t("publicBooking.requiredFieldsNote")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-base">
                            {t("publicBooking.firstName")} <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="firstName"
                            value={customerInfo.firstName}
                            onChange={e =>
                              setCustomerInfo({
                                ...customerInfo,
                                firstName: e.target.value,
                              })
                            }
                            placeholder="Ola"
                            className="h-12 text-base"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-base">
                            {t("publicBooking.lastName")}
                          </Label>
                          <Input
                            id="lastName"
                            value={customerInfo.lastName}
                            onChange={e =>
                              setCustomerInfo({
                                ...customerInfo,
                                lastName: e.target.value,
                              })
                            }
                            placeholder="Nordmann"
                            className="h-12 text-base"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-base">
                          {t("publicBooking.phone")} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={customerInfo.phone}
                          onChange={e =>
                            setCustomerInfo({
                              ...customerInfo,
                              phone: e.target.value,
                            })
                          }
                          placeholder="12345678"
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-base">
                          {t("publicBooking.email")}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerInfo.email}
                          onChange={e =>
                            setCustomerInfo({
                              ...customerInfo,
                              email: e.target.value,
                            })
                          }
                          placeholder="ola@example.com"
                          className="h-12 text-base"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        if (!customerInfo.firstName || !customerInfo.phone) {
                          toast.error(t("publicBooking.missingInfo"), {
                            description: t("publicBooking.firstNamePhoneRequired"),
                          });
                          return;
                        }
                        setCurrentStep("payment");
                      }}
                      className="bg-gradient-to-r from-[var(--booking-accent)] to-[var(--booking-primary)] hover:opacity-90 text-white shadow-lg px-8 py-6 text-lg"
                      size="lg"
                    >
                      {t("publicBooking.next")}
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Payment */}
              {currentStep === "payment" && (
                <div className="space-y-6">
                  <Button variant="ghost" onClick={goBack} className="mb-2">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t("publicBooking.back")}
                  </Button>

                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {t("publicBooking.selectPaymentMethodTitle")}
                    </h2>
                    <p className="text-gray-600">
                      {t("publicBooking.howToPayForAppointment")}
                    </p>
                  </div>

                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>{t("publicBooking.paymentOptions")}</CardTitle>
                      <CardDescription>
                        {t("publicBooking.choosePreferredPayment")}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentSettings?.cardEnabled && (
                          <Card
                            className={`cursor-pointer service-card-hover border-2 ${
                              paymentMethod === "stripe"
                                ? "ring-4 ring-[var(--booking-accent)]/30 border-[var(--booking-accent)] shadow-xl"
                                : "hover:shadow-lg hover:border-gray-300"
                            }`}
                            onClick={() => setPaymentMethod("stripe")}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                  <CreditCard className="h-7 w-7 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg mb-1">{t("publicBooking.card")}</h3>
                                  <p className="text-sm text-gray-600">
                                    Visa, Mastercard, Amex
                                  </p>
                                </div>
                                {paymentMethod === "stripe" && (
                                  <Check className="h-6 w-6 text-[var(--booking-accent)]" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {paymentSettings?.vippsEnabled && (
                          <Card
                            className={`cursor-pointer service-card-hover border-2 ${
                              paymentMethod === "vipps"
                                ? "ring-4 ring-[var(--booking-accent)]/30 border-[var(--booking-accent)] shadow-xl"
                                : "hover:shadow-lg hover:border-gray-300"
                            }`}
                            onClick={() => setPaymentMethod("vipps")}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                                  <Smartphone className="h-7 w-7 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg mb-1">Vipps</h3>
                                  <p className="text-sm text-gray-600">
                                    {t("publicBooking.vippsDescription")}
                                  </p>
                                </div>
                                {paymentMethod === "vipps" && (
                                  <Check className="h-6 w-6 text-[var(--booking-accent)]" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {paymentSettings?.cashEnabled && (
                          <Card
                            className={`cursor-pointer service-card-hover border-2 ${
                              paymentMethod === "cash"
                                ? "ring-4 ring-[var(--booking-accent)]/30 border-[var(--booking-accent)] shadow-xl"
                                : "hover:shadow-lg hover:border-gray-300"
                            }`}
                            onClick={() => setPaymentMethod("cash")}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                  <span className="text-white font-bold text-xl">kr</span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg mb-1">{t("publicBooking.cash")}</h3>
                                  <p className="text-sm text-gray-600">
                                    {t("publicBooking.payWithCash")}
                                  </p>
                                </div>
                                {paymentMethod === "cash" && (
                                  <Check className="h-6 w-6 text-[var(--booking-accent)]" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {paymentSettings?.payAtSalonEnabled && (
                          <Card
                            className={`cursor-pointer service-card-hover border-2 ${
                              paymentMethod === "pay_at_salon"
                                ? "ring-4 ring-[var(--booking-accent)]/30 border-[var(--booking-accent)] shadow-xl"
                                : "hover:shadow-lg hover:border-gray-300"
                            }`}
                            onClick={() => setPaymentMethod("pay_at_salon")}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                  <MapPin className="h-7 w-7 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg mb-1">
                                    {t("publicBooking.payAtSalon")}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {t("publicBooking.payAfterTreatment")}
                                  </p>
                                </div>
                                {paymentMethod === "pay_at_salon" && (
                                  <Check className="h-6 w-6 text-[var(--booking-accent)]" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Payment Summary */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mt-6 border-2 border-blue-100">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium text-lg">
                            {t("publicBooking.totalAmount")}{" "}
                            <span className="text-xs font-normal text-gray-500">
                              {t("publicBooking.inclVat")}
                            </span>
                            :
                          </span>
                          <span className="text-3xl font-bold text-[var(--booking-primary)]">
                            {selectedServiceData
                              ? formatKr(toGross(Number(selectedServiceData.price)))
                              : "0 kr"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitBooking}
                      disabled={
                        !paymentMethod ||
                        createBookingMutation.isPending ||
                        createBookingWithPaymentMutation.isPending ||
                        createVippsPaymentMutation.isPending
                      }
                      className="bg-gradient-to-r from-[var(--booking-accent)] to-[var(--booking-primary)] hover:opacity-90 text-white shadow-lg px-8 py-6 text-lg"
                      size="lg"
                    >
                      {createBookingMutation.isPending ||
                      createBookingWithPaymentMutation.isPending ||
                      createVippsPaymentMutation.isPending
                        ? t("publicBooking.processing")
                        : t("publicBooking.goToPayment")}
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 6: Confirmation */}
              {currentStep === "confirmation" && (
                <div className="space-y-6">
                  <Card className="border-green-500 border-2 shadow-2xl">
                    <CardHeader className="text-center pb-6">
                      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <Check className="h-10 w-10 text-white" />
                      </div>
                      <CardTitle className="text-3xl text-green-700 mb-2">
                        {t("publicBooking.bookingConfirmed")}
                      </CardTitle>
                      <CardDescription className="text-lg">
                        {t("publicBooking.appointmentReserved")}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl space-y-4 border-2 border-green-100">
                        <h3 className="font-bold text-xl text-gray-900 mb-4">
                          {t("publicBooking.appointmentDetails")}
                        </h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-green-200">
                            <span className="text-gray-600 flex items-center gap-2">
                              <Scissors className="h-4 w-4" />
                              {t("publicBooking.serviceLabel")}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {selectedServiceData?.name}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-2 border-b border-green-200">
                            <span className="text-gray-600 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {t("publicBooking.hairdresserLabel")}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {selectedEmployeeData
                                ? selectedEmployeeData.name
                                : t("publicBooking.noPreference")}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-2 border-b border-green-200">
                            <span className="text-gray-600 flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {t("publicBooking.dateLabel")}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {selectedDate &&
                                format(selectedDate, "d. MMMM yyyy", {
                                  locale: nb,
                                })}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-2 border-b border-green-200">
                            <span className="text-gray-600 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {t("publicBooking.timeLabel")}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {selectedTime?.substring(0, 5)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-3 bg-white rounded-lg px-4 mt-4">
                            <span className="text-lg font-bold text-gray-900">
                              {t("publicBooking.price")}{" "}
                              <span className="text-sm font-normal text-gray-600">
                                {t("publicBooking.inclVat")}
                              </span>
                              :
                            </span>
                            <span className="text-2xl font-bold text-[var(--booking-primary)]">
                              {selectedServiceData
                                ? formatKr(toGross(Number(selectedServiceData.price)))
                                : "0 kr"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>{t("publicBooking.confirmationSent")}</strong> {t("publicBooking.confirmationSentDetails")}
                        </p>
                      </div>

                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="w-full h-12 text-base"
                      >
                        {t("publicBooking.bookNewAppointment")}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Sidebar summary */}
            {currentStep !== "service" && currentStep !== "confirmation" && (
              <div className="lg:col-span-1">
                <Card className="sticky top-24 shadow-xl border-2">
                  <CardHeader className="bg-gradient-to-r from-[var(--booking-primary)] to-[var(--booking-accent)] text-white rounded-t-lg">
                    <CardTitle className="text-xl">{t("publicBooking.yourBooking")}</CardTitle>
                    <CardDescription className="text-blue-100">
                      {t("publicBooking.summaryOfChoices")}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-6">
                    {selectedServiceData && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Scissors className="h-4 w-4" />
                          <span className="font-medium">{t("publicBooking.service")}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-semibold text-gray-900">
                            {selectedServiceData.name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedServiceData.durationMinutes} {t("publicBooking.minutes")}
                          </p>
                        </div>
                      </div>
                    )}

                    {(selectedEmployee !== null || currentStep === "employee") && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{t("publicBooking.hairdresser")}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-semibold text-gray-900">
                            {selectedEmployeeData
                              ? selectedEmployeeData.name
                              : t("publicBooking.noPreference")}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedDate && selectedTime && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4" />
                          <span className="font-medium">{t("publicBooking.dateAndTime")}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-semibold text-gray-900">
                            {format(selectedDate, "EEEE d. MMMM", { locale: nb })}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {t("publicBooking.at")} {selectedTime.substring(0, 5)}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedServiceData && (
                      <div className="pt-4 border-t-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">
                            {t("publicBooking.total")}{" "}
                            <span className="text-sm font-normal text-gray-600">
                              {t("publicBooking.inclVat")}
                            </span>
                            :
                          </span>
                          <span className="text-2xl font-bold text-[var(--booking-primary)]">
                            {formatKr(toGross(Number(selectedServiceData.price)))}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
