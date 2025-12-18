import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MapPin, Clock, CheckCircle2, Info, Sparkles, Settings, Trash2, Edit2, Plus } from "lucide-react";
import { toast } from "sonner";

function formatTime(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function OfficePresence() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const hasEmployee = !!user?.employeeId;

  const { data: status, isLoading, error } = trpc.officePresence.status.useQuery(undefined, {
    refetchInterval: 30_000,
    enabled: !authLoading && !isAdmin && hasEmployee,
  });
  const { data: gamification } = trpc.gamification.mySummary.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !authLoading && !isAdmin && hasEmployee,
  });
  const utils = trpc.useUtils();

  // Admin: office locations management
  const { data: locations, isLoading: locationsLoading } = trpc.officePresence.listLocations.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const { data: settings } = trpc.officePresence.getSettings.useQuery(undefined, {
    enabled: isAdmin,
  });

  const [locationForm, setLocationForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radiusMeters: "200",
    isActive: true,
  });
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);

  const createLocation = trpc.officePresence.createLocation.useMutation({
    onSuccess: () => {
      toast.success("Lokalizacja dodana.");
      utils.officePresence.listLocations.invalidate();
      setLocationForm({
        name: "",
        latitude: "",
        longitude: "",
        radiusMeters: "200",
        isActive: true,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Nie udało się dodać lokalizacji.");
    },
  });

  const updateLocation = trpc.officePresence.updateLocation.useMutation({
    onSuccess: () => {
      toast.success("Lokalizacja zaktualizowana.");
      utils.officePresence.listLocations.invalidate();
      setEditingLocationId(null);
      setLocationForm({
        name: "",
        latitude: "",
        longitude: "",
        radiusMeters: "200",
        isActive: true,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Nie udało się zaktualizować lokalizacji.");
    },
  });

  const deleteLocation = trpc.officePresence.deleteLocation.useMutation({
    onSuccess: () => {
      toast.success("Lokalizacja usunięta.");
      utils.officePresence.listLocations.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Nie udało się usunąć lokalizacji.");
    },
  });

  const updateSettings = trpc.officePresence.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Ustawienia zaktualizowane.");
      utils.officePresence.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Nie udało się zaktualizować ustawień.");
    },
  });

  const [settingsForm, setSettingsForm] = useState({
    minSessionMinutes: 240,
    dayPoints: 10,
    streakLengthDays: 14,
    streakPoints: 100,
  });

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        minSessionMinutes: settings.minSessionMinutes,
        dayPoints: settings.dayPoints,
        streakLengthDays: settings.streakLengthDays,
        streakPoints: settings.streakPoints,
      });
    }
  }, [settings]);

  const handleEditLocation = (loc: any) => {
    setEditingLocationId(loc.id);
    setLocationForm({
      name: loc.name,
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      radiusMeters: loc.radiusMeters.toString(),
      isActive: loc.isActive,
    });
  };

  const handleCancelEdit = () => {
    setEditingLocationId(null);
    setLocationForm({
      name: "",
      latitude: "",
      longitude: "",
      radiusMeters: "200",
      isActive: true,
    });
  };

  const [geoSupported, setGeoSupported] = useState<boolean | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [localExtraSeconds, setLocalExtraSeconds] = useState(0);

  const startSession = trpc.officePresence.startSession.useMutation({
    onSuccess: (data) => {
      if (!data.isFromOffice) {
        toast.error("Wygląda na to, że nie jesteś w biurze (poza wyznaczonym obszarem).");
      } else {
        toast.success("Sesja biurowa rozpoczęta. Liczymy czas do nagrody.");
      }
      setLocalExtraSeconds(0);
      utils.officePresence.status.invalidate();
    },
    onError: (err) => {
      console.error("[OfficePresence] startSession error", err);
      toast.error(err.message || "Nie udało się rozpocząć sesji biurowej.");
    },
  });

  const endSession = trpc.officePresence.endSession.useMutation({
    onSuccess: (data) => {
      setLocalExtraSeconds(0);
      if (data.todayQualified) {
        const base = data.todayPointsAwarded ?? 0;
        const streak = data.todayStreakPointsAwarded ?? 0;
        const total = base + streak;
        toast.success(
          total > 0
            ? `Sesja zakończona. Zdobyłeś ${total} pkt (dzień: ${base}${streak > 0 ? `, streak: ${streak}` : ""}).`
            : "Sesja zakończona. Tym razem bez nagrody (za krótki czas)."
        );
      } else {
        toast.info("Sesja zakończona. Jeszcze bez nagrody (za krótki czas w biurze).");
      }
      utils.officePresence.status.invalidate();
    },
    onError: (err) => {
      console.error("[OfficePresence] endSession error", err);
      toast.error(err.message || "Nie udało się zakończyć sesji biurowej.");
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      setGeoSupported(true);
    } else {
      setGeoSupported(false);
    }
  }, []);

  // Lokalny timer oparty na czasie z serwera + sekundach po stronie klienta
  useEffect(() => {
    if (!status?.hasActiveSession) {
      setLocalExtraSeconds(0);
      return;
    }

    setLocalExtraSeconds(0);
    const interval = setInterval(() => {
      setLocalExtraSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status?.hasActiveSession, status?.elapsedMinutes]);

  const handleStart = () => {
    if (!geoSupported) {
      toast.error("Twoja przeglądarka nie obsługuje geolokalizacji lub jest ona wyłączona.");
      return;
    }
    if (requestingLocation) return;

    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRequestingLocation(false);
        startSession.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        console.error("[OfficePresence] geolocation error", err);
        setRequestingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Aby korzystać z punktów za biuro, udziel zgody na lokalizację.");
        } else {
          toast.error("Nie udało się pobrać lokalizacji.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      }
    );
  };

  const handleEnd = () => {
    endSession.mutate();
  };

  // For employees: check loading and error states
  if (!isAdmin && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Błąd</AlertTitle>
          <AlertDescription>
            Nie udało się załadować statusu obecności w biurze: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // For employees: calculate session data
  const minMinutes = status?.minSessionMinutes ?? 240;
  const minSeconds = minMinutes * 60;
  const baseSeconds = (status?.elapsedMinutes ?? 0) * 60;
  const totalElapsed = baseSeconds + (status?.hasActiveSession ? localExtraSeconds : 0);
  const remainingSeconds = Math.max(0, minSeconds - totalElapsed);

  const hasActiveSession = status?.hasActiveSession;
  const qualifiedToday = status?.todayQualified;
  const basePoints = status?.todayPointsAwarded ?? 0;
  const streakPoints = status?.todayStreakPointsAwarded ?? 0;

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      {/* Employee View: Office Presence Tracking */}
      {!isAdmin && (
        <>
          {gamification && (
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Twoje punkty grywalizacji</CardTitle>
                </div>
                <CardDescription>
                  Podsumowanie poziomu i punktów, w tym zdobytych za obecność w biurze.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Poziom</p>
                  <p className="text-2xl font-bold">{gamification.level}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Łączne punkty</p>
                  <p className="text-2xl font-bold">{gamification.totalPoints}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Punkty z obecności
                  </p>
                  <p className="text-2xl font-bold">{gamification.officePresence.totalPoints}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <CardTitle>Obecność w biurze</CardTitle>
              </div>
              <CardDescription>
                Zbieraj punkty za realną obecność w biurze. System sprawdza lokalizację oraz czas między
                rozpoczęciem a zakończeniem sesji.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Czas wymagany do nagrody</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {Math.floor(minMinutes / 60)}h {minMinutes % 60 !== 0 ? `${minMinutes % 60}m` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ustawiane przez administratora (minimalny czas obecności w biurze w ciągu dnia).
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Dzisiejsza nagroda</span>
                  </div>
                  {qualifiedToday ? (
                    <div>
                      <p className="text-2xl font-semibold text-green-700">
                        {basePoints + streakPoints} pkt
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dzień: {basePoints} pkt
                        {streakPoints > 0 ? `, streak: ${streakPoints} pkt` : null}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Brak zaliczonej nagrody za dzisiaj – rozpocznij i zakończ sesję w biurze.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Timer sesji biurowej</span>
                  </div>
                  <p className="text-3xl font-mono">
                    {hasActiveSession ? formatTime(totalElapsed) : "00:00:00"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pozostało do nagrody:{" "}
                    <span className="font-semibold">
                      {remainingSeconds > 0 ? formatTime(remainingSeconds) : "czas spełniony"}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleStart}
                    disabled={hasActiveSession || requestingLocation || startSession.isLoading}
                  >
                    {requestingLocation || startSession.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sprawdzanie lokalizacji...
                      </>
                    ) : hasActiveSession ? (
                      "Sesja aktywna"
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Start dnia w biurze
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEnd}
                    disabled={!hasActiveSession || endSession.isLoading}
                  >
                    {endSession.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Kończenie...
                      </>
                    ) : (
                      "Zakończ dzień"
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertTitle>Jak to działa?</AlertTitle>
                <AlertDescription>
                  1) Będąc w biurze, kliknij <strong>„Start dnia w biurze”</strong> i pozwól na dostęp do
                  lokalizacji. 2) Pracuj normalnie – system mierzy czas między startem a zakończeniem
                  sesji. 3) Na koniec kliknij <strong>„Zakończ dzień”</strong>. Jeśli minął wymagany czas,
                  sesja zostanie zaliczona i przyznane zostaną punkty.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}

      {/* Admin Panel: Office Locations Management */}
      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <CardTitle>Zarządzanie lokalizacjami biura (Admin)</CardTitle>
              </div>
              <CardDescription>
                Konfiguruj lokalizacje biur, w których pracownicy mogą zdobywać punkty za obecność.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formularz dodawania/edycji lokalizacji */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">
                  {editingLocationId ? "Edytuj lokalizację" : "Dodaj nową lokalizację"}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="loc-name">Nazwa biura</Label>
                    <Input
                      id="loc-name"
                      value={locationForm.name}
                      onChange={(e) =>
                        setLocationForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="np. Biuro Warszawa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-radius">Promień (metry)</Label>
                    <Input
                      id="loc-radius"
                      type="number"
                      min="10"
                      max="10000"
                      value={locationForm.radiusMeters}
                      onChange={(e) =>
                        setLocationForm((prev) => ({ ...prev, radiusMeters: e.target.value }))
                      }
                      placeholder="200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-lat">Szerokość geograficzna</Label>
                    <Input
                      id="loc-lat"
                      type="number"
                      step="0.000001"
                      value={locationForm.latitude}
                      onChange={(e) =>
                        setLocationForm((prev) => ({ ...prev, latitude: e.target.value }))
                      }
                      placeholder="52.229675"
                    />
                    <p className="text-xs text-muted-foreground">
                      Możesz znaleźć współrzędne na{" "}
                      <a
                        href="https://www.google.com/maps"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Google Maps
                      </a>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loc-lng">Długość geograficzna</Label>
                    <Input
                      id="loc-lng"
                      type="number"
                      step="0.000001"
                      value={locationForm.longitude}
                      onChange={(e) =>
                        setLocationForm((prev) => ({ ...prev, longitude: e.target.value }))
                      }
                      placeholder="21.012230"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="loc-active"
                    checked={locationForm.isActive}
                    onChange={(e) =>
                      setLocationForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="rounded"
                  />
                  <Label htmlFor="loc-active" className="cursor-pointer">
                    Aktywna (tylko aktywne lokalizacje są sprawdzane)
                  </Label>
                </div>
                <div className="flex gap-2">
                  {editingLocationId ? (
                    <>
                      <Button
                        onClick={() => {
                          updateLocation.mutate({
                            id: editingLocationId,
                            name: locationForm.name,
                            latitude: parseFloat(locationForm.latitude),
                            longitude: parseFloat(locationForm.longitude),
                            radiusMeters: parseInt(locationForm.radiusMeters),
                            isActive: locationForm.isActive,
                          });
                        }}
                        disabled={updateLocation.isPending || !locationForm.name || !locationForm.latitude || !locationForm.longitude}
                      >
                        {updateLocation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Zapisywanie...
                          </>
                        ) : (
                          <>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Zapisz zmiany
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        Anuluj
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        createLocation.mutate({
                          name: locationForm.name,
                          latitude: parseFloat(locationForm.latitude),
                          longitude: parseFloat(locationForm.longitude),
                          radiusMeters: parseInt(locationForm.radiusMeters),
                          isActive: locationForm.isActive,
                        });
                      }}
                      disabled={createLocation.isPending || !locationForm.name || !locationForm.latitude || !locationForm.longitude}
                    >
                      {createLocation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Dodawanie...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Dodaj lokalizację
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Lista lokalizacji */}
              {locationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : locations && locations.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-semibold">Lista lokalizacji</h3>
                  {locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{loc.name}</span>
                          {loc.isActive ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Aktywna
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                              Nieaktywna
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {loc.latitude}, {loc.longitude} • Promień: {loc.radiusMeters}m
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLocation(loc)}
                          disabled={editingLocationId === loc.id}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Czy na pewno chcesz usunąć lokalizację "${loc.name}"?`)) {
                              deleteLocation.mutate({ id: loc.id });
                            }
                          }}
                          disabled={deleteLocation.isPending}
                        >
                          {deleteLocation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Brak zdefiniowanych lokalizacji. Dodaj pierwszą lokalizację powyżej.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Admin Panel: Office Presence Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <CardTitle>Ustawienia obecności w biurze (Admin)</CardTitle>
              </div>
              <CardDescription>
                Konfiguruj progi czasowe i nagrody za obecność w biurze.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min-session">Minimalny czas sesji (minuty)</Label>
                  <Input
                    id="min-session"
                    type="number"
                    min="30"
                    max="720"
                    value={settingsForm.minSessionMinutes}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        minSessionMinutes: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimalny czas obecności w biurze, aby otrzymać nagrodę dzienną.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="day-points">Punkty za dzień</Label>
                  <Input
                    id="day-points"
                    type="number"
                    min="0"
                    max="10000"
                    value={settingsForm.dayPoints}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        dayPoints: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Liczba punktów przyznawanych za każdy zaliczony dzień w biurze.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="streak-days">Długość serii (dni)</Label>
                  <Input
                    id="streak-days"
                    type="number"
                    min="1"
                    max="365"
                    value={settingsForm.streakLengthDays}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        streakLengthDays: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Liczba kolejnych dni w biurze wymagana do otrzymania bonusu za serię.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="streak-points">Punkty za serię</Label>
                  <Input
                    id="streak-points"
                    type="number"
                    min="0"
                    max="100000"
                    value={settingsForm.streakPoints}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        streakPoints: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus punktów przyznawany po osiągnięciu serii kolejnych dni.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  updateSettings.mutate(settingsForm);
                }}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  "Zapisz ustawienia"
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


