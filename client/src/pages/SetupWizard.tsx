import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Scissors,
  Users,
  Clock,
  PartyPopper,
  Check,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";

type WizardStep = "welcome" | "service" | "employee" | "hours" | "complete";

const WORK_DAYS = [
  { value: 1, labelKey: "setupWizard.days.monday" },
  { value: 2, labelKey: "setupWizard.days.tuesday" },
  { value: 3, labelKey: "setupWizard.days.wednesday" },
  { value: 4, labelKey: "setupWizard.days.thursday" },
  { value: 5, labelKey: "setupWizard.days.friday" },
  { value: 6, labelKey: "setupWizard.days.saturday" },
  { value: 0, labelKey: "setupWizard.days.sunday" },
];

export default function SetupWizard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Service form state
  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");

  // Employee form state
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [employeeCommission, setEmployeeCommission] = useState("40");
  const [skipEmployee, setSkipEmployee] = useState(false);

  // Business hours state
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri

  const wizardStatus = trpc.wizard.getStatus.useQuery();
  const draftData = trpc.wizard.getDraftData.useQuery();
  const saveDraft = trpc.wizard.saveDraftData.useMutation();
  const updateStep = trpc.wizard.updateStep.useMutation();
  const addService = trpc.wizard.addFirstService.useMutation();
  const addEmployee = trpc.wizard.addFirstEmployee.useMutation();
  const setBusinessHours = trpc.wizard.setBusinessHours.useMutation();
  const completeWizard = trpc.wizard.complete.useMutation();
  const skipWizard = trpc.wizard.skip.useMutation();

  // Initialize wizard step from database
  useEffect(() => {
    if (wizardStatus.data?.onboardingStep) {
      setCurrentStep(wizardStatus.data.onboardingStep as WizardStep);
    }
  }, [wizardStatus.data]);

  // Restore draft data on load
  useEffect(() => {
    if (draftData.data) {
      const draft = draftData.data as any;
      if (draft.serviceName) setServiceName(draft.serviceName);
      if (draft.serviceDuration) setServiceDuration(draft.serviceDuration);
      if (draft.servicePrice) setServicePrice(draft.servicePrice);
      if (draft.serviceDescription)
        setServiceDescription(draft.serviceDescription);
      if (draft.employeeName) setEmployeeName(draft.employeeName);
      if (draft.employeeEmail) setEmployeeEmail(draft.employeeEmail);
      if (draft.employeePhone) setEmployeePhone(draft.employeePhone);
      if (draft.employeeCommission)
        setEmployeeCommission(draft.employeeCommission);
      if (draft.skipEmployee !== undefined) setSkipEmployee(draft.skipEmployee);
      if (draft.openTime) setOpenTime(draft.openTime);
      if (draft.closeTime) setCloseTime(draft.closeTime);
      if (draft.workDays) setWorkDays(draft.workDays);
    }
  }, [draftData.data]);

  // Track unsaved changes
  useEffect(() => {
    if (currentStep !== "welcome" && currentStep !== "complete") {
      setHasUnsavedChanges(true);
    }
  }, [
    currentStep,
    serviceName,
    serviceDuration,
    servicePrice,
    serviceDescription,
    employeeName,
    employeeEmail,
    employeePhone,
    employeeCommission,
    skipEmployee,
    openTime,
    closeTime,
    workDays,
  ]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && currentStep !== "complete") {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, currentStep]);

  // Auto-save draft data with debouncing
  useEffect(() => {
    // Skip auto-save on welcome and complete steps
    if (currentStep === "welcome" || currentStep === "complete") {
      return;
    }

    setSaveStatus("saving");
    const timeoutId = setTimeout(() => {
      saveDraft.mutate(
        {
          serviceName,
          serviceDuration,
          servicePrice,
          serviceDescription,
          employeeName,
          employeeEmail,
          employeePhone,
          employeeCommission,
          skipEmployee,
          openTime,
          closeTime,
          workDays,
        },
        {
          onSuccess: () => {
            setSaveStatus("saved");
            setHasUnsavedChanges(false);
            // Reset to idle after 2 seconds
            setTimeout(() => setSaveStatus("idle"), 2000);
          },
          onError: () => {
            setSaveStatus("idle");
          },
        }
      );
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [
    currentStep,
    serviceName,
    serviceDuration,
    servicePrice,
    serviceDescription,
    employeeName,
    employeeEmail,
    employeePhone,
    employeeCommission,
    skipEmployee,
    openTime,
    closeTime,
    workDays,
  ]);

  const handleManualSave = () => {
    if (currentStep === "welcome" || currentStep === "complete") {
      return;
    }

    setSaveStatus("saving");
    saveDraft.mutate(
      {
        serviceName,
        serviceDuration,
        servicePrice,
        serviceDescription,
        employeeName,
        employeeEmail,
        employeePhone,
        employeeCommission,
        skipEmployee,
        openTime,
        closeTime,
        workDays,
      },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          setHasUnsavedChanges(false);
          toast.success("البيانات محفوظة");
          setTimeout(() => setSaveStatus("idle"), 2000);
        },
        onError: () => {
          setSaveStatus("idle");
          toast.error("فشل الحفظ - حاول مرة أخرى");
        },
      }
    );
  };

  const handleNext = async () => {
    if (currentStep === "welcome") {
      await updateStep.mutateAsync({ step: "service" });
      setCurrentStep("service");
    } else if (currentStep === "service") {
      // Validate service form
      if (!serviceName || !servicePrice) {
        toast.error(t("setupWizard.errors.fillRequired"));
        return;
      }

      try {
        await addService.mutateAsync({
          name: serviceName,
          duration: parseInt(serviceDuration),
          price: parseFloat(servicePrice),
          description: serviceDescription || undefined,
        });
        await updateStep.mutateAsync({ step: "employee" });
        setCurrentStep("employee");
        toast.success(t("setupWizard.toasts.serviceAdded"));
      } catch (error: any) {
        toast.error(t("setupWizard.errors.serviceAddFailed"), {
          description: error.message,
        });
      }
    } else if (currentStep === "employee") {
      if (!skipEmployee) {
        // Validate employee form
        if (!employeeName) {
          toast.error(t("setupWizard.errors.fillEmployeeName"));
          return;
        }

        try {
          await addEmployee.mutateAsync({
            name: employeeName,
            email: employeeEmail || undefined,
            phone: employeePhone || undefined,
            commissionRate: parseFloat(employeeCommission),
          });
          toast.success(t("setupWizard.toasts.employeeAdded"));
        } catch (error: any) {
          toast.error(t("setupWizard.errors.employeeAddFailed"), {
            description: error.message,
          });
          return;
        }
      }

      await updateStep.mutateAsync({ step: "hours" });
      setCurrentStep("hours");
    } else if (currentStep === "hours") {
      // Validate hours
      if (workDays.length === 0) {
        toast.error(t("setupWizard.errors.selectWorkDay"));
        return;
      }

      try {
        await setBusinessHours.mutateAsync({
          openTime,
          closeTime,
          workDays,
        });
        await completeWizard.mutateAsync();
        // Clear draft data after completion
        await saveDraft.mutateAsync({});
        setCurrentStep("complete");
        toast.success(t("setupWizard.toasts.setupComplete"));
      } catch (error: any) {
        toast.error(t("setupWizard.errors.hoursSaveFailed"), {
          description: error.message,
        });
      }
    } else if (currentStep === "complete") {
      setLocation("/dashboard");
    }
  };

  const handleBack = () => {
    if (currentStep === "service") {
      setCurrentStep("welcome");
    } else if (currentStep === "employee") {
      setCurrentStep("service");
    } else if (currentStep === "hours") {
      setCurrentStep("employee");
    }
  };

  const handleSkip = async () => {
    try {
      await skipWizard.mutateAsync();
      toast.success(t("setupWizard.toasts.wizardSkipped"));
      setLocation("/dashboard");
    } catch (error: any) {
      toast.error(t("setupWizard.errors.wizardSkipFailed"), {
        description: error.message,
      });
    }
  };

  const toggleWorkDay = (day: number) => {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const getStepNumber = () => {
    const steps = ["welcome", "service", "employee", "hours", "complete"];
    return steps.indexOf(currentStep) + 1;
  };

  const isLoading =
    updateStep.isPending ||
    addService.isPending ||
    addEmployee.isPending ||
    setBusinessHours.isPending ||
    completeWizard.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-orange-500 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            {t("setupWizard.header.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("setupWizard.header.subtitle")}
          </p>
        </div>

        {/* Progress indicator */}
        {currentStep !== "complete" && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t("setupWizard.progress.step", { current: getStepNumber() })}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {Math.round((getStepNumber() / 5) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-orange-500 transition-all duration-500"
                style={{ width: `${(getStepNumber() / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Card className="border-2 shadow-xl relative">
          {/* Auto-save status indicator and manual save button */}
          {currentStep !== "welcome" && currentStep !== "complete" && (
            <div className="absolute top-4 right-4 flex items-center gap-3">
              {/* Save status indicator */}
              {saveStatus !== "idle" && (
                <div className="flex items-center gap-2 text-sm animate-in fade-in duration-300">
                  {saveStatus === "saving" && (
                    <>
                      <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />
                      <span className="text-blue-600 font-medium">
                        جاري الحفظ...
                      </span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">
                        تم الحفظ
                      </span>
                    </>
                  )}
                </div>
              )}
              {/* Manual save button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualSave}
                disabled={saveStatus === "saving"}
                className="h-8 text-xs gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5" />
                حفظ الآن
              </Button>
            </div>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === "welcome" && (
                <Sparkles className="w-5 h-5 text-blue-600" />
              )}
              {currentStep === "service" && (
                <Scissors className="w-5 h-5 text-blue-600" />
              )}
              {currentStep === "employee" && (
                <Users className="w-5 h-5 text-blue-600" />
              )}
              {currentStep === "hours" && (
                <Clock className="w-5 h-5 text-blue-600" />
              )}
              {currentStep === "complete" && (
                <PartyPopper className="w-5 h-5 text-blue-600" />
              )}

              {currentStep === "welcome" && t("setupWizard.steps.welcome.cardTitle")}
              {currentStep === "service" && t("setupWizard.steps.service.cardTitle")}
              {currentStep === "employee" && t("setupWizard.steps.employee.cardTitle")}
              {currentStep === "hours" && t("setupWizard.steps.hours.cardTitle")}
              {currentStep === "complete" && t("setupWizard.steps.complete.cardTitle")}
            </CardTitle>
            <CardDescription>
              {currentStep === "welcome" &&
                t("setupWizard.steps.welcome.cardDescription")}
              {currentStep === "service" && t("setupWizard.steps.service.cardDescription")}
              {currentStep === "employee" && t("setupWizard.steps.employee.cardDescription")}
              {currentStep === "hours" && t("setupWizard.steps.hours.cardDescription")}
              {currentStep === "complete" && t("setupWizard.steps.complete.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Welcome Step */}
            {currentStep === "welcome" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">
                    {t("setupWizard.welcome.whatHappensNow")}
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {t("setupWizard.welcome.item1")}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {t("setupWizard.welcome.item2")}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{t("setupWizard.welcome.item3")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{t("setupWizard.welcome.item4")}</span>
                    </li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {t("setupWizard.welcome.footer")}
                </p>
              </div>
            )}

            {/* Service Step */}
            {currentStep === "service" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceName">
                    {t("setupWizard.service.nameLabel")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serviceName"
                    placeholder={t("setupWizard.service.namePlaceholder")}
                    value={serviceName}
                    onChange={e => setServiceName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceDuration">
                      {t("setupWizard.service.durationLabel")}{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="serviceDuration"
                      type="number"
                      placeholder="30"
                      value={serviceDuration}
                      onChange={e => setServiceDuration(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="servicePrice">
                      {t("setupWizard.service.priceLabel")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="servicePrice"
                      type="number"
                      placeholder="350"
                      value={servicePrice}
                      onChange={e => setServicePrice(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceDescription">
                    {t("setupWizard.service.descriptionLabel")}
                  </Label>
                  <Input
                    id="serviceDescription"
                    placeholder={t("setupWizard.service.descriptionPlaceholder")}
                    value={serviceDescription}
                    onChange={e => setServiceDescription(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Employee Step */}
            {currentStep === "employee" && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <Checkbox
                    id="skipEmployee"
                    checked={skipEmployee}
                    onCheckedChange={checked =>
                      setSkipEmployee(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="skipEmployee"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {t("setupWizard.employee.workAlone")}
                  </label>
                </div>

                {!skipEmployee && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="employeeName">
                        {t("setupWizard.employee.nameLabel")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="employeeName"
                        placeholder={t("setupWizard.employee.namePlaceholder")}
                        value={employeeName}
                        onChange={e => setEmployeeName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employeeEmail">{t("setupWizard.employee.emailLabel")}</Label>
                      <Input
                        id="employeeEmail"
                        type="email"
                        placeholder="ole@example.com"
                        value={employeeEmail}
                        onChange={e => setEmployeeEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employeePhone">{t("setupWizard.employee.phoneLabel")}</Label>
                      <Input
                        id="employeePhone"
                        type="tel"
                        placeholder="+47 123 45 678"
                        value={employeePhone}
                        onChange={e => setEmployeePhone(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employeeCommission">{t("setupWizard.employee.commissionLabel")}</Label>
                      <Input
                        id="employeeCommission"
                        type="number"
                        placeholder="40"
                        value={employeeCommission}
                        onChange={e => setEmployeeCommission(e.target.value)}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("setupWizard.employee.commissionHint")}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Hours Step */}
            {currentStep === "hours" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openTime">{t("setupWizard.hours.openLabel")}</Label>
                    <Input
                      id="openTime"
                      type="time"
                      value={openTime}
                      onChange={e => setOpenTime(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="closeTime">{t("setupWizard.hours.closeLabel")}</Label>
                    <Input
                      id="closeTime"
                      type="time"
                      value={closeTime}
                      onChange={e => setCloseTime(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("setupWizard.hours.workDaysLabel")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {WORK_DAYS.map(day => (
                      <div
                        key={day.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={workDays.includes(day.value)}
                          onCheckedChange={() => toggleWorkDay(day.value)}
                          disabled={isLoading}
                        />
                        <label
                          htmlFor={`day-${day.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {t(day.labelKey)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("setupWizard.hours.hint")}
                </p>
              </div>
            )}

            {/* Complete Step */}
            {currentStep === "complete" && (
              <div className="space-y-6 text-center py-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">{t("setupWizard.complete.congrats")}</h3>
                  <p className="text-muted-foreground">
                    {t("setupWizard.complete.description")}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    {t("setupWizard.complete.nextStepsTitle")}
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1 text-left">
                    <li>• {t("setupWizard.complete.nextStep1")}</li>
                    <li>• {t("setupWizard.complete.nextStep2")}</li>
                    <li>• {t("setupWizard.complete.nextStep3")}</li>
                    <li>• {t("setupWizard.complete.nextStep4")}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-6 border-t">
              <div>
                {currentStep !== "welcome" && currentStep !== "complete" && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("setupWizard.nav.back")}
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {currentStep !== "complete" && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={isLoading || skipWizard.isPending}
                  >
                    {t("setupWizard.nav.skip")}
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("setupWizard.nav.pleaseWait")}
                    </>
                  ) : currentStep === "complete" ? (
                    <>
                      {t("setupWizard.nav.goToDashboard")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      {t("setupWizard.nav.next")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
