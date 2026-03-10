import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logolacheck.png";

export default function ProjectHunterLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/project-hunter/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Zalogowano pomyślnie");
        // Przekieruj do panelu Łowcy Projektów
        window.location.href = "/project-hunter-dashboard";
      } else {
        toast.error(data.message || "Nieprawidłowy email lub hasło");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Wystąpił błąd podczas logowania");
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
          <CardTitle className="text-3xl font-bold">System Mirit Softwarehouse - Lacheck</CardTitle>
          <CardDescription className="text-base">
            System wewnętrzny organizacji
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="imie.nazwisko@mirit.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                required
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
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition"
              disabled={isLoading}
              size="lg"
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

            <div className="text-center text-sm text-muted-foreground pt-4">
              <p>Potrzebujesz dostępu?</p>
              <p className="mt-1">Skontaktuj się z administratorem systemu</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

