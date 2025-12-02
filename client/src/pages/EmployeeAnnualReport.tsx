import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EmployeeAnnualReport() {
  const { user } = useAuth();
  const params = useParams();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(params.id || "0");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editingMonth, setEditingMonth] = useState<any>(null);
  const [actualCostInput, setActualCostInput] = useState("");


  const { data: report, isLoading, refetch } = trpc.employees.getAnnualReport.useQuery(
    { employeeId, year: selectedYear },
    { enabled: !!user && employeeId > 0 }
  );
  
  const updateActualCostMutation = trpc.employees.updateActualCost.useMutation({
    onSuccess: () => {
      refetch();
      setEditingMonth(null);
      setActualCostInput("");
    },
  });
  
  const handleEditActualCost = (month: any) => {
    setEditingMonth(month);
    setActualCostInput(month.actualCost !== null ? (month.actualCost / 100).toFixed(2) : "");
  };
  
  const handleSaveActualCost = () => {
    if (!editingMonth) return;
    
    const actualCostValue = actualCostInput.trim() === "" ? null : Math.round(parseFloat(actualCostInput) * 100);
    
    updateActualCostMutation.mutate({
      employeeId,
      year: selectedYear,
      month: editingMonth.month,
      actualCost: actualCostValue,
    });
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const formatHours = (hours: number) => {
    return (hours / 100).toFixed(2) + "h";
  };

  const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];



  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Wymagane logowanie</CardTitle>
            <CardDescription>Musisz być zalogowany aby zobaczyć tę stronę</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Nie znaleziono pracownika</CardTitle>
            <CardDescription>Pracownik o podanym ID nie istnieje</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/employees")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do listy pracowników
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { employee, months, summary } = report;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button onClick={() => setLocation("/employees")} variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do listy pracowników
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">
          Raport roczny: {employee.firstName} {employee.lastName}
        </h1>
        <p className="text-muted-foreground">
          Stanowisko: {employee.position || "Nie podano"} | Typ umowy: {employee.employmentType.toUpperCase()}
        </p>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-medium">Rok:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-4 py-2 border rounded-md"
        >
          {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Podsumowanie miesięczne</CardTitle>
          <CardDescription>
            Godziny pobierane automatycznie z raportów miesięcznych
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miesiąc</TableHead>
                  <TableHead className="text-right">Godziny</TableHead>
                  <TableHead className="text-right">Stawka klienta</TableHead>
                  <TableHead className="text-right">Przychód</TableHead>
                  <TableHead className="text-right">Koszt domyślny</TableHead>
                  <TableHead className="text-right">Koszt rzeczywisty</TableHead>
                  <TableHead className="text-right">Zysk/Strata</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>

                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((month) => {
                  const isProfit = month.profit >= 0;
                  
                  return (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">{monthNames[month.month - 1]}</TableCell>
                      <TableCell className="text-right">
                        {formatHours(month.hoursWorked)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(month.hourlyRateClient)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(month.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(month.defaultCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {month.actualCost !== null ? formatCurrency(month.actualCost) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(month.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditActualCost(month)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie roczne {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Łączne godziny</p>
              <p className="text-2xl font-bold">{formatHours(summary.totalHours)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Łączny przychód</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Łączny koszt</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalCost)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Łączny zysk/strata</p>
              <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalProfit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog edycji kosztu rzeczywistego */}
      <Dialog open={!!editingMonth} onOpenChange={() => setEditingMonth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj koszt rzeczywisty</DialogTitle>
            <DialogDescription>
              {editingMonth && `${monthNames[editingMonth.month - 1]} ${selectedYear}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="defaultCost">Koszt domyślny (z bazy danych)</Label>
              <Input
                id="defaultCost"
                type="text"
                value={editingMonth ? formatCurrency(editingMonth.defaultCost) : ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="actualCost">Koszt rzeczywisty (opcjonalnie)</Label>
              <Input
                id="actualCost"
                type="number"
                step="0.01"
                placeholder="Zostaw puste aby użyć kosztu domyślnego"
                value={actualCostInput}
                onChange={(e) => setActualCostInput(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Wpisz kwotę w złotówkach (np. 7200.00) lub zostaw puste aby użyć kosztu domyślnego
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMonth(null)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveActualCost} disabled={updateActualCostMutation.isPending}>
              {updateActualCostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
