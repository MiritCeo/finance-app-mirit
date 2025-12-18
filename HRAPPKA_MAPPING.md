# Mapowanie Pracowników z HRappka

Dokumentacja funkcjonalności mapowania pracowników z naszej aplikacji do systemu HRappka.

---

## 📋 Spis treści

1. [Wprowadzenie](#wprowadzenie)
2. [Migracja bazy danych](#migracja-bazy-danych)
3. [Mapowanie pracowników](#mapowanie-pracowników)
4. [Endpointy API](#endpointy-api)
5. [Synchronizacja danych](#synchronizacja-danych)
6. [Przykłady użycia](#przykłady-użycia)

---

## 🎯 Wprowadzenie

Funkcjonalność mapowania pozwala na:
- Przypisanie ID pracownika z HRappka do pracownika w naszej aplikacji
- Pobieranie danych pracownika z HRappka na podstawie mapowania
- Synchronizację danych (imię, nazwisko, email, stanowisko, status aktywności)
- Pobieranie raportów godzinowych dla pracownika z HRappka

---

## 🗄️ Migracja bazy danych

Przed użyciem funkcjonalności należy wykonać migrację bazy danych:

```sql
-- Migracja znajduje się w: drizzle/0014_add_hrappka_id.sql
ALTER TABLE `employees` 
ADD COLUMN `hrappkaId` int NULL AFTER `notes`;
```

**Uruchomienie migracji:**
```bash
# Jeśli używasz drizzle-kit
pnpm db:push

# Lub wykonaj migrację ręcznie w bazie danych
mysql -u user -p database_name < drizzle/0014_add_hrappka_id.sql
```

---

## 🔗 Mapowanie pracowników

### Krok 1: Pobierz listę pracowników z HRappka

Użyj endpointu `employees.getHRappkaEmployeesForMapping` aby zobaczyć:
- Listę wszystkich pracowników z HRappka
- Listę pracowników z naszej aplikacji
- Informację, które pracowniki są już zmapowane

### Krok 2: Przypisz HRappka ID do pracownika

Użyj endpointu `employees.assignHRappkaId` aby przypisać ID z HRappka do pracownika w naszej aplikacji.

**Wymagania:**
- Pracownik musi istnieć w naszej aplikacji
- HRappka ID nie może być już przypisany do innego pracownika

### Krok 3: Usuń mapowanie (opcjonalnie)

Użyj endpointu `employees.unassignHRappkaId` aby usunąć przypisanie HRappka ID.

---

## 🛠️ Endpointy API

### `employees.assignHRappkaId`

Przypisuje HRappka ID do pracownika.

**Typ**: Mutation  
**Uprawnienia**: Admin  
**Input**:
```typescript
{
  employeeId: number;    // ID pracownika w naszej aplikacji
  hrappkaId: number;      // ID pracownika w HRappka
}
```

**Przykład**:
```typescript
await trpc.employees.assignHRappkaId.mutate({
  employeeId: 1,
  hrappkaId: 123
});
```

**Błędy**:
- `BAD_REQUEST` - HRappka ID jest już przypisany do innego pracownika

---

### `employees.unassignHRappkaId`

Usuwa przypisanie HRappka ID z pracownika.

**Typ**: Mutation  
**Uprawnienia**: Admin  
**Input**:
```typescript
{
  employeeId: number;    // ID pracownika w naszej aplikacji
}
```

**Przykład**:
```typescript
await trpc.employees.unassignHRappkaId.mutate({
  employeeId: 1
});
```

---

### `employees.getHRappkaEmployeesForMapping`

Pobiera listę pracowników z HRappka i naszej aplikacji do mapowania.

**Typ**: Query  
**Uprawnienia**: Admin  
**Input**: Brak

**Odpowiedź**:
```typescript
{
  success: true,
  hrappkaEmployees: [
    {
      id: number,
      firstName: string,
      lastName: string,
      email?: string,
      isMapped: boolean,        // Czy jest już zmapowany
      localEmployeeId?: number,  // ID w naszej aplikacji (jeśli zmapowany)
    },
    ...
  ],
  localEmployees: [
    {
      id: number,
      firstName: string,
      lastName: string,
      email?: string,
      hrappkaId?: number,
      hrappkaEmployee?: HRappkaEmployee,  // Dane z HRappka (jeśli zmapowany)
    },
    ...
  ]
}
```

**Przykład**:
```typescript
const result = await trpc.employees.getHRappkaEmployeesForMapping.query();
console.log(result.hrappkaEmployees);  // Pracownicy z HRappka
console.log(result.localEmployees);   // Pracownicy z naszej aplikacji
```

---

### `employees.getTimeReportsFromHRappka`

Pobiera raporty godzinowe dla pracownika z HRappka (używając jego hrappkaId).

**Typ**: Query  
**Uprawnienia**: Admin  
**Input**:
```typescript
{
  employeeId: number;      // ID pracownika w naszej aplikacji
  startDate: string;       // Format: YYYY-MM-DD
  endDate: string;         // Format: YYYY-MM-DD
}
```

**Odpowiedź**:
```typescript
{
  success: true,
  employee: {
    id: number,
    firstName: string,
    lastName: string,
    hrappkaId: number,
  },
  reports: HRappkaTimeReport[],
  count: number,
}
```

**Przykład**:
```typescript
const result = await trpc.employees.getTimeReportsFromHRappka.query({
  employeeId: 1,
  startDate: "2025-01-01",
  endDate: "2025-01-31"
});
```

**Błędy**:
- `NOT_FOUND` - Pracownik nie został znaleziony
- `BAD_REQUEST` - Pracownik nie ma przypisanego HRappka ID

---

### `employees.syncFromHRappka`

Synchronizuje dane pracownika z HRappka (pobiera aktualne dane i aktualizuje w naszej aplikacji).

**Typ**: Mutation  
**Uprawnienia**: Admin  
**Input**:
```typescript
{
  employeeId: number;    // ID pracownika w naszej aplikacji
}
```

**Odpowiedź**:
```typescript
{
  success: true,
  updated: boolean,      // Czy dane zostały zaktualizowane
  updateData: {          // Jakie pola zostały zaktualizowane
    firstName?: string,
    lastName?: string,
    email?: string,
    position?: string,
    isActive?: boolean,
  },
  hrappkaEmployee: HRappkaEmployee,  // Pełne dane z HRappka
}
```

**Przykład**:
```typescript
const result = await trpc.employees.syncFromHRappka.mutate({
  employeeId: 1
});

if (result.updated) {
  console.log("Zaktualizowano:", result.updateData);
}
```

**Synchronizowane pola**:
- `firstName` - Imię
- `lastName` - Nazwisko
- `email` - Email
- `position` - Stanowisko
- `isActive` - Status aktywności

**Błędy**:
- `NOT_FOUND` - Pracownik nie został znaleziony (w naszej aplikacji lub w HRappka)
- `BAD_REQUEST` - Pracownik nie ma przypisanego HRappka ID

---

## 🔄 Synchronizacja danych

### Automatyczna synchronizacja

Możesz użyć endpointu `employees.syncFromHRappka` aby zsynchronizować dane pracownika z HRappka.

**Co jest synchronizowane:**
- Podstawowe dane osobowe (imię, nazwisko, email)
- Stanowisko
- Status aktywności

**Co NIE jest synchronizowane:**
- Stawki godzinowe
- Wynagrodzenia
- Urlopy
- Notatki

### Ręczna synchronizacja

1. Pobierz listę pracowników do mapowania:
   ```typescript
   const mapping = await trpc.employees.getHRappkaEmployeesForMapping.query();
   ```

2. Przypisz HRappka ID do pracownika:
   ```typescript
   await trpc.employees.assignHRappkaId.mutate({
     employeeId: 1,
     hrappkaId: 123
   });
   ```

3. Zsynchronizuj dane:
   ```typescript
   await trpc.employees.syncFromHRappka.mutate({
     employeeId: 1
   });
   ```

---

## 💡 Przykłady użycia

### Przykład 1: Mapowanie nowego pracownika

```typescript
// 1. Pobierz listę pracowników z HRappka
const mapping = await trpc.employees.getHRappkaEmployeesForMapping.query();

// 2. Znajdź pracownika w HRappka (np. po emailu)
const hrappkaEmployee = mapping.hrappkaEmployees.find(
  emp => emp.email === "jan.kowalski@firma.pl"
);

// 3. Znajdź pracownika w naszej aplikacji
const localEmployee = mapping.localEmployees.find(
  emp => emp.email === "jan.kowalski@firma.pl"
);

// 4. Przypisz HRappka ID
if (hrappkaEmployee && localEmployee) {
  await trpc.employees.assignHRappkaId.mutate({
    employeeId: localEmployee.id,
    hrappkaId: hrappkaEmployee.id
  });

  // 5. Zsynchronizuj dane
  await trpc.employees.syncFromHRappka.mutate({
    employeeId: localEmployee.id
  });
}
```

### Przykład 2: Pobieranie raportów godzinowych

```typescript
// Pobierz raporty godzinowe dla pracownika z ostatniego miesiąca
const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const reports = await trpc.employees.getTimeReportsFromHRappka.query({
  employeeId: 1,
  startDate: firstDay.toISOString().split('T')[0],
  endDate: lastDay.toISOString().split('T')[0]
});

console.log(`Pracownik zaraportował ${reports.count} dni pracy`);
reports.reports.forEach(report => {
  console.log(`${report.date}: ${report.hours}h - ${report.description}`);
});
```

### Przykład 3: Masowa synchronizacja

```typescript
// Zsynchronizuj wszystkich pracowników z przypisanym HRappka ID
const employees = await trpc.employees.list.query();
const mappedEmployees = employees.filter(emp => emp.hrappkaId !== null);

for (const employee of mappedEmployees) {
  try {
    const result = await trpc.employees.syncFromHRappka.mutate({
      employeeId: employee.id
    });
    
    if (result.updated) {
      console.log(`Zaktualizowano: ${employee.firstName} ${employee.lastName}`);
    }
  } catch (error) {
    console.error(`Błąd synchronizacji ${employee.firstName} ${employee.lastName}:`, error);
  }
}
```

---

## ⚠️ Uwagi

1. **Unikalność HRappka ID**: Każdy HRappka ID może być przypisany tylko do jednego pracownika w naszej aplikacji.

2. **Walidacja przed przypisaniem**: System sprawdza, czy HRappka ID nie jest już przypisany do innego pracownika.

3. **Synchronizacja danych**: Synchronizacja aktualizuje tylko te pola, które różnią się między naszą aplikacją a HRappka.

4. **Brak mapowania**: Jeśli pracownik nie ma przypisanego HRappka ID, nie można pobrać jego danych z HRappka.

5. **Błędy połączenia**: W przypadku problemów z połączeniem do HRappka API, endpointy zwrócą odpowiedni błąd.

---

## 🔧 Troubleshooting

### Problem: "HRappka ID jest już przypisany do innego pracownika"

**Rozwiązanie**: 
- Sprawdź, który pracownik ma już przypisany ten HRappka ID
- Użyj `employees.unassignHRappkaId` aby usunąć stare przypisanie
- Następnie przypisz HRappka ID do właściwego pracownika

### Problem: "Pracownik nie ma przypisanego HRappka ID"

**Rozwiązanie**:
- Użyj `employees.getHRappkaEmployeesForMapping` aby znaleźć odpowiedniego pracownika w HRappka
- Użyj `employees.assignHRappkaId` aby przypisać HRappka ID

### Problem: "Nie znaleziono pracownika w HRappka"

**Rozwiązanie**:
- Sprawdź, czy HRappka ID jest poprawne
- Sprawdź, czy pracownik istnieje w HRappka
- Sprawdź połączenie z HRappka API (`hrappka.testConnection`)

---

**Ostatnia aktualizacja**: Styczeń 2025  
**Wersja**: 1.0

