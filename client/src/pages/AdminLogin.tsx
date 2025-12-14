import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // Przekieruj do endpointu lokalnego logowania
      window.location.href = "/api/auth/local-login";
    } catch (error: any) {
      console.error("Błąd logowania:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Logowanie administratora</CardTitle>
          <CardDescription className="text-center">
            Zaloguj się jako administrator systemu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tryb standalone:</strong> W trybie standalone (bez OAuth) logowanie jest automatyczne.
              Jeśli widzisz ten ekran, kliknij przycisk poniżej aby się zalogować.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <p className="text-sm font-semibold">Dane logowania:</p>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p><strong>Tryb:</strong> Standalone (automatyczne logowanie)</p>
              <p><strong>Rola:</strong> Administrator</p>
              <p><strong>Nazwa:</strong> Administrator</p>
              <p><strong>OpenID:</strong> admin</p>
              <p className="text-xs mt-2 pt-2 border-t">
                W trybie standalone logowanie jest automatyczne - nie wymaga hasła.
                Kliknij przycisk poniżej aby się zalogować.
              </p>
            </div>
          </div>

          <Button 
            onClick={handleLogin} 
            className="w-full" 
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logowanie...
              </>
            ) : (
              "Zaloguj się jako administrator"
            )}
          </Button>

          <div className="text-center">
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

