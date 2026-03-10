import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Trash2, Settings, Key, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProjectHunterManagement() {
  const [selectedProjectHunter, setSelectedProjectHunter] = useState<number | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [rateMin, setRateMin] = useState<string>("");
  const [rateMax, setRateMax] = useState<string>("");
  
  // Formularz tworzenia nowego Łowcy Projektów
  const [newPHName, setNewPHName] = useState("");
  const [newPHEmail, setNewPHEmail] = useState("");
  const [newPHPassword, setNewPHPassword] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{email: string, password: string} | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: projectHunters, isLoading } = trpc.projectHunterAdmin.listProjectHunters.useQuery();
  const { data: employees } = trpc.employees.active.useQuery();
  const { data: assignments } = trpc.projectHunterAdmin.getAssignments.useQuery(
    { projectHunterId: selectedProjectHunter! },
    { enabled: !!selectedProjectHunter }
  );

  const assignMutation = trpc.projectHunterAdmin.assignEmployee.useMutation({
    onSuccess: () => {
      toast.success("Przypisano pracownika do Łowcy Projektów");
      utils.projectHunterAdmin.getAssignments.invalidate();
      setIsAssignDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const removeMutation = trpc.projectHunterAdmin.removeAssignment.useMutation({
    onSuccess: () => {
      toast.success("Usunięto przypisanie");
      utils.projectHunterAdmin.getAssignments.invalidate();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const updateRatesMutation = trpc.projectHunterAdmin.updateEmployeeRates.useMutation({
    onSuccess: () => {
      toast.success("Zaktualizowano stawki dla Łowcy Projektów");
      utils.projectHunterAdmin.getAssignments.invalidate();
      utils.employees.active.invalidate();
      setEditingEmployeeId(null);
      setRateMin("");
      setRateMax("");
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const createPHMutation = trpc.projectHunterAdmin.createProjectHunter.useMutation({
    onSuccess: (data) => {
      toast.success("Utworzono konto Łowcy Projektów");
      setCreatedCredentials({
        email: data.email,
        password: data.password,
      });
      utils.projectHunterAdmin.listProjectHunters.invalidate();
      // Nie zamykamy dialogu - pokazujemy dane dostępowe
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const deletePHMutation = trpc.projectHunterAdmin.deleteProjectHunter.useMutation({
    onSuccess: () => {
      toast.success("Usunięto konto Łowcy Projektów");
      utils.projectHunterAdmin.listProjectHunters.invalidate();
      setSelectedProjectHunter(null);
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const handleAssign = (employeeId: number) => {
    if (!selectedProjectHunter) return;
    assignMutation.mutate({
      projectHunterId: selectedProjectHunter,
      employeeId,
    });
  };

  const handleRemove = (employeeId: number) => {
    if (!selectedProjectHunter) return;
    if (!confirm("Czy na pewno chcesz usunąć to przypisanie?")) return;
    removeMutation.mutate({
      projectHunterId: selectedProjectHunter,
      employeeId,
    });
  };

  const handleUpdateRates = (employeeId: number) => {
    const minValue = rateMin ? Math.round(parseFloat(rateMin) * 100) : null;
    const maxValue = rateMax ? Math.round(parseFloat(rateMax) * 100) : null;

    updateRatesMutation.mutate({
      employeeId,
      projectHunterRateMin: minValue,
      projectHunterRateMax: maxValue,
    });
  };

  const openEditRates = (employee: any) => {
    setEditingEmployeeId(employee.employeeId);
    setRateMin(employee.projectHunterRateMin ? (employee.projectHunterRateMin / 100).toString() : "");
    setRateMax(employee.projectHunterRateMax ? (employee.projectHunterRateMax / 100).toString() : "");
  };

  const handleCreateProjectHunter = () => {
    if (!newPHName || !newPHEmail || !newPHPassword) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    if (newPHPassword.length < 8) {
      toast.error("Hasło musi mieć minimum 8 znaków");
      return;
    }

    createPHMutation.mutate({
      name: newPHName,
      email: newPHEmail,
      password: newPHPassword,
    });
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewPHName("");
    setNewPHEmail("");
    setNewPHPassword("");
    setCreatedCredentials(null);
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setNewPHPassword(password);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Skopiowano do schowka");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDeleteProjectHunter = (phId: number, phName: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć konto Łowcy Projektów: ${phName}?\n\nUsuniete zostaną również wszystkie przypisania pracowników.`)) {
      return;
    }
    deletePHMutation.mutate({ projectHunterId: phId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const assignedEmployeeIds = new Set(assignments?.map((a) => a.employeeId) || []);
  const availableEmployees = employees?.filter((e) => !assignedEmployeeIds.has(e.id)) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-transparent p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Zarządzanie Łowcami Projektów</h1>
            <p className="text-muted-foreground">
              Przypisuj pracowników do Łowców Projektów
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreatedCredentials(null)} className="shadow-lg hover:shadow-xl transition">
                <UserPlus className="w-4 h-4 mr-2" />
                Dodaj Łowcę Projektów
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {createdCredentials ? "Dane dostępowe" : "Utwórz konto Łowcy Projektów"}
              </DialogTitle>
            </DialogHeader>
            
            {createdCredentials ? (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Konto zostało utworzone. Poniższe dane dostępowe wyślij ręcznie na email Łowcy Projektów.
                    <strong className="block mt-2">Hasło nie będzie już dostępne po zamknięciu tego okna!</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email (login)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={createdCredentials.email}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(createdCredentials.email, "email")}
                      >
                        {copiedField === "email" ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Hasło</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={createdCredentials.password}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(createdCredentials.password, "password")}
                      >
                        {copiedField === "password" ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Adres logowania</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={`${window.location.origin}/project-hunter-login`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`${window.location.origin}/project-hunter-login`, "url")}
                      >
                        {copiedField === "url" ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={handleCloseCreateDialog} className="w-full">
                    Zamknij
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phName">Imię i nazwisko</Label>
                  <Input
                    id="phName"
                    value={newPHName}
                    onChange={(e) => setNewPHName(e.target.value)}
                    placeholder="np. Jan Kowalski"
                  />
                </div>

                <div>
                  <Label htmlFor="phEmail">Email (będzie służył jako login)</Label>
                  <Input
                    id="phEmail"
                    type="email"
                    value={newPHEmail}
                    onChange={(e) => setNewPHEmail(e.target.value)}
                    placeholder="np. jan@firma.pl"
                  />
                </div>

                <div>
                  <Label htmlFor="phPassword">Hasło (min. 8 znaków)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phPassword"
                      type="text"
                      value={newPHPassword}
                      onChange={(e) => setNewPHPassword(e.target.value)}
                      placeholder="Wpisz hasło"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateRandomPassword}
                      title="Wygeneruj losowe hasło"
                    >
                      <Key className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kliknij ikonę klucza aby wygenerować bezpieczne hasło
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Anuluj
                  </Button>
                  <Button
                    onClick={handleCreateProjectHunter}
                    disabled={createPHMutation.isPending}
                  >
                    {createPHMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Tworzenie...
                      </>
                    ) : (
                      "Utwórz konto"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {!projectHunters || projectHunters.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Brak Łowców Projektów w systemie. Należy najpierw utworzyć konta Łowców Projektów.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lista Łowców Projektów */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Łowcy Projektów</CardTitle>
              <CardDescription>Wybierz aby zarządzać przypisaniami</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {projectHunters.map((ph) => (
                <div key={ph.id} className="flex items-center gap-2">
                  <Button
                    variant={selectedProjectHunter === ph.id ? "default" : "outline"}
                    className="flex-1 justify-start"
                    onClick={() => setSelectedProjectHunter(ph.id)}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="font-semibold">{ph.name}</span>
                      <span className="text-xs opacity-70">{ph.email}</span>
                    </div>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteProjectHunter(ph.id, ph.name || ph.email || "Łowca")}
                    disabled={deletePHMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Przypisani pracownicy */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Przypisani pracownicy</CardTitle>
                  <CardDescription>
                    {selectedProjectHunter
                      ? "Zarządzaj pracownikami widocznymi dla tego Łowcy Projektów"
                      : "Wybierz Łowcę Projektów z lewej strony"}
                  </CardDescription>
                </div>
                {selectedProjectHunter && (
                  <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Przypisz pracownika
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Przypisz pracownika</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {availableEmployees.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">
                            Wszyscy aktywni pracownicy są już przypisani
                          </p>
                        ) : (
                          availableEmployees.map((employee) => (
                            <div
                              key={employee.id}
                              className="flex items-center justify-between p-3 border rounded hover:bg-accent"
                            >
                              <div>
                                <p className="font-semibold">
                                  {employee.firstName} {employee.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {employee.position}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleAssign(employee.id)}
                                disabled={assignMutation.isPending}
                              >
                                Przypisz
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProjectHunter ? (
                <p className="text-center text-muted-foreground py-8">
                  Wybierz Łowcę Projektów aby zobaczyć przypisanych pracowników
                </p>
              ) : !assignments || assignments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Brak przypisanych pracowników
                </p>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.assignmentId}
                      className="p-4 border rounded hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-lg">
                              {assignment.firstName} {assignment.lastName}
                            </h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {assignment.position}
                          </p>

                          {editingEmployeeId === assignment.employeeId ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="rateMin" className="text-xs">
                                    Minimalna stawka (PLN/h)
                                  </Label>
                                  <Input
                                    id="rateMin"
                                    type="number"
                                    step="0.01"
                                    value={rateMin}
                                    onChange={(e) => setRateMin(e.target.value)}
                                    placeholder="np. 100"
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="rateMax" className="text-xs">
                                    Maksymalna stawka (PLN/h)
                                  </Label>
                                  <Input
                                    id="rateMax"
                                    type="number"
                                    step="0.01"
                                    value={rateMax}
                                    onChange={(e) => setRateMax(e.target.value)}
                                    placeholder="np. 120"
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateRates(assignment.employeeId)}
                                  disabled={updateRatesMutation.isPending}
                                >
                                  Zapisz
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingEmployeeId(null);
                                    setRateMin("");
                                    setRateMax("");
                                  }}
                                >
                                  Anuluj
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="text-sm">
                                <span className="font-semibold">Stawka dla ŁP:</span>{" "}
                                {assignment.projectHunterRateMin || assignment.projectHunterRateMax
                                  ? `${assignment.projectHunterRateMin ? (assignment.projectHunterRateMin / 100).toFixed(2) : "?"} - ${assignment.projectHunterRateMax ? (assignment.projectHunterRateMax / 100).toFixed(2) : "?"} PLN/h`
                                  : "Nie określono"}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditRates(assignment)}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemove(assignment.employeeId)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

