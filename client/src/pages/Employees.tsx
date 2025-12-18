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
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Loader2, Plus, Pencil, Trash2, FileText, ArrowLeft, Calendar, Briefcase, Users, Search, X, FileCheck, Download, Upload, MoreVertical, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, Calculator, RotateCcw, BarChart3, Lightbulb, Key, Lock, Link2, Unlink, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Employees() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Sprawdź czy użytkownik jest administratorem
  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Brak dostępu</h1>
          <p className="text-muted-foreground mb-4">
            Ta strona jest dostępna tylko dla administratorów.
          </p>
          <Button onClick={() => setLocation("/my-cv")}>
            Przejdź do Moje CV
          </Button>
        </div>
      </div>
    );
  }
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isManageProjectsDialogOpen, setIsManageProjectsDialogOpen] = useState(false);
  const [isLoginDataDialogOpen, setIsLoginDataDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editingLoginDataEmployee, setEditingLoginDataEmployee] = useState<any>(null);
  const [assigningEmployee, setAssigningEmployee] = useState<any>(null);
  const [managingEmployee, setManagingEmployee] = useState<any>(null);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  
  // Filtry i wyszukiwanie
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmploymentType, setFilterEmploymentType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedEmployeeForAI, setSelectedEmployeeForAI] = useState<number | null>(null);
  const [isEmployeeAIAnalysisOpen, setIsEmployeeAIAnalysisOpen] = useState(false);
  // What-if i scenariusze
  const [excludedEmployeeIds, setExcludedEmployeeIds] = useState<Set<number>>(new Set());
  const [simulationClientRateChange, setSimulationClientRateChange] = useState<number>(0);
  const [simulationCostChange, setSimulationCostChange] = useState<number>(0);
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  const [isAdvancedScenariosOpen, setIsAdvancedScenariosOpen] = useState(false);
  const [scenarioType, setScenarioType] = useState<"optimization" | "projections" | "impact" | "market">("optimization");
  const [marketTrendsTriggered, setMarketTrendsTriggered] = useState(false);
  
  const { data: employees, isLoading, refetch } = trpc.employees.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  const { data: projects } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });

  const employeeAIQuery = trpc.aiFinancial.analyzeEmployee.useQuery(
    { employeeId: selectedEmployeeForAI! },
    {
      enabled: !!selectedEmployeeForAI && isEmployeeAIAnalysisOpen,
      retry: false,
    }
  );

  const marketTrendsQuery = trpc.aiFinancial.analyzeMarketTrends.useQuery(undefined, {
    enabled: marketTrendsTriggered && scenarioType === "market",
    retry: false,
  });

  // Pomocnicze kalkulacje
  const calcMonthlyProfit = (emp: any, rateChangePct = 0, costChangePct = 0) => {
    const rate = (emp.hourlyRateClient || 0) * (1 + rateChangePct / 100);
    const cost = (emp.monthlyCostTotal || 0) * (1 + costChangePct / 100);
    return (168 * rate - cost) / 100;
  };

  const calcMargin = (emp: any, rateChangePct = 0, costChangePct = 0) => {
    const revenue = 168 * (emp.hourlyRateClient || 0) * (1 + rateChangePct / 100);
    const cost = (emp.monthlyCostTotal || 0) * (1 + costChangePct / 100);
    if (revenue <= 0) return 0;
    return ((revenue - cost) / revenue) * 100;
  };
  
  const utils = trpc.useUtils();
  
  const exportMutation = trpc.employees.exportEmployees.useMutation();
  const importMutation = trpc.employees.importEmployees.useMutation({
    onSuccess: async (result) => {
      console.log('[Import] Wynik importu:', result);
      toast.success(`Import zakończony: ${result.created} utworzonych, ${result.updated} zaktualizowanych${result.errors.length > 0 ? `, ${result.errors.length} błędów` : ''}`);
      if (result.errors.length > 0) {
        console.error('Błędy importu:', result.errors);
      }
      // Odśwież dane - użyj invalidate i refetch dla pewności
      console.log('[Import] Odświeżanie danych...');
      await utils.employees.list.invalidate();
      const refreshedData = await refetch();
      console.log('[Import] Odświeżone dane:', refreshedData.data?.length, 'pracowników');
      // Dodatkowo wymuś odświeżenie po krótkim opóźnieniu
      setTimeout(async () => {
        const refreshedData2 = await refetch();
        console.log('[Import] Drugie odświeżenie:', refreshedData2.data?.length, 'pracowników');
      }, 500);
    },
    onError: (error) => {
      console.error('[Import] Błąd:', error);
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
    
    // Sprawdź rozszerzenie pliku
    const fileExtension = importFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      toast.error("Nieprawidłowy format pliku. Wybierz plik Excel (.xlsx lub .xls)");
      return;
    }
    
    try {
      // Konwertuj plik na base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          if (!result) {
            toast.error("Błąd: Nie można odczytać pliku");
            return;
          }
          
          const base64 = result.split(',')[1];
          if (!base64) {
            toast.error("Błąd: Nie można przekonwertować pliku na base64");
            return;
          }
          
          console.log('[Import] Wysyłanie pliku do importu:', {
            filename: importFile.name,
            size: importFile.size,
            base64Length: base64.length
          });
          
          await importMutation.mutateAsync({
            filename: importFile.name,
            data: base64,
          });
          setIsImportDialogOpen(false);
          setImportFile(null);
        } catch (error: any) {
          console.error('[Import] Błąd podczas importu:', error);
          toast.error("Błąd importu: " + (error.message || 'Nieznany błąd'));
        }
      };
      reader.onerror = () => {
        toast.error("Błąd: Nie można odczytać pliku");
      };
      reader.readAsDataURL(importFile);
    } catch (error: any) {
      console.error('[Import] Błąd:', error);
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
  
  const updateLoginDataMutation = trpc.employees.updateLoginData.useMutation({
    onSuccess: () => {
      toast.success("Dane logowania zaktualizowane");
      refetch();
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
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

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
  
  const resetLoginData = () => {
    setLoginData({
      email: "",
      password: "",
    });
    setGeneratedPassword("");
    setShowPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = {
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
    // Debug: loguj pierwszego pracownika dla sprawdzenia
    if (employees && employees.length > 0 && employees.indexOf(employee) === 0) {
      console.log('[Employees] Przykładowy pracownik:', {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        isActive: employee.isActive,
        employmentType: employee.employmentType,
        searchTerm,
        filterEmploymentType,
        filterStatus
      });
    }
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

  const selectedEmployee = employees?.find(e => e.id === selectedEmployeeForAI);

  // Wykluczenia i symulacje
  const toggleExcludeEmployee = (id: number) => {
    setExcludedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const resetSimulations = () => {
    setSimulationClientRateChange(0);
    setSimulationCostChange(0);
    setExcludedEmployeeIds(new Set());
  };

  const includedEmployees = filteredAndSortedEmployees?.filter(e => !excludedEmployeeIds.has(e.id)) || [];

  const totalMonthlyProfit = includedEmployees.reduce((sum, emp) => sum + calcMonthlyProfit(emp), 0);
  const simulatedMonthlyProfit = includedEmployees.reduce(
    (sum, emp) => sum + calcMonthlyProfit(emp, simulationClientRateChange, simulationCostChange),
    0
  );
  const totalMonthlyCost = includedEmployees.reduce((sum, emp) => sum + (emp.monthlyCostTotal || 0) / 100, 0);
  const totalAnnualProfit = totalMonthlyProfit * 12;
  const totalAnnualCost = totalMonthlyCost * 12;
  const simulatedAnnualProfit = simulatedMonthlyProfit * 12;

  // Scenariusze optymalizacji z analizą zwolnień
  const optimizationScenarios = (() => {
    // Sortuj pracowników według rentowności (najgorsze na początku)
    const sortedByProfit = [...includedEmployees].sort((a, b) => {
      const profitA = calcMonthlyProfit(a);
      const profitB = calcMonthlyProfit(b);
      return profitA - profitB;
    });

    // Znajdź pracowników z ujemnym zyskiem
    const negativeProfit = sortedByProfit.filter(emp => calcMonthlyProfit(emp) < 0);
    
    // Znajdź pracowników z niską marżą (< 10%)
    const lowMargin = sortedByProfit.filter(emp => {
      const margin = calcMargin(emp);
      return margin >= 0 && margin < 10;
    });

    const scenarios = [];

    // Scenariusz 1: Zwolnienie pracowników z ujemnym zyskiem
    if (negativeProfit.length > 0) {
      const firedIds = new Set(negativeProfit.map(e => e.id));
      const remaining = includedEmployees.filter(e => !firedIds.has(e.id));
      const newProfit = remaining.reduce((sum, emp) => sum + calcMonthlyProfit(emp), 0) * 12;
      const savings = negativeProfit.reduce((sum, emp) => sum + (emp.monthlyCostTotal || 0) / 100, 0) * 12;
      
      scenarios.push({
        name: `Zwolnienie ${negativeProfit.length} ${negativeProfit.length === 1 ? 'pracownika' : 'pracowników'} ze stratą`,
        profit: newProfit,
        change: `Oszczędności: ${new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(savings)}`,
        employees: negativeProfit.map(e => `${e.firstName} ${e.lastName}`),
        savings: savings,
      });
    }

    // Scenariusz 2: Zwolnienie 3 najgorszych pracowników
    if (sortedByProfit.length >= 3) {
      const worst3 = sortedByProfit.slice(0, 3);
      const firedIds = new Set(worst3.map(e => e.id));
      const remaining = includedEmployees.filter(e => !firedIds.has(e.id));
      const newProfit = remaining.reduce((sum, emp) => sum + calcMonthlyProfit(emp), 0) * 12;
      const savings = worst3.reduce((sum, emp) => sum + (emp.monthlyCostTotal || 0) / 100, 0) * 12;
      
      scenarios.push({
        name: "Zwolnienie 3 najgorszych pracowników",
        profit: newProfit,
        change: `Oszczędności: ${new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(savings)}`,
        employees: worst3.map(e => `${e.firstName} ${e.lastName}`),
        savings: savings,
      });
    }

    // Scenariusz 3: Optymalizacja kosztów (-10%)
    scenarios.push({
      name: "Optymalizacja kosztów (-10%)",
      profit: includedEmployees.reduce((sum, emp) => sum + calcMonthlyProfit(emp, 0, -10), 0) * 12,
      change: "Koszty -10%",
      employees: [],
      savings: 0,
    });

    // Scenariusz 4: Podwyżka stawek (+10%)
    scenarios.push({
      name: "Podwyżka stawek (+10%)",
      profit: includedEmployees.reduce((sum, emp) => sum + calcMonthlyProfit(emp, 10, 0), 0) * 12,
      change: "Stawki +10%",
      employees: [],
      savings: 0,
    });

    return scenarios;
  })();

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

      {/* Karty podsumowań */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Łączny zysk miesięczny
              </CardTitle>
            </div>
            <CardDescription className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalMonthlyProfit)}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              {includedEmployees.length} {includedEmployees.length === 1 ? 'pracownik' : includedEmployees.length < 5 ? 'pracowników' : 'pracowników'} • {excludedEmployeeIds.size > 0 && `(${excludedEmployeeIds.size} wykluczonych)`}
            </p>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Łączny zysk roczny
              </CardTitle>
            </div>
            <CardDescription className="text-2xl font-bold text-blue-700">
              {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalAnnualProfit)}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalMonthlyProfit * 12)} rocznie
            </p>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                Łączny koszt roczny
              </CardTitle>
            </div>
            <CardDescription className="text-2xl font-bold text-orange-600">
              {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalAnnualCost)}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalMonthlyCost)} miesięcznie
            </p>
          </CardHeader>
        </Card>
        <Card className={`border-l-4 ${simulatedAnnualProfit >= totalAnnualProfit ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Symulowany zysk roczny
              </CardTitle>
            </div>
            <CardDescription className={`text-2xl font-bold ${simulatedAnnualProfit >= totalAnnualProfit ? "text-emerald-700" : "text-red-700"}`}>
              {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(simulatedAnnualProfit)}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              {simulationClientRateChange !== 0 || simulationCostChange !== 0 ? (
                <>
                  Stawki: {simulationClientRateChange > 0 ? '+' : ''}{simulationClientRateChange}% • 
                  Koszty: {simulationCostChange > 0 ? '+' : ''}{simulationCostChange}%
                </>
              ) : (
                'Brak zmian (użyj panelu Analiza)'
              )}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Przyciski analiza/scenariusze */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setIsAnalysisPanelOpen(true)}>
          <Calculator className="mr-2 h-4 w-4" />
          Analiza „what-if”
        </Button>
        <Button variant="outline" onClick={() => setIsAdvancedScenariosOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
          Scenariusze
        </Button>
        <Button variant="ghost" onClick={resetSimulations}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset symulacji
        </Button>
      </div>
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
            onClick={() => setLocation("/hrappka-mapping")}
            variant="outline"
            className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Mapuj z HRappka
          </Button>
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
          
          {filteredAndSortedEmployees && filteredAndSortedEmployees.length === 0 && employees && employees.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak pracowników spełniających kryteria wyszukiwania
              <p className="text-sm mt-2">
                (Znaleziono {employees.length} pracowników, ale filtry je ukrywają)
              </p>
            </div>
          )}
          {filteredAndSortedEmployees && filteredAndSortedEmployees.length === 0 && (!employees || employees.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Brak pracowników. Dodaj pierwszego pracownika.
            </div>
          )}
          
          {/* Tabela z poziomym przewijaniem */}
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[1400px]">
            <TableHeader>
              <TableRow className="border-b-2 border-border">
                <TableHead className="text-center min-w-[50px] sticky left-0 bg-background z-20 border-r-2 border-border shadow-sm px-1 py-2">
                  <Checkbox
                    checked={excludedEmployeeIds.size === 0 && filteredAndSortedEmployees && filteredAndSortedEmployees.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setExcludedEmployeeIds(new Set());
                      } else {
                        setExcludedEmployeeIds(new Set(filteredAndSortedEmployees?.map(e => e.id) || []));
                      }
                    }}
                    title="Zaznacz/odznacz wszystkich"
                  />
                </TableHead>
                <TableHead className="font-semibold min-w-[160px] sticky left-[50px] bg-background z-20 border-r-2 border-border shadow-sm px-2 py-2">Imię i nazwisko</TableHead>
                <TableHead className="min-w-[110px] px-2 py-2 border-l border-border/50">Stanowisko</TableHead>
                <TableHead className="min-w-[120px] px-2 py-2 border-l border-border/50">Typ umowy</TableHead>
                <TableHead className="text-right min-w-[85px] text-xs px-1.5 py-2 border-l-2 border-border/30 font-medium">Netto</TableHead>
                <TableHead className="text-right min-w-[95px] text-xs px-1.5 py-2 border-l border-border/30 font-medium text-orange-600">Koszt firmy</TableHead>
                <TableHead className="text-right min-w-[85px] text-xs px-1.5 py-2 border-l border-border/30">Koszt/h</TableHead>
                <TableHead className="text-right min-w-[95px] text-xs px-1.5 py-2 border-l border-border/30">Stawka prac.</TableHead>
                <TableHead className="text-right min-w-[95px] text-xs px-1.5 py-2 border-l border-border/30">Stawka klient</TableHead>
                <TableHead className="text-right min-w-[70px] text-xs px-1.5 py-2 border-l-2 border-border/30">Urlop</TableHead>
                <TableHead className="text-right min-w-[95px] text-xs px-1.5 py-2 border-l border-border/30">Urlop mies.</TableHead>
                <TableHead className="text-right min-w-[95px] text-xs px-1.5 py-2 border-l border-border/30">Urlop rocz.</TableHead>
                <TableHead className="text-right min-w-[130px] px-2 py-2 border-l-2 border-border/50 font-bold">Zysk mies.</TableHead>
                <TableHead className="text-right min-w-[105px] text-xs px-1.5 py-2 border-l border-border/30">Zysk rocz.</TableHead>
                <TableHead className="min-w-[60px] text-center px-1 py-2 border-l border-border/30">Status</TableHead>
                <TableHead className="text-right min-w-[70px] sticky right-0 bg-background z-20 border-l-2 border-border shadow-sm px-1 py-2">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Oblicz maksymalny zysk dla normalizacji progress barów
                const profits = filteredAndSortedEmployees?.map(emp => {
                  const revenue = (168 * emp.hourlyRateClient) / 100;
                  const cost = emp.monthlyCostTotal / 100;
                  return revenue - cost;
                }) || [];
                const maxProfit = Math.max(...profits, 1);
                const minProfit = Math.min(...profits, 0);
                const profitRange = maxProfit - minProfit || 1;
                
                return filteredAndSortedEmployees?.map((employee, idx) => {
                  // Używamy zapisanych wartości z bazy danych
                  const vacationCostMonthly = employee.vacationCostMonthly / 100;
                  const vacationCostAnnual = employee.vacationCostAnnual / 100;
                  
                  // Obliczamy zysk: (168h × stawka klienta) - koszt firmy
                  const monthlyRevenue = (168 * employee.hourlyRateClient) / 100;
                  const monthlyCost = employee.monthlyCostTotal / 100;
                  const monthlyProfit = monthlyRevenue - monthlyCost;
                  const annualProfit = monthlyProfit * 12;
                  
                  // Procent marży
                  const marginPercent = monthlyRevenue > 0 ? ((monthlyProfit / monthlyRevenue) * 100) : 0;
                  
                  // Normalizacja dla progress bara (0-100%)
                  const normalizedProfit = profitRange > 0 ? ((monthlyProfit - minProfit) / profitRange) * 100 : 0;
                
                // Kolorowanie tła według progów rentowności
                const getProfitColor = (profit: number) => {
                  if (profit < 0) return 'bg-red-100 text-red-800'; // Strata
                  if (profit < 4000) return 'bg-orange-100 text-orange-800'; // Poniżej 4k
                  if (profit < 8000) return 'bg-green-100 text-green-800'; // 4k-8k
                  return 'bg-yellow-100 text-yellow-800'; // Powyżej 8k
                };
                
                // Kolor tekstu i tła dla zysku - lepszy kontrast
                const getProfitStyle = (profit: number) => {
                  if (profit < 0) {
                    return {
                      textColor: 'text-red-700',
                      bgColor: 'bg-red-50',
                      borderColor: 'border-red-200'
                    };
                  }
                  if (profit < 4000) {
                    return {
                      textColor: 'text-orange-700',
                      bgColor: 'bg-orange-50',
                      borderColor: 'border-orange-200'
                    };
                  }
                  if (profit < 8000) {
                    return {
                      textColor: 'text-green-700',
                      bgColor: 'bg-green-50',
                      borderColor: 'border-green-200'
                    };
                  }
                  return {
                    textColor: 'text-emerald-700',
                    bgColor: 'bg-emerald-50',
                    borderColor: 'border-emerald-200'
                  };
                };
                
                // Ikona trendu dla zysku
                const getProfitIcon = (profit: number) => {
                  if (profit < 0) return <TrendingDown className="w-3 h-3 text-red-600" />;
                  if (profit < 4000) return <Minus className="w-3 h-3 text-orange-600" />;
                  return <TrendingUp className="w-3 h-3 text-green-600" />;
                };
                
                const isExcluded = excludedEmployeeIds.has(employee.id);
                
                return (
                  <TableRow key={employee.id} className={`hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'} ${isExcluded ? 'opacity-50' : ''}`}>
                    <TableCell className="text-center sticky left-0 bg-background z-20 border-r-2 border-border shadow-sm px-1 py-2">
                      <Checkbox
                        checked={!isExcluded}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(excludedEmployeeIds);
                          if (checked) {
                            newSet.delete(employee.id);
                          } else {
                            newSet.add(employee.id);
                          }
                          setExcludedEmployeeIds(newSet);
                        }}
                        title={isExcluded ? "Włącz w obliczenia" : "Wyłącz z obliczeń"}
                      />
                    </TableCell>
                    <TableCell className="font-medium sticky left-[50px] bg-background z-20 border-r-2 border-border shadow-sm px-2 py-2">
                      <div className="font-semibold">{employee.firstName} {employee.lastName}</div>
                    </TableCell>
                    <TableCell className="px-2 py-2 border-l border-border/50 text-muted-foreground">{employee.position || "-"}</TableCell>
                    <TableCell className="px-2 py-2 border-l border-border/50">
                      <span className="text-xs font-medium">{employmentTypeLabels[employee.employmentType]}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs px-1.5 py-2 border-l-2 border-border/30 font-mono">
                      {formatCurrency(employee.monthlySalaryNet)}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1.5 py-2 border-l border-border/30 font-mono text-orange-600 font-semibold">
                      {formatCurrency(employee.monthlyCostTotal)}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1.5 py-2 border-l border-border/30 font-mono text-muted-foreground">
                      {formatCurrency(employee.hourlyRateCost)}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1.5 py-2 border-l border-border/30 font-mono text-muted-foreground">
                      {formatCurrency(employee.hourlyRateEmployee)}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1.5 py-2 border-l border-border/30 font-mono text-blue-600">
                      {formatCurrency(employee.hourlyRateClient)}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1.5 py-2 border-l-2 border-border/30 font-mono">
                      {employee.vacationDaysPerYear || 21}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1.5 py-2 border-l border-border/30 font-mono text-muted-foreground">
                      {new Intl.NumberFormat("pl-PL", {
                        style: "currency",
                        currency: "PLN",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(vacationCostMonthly)}
                    </TableCell>
                    <TableCell className="text-right text-xs px-1.5 py-2 border-l border-border/30 font-mono text-muted-foreground">
                      {new Intl.NumberFormat("pl-PL", {
                        style: "currency",
                        currency: "PLN",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(vacationCostAnnual)}
                    </TableCell>
                    <TableCell className="text-right px-2 py-2 border-l-2 border-border/50">
                      <div className="space-y-1.5">
                        {/* Główna wartość z ikoną */}
                        <div className={`flex items-center justify-end gap-1.5 px-2 py-1.5 rounded-md border ${getProfitStyle(monthlyProfit).bgColor} ${getProfitStyle(monthlyProfit).borderColor}`}>
                          {getProfitIcon(monthlyProfit)}
                          <span className={`font-bold text-base ${getProfitStyle(monthlyProfit).textColor}`}>
                            {new Intl.NumberFormat("pl-PL", {
                              style: "currency",
                              currency: "PLN",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(monthlyProfit)}
                          </span>
                        </div>
                        
                        {/* Progress bar i procent marży */}
                        <div className="space-y-1">
                          {/* Progress bar */}
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                monthlyProfit < 0 ? 'bg-red-500' :
                                monthlyProfit < 4000 ? 'bg-orange-500' :
                                monthlyProfit < 8000 ? 'bg-green-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, normalizedProfit))}%` }}
                            />
                          </div>
                          
                          {/* Procent marży */}
                          <div className="flex items-center justify-end gap-1 text-xs">
                            <span className="text-muted-foreground">Marża:</span>
                            <span className={`font-semibold ${
                              marginPercent < 0 ? 'text-red-600' :
                              marginPercent < 20 ? 'text-orange-600' :
                              marginPercent < 40 ? 'text-green-600' : 'text-emerald-600'
                            }`}>
                              {marginPercent >= 0 ? '+' : ''}{marginPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-2 py-2 border-l border-border/30">
                      <div className="space-y-1.5">
                        {/* Główna wartość roczna */}
                        <div className={`flex items-center justify-end gap-1 px-2 py-1 rounded border ${getProfitStyle(annualProfit).bgColor} ${getProfitStyle(annualProfit).borderColor}`}>
                          <span className={`font-bold text-sm ${getProfitStyle(annualProfit).textColor}`}>
                            {new Intl.NumberFormat("pl-PL", {
                              style: "currency",
                              currency: "PLN",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(annualProfit)}
                          </span>
                        </div>
                        
                        {/* Dodatkowe metryki */}
                        <div className="space-y-1 text-xs">
                          {/* Porównanie: 12x miesięczny zysk */}
                          <div className="flex items-center justify-end gap-1 text-muted-foreground">
                            <span className="text-[10px]">12× miesięczny</span>
                            <span className="font-mono font-medium text-foreground">
                              {new Intl.NumberFormat("pl-PL", {
                                style: "currency",
                                currency: "PLN",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(monthlyProfit)}
                            </span>
                          </div>
                          
                          {/* ROI - Return on Investment */}
                          {(() => {
                            const annualCost = monthlyCost * 12;
                            const roi = annualCost > 0 ? ((annualProfit / annualCost) * 100) : 0;
                            return (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-muted-foreground">ROI:</span>
                                <span className={`font-semibold ${
                                  roi < 0 ? 'text-red-600' :
                                  roi < 50 ? 'text-orange-600' :
                                  roi < 100 ? 'text-green-600' : 'text-emerald-600'
                                }`}>
                                  {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                                </span>
                              </div>
                            );
                          })()}
                          
                          {/* Progress bar pokazujący zysk vs koszt roczny */}
                          {(() => {
                            const annualCost = monthlyCost * 12;
                            const total = Math.abs(annualProfit) + Math.abs(annualCost);
                            const profitPercent = total > 0 ? (Math.abs(annualProfit) / total) * 100 : 0;
                            const costPercent = total > 0 ? (Math.abs(annualCost) / total) * 100 : 0;
                            
                            return (
                              <div className="space-y-0.5">
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                                  {annualProfit >= 0 ? (
                                    <>
                                      <div 
                                        className="bg-green-500 transition-all"
                                        style={{ width: `${profitPercent}%` }}
                                        title={`Zysk: ${new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 }).format(annualProfit)}`}
                                      />
                                      <div 
                                        className="bg-orange-400 transition-all"
                                        style={{ width: `${costPercent}%` }}
                                        title={`Koszt: ${new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 }).format(annualCost)}`}
                                      />
                                    </>
                                  ) : (
                                    <div 
                                      className="bg-red-500 transition-all"
                                      style={{ width: '100%' }}
                                      title={`Strata: ${new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0 }).format(Math.abs(annualProfit))}`}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center px-1 py-2 border-l border-border/30">
                      {employee.isActive ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-background z-20 border-l-2 border-border shadow-sm px-1 py-2">
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
                            onClick={() => {
                              setEditingLoginDataEmployee(employee);
                              setLoginData({
                                email: employee.email || "",
                                password: "",
                              });
                              setIsLoginDataDialogOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Zarządzaj danymi logowania
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
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
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEmployeeForAI(employee.id);
                              setIsEmployeeAIAnalysisOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                            Analiza AI
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
                });
              })()}
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
      
      {/* Dialog zarządzania danymi logowania */}
      <Dialog open={isLoginDataDialogOpen} onOpenChange={(open) => {
        setIsLoginDataDialogOpen(open);
        if (!open) {
          setEditingLoginDataEmployee(null);
          resetLoginData();
        }
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!editingLoginDataEmployee) return;
            
            const data: any = {
              id: editingLoginDataEmployee.id,
              email: loginData.email || null,
            };
            
            if (loginData.password && loginData.password.length > 0) {
              data.password = loginData.password;
            }
            
            updateLoginDataMutation.mutate(data, {
              onSuccess: () => {
                setIsLoginDataDialogOpen(false);
                setEditingLoginDataEmployee(null);
                resetLoginData();
              },
            });
          }}>
            <DialogHeader>
              <DialogTitle>Zarządzanie danymi logowania</DialogTitle>
              <DialogDescription>
                {editingLoginDataEmployee && `Ustaw email i hasło dla ${editingLoginDataEmployee.firstName} ${editingLoginDataEmployee.lastName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="loginEmail">Email</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  placeholder="pracownik@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Email do logowania (opcjonalne)
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="loginPassword">Hasło</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + "!@#";
                      setLoginData({ ...loginData, password: randomPassword });
                      setGeneratedPassword(randomPassword);
                      setShowPassword(true);
                    }}
                    className="text-xs h-6"
                  >
                    Generuj hasło
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="loginPassword"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) => {
                      setLoginData({ ...loginData, password: e.target.value });
                      setGeneratedPassword("");
                    }}
                    placeholder="Zostaw puste aby nie zmieniać"
                  />
                  {loginData.password && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-10 w-10"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </Button>
                  )}
                </div>
                {generatedPassword && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs">
                    <p className="font-semibold text-green-800 dark:text-green-200">Wygenerowane hasło:</p>
                    <p className="font-mono text-green-700 dark:text-green-300 break-all">{generatedPassword}</p>
                    <p className="text-green-600 dark:text-green-400 mt-1">⚠️ Zapisz to hasło! Nie będzie możliwości jego odzyskania.</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Zostaw puste aby nie zmieniać hasła. Wpisz nowe hasło aby je zmienić.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLoginDataDialogOpen(false);
                  setEditingLoginDataEmployee(null);
                  resetLoginData();
                }}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Zapisz
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
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

      {/* Dialog analizy AI pracownika */}
      <Dialog
        open={isEmployeeAIAnalysisOpen}
        onOpenChange={(open) => {
          setIsEmployeeAIAnalysisOpen(open);
          if (!open) {
            setSelectedEmployeeForAI(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[960px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Analiza AI {selectedEmployee ? `- ${selectedEmployee.firstName} ${selectedEmployee.lastName}` : ""}
            </DialogTitle>
            <DialogDescription>
              Spersonalizowana analiza ryzyka, rekomendacji i rozwoju kariery.
            </DialogDescription>
          </DialogHeader>

          {employeeAIQuery.isLoading && (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analizuję pracownika...</span>
            </div>
          )}

          {employeeAIQuery.error && (
            <div className="text-red-600 text-sm py-2">
              Nie udało się przeprowadzić analizy: {employeeAIQuery.error.message}
            </div>
          )}

          {employeeAIQuery.data && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`
                  h-4 w-4
                  ${employeeAIQuery.data.riskLevel === "high" ? "text-red-600" : employeeAIQuery.data.riskLevel === "medium" ? "text-orange-500" : "text-emerald-600"}
                `} />
                <div>
                  <p className="text-sm text-muted-foreground">Ryzyko odejścia</p>
                  <p className="font-semibold">
                    {employeeAIQuery.data.riskLevel.toUpperCase()}
                    {employeeAIQuery.data.riskReason ? ` – ${employeeAIQuery.data.riskReason}` : ""}
                  </p>
                </div>
              </div>

              {employeeAIQuery.data.summary && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium">Podsumowanie</p>
                  <p className="text-sm text-muted-foreground mt-1">{employeeAIQuery.data.summary}</p>
                </div>
              )}

              {employeeAIQuery.data.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Rekomendacje</p>
                  <div className="space-y-2">
                    {employeeAIQuery.data.recommendations.map((rec: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border">
                        <p className="text-xs uppercase text-muted-foreground">{rec.type}</p>
                        <p className="font-semibold">{rec.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Priorytet: {rec.priority} • Wpływ: {rec.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {employeeAIQuery.data.careerDevelopment && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Rozwój kariery</p>
                  <div className="p-3 rounded-lg border space-y-1">
                    <p className="text-sm">Poziom: {employeeAIQuery.data.careerDevelopment.currentLevel}</p>
                    <p className="text-sm">Potencjał: {employeeAIQuery.data.careerDevelopment.potential}</p>
                    {employeeAIQuery.data.careerDevelopment.suggestions?.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                        {employeeAIQuery.data.careerDevelopment.suggestions.map((s: string, idx: number) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    )}
                    {employeeAIQuery.data.careerDevelopment.nextSteps && (
                      <p className="text-sm text-muted-foreground mt-1">{employeeAIQuery.data.careerDevelopment.nextSteps}</p>
                    )}
                  </div>
                </div>
              )}

              {employeeAIQuery.data.valueAnalysis && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Analiza wartości</p>
                  <div className="p-3 rounded-lg border space-y-1">
                    <p className="text-sm">Wartość: {employeeAIQuery.data.valueAnalysis.currentValue}</p>
                    <p className="text-sm">Potencjał wzrostu: {employeeAIQuery.data.valueAnalysis.growthPotential}</p>
                    {employeeAIQuery.data.valueAnalysis.analysis && (
                      <p className="text-sm text-muted-foreground mt-1">{employeeAIQuery.data.valueAnalysis.analysis}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Analiza what-if */}
      <Dialog open={isAnalysisPanelOpen} onOpenChange={setIsAnalysisPanelOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Analiza „what-if”</DialogTitle>
            <DialogDescription>Symulacja zmian stawek i kosztów oraz wykluczanie pracowników.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Zmiana stawki klienta (%)</p>
              <Slider
                value={[simulationClientRateChange]}
                min={-30}
                max={50}
                step={1}
                onValueChange={(vals: number[]) => setSimulationClientRateChange(vals[0] ?? 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">{simulationClientRateChange}%</p>
            </div>
            <div>
              <p className="text-sm font-medium">Zmiana kosztu pracownika (%)</p>
              <Slider
                value={[simulationCostChange]}
                min={-30}
                max={50}
                step={1}
                onValueChange={(vals: number[]) => setSimulationCostChange(vals[0] ?? 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">{simulationCostChange}%</p>
            </div>
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Wyklucz z analizy</p>
                <Button variant="ghost" size="sm" onClick={() => setExcludedEmployeeIds(new Set())}>Wyczyść wybór</Button>
              </div>
              <div className="max-h-48 overflow-auto mt-2 space-y-1">
                {filteredAndSortedEmployees?.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={excludedEmployeeIds.has(emp.id)}
                      onCheckedChange={() => toggleExcludeEmployee(emp.id)}
                    />
                    <span>{emp.firstName} {emp.lastName}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Aktualny zysk roczny</p>
                <p className="text-lg font-semibold text-green-700">
                  {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalAnnualProfit)}
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-muted-foreground">Symulowany zysk roczny</p>
                <p className="text-lg font-semibold text-emerald-700">
                  {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(simulatedAnnualProfit)}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={resetSimulations}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetuj
            </Button>
            <Button onClick={() => setIsAnalysisPanelOpen(false)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Scenariusze */}
      <Dialog open={isAdvancedScenariosOpen} onOpenChange={setIsAdvancedScenariosOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Scenariusze</DialogTitle>
            <DialogDescription>Symulacje rocznego zysku dla różnych założeń.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            {["optimization", "projections", "impact", "market"].map(tab => (
              <Button
                key={tab}
                variant={scenarioType === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setScenarioType(tab as any)}
              >
                {tab === "optimization" && "Optymalizacja"}
                {tab === "projections" && "Projekcje"}
                {tab === "impact" && "Wpływ zmian"}
                {tab === "market" && "Trendy rynku (AI)"}
              </Button>
            ))}
          </div>

          {scenarioType === "optimization" && (
            <div className="space-y-3">
              {optimizationScenarios.map((scenario, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <p className="font-semibold">{scenario.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{scenario.change}</p>
                      {scenario.employees.length > 0 && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <p className="font-medium mb-1">Proponowani do zwolnienia:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {scenario.employees.map((name, i) => (
                              <li key={i} className="text-muted-foreground">{name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-green-700">
                        {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(scenario.profit)}
                      </p>
                      <p className="text-xs text-muted-foreground">zysk roczny</p>
                      {scenario.savings > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          Oszczędności: {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(scenario.savings)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {scenarioType === "projections" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Szybkie warianty roczne:</p>
              <div className="space-y-2">
                <div className="p-3 border rounded flex justify-between">
                  <span>Realistyczny (bez zmian)</span>
                  <span className="font-semibold text-green-700">
                    {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalAnnualProfit)}
                  </span>
                </div>
                <div className="p-3 border rounded flex justify-between">
                  <span>Pesymistyczny (stawki -10%, koszt +5%)</span>
                  <span className="font-semibold text-orange-700">
                    {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(
                      includedEmployees.reduce((sum, emp) => sum + calcMonthlyProfit(emp, -10, 5), 0) * 12
                    )}
                  </span>
                </div>
                <div className="p-3 border rounded flex justify-between">
                  <span>Optymistyczny (stawki +10%, koszt -5%)</span>
                  <span className="font-semibold text-emerald-700">
                    {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(
                      includedEmployees.reduce((sum, emp) => sum + calcMonthlyProfit(emp, 10, -5), 0) * 12
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {scenarioType === "impact" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Bazowy zysk roczny</p>
                  <p className="text-2xl font-bold text-green-700">
                    {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(totalAnnualProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Bez zmian stawek/kosztów</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Symulowany zysk roczny</p>
                  <p className={`text-2xl font-bold ${simulatedAnnualProfit >= totalAnnualProfit ? "text-emerald-700" : "text-red-700"}`}>
                    {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(simulatedAnnualProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stawki: {simulationClientRateChange >= 0 ? "+" : ""}{simulationClientRateChange}% • Koszty: {simulationCostChange >= 0 ? "+" : ""}{simulationCostChange}% • Wykluczonych: {excludedEmployeeIds.size}
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <p className="text-sm font-medium">Wpływ bieżących ustawień „what-if”</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="px-2 py-1 rounded bg-muted/50 border">Δ zysk roczny: {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(simulatedAnnualProfit - totalAnnualProfit)}</span>
                  <span className="px-2 py-1 rounded bg-muted/50 border">Δ zysk miesięczny: {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(simulatedMonthlyProfit - totalMonthlyProfit)}</span>
                  <span className="px-2 py-1 rounded bg-muted/50 border">Wykluczonych: {excludedEmployeeIds.size}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Suwaki i wykluczenia w panelu „Analiza what-if” na bieżąco aktualizują powyższe wartości.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Szybkie wpływy zmian</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  {[
                    { label: "Stawki +10%", value: includedEmployees.reduce((sum, emp) => sum + calcMonthlyProfit(emp, 10, 0), 0) * 12 - totalAnnualProfit },
                    { label: "Koszty -10%", value: includedEmployees.reduce((sum, emp) => sum + calcMonthlyProfit(emp, 0, -10), 0) * 12 - totalAnnualProfit },
                    { label: "Stawki -10%, koszty +5%", value: includedEmployees.reduce((sum, emp) => sum + calcMonthlyProfit(emp, -10, 5), 0) * 12 - totalAnnualProfit },
                  ].map((item) => (
                    <div key={item.label} className="p-3 border rounded-lg">
                      <p className="font-semibold">{item.label}</p>
                      <p className={`text-sm font-bold ${item.value >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(item.value)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">vs. stan bazowy</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {scenarioType === "market" && (
            <div className="space-y-4">
              {!marketTrendsTriggered ? (
                <div className="text-center py-8 space-y-4">
                  <Sparkles className="h-12 w-12 mx-auto text-purple-600" />
                  <p className="text-sm text-muted-foreground">
                    Kliknij poniżej, aby uruchomić analizę trendów rynkowych opartą na danych Twoich pracowników.
                  </p>
                  <Button
                    onClick={() => setMarketTrendsTriggered(true)}
                    className="w-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Uruchom analizę trendów rynku (AI)
                  </Button>
                </div>
              ) : marketTrendsQuery.isLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analizuję trendy rynkowe...</span>
                </div>
              ) : marketTrendsQuery.error ? (
                <div className="text-red-600 text-sm py-2">
                  Nie udało się przeprowadzić analizy: {marketTrendsQuery.error.message}
                </div>
              ) : marketTrendsQuery.data ? (
                <div className="space-y-4">
                  {marketTrendsQuery.data.summary && (
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <p className="text-sm font-medium mb-2">Podsumowanie</p>
                      <p className="text-sm text-muted-foreground">{marketTrendsQuery.data.summary}</p>
                    </div>
                  )}

                  {marketTrendsQuery.data.trends && marketTrendsQuery.data.trends.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Trendy rynkowe</p>
                      {marketTrendsQuery.data.trends.map((trend: any, idx: number) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className={`h-4 w-4 ${
                              trend.impact === "high" ? "text-red-600" :
                              trend.impact === "medium" ? "text-orange-600" : "text-green-600"
                            }`} />
                            <p className="font-semibold text-sm">{trend.category}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{trend.description}</p>
                          <p className="text-xs text-muted-foreground italic">{trend.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {marketTrendsQuery.data.forecast && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Prognozy</p>
                      <div className="p-3 border rounded-lg space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Najbliższe 3 miesiące</p>
                          <p className="text-sm">{marketTrendsQuery.data.forecast.next3Months}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Najbliższe 6 miesięcy</p>
                          <p className="text-sm">{marketTrendsQuery.data.forecast.next6Months}</p>
                        </div>
                        {marketTrendsQuery.data.forecast.risks && marketTrendsQuery.data.forecast.risks.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-600 mb-1">Ryzyka</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                              {marketTrendsQuery.data.forecast.risks.map((risk: string, idx: number) => (
                                <li key={idx}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {marketTrendsQuery.data.forecast.opportunities && marketTrendsQuery.data.forecast.opportunities.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-600 mb-1">Szanse</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                              {marketTrendsQuery.data.forecast.opportunities.map((opp: string, idx: number) => (
                                <li key={idx}>{opp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {marketTrendsQuery.data.recommendations && marketTrendsQuery.data.recommendations.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Rekomendacje</p>
                      {marketTrendsQuery.data.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className={`h-4 w-4 ${
                              rec.priority === "high" ? "text-red-600" :
                              rec.priority === "medium" ? "text-orange-600" : "text-green-600"
                            }`} />
                            <p className="font-semibold text-sm">{rec.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              rec.priority === "high" ? "bg-red-100 text-red-800" :
                              rec.priority === "medium" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"
                            }`}>
                              {rec.priority === "high" ? "Wysoki" : rec.priority === "medium" ? "Średni" : "Niski"} priorytet
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{rec.description}</p>
                          <p className="text-xs text-muted-foreground italic">{rec.expectedImpact}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
