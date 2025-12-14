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
import { Loader2, Plus, Pencil, Trash2, Briefcase, Search, X, ChevronDown, ChevronUp, Users, TrendingUp, TrendingDown, Clock, DollarSign, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Projects() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const [employeesModalOpen, setEmployeesModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  const { data: clients } = trpc.clients.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  // Pobierz statystyki projektów dla bieżącego miesiąca
  const now = new Date();
  const { data: projectStats } = trpc.projects.getStats.useQuery(
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { enabled: !!user }
  );
  
  // Utwórz mapę statystyk dla szybkiego dostępu
  const statsMap = new Map(
    projectStats?.map(stat => [stat.projectId, stat]) || []
  );
  
  // Pobierz listę pracowników przypisanych do wybranego projektu
  const { data: projectAssignments } = trpc.assignments.byProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId && employeesModalOpen }
  );
  
  // Pobierz dane wszystkich aktywnych pracowników
  const { data: allEmployees } = trpc.employees.list.useQuery(undefined, {
    enabled: !!user && employeesModalOpen,
  });
  
  // Utwórz mapę pracowników dla szybkiego dostępu (tylko aktywni)
  const employeesMap = new Map(
    allEmployees?.filter(emp => emp.isActive).map(emp => [emp.id, emp]) || []
  );
  
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Projekt dodany pomyślnie");
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Błąd: " + error.message);
    },
  });
  
  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Projekt zaktualizowany");
      refetch();
      setIsDialogOpen(false);
      setEditingProject(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("Błąd: " + error.message);
    },
  });
  
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Projekt usunięty");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Nie można usunąć projektu");
    },
  });

  const [formData, setFormData] = useState({
    clientId: "",
    name: "",
    status: "planning" as "planning" | "active" | "on_hold" | "completed" | "cancelled",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      clientId: "",
      name: "",
      status: "planning",
      description: "",
    });
    setEditingProject(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProject) {
      updateMutation.mutate({
        id: editingProject.id,
        clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
        name: formData.name || undefined,
        status: formData.status,
        description: formData.description || undefined,
      });
    } else {
    createMutation.mutate({
      clientId: parseInt(formData.clientId),
      name: formData.name,
      billingModel: "time_material",
      status: formData.status,
      description: formData.description || undefined,
    });
    }
  };
  
  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      clientId: project.clientId?.toString() || "",
      name: project.name || "",
      status: project.status || "planning",
      description: project.description || "",
    });
    setIsDialogOpen(true);
  };
  
  const handleDelete = (id: number) => {
    if (confirm("Czy na pewno chcesz usunąć ten projekt?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount / 100);
  };
  
  const formatMargin = (margin: number) => {
    return `${margin >= 0 ? '+' : ''}${margin.toFixed(1)}%`;
  };
  
  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };
  
  const handleShowEmployees = (projectId: number) => {
    setSelectedProjectId(projectId);
    setEmployeesModalOpen(true);
  };

  const statusLabels = {
    planning: "Planowanie",
    active: "Aktywny",
    on_hold: "Wstrzymany",
    completed: "Zakończony",
    cancelled: "Anulowany",
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <Button onClick={() => setLocation("/")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do dashboardu
      </Button>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Projekty
          </h1>
          <p className="text-muted-foreground">Zarządzaj projektami klientów</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj projekt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingProject ? "Edytuj projekt" : "Dodaj projekt"}</DialogTitle>
                <DialogDescription>{editingProject ? "Zaktualizuj dane projektu" : "Wprowadź dane projektu"}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Klient</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz klienta" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nazwa projektu</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planowanie</SelectItem>
                      <SelectItem value="active">Aktywny</SelectItem>
                      <SelectItem value="on_hold">Wstrzymany</SelectItem>
                      <SelectItem value="completed">Zakończony</SelectItem>
                      <SelectItem value="cancelled">Anulowany</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Opis</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    rows={4}
                    placeholder="Wprowadź opis projektu..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingProject ? "Zapisz" : "Dodaj"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista projektów</CardTitle>
          <CardDescription>Wszystkie projekty w systemie</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtry i wyszukiwanie */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwie projektu..."
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                <SelectItem value="planning">Planowanie</SelectItem>
                <SelectItem value="active">Aktywny</SelectItem>
                <SelectItem value="on_hold">Wstrzymany</SelectItem>
                <SelectItem value="completed">Zakończony</SelectItem>
                <SelectItem value="cancelled">Anulowany</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Klient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy klienci</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {projects && projects.filter(project => {
            const matchesSearch = !searchTerm || 
              project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
            const matchesStatus = filterStatus === "all" || project.status === filterStatus;
            const matchesClient = filterClient === "all" || project.clientId.toString() === filterClient;
            return matchesSearch && matchesStatus && matchesClient;
          }).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak projektów spełniających kryteria wyszukiwania
            </div>
          )}
          
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead className="min-w-[200px]">Nazwa projektu</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[250px]">Opis</TableHead>
                  <TableHead className="w-[100px] text-center">Pracownicy</TableHead>
                  <TableHead className="w-[120px] text-right">Godziny</TableHead>
                  <TableHead className="w-[140px] text-right">Śr. stawka/h</TableHead>
                  <TableHead className="w-[140px] text-right">Rentowność</TableHead>
                  <TableHead className="text-right w-[120px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects?.filter(project => {
                const matchesSearch = !searchTerm || 
                  project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
                const matchesStatus = filterStatus === "all" || project.status === filterStatus;
                const matchesClient = filterClient === "all" || project.clientId.toString() === filterClient;
                return matchesSearch && matchesStatus && matchesClient;
              }).map((project) => (
                <>
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === "active" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : project.status === "completed"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}>
                      {statusLabels[project.status]}
                    </span>
                  </TableCell>
                    <TableCell className="max-w-md">
                      {project.description ? (
                        <div className="space-y-1">
                          <div className="text-sm line-clamp-2 text-muted-foreground">
                            {project.description}
                          </div>
                          {project.description.length > 100 && (
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedDescriptions);
                                if (newExpanded.has(project.id)) {
                                  newExpanded.delete(project.id);
                                } else {
                                  newExpanded.add(project.id);
                                }
                                setExpandedDescriptions(newExpanded);
                              }}
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              {expandedDescriptions.has(project.id) ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  Zwiń opis
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  Pokaż pełny opis
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const stats = statsMap.get(project.id);
                        return stats ? (
                          <button
                            onClick={() => handleShowEmployees(project.id)}
                            className="flex items-center justify-center gap-1 text-sm hover:text-primary transition-colors cursor-pointer group"
                            title="Kliknij, aby zobaczyć listę pracowników"
                          >
                            <Users className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="font-medium">{stats.employeeCount}</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const stats = statsMap.get(project.id);
                        return stats && stats.hours > 0 ? (
                          <div className="flex items-center justify-end gap-1 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{formatHours(stats.hours)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const stats = statsMap.get(project.id);
                        return stats && stats.averageHourlyRate > 0 ? (
                          <div className="flex items-center justify-end gap-1 text-sm">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{formatCurrency(stats.averageHourlyRate)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const stats = statsMap.get(project.id);
                        if (!stats) {
                          return <span className="text-muted-foreground text-sm">-</span>;
                        }
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <div className={`text-sm font-medium flex items-center gap-1 ${
                              stats.profit >= 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {stats.profit >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {formatCurrency(stats.profit)}
                            </div>
                            <div className={`text-xs ${
                              stats.margin >= 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatMargin(stats.margin)}
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right w-[120px]">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(project)}
                          title="Edytuj projekt"
                          className="hover:bg-primary/10 transition-all duration-200 hover:scale-110 shrink-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(project.id)}
                          title="Usuń projekt"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-all duration-200 hover:scale-110 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedDescriptions.has(project.id) && project.description && (
                    <TableRow key={`${project.id}-expanded`} className="bg-muted/30">
                      <TableCell colSpan={8} className="py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <Briefcase className="w-4 h-4" />
                            Pełny opis projektu
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {project.description}
                          </p>
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedDescriptions);
                              newExpanded.delete(project.id);
                              setExpandedDescriptions(newExpanded);
                            }}
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                          >
                            <ChevronUp className="w-3 h-3" />
                            Zwiń opis
                          </button>
                        </div>
                      </TableCell>
                </TableRow>
                  )}
                </>
              ))}
              {projects?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Brak projektów. Dodaj pierwszy projekt.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal z listą pracowników */}
      <Dialog open={employeesModalOpen} onOpenChange={setEmployeesModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Pracownicy przypisani do projektu
            </DialogTitle>
            <DialogDescription>
              Lista wszystkich pracowników przypisanych do wybranego projektu
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {projectAssignments && projectAssignments.length > 0 ? (
              (() => {
                // Filtruj tylko aktywnych pracowników, którzy istnieją w bazie
                const validAssignments = projectAssignments.filter(assignment => {
                  const employee = employeesMap.get(assignment.employeeId);
                  return employee && employee.isActive;
                });
                
                if (validAssignments.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      Brak aktywnych pracowników przypisanych do tego projektu
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {validAssignments.map((assignment) => {
                      const employee = employeesMap.get(assignment.employeeId);
                      if (!employee) return null;
                      
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {employee.firstName} {employee.lastName}
                              </p>
                              {employee.position && (
                                <p className="text-sm text-muted-foreground">{employee.position}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatCurrency(assignment.hourlyRateClient)}/h
                            </p>
                            <p className="text-xs text-muted-foreground">Stawka klienta</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Brak przypisanych pracowników do tego projektu
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
