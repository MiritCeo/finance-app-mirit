import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Clock, Calendar, FileText, AlertCircle, CheckCircle2, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function HRappkaInfoPanel() {
  const { data, isLoading, error } = trpc.hrappka.getEmployeeInfo.useQuery(
    {},
    {
      refetchInterval: 5 * 60 * 1000, // Odśwież co 5 minut
      retry: 1,
    }
  );

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
    return null;
  }

  const info = data.info;
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
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Informacje z HRappka
        </CardTitle>
        <CardDescription>
          Twoje dane z systemu HRappka
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ostrzeżenie o brakujących godzinach wczoraj */}
        {!info.yesterdayHoursReported && (
          <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-200">Brak godzin za wczoraj!</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              Nie uzupełniłeś godzin za dzień <strong>{yesterdayFormatted}</strong>. 
              Pamiętaj o uzupełnieniu godzin w systemie HRappka.
            </AlertDescription>
          </Alert>
        )}

        {/* Potwierdzenie uzupełnienia godzin wczoraj */}
        {info.yesterdayHoursReported && info.yesterdayHours && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">Godziny uzupełnione</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Wczoraj ({yesterdayFormatted}) zaraportowałeś <strong>{info.yesterdayHours.toFixed(1)}h</strong>.
            </AlertDescription>
          </Alert>
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

