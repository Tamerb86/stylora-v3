import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Edit, Send, RotateCcw, Upload, Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

type TemplateType =
  | "reminder_24h"
  | "reminder_2h"
  | "booking_confirmation"
  | "booking_cancellation"
  | "booking_update";

interface TemplateInfo {
  type: TemplateType;
  titleKey: string;
  descriptionKey: string;
  icon: string;
}

const templateTypes: TemplateInfo[] = [
  {
    type: "reminder_24h",
    titleKey: "emailTemplates.reminder24hTitle",
    descriptionKey: "emailTemplates.reminder24hDescription",
    icon: "🕐",
  },
  {
    type: "reminder_2h",
    titleKey: "emailTemplates.reminder2hTitle",
    descriptionKey: "emailTemplates.reminder2hDescription",
    icon: "⏰",
  },
  {
    type: "booking_confirmation",
    titleKey: "emailTemplates.bookingConfirmationTitle",
    descriptionKey: "emailTemplates.bookingConfirmationDescription",
    icon: "✅",
  },
  {
    type: "booking_cancellation",
    titleKey: "emailTemplates.bookingCancellationTitle",
    descriptionKey: "emailTemplates.bookingCancellationDescription",
    icon: "❌",
  },
  {
    type: "booking_update",
    titleKey: "emailTemplates.bookingUpdateTitle",
    descriptionKey: "emailTemplates.bookingUpdateDescription",
    icon: "🔄",
  },
];

export function EmailTemplates() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Form state
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#8b5cf6");
  const [secondaryColor, setSecondaryColor] = useState("#6366f1");

  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.emailTemplates.list.useQuery();

  const updateMutation = trpc.emailTemplates.update.useMutation({
    onSuccess: () => {
      toast({
        title: t("emailTemplates.templateUpdatedTitle"),
        description: t("emailTemplates.templateUpdatedDescription"),
      });
      utils.emailTemplates.list.invalidate();
      setEditDialogOpen(false);
    },
    onError: error => {
      toast({
        title: t("emailTemplates.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadLogoMutation = trpc.emailTemplates.uploadLogo.useMutation({
    onSuccess: data => {
      setLogoUrl(data.url);
      toast({
        title: t("emailTemplates.logoUploadedTitle"),
        description: t("emailTemplates.logoUploadedDescription"),
      });
    },
    onError: error => {
      toast({
        title: t("emailTemplates.uploadErrorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendTestMutation = trpc.emailTemplates.sendTest.useMutation({
    onSuccess: () => {
      toast({
        title: t("emailTemplates.testEmailSentTitle"),
        description: t("emailTemplates.testEmailSentDescription", {
          email: testEmail,
        }),
      });
      setTestEmailDialogOpen(false);
      setTestEmail("");
    },
    onError: error => {
      toast({
        title: t("emailTemplates.sendErrorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetMutation = trpc.emailTemplates.resetToDefault.useMutation({
    onSuccess: () => {
      toast({
        title: t("emailTemplates.templateResetTitle"),
        description: t("emailTemplates.templateResetDescription"),
      });
      utils.emailTemplates.list.invalidate();
      setEditDialogOpen(false);
    },
    onError: error => {
      toast({
        title: t("emailTemplates.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditTemplate = async (type: TemplateType) => {
    setSelectedTemplate(type);

    // Get existing template or use defaults
    const existing = templates?.find(t => t.templateType === type);
    if (existing) {
      setSubject(existing.subject);
      setBodyHtml(existing.bodyHtml);
      setLogoUrl(existing.logoUrl || "");
      setPrimaryColor(existing.primaryColor || "#8b5cf6");
      setSecondaryColor(existing.secondaryColor || "#6366f1");
    } else {
      // Set defaults
      setSubject("");
      setBodyHtml("");
      setLogoUrl("");
      setPrimaryColor("#8b5cf6");
      setSecondaryColor("#6366f1");
    }

    setEditDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;

    updateMutation.mutate({
      templateType: selectedTemplate,
      subject,
      bodyHtml,
      logoUrl: logoUrl || undefined,
      primaryColor,
      secondaryColor,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("emailTemplates.invalidFileTypeTitle"),
        description: t("emailTemplates.invalidFileTypeDescription"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t("emailTemplates.fileTooLargeTitle"),
        description: t("emailTemplates.fileTooLargeDescription"),
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to S3
    const base64Reader = new FileReader();
    base64Reader.onloadend = () => {
      const base64 = (base64Reader.result as string).split(",")[1];
      uploadLogoMutation.mutate({
        fileName: file.name,
        fileType: file.type,
        base64Data: base64,
      });
    };
    base64Reader.readAsDataURL(file);
  };

  const handleSendTest = () => {
    if (!selectedTemplate || !testEmail) return;

    sendTestMutation.mutate({
      templateType: selectedTemplate,
      testEmail,
    });
  };

  const handleResetToDefault = () => {
    if (!selectedTemplate) return;

    if (
      confirm(t("emailTemplates.confirmReset"))
    ) {
      resetMutation.mutate({
        templateType: selectedTemplate,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">
            {t("emailTemplates.loading")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          {t("emailTemplates.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("emailTemplates.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templateTypes.map(template => {
          const existing = templates?.find(
            t => t.templateType === template.type
          );

          return (
            <Card
              key={template.type}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{template.icon}</div>
                    <div>
                      <CardTitle className="text-lg">
                        {t(template.titleKey)}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {t(template.descriptionKey)}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {existing ? (
                    <div className="text-sm text-muted-foreground mb-4">
                      <p className="font-medium">
                        {t("emailTemplates.subjectLabel")}
                      </p>
                      <p className="truncate">{existing.subject}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mb-4">
                      <p>{t("emailTemplates.noTemplateConfigured")}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditTemplate(template.type)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t("emailTemplates.edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template.type);
                        setTestEmailDialogOpen(true);
                      }}
                      disabled={!existing}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("emailTemplates.editTemplateTitle")}:{" "}
              {(() => {
                const tt = templateTypes.find(
                  x => x.type === selectedTemplate
                );
                return tt ? t(tt.titleKey) : "";
              })()}
            </DialogTitle>
            <DialogDescription>
              {t("emailTemplates.editTemplateDescription")}{" "}
              {`{{customerName}}`}, {`{{appointmentDate}}`},{" "}
              {`{{appointmentTime}}`}, {`{{serviceName}}`}, {`{{employeeName}}`}
              , {`{{salonName}}`}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">
                {t("emailTemplates.tabContent")}
              </TabsTrigger>
              <TabsTrigger value="design">
                {t("emailTemplates.tabDesign")}
              </TabsTrigger>
              <TabsTrigger value="preview">
                {t("emailTemplates.tabPreview")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="subject">
                  {t("emailTemplates.emailSubjectLabel")}
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={t("emailTemplates.emailSubjectPlaceholder")}
                />
              </div>

              <div>
                <Label htmlFor="bodyHtml">
                  {t("emailTemplates.emailBodyLabel")}
                </Label>
                <Textarea
                  id="bodyHtml"
                  value={bodyHtml}
                  onChange={e => setBodyHtml(e.target.value)}
                  placeholder={t("emailTemplates.emailBodyPlaceholder")}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="design" className="space-y-4">
              <div>
                <Label htmlFor="logo">{t("emailTemplates.logoLabel")}</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1"
                  />
                  {(logoPreview || logoUrl) && (
                    <img
                      src={logoPreview || logoUrl}
                      alt={t("emailTemplates.logoPreviewAlt")}
                      className="h-16 w-16 object-contain border rounded"
                    />
                  )}
                </div>
                {logoUrl && (
                  <p className="text-xs text-muted-foreground mt-1">
                    URL: {logoUrl}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">
                    {t("emailTemplates.primaryColorLabel")}
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      placeholder="#8b5cf6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondaryColor">
                    {t("emailTemplates.secondaryColorLabel")}
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="mb-4">
                  <p className="text-sm font-medium">
                    {t("emailTemplates.subjectLabel")}
                  </p>
                  <p className="text-lg">
                    {subject || t("emailTemplates.noSubject")}
                  </p>
                </div>
                {/*
                  Render the template in a fully sandboxed iframe (no
                  allow-scripts) instead of dangerouslySetInnerHTML. bodyHtml is
                  attacker-controllable (stored per tenant), so any <script> or
                  inline event handler in it must never execute in this app's
                  origin. The sandbox neutralizes scripts while still rendering
                  the HTML/CSS preview.
                */}
                <iframe
                  title={t("emailTemplates.previewTitle")}
                  sandbox=""
                  className="bg-white rounded border w-full"
                  style={{ height: 500 }}
                  srcDoc={bodyHtml
                    .replace(/{{primaryColor}}/g, primaryColor)
                    .replace(/{{secondaryColor}}/g, secondaryColor)
                    .replace(
                      /{{customerName}}/g,
                      t("emailTemplates.sampleCustomerName")
                    )
                    .replace(
                      /{{salonName}}/g,
                      t("emailTemplates.sampleSalonName")
                    )
                    .replace(
                      /{{appointmentDate}}/g,
                      t("emailTemplates.sampleAppointmentDate")
                    )
                    .replace(/{{appointmentTime}}/g, "14:00")
                    .replace(
                      /{{serviceName}}/g,
                      t("emailTemplates.sampleServiceName")
                    )
                    .replace(
                      /{{employeeName}}/g,
                      t("emailTemplates.sampleEmployeeName")
                    )}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleResetToDefault}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("emailTemplates.resetToDefault")}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                {t("emailTemplates.cancel")}
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={updateMutation.isPending || !subject || !bodyHtml}
              >
                {t("emailTemplates.saveTemplate")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Test Email Dialog */}
      <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("emailTemplates.sendTestEmailTitle")}</DialogTitle>
            <DialogDescription>
              {t("emailTemplates.sendTestEmailDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="testEmail">
                {t("emailTemplates.emailAddressLabel")}
              </Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder={t("emailTemplates.emailAddressPlaceholder")}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTestEmailDialogOpen(false)}
              >
                {t("emailTemplates.cancel")}
              </Button>
              <Button
                onClick={handleSendTest}
                disabled={sendTestMutation.isPending || !testEmail}
              >
                <Send className="h-4 w-4 mr-2" />
                {t("emailTemplates.sendTest")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
