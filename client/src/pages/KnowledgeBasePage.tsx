import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, BookOpen, Trash2, Edit, ArrowLeft, Search, Heart, Eye, Pin, Star, Filter, X, Tag, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  
  // Filtry i wyszukiwanie
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "views">("newest");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [articleTypeFilter, setArticleTypeFilter] = useState<"all" | "admin" | "employee">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  const utils = trpc.useUtils();
  
  // Pobierz listę projektów
  const { data: projects } = trpc.projects.list.useQuery(undefined, {
    enabled: true,
  });

  // Pobierz wszystkie artykuły lub ulubione
  const { data: allItems, isLoading } = trpc.knowledgeBase.getAll.useQuery();
  const { data: favorites } = trpc.knowledgeBase.getFavorites.useQuery(undefined, {
    enabled: !showFavoritesOnly || !isAdmin, // Pracownicy zawsze mogą widzieć ulubione
  });
  
  // Wyszukiwanie
  const { data: searchResults, isLoading: isSearching } = trpc.knowledgeBase.search.useQuery(
    {
      query: searchQuery || undefined,
      label: selectedLabel !== "all" ? selectedLabel : undefined,
      tags: selectedTags || undefined,
      sortBy,
    },
    {
      enabled: searchQuery.length > 0 || selectedLabel !== "all" || selectedTags.length > 0,
    }
  );

  // Filtrowanie wyników
  const displayedItems = useMemo(() => {
    let items;
    if (showFavoritesOnly && favorites) {
      items = favorites;
    } else if (searchQuery || selectedLabel !== "all" || selectedTags || selectedProjectId !== null) {
      items = searchResults || [];
    } else {
      items = allItems || [];
    }
    
    // Filtruj po typie artykułu
    if (articleTypeFilter !== "all") {
      items = items.filter((item: any) => item.articleType === articleTypeFilter);
    }
    
    // Filtruj po projekcie (jeśli nie używamy wyszukiwania)
    if (selectedProjectId !== null && !searchQuery && selectedLabel === "all" && !selectedTags) {
      items = items.filter((item: any) => item.projectId === selectedProjectId);
    }
    
    return items;
  }, [allItems, searchResults, favorites, showFavoritesOnly, searchQuery, selectedLabel, selectedTags, articleTypeFilter, selectedProjectId]);

  // Pobierz wszystkie unikalne tagi
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    (allItems || []).forEach(item => {
      if (item.tags) {
        item.tags.split(",").forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) tagsSet.add(trimmed);
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [allItems]);


  const deleteItem = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.getAll.invalidate();
      utils.knowledgeBase.search.invalidate();
      toast.success("Usunięto z bazy wiedzy");
    },
  });

  const toggleFavorite = trpc.knowledgeBase.toggleFavorite.useMutation({
    onSuccess: (data) => {
      utils.knowledgeBase.getFavorites.invalidate();
      utils.knowledgeBase.getAll.invalidate();
      toast.success(data.isFavorite ? "Dodano do ulubionych" : "Usunięto z ulubionych");
    },
  });


  const handleDeleteItem = (id: number) => {
    if (confirm("Czy na pewno chcesz usunąć tę informację?")) {
      deleteItem.mutate({ id });
    }
  };


  const handleToggleFavorite = (itemId: number) => {
    toggleFavorite.mutate({ knowledgeBaseId: itemId });
  };

  const isFavorite = (itemId: number) => {
    return favorites?.some(fav => fav.id === itemId) || false;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLabel("all");
    setSelectedTags("");
    setSortBy("newest");
    setShowFavoritesOnly(false);
    setArticleTypeFilter("all");
  };

  const hasActiveFilters = searchQuery || selectedLabel !== "all" || selectedTags || showFavoritesOnly || articleTypeFilter !== "all";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button onClick={() => setLocation("/")} variant="outline" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do dashboardu
      </Button>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📚 Baza Wiedzy</h1>
          <p className="text-muted-foreground">Ważne informacje i procedury firmowe</p>
        </div>
        <Button onClick={() => setLocation("/knowledge/new")}>
          <Plus className="w-4 h-4 mr-2" />
          {isAdmin ? "Dodaj informację" : "Dodaj notatkę"}
        </Button>
      </div>

      {/* Filtry i wyszukiwarka */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtry i wyszukiwanie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Szukaj..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLabel} onValueChange={setSelectedLabel}>
              <SelectTrigger>
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {labelOptions.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Sortuj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Najnowsze</SelectItem>
                <SelectItem value="oldest">Najstarsze</SelectItem>
                <SelectItem value="title">Tytuł A-Z</SelectItem>
                <SelectItem value="views">Najczęściej czytane</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select value={articleTypeFilter} onValueChange={(value: "all" | "admin" | "employee") => setArticleTypeFilter(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Typ artykułu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="admin">📚 Wiedza firmy</SelectItem>
                  <SelectItem value="employee">👤 Notatki pracowników</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={selectedProjectId?.toString() || "all"} 
                onValueChange={(value) => setSelectedProjectId(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Projekt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie projekty</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <Briefcase className="w-3 h-3 mr-2 inline" />
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="flex-1"
              >
                <Heart className={`w-4 h-4 mr-2 ${showFavoritesOnly ? "fill-current" : ""}`} />
                Ulubione
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} size="icon">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {allTags.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Filtruj po tagach:</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(selectedTags.split(",").filter(t => t.trim() !== tag).join(","));
                      } else {
                        setSelectedTags(selectedTags ? `${selectedTags}, ${tag}` : tag);
                      }
                    }}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista artykułów */}
      {isSearching ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !displayedItems || displayedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? "Brak wyników dla wybranych filtrów" : "Baza wiedzy jest pusta"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Wyczyść filtry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayedItems.map((item) => (
            <Card key={item.id} className={item.isPinned ? "border-2 border-primary" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.isPinned && (
                      <Pin className="w-4 h-4 text-primary" />
                    )}
                    <CardTitle 
                      className="text-lg cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setLocation(`/knowledge/${item.id}`)}
                    >
                      {item.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={(item as any).articleType === "admin" ? "default" : "secondary"} className="text-xs">
                        {(item as any).articleType === "admin" ? "📚 Wiedza firmy" : `👤 ${(item as any).authorName || "Notatka pracownika"}`}
                      </Badge>
                      {(item as any).projectId && projects && (
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="w-3 h-3 mr-1 inline" />
                          {projects.find((p: any) => p.id === (item as any).projectId)?.name || "Projekt"}
                        </Badge>
                      )}
                      {item.label && (
                        <Badge className={labelColors[item.label] || labelColors["Inne"]}>
                          {item.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.tags && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.split(",").map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <CardDescription className="line-clamp-3 text-muted-foreground">
                    {item.content.replace(/<[^>]*>/g, '').substring(0, 200)}
                    {item.content.replace(/<[^>]*>/g, '').length > 200 && '...'}
                  </CardDescription>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {item.viewCount || 0} odczytów
                    </div>
                    <div>
                      {new Date(item.createdAt).toLocaleDateString("pl-PL")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleFavorite(item.id)}
                    title={isFavorite(item.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite(item.id) ? "fill-current text-red-500" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation(`/knowledge/${item.id}`)}
                    title="Zobacz szczegóły"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {/* Pracownik może edytować tylko swoje artykuły, admin może edytować wszystkie */}
                  {(isAdmin || ((item as any).authorId === user?.id && (item as any).articleType === "employee")) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLocation(`/knowledge/${item.id}/edit`)}
                      title="Edytuj"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Usuń"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
