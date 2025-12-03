import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, CheckCircle2, Circle, Clock, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

type TaskStatus = "planned" | "in_progress" | "urgent" | "done";

const statusConfig: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned: {
    label: "W planach",
    icon: <Circle className="w-4 h-4" />,
    color: "text-blue-600",
    badgeVariant: "default",
  },
  in_progress: {
    label: "W trakcie",
    icon: <Clock className="w-4 h-4" />,
    color: "text-yellow-600",
    badgeVariant: "secondary",
  },
  urgent: {
    label: "Pilne",
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-red-600",
    badgeVariant: "destructive",
  },
  done: {
    label: "Zrobione",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-600",
    badgeVariant: "outline",
  },
};

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TaskStatus | "all">("urgent");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "planned" as TaskStatus });

  const utils = trpc.useUtils();

  const { data: allTasks, isLoading } = trpc.tasks.getAll.useQuery();
  
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: async () => {
      await utils.tasks.getAll.invalidate();
      setIsCreateDialogOpen(false);
      setNewTask({ title: "", description: "", status: "planned" });
      toast.success("Zadanie utworzone", { description: "Nowe zadanie zostało dodane do listy." });
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate();
      toast.success("Status zaktualizowany");
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate();
      toast.success("Zadanie usunięte");
    },
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast.error("Błąd", { description: "Tytuł zadania jest wymagany" });
      return;
    }
    createTask.mutate(newTask);
  };

  const handleStatusChange = (taskId: number, newStatus: TaskStatus) => {
    updateTask.mutate({
      id: taskId,
      status: newStatus,
      completedAt: newStatus === "done" ? new Date() : null,
    });
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm("Czy na pewno chcesz usunąć to zadanie?")) {
      deleteTask.mutate({ id: taskId });
    }
  };

  const filteredTasks = allTasks?.filter((task) => {
    if (activeTab === "all") return true;
    return task.status === activeTab;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zadania</h1>
          <p className="text-muted-foreground">Zarządzaj zadaniami i projektami</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nowe zadanie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Utwórz nowe zadanie</DialogTitle>
              <DialogDescription>Dodaj nowe zadanie do listy</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tytuł</label>
                <Input
                  placeholder="Nazwa zadania..."
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Opis (opcjonalnie)</label>
                <Textarea
                  placeholder="Szczegóły zadania..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newTask.status}
                  onValueChange={(value) => setNewTask({ ...newTask, status: value as TaskStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {config.icon}
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleCreateTask} disabled={createTask.isPending}>
                {createTask.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Utwórz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TaskStatus | "all")}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="urgent">🔴 Pilne</TabsTrigger>
          <TabsTrigger value="in_progress">🟡 W trakcie</TabsTrigger>
          <TabsTrigger value="planned">🔵 W planach</TabsTrigger>
          <TabsTrigger value="done">✅ Zrobione</TabsTrigger>
          <TabsTrigger value="all">Wszystkie</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">Brak zadań w tej kategorii</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className={statusConfig[task.status].color}>
                          {statusConfig[task.status].icon}
                        </span>
                        {task.title}
                      </CardTitle>
                      {task.description && (
                        <CardDescription className="mt-2">{task.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[task.status].badgeVariant}>
                        {statusConfig[task.status].label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Zmień status:</span>
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                {config.icon}
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {task.completedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Ukończono: {new Date(task.completedAt).toLocaleDateString("pl-PL")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
