import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Simulator() {
  const { user } = useAuth();
  const [availableProfit, setAvailableProfit] = useState("57979");
  const [profitPercentage, setProfitPercentage] = useState([60]);
  const [managementSalary, setManagementSalary] = useState("22000");

  const { data: kpi } = trpc.dashboard.kpi.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: simulation } = trpc.simulator.simulate.useQuery(
    {
      availableProfit: Math.round(parseFloat(availableProfit || "0") * 100),
      profitPercentage: profitPercentage[0] || 0,
      managementSalary: Math.round(parseFloat(managementSalary || "0") * 100),
    },
    {
      enabled: !!user && !!availableProfit,
    }
  );

  const saveMutation = trpc.simulator.save.useMutation({
    onSuccess: () => {
      toast.success("Symulacja zapisana");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const handleSave = () => {
    if (!simulation) return;
    
    saveMutation.mutate({
      scenarioName: `Symulacja ${profitPercentage[0]}% - ${new Date().toLocaleDateString()}`,
      netSalary: simulation.total.net,
      grossCost: simulation.total.gross,
      profitPercentage: profitPercentage[0] || 0,
      remainingProfit: simulation.remaining,
    });
  };

  // Automatycznie ustaw zysk z dashboardu
  useMemo(() => {
    if (kpi && kpi.operatingProfit > 0) {
      setAvailableProfit((kpi.operatingProfit / 100).toString());
    }
  }, [kpi]);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Symulator wypłaty właściciela</h1>
        <p className="text-muted-foreground">
          Oblicz optymalną wypłatę na podstawie zysku firmy
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Parametry</CardTitle>
            <CardDescription>Wprowadź dane do symulacji</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="profit">Dostępny zysk (PLN)</Label>
              <Input
                id="profit"
                type="number"
                step="0.01"
                value={availableProfit}
                onChange={(e) => setAvailableProfit(e.target.value)}
              />
              {kpi && (
                <p className="text-xs text-muted-foreground">
                  Zysk operacyjny z dashboardu: {formatCurrency(kpi.operatingProfit)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="management">
                Wynagrodzenie zarządu łącznie (PLN netto)
              </Label>
              <Input
                id="management"
                type="number"
                step="0.01"
                value={managementSalary}
                onChange={(e) => setManagementSalary(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Do porównania relatywności wynagrodzeń
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Procent zysku do wypłaty</Label>
                <span className="text-2xl font-bold text-primary">
                  {profitPercentage[0]}%
                </span>
              </div>
              <Slider
                value={profitPercentage}
                onValueChange={setProfitPercentage}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wyniki symulacji</CardTitle>
            <CardDescription>Obliczona wypłata właściciela</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {simulation ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Kwota brutto (koszt firmy)
                    </span>
                    <span className="font-medium">
                      {formatCurrency(simulation.total.gross)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Kwota netto (na rękę)
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(simulation.total.net)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Pozostały zysk
                    </span>
                    <span className="font-medium">
                      {formatCurrency(simulation.remaining)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Efektywna stopa podatkowa
                    </span>
                    <span className="font-bold text-green-600">
                      {simulation.total.effectiveTaxRate.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSave} className="w-full" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Zapisz symulację
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rekomendacje</CardTitle>
          <CardDescription>Na podstawie analizy Twojej firmy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              💡 Rekomendacja główna: 60% zysku
            </h3>
            <p className="text-sm text-blue-800">
              Wypłata 60% zysku zapewnia właściwą hierarchię wynagrodzeń (właściciel zarabia więcej niż zarząd)
              przy zachowaniu solidnego bufora finansowego na rozwój i nieprzewidziane wydatki.
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">
              ⚠️ Rekomendacja alternatywna: 70% zysku
            </h3>
            <p className="text-sm text-amber-800">
              Wypłata 70% zysku maksymalizuje bieżące dochody właściciela, ale pozostawia mniejszy bufor
              finansowy. Wybierz tę opcję, gdy priorytetem jest maksymalizacja wypłaty.
            </p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">
              ✅ Dlaczego B2B?
            </h3>
            <p className="text-sm text-green-800">
              Wypłata na B2B (faktura) zapewnia najwyższą efektywność podatkową (~78-79%).
              Z każdych 100 PLN kosztu firmy, około 78-79 PLN trafia jako netto do właściciela.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
