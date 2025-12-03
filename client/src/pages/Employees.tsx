import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, FileText, ArrowLeft, Calendar } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Employees() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  
  const { data: employees, isLoading, refetch } = trpc.employees.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Pracownik dodany pomyślnie");
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Błąd: " + error.message);
    },
  });
  
  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("Pracownik zaktualizowany");
      refetch();
      setIsDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
    },
  });
  
  const deleteMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("Pracownik usunięty");
      refetch();
    },
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    position: "",
    employmentType: "uop" as "uop" | "b2b" | "zlecenie" | "zlecenie_studenckie",
    monthlySalaryGross: "",
    monthlySalaryNet: "",
    monthlyCostTotal: "",
    hourlyRateCost: "",
    hourlyRateEmployee: "",
    hourlyRateClient: "",
    vacationCostMonthly: "",
    vacationCostAnnual: "",
    vacationDaysPerYear: "21",
  });

  // Automatyczne obliczanie kosztów
  const utils = trpc.useUtils();

  // Automatyczne przeliczanie kosztów gdy zmieni się netto lub dni urlopu
  useEffect(() => {
    const netValue = parseFloat(formData.monthlySalaryNet || "0");
    const vacationDays = parseInt(formData.vacationDaysPerYear || "21");
    
    // Przelicz tylko jeśli netto > 0 i formularz jest otwarty
    if (netValue > 0 && isDialogOpen) {
      const timeoutId = setTimeout(() => {
        handleAutoCalculate();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.monthlySalaryNet, formData.vacationDaysPerYear, formData.employmentType, isDialogOpen]);

  const handleAutoCalculate = async (netStr?: string) => {
    const netValue = parseFloat(netStr || formData.monthlySalaryNet);
    const vacationDays = parseInt(formData.vacationDaysPerYear || "21");
    
    // Oblicz stawkę pracownika automatycznie: netto / 168h
    const employeeRate = Math.round((netValue / 168) * 100) / 100; // Zaokrąglenie do 2 miejsc
    
    console.log('[AUTO-CALC] netValue:', netValue, 'employeeRate:', employeeRate, 'vacationDays:', vacationDays);
    console.log('[AUTO-CALC] employmentType:', formData.employmentType);
    
    if (netValue > 0) {
      console.log('[AUTO-CALC] Triggering calculation with:', {
        employmentType: formData.employmentType,
        monthlySalaryNet: Math.round(netValue * 100),
        hourlyRateEmployee: Math.round(employeeRate * 100),
        vacationDaysPerYear: vacationDays,
      });
      
      try {
        const result = await utils.client.employees.calculateSalary.query({
          employmentType: formData.employmentType,
          monthlySalaryNet: Math.round(netValue * 100),
          hourlyRateEmployee: Math.round(employeeRate * 100),
          vacationDaysPerYear: vacationDays,
        });
        
        console.log('[AUTO-CALC] Received data:', result);
        console.log('[AUTO-CALC] Monthly cost total:', result.monthlyCostTotal / 100, 'Vacation monthly:', result.vacationCostMonthly / 100);
        
        setFormData(prev => ({
          ...prev,
          monthlySalaryGross: (result.monthlySalaryGross / 100).toFixed(2),
          monthlyCostTotal: (result.monthlyCostTotal / 100).toFixed(2),
          hourlyRateCost: (result.hourlyRateCost / 100).toFixed(2),
          vacationCostMonthly: (result.vacationCostMonthly / 100).toFixed(2),
          vacationCostAnnual: (result.vacationCostAnnual / 100).toFixed(2),
        }));
      } catch (error) {
        console.error('[AUTO-CALC] Error:', error);
      }
    } else {
      console.log('[AUTO-CALC] Skipping - invalid values');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      position: "",
      employmentType: "uop",
      monthlySalaryGross: "",
      monthlySalaryNet: "",
      monthlyCostTotal: "",
      hourlyRateCost: "",
      hourlyRateEmployee: "",
      hourlyRateClient: "",
      vacationCostMonthly: "",
      vacationCostAnnual: "",
      vacationDaysPerYear: "21",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      position: formData.position || undefined,
      employmentType: formData.employmentType,
      monthlySalaryGross: Math.round(parseFloat(formData.monthlySalaryGross || "0") * 100),
      monthlySalaryNet: Math.round(parseFloat(formData.monthlySalaryNet || "0") * 100),
      monthlyCostTotal: Math.round(parseFloat(formData.monthlyCostTotal || "0") * 100),
      hourlyRateCost: Math.round(parseFloat(formData.hourlyRateCost || "0") * 100),
      hourlyRateEmployee: Math.round(parseFloat(formData.hourlyRateEmployee || "0") * 100),
      hourlyRateClient: Math.round(parseFloat(formData.hourlyRateClient || "0") * 100),
      vacationCostMonthly: Math.round(parseFloat(formData.vacationCostMonthly || "0") * 100),
      vacationCostAnnual: Math.round(parseFloat(formData.vacationCostAnnual || "0") * 100),
      vacationDaysPerYear: parseInt(formData.vacationDaysPerYear || "21"),
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    const netSalary = (employee.monthlySalaryNet / 100).toString();
    const vacationDays = (employee.vacationDaysPerYear || 21).toString();
    
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position || "",
      employmentType: employee.employmentType,
      monthlySalaryGross: (employee.monthlySalaryGross / 100).toString(),
      monthlySalaryNet: netSalary,
      monthlyCostTotal: (employee.monthlyCostTotal / 100).toString(),
      hourlyRateCost: (employee.hourlyRateCost / 100).toString(),
      hourlyRateEmployee: (employee.hourlyRateEmployee / 100).toString(),
      hourlyRateClient: (employee.hourlyRateClient / 100).toString(),
      vacationCostMonthly: (employee.vacationCostMonthly / 100).toString(),
      vacationCostAnnual: (employee.vacationCostAnnual / 100).toString(),
      vacationDaysPerYear: vacationDays,
    });
    setIsDialogOpen(true);
    
    // Przelicz koszty z aktualnymi dniami urlopu
    setTimeout(() => handleAutoCalculate(netSalary), 300);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount / 100);
  };

  const employmentTypeLabels = {
    uop: "Umowa o pracę",
    b2b: "B2B",
    zlecenie: "Zlecenie",
    zlecenie_studenckie: "Zlecenie studenckie",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        onClick={() => setLocation("/")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Wróć do dashboardu
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pracownicy</h1>
          <p className="text-muted-foreground">Zarządzaj zespołem</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEmployee(null); resetForm(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj pracownika
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Edytuj pracownika" : "Dodaj pracownika"}
                </DialogTitle>
                <DialogDescription>
                  Wprowadź dane pracownika
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Imię</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nazwisko</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Stanowisko</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Typ umowy</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(value: any) => {
                      setFormData({ ...formData, employmentType: value });
                      // Przelicz koszty po zmianie typu umowy
                      setTimeout(() => handleAutoCalculate(), 200);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uop">Umowa o pracę</SelectItem>
                      <SelectItem value="b2b">B2B</SelectItem>
                      <SelectItem value="zlecenie">Zlecenie</SelectItem>
                      <SelectItem value="zlecenie_studenckie">Zlecenie studenckie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gross">Brutto (PLN)</Label>
                    <Input
                      id="gross"
                      type="number"
                      step="0.01"
                      value={formData.monthlySalaryGross}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="net">
                      {formData.employmentType === "uop" 
                        ? "Brutto (PLN)" 
                        : "Netto (PLN)"}
                    </Label>
                    <Input
                      id="net"
                      type="number"
                      step="0.01"
                      value={formData.monthlySalaryNet}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const netValue = parseFloat(newValue) || 0;
                        const autoEmployeeRate = (netValue / 168).toFixed(2);
                        setFormData({ 
                          ...formData, 
                          monthlySalaryNet: newValue,
                          hourlyRateEmployee: autoEmployeeRate
                        });
                        setTimeout(() => handleAutoCalculate(newValue), 200);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.employmentType === "uop"
                        ? "Kwota brutto (przed odliczeniami ZUS i podatku)"
                        : "Kwota którą pracownik otrzyma \"na rękę\""}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Koszt (PLN)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.monthlyCostTotal}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRateEmployee">Stawka godz. pracownika (PLN)</Label>
                    <Input
                      id="hourlyRateEmployee"
                      type="number"
                      step="0.01"
                      value={formData.hourlyRateEmployee}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Obliczane automatycznie: netto / 168h</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRateClient">Stawka godz. dla klienta (PLN)</Label>
                    <Input
                      id="hourlyRateClient"
                      type="number"
                      step="0.01"
                      value={formData.hourlyRateClient}
                      onChange={(e) => setFormData({ ...formData, hourlyRateClient: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vacationDays">Dni urlopu rocznie</Label>
                  <Input
                    id="vacationDays"
                    type="number"
                    step="1"
                    min="0"
                    max="365"
                    value={formData.vacationDaysPerYear}
                    onChange={(e) => {
                      setFormData({ ...formData, vacationDaysPerYear: e.target.value });
                      // Przelicz koszty po zmianie dni urlopu
                      setTimeout(() => handleAutoCalculate(), 200);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Płatne dni urlopu w roku (wpływa na koszt pracownika)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingEmployee ? "Zapisz" : "Dodaj"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista pracowników</CardTitle>
          <CardDescription>
            Wszyscy pracownicy w systemie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Stanowisko</TableHead>
                <TableHead>Typ umowy</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead className="text-right">Koszt firmy</TableHead>
                <TableHead className="text-right">Koszt godz.</TableHead>
                <TableHead className="text-right">Stawka prac.</TableHead>
                <TableHead className="text-right">Stawka klient</TableHead>
                <TableHead className="text-right">Dni urlopu</TableHead>
                <TableHead className="text-right">Urlop mies.</TableHead>
                <TableHead className="text-right">Urlop rocz.</TableHead>
                <TableHead className="text-right">Zysk mies.</TableHead>
                <TableHead className="text-right">Zysk rocz.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((employee) => {
                // Używamy zapisanych wartości z bazy danych
                const vacationCostMonthly = employee.vacationCostMonthly / 100;
                const vacationCostAnnual = employee.vacationCostAnnual / 100;
                
                // Obliczamy zysk: (168h × stawka klienta) - koszt firmy
                const monthlyRevenue = (168 * employee.hourlyRateClient) / 100;
                const monthlyCost = employee.monthlyCostTotal / 100;
                const monthlyProfit = monthlyRevenue - monthlyCost;
                const annualProfit = monthlyProfit * 12;
                
                // Kolorowanie tła według progów rentowności
                const getProfitColor = (profit: number) => {
                  if (profit < 0) return 'bg-red-100 text-red-800'; // Strata
                  if (profit < 4000) return 'bg-orange-100 text-orange-800'; // Poniżej 4k
                  if (profit < 8000) return 'bg-green-100 text-green-800'; // 4k-8k
                  return 'bg-yellow-100 text-yellow-800'; // Powyżej 8k
                };
                
                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    <TableCell>{employee.position || "-"}</TableCell>
                    <TableCell>{employmentTypeLabels[employee.employmentType]}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.monthlySalaryNet)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.monthlyCostTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.hourlyRateCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.hourlyRateEmployee)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.hourlyRateClient)}
                    </TableCell>
                    <TableCell className="text-right">
                      {employee.vacationDaysPerYear || 21}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("pl-PL", {
                        style: "currency",
                        currency: "PLN",
                      }).format(vacationCostMonthly)}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("pl-PL", {
                        style: "currency",
                        currency: "PLN",
                      }).format(vacationCostAnnual)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${getProfitColor(monthlyProfit)}`}>
                        {new Intl.NumberFormat("pl-PL", {
                          style: "currency",
                          currency: "PLN",
                        }).format(monthlyProfit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat("pl-PL", {
                        style: "currency",
                        currency: "PLN",
                      }).format(annualProfit)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.isActive 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {employee.isActive ? "Aktywny" : "Nieaktywny"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/employee/${employee.id}/annual-report`)}
                          title="Raport roczny godzinowy"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          <span className="text-xs">Raport</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(employee)}
                          title="Edytuj pracownika"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Czy na pewno chcesz usunąć tego pracownika?")) {
                              deleteMutation.mutate({ id: employee.id });
                            }
                          }}
                          title="Usuń pracownika"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {employees?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={15} className="text-center text-muted-foreground">
                    Brak pracowników. Dodaj pierwszego pracownika.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
