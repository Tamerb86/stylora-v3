import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Gift,
  Settings as SettingsIcon,
  Plus,
  Percent,
  DollarSign,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Loyalty() {
  const { t } = useTranslation();
  const [showCreateReward, setShowCreateReward] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    pointsCost: "",
    discountType: "percentage" as "percentage" | "fixed_amount",
    discountValue: "",
    validityDays: "30",
  });

  const {
    data: rewards,
    isLoading: loadingRewards,
    refetch: refetchRewards,
  } = trpc.loyalty.listRewards.useQuery();
  const {
    data: settings,
    isLoading: loadingSettings,
    refetch: refetchSettings,
  } = trpc.loyalty.getSettings.useQuery();

  const createReward = trpc.loyalty.createReward.useMutation({
    onSuccess: () => {
      toast.success(t("loyalty.rewardCreated"));
      setShowCreateReward(false);
      setRewardForm({
        name: "",
        description: "",
        pointsCost: "",
        discountType: "percentage",
        discountValue: "",
        validityDays: "30",
      });
      refetchRewards();
    },
    onError: error => {
      toast.error(t("loyalty.error", { message: error.message }));
    },
  });

  const updateSettings = trpc.loyalty.updateSettings.useMutation({
    onSuccess: () => {
      toast.success(t("loyalty.settingsSaved"));
      refetchSettings();
    },
    onError: error => {
      toast.error(t("loyalty.error", { message: error.message }));
    },
  });

  const handleCreateReward = () => {
    if (
      !rewardForm.name ||
      !rewardForm.pointsCost ||
      !rewardForm.discountValue
    ) {
      toast.error(t("loyalty.fillRequiredFields"));
      return;
    }

    createReward.mutate({
      name: rewardForm.name,
      description: rewardForm.description || undefined,
      pointsCost: parseInt(rewardForm.pointsCost),
      discountType: rewardForm.discountType,
      discountValue: rewardForm.discountValue,
      validityDays: parseInt(rewardForm.validityDays),
    });
  };

  const handleUpdateSettings = (updates: {
    enabled?: boolean;
    pointsPerVisit?: number;
    pointsPerNOK?: number;
  }) => {
    if (!settings) return;

    updateSettings.mutate({
      enabled: updates.enabled ?? settings.enabled,
      pointsPerVisit: updates.pointsPerVisit ?? settings.pointsPerVisit,
      pointsPerNOK: updates.pointsPerNOK ?? settings.pointsPerNOK,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent mb-2">
            {t("loyalty.heading")}
          </h1>
          <p className="text-muted-foreground">
            {t("loyalty.subtitle")}
          </p>
        </div>

        <Tabs defaultValue="rewards" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rewards">
              <Gift className="w-4 h-4 mr-2" />
              {t("loyalty.rewardsTab")}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              {t("loyalty.settingsTab")}
            </TabsTrigger>
          </TabsList>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">
                  {t("loyalty.availableRewards")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("loyalty.availableRewardsDescription")}
                </p>
              </div>
              <Button
                onClick={() => setShowCreateReward(true)}
                className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("loyalty.newReward")}
              </Button>
            </div>

            {loadingRewards ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t("loyalty.loadingRewards")}
                </CardContent>
              </Card>
            ) : !rewards || rewards.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    {t("loyalty.noRewardsYet")}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("loyalty.createFirstReward")}
                  </p>
                  <Button
                    onClick={() => setShowCreateReward(true)}
                    className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("loyalty.createReward")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rewards.map(reward => (
                  <Card key={reward.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {reward.name}
                          </CardTitle>
                          {reward.description && (
                            <CardDescription className="mt-1">
                              {reward.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {t("loyalty.pointsCount", { count: reward.pointsCost })}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm">
                        {reward.discountType === "percentage" ? (
                          <>
                            <Percent className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {t("loyalty.percentDiscount", { value: reward.discountValue })}
                            </span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {t("loyalty.fixedDiscount", { value: reward.discountValue })}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t("loyalty.validForDays", { count: reward.validityDays ?? 0 })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("loyalty.settingsTitle")}</CardTitle>
                <CardDescription>
                  {t("loyalty.settingsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingSettings ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t("loyalty.loadingSettings")}
                  </p>
                ) : settings ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("loyalty.enableProgram")}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t("loyalty.enableProgramDescription")}
                        </p>
                      </div>
                      <Switch
                        checked={settings.enabled}
                        onCheckedChange={checked =>
                          handleUpdateSettings({ enabled: checked })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pointsPerVisit">{t("loyalty.pointsPerVisit")}</Label>
                      <Input
                        id="pointsPerVisit"
                        type="number"
                        min="0"
                        value={settings.pointsPerVisit}
                        onChange={e => {
                          const value = parseInt(e.target.value) || 0;
                          handleUpdateSettings({ pointsPerVisit: value });
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        {t("loyalty.pointsPerVisitDescription")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pointsPerNOK">{t("loyalty.pointsPerNOK")}</Label>
                      <Input
                        id="pointsPerNOK"
                        type="number"
                        min="0"
                        step="0.1"
                        value={settings.pointsPerNOK}
                        onChange={e => {
                          const value = parseFloat(e.target.value) || 0;
                          handleUpdateSettings({ pointsPerNOK: value });
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        {t("loyalty.pointsPerNOKDescription")}
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="font-medium mb-2">{t("loyalty.example")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("loyalty.exampleIntro")}{" "}
                        <strong>
                          {t("loyalty.pointsCount", {
                            count:
                              settings.pointsPerVisit +
                              Math.floor(500 * settings.pointsPerNOK),
                          })}
                        </strong>{" "}
                        {t("loyalty.exampleBreakdown", {
                          visit: settings.pointsPerVisit,
                          amount: Math.floor(500 * settings.pointsPerNOK),
                        })}
                      </p>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Reward Dialog */}
        <Dialog open={showCreateReward} onOpenChange={setShowCreateReward}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("loyalty.createDialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("loyalty.createDialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rewardName">{t("loyalty.fieldName")}</Label>
                <Input
                  id="rewardName"
                  value={rewardForm.name}
                  onChange={e =>
                    setRewardForm({ ...rewardForm, name: e.target.value })
                  }
                  placeholder={t("loyalty.fieldNamePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rewardDesc">{t("loyalty.fieldDescription")}</Label>
                <Textarea
                  id="rewardDesc"
                  value={rewardForm.description}
                  onChange={e =>
                    setRewardForm({
                      ...rewardForm,
                      description: e.target.value,
                    })
                  }
                  placeholder={t("loyalty.fieldDescriptionPlaceholder")}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pointsCost">{t("loyalty.fieldPointsCost")}</Label>
                <Input
                  id="pointsCost"
                  type="number"
                  min="1"
                  value={rewardForm.pointsCost}
                  onChange={e =>
                    setRewardForm({ ...rewardForm, pointsCost: e.target.value })
                  }
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountType">{t("loyalty.fieldDiscountType")}</Label>
                <Select
                  value={rewardForm.discountType}
                  onValueChange={(value: "percentage" | "fixed_amount") =>
                    setRewardForm({ ...rewardForm, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("loyalty.discountTypePercentage")}</SelectItem>
                    <SelectItem value="fixed_amount">
                      {t("loyalty.discountTypeFixed")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {t("loyalty.fieldDiscountValue")}{" "}
                  {rewardForm.discountType === "percentage" ? "(%)" : "(NOK)"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  step={rewardForm.discountType === "percentage" ? "1" : "0.01"}
                  value={rewardForm.discountValue}
                  onChange={e =>
                    setRewardForm({
                      ...rewardForm,
                      discountValue: e.target.value,
                    })
                  }
                  placeholder={
                    rewardForm.discountType === "percentage" ? "10" : "50.00"
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validityDays">{t("loyalty.fieldValidityDays")}</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="1"
                  value={rewardForm.validityDays}
                  onChange={e =>
                    setRewardForm({
                      ...rewardForm,
                      validityDays: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("loyalty.fieldValidityDaysHint")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateReward(false)}
              >
                {t("loyalty.cancel")}
              </Button>
              <Button
                onClick={handleCreateReward}
                disabled={createReward.isPending}
              >
                {createReward.isPending ? t("loyalty.creating") : t("loyalty.createReward")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
