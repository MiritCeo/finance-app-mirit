# ProfitFlow - Aktualizacja modelu biznesowego (Grudzień 2024)

## 🔄 Wprowadzone zmiany

### 1. Model rozliczeń projektów

**Przed:** Projekty miały budżet i model rozliczenia (Time & Material lub Fixed Price)

**Teraz:** 
- Wszystkie projekty rozliczane **wyłącznie miesięcznie** na podstawie zaraportowanych godzin
- Usunięto pole `budget` z projektów
- Model rozliczenia ustawiony na `time_material` (jedyna opcja)
- Przychód = **godziny zaraportowane × stawka dla klienta**

### 2. Stawki dla klientów

**Dodano pole `hourlyRateClient`** w tabeli `employeeProjectAssignments`:
- Każdy pracownik przypisany do projektu ma swoją stawkę dla klienta
- Stawka określa ile klient płaci za godzinę pracy tego pracownika
- Zysk = (godziny × stawka klienta) - koszt pracownika

### 3. Płatne urlopy

**Wszyscy pracownicy mają 21 dni płatnego urlopu rocznie** (niezależnie od typu umowy):
- Dodano pole `vacationDaysPerYear` (domyślnie 21)
- Dodano pole `vacationDaysUsed` do śledzenia wykorzystanych urlopów
- Koszt godzinowy pracownika uwzględnia płatne urlopy
- Standardowo 168h miesięcznie (21 dni × 8h)

### 4. Symulator zysku z pracownika

**Przed:** Symulator wypłaty właściciela

**Teraz:** **Symulator zysku z pracownika** - narzędzie do negocjacji wynagrodzeń:
- Wprowadź typ umowy i wynagrodzenie netto pracownika
- Wprowadź stawkę dla klienta
- Zobacz ile zostanie zysku dla firmy miesięcznie i rocznie
- Obliczenia uwzględniają:
  - Płatne urlopy (21 dni)
  - Składki ZUS i podatki dla każdego typu umowy
  - Koszt godzinowy uśredniony do 168h/miesiąc
  - Marżę procentową

### 5. Dynamiczny zysk operacyjny

**Dashboard KPI** teraz oblicza zysk operacyjny na podstawie:
- Rzeczywistych time entries (zaraportowanych godzin)
- Stawek dla klientów przypisanych do pracowników
- Kosztów pracowników
- Kosztów stałych

**Formuła:**
```
Przychód = Σ (godziny zaraportowane × stawka klienta)
Zysk operacyjny = Przychód - Koszty pracowników - Koszty stałe
```

## 📊 Nowe obliczenia

### Koszt godzinowy pracownika

```typescript
Koszt godzinowy = Koszt miesięczny całkowity / 168h
```

Gdzie 168h = 21 dni roboczych × 8h (standardowy miesiąc pracy)

### Zysk z pracownika

```typescript
Przychód miesięczny = Godziny zaraportowane × Stawka dla klienta
Zysk miesięczny = Przychód miesięczny - Koszt miesięczny pracownika
Marża = (Zysk / Przychód) × 100%
```

### Przykład

**Pracownik:**
- Typ umowy: B2B
- Wynagrodzenie netto: 10,000 PLN
- Koszt firmy: ~13,158 PLN (z podatkiem i ZUS)
- Koszt godzinowy: ~78.32 PLN/h

**Projekt:**
- Stawka dla klienta: 150 PLN/h
- Godziny zaraportowane: 168h

**Wynik:**
- Przychód: 168h × 150 PLN = 25,200 PLN
- Koszt: 13,158 PLN
- **Zysk: 12,042 PLN miesięcznie** (144,504 PLN rocznie)
- **Marża: 47.78%**

## 🗄️ Zmiany w bazie danych

### Tabela `employees`
- ✅ Dodano `vacationDaysPerYear` (domyślnie 21)
- ✅ Dodano `vacationDaysUsed` (domyślnie 0)

### Tabela `projects`
- ❌ Usunięto `budget`
- ✅ Zmieniono `billingModel` na enum z jedną wartością: `time_material`

### Tabela `employeeProjectAssignments`
- ✅ Zmieniono `hourlyRateSell` na `hourlyRateClient` (stawka dla klienta)

## 🎯 Jak korzystać z nowych funkcji

### 1. Symulator zysku z pracownika

1. Przejdź do **"Symulator zysku z pracownika"** z dashboardu
2. Wybierz typ umowy (UoP, B2B, zlecenie, zlecenie studenckie)
3. Wprowadź wynagrodzenie netto pracownika
4. Wprowadź stawkę dla klienta (ile klient płaci za godzinę)
5. Zobacz obliczony zysk miesięczny i roczny
6. Użyj podczas negocjacji podwyżek lub zatrudniania nowych pracowników

### 2. Przypisywanie pracowników do projektów

Przy przypisywaniu pracownika do projektu określ:
- **Stawkę dla klienta** (`hourlyRateClient`) - ile klient płaci za godzinę tego pracownika
- **Koszt godzinowy** (`hourlyRateCost`) - automatycznie obliczany z kosztu miesięcznego

### 3. Raportowanie czasu pracy

Właściciel firmy raportuje godziny pracowników:
- Dodaj time entry dla pracownika i projektu
- Wprowadź liczbę godzin przepracowanych
- System automatycznie obliczy przychód na podstawie stawki klienta
- Dashboard zaktualizuje zysk operacyjny

## 🔧 Migracja danych

Jeśli masz już dane w systemie:

1. **Projekty:** Budżety zostały zachowane w bazie, ale nie są używane
2. **Assignments:** Pole `hourlyRateSell` zostało przemianowane na `hourlyRateClient`
3. **Pracownicy:** Dodano pola urlopowe z wartościami domyślnymi

## 📝 Uwagi techniczne

- Wszystkie obliczenia finansowe w groszach (× 100)
- Godziny w setnych (np. 8.5h = 850)
- Dashboard oblicza przychód z bieżącego miesiąca
- Jeśli brak time entries, używane jest uproszczone obliczenie (20% marża)

## 🚀 Roadmapa

Planowane funkcje:
- **Moduł urlopów** - zarządzanie wnioskami urlopowymi
- **Raporty rentowności** - szczegółowa analiza zysku per pracownik/projekt
- **Automatyczne przypomnienia** - o raportowaniu godzin
- **Eksport danych** - do Excel/PDF

---

**Wersja:** 2.0.0  
**Data aktualizacji:** Grudzień 2024
