# Rozwiązywanie problemów z AI Insights

## Problem: Nie widzę zmian w menu

### Rozwiązanie 1: Restart serwera deweloperskiego

1. **Zatrzymaj serwer** (Ctrl+C w terminalu gdzie działa `pnpm run dev`)
2. **Uruchom ponownie**:
   ```bash
   pnpm run dev
   ```

### Rozwiązanie 2: Wyczyść cache przeglądarki

1. **Chrome/Edge**: 
   - Naciśnij `Ctrl + Shift + Delete`
   - Wybierz "Obrazy i pliki w pamięci podręcznej"
   - Kliknij "Wyczyść dane"

2. **Lub użyj trybu incognito**:
   - Otwórz nowe okno incognito
   - Przejdź do aplikacji

3. **Lub wymuś odświeżenie**:
   - `Ctrl + F5` (Windows)
   - `Cmd + Shift + R` (Mac)

### Rozwiązanie 3: Sprawdź konsolę przeglądarki

1. Otwórz DevTools (F12)
2. Przejdź do zakładki "Console"
3. Sprawdź czy są błędy (czerwone komunikaty)
4. Sprawdź zakładkę "Network" - czy pliki się ładują

### Rozwiązanie 4: Sprawdź czy pliki istnieją

Upewnij się, że te pliki istnieją:
- ✅ `client/src/pages/AIFinancialInsights.tsx`
- ✅ `client/src/App.tsx` (z importem AIFinancialInsights)
- ✅ `client/src/components/DashboardLayout.tsx` (z menuItems zawierającym "AI Insights")

### Rozwiązanie 5: Sprawdź terminal serwera

W terminalu gdzie działa `pnpm run dev` sprawdź:
- Czy są błędy kompilacji?
- Czy widzisz komunikaty o hot-reload?
- Czy serwer się uruchomił poprawnie?

### Rozwiązanie 6: Sprawdź czy routing działa

Spróbuj przejść bezpośrednio do:
```
http://localhost:3000/ai-insights
```

Jeśli strona się ładuje, problem jest tylko z menu. Jeśli nie, sprawdź:
- Czy serwer działa na porcie 3000?
- Czy są błędy w konsoli przeglądarki?

### Rozwiązanie 7: Sprawdź importy

Upewnij się, że w `DashboardLayout.tsx` jest:
```typescript
import { Sparkles } from "lucide-react";
```

I w `App.tsx`:
```typescript
import AIFinancialInsights from "./pages/AIFinancialInsights";
```

### Rozwiązanie 8: Pełny restart

1. Zatrzymaj serwer (Ctrl+C)
2. Usuń folder `.vite` (jeśli istnieje):
   ```bash
   rm -rf .vite
   # lub w Windows:
   rmdir /s .vite
   ```
3. Uruchom ponownie:
   ```bash
   pnpm run dev
   ```

### Rozwiązanie 9: Sprawdź czy endpointy działają

Otwórz DevTools (F12) → Network → przejdź do `/ai-insights` i sprawdź:
- Czy są requesty do `/api/trpc/aiFinancial.*`?
- Czy zwracają dane czy błędy?

### Rozwiązanie 10: Sprawdź logi serwera

W terminalu serwera sprawdź czy widzisz:
- Błędy związane z `aiFinancial`
- Błędy związane z `AIFinancialInsights`
- Błędy związane z routingiem

---

## Jeśli nadal nie działa:

1. **Sprawdź wersję Node.js**:
   ```bash
   node --version
   ```
   Powinna być >= 18

2. **Zainstaluj zależności ponownie**:
   ```bash
   pnpm install
   ```

3. **Sprawdź czy plik został zapisany**:
   ```bash
   # Windows PowerShell
   Get-Content "client\src\components\DashboardLayout.tsx" | Select-String "AI Insights"
   ```

4. **Sprawdź czy nie ma konfliktów w git**:
   ```bash
   git status
   ```

---

## Oczekiwany rezultat:

Po poprawnym uruchomieniu powinieneś widzieć w menu bocznym (sidebar):
- ✅ Dashboard
- ✅ **AI Insights** ← NOWA POZYCJA (z ikoną Sparkles)
- ✅ Zadania
- ✅ Baza Wiedzy
- ✅ Pracownicy
- ✅ Projekty
- ✅ Klienci
- ✅ Raportowanie godzin
- ✅ Koszty stałe

Po kliknięciu w "AI Insights" powinieneś zobaczyć stronę z:
- Analizą rentowności projektów
- Analizą efektywności pracowników
- Przyciskiem "Chat z AI"

