import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Pencil, Trash2, Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

interface ClientFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export default function Clients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
  });

  const { data: clients, isLoading } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Klient został dodany");
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Klient został zaktualizowany");
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Klient został usunięty");
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingClient) {
      updateMutation.mutate({
        id: editingClient,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openDialog = (client?: any) => {
    if (client) {
      setEditingClient(client.id);
      setFormData({
        name: client.name,
        contactPerson: client.contactPerson || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    setFormData({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
    });
  };

  const handleDelete = (client: any) => {
    if (confirm(`Czy na pewno chcesz usunąć klienta "${client.name}"?`)) {
      deleteMutation.mutate({ id: client.id });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Ładowanie klientów...</p>
        </div>
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
            <Building2 className="h-6 w-6" />
            Klienci
          </h1>
          <p className="text-muted-foreground">Zarządzaj bazą klientów firmy</p>
        </div>
        <Button onClick={() => openDialog()} size="lg" className="shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
          <Plus className="mr-2 h-4 w-4" />
          Dodaj klienta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista klientów</CardTitle>
          <CardDescription>
            {clients?.length || 0} {clients?.length === 1 ? "klient" : "klientów"} w systemie
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!clients || clients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Brak klientów</h3>
              <p className="text-muted-foreground mt-2">
                Dodaj pierwszego klienta, aby móc tworzyć projekty i raporty
              </p>
              <Button onClick={() => openDialog()} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj pierwszego klienta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nazwa</TableHead>
                  <TableHead className="font-semibold">Osoba kontaktowa</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Telefon</TableHead>
                  <TableHead className="font-semibold">Adres</TableHead>
                  <TableHead className="text-right font-semibold">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-primary/5 transition-colors duration-200">
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.contactPerson || "-"}</TableCell>
                    <TableCell>{client.email || "-"}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell>{client.address || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(client)}
                          className="hover:bg-primary/10 transition-all duration-200 hover:scale-110"
                          title="Edytuj klienta"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client)}
                          disabled={deleteMutation.isPending}
                          className="hover:bg-destructive/10 text-destructive hover:text-destructive transition-all duration-200 hover:scale-110"
                          title="Usuń klienta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Edytuj klienta" : "Dodaj nowego klienta"}
              </DialogTitle>
              <DialogDescription>
                {editingClient
                  ? "Zaktualizuj dane klienta"
                  : "Wypełnij formularz aby dodać nowego klienta"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nazwa firmy <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="np. TechCorp Sp. z o.o."
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactPerson">Osoba kontaktowa</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPerson: e.target.value })
                  }
                  placeholder="np. Jan Kowalski"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="np. kontakt@techcorp.pl"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="np. +48 123 456 789"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="np. ul. Testowa 1, 00-001 Warszawa"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingClient ? "Zapisz zmiany" : "Dodaj klienta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
