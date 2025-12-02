import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Trash2, Plus, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function FixedCosts() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const { data: costs = [], isLoading } = trpc.fixedCosts.list.useQuery();
  const createMutation = trpc.fixedCosts.create.useMutation({
    onSuccess: () => {
      utils.fixedCosts.list.invalidate();
      utils.fixedCosts.totalMonthly.invalidate();
      // Koszt został dodany
      resetForm();
    },
  });
  const updateMutation = trpc.fixedCosts.update.useMutation({
    onSuccess: () => {
      utils.fixedCosts.list.invalidate();
      utils.fixedCosts.totalMonthly.invalidate();
      // Koszt został zaktualizowany
      setEditingId(null);
      resetForm();
    },
  });
  const deleteMutation = trpc.fixedCosts.delete.useMutation({
    onSuccess: () => {
      utils.fixedCosts.list.invalidate();
      utils.fixedCosts.totalMonthly.invalidate();
      // Koszt został usunięty
    },
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    frequency: "monthly" as "monthly" | "quarterly" | "yearly" | "one_time",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    category: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      frequency: "monthly",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      category: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      amount: Math.round(parseFloat(formData.amount) * 100), // Konwersja na grosze
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      category: formData.category || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (cost: any) => {
    setEditingId(cost.id);
    setFormData({
      name: cost.name,
      amount: (cost.amount / 100).toString(),
      frequency: cost.frequency,
      startDate: new Date(cost.startDate).toISOString().split("T")[0],
      endDate: cost.endDate ? new Date(cost.endDate).toISOString().split("T")[0] : "",
      category: cost.category || "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Czy na pewno chcesz usunąć ten koszt?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Oblicz sumy
  const totalMonthly = costs.reduce((sum, cost) => {
    if (!cost.isActive) return sum;
    let monthlyCost = 0;
    switch (cost.frequency) {
      case "monthly":
        monthlyCost = cost.amount;
        break;
      case "quarterly":
        monthlyCost = Math.round(cost.amount / 3);
        break;
      case "yearly":
        monthlyCost = Math.round(cost.amount / 12);
        break;
      case "one_time":
        monthlyCost = 0;
        break;
    }
    return sum + monthlyCost;
  }, 0);

  const totalYearly = totalMonthly * 12;

  const frequencyLabels = {
    monthly: "Miesięcznie",
    quarterly: "Kwartalnie",
    yearly: "Rocznie",
    one_time: "Jednorazowo",
  };

  if (isLoading) {
    return <div className="p-8">Ładowanie...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button onClick={() => setLocation("/")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Wróć do dashboardu
      </Button>
      
      <div>
        <h1 className="text-3xl font-bold">Koszty stałe</h1>
        <p className="text-muted-foreground">
          Zarządzaj kosztami stałymi firmy (wynajem, oprogramowanie, księgowość, itp.)
        </p>
      </div>

      {/* Podsumowanie */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Koszty miesięczne</CardTitle>
            <CardDescription>Suma aktywnych kosztów stałych</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(totalMonthly / 100).toLocaleString("pl-PL", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              zł
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Koszty roczne</CardTitle>
            <CardDescription>Prognoza na 12 miesięcy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(totalYearly / 100).toLocaleString("pl-PL", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              zł
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formularz */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edytuj koszt" : "Dodaj nowy koszt"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nazwa kosztu *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="np. Wynajem biura"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Kwota (PLN) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Częstotliwość *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Miesięcznie</SelectItem>
                    <SelectItem value="quarterly">Kwartalnie</SelectItem>
                    <SelectItem value="yearly">Rocznie</SelectItem>
                    <SelectItem value="one_time">Jednorazowo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="np. Biuro, Oprogramowanie"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Data rozpoczęcia *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Data zakończenia</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                {editingId ? "Zaktualizuj" : "Dodaj koszt"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  Anuluj
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista kosztów stałych</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead>Kwota</TableHead>
                <TableHead>Częstotliwość</TableHead>
                <TableHead>Koszt miesięczny</TableHead>
                <TableHead>Koszt roczny</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Brak kosztów stałych. Dodaj pierwszy koszt używając formularza powyżej.
                  </TableCell>
                </TableRow>
              ) : (
                costs.map((cost) => {
                  let monthlyCost = 0;
                  switch (cost.frequency) {
                    case "monthly":
                      monthlyCost = cost.amount;
                      break;
                    case "quarterly":
                      monthlyCost = Math.round(cost.amount / 3);
                      break;
                    case "yearly":
                      monthlyCost = Math.round(cost.amount / 12);
                      break;
                    case "one_time":
                      monthlyCost = 0;
                      break;
                  }
                  const yearlyCost = monthlyCost * 12;

                  return (
                    <TableRow key={cost.id}>
                      <TableCell className="font-medium">{cost.name}</TableCell>
                      <TableCell>{cost.category || "-"}</TableCell>
                      <TableCell>
                        {(cost.amount / 100).toLocaleString("pl-PL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        zł
                      </TableCell>
                      <TableCell>{frequencyLabels[cost.frequency]}</TableCell>
                      <TableCell>
                        {(monthlyCost / 100).toLocaleString("pl-PL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        zł
                      </TableCell>
                      <TableCell>
                        {(yearlyCost / 100).toLocaleString("pl-PL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        zł
                      </TableCell>
                      <TableCell>
                        {cost.isActive ? (
                          <span className="text-green-600 font-medium">Aktywny</span>
                        ) : (
                          <span className="text-gray-500">Nieaktywny</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(cost)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cost.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
