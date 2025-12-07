import { useState, useEffect } from "react";
import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, Calendar, TrendingUp, ArrowLeft, Edit, Trash2, Clock, Briefcase, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Komponent karty pracownika z projektami
function EmployeeCard({ 
  employee, 
  hoursData, 
  onHoursChange, 
  onViewReport,
  onAssignmentData,
  projects 
}: { 
  employee: any; 
  hoursData: Record<number, string>; 
  onHoursChange: (assignmentId: number, value: string) => void;
  onViewReport: () => void;
  onAssignmentData?: (assignments: any[]) => void;
  projects?: any[];
}) {
  const { data: assignments, isLoading } = trpc.assignments.byEmployee.useQuery(
    { employeeId: employee.id },
    { enabled: !!employee.id }
  );
  
  // Przekaż dane assignments do rodzica dla obliczeń przychodu
  useEffect(() => {
    if (assignments && onAssignmentData) {
      onAssignmentData(assignments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtruj tylko aktywne przypisania
  const activeAssignments = assignments?.filter(a => a.isActive) || [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {employee.firstName[0]}{employee.lastName[0]}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg">
                {employee.firstName} {employee.lastName}
              </CardTitle>
              <CardDescription className="text-xs uppercase mt-0.5">
                {employee.employmentType}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewReport}
            title="Raport roczny godzinowy"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Calendar className="w-4 h-4 mr-1.5" />
            Raport
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeAssignments.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Brak aktywnych projektów
          </div>
        ) : (
          <div className="space-y-3">
            {activeAssignments.map((assignment) => {
              const project = projects?.find(p => p.id === assignment.projectId) || { name: "Nieznany projekt" };
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`hours-${assignment.id}`} className="text-sm text-muted-foreground whitespace-nowrap">
                        Godziny:
                      </Label>
                      <Input
                        id={`hours-${assignment.id}`}
                        type="number"
                        step="0.5"
                        min="0"
                        max="300"
                        placeholder="0"
                        value={hoursData[assignment.id] || ""}
                        onChange={(e) => onHoursChange(assignment.id, e.target.value)}
                        className="w-24 text-right font-medium"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TimeReporting() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  // Struktura: { employeeId: { assignmentId: hours } }
  const [hoursData, setHoursData] = useState<Record<number, Record<number, string>>>({});
  // Cache assignments dla obliczeń przychodu: { assignmentId: assignment }
  const [assignmentsCache, setAssignmentsCache] = useState<Record<number, any>>({});
  // Cache assignments per pracownik: { employeeId: assignments[] }
  const [employeeAssignmentsCache, setEmployeeAssignmentsCache] = useState<Record<number, any[]>>({});
  // Wyszukiwarka i filtry
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const { data: employees, isLoading: employeesLoading } = trpc.employees.list.useQuery(undefined, { enabled: !!user });
  const { data: monthlyReports, isLoading: reportsLoading } = trpc.timeEntries.monthlyReports.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // Pobierz projekty
  const { data: projects } = trpc.projects.list.useQuery(undefined, { enabled: !!user });
  
  const handleAssignmentData = (employeeId: number, assignments: any[]) => {
    const newCache: Record<number, any> = {};
    assignments.forEach(assignment => {
      newCache[assignment.id] = assignment;
    });
    setAssignmentsCache(prev => ({ ...prev, ...newCache }));
    // Zapisz również assignments per pracownik dla filtrowania
    setEmployeeAssignmentsCache(prev => ({ ...prev, [employeeId]: assignments }));
  };

  const saveMutation = trpc.timeEntries.saveMonthlyHours.useMutation({
    onSuccess: () => {
      toast.success("Godziny zapisane pomyślnie");
      utils.timeEntries.monthlyReports.invalidate();
      utils.dashboard.kpi.invalidate();
      utils.dashboard.getAccurateMonthlyResults.invalidate();
      utils.dashboard.getProfitTrends.invalidate();
      setHoursData({});
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
  
  const deleteMutation = trpc.timeEntries.deleteMonthlyReport.useMutation({
    onSuccess: () => {
      toast.success("Raport usunięty pomyślnie");
      utils.timeEntries.monthlyReports.invalidate();
      utils.dashboard.kpi.invalidate();
      utils.dashboard.getAccurateMonthlyResults.invalidate();
      utils.dashboard.getProfitTrends.invalidate();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const handleHoursChange = (employeeId: number, assignmentId: number, value: string) => {
    setHoursData(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [assignmentId]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entries: Array<{ employeeId: number; assignmentId: number; hoursWorked: number }> = [];
    
    // Przekształć strukturę danych na płaską listę wpisów
    Object.entries(hoursData).forEach(([employeeId, assignments]) => {
      Object.entries(assignments).forEach(([assignmentId, hours]) => {
        const hoursNum = parseFloat(hours);
        if (hours && hoursNum > 0) {
          entries.push({
            employeeId: parseInt(employeeId),
            assignmentId: parseInt(assignmentId),
            hoursWorked: hoursNum,
          });
        }
      });
    });

    if (entries.length === 0) {
      toast.error("Wpisz godziny dla przynajmniej jednego projektu");
      return;
    }

    saveMutation.mutate({
      month: selectedMonth,
      year: selectedYear,
      entries,
    });
  };

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

  // Funkcja pomocnicza do obliczania szacowanego przychodu (w groszach)
  const calculateTotalRevenue = () => {
    if (!employees) return 0;
    
    let total = 0; // w groszach
    
    Object.entries(hoursData).forEach(([employeeId, assignments]) => {
      const employee = employees.find(e => e.id === parseInt(employeeId));
      if (!employee) return;
      
      Object.entries(assignments).forEach(([assignmentId, hours]) => {
        const hoursNum = parseFloat(hours || "0");
        if (hoursNum > 0) {
          // Pobierz assignment z cache lub użyj domyślnej stawki pracownika
          const assignment = assignmentsCache[parseInt(assignmentId)];
          const hourlyRate = assignment?.hourlyRateClient || employee.hourlyRateClient || 0;
          // hourlyRate jest w groszach, hoursNum to godziny (np. 131), więc przychód = 131 * hourlyRate (w groszach)
          total += Math.round(hoursNum * hourlyRate);
        }
      });
    });
    
    return total; // zwracamy w groszach
  };
  
  const totalRevenue = calculateTotalRevenue(); // w groszach

  // Filtrowanie pracowników
  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    
    return employees.filter(employee => {
      // Filtrowanie po wyszukiwarce
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
        if (!fullName.includes(searchLower)) {
          return false;
        }
      }
      
      // Filtrowanie po projekcie
      if (selectedProjectId !== "all") {
        const projectIdNum = parseInt(selectedProjectId);
        const employeeAssignments = employeeAssignmentsCache[employee.id] || [];
        const hasActiveAssignment = employeeAssignments.some(
          (assignment: any) => assignment.isActive && assignment.projectId === projectIdNum
        );
        if (!hasActiveAssignment) {
          return false;
        }
      }
      
      return true;
    });
  }, [employees, searchTerm, selectedProjectId, employeeAssignmentsCache]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <Button onClick={() => setLocation("/")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Wróć do dashboardu
      </Button>
      
      <div>
        <h1 className="text-3xl font-bold">Raportowanie godzin miesięcznych</h1>
        <p className="text-muted-foreground">
          Wpisz łączne godziny przepracowane przez każdego pracownika w danym miesiącu
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formularz miesięczny */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Raport za {getMonthName(selectedMonth)} {selectedYear}
            </CardTitle>
            <CardDescription>
              Wpisz godziny otrzymane w emailach od pracowników
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Wybór miesiąca i roku */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Miesiąc</Label>
                  <select
                    id="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Rok</Label>
                  <select
                    id="year"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - 1 + i).map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wyszukiwarka i filtry */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Szukaj pracownika..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="w-64">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wszystkie projekty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszystkie projekty</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(searchTerm || selectedProjectId !== "all") && employees && (
                  <div className="text-sm text-muted-foreground">
                    Znaleziono {filteredEmployees.length} z {employees.length} pracowników
                  </div>
                )}
              </div>

              {/* Lista pracowników */}
              {employeesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEmployees && filteredEmployees.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-4">
                    {filteredEmployees.map((employee) => (
                      <EmployeeCard
                        key={employee.id}
                        employee={employee}
                        hoursData={hoursData[employee.id] || {}}
                        onHoursChange={(assignmentId, value) => handleHoursChange(employee.id, assignmentId, value)}
                        onViewReport={() => setLocation(`/employee/${employee.id}/annual-report`)}
                        onAssignmentData={(assignments) => handleAssignmentData(employee.id, assignments)}
                        projects={projects}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Szacowany przychód za miesiąc</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(totalRevenue)}
                      </p>
                    </div>
                    <Button type="submit" size="lg" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Zapisywanie...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Zapisz raport
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : employees && employees.length > 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  Brak pracowników spełniających kryteria wyszukiwania
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Brak pracowników w systemie
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Historia raportów */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Historia raportów
            </CardTitle>
            <CardDescription>Ostatnio zapisane miesiące</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : monthlyReports && monthlyReports.length > 0 ? (
              <div className="space-y-3">
                {monthlyReports.slice(0, 12).map((report) => (
                  <div
                    key={`${report.year}-${report.month}`}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {getMonthName(report.month)} {report.year}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {report.totalHours.toFixed(0)} godz. • {report.employeeCount} prac.
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Przychód: {formatCurrency(report.totalRevenue)}
                          </p>
                          <p className={`font-bold ${(report.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(report.totalProfit || 0) >= 0 ? 'Zysk' : 'Strata'}: {formatCurrency(Math.abs(report.totalProfit || 0))}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setSelectedMonth(report.month);
                              setSelectedYear(report.year);
                              
                              // Załaduj godziny pracowników dla tego miesiąca
                              try {
                                const details = await utils.timeEntries.getMonthlyReportDetails.fetch({
                                  month: report.month,
                                  year: report.year,
                                });
                                
                                // Ustaw godziny w formularzu per projekt (assignment)
                                const newHoursData: Record<number, Record<number, string>> = {};
                                details.forEach((item) => {
                                  if (!newHoursData[item.employeeId]) {
                                    newHoursData[item.employeeId] = {};
                                  }
                                  newHoursData[item.employeeId][item.assignmentId] = item.hours.toString();
                                });
                                setHoursData(newHoursData);
                                
                                toast.success(`Załadowano raport za ${getMonthName(report.month)} ${report.year}`);
                                
                                // Przewiń do góry
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } catch (error) {
                                toast.error("Błąd podczas ładowania raportu");
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Czy na pewno chcesz usunąć raport za ${getMonthName(report.month)} ${report.year}?`)) {
                                deleteMutation.mutate({
                                  month: report.month,
                                  year: report.year,
                                });
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Brak zapisanych raportów
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
