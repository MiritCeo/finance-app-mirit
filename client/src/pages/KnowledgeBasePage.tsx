import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, BookOpen, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

const labelColors: Record<string, string> = {
  "Finanse": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "HR": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "IT": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Klient": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Procedury": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Inne": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const labelOptions = Object.keys(labelColors);

export default function KnowledgeBasePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: number; title: string; content: string; label: string | null } | null>(null);
  const [newItem, setNewItem] = useState({ title: "", content: "", label: "Inne" });
  const utils = trpc.useUtils();

  const { data: knowledgeItems, isLoading } = trpc.knowledgeBase.getAll.useQuery();
  
  const createItem = trpc.knowledgeBase.create.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.getAll.invalidate();
      setIsCreateDialogOpen(false);
      setNewItem({ title: "", content: "", label: "Inne" });
      toast.success("Dodano do bazy wiedzy");
    },
  });

  const updateItem = trpc.knowledgeBase.update.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.getAll.invalidate();
      setIsEditDialogOpen(false);
      setEditingItem(null);
      toast.success("Zaktualizowano");
    },
  });

  const deleteItem = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.getAll.invalidate();
      toast.success("Usunięto z bazy wiedzy");
    },
  });

  const handleCreateItem = () => {
    if (!newItem.title.trim() || !newItem.content.trim()) {
      toast.error("Błąd", { description: "Tytuł i treść są wymagane" });
      return;
    }
    createItem.mutate(newItem);
  };

  const handleUpdateItem = () => {
    if (!editingItem || !editingItem.title.trim() || !editingItem.content.trim()) {
      toast.error("Błąd", { description: "Tytuł i treść są wymagane" });
      return;
    }
    updateItem.mutate({
      id: editingItem.id,
      title: editingItem.title,
      content: editingItem.content,
      label: editingItem.label || undefined,
    });
  };

  const handleDeleteItem = (id: number) => {
    if (confirm("Czy na pewno chcesz usunąć tę informację?")) {
      deleteItem.mutate({ id });
    }
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

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
          <h1 className="text-3xl font-bold">📚 Baza Wiedzy</h1>
          <p className="text-muted-foreground">Ważne informacje i procedury firmowe</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj informację
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dodaj do bazy wiedzy</DialogTitle>
              <DialogDescription>Utwórz nową ważną informację</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tytuł</label>
                <Input
                  placeholder="Tytuł informacji..."
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategoria</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {labelOptions.map((label) => (
                    <Badge
                      key={label}
                      className={`cursor-pointer ${
                        newItem.label === label
                          ? labelColors[label]
                          : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                      onClick={() => setNewItem({ ...newItem, label })}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Treść</label>
                <Textarea
                  placeholder="Szczegółowy opis, procedury, linki..."
                  value={newItem.content}
                  onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleCreateItem} disabled={createItem.isPending}>
                {createItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Dodaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!knowledgeItems || knowledgeItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Baza wiedzy jest pusta</p>
            <p className="text-sm text-muted-foreground">Dodaj pierwszą ważną informację</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {knowledgeItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    {item.label && (
                      <Badge className={labelColors[item.label] || labelColors["Inne"]}>
                        {item.label}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="whitespace-pre-wrap">
                    {item.content}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(item)}
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingItem && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edytuj informację</DialogTitle>
              <DialogDescription>Zaktualizuj treść w bazie wiedzy</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tytuł</label>
                <Input
                  placeholder="Tytuł informacji..."
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategoria</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {labelOptions.map((label) => (
                    <Badge
                      key={label}
                      className={`cursor-pointer ${
                        editingItem.label === label
                          ? labelColors[label]
                          : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                      onClick={() => setEditingItem({ ...editingItem, label })}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Treść</label>
                <Textarea
                  placeholder="Szczegółowy opis, procedury, linki..."
                  value={editingItem.content}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
                {updateItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Zapisz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
