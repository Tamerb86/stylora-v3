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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Plus, Trash2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function SalonHolidays() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date>();
  const [isRecurring, setIsRecurring] = useState(false);
  const [description, setDescription] = useState("");

  const { data: holidays, refetch } = trpc.holidays.list.useQuery();
  const createHoliday = trpc.holidays.create.useMutation({
    onSuccess: () => {
      toast.success(t("salonHolidays.added"));
      setIsDialogOpen(false);
      refetch();
      // Reset form
      setName("");
      setDate(undefined);
      setIsRecurring(false);
      setDescription("");
    },
    onError: error => {
      toast.error(error.message || t("salonHolidays.addFailed"));
    },
  });

  const deleteHoliday = trpc.holidays.delete.useMutation({
    onSuccess: () => {
      toast.success(t("salonHolidays.deleted"));
      refetch();
    },
    onError: error => {
      toast.error(error.message || t("salonHolidays.deleteFailed"));
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t("salonHolidays.nameRequired"));
      return;
    }
    if (!date) {
      toast.error(t("salonHolidays.dateRequired"));
      return;
    }

    createHoliday.mutate({
      name,
      date,
      isRecurring,
      description: description || undefined,
    });
  };

  const handleDelete = (id: number, holidayName: string) => {
    if (confirm(t("salonHolidays.confirmDelete", { name: holidayName }))) {
      deleteHoliday.mutate({ id });
    }
  };

  // Group holidays by year
  const groupedHolidays =
    holidays?.reduce((acc: any, holiday: any) => {
      const year = new Date(holiday.date).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(holiday);
      return acc;
    }, {}) || {};

  const sortedYears = Object.keys(groupedHolidays).sort(
    (a, b) => Number(b) - Number(a)
  );

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">{t("salonHolidays.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("salonHolidays.subtitle")}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-14 gap-2">
                <Plus className="h-5 w-5" />
                {t("salonHolidays.newHoliday")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("salonHolidays.dialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("salonHolidays.dialog.description")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>{t("salonHolidays.dialog.name")}</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t("salonHolidays.dialog.namePlaceholder")}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("salonHolidays.dialog.date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-12 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date
                          ? format(date, "PPP", { locale: nb })
                          : t("salonHolidays.dialog.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={checked =>
                      setIsRecurring(checked as boolean)
                    }
                  />
                  <Label htmlFor="recurring" className="cursor-pointer">
                    {t("salonHolidays.dialog.recurring")}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>{t("salonHolidays.dialog.descriptionLabel")}</Label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={t("salonHolidays.dialog.descriptionPlaceholder")}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t("salonHolidays.dialog.cancel")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createHoliday.isPending}
                >
                  {createHoliday.isPending
                    ? t("salonHolidays.dialog.adding")
                    : t("salonHolidays.dialog.submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Holidays List */}
        {!holidays || holidays.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{t("salonHolidays.empty.title")}</p>
                <p className="text-sm mt-2">
                  {t("salonHolidays.empty.hint")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedYears.map(year => (
              <Card key={year}>
                <CardHeader>
                  <CardTitle>{year}</CardTitle>
                  <CardDescription>
                    {t("salonHolidays.holidayCount", {
                      count: groupedHolidays[year].length,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupedHolidays[year]
                      .sort(
                        (a: any, b: any) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime()
                      )
                      .map((holiday: any) => (
                        <div
                          key={holiday.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-semibold text-lg">
                                {holiday.name}
                              </span>
                              {holiday.isRecurring && (
                                <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  {t("salonHolidays.recurringBadge")}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(
                                new Date(holiday.date),
                                "EEEE, d. MMMM yyyy",
                                { locale: nb }
                              )}
                            </div>
                            {holiday.description && (
                              <div className="text-sm mt-2 text-muted-foreground">
                                {holiday.description}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() =>
                              handleDelete(holiday.id, holiday.name)
                            }
                            disabled={deleteHoliday.isPending}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Common Norwegian Holidays Suggestion */}
        {(!holidays || holidays.length === 0) && (
          <Card className="mt-6 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                {t("salonHolidays.suggestions.title")}
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                {t("salonHolidays.suggestions.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm text-blue-800 dark:text-blue-200">
                <div>• {t("salonHolidays.suggestions.newYear")}</div>
                <div>• {t("salonHolidays.suggestions.easter")}</div>
                <div>• {t("salonHolidays.suggestions.labourDay")}</div>
                <div>• {t("salonHolidays.suggestions.constitutionDay")}</div>
                <div>• {t("salonHolidays.suggestions.ascension")}</div>
                <div>• {t("salonHolidays.suggestions.pentecost")}</div>
                <div>• {t("salonHolidays.suggestions.christmas")}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
