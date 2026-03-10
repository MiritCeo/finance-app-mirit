import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { RichTextEditor } from "@/components/RichTextEditor";

const labelColors: Record<string, string> = {
  "Finanse": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "HR": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "IT": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Klient": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Procedury": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Inne": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const labelOptions = Object.keys(labelColors);

export default function KnowledgeBaseEditPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Sprawdź czy to edycja czy nowy artykuł
  const params = useParams();
  const isEdit = !!params.id;
  const articleId = params.id ? parseInt(params.id) : undefined;

  const [formData, setFormData] = useState({
    title: "",
    content: "<p></p>",
    label: "Inne",
    tags: "",
    isPinned: false,
    projectId: null as number | null,
    status: "published" as "draft" | "published" | "archived",
  });

  // Pobierz listę projektów
  const { data: projects } = trpc.projects.list.useQuery(undefined, {
    enabled: true,
  });

  // Pobierz dane artykułu jeśli edytujemy
  const { data: article, isLoading: isLoadingArticle } = trpc.knowledgeBase.getById.useQuery(
    { id: articleId! },
    { enabled: isEdit && !!articleId }
  );

  // Załaduj dane artykułu do formularza
  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title,
        content: article.content || "<p></p>",
        label: article.label || "Inne",
        tags: article.tags || "",
        isPinned: article.isPinned || false,
        projectId: (article as any).projectId || null,
        status: (article as any).status || "published",
      });
    }
  }, [article]);

  const utils = trpc.useUtils();
  const createItem = trpc.knowledgeBase.create.useMutation({
    onSuccess: (data) => {
      toast.success("Artykuł został utworzony");
      utils.knowledgeBase.getAll.invalidate();
      if (data.id) {
        setLocation(`/knowledge/${data.id}`);
      } else {
        setLocation("/knowledge");
      }
    },
    onError: (error) => {
      toast.error("Błąd", { description: error.message });
    },
  });

  const updateItem = trpc.knowledgeBase.update.useMutation({
    onSuccess: () => {
      toast.success("Artykuł został zaktualizowany");
      utils.knowledgeBase.getAll.invalidate();
      utils.knowledgeBase.getById.invalidate({ id: articleId! });
      setLocation(`/knowledge/${articleId}`);
    },
    onError: (error) => {
      toast.error("Błąd", { description: error.message });
    },
  });

  const handleSubmit = () => {
    // Sprawdź czy treść nie jest pusta
    const contentText = formData.content.replace(/<[^>]*>/g, '').trim();
    if (!formData.title.trim() || !contentText) {
      toast.error("Błąd", { description: "Tytuł i treść są wymagane" });
      return;
    }

    if (isEdit && articleId) {
      updateItem.mutate({
        id: articleId,
        title: formData.title,
        content: formData.content,
        label: formData.label || undefined,
        tags: formData.tags || undefined,
        isPinned: formData.isPinned,
        projectId: formData.projectId || undefined,
        status: formData.status,
      });
    } else {
      createItem.mutate({
        title: formData.title,
        content: formData.content,
        label: formData.label || undefined,
        tags: formData.tags || undefined,
        isPinned: formData.isPinned,
        projectId: formData.projectId || undefined,
        status: formData.status,
      });
    }
  };

  // Pracownicy mogą tworzyć nowe artykuły, ale nie mogą edytować cudzych
  if (isEdit && !isAdmin) {
    // Sprawdź czy pracownik próbuje edytować swój własny artykuł
    if (article && article.authorId !== user?.id) {
      setLocation("/knowledge");
      return null;
    }
  }

  if (isEdit && isLoadingArticle) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isEdit && !article) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Artykuł nie został znaleziony</p>
            <Button variant="outline" onClick={() => setLocation("/knowledge")} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót do bazy wiedzy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => setLocation("/knowledge")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Powrót do bazy wiedzy
      </Button>
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-transparent p-6 shadow-sm mb-6">
        <h1 className="text-3xl font-bold">
          {isEdit ? "Edytuj artykuł" : (isAdmin ? "Nowy artykuł" : "Nowa notatka")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isEdit 
            ? "Zaktualizuj treść artykułu" 
            : (isAdmin 
              ? "Utwórz nowy artykuł w bazie wiedzy" 
              : "Dodaj notatkę, która będzie widoczna dla innych pracowników i administratora")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Szczegóły artykułu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Tytuł *</label>
            <Input
              placeholder="Tytuł artykułu..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Kategoria</label>
            <div className="flex flex-wrap gap-2">
              {labelOptions.map((label) => (
                <Badge
                  key={label}
                  className={`cursor-pointer transition-colors ${
                    formData.label === label
                      ? labelColors[label]
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:opacity-80"
                  }`}
                  onClick={() => setFormData({ ...formData, label })}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tagi (oddzielone przecinkami)</label>
            <Input
              placeholder="np. onboarding, procedury, hr"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Użyj tagów, aby ułatwić wyszukiwanie artykułów
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 p-4 border rounded-lg">
              <input
                type="checkbox"
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isPinned" className="text-sm font-medium cursor-pointer flex-1">
                Przypnij na górze listy
              </label>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Przypisz do projektu (opcjonalnie)</label>
            <Select
              value={formData.projectId?.toString() || "none"}
              onValueChange={(value) => setFormData({ ...formData, projectId: value === "none" ? null : parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz projekt..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak przypisania</SelectItem>
                {projects && projects.length > 0 ? (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Brak dostępnych projektów</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Opcjonalnie możesz przypisać ten artykuł do konkretnego projektu
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status publikacji</label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as "draft" | "published" | "archived" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">📝 Wersja robocza (draft)</SelectItem>
                <SelectItem value="published">✅ Opublikowany</SelectItem>
                <SelectItem value="archived">📦 Zarchiwizowany</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.status === "draft" && "Artykuł nie będzie widoczny dla innych użytkowników"}
              {formData.status === "published" && "Artykuł będzie widoczny dla wszystkich"}
              {formData.status === "archived" && "Artykuł zostanie zarchiwizowany"}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Treść *</label>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Napisz treść artykułu... Użyj paska narzędzi do formatowania tekstu, dodawania linków, obrazów i tabel."
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 Użyj paska narzędzi do formatowania tekstu, dodawania nagłówków, list, linków, obrazów i tabel
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={createItem.isPending || updateItem.isPending}
              size="lg"
            >
              {(createItem.isPending || updateItem.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? "Zaktualizuj artykuł" : "Utwórz artykuł"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/knowledge")}
              size="lg"
            >
              <X className="w-4 h-4 mr-2" />
              Anuluj
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

