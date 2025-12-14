import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit, Heart, Pin, Tag, Eye, Calendar, User, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

const labelColors: Record<string, string> = {
  "Finanse": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "HR": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "IT": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Klient": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Procedury": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Inne": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function KnowledgeBaseViewPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const params = useParams();
  const articleId = params.id ? parseInt(params.id) : undefined;

  const { data: article, isLoading } = trpc.knowledgeBase.getById.useQuery(
    { id: articleId! },
    { enabled: !!articleId }
  );

  // Pobierz listę projektów
  const { data: projects } = trpc.projects.list.useQuery(undefined, {
    enabled: true,
  });

  const { data: favorites } = trpc.knowledgeBase.getFavorites.useQuery();
  const utils = trpc.useUtils();
  const toggleFavorite = trpc.knowledgeBase.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.getFavorites.invalidate();
      toast.success(article && favorites?.some(f => f.id === article.id) 
        ? "Usunięto z ulubionych" 
        : "Dodano do ulubionych");
    },
  });

  const isFavorite = (id: number) => {
    return favorites?.some(f => f.id === id) || false;
  };

  const handleToggleFavorite = (id: number) => {
    toggleFavorite.mutate({ knowledgeBaseId: id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="p-6 border rounded-lg">
          <p className="text-muted-foreground mb-4">Artykuł nie został znaleziony</p>
          <Button variant="outline" onClick={() => setLocation("/knowledge")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót do bazy wiedzy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header z przyciskiem powrotu */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/knowledge")}
            className="-ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót do bazy wiedzy
          </Button>
        </div>
      </div>

      {/* Główna treść dokumentu */}
      <article className="container mx-auto max-w-4xl px-6 py-12">
        {/* Nagłówek dokumentu */}
        <header className="mb-8 pb-8 border-b">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                {article.isPinned && (
                  <Pin className="w-5 h-5 text-primary shrink-0" />
                )}
                <h1 className="text-4xl font-bold leading-tight text-foreground tracking-tight">
                  {article.title}
                </h1>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap mb-6">
                <Badge variant={(article as any).articleType === "admin" ? "default" : "secondary"} className="text-xs font-medium">
                  {(article as any).articleType === "admin" ? "📚 Wiedza firmy" : `👤 ${(article as any).authorName || "Notatka pracownika"}`}
                </Badge>
                {(article as any).projectId && projects && (
                  <Badge variant="outline" className="text-xs">
                    <Briefcase className="w-3 h-3 mr-1 inline" />
                    {projects.find((p: any) => p.id === (article as any).projectId)?.name || "Projekt"}
                  </Badge>
                )}
                {article.label && (
                  <Badge className={labelColors[article.label] || labelColors["Inne"]} variant="default">
                    {article.label}
                  </Badge>
                )}
                {article.tags && article.tags.split(",").map((tag: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleFavorite(article.id)}
                title={isFavorite(article.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                className="h-9 w-9"
              >
                <Heart className={`w-5 h-5 ${isFavorite(article.id) ? "fill-current text-red-500" : ""}`} />
              </Button>
              {/* Pracownik może edytować tylko swoje artykuły, admin może edytować wszystkie */}
              {(isAdmin || ((article as any).authorId === user?.id && (article as any).articleType === "employee")) && (
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/knowledge/${article.id}/edit`)}
                  className="h-9"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edytuj
                </Button>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>{article.viewCount || 0} odczytów</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Utworzono: {new Date(article.createdAt).toLocaleDateString("pl-PL", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}</span>
            </div>
            {article.updatedAt && article.updatedAt !== article.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Zaktualizowano: {new Date(article.updatedAt).toLocaleDateString("pl-PL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}</span>
              </div>
            )}
          </div>
        </header>

        {/* Treść dokumentu */}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-4
            prose-headings:scroll-mt-20
            prose-h1:text-3xl prose-h1:font-bold prose-h1:mt-10 prose-h1:mb-6
            prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-foreground prose-p:leading-7 prose-p:mb-4 prose-p:text-base
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
            prose-strong:text-foreground prose-strong:font-semibold
            prose-ul:my-4 prose-ul:pl-6 prose-ul:list-disc
            prose-ol:my-4 prose-ol:pl-6 prose-ol:list-decimal
            prose-li:text-foreground prose-li:my-2 prose-li:leading-7
            prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:my-6 prose-blockquote:text-muted-foreground prose-blockquote:italic
            prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
            prose-pre:bg-muted prose-pre:text-foreground prose-pre:p-4 prose-pre:rounded-lg prose-pre:my-6 prose-pre:overflow-x-auto
            prose-img:rounded-lg prose-img:my-6 prose-img:shadow-sm
            prose-table:w-full prose-table:my-6 prose-table:border-collapse
            prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted prose-th:text-left prose-th:font-semibold
            prose-td:border prose-td:border-border prose-td:p-3
            prose-hr:my-8 prose-hr:border-border"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Powiązane artykuły */}
        <RelatedArticlesSection articleId={article.id} />

        {/* Komentarze */}
        <CommentsSection articleId={article.id} />
      </article>
    </div>
  );
}

// Komponent sekcji powiązanych artykułów
function RelatedArticlesSection({ articleId }: { articleId: number }) {
  const { data: related } = trpc.knowledgeBase.getRelated.useQuery({ articleId });
  const { data: suggested } = trpc.knowledgeBase.suggestSimilar.useQuery({ articleId, limit: 5 });
  const [, setLocation] = useLocation();

  const allRelated = [
    ...(related || []),
    ...(suggested || []).filter(s => !related?.some(r => r.id === s.id))
  ].slice(0, 5);

  if (!allRelated || allRelated.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t">
      <h2 className="text-2xl font-bold mb-4">Czytaj dalej</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {allRelated.map((item: any) => (
          <div
            key={item.id}
            className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => setLocation(`/knowledge/${item.id}`)}
          >
            <h3 className="font-semibold mb-2">{item.title}</h3>
            {item.label && (
              <Badge className={labelColors[item.label] || labelColors["Inne"]} variant="default">
                {item.label}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Komponent sekcji komentarzy
function CommentsSection({ articleId }: { articleId: number }) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: comments, isLoading } = trpc.knowledgeBase.getComments.useQuery({ articleId });
  const utils = trpc.useUtils();
  
  const createComment = trpc.knowledgeBase.createComment.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.getComments.invalidate({ articleId });
      setNewComment("");
      setReplyingTo(null);
      setReplyContent("");
      toast.success("Komentarz dodany");
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim() || !user?.id) return;
    createComment.mutate({
      articleId,
      content: newComment,
      parentId: null,
    });
  };

  const handleSubmitReply = (parentId: number) => {
    if (!replyContent.trim() || !user?.id) return;
    createComment.mutate({
      articleId,
      content: replyContent,
      parentId,
    });
  };

  if (!user) return null;

  return (
    <div className="mt-12 pt-8 border-t">
      <h2 className="text-2xl font-bold mb-6">Komentarze</h2>
      
      {/* Formularz dodawania komentarza */}
      <div className="mb-8">
        <textarea
          className="w-full p-3 border rounded-lg resize-none"
          rows={3}
          placeholder="Dodaj komentarz..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <Button onClick={handleSubmitComment} disabled={!newComment.trim() || createComment.isPending}>
            Dodaj komentarz
          </Button>
        </div>
      </div>

      {/* Lista komentarzy */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !comments || comments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Brak komentarzy. Bądź pierwszy!</p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment: any) => (
            <div key={comment.id} className="border-l-2 border-primary/20 pl-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{comment.user?.name || "Anonimowy"}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{comment.content}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    Odpowiedz
                  </Button>
                  
                  {/* Formularz odpowiedzi */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 ml-4">
                      <textarea
                        className="w-full p-2 border rounded text-sm resize-none"
                        rows={2}
                        placeholder="Napisz odpowiedź..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={() => handleSubmitReply(comment.id)}>
                          Wyślij
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                        }}>
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Odpowiedzi */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-4 space-y-3">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="border-l-2 border-muted pl-3">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-3 h-3" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{reply.user?.name || "Anonimowy"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(reply.createdAt).toLocaleDateString("pl-PL")}
                                </span>
                              </div>
                              <p className="text-sm">{reply.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

