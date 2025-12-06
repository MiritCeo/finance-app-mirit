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
import { Loader2, Plus, Pencil, Trash2, Briefcase, Search, X } from "lucide-react";
import { toast } from "sonner";

export default function Projects() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  
  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  const { data: clients } = trpc.clients.list.useQuery(undefined, {
    enabled: !!user,
  });
  
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
      toast.error("Błąd: " + error.message);
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
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa projektu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opis</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
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
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === "active" 
                        ? "bg-green-100 text-green-800"
                        : project.status === "completed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {statusLabels[project.status]}
                    </span>
                  </TableCell>
                  <TableCell>{project.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(project)}
                        title="Edytuj projekt"
                        className="hover:bg-primary/10 transition-all duration-200 hover:scale-110"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                        title="Usuń projekt"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {projects?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Brak projektów. Dodaj pierwszy projekt.
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
