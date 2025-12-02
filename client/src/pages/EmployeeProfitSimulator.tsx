import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function EmployeeProfitSimulator() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    employmentType: "b2b" as "uop" | "b2b" | "zlecenie" | "zlecenie_studenckie",
    monthlySalaryNet: "10000",
    hourlyRateClient: "150",
    hourlyRateEmployee: "59.52", // Automatycznie obliczane: netto / 168h
    expectedHoursPerMonth: "168",
  });

  // Automatyczne obliczanie stawki pracownika
  useEffect(() => {
    const netValue = parseFloat(formData.monthlySalaryNet || "0");
    if (netValue > 0) {
      const hourlyRate = (netValue / 168).toFixed(2);
      setFormData(prev => ({ ...prev, hourlyRateEmployee: hourlyRate }));
    }
  }, [formData.monthlySalaryNet]);

  const { data: simulation, isLoading } = trpc.employeeProfit.simulate.useQuery(
    {
      employmentType: formData.employmentType,
      monthlySalaryNet: Math.round(parseFloat(formData.monthlySalaryNet || "0") * 100),
      hourlyRateClient: Math.round(parseFloat(formData.hourlyRateClient || "0") * 100),
      hourlyRateEmployee: Math.round(parseFloat(formData.hourlyRateEmployee || "0") * 100),
      expectedHoursPerMonth: parseFloat(formData.expectedHoursPerMonth || "168"),
    },
    {
      enabled: !!user && !!formData.monthlySalaryNet && !!formData.hourlyRateClient,
    }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const employmentTypeLabels = {
    uop: "Umowa o pracę (UoP)",
    b2b: "B2B (Faktura)",
    zlecenie: "Umowa zlecenie",
    zlecenie_studenckie: "Umowa zlecenie (studencka)",
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <Button onClick={() => setLocation("/")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Wróć do dashboardu
      </Button>
      
      <div>
        <h1 className="text-3xl font-bold">Symulator zysku z pracownika</h1>
        <p className="text-muted-foreground">
          Narzędzie do negocjacji wynagrodzeń - zobacz ile zostanie zysku dla firmy
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formularz parametrów */}
        <Card>
          <CardHeader>
            <CardTitle>Parametry negocjacji</CardTitle>
            <CardDescription>Wprowadź dane pracownika i stawkę dla klienta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employmentType">Typ umowy</Label>
              <Select
                value={formData.employmentType}
                onValueChange={(value: any) => setFormData({ ...formData, employmentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uop">Umowa o pracę (UoP)</SelectItem>
                  <SelectItem value="b2b">B2B (Faktura)</SelectItem>
                  <SelectItem value="zlecenie">Umowa zlecenie</SelectItem>
                  <SelectItem value="zlecenie_studenckie">Umowa zlecenie (studencka)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">
                {formData.employmentType === "uop" 
                  ? "Wynagrodzenie brutto pracownika (PLN)" 
                  : "Wynagrodzenie netto pracownika (PLN)"}
              </Label>
              <Input
                id="salary"
                type="number"
                step="100"
                value={formData.monthlySalaryNet}
                onChange={(e) => setFormData({ ...formData, monthlySalaryNet: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {formData.employmentType === "uop"
                  ? "Kwota brutto (przed odliczeniami ZUS i podatku)"
                  : "Kwota którą pracownik otrzyma \"na rękę\""}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientRate">Stawka dla klienta (PLN/h)</Label>
              <Input
                id="clientRate"
                type="number"
                step="5"
                value={formData.hourlyRateClient}
                onChange={(e) => setFormData({ ...formData, hourlyRateClient: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Ile klient płaci za godzinę pracy tego pracownika
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeRate">Stawka dla pracownika (PLN/h)</Label>
              <Input
                id="employeeRate"
                type="number"
                step="5"
                value={formData.hourlyRateEmployee}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Obliczane automatycznie: netto / 168h
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Oczekiwane godziny miesięcznie</Label>
              <Input
                id="hours"
                type="number"
                step="1"
                value={formData.expectedHoursPerMonth}
                onChange={(e) => setFormData({ ...formData, expectedHoursPerMonth: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Standardowo 168h/miesiąc (21 dni × 8h)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Wyniki symulacji */}
        <Card>
          <CardHeader>
            <CardTitle>Wyniki symulacji</CardTitle>
            <CardDescription>Analiza rentowności pracownika</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : simulation ? (
              <>
                {/* Wynagrodzenie pracownika - tylko dla UoP */}
                {formData.employmentType === "uop" && simulation.breakdown.netSalaryTakeHome && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 text-sm">Wynagrodzenie pracownika</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-800">Brutto</span>
                        <span className="font-medium text-blue-900">
                          {formatCurrency(simulation.breakdown.grossSalary || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-blue-700">
                        <span>− Składki ZUS pracownika</span>
                        <span>{formatCurrency(simulation.breakdown.zusEmployee || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-blue-700">
                        <span>− Podatek</span>
                        <span>{formatCurrency(simulation.breakdown.tax || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-blue-700">
                        <span>− Składka zdrowotna</span>
                        <span>{formatCurrency(simulation.breakdown.healthInsurance || 0)}</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-blue-200 flex justify-between items-center">
                        <span className="text-sm font-semibold text-blue-900">Netto na rękę</span>
                        <span className="font-bold text-blue-900">
                          {formatCurrency(simulation.breakdown.netSalaryTakeHome)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Koszty */}
                <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900 text-sm">Koszty firmy</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-800">Koszt miesięczny</span>
                      <span className="font-bold text-red-900">
                        {formatCurrency(simulation.monthlyCostTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-800">Koszt godzinowy</span>
                      <span className="font-medium text-red-900">
                        {formatCurrency(simulation.hourlyRateCost)}/h
                      </span>
                    </div>
                    {/* Breakdown per godzina */}
                    <div className="pt-2 mt-2 border-t border-red-200">
                      <p className="text-xs text-red-700 font-medium mb-1">Składowe kosztu godzinowego:</p>
                      <div className="space-y-0.5 text-xs text-red-600">
                        <div className="flex justify-between">
                          <span>• Wynagrodzenie</span>
                          <span>{formatCurrency(simulation.hourlyCostBreakdown.baseSalaryPerHour)}/h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Urlopy</span>
                          <span>{formatCurrency(simulation.hourlyCostBreakdown.vacationPerHour)}/h</span>
                        </div>
                        {simulation.hourlyCostBreakdown.zusPerHour && (
                          <div className="flex justify-between">
                            <span>• ZUS pracodawcy</span>
                            <span>{formatCurrency(simulation.hourlyCostBreakdown.zusPerHour)}/h</span>
                          </div>
                        )}
                        {simulation.hourlyCostBreakdown.otherPerHour && simulation.hourlyCostBreakdown.otherPerHour > 0 && (
                          <div className="flex justify-between">
                            <span>• Inne</span>
                            <span>{formatCurrency(simulation.hourlyCostBreakdown.otherPerHour)}/h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Przychody */}
                <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 text-sm">Przychody</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-800">Przychód miesięczny</span>
                      <span className="font-bold text-green-900">
                        {formatCurrency(simulation.monthlyRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-800">
                        ({simulation.expectedHoursPerMonth}h × {formatCurrency(simulation.hourlyRateClient)}/h)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Zysk */}
                <div className={`space-y-3 p-4 rounded-lg border ${
                  simulation.monthlyProfit > 0 
                    ? "bg-blue-50 border-blue-200" 
                    : "bg-orange-50 border-orange-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-sm ${
                      simulation.monthlyProfit > 0 ? "text-blue-900" : "text-orange-900"
                    }`}>
                      Zysk dla firmy
                    </h3>
                    {simulation.monthlyProfit > 0 ? (
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div className="space-y-2">
                    {/* Dla B2B - pokaż kwotę netto bez VAT */}
                    {formData.employmentType === "b2b" && simulation.breakdown.invoiceNet && (
                      <div className="text-xs text-blue-700 mb-2 p-2 bg-blue-100 rounded">
                        <div className="flex justify-between items-center">
                          <span>Przychód netto (bez VAT):</span>
                          <span className="font-semibold">{formatCurrency(simulation.monthlyRevenue)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-blue-600">
                          <span>Przychód brutto (z VAT 23%):</span>
                          <span className="font-medium">{formatCurrency(Math.round(simulation.monthlyRevenue * 1.23))}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-blue-600 mt-1">
                          <span>− Koszt firmy:</span>
                          <span>{formatCurrency(simulation.monthlyCostTotal)}</span>
                        </div>
                        <div className="pt-1 mt-1 border-t border-blue-300 flex justify-between items-center">
                          <span className="font-semibold">Zysk:</span>
                          <span className="font-bold">{formatCurrency(simulation.monthlyProfit)}</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-2 italic">
                          * VAT jest neutralny podatkowo (odliczany), więc operujemy na kwocie netto
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        simulation.monthlyProfit > 0 ? "text-blue-800" : "text-orange-800"
                      }`}>
                        Zysk miesięczny
                      </span>
                      <span className={`text-2xl font-bold ${
                        simulation.monthlyProfit > 0 ? "text-blue-900" : "text-orange-900"
                      }`}>
                        {formatCurrency(simulation.monthlyProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        simulation.monthlyProfit > 0 ? "text-blue-800" : "text-orange-800"
                      }`}>
                        Zysk roczny
                      </span>
                      <span className={`font-bold ${
                        simulation.monthlyProfit > 0 ? "text-blue-900" : "text-orange-900"
                      }`}>
                        {formatCurrency(simulation.annualProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className={`text-sm ${
                        simulation.monthlyProfit > 0 ? "text-blue-800" : "text-orange-800"
                      }`}>
                        Marża
                      </span>
                      <span className={`font-bold ${
                        simulation.monthlyProfit > 0 ? "text-blue-900" : "text-orange-900"
                      }`}>
                        {simulation.marginPercentage.toFixed(2)}%
                      </span>
                    </div>
                    {/* Prognozy strat */}
                    {simulation.lossProjections && (
                      <div className="pt-3 mt-3 border-t-2 border-orange-300">
                        <p className="text-xs font-semibold text-orange-900 mb-2">⚠️ Prognozy strat przy nierentownej współpracy:</p>
                        <div className="space-y-1 text-xs text-orange-800">
                          <div className="flex justify-between">
                            <span>Strata za 3 miesiące:</span>
                            <span className="font-bold text-orange-900">{formatCurrency(simulation.lossProjections.loss3Months)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Strata za 6 miesięcy:</span>
                            <span className="font-bold text-orange-900">{formatCurrency(simulation.lossProjections.loss6Months)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Strata za 12 miesięcy:</span>
                            <span className="font-bold text-red-600">{formatCurrency(simulation.lossProjections.loss12Months)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {simulation.breakdown?.vacationCostMonthly && (
                      <>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm text-orange-700">
                            Koszt urlopu miesięczny
                          </span>
                          <span className="font-semibold text-orange-900">
                            {formatCurrency(simulation.breakdown.vacationCostMonthly)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-orange-700">
                            Koszt urlopu roczny
                          </span>
                          <span className="font-semibold text-orange-900">
                            {formatCurrency(simulation.breakdown.vacationCostAnnual || 0)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        simulation.monthlyProfit > 0 ? "text-blue-800" : "text-orange-800"
                      }`}>
                        Zysk na godzinę
                      </span>
                      <span className={`font-medium ${
                        simulation.monthlyProfit > 0 ? "text-blue-900" : "text-orange-900"
                      }`}>
                        {formatCurrency(simulation.hourlyProfit)}/h
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 mt-3 border-t border-blue-300">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Symulacja kosztowa (na podstawie typu umowy)</p>
                  </div>
                </div>

                <div className={`space-y-3 p-4 rounded-lg border ${
                  simulation.monthlyProfitHourly > 0 
                    ? "bg-purple-50 border-purple-200" 
                    : "bg-orange-50 border-orange-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-sm ${
                      simulation.monthlyProfitHourly > 0 ? "text-purple-900" : "text-orange-900"
                    }`}>
                      Symulacja stawkowa
                    </h3>
                    {simulation.monthlyProfitHourly > 0 ? (
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        simulation.monthlyProfitHourly > 0 ? "text-purple-800" : "text-orange-800"
                      }`}>
                        Zysk miesięczny
                      </span>
                      <span className={`text-2xl font-bold ${
                        simulation.monthlyProfitHourly > 0 ? "text-purple-900" : "text-orange-900"
                      }`}>
                        {formatCurrency(simulation.monthlyProfitHourly)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${
                        simulation.monthlyProfitHourly > 0 ? "text-purple-800" : "text-orange-800"
                      }`}>
                        Zysk roczny
                      </span>
                      <span className={`font-bold ${
                        simulation.monthlyProfitHourly > 0 ? "text-purple-900" : "text-orange-900"
                      }`}>
                        {formatCurrency(simulation.annualProfitHourly)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className={`text-sm ${
                        simulation.monthlyProfitHourly > 0 ? "text-purple-800" : "text-orange-800"
                      }`}>
                        Zysk na godzinę
                      </span>
                      <span className={`font-medium ${
                        simulation.monthlyProfitHourly > 0 ? "text-purple-900" : "text-orange-900"
                      }`}>
                        {formatCurrency(simulation.hourlyProfitDirect)}/h
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className={simulation.monthlyProfitHourly > 0 ? "text-purple-700" : "text-orange-700"}>
                        ({simulation.expectedHoursPerMonth}h × ({formatCurrency(simulation.hourlyRateClient)} - {formatCurrency(simulation.hourlyRateEmployee)}))
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 mt-3 border-t border-purple-300">
                    <p className="text-xs font-semibold text-purple-900 mb-2">Symulacja stawkowa (przychód - stawka pracownika)</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                Wprowadź parametry aby zobaczyć symulację
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Szczegółowy breakdown kosztów */}
      {simulation && simulation.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Szczegółowy rozkład kosztów</CardTitle>
            <CardDescription>
              Analiza składek, podatków i kosztów dla typu umowy: {formData.employmentType.toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* UoP */}
              {formData.employmentType === "uop" && simulation.breakdown.grossSalary && (
                <>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Wynagrodzenie brutto</span>
                    <span className="font-semibold">{formatCurrency(simulation.breakdown.grossSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Składki ZUS pracownika (13.71%)</span>
                    <span className="text-red-600">-{formatCurrency(simulation.breakdown.zusEmployee || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Składki ZUS pracodawcy (17.93%)</span>
                    <span className="text-red-600">-{formatCurrency(simulation.breakdown.zusEmployer || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Składka zdrowotna (7.77%)</span>
                    <span className="text-red-600">-{formatCurrency(simulation.breakdown.healthInsurance || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Zaliczka na PIT (7.05%)</span>
                    <span className="text-red-600">-{formatCurrency(simulation.breakdown.tax || 0)}</span>
                  </div>
                </>
              )}

              {/* B2B */}
              {formData.employmentType === "b2b" && simulation.breakdown.invoiceAmount && (
                <>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Kwota faktury netto (koszt pracodawcy)</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(simulation.monthlyCostTotal)}</span>
                  </div>
                  <div className="pt-2 pb-2">
                    <p className="text-xs text-muted-foreground italic">
                      Uwaga: VAT, składki ZUS, składka zdrowotna i podatek są płacone przez kontrahenta (nie są kosztem pracodawcy). VAT jest odliczany.
                    </p>
                  </div>
                </>
              )}

              {/* Zlecenie */}
              {formData.employmentType === "zlecenie" && simulation.breakdown.grossSalary && (
                <>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Kwota brutto</span>
                    <span className="font-semibold">{formatCurrency(simulation.breakdown.grossSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Składki ZUS (~29.19%)</span>
                    <span className="text-red-600">-{formatCurrency(simulation.breakdown.zusEmployee || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Składka zdrowotna (7.77%)</span>
                    <span className="text-red-600">-{formatCurrency(simulation.breakdown.healthInsurance || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Zaliczka na PIT (7.05%)</span>
                    <span className="text-red-600">-{formatCurrency(simulation.breakdown.tax || 0)}</span>
                  </div>
                </>
              )}

              {/* Zlecenie studenckie */}
              {formData.employmentType === "zlecenie_studenckie" && simulation.breakdown.grossSalary && (
                <>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">Kwota brutto</span>
                    <span className="font-semibold">{formatCurrency(simulation.breakdown.grossSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Składki ZUS</span>
                    <span className="text-green-600">Zwolniony (do 26 lat)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Składka zdrowotna</span>
                    <span className="text-green-600">Zwolniony (do 26 lat)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Zaliczka na PIT (7.05%)</span>
                    <span className="text-red-600">-{formatCurrency(simulation.breakdown.tax || 0)}</span>
                  </div>
                </>
              )}

              {/* Koszty urlopów - wspólne dla wszystkich */}
              {simulation.breakdown.vacationCostMonthly && (
                <>
                  <div className="pt-3 mt-3 border-t-2">
                    <h4 className="text-sm font-semibold mb-2 text-blue-900">Koszty płatnych urlopów (21 dni rocznie)</h4>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Koszt miesięczny (~8.33%)</span>
                    <span className="text-orange-600">{formatCurrency(simulation.breakdown.vacationCostMonthly)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Koszt roczny</span>
                    <span className="text-orange-600">{formatCurrency(simulation.breakdown.vacationCostAnnual || 0)}</span>
                  </div>
                </>
              )}

              <div className="pt-3 mt-3 border-t-2">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold">Całkowity koszt pracodawcy</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(simulation.monthlyCostTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rekomendacje */}
      {simulation && (
        <Card>
          <CardHeader>
            <CardTitle>Analiza i rekomendacje</CardTitle>
            <CardDescription>Wskazówki do negocjacji</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {simulation.monthlyProfit > 0 ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">
                  ✅ Rentowna współpraca
                </h3>
                <p className="text-sm text-green-800">
                  Przy tych parametrach firma zarobi <strong>{formatCurrency(simulation.monthlyProfit)}</strong> miesięcznie 
                  (marża {simulation.marginPercentage.toFixed(1)}%). To daje roczny zysk z tego pracownika 
                  na poziomie <strong>{formatCurrency(simulation.annualProfit)}</strong>.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">
                  ⚠️ Nierentowna współpraca
                </h3>
                <p className="text-sm text-orange-800">
                  Przy tych parametrach firma będzie tracić <strong>{formatCurrency(Math.abs(simulation.monthlyProfit))}</strong> miesięcznie. 
                  Musisz zwiększyć stawkę dla klienta lub obniżyć wynagrodzenie pracownika.
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2 text-sm">
                  💡 Uwzględnione w kosztach
                </h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Płatne urlopy (21 dni rocznie dla wszystkich)</li>
                  <li>• Składki ZUS i podatki ({employmentTypeLabels[formData.employmentType]})</li>
                  <li>• Uśredniony koszt do 168h miesięcznie</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2 text-sm">
                  📊 Wskaźniki
                </h3>
                <ul className="text-xs text-purple-800 space-y-1">
                  <li>• Koszt godzinowy: {formatCurrency(simulation.hourlyRateCost)}/h</li>
                  <li>• Stawka klienta: {formatCurrency(simulation.hourlyRateClient)}/h</li>
                  <li>• Różnica: {formatCurrency(simulation.hourlyProfit)}/h</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
