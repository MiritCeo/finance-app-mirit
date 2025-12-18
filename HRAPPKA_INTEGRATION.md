# Integracja z HRappka API

Dokumentacja integracji aplikacji z systemem HRappka w celu synchronizacji danych o godzinach pracy pracowników.

---

## 📋 Spis treści

1. [Wprowadzenie](#wprowadzenie)
2. [Konfiguracja](#konfiguracja)
3. [Użycie API](#użycie-api)
4. [Endpointy tRPC](#endpointy-trpc)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Wprowadzenie

Integracja z HRappka API umożliwia:
- Pobieranie listy pracowników z systemu HRappka
- Synchronizację danych o godzinach pracy
- Automatyczne importowanie raportów godzinowych

**Dokumentacja API HRappka**: https://hrappka.docs.apiary.io/#reference/0/authentication/auth

---

## ⚙️ Konfiguracja

### 1. Zmienne środowiskowe

Dodaj do pliku `.env` wymagane zmienne do autentykacji:

#### Wymagane zmienne
```bash
HRAPPKA_BASE_URL="https://api.hrappka.pl"
HRAPPKA_EMAIL="admin@firma.pl"
HRAPPKA_PASSWORD="VeryStrongPassword1#"
HRAPPKA_COMPANY_ID="1"
```

#### Opcjonalne zmienne
```bash
# Czy używać starego API do autentykacji
HRAPPKA_AUTHENTICATE_OLD_API="false"

# Opcjonalnie: Token (jeśli masz już wygenerowany, możesz użyć zamiast logowania)
HRAPPKA_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Uwaga**: Jeśli ustawisz `HRAPPKA_TOKEN`, system użyje go zamiast logowania. Jeśli token wygaśnie, automatycznie użyje EMAIL/PASSWORD do odświeżenia.

### 2. Weryfikacja konfiguracji

Po skonfigurowaniu zmiennych środowiskowych, możesz przetestować połączenie przez endpoint tRPC:

```typescript
// W kodzie frontend
const result = await trpc.hrappka.testConnection.query();
console.log(result); // { success: true, message: "..." }
```

---

## 🔌 Użycie API

### Podstawowe funkcje

Moduł `server/_core/hrappka.ts` zawiera następujące funkcje:

#### `testHRappkaConnection()`
Testuje połączenie z API i autentykację.

```typescript
import { testHRappkaConnection } from "./_core/hrappka";

const isConnected = await testHRappkaConnection();
```

#### `getHRappkaEmployees()`
Pobiera listę wszystkich pracowników z HRappka.

```typescript
import { getHRappkaEmployees } from "./_core/hrappka";

const employees = await getHRappkaEmployees();
// Zwraca: HRappkaEmployee[]
```

#### `getHRappkaTimeReports(employeeId, startDate, endDate)`
Pobiera raporty godzinowe dla konkretnego pracownika.

```typescript
import { getHRappkaTimeReports } from "./_core/hrappka";

const reports = await getHRappkaTimeReports(
  123,                    // employeeId
  "2025-01-01",          // startDate (YYYY-MM-DD)
  "2025-01-31"           // endDate (YYYY-MM-DD)
);
// Zwraca: HRappkaTimeReport[]
```

#### `getAllHRappkaTimeReports(startDate, endDate)`
Pobiera wszystkie raporty godzinowe dla wszystkich pracowników.

```typescript
import { getAllHRappkaTimeReports } from "./_core/hrappka";

const reports = await getAllHRappkaTimeReports(
  "2025-01-01",          // startDate
  "2025-01-31"           // endDate
);
// Zwraca: HRappkaTimeReport[]
```

#### `callHRappkaApi<T>(endpoint, options)`
Uniwersalna funkcja do wywoływania dowolnego endpointu API.

```typescript
import { callHRappkaApi } from "./_core/hrappka";

const data = await callHRappkaApi<CustomType>(
  "/api/v1/custom-endpoint",
  {
    method: "GET",
    query: { param1: "value1" },
    body: { key: "value" },
  }
);
```

---

## 🛠️ Endpointy tRPC

Wszystkie endpointy są dostępne pod routerem `hrappka` i wymagają uprawnień administratora.

### `hrappka.testConnection`

Testuje połączenie z HRappka API.

**Typ**: Query  
**Uprawnienia**: Admin  
**Input**: Brak

**Przykład**:
```typescript
const result = await trpc.hrappka.testConnection.query();
// { success: true, message: "Połączenie z HRappka API działa poprawnie" }
```

---

### `hrappka.getEmployees`

Pobiera listę pracowników z HRappka.

**Typ**: Query  
**Uprawnienia**: Admin  
**Input**: Brak

**Przykład**:
```typescript
const result = await trpc.hrappka.getEmployees.query();
// {
//   success: true,
//   employees: [
//     { id: 1, firstName: "Jan", lastName: "Kowalski", ... },
//     ...
//   ],
//   count: 10
// }
```

---

### `hrappka.getTimeReports`

Pobiera raporty godzinowe dla konkretnego pracownika.

**Typ**: Query  
**Uprawnienia**: Admin  
**Input**:
```typescript
{
  employeeId: number;      // ID pracownika w HRappka
  startDate: string;       // Format: YYYY-MM-DD
  endDate: string;         // Format: YYYY-MM-DD
}
```

**Przykład**:
```typescript
const result = await trpc.hrappka.getTimeReports.query({
  employeeId: 123,
  startDate: "2025-01-01",
  endDate: "2025-01-31"
});
// {
//   success: true,
//   reports: [
//     {
//       employeeId: 123,
//       date: "2025-01-15",
//       hours: 8,
//       description: "Praca nad projektem X",
//       ...
//     },
//     ...
//   ],
//   count: 20
// }
```

---

### `hrappka.getAllTimeReports`

Pobiera wszystkie raporty godzinowe dla wszystkich pracowników.

**Typ**: Query  
**Uprawnienia**: Admin  
**Input**:
```typescript
{
  startDate: string;       // Format: YYYY-MM-DD
  endDate: string;        // Format: YYYY-MM-DD
}
```

**Przykład**:
```typescript
const result = await trpc.hrappka.getAllTimeReports.query({
  startDate: "2025-01-01",
  endDate: "2025-01-31"
});
// {
//   success: true,
//   reports: [...],
//   count: 150
// }
```

---

## 🔧 Troubleshooting

### Problem: "HRAPPKA_BASE_URL is not configured"

**Rozwiązanie**: Dodaj zmienną `HRAPPKA_BASE_URL` do pliku `.env`:
```bash
HRAPPKA_BASE_URL="https://api.hrappka.pl"
```

---

### Problem: "HRappka API authentication not configured"

**Rozwiązanie**: Dodaj wymagane zmienne do autentykacji:
- `HRAPPKA_EMAIL` - Email administratora
- `HRAPPKA_PASSWORD` - Hasło administratora
- `HRAPPKA_COMPANY_ID` - ID firmy w HRappka

**Przykład**:
```bash
HRAPPKA_BASE_URL="https://api.hrappka.pl"
HRAPPKA_EMAIL="admin@firma.pl"
HRAPPKA_PASSWORD="VeryStrongPassword1#"
HRAPPKA_COMPANY_ID="1"
```

---

### Problem: "HRappka authentication failed (401 Unauthorized)"

**Możliwe przyczyny**:
1. Nieprawidłowy email/hasło
2. Nieprawidłowy companyId
3. Konto nie ma uprawnień administratora
4. Token wygasł (system automatycznie odświeży używając EMAIL/PASSWORD)

**Rozwiązanie**:
1. Sprawdź czy zmienne środowiskowe są poprawne:
   - `HRAPPKA_EMAIL` - musi być emailem administratora
   - `HRAPPKA_PASSWORD` - poprawne hasło
   - `HRAPPKA_COMPANY_ID` - poprawne ID firmy
2. Zweryfikuj dane logowania w panelu HRappka
3. Upewnij się, że konto ma uprawnienia administratora
4. Sprawdź czy `HRAPPKA_BASE_URL` wskazuje na właściwy endpoint

---

### Problem: "HRappka API request failed (404 Not Found)"

**Możliwe przyczyny**:
1. Nieprawidłowy endpoint URL
2. Endpoint nie istnieje w API HRappka

**Rozwiązanie**:
1. Sprawdź dokumentację API: https://hrappka.docs.apiary.io/
2. Zweryfikuj czy endpoint jest poprawny
3. Sprawdź czy `HRAPPKA_BASE_URL` jest ustawiony poprawnie

---

### Problem: Endpointy API nie odpowiadają zgodnie z dokumentacją

**Uwaga**: Moduł został stworzony na podstawie standardowych wzorców API. Może być konieczne dostosowanie:
- Endpointów API (np. `/api/v1/employees` → `/employees`)
- Formatów odpowiedzi (struktura JSON)
- Metod autentykacji

**Rozwiązanie**:
1. Sprawdź dokumentację API HRappka
2. Przetestuj endpointy przez Postman/curl
3. Dostosuj kod w `server/_core/hrappka.ts` do rzeczywistych endpointów

---

## 📝 Uwagi implementacyjne

### Cache tokena

System automatycznie cache'uje token autentykacji na 1 godzinę (lub zgodnie z `expiresIn` z odpowiedzi API). Token jest automatycznie odświeżany przy wygaśnięciu.

### Obsługa błędów

Wszystkie funkcje API rzucają wyjątki w przypadku błędów. Używaj try/catch do obsługi błędów:

```typescript
try {
  const employees = await getHRappkaEmployees();
} catch (error) {
  console.error("Błąd pobierania pracowników:", error);
  // Obsługa błędu
}
```

### Format dat

Wszystkie daty muszą być w formacie `YYYY-MM-DD` (np. `"2025-01-15"`).

---

## 🔍 Endpointy API

Moduł został zaktualizowany zgodnie z dokumentacją HRappka API.

### Endpointy zgodnie z dokumentacją

**Dokumentacja**: https://hrappka.docs.apiary.io/#

#### Lista pracowników
- **Endpoint**: `GET /employees`
- **Dokumentacja**: https://hrappka.docs.apiary.io/#reference/0/employees/get-list
- **Użycie**: Pobieranie listy wszystkich pracowników z HRappka
- **Wymagane**: Token autoryzacyjny w nagłówku `Authorization: Bearer {token}`

#### Kalendarz pracownika (godziny pracy)
- **Endpoint**: `GET /calendar/employee/{employeeId}`
- **Dokumentacja**: https://hrappka.docs.apiary.io/#reference/1/calendar/get-employee-calendar
- **Użycie**: Pobieranie godzin pracy dla konkretnego pracownika
- **Parametry opcjonalne**: `startDate`, `endDate` (format: YYYY-MM-DD)

### Dostosowanie endpointów

Jeśli endpointy różnią się od domyślnych, możesz je dostosować przez zmienne środowiskowe:

### Dostosowanie endpointów

Możesz dostosować endpointy na dwa sposoby:

#### Opcja 1: Przez zmienne środowiskowe

Dodaj do `.env`:
```bash
# Endpoint do pobierania pracowników
HRAPPKA_EMPLOYEES_ENDPOINT="/api/employees"

# Endpoint do pobierania raportów godzinowych (użyj {employeeId} jako placeholder)
HRAPPKA_TIME_REPORTS_ENDPOINT="/api/employees/{employeeId}/reports"

# Endpoint do pobierania wszystkich raportów
HRAPPKA_ALL_TIME_REPORTS_ENDPOINT="/api/time-reports"
```

#### Opcja 2: Przez parametry funkcji

```typescript
// Przykład z niestandardowym endpointem
const employees = await getHRappkaEmployees("/api/custom/employees-endpoint");
const reports = await getHRappkaTimeReports(123, "2025-01-01", "2025-01-31", "/api/custom/reports");
```

### Format odpowiedzi API

Moduł obsługuje różne formaty odpowiedzi:
- Tablica bezpośrednio: `[{...}, {...}]`
- Obiekt z `data`: `{ data: [{...}, {...}] }`
- Obiekt z `employees`/`reports`: `{ employees: [{...}] }`

Jeśli format odpowiedzi jest inny, dostosuj kod w `server/_core/hrappka.ts`.

---

## 🚀 Następne kroki

Po skonfigurowaniu integracji możesz:

1. **Sprawdź dokumentację API** - Zweryfikuj dokładne endpointy w https://hrappka.docs.apiary.io/#
2. **Dostosuj endpointy** - Użyj zmiennych środowiskowych lub parametrów funkcji
3. **Przetestuj połączenie** - Użyj endpointu `hrappka.testConnection`
4. **Synchronizuj dane pracowników** - Importuj listę pracowników z HRappka
5. **Importuj raporty godzinowe** - Automatycznie pobieraj godziny pracy
6. **Tworzyć joby synchronizacji** - Automatyczna synchronizacja co X godzin/dni

---

**Ostatnia aktualizacja**: Styczeń 2025  
**Wersja**: 1.1  
**Dokumentacja API**: https://hrappka.docs.apiary.io/#

