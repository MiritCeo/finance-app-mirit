import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Calendar } from "lucide-react";

function calculateVacationPlanningPointsClient(plannedMonthsAhead: number): number {
  let points = 0;

  if (plannedMonthsAhead >= 3) {
    points += 20;
  } else if (plannedMonthsAhead >= 2) {
    points += 10;
  } else if (plannedMonthsAhead >= 1) {
    points += 5;
  }

  return points;
}

function diffMonthsFromToday(startDateStr: string): number {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  return Math.max(
    0,
    (start.getFullYear() - now.getFullYear()) * 12 + (start.getMonth() - now.getMonth())
  );
}

export default function VacationPlanning() {
  const { loading: authLoading, user } = useAuth();
  const hasEmployee = !!user?.employeeId;
  const now = new Date();
  const currentYear = now.getFullYear();

  const { data: summary } = trpc.vacations.mySummary.useQuery(
    { year: currentYear },
    { enabled: hasEmployee }
  );
  const { data: myVacations } = trpc.vacations.myVacations.useQuery(
    { year: currentYear },
    { enabled: hasEmployee }
  );

  const [vacationForm, setVacationForm] = useState(() => {
    const today = new Date();
    const startStr = today.toISOString().split("T")[0];
    return {
      startDate: startStr,
      endDate: startStr,
    };
  });

  const plannedMonthsAhead = useMemo(
    () => diffMonthsFromToday(vacationForm.startDate),
    [vacationForm.startDate]
  );

  const vacationPreviewPoints = useMemo(
    () => calculateVacationPlanningPointsClient(plannedMonthsAhead),
    [plannedMonthsAhead]
  );

  const planVacation = trpc.gamification.planVacation.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Wniosek urlopowy zapisany. Szacowana nagroda (po zatwierdzeniu): ${res.pointsPreview} pkt.`
      );
    },
    onError: (err) => {
      toast.error(err.message || "Nie udało się zapisać planu urlopu.");
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasEmployee) {
    return (
      <div className="container mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Planowanie urlopów</CardTitle>
            <CardDescription>
              Ta funkcja jest dostępna tylko dla kont powiązanych z pracownikiem.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Planowanie urlopów (punkty bez kar)</CardTitle>
          <CardDescription>
            Zobacz ile punktów otrzymasz za sposób zaplanowania urlopu. System nagradza
            wyprzedzenie, rozłożenie urlopu i unikanie konfliktów – bez kar.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {summary && (
              <div className="mb-4 rounded-md border p-3 text-sm flex flex-wrap gap-4">
                <div>
                  <span className="font-semibold">Rok:</span> {summary.year}
                </div>
                <div>
                  <span className="font-semibold">Dostępne dni:</span> {summary.totalDaysPerYear}
                </div>
                <div>
                  <span className="font-semibold">Wykorzystane:</span> {summary.usedDays}
                </div>
                <div>
                  <span className="font-semibold">Zaplanowane (oczekujące):</span>{" "}
                  {summary.pendingDays}
                </div>
                <div>
                  <span className="font-semibold">Pozostałe:</span> {summary.availableDays}
                </div>
              </div>
            )}

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              planVacation.mutate({
                startDate: new Date(vacationForm.startDate),
                endDate: new Date(vacationForm.endDate),
              });
            }}
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="vacation-start">Data rozpoczęcia</Label>
                <Input
                  id="vacation-start"
                  type="date"
                  value={vacationForm.startDate}
                  onChange={(e) =>
                    setVacationForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vacation-end">Data zakończenia</Label>
                <Input
                  id="vacation-end"
                  type="date"
                  value={vacationForm.endDate}
                  onChange={(e) =>
                    setVacationForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Konflikt terminu</Label>
                <p className="text-sm">
                  Poziom konfliktu jest wyliczany automatycznie na podstawie innych wniosków
                  urlopowych (pending + approved) w tym terminie – nie musisz go ustawiać ręcznie.
                </p>
                <p className="text-xs text-muted-foreground">
                  Punkty za planowanie przyznawane są za wyprzedzenie i niski konflikt – nie ma kar
                  za inne poziomy. System sprawdza faktyczne dane o urlopach innych osób (bez
                  pokazywania nazwisk).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Podsumowanie planu</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Planowane z wyprzedzeniem:{" "}
                  <span className="font-semibold">{plannedMonthsAhead} mies.</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Poziom konfliktu zostanie wyliczony po stronie serwera na podstawie innych
                  zatwierdzonych/oczekujących urlopów.
                </p>
              </div>

              <div className="rounded-md border p-4 space-y-3 bg-muted/40">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Szacowana nagroda (minimalna)</span>
                </div>
                <p className="text-3xl font-bold">{vacationPreviewPoints} pkt</p>
                <p className="text-xs text-muted-foreground">
                  To liczba punktów wyłącznie za wyprzedzenie. Dodatkowo możesz otrzymać jeszcze
                  +10&nbsp;pkt, jeśli system wykryje niski konflikt (mało innych osób na urlopie w
                  tym terminie). Ostateczna liczba punktów zostanie przyznana dopiero po
                  zatwierdzeniu urlopu przez właściciela / admina. Nie ma żadnych kar – najwyżej
                  nie dostaniesz dodatkowych punktów.
                </p>
                <Button
                  type="submit"
                  disabled={planVacation.isPending}
                  className="w-full mt-1"
                >
                  {planVacation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Zapisywanie planu...
                    </>
                  ) : (
                    "Zapisz plan urlopu i punkty"
                  )}
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-6 rounded-md border p-4 text-xs md:text-sm space-y-3 bg-muted/40">
            <div>
              <p className="font-semibold mb-1">Jak naliczane są punkty za planowanie urlopu?</p>
              <p className="text-muted-foreground">
                Punkty są tylko nagrodą za dobre planowanie i brak kolizji – nigdy karą. Dotyczy to
                również ustawowych 2 tygodni urlopu ciągiem.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-medium">1. Wyprzedzenie planowania</p>
                <div className="rounded-md border bg-background/60 p-2">
                  <div className="flex justify-between">
                    <span>3+ miesiące wcześniej</span>
                    <span className="font-semibold">+20 pkt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2 miesiące wcześniej</span>
                    <span className="font-semibold">+10 pkt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 miesiąc wcześniej</span>
                    <span className="font-semibold">+5 pkt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>&lt; 1 miesiąc</span>
                    <span className="font-semibold">0 pkt</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-medium">2. Konflikt terminów</p>
                <div className="rounded-md border bg-background/60 p-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Niski konflikt (mało osób na urlopie)</span>
                    <span className="font-semibold">+10 pkt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Średni / wysoki konflikt</span>
                    <span className="font-semibold">0 pkt</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Poziom konfliktu jest liczony automatycznie na podstawie innych wniosków –
                    system nie pokazuje nazwisk, tylko zagęszczenie urlopów.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-muted-foreground">
              <p>
                <span className="font-semibold">Przykład:</span> 10 dni (2 tygodnie) urlopu ciągiem,
                zaplanowane 3 miesiące wcześniej, w terminie z małym konfliktem:
              </p>
              <p>
                20 pkt (3+ miesiące wcześniej) + 10 pkt (niski konflikt) ={" "}
                <span className="font-semibold">30 pkt</span> po zatwierdzeniu urlopu.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {myVacations && myVacations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Moje wnioski urlopowe w tym roku</CardTitle>
            <CardDescription>Lista zaakceptowanych i oczekujących urlopów.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {myVacations.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between border rounded-md px-3 py-2"
              >
                <div>
                  <p className="font-medium">
                    {new Date(v.startDate).toISOString().slice(0, 10)} –{" "}
                    {new Date(v.endDate).toISOString().slice(0, 10)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dni: {v.daysCount} • Status: {v.status}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


