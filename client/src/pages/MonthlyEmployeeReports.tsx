import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Edit2, Save, X, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

export default function MonthlyEmployeeReports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Pobierz parametry z URL
  const searchParams = new URLSearchParams(window.location.search);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
  const month = monthParam ? parseInt(monthParam) : new Date().getMonth() + 1;
  
  const [editingReport, setEditingReport] = useState<number | null>(null);
  const [hoursInput, setHoursInput] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [actualCostInput, setActualCostInput] = useState("");

  const { data, isLoading, refetch } = trpc.employees.getMonthlyReports.useQuery(
    { year, month },
    { enabled: !!user && user.role === "admin" && year > 0 && month >= 1 && month <= 12 }
  );

  const updateReportMutation = trpc.employees.updateMonthlyReport.useMutation({
    onSuccess: () => {
      toast.success("Raport zaktualizowany");
      refetch();
      setEditingReport(null);
      setHoursInput("");
      setRateInput("");
      setActualCostInput("");
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const propagateAllChangesMutation = trpc.employees.propagateAllMonthlyChanges.useMutation({
    onSuccess: (result) => {
      toast.success(result.message || `Zaktualizowano ${result.updatedCount} raportów`);
      refetch();
      if (result.errors && result.errors.length > 0) {
        console.error("Błędy propagacji:", result.errors);
        toast.warning(`Niektóre raporty nie zostały zaktualizowane. Sprawdź konsolę.`);
      }
    },
    onError: (error) => {
      toast.error(`Błąd propagacji: ${error.message}`);
    },
  });

  const handleEditReport = (report: any) => {
    setEditingReport(report.id);
    setHoursInput((report.hoursWorked / 100).toFixed(2));
    setRateInput((report.hourlyRateClient / 100).toFixed(2));
    setActualCostInput(report.actualCost !== null ? (report.actualCost / 100).toFixed(2) : "");
  };

  const handleSaveReport = (employeeId: number) => {
    if (editingReport === null) return;
    
    // Walidacja
    if (hoursInput.trim() === "" || isNaN(parseFloat(hoursInput)) || parseFloat(hoursInput) < 0) {
      toast.error("Wprowadź poprawną liczbę godzin");
      return;
    }
    
    if (rateInput.trim() === "" || isNaN(parseFloat(rateInput)) || parseFloat(rateInput) < 0) {
      toast.error("Wprowadź poprawną stawkę godzinową");
      return;
    }
    
    const actualCostValue = actualCostInput.trim() === "" 
      ? null 
      : parseFloat(actualCostInput);
    
    if (actualCostInput.trim() !== "" && (isNaN(actualCostValue!) || actualCostValue! < 0)) {
      toast.error("Wprowadź poprawną kwotę kosztu");
      return;
    }
    
    updateReportMutation.mutate({
      employeeId,
      year,
      month,
      hoursWorked: parseFloat(hoursInput),
      hourlyRateClient: parseFloat(rateInput),
      actualCost: actualCostValue,
    });
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    setHoursInput("");
    setRateInput("");
    setActualCostInput("");
  };

  // Funkcja do obliczania przychodu z edytowanych wartości
  const calculateRevenue = (hours: string, rate: string) => {
    const hoursNum = parseFloat(hours);
    const rateNum = parseFloat(rate);
    if (isNaN(hoursNum) || isNaN(rateNum)) return 0;
    return hoursNum * rateNum;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  const formatHours = (hoursWorked: number) => {
    // hoursWorked jest w groszach (setnych godzin), np. 13100 = 131.00h
    const hours = hoursWorked / 100;
    return hours.toFixed(2) + "h";
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Brak dostępu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ta strona jest dostępna tylko dla administratorów.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data || data.reports.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6">
        <Button onClick={() => setLocation("/monthly-financial-overview")} variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do przeglądu finansowego
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Raporty pracowników - {MONTH_NAMES[month - 1]} {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Brak zapisanych raportów dla tego miesiąca.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <Button onClick={() => setLocation("/monthly-financial-overview")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do przeglądu finansowego
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            Raporty pracowników - {MONTH_NAMES[month - 1]} {year}
          </h1>
          <p className="text-muted-foreground">
            Zapisane raporty wszystkich pracowników z możliwością ręcznej korekty kosztów
          </p>
        </div>
        <Button
          onClick={() => {
            if (confirm("Czy na pewno chcesz zaktualizować wszystkie raporty i propagować zmiany do timeEntries i assignments? Ta operacja może zająć chwilę.")) {
              propagateAllChangesMutation.mutate({ year, month });
            }
          }}
          disabled={propagateAllChangesMutation.isPending}
          variant="default"
        >
          {propagateAllChangesMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Aktualizowanie...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Propaguj wszystkie zmiany
            </>
          )}
        </Button>
      </div>

      {/* Podsumowanie */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Liczba pracowników</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.employeeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Łączne godziny</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalHours.toFixed(2)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Przychód</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Zysk/Strata</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                data.summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(data.summary.totalProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela raportów */}
      <Card>
        <CardHeader>
          <CardTitle>Raporty pracowników</CardTitle>
          <CardDescription>
            Kliknij przycisk edycji, aby ręcznie poprawić godziny, stawkę lub koszt pracownika
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pracownik</TableHead>
                  <TableHead className="text-right">Godziny</TableHead>
                  <TableHead className="text-right">Stawka/h</TableHead>
                  <TableHead className="text-right">Przychód</TableHead>
                  <TableHead className="text-right">Koszt domyślny</TableHead>
                  <TableHead className="text-right">Koszt faktyczny</TableHead>
                  <TableHead className="text-right">Zysk/Strata</TableHead>
                  <TableHead className="text-center w-[100px]">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reports.map((report) => {
                  const isEditing = editingReport === report.id;
                  
                  // Oblicz wartości do wyświetlenia
                  let displayHours = report.hoursWorked / 100;
                  let displayRate = report.hourlyRateClient / 100;
                  let displayRevenue = report.revenue;
                  
                  if (isEditing) {
                    // Podczas edycji używaj wartości z inputów
                    displayHours = parseFloat(hoursInput) || 0;
                    displayRate = parseFloat(rateInput) || 0;
                    displayRevenue = Math.round(calculateRevenue(hoursInput, rateInput) * 100);
                  }
                  
                  const cost = isEditing && actualCostInput.trim() !== "" 
                    ? Math.round(parseFloat(actualCostInput) * 100)
                    : (report.actualCost ?? report.cost);
                  const profit = displayRevenue - cost;

                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.employeeName}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={hoursInput}
                            onChange={(e) => setHoursInput(e.target.value)}
                            className="w-24 ml-auto"
                            placeholder="Godziny"
                          />
                        ) : (
                          displayHours.toFixed(2) + "h"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rateInput}
                            onChange={(e) => setRateInput(e.target.value)}
                            className="w-24 ml-auto"
                            placeholder="Stawka/h"
                          />
                        ) : (
                          formatCurrency(report.hourlyRateClient)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(displayRevenue)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(report.cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={actualCostInput}
                            onChange={(e) => setActualCostInput(e.target.value)}
                            className="w-32 ml-auto"
                            placeholder="Koszt faktyczny"
                          />
                        ) : (
                          <span className={report.actualCost !== null ? "font-semibold text-blue-600" : ""}>
                            {report.actualCost !== null 
                              ? formatCurrency(report.actualCost) 
                              : formatCurrency(report.cost)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(profit)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSaveReport(report.employeeId)}
                              disabled={updateReportMutation.isPending}
                            >
                              {updateReportMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={updateReportMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditReport(report)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

