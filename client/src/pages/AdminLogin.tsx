import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logolacheck.png";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd logowania");
      }

      toast.success("Zalogowano pomyślnie");
      // Odśwież stronę aby załadować nową sesję i dane użytkownika
      // Użyj setTimeout aby dać czas na zapisanie cookie
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } catch (error: any) {
      toast.error(error.message || "Błąd logowania");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/20 dark:from-[#1a0b12] dark:via-gray-900 dark:to-[#2b0d1d] p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/90 dark:bg-gray-900/80 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white shadow-md ring-1 ring-black/5 flex items-center justify-center">
            <img src={logo} alt="Lacheck" className="h-12 w-12 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            System Mirit Softwarehouse - Lacheck
          </CardTitle>
          <CardDescription className="text-center">
            System wewnętrzny organizacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@mirit.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logowanie...
                </>
              ) : (
                "Wejdź do systemu"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground pt-2">
              Masz problem z logowaniem? Skontaktuj się z administratorem.
            </p>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setLocation("/employee-login")}
              className="text-sm"
            >
              Zaloguj się jako pracownik
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

