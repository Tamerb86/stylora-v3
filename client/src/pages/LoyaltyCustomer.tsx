import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  Gift,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function LoyaltyCustomer() {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<
    "rewards" | "history" | "redemptions"
  >("rewards");
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);

  // Get tenant ID from URL or context
  const tenantId =
    new URLSearchParams(window.location.search).get("tenantId") ||
    "demo-tenant-stylora";

  // Fetch customer points
  const {
    data: pointsData,
    isLoading: pointsLoading,
    refetch: refetchPoints,
  } = trpc.loyaltyCustomer.getCustomerPoints.useQuery({
    tenantId,
  });

  // Fetch available rewards
  const { data: rewards = [], isLoading: rewardsLoading } =
    trpc.loyaltyCustomer.getAvailableRewards.useQuery({
      tenantId,
    });

  // Fetch transaction history
  const { data: transactions = [], isLoading: transactionsLoading } =
    trpc.loyaltyCustomer.getTransactionHistory.useQuery({
      tenantId,
    });

  // Fetch active redemptions
  const { data: redemptions = [], isLoading: redemptionsLoading } =
    trpc.loyaltyCustomer.getActiveRedemptions.useQuery({
      tenantId,
    });

  // Redeem reward mutation
  const redeemMutation = trpc.loyaltyCustomer.redeemReward.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      setRedeemDialogOpen(false);
      refetchPoints();
    },
    onError: error => {
      toast.error(error.message || "Failed to redeem reward");
    },
  });

  const handleRedeemClick = (reward: any) => {
    setSelectedReward(reward);
    setRedeemDialogOpen(true);
  };

  const handleRedeemConfirm = () => {
    if (selectedReward) {
      redeemMutation.mutate({
        tenantId,
        rewardId: selectedReward.id,
      });
    }
  };

  const currentPoints = pointsData?.currentPoints || 0;
  const lifetimePoints = pointsData?.lifetimePoints || 0;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header with Points Balance */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("loyaltyCustomer.heading")}</h1>
        <p className="text-gray-600">{t("loyaltyCustomer.subtitle")}</p>
      </div>

      {/* Points Card */}
      <Card className="mb-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">{t("loyaltyCustomer.yourPoints")}</p>
              <h2 className="text-5xl font-bold mb-2">{currentPoints}</h2>
              <p className="text-white/90 text-sm">
                <TrendingUp className="inline h-4 w-4 mr-1" />
                {t("loyaltyCustomer.lifetimePoints", { count: lifetimePoints })}
              </p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <Star className="h-12 w-12" fill="currentColor" />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20">
            <p className="text-white/90 text-sm">
              💡 {t("loyaltyCustomer.earnRate")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={v => setSelectedTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="rewards">
            <Gift className="h-4 w-4 mr-2" />
            {t("loyaltyCustomer.rewardsTab")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            {t("loyaltyCustomer.historyTab")}
          </TabsTrigger>
          <TabsTrigger value="redemptions">
            <Sparkles className="h-4 w-4 mr-2" />
            {t("loyaltyCustomer.redemptionsTab")}
          </TabsTrigger>
        </TabsList>

        {/* Rewards Tab */}
        <TabsContent value="rewards">
          {rewardsLoading ? (
            <div className="text-center py-12 text-gray-500">
              {t("loyaltyCustomer.loadingRewards")}
            </div>
          ) : rewards.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Gift className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">
                  {t("loyaltyCustomer.noRewards")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward: any) => {
                const canAfford = currentPoints >= reward.pointsCost;
                const discountText =
                  reward.discountType === "percentage"
                    ? t("loyaltyCustomer.percentDiscount", { value: reward.discountValue })
                    : t("loyaltyCustomer.fixedDiscount", { value: reward.discountValue });

                return (
                  <Card
                    key={reward.id}
                    className={!canAfford ? "opacity-60" : ""}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {reward.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {reward.description}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {t("loyaltyCustomer.pointsCount", { count: reward.pointsCost })}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="bg-purple-50 border border-purple-200 rounded-md p-3 text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {discountText}
                          </p>
                        </div>

                        <Button
                          className="w-full"
                          disabled={!canAfford}
                          onClick={() => handleRedeemClick(reward)}
                        >
                          {canAfford
                            ? t("loyaltyCustomer.redeem")
                            : t("loyaltyCustomer.needMorePoints", { count: reward.pointsCost - currentPoints })}
                        </Button>

                        <p className="text-xs text-gray-500 text-center">
                          {t("loyaltyCustomer.validForDays", { count: reward.validityDays })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {transactionsLoading ? (
            <div className="text-center py-12 text-gray-500">
              {t("loyaltyCustomer.loadingHistory")}
            </div>
          ) : transactions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">{t("loyaltyCustomer.noTransactions")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {transactions.map((transaction: any) => {
                    const isEarn = transaction.type === "earn";
                    const isPositive = transaction.points > 0;

                    return (
                      <div
                        key={transaction.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                isEarn
                                  ? "bg-green-100 text-green-600"
                                  : "bg-purple-100 text-purple-600"
                              }`}
                            >
                              {isEarn ? (
                                <TrendingUp className="h-5 w-5" />
                              ) : (
                                <Gift className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {transaction.reason}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(
                                  new Date(transaction.createdAt),
                                  "d. MMM yyyy 'kl.' HH:mm",
                                  { locale: nb }
                                )}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`text-lg font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}
                          >
                            {isPositive ? "+" : ""}
                            {transaction.points}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Redemptions Tab */}
        <TabsContent value="redemptions">
          {redemptionsLoading ? (
            <div className="text-center py-12 text-gray-500">
              {t("loyaltyCustomer.loadingRedemptions")}
            </div>
          ) : redemptions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">{t("loyaltyCustomer.noRedemptions")}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t("loyaltyCustomer.noRedemptionsHint")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {redemptions.map((redemption: any) => {
                const isExpired = new Date(redemption.expiresAt) < new Date();
                const discountText =
                  redemption.discountType === "percentage"
                    ? t("loyaltyCustomer.percentDiscount", { value: redemption.discountValue })
                    : t("loyaltyCustomer.fixedDiscount", { value: redemption.discountValue });

                return (
                  <Card
                    key={redemption.id}
                    className={isExpired ? "opacity-60" : ""}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {redemption.rewardName}
                          </CardTitle>
                          <CardDescription>
                            {redemption.rewardDescription}
                          </CardDescription>
                        </div>
                        <Badge variant={isExpired ? "destructive" : "default"}>
                          {isExpired ? t("loyaltyCustomer.expired") : t("loyaltyCustomer.active")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-md p-4">
                          <p className="text-xs text-gray-600 mb-1">
                            {t("loyaltyCustomer.couponCode")}
                          </p>
                          <p className="text-2xl font-mono font-bold text-purple-600 tracking-wider">
                            {redemption.code}
                          </p>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-md p-3 text-center">
                          <p className="text-xl font-bold text-purple-600">
                            {discountText}
                          </p>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>
                            <strong>{t("loyaltyCustomer.expires")}</strong>{" "}
                            {format(
                              new Date(redemption.expiresAt),
                              "d. MMM yyyy",
                              { locale: nb }
                            )}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {t("loyaltyCustomer.showCodeHint")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Redeem Confirmation Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("loyaltyCustomer.confirmRedemption")}</DialogTitle>
            <DialogDescription>
              {t("loyaltyCustomer.confirmRedemptionQuestion")}
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">{selectedReward.name}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {selectedReward.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t("loyaltyCustomer.cost")}</span>
                  <Badge variant="secondary">
                    {t("loyaltyCustomer.pointsCount", { count: selectedReward.pointsCost })}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">
                    {t("loyaltyCustomer.pointsAfter")}
                  </span>
                  <span className="font-semibold">
                    {t("loyaltyCustomer.pointsCount", { count: currentPoints - selectedReward.pointsCost })}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  {t("loyaltyCustomer.willReceiveCode", { count: selectedReward.validityDays })}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRedeemDialogOpen(false)}
            >
              {t("loyaltyCustomer.cancel")}
            </Button>
            <Button
              onClick={handleRedeemConfirm}
              disabled={redeemMutation.isPending}
            >
              {redeemMutation.isPending ? t("loyaltyCustomer.redeeming") : t("loyaltyCustomer.confirmRedemption")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
