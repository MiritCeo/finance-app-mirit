import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Clock, Calendar, FileText, AlertCircle, CheckCircle2, TrendingUp, DollarSign, BarChart3, AlertTriangle, RefreshCw, Trophy, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function HRappkaInfoPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const utils = trpc.useUtils();
  
  const { data, isLoading, error } = trpc.hrappka.getEmployeeInfo.useQuery(
    { forceRefresh: false },
    {
      refetchInterval: false, // Nie odświeżaj automatycznie - używamy cache
      retry: 1,
    }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Wymuś odświeżenie danych
      await utils.hrappka.getEmployeeInfo.fetch({ forceRefresh: true });
      // Odśwież query
      await utils.hrappka.getEmployeeInfo.invalidate();
    } catch (error) {
      console.error("Error refreshing HRappka data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Informacje z HRappka
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Informacje z HRappka
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Błąd pobierania danych</AlertTitle>
            <AlertDescription>
              {error.message || "Nie udało się pobrać informacji z HRappka. Sprawdź czy masz przypisane HRappka ID."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data?.info) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Informacje z HRappka
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Odśwież
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Brak danych do wyświetlenia</p>
        </CardContent>
      </Card>
    );
  }

  const info = data.info;
  const isCached = data.cached === true;
  const cachedAt = data.cachedAt ? new Date(data.cachedAt) : null;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFormatted = yesterday.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Informacje z HRappka
            {isCached && cachedAt && (
              <span className="text-xs text-muted-foreground font-normal ml-2">
                (cache: {cachedAt.toLocaleTimeString("pl-PL")})
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || isLoading ? "animate-spin" : ""}`} />
            Odśwież
          </Button>
        </CardTitle>
        <CardDescription>
          Twoje dane z systemu HRappka {isCached && "(z cache)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ostrzeżenie o brakujących godzinach wczoraj */}
        {!info.yesterdayHoursReported && (
          <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-200">Brak godzin za wczoraj!</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              Nie uzupełniłeś godzin za dzień <strong>{yesterdayFormatted}</strong>
              <br />
              <strong className="text-yellow-700 dark:text-yellow-300">Uzupełnij godziny w systemie HRappka, aby odebrać 15 punktów!</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Potwierdzenie uzupełnienia godzin wczoraj */}
        {info.yesterdayHoursReported && info.yesterdayHours && (
          <div className="space-y-2">
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">Godziny uzupełnione</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Wczoraj ({yesterdayFormatted}) zaraportowałeś <strong>{info.yesterdayHours.toFixed(1)}h</strong>
              </AlertDescription>
            </Alert>
            
            {/* Karta z punktami */}
            <div className="relative overflow-hidden rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 dark:from-yellow-950/50 dark:via-amber-950/50 dark:to-yellow-950/50 p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="rounded-full bg-yellow-400 p-3 dark:bg-yellow-500">
                    <Trophy className="h-6 w-6 text-yellow-900 dark:text-yellow-950" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                      Punkty przyznane!
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Otrzymałeś <strong className="text-yellow-900 dark:text-yellow-100 text-base">15 punktów</strong> za uzupełnienie godzin wczoraj
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="rounded-lg bg-yellow-400/20 dark:bg-yellow-500/20 px-3 py-2 border border-yellow-400/30 dark:border-yellow-500/30">
                    <span className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">+15</span>
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 block text-center">pkt</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statystyki godzin */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">Ten tydzień</span>
            </div>
            <p className="text-xl font-bold">{info.totalHoursThisWeek.toFixed(1)}h</p>
          </div>

          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">Ten miesiąc</span>
            </div>
            <p className="text-xl font-bold">{info.totalHoursThisMonth.toFixed(1)}h</p>
          </div>

          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">Ten rok</span>
            </div>
            <p className="text-xl font-bold">{info.totalHoursThisYear.toFixed(1)}h</p>
          </div>

          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-xs font-medium text-muted-foreground">Średnia/dzień</span>
            </div>
            <p className="text-xl font-bold">{info.averageHoursPerDay.toFixed(1)}h</p>
          </div>
        </div>

        {/* Podsumowanie miesięczne */}
        {info.monthlySummary && info.monthlySummary.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Podsumowanie godzin per miesiąc ({new Date().getFullYear()})
            </h3>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Miesiąc</TableHead>
                    <TableHead className="text-right">Zarejestrowane</TableHead>
                    <TableHead className="text-right font-semibold">Razem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {info.monthlySummary.map((summary) => {
                    const monthNames = [
                      "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
                      "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
                    ];
                    const isCurrentMonth = summary.month === new Date().getMonth() + 1;
                    return (
                      <TableRow key={`${summary.year}-${summary.month}`} className={isCurrentMonth ? "bg-blue-50 dark:bg-blue-950" : ""}>
                        <TableCell className="font-medium">
                          {monthNames[summary.month - 1]}
                          {isCurrentMonth && <span className="ml-2 text-xs text-blue-600">(bieżący)</span>}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {summary.acceptedHours.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {summary.acceptedHours.toFixed(1)}h
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Ostatnie rozliczenie */}
        {info.lastSettlement && (
          <div className="p-4 rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-semibold">Ostatnie rozliczenie</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Okres:</span>
                <span className="font-medium">
                  {new Date(info.lastSettlement.settlement_from).toLocaleDateString("pl-PL")} - {new Date(info.lastSettlement.settlement_to).toLocaleDateString("pl-PL")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Do wypłaty:</span>
                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                  {parseFloat(info.lastSettlement.cash_netto_to_pay).toLocaleString("pl-PL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} PLN
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Brutto: {parseFloat(info.lastSettlement.cash_brutto).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN</span>
                <span>Netto: {parseFloat(info.lastSettlement.cash_netto).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN</span>
              </div>
            </div>
          </div>
        )}

        {/* Informacje o urlopach i umowie */}
        {(info.vacationDaysRemaining !== undefined || info.contractEndDate || info.contractStartDate || info.contractType) && (
          <div className="space-y-3 pt-2 border-t">
            {info.contractType && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Typ umowy
                </span>
                <span className="text-sm font-semibold">
                  {info.contractType === "EMPLOYMENT_CONTRACT" ? "Umowa o pracę" :
                   info.contractType === "ORDER_CONTRACT" ? "Umowa zlecenie" :
                   info.contractType}
                </span>
              </div>
            )}

            {info.contractStartDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data rozpoczęcia umowy
                </span>
                <span className="text-sm font-semibold">
                  {new Date(info.contractStartDate).toLocaleDateString("pl-PL")}
                </span>
              </div>
            )}

            {info.contractEndDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data zakończenia umowy
                </span>
                <span className={`text-sm font-semibold ${
                  new Date(info.contractEndDate) < new Date() ? "text-red-600" :
                  new Date(info.contractEndDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "text-orange-600" :
                  ""
                }`}>
                  {new Date(info.contractEndDate).toLocaleDateString("pl-PL")}
                </span>
              </div>
            )}

            {info.vacationDaysRemaining !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Pozostałe dni urlopu
                </span>
                <span className="text-sm font-semibold">{info.vacationDaysRemaining} dni</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

