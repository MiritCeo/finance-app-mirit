import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText, Download } from "lucide-react";
import { useState } from "react";

export default function ProjectHunterDashboard() {
  const { data: employees, isLoading } = trpc.projectHunter.getAssignedEmployees.useQuery();
  const [selectedCVHistory, setSelectedCVHistory] = useState<number | null>(null);
  const { data: cvHistory } = trpc.projectHunter.getCVHistory.useQuery(
    { cvHistoryId: selectedCVHistory! },
    { enabled: !!selectedCVHistory }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-transparent p-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Panel Łowcy Projektów</h1>
            <p className="text-muted-foreground">
              Lista pracowników dostępnych do projektów bodyleasingowych
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground rounded-2xl border border-dashed bg-muted/30 py-8">
              Brak przypisanych pracowników. Skontaktuj się z administratorem.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatRate = (min?: number | null, max?: number | null) => {
    if (!min && !max) return "Stawka nie określona";
    if (!max) return `${(min! / 100).toFixed(2)} PLN/h`;
    if (!min) return `${(max! / 100).toFixed(2)} PLN/h`;
    return `${(min / 100).toFixed(2)} - ${(max / 100).toFixed(2)} PLN/h`;
  };

  const handleDownloadCV = (cvId: number) => {
    setSelectedCVHistory(cvId);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-transparent p-6 shadow-sm mb-6">
        <h1 className="text-3xl font-bold mb-2">Panel Łowcy Projektów</h1>
        <p className="text-muted-foreground">
          Lista pracowników dostępnych do projektów bodyleasingowych
        </p>
      </div>

      <div className="grid gap-6">
        {employees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{employee.firstName}</CardTitle>
                  <CardDescription className="text-lg mt-1">
                    {employee.position || "Stanowisko nie określone"}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {formatRate(employee.projectHunterRateMin, employee.projectHunterRateMax)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {employee.cv && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Doświadczenie:</span>{" "}
                      {employee.cv.yearsOfExperience} lat
                    </div>
                    <div>
                      <span className="font-semibold">Poziom:</span>{" "}
                      {employee.cv.seniorityLevel || "Nie określono"}
                    </div>
                  </div>

                  {employee.cv.tagline && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground italic">
                        "{employee.cv.tagline}"
                      </p>
                    </div>
                  )}

                  {employee.cv.technologies && employee.cv.technologies.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2 text-sm">Technologie:</h4>
                      <div className="flex flex-wrap gap-2">
                        {employee.cv.technologies.map((tech) => (
                          <Badge key={tech.id} variant="outline">
                            {tech.technologyName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {employee.cvHistory && employee.cvHistory.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="font-semibold mb-3 text-sm">Dostępne CV:</h4>
                      <div className="flex flex-wrap gap-2">
                        {employee.cvHistory.map((cv) => (
                          <Button
                            key={cv.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadCV(cv.id)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            CV {cv.language.toUpperCase()} -{" "}
                            {new Date(cv.generatedAt).toLocaleDateString("pl-PL")}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!employee.cv && (
                <p className="text-sm text-muted-foreground">
                  CV nie jest jeszcze dostępne dla tego pracownika.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog do wyświetlania CV */}
      <Dialog open={!!selectedCVHistory} onOpenChange={() => setSelectedCVHistory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Podgląd CV</DialogTitle>
          </DialogHeader>
          {cvHistory && (
            <div>
              <div className="mb-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([cvHistory.htmlContent], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `cv-${cvHistory.language}-${new Date(cvHistory.generatedAt).getTime()}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Pobierz HTML
                </Button>
              </div>
              <div
                className="border rounded p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: cvHistory.htmlContent }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

