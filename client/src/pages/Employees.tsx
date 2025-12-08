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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Pencil, Trash2, FileText, ArrowLeft, Calendar, Briefcase, Users, Search, X, FileCheck, Download, Upload, MoreVertical } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Employees() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isManageProjectsDialogOpen, setIsManageProjectsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [assigningEmployee, setAssigningEmployee] = useState<any>(null);
  const [managingEmployee, setManagingEmployee] = useState<any>(null);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  
  // Filtry i wyszukiwanie
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmploymentType, setFilterEmploymentType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const { data: employees, isLoading, refetch } = trpc.employees.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  const { data: projects } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  const utils = trpc.useUtils();
  
  const exportMutation = trpc.employees.exportEmployees.useMutation();
  const importMutation = trpc.employees.importEmployees.useMutation({
    onSuccess: (result) => {
      toast.success(`Import zakończony: ${result.created} utworzonych, ${result.updated} zaktualizowanych${result.errors.length > 0 ? `, ${result.errors.length} błędów` : ''}`);
      if (result.errors.length > 0) {
        console.error('Błędy importu:', result.errors);
      }
      refetch();
    },
    onError: (error) => {
      toast.error("Błąd importu: " + error.message);
    },
  });
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync();
      
      // Konwertuj base64 na blob
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });
      
      // Pobierz plik
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Eksport zakończony pomyślnie");
    } catch (error: any) {
      toast.error("Błąd eksportu: " + error.message);
    }
  };
  
  const handleImport = async () => {
    if (!importFile) {
      toast.error("Wybierz plik do importu");
      return;
    }
    
    try {
      // Konwertuj plik na base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1] || '';
        await importMutation.mutateAsync({
          filename: importFile.name,
          data: base64,
        });
        setIsImportDialogOpen(false);
        setImportFile(null);
      };
      reader.readAsDataURL(importFile);
    } catch (error: any) {
      toast.error("Błąd importu: " + error.message);
    }
  };
  
  const createAssignmentMutation = trpc.assignments.create.useMutation({
    onSuccess: () => {
      toast.success("Pracownik przypisany do projektu");
      setIsAssignmentDialogOpen(false);
      setAssigningEmployee(null);
      resetAssignmentForm();
      if (managingEmployee) {
        utils.assignments.byEmployee.invalidate({ employeeId: managingEmployee.id });
      }
    },
    onError: (error) => {
      toast.error("Błąd: " + error.message);
    },
  });
  
  const updateAssignmentMutation = trpc.assignments.update.useMutation({
    onSuccess: () => {
      toast.success("Przypisanie zaktualizowane");
      setIsAssignmentDialogOpen(false);
      setAssigningEmployee(null);
      resetAssignmentForm();
      if (managingEmployee) {
        utils.assignments.byEmployee.invalidate({ employeeId: managingEmployee.id });
      }
    },
    onError: (error) => {
      toast.error("Błąd: " + error.message);
    },
  });
  
  const deleteAssignmentMutation = trpc.assignments.delete.useMutation({
    onSuccess: () => {
      toast.success("Pracownik wypisany z projektu");
      if (managingEmployee) {
        utils.assignments.byEmployee.invalidate({ employeeId: managingEmployee.id });
      }
    },
    onError: (error) => {
      toast.error("Błąd: " + error.message);
    },
  });
  
  const { data: employeeAssignments } = trpc.assignments.byEmployee.useQuery(
    { employeeId: managingEmployee?.id || 0 },
    { enabled: !!managingEmployee && !!user }
  );
  
  const [assignmentFormData, setAssignmentFormData] = useState({
    projectId: "",
  });
  
  const resetAssignmentForm = () => {
    setAssignmentFormData({
      projectId: "",
    });
    setEditingAssignment(null);
  };
  
  const handleAssign = (employee: any) => {
    setAssigningEmployee(employee);
    setAssignmentFormData({
      projectId: "",
    });
    setIsAssignmentDialogOpen(true);
  };
  
  const handleManageProjects = (employee: any) => {
    setManagingEmployee(employee);
    setIsManageProjectsDialogOpen(true);
  };
  
  const handleDeleteAssignment = (assignmentId: number) => {
    if (confirm("Czy na pewno chcesz wypisać pracownika z tego projektu?")) {
      deleteAssignmentMutation.mutate({ id: assignmentId });
    }
  };
  
  const handleAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEmployee) return;
    
    if (editingAssignment) {
      // Edycja nie jest potrzebna - tylko usuwanie
      return;
    } else {
      // Tworzenie nowego przypisania - użyj domyślnych stawek z profilu pracownika
      createAssignmentMutation.mutate({
        employeeId: assigningEmployee.id,
        projectId: parseInt(assignmentFormData.projectId),
        hourlyRateClient: assigningEmployee.hourlyRateClient || 0,
        hourlyRateCost: assigningEmployee.hourlyRateCost || 0,
      });
    }
  };
  
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

  // Filtrowanie i sortowanie pracowników
  const filteredAndSortedEmployees = employees?.filter(employee => {
    // Wyszukiwanie
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      employee.firstName.toLowerCase().includes(searchLower) ||
      employee.lastName.toLowerCase().includes(searchLower) ||
      (employee.position?.toLowerCase().includes(searchLower) ?? false);
    
    // Filtr typu umowy
    const matchesEmploymentType = filterEmploymentType === "all" || employee.employmentType === filterEmploymentType;
    
    // Filtr statusu
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && employee.isActive === true) ||
      (filterStatus === "inactive" && employee.isActive === false);
    
    return matchesSearch && matchesEmploymentType && matchesStatus;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "name":
        comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        break;
      case "position":
        comparison = (a.position || "").localeCompare(b.position || "");
        break;
      case "employmentType":
        comparison = a.employmentType.localeCompare(b.employmentType);
        break;
      case "netSalary":
        comparison = a.monthlySalaryNet - b.monthlySalaryNet;
        break;
      case "totalCost":
        comparison = a.monthlyCostTotal - b.monthlyCostTotal;
        break;
      case "monthlyProfit": {
        const profitA = (168 * a.hourlyRateClient) / 100 - a.monthlyCostTotal / 100;
        const profitB = (168 * b.hourlyRateClient) / 100 - b.monthlyCostTotal / 100;
        comparison = profitA - profitB;
        break;
      }
      case "status":
        comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-[98vw] xl:max-w-[95vw] space-y-6 px-2 sm:px-4">
      <Button onClick={() => setLocation("/")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do dashboardu
      </Button>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Pracownicy
          </h1>
          <p className="text-muted-foreground">Zarządzaj pracownikami i ich kosztami</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleExport} 
            variant="outline"
            disabled={exportMutation.isPending}
            className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Eksportuj
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importuj
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import pracowników z Excel</DialogTitle>
                <DialogDescription>
                  Wybierz plik Excel z danymi pracowników. Jeśli pracownik ma ID, zostanie zaktualizowany, w przeciwnym razie zostanie utworzony nowy.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="importFile">Plik Excel (.xlsx)</Label>
                  <Input
                    id="importFile"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
                {importFile && (
                  <p className="text-sm text-muted-foreground">
                    Wybrany plik: {importFile.name}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportFile(null);
                  }}
                >
                  Anuluj
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importFile || importMutation.isPending}
                >
                  {importMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Importuj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingEmployee(null); resetForm(); }} className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista pracowników</CardTitle>
          <CardDescription>
            Wszyscy pracownicy w systemie. Przewiń w poziomie, aby zobaczyć wszystkie kolumny.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtry i wyszukiwanie */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po imieniu, nazwisku, stanowisku..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={filterEmploymentType} onValueChange={setFilterEmploymentType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Typ umowy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                <SelectItem value="uop">Umowa o pracę</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="zlecenie">Zlecenie</SelectItem>
                <SelectItem value="zlecenie_studenckie">Zlecenie studenckie</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="active">Aktywni</SelectItem>
                <SelectItem value="inactive">Nieaktywni</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
              const [by, order] = v.split("-");
              setSortBy(by);
              setSortOrder(order as "asc" | "desc");
            }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sortuj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Imię A-Z</SelectItem>
                <SelectItem value="name-desc">Imię Z-A</SelectItem>
                <SelectItem value="position-asc">Stanowisko A-Z</SelectItem>
                <SelectItem value="position-desc">Stanowisko Z-A</SelectItem>
                <SelectItem value="netSalary-desc">Wynagrodzenie ↓</SelectItem>
                <SelectItem value="netSalary-asc">Wynagrodzenie ↑</SelectItem>
                <SelectItem value="totalCost-desc">Koszt ↓</SelectItem>
                <SelectItem value="totalCost-asc">Koszt ↑</SelectItem>
                <SelectItem value="monthlyProfit-desc">Zysk ↓</SelectItem>
                <SelectItem value="monthlyProfit-asc">Zysk ↑</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {filteredAndSortedEmployees && filteredAndSortedEmployees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak pracowników spełniających kryteria wyszukiwania
            </div>
          )}
          
          {/* Tabela z poziomym przewijaniem */}
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[1600px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[180px] sticky left-0 bg-muted/50 z-10 border-r shadow-sm">Imię i nazwisko</TableHead>
                <TableHead className="min-w-[120px]">Stanowisko</TableHead>
                <TableHead className="min-w-[130px]">Typ umowy</TableHead>
                <TableHead className="text-right min-w-[100px]">Netto</TableHead>
                <TableHead className="text-right min-w-[110px]">Koszt firmy</TableHead>
                <TableHead className="text-right min-w-[100px]">Koszt godz.</TableHead>
                <TableHead className="text-right min-w-[110px]">Stawka prac.</TableHead>
                <TableHead className="text-right min-w-[110px]">Stawka klient</TableHead>
                <TableHead className="text-right min-w-[90px]">Dni urlopu</TableHead>
                <TableHead className="text-right min-w-[110px]">Urlop mies.</TableHead>
                <TableHead className="text-right min-w-[110px]">Urlop rocz.</TableHead>
                <TableHead className="text-right min-w-[120px]">Zysk mies.</TableHead>
                <TableHead className="text-right min-w-[120px]">Zysk rocz.</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="text-right min-w-[80px] sticky right-0 bg-muted/50 z-10 border-l shadow-sm">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedEmployees?.map((employee, idx) => {
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
                  <TableRow key={employee.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium sticky left-0 bg-background z-10 border-r shadow-sm">
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
                    <TableCell className="text-right sticky right-0 bg-background z-10 border-l shadow-sm">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleEdit(employee)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edytuj pracownika
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleManageProjects(employee)}
                            className="cursor-pointer"
                          >
                            <Briefcase className="mr-2 h-4 w-4" />
                            Zarządzaj projektami
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setLocation(`/employee/${employee.id}/annual-report`)}
                            className="cursor-pointer"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Raport roczny
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setLocation(`/employee/${employee.id}/cv`)}
                            className="cursor-pointer"
                          >
                            <FileCheck className="mr-2 h-4 w-4" />
                            Pokaż CV
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm("Czy na pewno chcesz usunąć tego pracownika?")) {
                                deleteMutation.mutate({ id: employee.id });
                              }
                            }}
                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Usuń pracownika
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog przypisania do projektu */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={(open) => {
        setIsAssignmentDialogOpen(open);
        if (!open) {
          resetAssignmentForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleAssignmentSubmit}>
            <DialogHeader>
              <DialogTitle>Przypisz pracownika do projektu</DialogTitle>
              <DialogDescription>
                {assigningEmployee && `Przypisz ${assigningEmployee.firstName} ${assigningEmployee.lastName} do projektu`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Projekt</Label>
                <Select
                  value={assignmentFormData.projectId}
                  onValueChange={(value) => setAssignmentFormData({ ...assignmentFormData, projectId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz projekt" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createAssignmentMutation.isPending}>
                {createAssignmentMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Przypisz
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zarządzania projektami */}
      <Dialog open={isManageProjectsDialogOpen} onOpenChange={setIsManageProjectsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Zarządzaj projektami - {managingEmployee?.firstName} {managingEmployee?.lastName}</DialogTitle>
            <DialogDescription>
              Przypisania pracownika do projektów z możliwością edycji stawki lub wypisania
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Lista przypisań */}
            {employeeAssignments && employeeAssignments.length > 0 ? (
              <div className="space-y-3">
                {employeeAssignments.map((assignment: any) => {
                  const project = projects?.find(p => p.id === assignment.projectId);
                  return (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{project?.name || `Projekt #${assignment.projectId}`}</p>
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                          assignment.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.isActive ? 'Aktywne' : 'Nieaktywne'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Wypisz
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Brak przypisań do projektów
              </p>
            )}
            
            {/* Przycisk dodania nowego projektu */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsManageProjectsDialogOpen(false);
                  handleAssign(managingEmployee);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj nowy projekt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
