import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, Receipt, BarChart3, Eye } from "lucide-react";
import { useLocation, Link, useSearchParams } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const MONTHS = [
  { value: 1, label: "Styczeń" },
  { value: 2, label: "Luty" },
  { value: 3, label: "Marzec" },
  { value: 4, label: "Kwiecień" },
  { value: 5, label: "Maj" },
  { value: 6, label: "Czerwiec" },
  { value: 7, label: "Lipiec" },
  { value: 8, label: "Sierpień" },
  { value: 9, label: "Wrzesień" },
  { value: 10, label: "Październik" },
  { value: 11, label: "Listopad" },
  { value: 12, label: "Grudzień" },
];

export default function MonthlyFinancialOverview() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [compareYear, setCompareYear] = useState<number | null>(null);
  const [enableComparison, setEnableComparison] = useState(false);

  // Generuj listę lat (ostatnie 5 lat + bieżący + przyszłe 2)
  const availableYears = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  // Pobierz dane dla wszystkich 12 miesięcy wybranego roku
  const monthlyQueries = MONTHS.map((month) => 
    trpc.dashboard.getAccurateMonthlyResults.useQuery(
      { year: selectedYear, month: month.value },
      { enabled: !!user && user.role === "admin" }
    )
  );

  // Pobierz dane dla roku porównawczego (jeśli włączone) - hooks muszą być wywoływane bezwarunkowo
  const compareMonthlyQueries = MONTHS.map((month) =>
    trpc.dashboard.getAccurateMonthlyResults.useQuery(
      { year: compareYear || selectedYear, month: month.value },
      { enabled: !!user && user.role === "admin" && enableComparison && compareYear !== null }
    )
  );

  const isLoading = monthlyQueries.some((query) => query.isLoading);
  const compareLoading = enableComparison && compareYear !== null 
    ? compareMonthlyQueries.some((query) => query.isLoading)
    : false;

  // Przygotuj dane miesięczne
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const currentData = monthlyQueries[index].data;
      const compareData = enableComparison && compareYear !== null
        ? compareMonthlyQueries[index].data 
        : null;
      
      return {
        month: month.value,
        monthLabel: month.label,
        current: currentData,
        compare: compareData,
      };
    });
  }, [monthlyQueries, compareMonthlyQueries, enableComparison, compareYear]);

  // Oblicz podsumowanie roczne
  const yearSummary = useMemo(() => {
    const totals = monthlyData.reduce(
      (acc, month) => {
        if (month.current) {
          acc.totalRevenue += month.current.totalRevenue;
          acc.employeeCosts += month.current.employeeCosts;
          acc.fixedCosts += month.current.fixedCosts;
          acc.operatingProfit += month.current.operatingProfit;
        }
        return acc;
      },
      { totalRevenue: 0, employeeCosts: 0, fixedCosts: 0, operatingProfit: 0 }
    );

    const totalCosts = totals.employeeCosts + totals.fixedCosts;
    const operatingMargin = totals.totalRevenue > 0 
      ? (totals.operatingProfit / totals.totalRevenue) * 100 
      : 0;

    return {
      ...totals,
      totalCosts,
      operatingMargin,
    };
  }, [monthlyData]);

  // Funkcja pomocnicza do obliczania zmiany procentowej
  // Oblicza zmianę zysku operacyjnego między miesiącami
  const calculatePercentageChange = (current: number, previous: number) => {
    // Jeśli poprzednia wartość to 0, obsłuż specjalny przypadek
    if (previous === 0) {
      if (current > 0) return 100; // Z 0 do zysku = 100% poprawy
      if (current < 0) return -100; // Z 0 do straty = -100% (pogorszenie)
      return 0; // Z 0 do 0 = brak zmiany
    }
    
    // Standardowa zmiana procentowa: (nowa - stara) / stara * 100
    // Przykłady:
    // - previous=1000, current=1500: (1500-1000)/1000*100 = +50% (poprawa)
    // - previous=1000, current=500: (500-1000)/1000*100 = -50% (pogorszenie)
    // - previous=-500, current=-300: (-300-(-500))/(-500)*100 = +40% (poprawa - mniejsza strata)
    // - previous=-500, current=-700: (-700-(-500))/(-500)*100 = -40% (pogorszenie - większa strata)
    // - previous=-500, current=500: (500-(-500))/(-500)*100 = -200% (przejście ze straty do zysku - pokazujemy jako poprawę przez bezwzględną wartość)
    
    const change = ((current - previous) / previous) * 100;
    
    // Jeśli przechodzimy ze straty (previous < 0) do zysku (current > 0),
    // to zawsze jest poprawa - pokaż to jako wartość dodatnią
    if (previous < 0 && current > 0) {
      // Przejście ze straty do zysku to zawsze sukces
      // Używamy bezwzględnej wartości zmiany, aby pokazać poprawę
      return Math.abs(change);
    }
    
    return change;
  };

  // Funkcja pomocnicza do formatowania waluty
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  // Funkcja pomocnicza do formatowania procentu
  const formatPercentage = (value: number, decimals: number = 1) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
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

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <Button onClick={() => setLocation("/")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do dashboardu
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-teal-600" />
            Przegląd finansowy miesięczny
          </h1>
          <p className="text-muted-foreground">
            Szczegółowe dane finansowe dla każdego miesiąca roku
          </p>
        </div>
      </div>

      {/* Filtry */}
      <Card>
        <CardHeader>
          <CardTitle>Filtry i opcje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="year-select">Rok</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-comparison"
                  checked={enableComparison}
                  onCheckedChange={(checked) => {
                    setEnableComparison(checked as boolean);
                    if (!checked) {
                      setCompareYear(null);
                    }
                  }}
                />
                <Label htmlFor="enable-comparison" className="cursor-pointer">
                  Porównaj z innym rokiem
                </Label>
              </div>
              {enableComparison && (
                <Select
                  value={compareYear?.toString() || ""}
                  onValueChange={(value) => setCompareYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz rok do porównania" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears
                      .filter((year) => year !== selectedYear)
                      .map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Podsumowanie roczne */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Przychód roczny
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearSummary.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Koszty pracowników
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(yearSummary.employeeCosts)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-orange-600" />
              Koszty stałe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(yearSummary.fixedCosts)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-teal-600" />
              Zysk operacyjny
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                yearSummary.operatingProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(yearSummary.operatingProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Marża: {yearSummary.operatingMargin.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela z danymi miesięcznymi */}
      <Card>
        <CardHeader>
          <CardTitle>Szczegółowe dane miesięczne - {selectedYear}</CardTitle>
          <CardDescription>
            {enableComparison && compareYear
              ? `Porównanie z rokiem ${compareYear}`
              : "Kliknij na nagłówek kolumny, aby zobaczyć szczegóły"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || compareLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Miesiąc</TableHead>
                    <TableHead className="text-right">Przychód</TableHead>
                    <TableHead className="text-right">Koszty pracowników</TableHead>
                    <TableHead className="text-right">Koszty stałe</TableHead>
                    <TableHead className="text-right">Zysk/Strata</TableHead>
                    <TableHead className="text-right">Marża %</TableHead>
                    <TableHead className="text-right">Zmiana vs poprzedni miesiąc</TableHead>
                    {enableComparison && compareYear && (
                      <TableHead className="text-right">
                        Zmiana vs {compareYear}
                      </TableHead>
                    )}
                    <TableHead className="text-center w-[100px]">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((data, index) => {
                    const current = data.current;
                    const compare = data.compare;
                    const previousMonthData = index > 0 ? monthlyData[index - 1].current : null;
                    
                    if (!current) {
                      return (
                        <TableRow key={data.month}>
                          <TableCell className="font-medium">{data.monthLabel}</TableCell>
                          <TableCell colSpan={enableComparison && compareYear ? 8 : 7} className="text-center text-muted-foreground">
                            Brak danych
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const changeVsPrevious = previousMonthData
                      ? calculatePercentageChange(
                          current.operatingProfit,
                          previousMonthData.operatingProfit
                        )
                      : null;

                    const changeVsCompare = compare
                      ? calculatePercentageChange(
                          current.operatingProfit,
                          compare.operatingProfit
                        )
                      : null;

                    return (
                      <TableRow key={data.month}>
                        <TableCell className="font-medium">{data.monthLabel}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(current.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(current.employeeCosts)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(current.fixedCosts)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold ${
                              current.operatingProfit >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(current.operatingProfit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              current.operatingMargin >= 20
                                ? "default"
                                : current.operatingMargin >= 10
                                ? "secondary"
                                : "outline"
                            }
                            className={
                              current.operatingMargin >= 0
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {current.operatingMargin.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {changeVsPrevious !== null ? (
                            <div className="flex items-center justify-end gap-1">
                              {changeVsPrevious > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : changeVsPrevious < 0 ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              ) : null}
                              <span
                                className={
                                  changeVsPrevious > 0
                                    ? "text-green-600"
                                    : changeVsPrevious < 0
                                    ? "text-red-600"
                                    : "text-muted-foreground"
                                }
                              >
                                {formatPercentage(changeVsPrevious)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        {enableComparison && compareYear && (
                          <TableCell className="text-right">
                            {compare && changeVsCompare !== null ? (
                              <div className="flex items-center justify-end gap-1">
                                {changeVsCompare > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : changeVsCompare < 0 ? (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                ) : null}
                                <span
                                  className={
                                    changeVsCompare > 0
                                      ? "text-green-600"
                                      : changeVsCompare < 0
                                      ? "text-red-600"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {formatPercentage(changeVsCompare)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Brak danych</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <Link href={`/monthly-employee-reports?year=${selectedYear}&month=${data.month}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Szczegóły
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

