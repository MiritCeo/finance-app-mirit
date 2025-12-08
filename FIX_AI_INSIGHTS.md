# Naprawa problemów z AI Insights

## Problem 1: Nie widzę pozycji w menu

### Rozwiązanie:
1. **Sprawdź czy plik został zapisany**:
   - Otwórz `client/src/components/DashboardLayout.tsx`
   - Sprawdź czy w linii 33 jest: `{ icon: Sparkles, label: "AI Insights", path: "/ai-insights", color: "text-purple-600" },`

2. **Wymuś odświeżenie przeglądarki**:
   - `Ctrl + Shift + R` (Windows)
   - `Cmd + Shift + R` (Mac)
   - Lub otwórz w trybie incognito

3. **Sprawdź konsolę przeglądarki** (F12):
   - Czy są błędy JavaScript?
   - Czy pliki się ładują?

## Problem 2: Błędy AI - "Nie udało się przeprowadzić analizy AI"

### Przyczyna:
Brak klucza API lub błąd w wywołaniu LLM.

### Rozwiązanie:

1. **Sprawdź czy masz klucz API w `.env`**:
   ```env
   BUILT_IN_FORGE_API_KEY=twój_klucz_tutaj
   ```

2. **Sprawdź logi serwera**:
   - W terminalu gdzie działa `pnpm run dev` powinieneś widzieć błędy
   - Szukaj komunikatów typu: `[AI] Error analyzing projects:`

3. **Sprawdź czy klucz jest poprawny**:
   - Klucz powinien być ustawiony jako `BUILT_IN_FORGE_API_KEY`
   - Nie `OPENAI_API_KEY` (to jest inny klucz)

4. **Sprawdź konsolę przeglądarki**:
   - Otwórz DevTools (F12) → Network
   - Przejdź do `/ai-insights`
   - Sprawdź requesty do `/api/trpc/aiFinancial.*`
   - Kliknij na request i sprawdź odpowiedź (Response)

## Problem 3: Chat AI zwraca błąd

### Rozwiązanie:
1. Sprawdź czy `BUILT_IN_FORGE_API_KEY` jest ustawiony
2. Sprawdź logi serwera - powinieneś widzieć dokładny błąd
3. Sprawdź konsolę przeglądarki - może być więcej informacji

## Sprawdzanie czy wszystko działa:

1. **Sprawdź terminal serwera**:
   ```bash
   # Powinieneś widzieć logi typu:
   [AI] Raw response: {...}
   # lub błędy:
   [AI] Error analyzing projects: ...
   ```

2. **Sprawdź konsolę przeglądarki**:
   - Otwórz DevTools (F12)
   - Przejdź do zakładki "Console"
   - Sprawdź czy są błędy

3. **Sprawdź Network**:
   - DevTools → Network
   - Przejdź do `/ai-insights`
   - Sprawdź requesty do `/api/trpc/aiFinancial.*`
   - Kliknij na request i sprawdź Response

## Jeśli nadal nie działa:

1. **Sprawdź czy `.env` jest w katalogu głównym projektu** (nie w `client/` ani `server/`)

2. **Sprawdź czy serwer został zrestartowany** po dodaniu klucza API:
   ```bash
   # Zatrzymaj serwer (Ctrl+C)
   # Uruchom ponownie:
   pnpm run dev
   ```

3. **Sprawdź format klucza API**:
   - Klucz nie powinien mieć cudzysłowów
   - Klucz nie powinien mieć spacji na początku/końcu
   - Przykład: `BUILT_IN_FORGE_API_KEY=sk-1234567890abcdef`

4. **Sprawdź czy endpointy są dostępne**:
   - Otwórz w przeglądarce: `http://localhost:3000/api/trpc/aiFinancial.analyzeProjects`
   - Powinieneś zobaczyć odpowiedź (może być błąd, ale endpoint powinien działać)

