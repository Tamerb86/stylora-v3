import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Users,
  Filter,
  Calendar,
  MessageSquare,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

export function BulkMessaging() {
  const { t } = useTranslation();
  const [messageType, setMessageType] = useState<"sms" | "email">("sms");
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [filterType, setFilterType] = useState<
    "all" | "recent" | "high_value" | "inactive"
  >("all");
  const [lastVisitDays, setLastVisitDays] = useState(30);
  const [minTotalSpent, setMinTotalSpent] = useState(1000);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Fetch customers based on filter
  const { data: customers = [], refetch: refetchCustomers } =
    trpc.communications.getCustomersForBulk.useQuery({
      filter: filterType,
      lastVisitDays:
        filterType === "recent" || filterType === "inactive"
          ? lastVisitDays
          : undefined,
      minTotalSpent: filterType === "high_value" ? minTotalSpent : undefined,
    });

  // Fetch templates
  const { data: smsTemplates = [] } =
    trpc.communications.listTemplates.useQuery({ type: "sms" });
  const { data: emailTemplates = [] } =
    trpc.communications.listTemplates.useQuery({ type: "email" });

  // Mutation
  const createCampaignMutation =
    trpc.communications.createBulkCampaign.useMutation();

  const templates = messageType === "sms" ? smsTemplates : emailTemplates;

  const handleFilterChange = (value: string) => {
    setFilterType(value as any);
    setSelectedCustomers([]);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t: any) => t.id.toString() === templateId);
    if (template) {
      setContent(template.content);
      if (messageType === "email" && template.subject) {
        setSubject(template.subject);
      }
    }
  };

  const handleToggleCustomer = (customerId: number) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map((c: any) => c.id));
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignName) {
      toast.error(t("bulkMessaging.errorNoName"));
      return;
    }

    if (!content) {
      toast.error(t("bulkMessaging.errorNoContent"));
      return;
    }

    if (selectedCustomers.length === 0) {
      toast.error(t("bulkMessaging.errorNoCustomer"));
      return;
    }

    if (messageType === "email" && !subject) {
      toast.error(t("bulkMessaging.errorNoSubject"));
      return;
    }

    try {
      let scheduledAt: Date | undefined;
      if (scheduleDate && scheduleTime) {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      }

      await createCampaignMutation.mutateAsync({
        name: campaignName,
        type: messageType,
        templateId: selectedTemplate ? parseInt(selectedTemplate) : undefined,
        subject: messageType === "email" ? subject : undefined,
        content,
        customerIds: selectedCustomers,
        scheduledAt,
      });

      toast.success(
        scheduledAt
          ? t("bulkMessaging.campaignScheduled")
          : t("bulkMessaging.campaignCreated")
      );

      // Reset form
      setCampaignName("");
      setSubject("");
      setContent("");
      setSelectedTemplate("");
      setSelectedCustomers([]);
      setScheduleDate("");
      setScheduleTime("");
    } catch (error) {
      toast.error(t("bulkMessaging.errorCreate"));
    }
  };

  const filteredCustomers = customers.filter((customer: any) => {
    if (messageType === "sms") {
      return customer.phone;
    } else {
      return customer.email;
    }
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("bulkMessaging.title")}</h1>
          <p className="text-muted-foreground">
            {t("bulkMessaging.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Campaign Setup */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("bulkMessaging.campaignDetails")}</CardTitle>
                <CardDescription>
                  {t("bulkMessaging.campaignDetailsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaignName">{t("bulkMessaging.campaignName")}</Label>
                  <Input
                    id="campaignName"
                    value={campaignName}
                    onChange={e => setCampaignName(e.target.value)}
                    placeholder={t("bulkMessaging.campaignNamePlaceholder")}
                  />
                </div>

                <Tabs
                  value={messageType}
                  onValueChange={v => setMessageType(v as any)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sms">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS
                    </TabsTrigger>
                    <TabsTrigger value="email">
                      <Mail className="h-4 w-4 mr-2" />
                      {t("bulkMessaging.email")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sms" className="space-y-4 mt-4">
                    {smsTemplates.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="smsTemplate">
                          {t("bulkMessaging.selectTemplate")}
                        </Label>
                        <Select
                          value={selectedTemplate}
                          onValueChange={handleTemplateSelect}
                        >
                          <SelectTrigger id="smsTemplate">
                            <SelectValue placeholder={t("bulkMessaging.selectTemplatePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {smsTemplates.map((template: any) => (
                              <SelectItem
                                key={template.id}
                                value={template.id.toString()}
                              >
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="smsContent">{t("bulkMessaging.smsContent")}</Label>
                      <Textarea
                        id="smsContent"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={t("bulkMessaging.smsContentPlaceholder")}
                        rows={5}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("bulkMessaging.charCount", { count: content.length })}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4 mt-4">
                    {emailTemplates.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="emailTemplate">
                          {t("bulkMessaging.selectTemplate")}
                        </Label>
                        <Select
                          value={selectedTemplate}
                          onValueChange={handleTemplateSelect}
                        >
                          <SelectTrigger id="emailTemplate">
                            <SelectValue placeholder={t("bulkMessaging.selectTemplatePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {emailTemplates.map((template: any) => (
                              <SelectItem
                                key={template.id}
                                value={template.id.toString()}
                              >
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="emailSubject">{t("bulkMessaging.subject")}</Label>
                      <Input
                        id="emailSubject"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder={t("bulkMessaging.subjectPlaceholder")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emailContent">{t("bulkMessaging.emailContent")}</Label>
                      <Textarea
                        id="emailContent"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={t("bulkMessaging.emailContentPlaceholder")}
                        rows={10}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">
                    {t("bulkMessaging.scheduleSending")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduleDate">{t("bulkMessaging.date")}</Label>
                      <Input
                        id="scheduleDate"
                        type="date"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduleTime">{t("bulkMessaging.time")}</Label>
                      <Input
                        id="scheduleTime"
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                  {scheduleDate && scheduleTime && (
                    <p className="text-sm text-muted-foreground">
                      Meldinger vil sendes:{" "}
                      {new Date(
                        `${scheduleDate}T${scheduleTime}`
                      ).toLocaleString("no-NO")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Customer Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("bulkMessaging.recipients")}</CardTitle>
                <CardDescription>
                  {t("bulkMessaging.recipientsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="filterType">{t("bulkMessaging.filter")}</Label>
                  <Select value={filterType} onValueChange={handleFilterChange}>
                    <SelectTrigger id="filterType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("bulkMessaging.filterAll")}</SelectItem>
                      <SelectItem value="recent">{t("bulkMessaging.filterRecent")}</SelectItem>
                      <SelectItem value="high_value">{t("bulkMessaging.filterHighValue")}</SelectItem>
                      <SelectItem value="inactive">{t("bulkMessaging.filterInactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filterType === "recent" || filterType === "inactive" ? (
                  <div className="space-y-2">
                    <Label htmlFor="lastVisitDays">{t("bulkMessaging.lastVisitDays")}</Label>
                    <Input
                      id="lastVisitDays"
                      type="number"
                      value={lastVisitDays}
                      onChange={e => setLastVisitDays(parseInt(e.target.value))}
                      min={1}
                    />
                  </div>
                ) : null}

                {filterType === "high_value" && (
                  <div className="space-y-2">
                    <Label htmlFor="minTotalSpent">
                      {t("bulkMessaging.minTotalSpent")}
                    </Label>
                    <Input
                      id="minTotalSpent"
                      type="number"
                      value={minTotalSpent}
                      onChange={e => setMinTotalSpent(parseInt(e.target.value))}
                      min={0}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">
                    {t("bulkMessaging.selectedCount", {
                      selected: selectedCustomers.length,
                      total: filteredCustomers.length,
                    })}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedCustomers.length === filteredCustomers.length
                      ? t("bulkMessaging.deselectAll")
                      : t("bulkMessaging.selectAll")}
                  </Button>
                </div>

                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t("bulkMessaging.noCustomers")}
                    </p>
                  ) : (
                    <div className="divide-y">
                      {filteredCustomers.map((customer: any) => (
                        <div
                          key={customer.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleToggleCustomer(customer.id)}
                        >
                          <Checkbox
                            checked={selectedCustomers.includes(customer.id)}
                            onCheckedChange={() =>
                              handleToggleCustomer(customer.id)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {customer.firstName} {customer.lastName || ""}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {messageType === "sms"
                                ? customer.phone
                                : customer.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSendCampaign}
                  className="w-full"
                  disabled={
                    selectedCustomers.length === 0 ||
                    !content ||
                    createCampaignMutation.isPending
                  }
                >
                  {createCampaignMutation.isPending ? (
                    t("bulkMessaging.creating")
                  ) : scheduleDate && scheduleTime ? (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      {t("bulkMessaging.scheduleCampaign")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("bulkMessaging.sendNow")}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
