import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/20 px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-primary/15 bg-white/90 p-8 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-bold">Mirit Softwarehouse - Lacheck</h1>
        <p className="text-muted-foreground mt-2">
          Wewnętrzny system zarządzania dla organizacji.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <Button asChild className="shadow-lg hover:shadow-xl transition">
              <a href="/">Przejdź do dashboardu</a>
            </Button>
          ) : (
            <Button asChild className="shadow-lg hover:shadow-xl transition">
              <a href={getLoginUrl()}>Zaloguj się</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
