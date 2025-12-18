import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  MapPin,
  Clock,
  Target,
  Users,
} from "lucide-react";

export default function Gamification() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const hasEmployee = !!user?.employeeId;

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = trpc.gamification.mySummary.useQuery(undefined, {
    enabled: !authLoading && hasEmployee,
  });

  // Admin: award hours for month
  const [hoursYear, setHoursYear] = useState(() => new Date().getFullYear());
  const [hoursMonth, setHoursMonth] = useState(() => new Date().getMonth() + 1);
  const awardHours = trpc.gamification.awardHoursForMonth.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Przyznano ${res.totalPointsAwarded} pkt za godziny (${res.processedReports} raportów).`
      );
    },
    onError: (err) => {
      toast.error(err.message || "Nie udało się przyznać punktów za godziny.");
    },
  });

  const { data: quests } = trpc.gamification.listQuests.useQuery(undefined, {
    enabled: isAdmin,
  });
  const createQuest = trpc.gamification.createQuest.useMutation({
    onSuccess: () => {
      toast.success("Quest zapisany.");
      questUtils.gamification.listQuests.invalidate();
      setQuestForm({
        name: "",
        description: "",
        type: "individual",
        targetType: "hours",
        targetValue: "",
        rewardPoints: "",
      });
    },
    onError: (err) => {
      toast.error(err.message || "Nie udało się zapisać questa.");
    },
  });
  const questUtils = trpc.useUtils();

  const { data: teamGoals } = trpc.gamification.listTeamGoals.useQuery(undefined, {
    enabled: isAdmin,
  });
  const createTeamGoal = trpc.gamification.createTeamGoal.useMutation({
    onSuccess: () => {
      toast.success("Cel zespołowy zapisany.");
      gamUtils.gamification.listTeamGoals.invalidate();
      setTeamGoalForm({
        name: "",
        description: "",
        targetHours: "",
      });
    },
    onError: (err) => {
      toast.error(err.message || "Nie udało się zapisać celu zespołowego.");
    },
  });
  const gamUtils = trpc.useUtils();

  const [questForm, setQuestForm] = useState({
    name: "",
    description: "",
    type: "individual" as "individual" | "team" | "company",
    targetType: "hours" as "hours" | "knowledge_base",
    targetValue: "",
    rewardPoints: "",
  });

  const [teamGoalForm, setTeamGoalForm] = useState({
    name: "",
    description: "",
    targetHours: "",
  });

  if (authLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      {/* Podsumowanie punktów */}
      {summaryError && (
        <Card>
          <CardHeader>
            <CardTitle>Błąd grywalizacji</CardTitle>
            <CardDescription>
              Nie udało się załadować danych grywalizacji: {summaryError.message}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle>Grywalizacja</CardTitle>
            </div>
            <CardDescription>
              Podsumowanie punktów, poziomu oraz punktów zdobytych za obecność w biurze.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Poziom</p>
              <p className="text-3xl font-bold">{summary.level}</p>
              <p className="text-xs text-muted-foreground">
                Punkty w tym poziomie:{" "}
                <span className="font-semibold">{summary.pointsInCurrentLevel}</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Łączne punkty</p>
              <p className="text-3xl font-bold">{summary.totalPoints}</p>
              <p className="text-xs text-muted-foreground">
                Do następnego poziomu:{" "}
                <span className="font-semibold">
                  {Math.max(0, summary.nextLevelThreshold - summary.totalPoints)}
                </span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Punkty za obecność w biurze
              </p>
              <p className="text-3xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                {summary.officePresence.totalPoints}
              </p>
              <p className="text-xs text-muted-foreground">
                Zaliczone dni w biurze:{" "}
                <span className="font-semibold">
                  {summary.officePresence.qualifiedDays}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Panel admina */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Punkty za godziny */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Punkty za godziny (miesięczne raporty)
              </CardTitle>
              <CardDescription>
                Uruchomienie przeliczenia punktów za godziny na podstawie miesięcznych raportów
                (`monthlyEmployeeReports`) wg modelu V3.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  awardHours.mutate({ year: hoursYear, month: hoursMonth });
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="hours-year">Rok</Label>
                  <Input
                    id="hours-year"
                    type="number"
                    value={hoursYear}
                    onChange={(e) => setHoursYear(Number(e.target.value) || new Date().getFullYear())}
                    className="w-28"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hours-month">Miesiąc</Label>
                  <Select
                    value={String(hoursMonth)}
                    onValueChange={(value) => setHoursMonth(Number(value))}
                  >
                    <SelectTrigger id="hours-month" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Styczeń</SelectItem>
                      <SelectItem value="2">Luty</SelectItem>
                      <SelectItem value="3">Marzec</SelectItem>
                      <SelectItem value="4">Kwiecień</SelectItem>
                      <SelectItem value="5">Maj</SelectItem>
                      <SelectItem value="6">Czerwiec</SelectItem>
                      <SelectItem value="7">Lipiec</SelectItem>
                      <SelectItem value="8">Sierpień</SelectItem>
                      <SelectItem value="9">Wrzesień</SelectItem>
                      <SelectItem value="10">Październik</SelectItem>
                      <SelectItem value="11">Listopad</SelectItem>
                      <SelectItem value="12">Grudzień</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={awardHours.isPending}>
                  {awardHours.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Przeliczanie...
                    </>
                  ) : (
                    "Przelicz i przyznaj punkty"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Questy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Questy
              </CardTitle>
              <CardDescription>Prosta lista questów oraz formularz dodawania nowych.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createQuest.mutate({
                    name: questForm.name,
                    description: questForm.description || undefined,
                    type: questForm.type,
                    targetType: questForm.targetType,
                    targetValue: Number(questForm.targetValue) || 0,
                    rewardPoints: Number(questForm.rewardPoints) || 0,
                  });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="quest-name">Nazwa</Label>
                  <Input
                    id="quest-name"
                    value={questForm.name}
                    onChange={(e) =>
                      setQuestForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select
                    value={questForm.type}
                    onValueChange={(value) =>
                      setQuestForm((prev) => ({
                        ...prev,
                        type: value as "individual" | "team" | "company",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Indywidualny</SelectItem>
                      <SelectItem value="team">Zespołowy</SelectItem>
                      <SelectItem value="company">Firmowy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rodzaj celu</Label>
                  <Select
                    value={questForm.targetType}
                    onValueChange={(value) =>
                      setQuestForm((prev) => ({
                        ...prev,
                        targetType: value as "hours" | "knowledge_base",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Godziny</SelectItem>
                      <SelectItem value="knowledge_base">Baza wiedzy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quest-target">Wartość celu</Label>
                  <Input
                    id="quest-target"
                    type="number"
                    min={1}
                    value={questForm.targetValue}
                    onChange={(e) =>
                      setQuestForm((prev) => ({
                        ...prev,
                        targetValue: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quest-reward">Nagroda (pkt)</Label>
                  <Input
                    id="quest-reward"
                    type="number"
                    min={0}
                    value={questForm.rewardPoints}
                    onChange={(e) =>
                      setQuestForm((prev) => ({
                        ...prev,
                        rewardPoints: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="quest-desc">Opis (opcjonalnie)</Label>
                  <Input
                    id="quest-desc"
                    value={questForm.description}
                    onChange={(e) =>
                      setQuestForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Krótki opis zadania"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={createQuest.isPending}>
                    {createQuest.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Zapisywanie...
                      </>
                    ) : (
                      "Dodaj quest"
                    )}
                  </Button>
                </div>
              </form>

              {quests && quests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Istniejące questy
                  </p>
                  <div className="space-y-1 text-sm">
                    {quests.map((q) => (
                      <div
                        key={q.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-md px-3 py-2"
                      >
                        <div>
                          <p className="font-medium">{q.name}</p>
                          {q.description && (
                            <p className="text-xs text-muted-foreground">{q.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs mt-2 md:mt-0">
                          <span className="px-2 py-1 rounded-full bg-muted">
                            Typ: {q.type}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-muted">
                            Cel: {q.targetType} = {q.targetValue}
                          </span>
                          <span className="px-2 py-1 rounded-full bg-muted">
                            Nagroda: {q.rewardPoints} pkt
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cele zespołowe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Cele zespołowe (godziny)
              </CardTitle>
              <CardDescription>
                Proste cele oparte na godzinach zespołu lub całej firmy. Docelowo można będzie je
                łączyć z nagrodami.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createTeamGoal.mutate({
                    name: teamGoalForm.name,
                    description: teamGoalForm.description || undefined,
                    targetHours: Number(teamGoalForm.targetHours) || 0,
                  });
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="teamgoal-name">Nazwa</Label>
                  <Input
                    id="teamgoal-name"
                    value={teamGoalForm.name}
                    onChange={(e) =>
                      setTeamGoalForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamgoal-target">Cel godzinowy</Label>
                  <Input
                    id="teamgoal-target"
                    type="number"
                    min={1}
                    value={teamGoalForm.targetHours}
                    onChange={(e) =>
                      setTeamGoalForm((prev) => ({
                        ...prev,
                        targetHours: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="teamgoal-desc">Opis (opcjonalnie)</Label>
                  <Input
                    id="teamgoal-desc"
                    value={teamGoalForm.description}
                    onChange={(e) =>
                      setTeamGoalForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Krótki opis celu zespołowego"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={createTeamGoal.isPending}>
                    {createTeamGoal.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Zapisywanie...
                      </>
                    ) : (
                      "Dodaj cel zespołowy"
                    )}
                  </Button>
                </div>
              </form>

              {teamGoals && teamGoals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Aktywne / planowane cele zespołowe
                  </p>
                  <div className="space-y-1 text-sm">
                    {teamGoals.map((g) => (
                      <div
                        key={g.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-md px-3 py-2"
                      >
                        <div>
                          <p className="font-medium">{g.name}</p>
                          {g.description && (
                            <p className="text-xs text-muted-foreground">{g.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs mt-2 md:mt-0">
                          <span className="px-2 py-1 rounded-full bg-muted">
                            Cel: {g.targetHours} h
                          </span>
                          <span className="px-2 py-1 rounded-full bg-muted">
                            Postęp: {g.currentHours} h
                          </span>
                          <span className="px-2 py-1 rounded-full bg-muted">
                            Status: {g.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

