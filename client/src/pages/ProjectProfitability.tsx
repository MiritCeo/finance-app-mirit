import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, Briefcase, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectProfitability() {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Pobierz listę projektów
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Pobierz rentowność projektu dla wybranego roku
  const { data: profitabilityData, isLoading: profitabilityLoading } = trpc.dashboard.getProjectProfitabilityByYear.useQuery(
    { projectId: selectedProjectId!, year: selectedYear },
    { enabled: !!user && !!selectedProjectId }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const getMonthName = (month: number) => {
    const months = [
      "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
      "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
    ];
    return months[month - 1];
  };

  // Generuj listę lat (ostatnie 5 lat + bieżący)
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-violet-600" />
            <h1 className="text-3xl font-bold">Rentowność projektów</h1>
          </div>
          <p className="text-muted-foreground">
            Analiza rentowności projektów w ujęciu miesięcznym
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wybierz projekt i rok</CardTitle>
          <CardDescription>
            Wybierz projekt, aby zobaczyć szczegółową analizę rentowności dla wszystkich 12 miesięcy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Projekt</label>
              <Select
                value={selectedProjectId?.toString() || ""}
                onValueChange={(value) => setSelectedProjectId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz projekt" />
                </SelectTrigger>
                <SelectContent>
                  {projectsLoading ? (
                    <SelectItem value="loading" disabled>
                      <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                      Ładowanie...
                    </SelectItem>
                  ) : projects && projects.length > 0 ? (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-projects" disabled>
                      Brak projektów
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">Rok</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProjectId && profitabilityData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-violet-600" />
                  {profitabilityData.projectName}
                </CardTitle>
                <CardDescription>
                  Analiza rentowności dla roku {profitabilityData.year}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                {profitabilityData.year}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {profitabilityLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Miesiąc</TableHead>
                      <TableHead className="text-right">Godziny</TableHead>
                      <TableHead className="text-right">Przychód</TableHead>
                      <TableHead className="text-right">Koszt</TableHead>
                      <TableHead className="text-right">Zysk/Strata</TableHead>
                      <TableHead className="text-right">Marża</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitabilityData.monthlyStats.map((stat) => {
                      const isProfit = stat.profit >= 0;
                      const isPositiveMargin = stat.margin >= 0;
                      
                      return (
                        <TableRow key={stat.month} className={isProfit ? "bg-green-50/50 dark:bg-green-950/10" : "bg-red-50/50 dark:bg-red-950/10"}>
                          <TableCell className="font-medium">
                            {getMonthName(stat.month)}
                          </TableCell>
                          <TableCell className="text-right">
                            {stat.hours.toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(stat.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(stat.cost)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}>
                            {formatCurrency(stat.profit)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            isPositiveMargin ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}>
                            {stat.margin >= 0 ? "+" : ""}{stat.margin.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Podsumowanie roczne */}
                    {(() => {
                      const yearlyTotal = profitabilityData.monthlyStats.reduce(
                        (acc, stat) => ({
                          revenue: acc.revenue + stat.revenue,
                          cost: acc.cost + stat.cost,
                          hours: acc.hours + stat.hours,
                          profit: 0, // Obliczymy poniżej
                        }),
                        { revenue: 0, cost: 0, hours: 0, profit: 0 }
                      );
                      yearlyTotal.profit = yearlyTotal.revenue - yearlyTotal.cost;
                      const yearlyMargin = yearlyTotal.revenue > 0 
                        ? (yearlyTotal.profit / yearlyTotal.revenue) * 100 
                        : 0;
                      const isYearlyProfit = yearlyTotal.profit >= 0;
                      const isYearlyPositiveMargin = yearlyMargin >= 0;
                      
                      return (
                        <TableRow className="bg-primary/5 font-bold border-t-2">
                          <TableCell className="font-bold">RAZEM ({profitabilityData.year})</TableCell>
                          <TableCell className="text-right font-bold">
                            {yearlyTotal.hours.toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(yearlyTotal.revenue)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(yearlyTotal.cost)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${
                            isYearlyProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}>
                            {formatCurrency(yearlyTotal.profit)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${
                            isYearlyPositiveMargin ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}>
                            {yearlyMargin >= 0 ? "+" : ""}{yearlyMargin.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedProjectId && !profitabilityData && !profitabilityLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak danych dla wybranego projektu i roku</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedProjectId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Wybierz projekt, aby zobaczyć analizę rentowności</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

