import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Link2, Unlink, RefreshCw, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function HRappkaMapping() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Sprawdź czy użytkownik jest administratorem
  if (user && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Brak dostępu</h1>
          <p className="text-muted-foreground mb-4">
            Ta strona jest dostępna tylko dla administratorów.
          </p>
          <Button onClick={() => setLocation("/")}>
            Przejdź do Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // HRappka mapping
  const { data: mappingData, isLoading: isLoadingMapping, refetch: refetchMapping, error: mappingError } = trpc.employees.getHRappkaEmployeesForMapping.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { refetch: refetchEmployees } = trpc.employees.list.useQuery(undefined, {
    enabled: false, // Tylko do refetch
  });

  // Debug: test endpoint
  const [showDebug, setShowDebug] = useState(false);
  const testEndpointQuery = trpc.hrappka.testHRappkaEndpoint.useQuery(
    { endpoint: "/api/employees/get" },
    { enabled: showDebug && !!user && user.role === "admin", retry: false }
  );

  // Debug log
  useEffect(() => {
    if (mappingData) {
      console.log("[HRappkaMapping] mappingData:", mappingData);
      console.log("[HRappkaMapping] localEmployees:", mappingData.localEmployees?.length || 0);
      console.log("[HRappkaMapping] hrappkaEmployees:", mappingData.hrappkaEmployees?.length || 0);
    }
    if (mappingError) {
      console.error("[HRappkaMapping] mappingError:", mappingError);
    }
  }, [mappingData, mappingError]);

  const assignHRappkaIdMutation = trpc.employees.assignHRappkaId.useMutation({
    onSuccess: () => {
      toast.success("Przypisano HRappka ID do pracownika");
      refetchMapping();
      refetchEmployees();
    },
    onError: (error) => {
      toast.error(error.message || "Błąd podczas przypisywania HRappka ID");
    },
  });

  const unassignHRappkaIdMutation = trpc.employees.unassignHRappkaId.useMutation({
    onSuccess: () => {
      toast.success("Usunięto przypisanie HRappka ID");
      refetchMapping();
      refetchEmployees();
    },
    onError: (error) => {
      toast.error(error.message || "Błąd podczas usuwania przypisania");
    },
  });

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/employees")}
              className="mb-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Link2 className="h-6 w-6" />
              Mapowanie pracowników z HRappka
            </h1>
          </div>
          <p className="text-muted-foreground">
            Przypisz pracowników z naszej aplikacji do pracowników w systemie HRappka w celu synchronizacji danych.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDebug(!showDebug)}
            variant="outline"
            size="sm"
          >
            {showDebug ? "Ukryj" : "Pokaż"} debug
          </Button>
          <Button
            onClick={() => {
              refetchMapping();
              refetchEmployees();
            }}
            disabled={isLoadingMapping}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingMapping && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Ładowanie danych z HRappka...</span>
        </div>
      )}

      {/* Debug Info */}
      {showDebug && testEndpointQuery.data && (
        <Card className="bg-muted border-2">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Debug - Test Endpoint HRappka</h3>
            <div className="space-y-2 text-sm font-mono">
              <div><strong>URL:</strong> {testEndpointQuery.data.url}</div>
              <div><strong>Status:</strong> {testEndpointQuery.data.status} {testEndpointQuery.data.statusText}</div>
              <div><strong>Content-Type:</strong> {testEndpointQuery.data.contentType || "N/A"}</div>
              {testEndpointQuery.data.json && (
                <div>
                  <strong>JSON Response:</strong>
                  <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(testEndpointQuery.data.json, null, 2)}
                  </pre>
                </div>
              )}
              {testEndpointQuery.data.text && (
                <div>
                  <strong>Text Response (first 500 chars):</strong>
                  <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto max-h-40">
                    {testEndpointQuery.data.text}
                  </pre>
                </div>
              )}
              {testEndpointQuery.data.error && (
                <div className="text-destructive">
                  <strong>Error:</strong> {testEndpointQuery.data.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {mappingError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="font-semibold mb-1">Błąd połączenia z HRappka</p>
              <p className="text-sm text-muted-foreground mb-2">
                {mappingError.message || "Nie udało się pobrać danych z HRappka"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Sprawdź konfigurację w .env (HRAPPKA_BASE_URL, HRAPPKA_EMAIL, HRAPPKA_PASSWORD, HRAPPKA_COMPANY_ID)
              </p>
              <Button
                variant="outline"
                onClick={() => refetchMapping()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Spróbuj ponownie
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state - no error, no loading, but no data */}
      {!isLoadingMapping && !mappingError && !mappingData && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Brak danych do wyświetlenia</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetchMapping()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Odśwież
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!isLoadingMapping && !mappingError && mappingData && (
        <div className="space-y-6">
          {/* Debug info */}
          {process.env.NODE_ENV === "development" && (
            <Card className="bg-muted">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">
                  Debug: Lokalni pracownicy: {mappingData.localEmployees.length}, 
                  HRappka pracownicy: {mappingData.hrappkaEmployees.length}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Statystyki */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{mappingData.localEmployees.length}</div>
                <p className="text-sm text-muted-foreground">Pracowników w aplikacji</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{mappingData.hrappkaEmployees.length}</div>
                <p className="text-sm text-muted-foreground">Pracowników w HRappka</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {mappingData.localEmployees.filter((e: any) => e.hrappkaId).length}
                </div>
                <p className="text-sm text-muted-foreground">Zmapowanych</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela pracowników lokalnych */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Pracownicy w naszej aplikacji</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imię i Nazwisko</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Zmapowany z HRappka</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!mappingData.localEmployees || mappingData.localEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Brak pracowników w aplikacji
                        </TableCell>
                      </TableRow>
                    ) : (
                      mappingData.localEmployees.map((localEmp: any) => (
                        <TableRow key={localEmp.id}>
                          <TableCell className="font-medium">
                            {localEmp.firstName} {localEmp.lastName}
                          </TableCell>
                          <TableCell>{localEmp.email || "-"}</TableCell>
                          <TableCell>
                            {localEmp.hrappkaEmployee ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-sm">
                                  {localEmp.hrappkaEmployee.firstName} {localEmp.hrappkaEmployee.lastName}
                                  <span className="text-muted-foreground ml-1">
                                    (ID: {localEmp.hrappkaId})
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Brak mapowania</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {localEmp.hrappkaId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Czy na pewno chcesz usunąć mapowanie dla ${localEmp.firstName} ${localEmp.lastName}?`)) {
                                    unassignHRappkaIdMutation.mutate({ employeeId: localEmp.id });
                                  }
                                }}
                                disabled={unassignHRappkaIdMutation.isPending}
                              >
                                <Unlink className="h-4 w-4 mr-1" />
                                Usuń mapowanie
                              </Button>
                            ) : (
                              <Select
                                onValueChange={(value) => {
                                  if (value && value !== "none") {
                                    assignHRappkaIdMutation.mutate({
                                      employeeId: localEmp.id,
                                      hrappkaId: parseInt(value),
                                    });
                                  }
                                }}
                                disabled={assignHRappkaIdMutation.isPending}
                              >
                                <SelectTrigger className="w-[300px]">
                                  <SelectValue placeholder="Wybierz pracownika z HRappka" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {!mappingData.hrappkaEmployees || mappingData.hrappkaEmployees.length === 0 ? (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      Brak dostępnych pracowników z HRappka
                                    </div>
                                  ) : (
                                    (() => {
                                      // Filtruj pracowników - pokaż tylko niezmapowanych lub już zmapowanych z tym pracownikiem
                                      const availableEmployees = mappingData.hrappkaEmployees.filter(
                                        (he: any) => {
                                          // Jeśli nie jest zmapowany, pokaż
                                          if (!he.isMapped) return true;
                                          // Jeśli jest zmapowany z tym samym pracownikiem, pokaż (można zmienić)
                                          if (he.localEmployeeId === localEmp.id) return true;
                                          // W przeciwnym razie ukryj
                                          return false;
                                        }
                                      );
                                      
                                      if (availableEmployees.length === 0) {
                                        return (
                                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                            Wszyscy pracownicy z HRappka są już zmapowani
                                          </div>
                                        );
                                      }
                                      
                                      return availableEmployees.map((hrappkaEmp: any) => {
                                        const displayName = `${hrappkaEmp.firstName || ""} ${hrappkaEmp.lastName || ""}`.trim() || `Pracownik ID: ${hrappkaEmp.id}`;
                                        return (
                                          <SelectItem 
                                            key={hrappkaEmp.id} 
                                            value={hrappkaEmp.id.toString()}
                                          >
                                            {displayName}
                                            {hrappkaEmp.email ? ` (${hrappkaEmp.email})` : ""}
                                            {hrappkaEmp.isMapped && hrappkaEmp.localEmployeeId === localEmp.id ? " ✓" : ""}
                                          </SelectItem>
                                        );
                                      });
                                    })()
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tabela pracowników z HRappka */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Pracownicy w HRappka</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Imię i Nazwisko</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status mapowania</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!mappingData.hrappkaEmployees || mappingData.hrappkaEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          <div className="space-y-2">
                            <p>Brak pracowników w HRappka lub nie udało się pobrać danych</p>
                            <p className="text-xs">
                              Sprawdź czy endpoint /employees działa w HRappka API
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => refetchMapping()}
                              className="mt-2"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Odśwież
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      mappingData.hrappkaEmployees.map((hrappkaEmp: any) => (
                        <TableRow key={hrappkaEmp.id}>
                          <TableCell className="font-mono text-sm">{hrappkaEmp.id}</TableCell>
                          <TableCell className="font-medium">
                            {hrappkaEmp.firstName} {hrappkaEmp.lastName}
                          </TableCell>
                          <TableCell>{hrappkaEmp.email || "-"}</TableCell>
                          <TableCell>
                            {hrappkaEmp.isMapped ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600">
                                  Zmapowany z pracownikiem ID: {hrappkaEmp.localEmployeeId}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Nie zmapowany</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

