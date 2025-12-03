import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, Users, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

function UrgentTasksList() {
  const { data: urgentTasks, isLoading } = trpc.tasks.getUrgent.useQuery({ limit: 10 });
  const utils = trpc.useUtils();
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.getUrgent.invalidate();
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }

  if (!urgentTasks || urgentTasks.length === 0) {
    return <p className="text-sm text-muted-foreground">Brak pilnych zadań 🎉</p>;
  }

  const handleToggleStatus = (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "urgent" : "done";
    updateTask.mutate({
      id: taskId,
      status: newStatus as "planned" | "in_progress" | "urgent" | "done",
      completedAt: newStatus === "done" ? new Date() : null,
    });
  };

  return (
    <div className="space-y-3">
      {urgentTasks.map((task) => (
        <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
          <button
            onClick={() => handleToggleStatus(task.id, task.status)}
            className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {task.status === "done" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              task.status === "done" ? "line-through text-muted-foreground" : ""
            }`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <Badge variant="destructive" className="shrink-0">Pilne</Badge>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: kpi, isLoading } = trpc.dashboard.kpi.useQuery(undefined, {
    enabled: !!user,
  });
  
  // Pobierz bieżący miesiąc i rok
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Dokładne wyniki miesięczne
  const { data: accurateResults, isLoading: accurateLoading } = trpc.dashboard.getAccurateMonthlyResults.useQuery(
    { year: currentYear, month: currentMonth },
    { enabled: !!user }
  );
  
  // Trendy zysków/strat (ostatnie 12 miesięcy)
  const { data: profitTrends, isLoading: trendsLoading } = trpc.dashboard.getProfitTrends.useQuery(
    { months: 12 },
    { enabled: !!user }
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-3xl font-bold">Witaj w ProfitFlow</h1>
        <p className="text-muted-foreground">Zaloguj się, aby kontynuować</p>
        <Button asChild>
          <a href={getLoginUrl()}>Zaloguj się</a>
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Witaj, {user.name || user.email}!
          </p>
        </div>
      </div>

      {kpi && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Całkowity przychód
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(kpi.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">miesięcznie</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Koszty pracowników
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(kpi.employeeCosts)}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpi.employeeCount} pracowników
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Koszty stałe
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(kpi.fixedCosts)}
              </div>
              <p className="text-xs text-muted-foreground">miesięcznie</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Zysk operacyjny
              </CardTitle>
              {kpi.operatingProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(kpi.operatingProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                Marża: {kpi.operatingMargin.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Dokładne wyniki miesięczne
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {accurateLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : accurateResults ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Przychód:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Koszty pracowników:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults.employeeCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Koszty stałe:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults.fixedCosts)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Zysk operacyjny:</span>
                      <span className={`text-lg font-bold ${
                        accurateResults.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(accurateResults.operatingProfit)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      Marża: {accurateResults.operatingMargin.toFixed(2)}%
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Dane z raportów rocznych za {currentMonth}/{currentYear}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </CardContent>
          </Card>

        </div>
      )}
      
      {/* Wykres trendów zysku/straty */}
      {profitTrends && profitTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trendy finansowe (ostatnie 12 miesięcy)</CardTitle>
            <CardDescription>
              Przychód, koszty i zysk operacyjny w czasie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={profitTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 100).toFixed(0)} zł`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Miesiąc: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Przychód"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalCosts" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Koszty całkowite"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Zysk operacyjny"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Szybki start</CardTitle>
            <CardDescription>
              Najczęściej używane funkcje
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/time-reporting">Raportuj godziny</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/employees">Zarządzaj pracownikami</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/projects">Zarządzaj projektami</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/clients">Zarządzaj klientami</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/simulator">Symulator zysku z pracownika</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/fixed-costs">Koszty stałe</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>🔴 Pilne zadania</CardTitle>
              <CardDescription>
                Zadania wymagające natychmiastowej uwagi
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/tasks">Pokaż wszystkie</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <UrgentTasksList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
