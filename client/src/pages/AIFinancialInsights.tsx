import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Users, Briefcase, MessageSquare, Sparkles } from "lucide-react";
import { useState } from "react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AIFinancialInsights() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: "system", content: "Jesteś asystentem finansowym. Pomagasz analizować finanse firmy." },
  ]);

  // Pobierz analizę projektów
  const projectsAnalysis = trpc.aiFinancial.analyzeProjects.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });

  // Pobierz analizę pracowników
  const employeesAnalysis = trpc.aiFinancial.analyzeEmployees.useQuery({
    year: selectedYear,
    month: selectedMonth,
  });

  // Chat mutation
  const chatMutation = trpc.aiFinancial.chat.useMutation({
    onSuccess: (response) => {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: response.response,
      }]);
    },
    onError: (error) => {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: `Przepraszam, wystąpił błąd: ${error.message}`,
      }]);
    },
  });

  const handleChatSend = (content: string) => {
    const newMessages: Message[] = [...chatMessages, { role: "user", content }];
    setChatMessages(newMessages);
    
    chatMutation.mutate({
      message: content,
      context: { year: selectedYear, month: selectedMonth },
    });
  };

  const months = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            AI Insights Finansowe
          </h1>
          <p className="text-muted-foreground mt-2">
            Inteligentna analiza finansów firmy z wykorzystaniem AI
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat z AI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh]">
              <DialogHeader>
                <DialogTitle>Asystent Finansowy AI</DialogTitle>
                <DialogDescription>
                  Zadaj pytanie o finanse firmy. AI ma dostęp do danych z {months[selectedMonth - 1]} {selectedYear}.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <AIChatBox
                  messages={chatMessages}
                  onSendMessage={handleChatSend}
                  isLoading={chatMutation.isPending}
                  height="100%"
                  suggestedPrompts={[
                    "Który projekt jest najbardziej rentowny?",
                    "Jakie są główne problemy finansowe?",
                    "Którzy pracownicy są najbardziej efektywni?",
                    "Jak mogę zwiększyć marżę?",
                  ]}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analiza projektów */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Analiza Rentowności Projektów
          </CardTitle>
          <CardDescription>
            Inteligentna analiza projektów z rekomendacjami AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectsAnalysis.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Analizowanie projektów...</span>
            </div>
          ) : projectsAnalysis.error ? (
            <div className="text-red-500 py-8">
              Błąd: {projectsAnalysis.error.message}
            </div>
          ) : projectsAnalysis.data ? (
            <div className="space-y-6">
              {/* Główne wnioski */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Główne wnioski</h3>
                <p className="text-blue-800 dark:text-blue-200">{projectsAnalysis.data.insights}</p>
              </div>

              {/* Top projekty */}
              {projectsAnalysis.data.topProjects.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Najbardziej rentowne projekty
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {projectsAnalysis.data.topProjects.map((project, idx) => (
                      <Badge key={idx} variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                        {project}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Projekty z niską marżą */}
              {projectsAnalysis.data.lowMarginProjects.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Projekty wymagające uwagi
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {projectsAnalysis.data.lowMarginProjects.map((project, idx) => (
                      <Badge key={idx} variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
                        {project}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Rekomendacje */}
              {projectsAnalysis.data.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Rekomendacje</h3>
                  <ul className="list-disc list-inside space-y-2">
                    {projectsAnalysis.data.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trendy */}
              {projectsAnalysis.data.trends && (
                <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold mb-2 text-purple-900 dark:text-purple-100">Trendy</h3>
                  <p className="text-purple-800 dark:text-purple-200">{projectsAnalysis.data.trends}</p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Analiza pracowników */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Analiza Efektywności Pracowników
          </CardTitle>
          <CardDescription>
            Analiza produktywności i efektywności pracowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeesAnalysis.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Analizowanie pracowników...</span>
            </div>
          ) : employeesAnalysis.error ? (
            <div className="text-red-500 py-8">
              Błąd: {employeesAnalysis.error.message}
            </div>
          ) : employeesAnalysis.data ? (
            <div className="space-y-6">
              {/* Główne wnioski */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Główne wnioski</h3>
                <p className="text-blue-800 dark:text-blue-200">{employeesAnalysis.data.insights}</p>
              </div>

              {/* Top performerzy */}
              {employeesAnalysis.data.topPerformers.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Najbardziej efektywni pracownicy
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {employeesAnalysis.data.topPerformers.map((employee, idx) => (
                      <Badge key={idx} variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                        {employee}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pracownicy z niską efektywnością */}
              {employeesAnalysis.data.lowEfficiencyEmployees.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    Pracownicy wymagający uwagi
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {employeesAnalysis.data.lowEfficiencyEmployees.map((employee, idx) => (
                      <Badge key={idx} variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
                        {employee}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Rekomendacje */}
              {employeesAnalysis.data.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Rekomendacje</h3>
                  <ul className="list-disc list-inside space-y-2">
                    {employeesAnalysis.data.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optymalizacja kosztów */}
              {employeesAnalysis.data.costOptimization && (
                <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold mb-2 text-purple-900 dark:text-purple-100">Optymalizacja kosztów</h3>
                  <p className="text-purple-800 dark:text-purple-200">{employeesAnalysis.data.costOptimization}</p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

