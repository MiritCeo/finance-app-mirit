import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, Users, TrendingUp, TrendingDown, Calendar, ArrowUp, ArrowDown, Minus, Plus, Trophy, Briefcase, Award, Medal, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, Zap, Clock, Building2, Calculator, Receipt, Moon, Sun, Filter, Target, Activity, Sparkles, UserCircle, BookOpen } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";
import { HRappkaInfoPanel } from "@/components/HRappkaInfoPanel";

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
  const { theme, toggleTheme } = useTheme();
  
  // Jeśli użytkownik nie jest administratorem, pokaż uproszczony dashboard
  const isEmployee = !authLoading && user && user.role === "employee";
  // Warunek: zapytania dashboardowe tylko dla administratorów
  const isAdmin = Boolean(!authLoading && user && user.role === "admin");
  // Pobierz bieżący miesiąc i rok
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  
  // Dla porównania - poprzedni miesiąc
  const currentYear = selectedYear;
  const currentMonth = selectedMonth;
  
  const { data: kpi, isLoading, error: kpiError } = trpc.dashboard.kpi.useQuery(
    { year: currentYear, month: currentMonth },
    { enabled: isAdmin }
  );
  
  // Funkcja pomocnicza do obliczania poprzedniego miesiąca
  const getPreviousMonth = (year: number, month: number, monthsBack: number) => {
    const date = new Date(year, month - 1 - monthsBack, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  };
  
  // Dokładne wyniki miesięczne - bieżący miesiąc
  const { data: accurateResults, isLoading: accurateLoading } = trpc.dashboard.getAccurateMonthlyResults.useQuery(
    { year: currentYear, month: currentMonth },
    { enabled: isAdmin }
  );
  
  // Dokładne wyniki miesięczne - poprzednie 3 miesiące
  const prevMonth1 = getPreviousMonth(currentYear, currentMonth, 1);
  const prevMonth2 = getPreviousMonth(currentYear, currentMonth, 2);
  const prevMonth3 = getPreviousMonth(currentYear, currentMonth, 3);
  
  const { data: accurateResults1, isLoading: accurateLoading1 } = trpc.dashboard.getAccurateMonthlyResults.useQuery(
    { year: prevMonth1.year, month: prevMonth1.month },
    { enabled: isAdmin }
  );
  
  const { data: accurateResults2, isLoading: accurateLoading2 } = trpc.dashboard.getAccurateMonthlyResults.useQuery(
    { year: prevMonth2.year, month: prevMonth2.month },
    { enabled: isAdmin }
  );
  
  const { data: accurateResults3, isLoading: accurateLoading3 } = trpc.dashboard.getAccurateMonthlyResults.useQuery(
    { year: prevMonth3.year, month: prevMonth3.month },
    { enabled: isAdmin }
  );
  
  // Funkcja pomocnicza do nazwy miesiąca
  const getMonthName = (month: number) => {
    const months = [
      "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
      "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
    ];
    return months[month - 1];
  };
  
  const prevMonth = getPreviousMonth(currentYear, currentMonth, 1);
  
  // Pobierz dane z poprzedniego miesiąca dla porównania
  const { data: prevMonthKpi } = trpc.dashboard.getAccurateMonthlyResults.useQuery(
    { year: prevMonth.year, month: prevMonth.month },
    { enabled: isAdmin }
  );
  
  // Funkcja pomocnicza do obliczania zmiany procentowej
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  // Funkcja pomocnicza do formatowania zmiany
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };
  
  // Ranking pracowników (miesięczny)
  const { data: topEmployees, isLoading: topEmployeesLoading } = trpc.dashboard.getTopEmployees.useQuery(
    { limit: 5, year: currentYear, month: currentMonth },
    { enabled: isAdmin }
  );
  
  // Ranking pracowników (roczny)
  const { data: topEmployeesByYear, isLoading: topEmployeesByYearLoading } = trpc.dashboard.getTopEmployeesByYear.useQuery(
    { limit: 5, year: currentYear },
    { enabled: isAdmin }
  );
  
  // Analiza rentowności projektów
  const { data: projectProfitability, isLoading: projectProfitabilityLoading } = trpc.dashboard.getProjectProfitability.useQuery(
    { year: currentYear, month: currentMonth },
    { enabled: isAdmin }
  );
  
  // Trendy zysków/strat (ostatnie 12 miesięcy)
  const { data: profitTrends, isLoading: trendsLoading } = trpc.dashboard.getProfitTrends.useQuery(
    { months: 12 },
    { enabled: isAdmin }
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

  // Generuj listę lat (ostatnie 5 lat + bieżący)
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const months = [
    { value: 1, label: "Styczeń" },
    { value: 2, label: "Luty" },
    { value: 3, label: "Marzec" },
    { value: 4, label: "Kwiecień" },
    { value: 5, label: "Maj" },
    { value: 6, label: "Czerwiec" },
    { value: 7, label: "Lipiec" },
    { value: 8, label: "Sierpień" },
    { value: 9, label: "Wrzesień" },
    { value: 10, label: "Październik" },
    { value: 11, label: "Listopad" },
    { value: 12, label: "Grudzień" },
  ];

  // Uproszczony dashboard dla pracowników
  if (isEmployee) {
    const { data: gamificationSummary } = trpc.gamification.mySummary.useQuery(undefined, {
      staleTime: 60_000,
    });

    return (
      <div className="container mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-transparent p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <Badge variant="secondary" className="bg-primary text-white">
                  Pracownik
                </Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <span>👋</span>
                <span>Witaj, <span className="font-semibold text-foreground">{user.name || user.email}</span>!</span>
              </p>
            </div>
          </div>
        </div>

        {gamificationSummary && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Mój poziom i punkty
                </CardTitle>
                <CardDescription>Podstawowe podsumowanie grywalizacji.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Poziom</p>
                  <p className="text-2xl font-bold">{gamificationSummary.level}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Łączne punkty</p>
                  <p className="text-2xl font-bold text-primary">
                    {gamificationSummary.totalPoints}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Menu szybkiego startu dla pracowników */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/my-cv"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-blue-600" />
                Moje CV
              </CardTitle>
              <CardDescription>
                Zarządzaj swoim CV i danymi zawodowymi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Aktualizuj swoje umiejętności, doświadczenie i projekty
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/knowledge"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                Baza Wiedzy
              </CardTitle>
              <CardDescription>
                Przeglądaj i dodawaj informacje firmowe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Znajdź ważne informacje i dodaj swoje notatki
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Panel informacji z HRappka */}
        <HRappkaInfoPanel />

        {/* Informacja o dostępności */}
        <Card>
          <CardHeader>
            <CardTitle>Witaj w systemie Mirit Software house sp. z o.o.</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Jako pracownik masz dostęp do zarządzania swoim CV oraz przeglądania bazy wiedzy firmy.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
      <div className="container mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/10 via-white to-transparent p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              {user?.role && (
                <Badge 
                  variant={user.role === "admin" ? "default" : user.role === "employee" ? "secondary" : "outline"}
                  className={user.role === "admin" ? "bg-primary text-white" : user.role === "employee" ? "bg-primary/90 text-white" : ""}
                >
                  {user.role === "admin" ? "Administrator" : user.role === "employee" ? "Pracownik" : "Użytkownik"}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <span>👋</span>
              <span>Witaj, <span className="font-semibold text-foreground">{user.name || user.email}</span>!</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filtry miesiąca/roku */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Przełącznik dark mode */}
            {toggleTheme && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
                title={theme === "dark" ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Menu szybkiego startu */}
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2 whitespace-nowrap">
            <Zap className="h-4 w-4 text-primary" />
            Szybki start:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/time-reporting">
                <Clock className="w-3 h-3 mr-1.5" />
                Raport godzin
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/employees">
                <Plus className="w-3 h-3 mr-1.5" />
                Dodaj pracownika
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/projects">
                <Briefcase className="w-3 h-3 mr-1.5" />
                Projekty
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/clients">
                <Building2 className="w-3 h-3 mr-1.5" />
                Klienci
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/simulator">
                <Calculator className="w-3 h-3 mr-1.5" />
                Symulator zysku
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/fixed-costs">
                <Receipt className="w-3 h-3 mr-1.5" />
                Koszty stałe
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/ai-insights">
                <Sparkles className="w-3 h-3 mr-1.5" />
                AI Insights
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {kpi && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-green-50 via-green-50/50 to-white dark:from-green-950/20 dark:via-green-950/10 dark:to-transparent border-green-200/50 dark:border-green-800/50 hover:shadow-xl hover:shadow-green-500/10 dark:hover:shadow-green-500/20 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Całkowity przychód
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(kpi.totalRevenue)}
              </div>
              {prevMonthKpi && (
                <div className="flex items-center gap-1 mt-1">
                  {(() => {
                    const change = calculateChange(kpi.totalRevenue, prevMonthKpi.totalRevenue);
                    const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
                    const color = change > 0 ? 'text-green-600 dark:text-green-400' : change < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400';
                    return (
                      <>
                        <Icon className={`h-3 w-3 ${color}`} />
                        <span className={`text-xs ${color}`}>{formatChange(change)}</span>
                      </>
                    );
                  })()}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">miesięcznie</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${
            kpi.operatingProfit >= 0 
              ? 'from-blue-50 via-blue-50/50 to-white dark:from-blue-950/20 dark:via-blue-950/10 dark:to-transparent border-blue-200/50 dark:border-blue-800/50 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20' 
              : 'from-red-50 via-red-50/50 to-white dark:from-red-950/20 dark:via-red-950/10 dark:to-transparent border-red-200/50 dark:border-red-800/50 hover:shadow-xl hover:shadow-red-500/10 dark:hover:shadow-red-500/20'
          } transition-all duration-300 hover:-translate-y-1`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Całkowity dochód
              </CardTitle>
              {kpi.operatingProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                kpi.operatingProfit >= 0 
                  ? 'text-blue-700 dark:text-blue-400' 
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {formatCurrency(kpi.operatingProfit)}
              </div>
              {prevMonthKpi && (
                <div className="flex items-center gap-1 mt-1">
                  {(() => {
                    const change = calculateChange(kpi.operatingProfit, prevMonthKpi.operatingProfit);
                    // Trend jest pozytywny tylko jeśli zysk jest dodatni I marża jest dodatnia
                    const isPositiveTrend = kpi.operatingProfit >= 0 && kpi.operatingMargin >= 0 && change > 0;
                    const isNegativeTrend = kpi.operatingProfit < 0 || kpi.operatingMargin < 0 || change < 0;
                    const Icon = isPositiveTrend ? ArrowUp : isNegativeTrend ? ArrowDown : Minus;
                    const color = isPositiveTrend ? 'text-green-600 dark:text-green-400' : isNegativeTrend ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400';
                    return (
                      <>
                        <Icon className={`h-3 w-3 ${color}`} />
                        <span className={`text-xs ${color}`}>{formatChange(change)}</span>
                      </>
                    );
                  })()}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.operatingMargin >= 0 ? 'zysk' : 'strata'} • marża {kpi.operatingMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200/50 dark:border-orange-800/50 hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Koszty pracowników
              </CardTitle>
              <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {formatCurrency(kpi.employeeCosts)}
              </div>
              {prevMonthKpi && (
                <div className="flex items-center gap-1 mt-1">
                  {(() => {
                    const change = calculateChange(kpi.employeeCosts, prevMonthKpi.employeeCosts);
                    const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
                    const color = change > 0 ? 'text-red-600 dark:text-red-400' : change < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400';
                    return (
                      <>
                        <Icon className={`h-3 w-3 ${color}`} />
                        <span className={`text-xs ${color}`}>{formatChange(change)}</span>
                      </>
                    );
                  })()}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.employeeCount} pracowników
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Koszty stałe
              </CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {formatCurrency(kpi.fixedCosts)}
              </div>
              {prevMonthKpi && (
                <div className="flex items-center gap-1 mt-1">
                  {(() => {
                    const change = calculateChange(kpi.fixedCosts, prevMonthKpi.fixedCosts);
                    const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
                    const color = change > 0 ? 'text-red-600 dark:text-red-400' : change < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400';
                    return (
                      <>
                        <Icon className={`h-3 w-3 ${color}`} />
                        <span className={`text-xs ${color}`}>{formatChange(change)}</span>
                      </>
                    );
                  })()}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">miesięcznie</p>
            </CardContent>
          </Card>

          <Card className={`hover:shadow-lg transition-all duration-200 ${
            kpi.operatingProfit >= 0 
              ? 'border-blue-200/50 dark:border-blue-800/50' 
              : 'border-red-200/50 dark:border-red-800/50'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Zysk operacyjny
              </CardTitle>
              {kpi.operatingProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.operatingProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(kpi.operatingProfit)}
              </div>
              {prevMonthKpi && (
                <div className="flex items-center gap-1 mt-1">
                  {(() => {
                    const change = calculateChange(kpi.operatingProfit, prevMonthKpi.operatingProfit);
                    // Trend jest pozytywny tylko jeśli zysk jest dodatni I marża jest dodatnia
                    // Jeśli marża jest ujemna, to nawet wzrost zysku nie jest dobrym znakiem
                    const isPositiveTrend = kpi.operatingProfit >= 0 && kpi.operatingMargin >= 0 && change > 0;
                    const isNegativeTrend = kpi.operatingProfit < 0 || kpi.operatingMargin < 0 || change < 0;
                    const Icon = isPositiveTrend ? ArrowUp : isNegativeTrend ? ArrowDown : Minus;
                    const color = isPositiveTrend ? 'text-green-600 dark:text-green-400' : isNegativeTrend ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400';
                    return (
                      <>
                        <Icon className={`h-3 w-3 ${color}`} />
                        <span className={`text-xs ${color}`}>{formatChange(change)}</span>
                      </>
                    );
                  })()}
                </div>
              )}
              <p className={`text-xs mt-1 ${kpi.operatingMargin >= 0 ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'}`}>
                Marża: {kpi.operatingMargin.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {getMonthName(currentMonth)} {currentYear}
              </CardTitle>
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
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </CardContent>
          </Card>
          
          {/* Poprzedni miesiąc 1 */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getMonthName(prevMonth1.month)} {prevMonth1.year}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {accurateLoading1 ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : accurateResults1 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Przychód:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults1.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Koszty pracowników:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults1.employeeCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Koszty stałe:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults1.fixedCosts)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Zysk operacyjny:</span>
                      <span className={`text-lg font-bold ${
                        accurateResults1.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(accurateResults1.operatingProfit)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      Marża: {accurateResults1.operatingMargin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </CardContent>
          </Card>
          
          {/* Poprzedni miesiąc 2 */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getMonthName(prevMonth2.month)} {prevMonth2.year}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {accurateLoading2 ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : accurateResults2 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Przychód:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults2.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Koszty pracowników:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults2.employeeCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Koszty stałe:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults2.fixedCosts)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Zysk operacyjny:</span>
                      <span className={`text-lg font-bold ${
                        accurateResults2.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(accurateResults2.operatingProfit)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      Marża: {accurateResults2.operatingMargin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </CardContent>
          </Card>
          
          {/* Poprzedni miesiąc 3 */}
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getMonthName(prevMonth3.month)} {prevMonth3.year}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {accurateLoading3 ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : accurateResults3 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Przychód:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults3.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Koszty pracowników:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults3.employeeCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Koszty stałe:</span>
                    <span className="text-sm font-medium">{formatCurrency(accurateResults3.fixedCosts)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Zysk operacyjny:</span>
                      <span className={`text-lg font-bold ${
                        accurateResults3.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(accurateResults3.operatingProfit)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      Marża: {accurateResults3.operatingMargin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak danych</p>
              )}
            </CardContent>
          </Card>

          {/* Podsumowanie roczne */}
          <Card className="bg-gradient-to-br from-indigo-50 via-indigo-50/50 to-white dark:from-indigo-950/20 dark:via-indigo-950/10 dark:to-transparent border-indigo-200/50 dark:border-indigo-800/50 hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Podsumowanie roczne
              </CardTitle>
              <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              {(() => {
                // Oblicz sumy z dostępnych miesięcy
                const months = [
                  accurateResults,
                  accurateResults1,
                  accurateResults2,
                  accurateResults3,
                ].filter(Boolean);
                
                if (months.length === 0) {
                  return <p className="text-sm text-muted-foreground">Brak danych</p>;
                }
                
                const yearlyTotal = {
                  totalRevenue: months.reduce((sum, m) => sum + (m?.totalRevenue || 0), 0),
                  employeeCosts: months.reduce((sum, m) => sum + (m?.employeeCosts || 0), 0),
                  fixedCosts: months.reduce((sum, m) => sum + (m?.fixedCosts || 0), 0),
                  operatingProfit: 0, // Będzie obliczone poniżej
                };
                
                yearlyTotal.operatingProfit = yearlyTotal.totalRevenue - yearlyTotal.employeeCosts - yearlyTotal.fixedCosts;
                const yearlyMargin = yearlyTotal.totalRevenue > 0 
                  ? (yearlyTotal.operatingProfit / yearlyTotal.totalRevenue) * 100 
                  : 0;
                
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Przychód:</span>
                      <span className="text-sm font-medium">{formatCurrency(yearlyTotal.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Koszty pracowników:</span>
                      <span className="text-sm font-medium">{formatCurrency(yearlyTotal.employeeCosts)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Koszty stałe:</span>
                      <span className="text-sm font-medium">{formatCurrency(yearlyTotal.fixedCosts)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Zysk operacyjny:</span>
                        <span className={`text-lg font-bold ${
                          yearlyTotal.operatingProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(yearlyTotal.operatingProfit)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground text-right mt-1">
                        Marża: {yearlyMargin.toFixed(2)}% • {months.length} mies.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Najlepszy/Najgorszy miesiąc */}
          <Card className="hover:shadow-lg transition-all duration-200 border-amber-200/50 dark:border-amber-800/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Najlepszy / Najgorszy miesiąc
              </CardTitle>
              <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              {(() => {
                const months = [
                  { data: accurateResults, month: currentMonth, year: currentYear },
                  { data: accurateResults1, month: prevMonth1.month, year: prevMonth1.year },
                  { data: accurateResults2, month: prevMonth2.month, year: prevMonth2.year },
                  { data: accurateResults3, month: prevMonth3.month, year: prevMonth3.year },
                ].filter(m => m.data);
                
                if (months.length === 0) {
                  return <p className="text-sm text-muted-foreground">Brak danych</p>;
                }
                
                const monthsWithProfit = months.map(m => ({
                  ...m,
                  profit: m.data?.operatingProfit || 0,
                }));
                
                const bestMonth = monthsWithProfit.reduce((best, current) => 
                  current.profit > best.profit ? current : best
                );
                const worstMonth = monthsWithProfit.reduce((worst, current) => 
                  current.profit < worst.profit ? current : worst
                );
                
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Najlepszy:</span>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          {getMonthName(bestMonth.month)} {bestMonth.year}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(bestMonth.profit)}
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Najgorszy:</span>
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          {getMonthName(worstMonth.month)} {worstMonth.year}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400">
                        {formatCurrency(worstMonth.profit)}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Wskaźniki efektywności i trend */}
          <Card className="bg-gradient-to-br from-teal-50 via-teal-50/50 to-white dark:from-teal-950/20 dark:via-teal-950/10 dark:to-transparent border-teal-200/50 dark:border-teal-800/50 hover:shadow-xl hover:shadow-teal-500/10 dark:hover:shadow-teal-500/20 transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Wskaźniki efektywności
              </CardTitle>
              <Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </CardHeader>
            <CardContent>
              {(() => {
                const months = [
                  { data: accurateResults, month: currentMonth, year: currentYear },
                  { data: accurateResults1, month: prevMonth1.month, year: prevMonth1.year },
                  { data: accurateResults2, month: prevMonth2.month, year: prevMonth2.year },
                  { data: accurateResults3, month: prevMonth3.month, year: prevMonth3.year },
                ].filter(m => m.data);
                
                if (months.length < 2) {
                  return <p className="text-sm text-muted-foreground">Wymagane min. 2 miesiące danych</p>;
                }
                
                // Oblicz wskaźniki dla każdego miesiąca
                const monthsWithMetrics = months.map(m => {
                  const revenue = m.data?.totalRevenue || 0;
                  const costs = (m.data?.employeeCosts || 0) + (m.data?.fixedCosts || 0);
                  const profit = m.data?.operatingProfit || 0;
                  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
                  
                  // Szacuj godziny: przychód / średnia stawka (100 zł/h = 10000 groszy)
                  const avgRate = 10000;
                  const hours = revenue > 0 ? revenue / avgRate : 0;
                  const profitPerHour = hours > 0 ? profit / hours : 0;
                  const avgHourlyRate = hours > 0 ? revenue / hours : 0;
                  
                  return {
                    ...m,
                    revenue,
                    costs,
                    profit,
                    margin,
                    hours,
                    profitPerHour,
                    avgHourlyRate,
                  };
                });
                
                // Oblicz średnie wskaźniki
                const avgMetrics = {
                  margin: monthsWithMetrics.reduce((sum, m) => sum + m.margin, 0) / monthsWithMetrics.length,
                  profitPerHour: monthsWithMetrics.reduce((sum, m) => sum + m.profitPerHour, 0) / monthsWithMetrics.length,
                  avgHourlyRate: monthsWithMetrics.reduce((sum, m) => sum + m.avgHourlyRate, 0) / monthsWithMetrics.length,
                };
                
                // Oblicz trend (porównaj ostatni miesiąc z poprzednim)
                const current = monthsWithMetrics[0];
                const previous = monthsWithMetrics[1];
                
                const trend = {
                  profit: current.profit - previous.profit,
                  margin: current.margin - previous.margin,
                  profitPerHour: current.profitPerHour - previous.profitPerHour,
                };
                
                const isImproving = trend.profit > 0 && trend.margin > 0;
                
                return (
                  <div className="space-y-4">
                    {/* Średnie wskaźniki */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Średnia marża:</span>
                        <span className={`text-sm font-bold ${
                          avgMetrics.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {avgMetrics.margin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Zysk/godzinę:</span>
                        <span className={`text-sm font-bold ${
                          avgMetrics.profitPerHour >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(Math.round(avgMetrics.profitPerHour))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Średnia stawka/h:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(Math.round(avgMetrics.avgHourlyRate))}
                        </span>
                      </div>
                    </div>
                    
                    {/* Trend */}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">Trend (vs poprzedni miesiąc):</span>
                        {isImproving ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zysk:</span>
                          <span className={`font-medium ${
                            trend.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {trend.profit >= 0 ? '+' : ''}{formatCurrency(Math.round(trend.profit))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Marża:</span>
                          <span className={`font-medium ${
                            trend.margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {trend.margin >= 0 ? '+' : ''}{trend.margin.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zysk/godzinę:</span>
                          <span className={`font-medium ${
                            trend.profitPerHour >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {trend.profitPerHour >= 0 ? '+' : ''}{formatCurrency(Math.round(trend.profitPerHour))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

        </div>
      )}
      
      {/* Wykres trendów zysku/straty */}
      {profitTrends && profitTrends.length > 0 && (
        <Card className="hover:shadow-lg transition-all duration-200">
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
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "revenue" ? "Przychód" : name === "totalCosts" ? "Koszty całkowite" : "Zysk operacyjny"
                  ]}
                  labelFormatter={(label) => `Miesiąc: ${label}`}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
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

      {/* Wykres porównawczy */}
      {kpi && prevMonthKpi && (
        <Card>
          <CardHeader>
            <CardTitle>Porównanie miesięcy</CardTitle>
            <CardDescription>
              {getMonthName(currentMonth)} {currentYear} vs {getMonthName(prevMonth.month)} {prevMonth.year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Przychód', obecny: kpi.totalRevenue, poprzedni: prevMonthKpi.totalRevenue },
                { name: 'Koszty pracowników', obecny: kpi.employeeCosts, poprzedni: prevMonthKpi.employeeCosts },
                { name: 'Koszty stałe', obecny: kpi.fixedCosts, poprzedni: prevMonthKpi.fixedCosts },
                { name: 'Zysk operacyjny', obecny: kpi.operatingProfit, poprzedni: prevMonthKpi.operatingProfit },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 100).toFixed(0)} zł`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "obecny" ? `${getMonthName(currentMonth)} ${currentYear}` : `${getMonthName(prevMonth.month)} ${prevMonth.year}`
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                />
                <Legend />
                <Bar dataKey="obecny" fill="#3b82f6" name={`${getMonthName(currentMonth)} ${currentYear}`} />
                <Bar dataKey="poprzedni" fill="#94a3b8" name={`${getMonthName(prevMonth.month)} ${prevMonth.year}`} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Ranking pracowników i analiza projektów */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Top pracownicy - miesiąc */}
        <Card className="hover:shadow-lg transition-all duration-200 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Top pracownicy - {getMonthName(currentMonth)} {currentYear}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topEmployeesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : topEmployees && topEmployees.length > 0 ? (
              <div className="space-y-2">
                {topEmployees.map((emp, idx) => {
                  const maxProfit = topEmployees[0]?.profit || emp.profit;
                  const profitPercentage = (emp.profit / maxProfit) * 100;
                  const isTopThree = idx < 3;
                  const medalColors = [
                    { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
                    { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
                    { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
                  ];
                  
                  return (
                    <div 
                      key={emp.employeeId} 
                      className={`relative rounded-lg border transition-all overflow-hidden ${
                        isTopThree 
                          ? `${medalColors[idx].bg} ${medalColors[idx].border} border-2` 
                          : 'bg-card border hover:bg-accent/50'
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Pozycja z medalem dla top 3 */}
                          <div className="flex-shrink-0">
                            {isTopThree ? (
                              <div className={`w-10 h-10 rounded-full ${medalColors[idx].bg} ${medalColors[idx].border} border-2 flex items-center justify-center`}>
                                <Medal className={`h-5 w-5 ${medalColors[idx].text}`} />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Informacje o pracowniku */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold truncate ${isTopThree ? 'text-base' : 'text-sm'}`}>
                                  {emp.firstName} {emp.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{emp.position || '—'}</p>
                              </div>
                            </div>
                            
                            {/* Progress bar pokazujący względną wydajność */}
                            <div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    idx === 0 ? 'bg-yellow-500' : 
                                    idx === 1 ? 'bg-gray-400' : 
                                    idx === 2 ? 'bg-orange-500' : 
                                    'bg-primary'
                                  }`}
                                  style={{ width: `${profitPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Statystyki na białym tle - pełna szerokość */}
                      <div className="bg-white border-t border-border/50 px-3 py-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Zysk:</span>
                            <p className="font-semibold text-green-600">{formatCurrency(emp.profit)}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">Marża:</span>
                            <div className="flex items-center justify-end gap-1">
                              {emp.margin >= 0 ? (
                                <TrendingUpIcon className="h-3 w-3 text-green-600" />
                              ) : (
                                <TrendingDownIcon className="h-3 w-3 text-red-600" />
                              )}
                              <p className={`font-semibold ${emp.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.abs(emp.margin).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Brak danych</p>
            )}
          </CardContent>
        </Card>

        {/* Top pracownicy - rok */}
        <Card className="hover:shadow-lg transition-all duration-200 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Top pracownicy - {currentYear} (rocznie)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topEmployeesByYearLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : topEmployeesByYear && topEmployeesByYear.length > 0 ? (
              <div className="space-y-2">
                {topEmployeesByYear.map((emp, idx) => {
                  const maxProfit = topEmployeesByYear[0]?.profit || emp.profit;
                  const profitPercentage = (emp.profit / maxProfit) * 100;
                  const isTopThree = idx < 3;
                  const medalColors = [
                    { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
                    { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
                    { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
                  ];
                  
                  return (
                    <div 
                      key={emp.employeeId} 
                      className={`relative rounded-lg border transition-all overflow-hidden ${
                        isTopThree 
                          ? `${medalColors[idx].bg} ${medalColors[idx].border} border-2` 
                          : 'bg-card border hover:bg-accent/50'
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Pozycja z medalem dla top 3 */}
                          <div className="flex-shrink-0">
                            {isTopThree ? (
                              <div className={`w-10 h-10 rounded-full ${medalColors[idx].bg} ${medalColors[idx].border} border-2 flex items-center justify-center`}>
                                <Medal className={`h-5 w-5 ${medalColors[idx].text}`} />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Informacje o pracowniku */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold truncate ${isTopThree ? 'text-base' : 'text-sm'}`}>
                                  {emp.firstName} {emp.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{emp.position || '—'}</p>
                              </div>
                            </div>
                            
                            {/* Progress bar pokazujący względną wydajność */}
                            <div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    idx === 0 ? 'bg-yellow-500' : 
                                    idx === 1 ? 'bg-gray-400' : 
                                    idx === 2 ? 'bg-orange-500' : 
                                    'bg-primary'
                                  }`}
                                  style={{ width: `${profitPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Statystyki na białym tle - pełna szerokość */}
                      <div className="bg-white border-t border-border/50 px-3 py-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Zysk:</span>
                            <p className="font-semibold text-green-600">{formatCurrency(emp.profit)}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">Marża:</span>
                            <div className="flex items-center justify-end gap-1">
                              {emp.margin >= 0 ? (
                                <TrendingUpIcon className="h-3 w-3 text-green-600" />
                              ) : (
                                <TrendingDownIcon className="h-3 w-3 text-red-600" />
                              )}
                              <p className={`font-semibold ${emp.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.abs(emp.margin).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Brak danych</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pilne zadania i rentowność projektów */}
      <div className="grid gap-4 md:grid-cols-2">
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

        {/* Rentowność projektów */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Rentowność projektów - {getMonthName(currentMonth)} {currentYear}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {projectProfitabilityLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : projectProfitability && projectProfitability.length > 0 ? (
              <div className="space-y-3">
                {projectProfitability.slice(0, 5).map((project) => (
                  <div key={project.projectId} className="flex items-center justify-between p-3 rounded-lg hover:bg-primary/5 hover:shadow-md transition-all duration-200 border border-transparent hover:border-primary/20">
                    <div>
                      <p className="text-sm font-medium">{project.projectName}</p>
                      <p className="text-xs text-muted-foreground">{project.hours.toFixed(1)}h</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(project.profit)}
                      </p>
                      <p className="text-xs text-muted-foreground">{project.margin.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Brak danych</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
