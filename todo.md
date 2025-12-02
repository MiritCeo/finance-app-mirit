# ProfitFlow - TODO List

## Faza 1: Baza danych i modele
- [x] Zaprojektować schemat bazy danych (pracownicy, projekty, klienci, koszty, przychody)
- [x] Zaimplementować migracje w drizzle/schema.ts
- [x] Uruchomić migracje bazy danych
- [x] Dodać helpery do server/db.ts

## Faza 2: Logika biznesowa
- [x] Utworzyć serwis kalkulatora wynagrodzeń (UoP, B2B, zlecenia)
- [x] Zaimplementować procedury tRPC dla pracowników
- [x] Zaimplementować procedury tRPC dla projektów i klientów
- [x] Zaimplementować procedury tRPC dla finansów i raportów
- [x] Dodać symulator wypłaty właściciela

## Faza 3: Interfejs użytkownika
- [x] Stworzyć layout aplikacji z nawigacją
- [x] Zbudować Dashboard z KPI i wykresami
- [x] Zbudować moduł Pracownicy (lista, dodawanie, edycja)
- [x] Zbudować moduł Projekty i Klienci
- [x] Zbudować moduł Finansów
- [x] Zbudować moduł Raportów
- [x] Dodać symulator wypłaty właściciela w UI

## Faza 4: Dane testowe i testy
- [x] Przygotować seeder z danymi testowymi
- [x] Przetestować wszystkie funkcjonalności
- [x] Poprawić błędy

## Faza 5: Dokumentacja
- [x] Przygotować README z instrukcją instalacji
- [x] Utworzyć checkpoint
- [x] Dostarczyć aplikację użytkownikowi

## Aktualizacja modelu biznesowego (Grudzień 2024)

### Zmiany w modelu danych
- [x] Dodać stawkę klienta (hourlyRateClient) do employeeProjectAssignments
- [x] Usunąć pole budget z projektów (projekty bez budżetu)
- [x] Dodać pole vacationDaysUsed do employees
- [x] Zaktualizować schemat bazy danych

### Logika biznesowa
- [x] Utworzyć kalkulator kosztu godzinowego pracownika (168h/miesiąc + urlopy)
- [x] Utworzyć kalkulator zysku z pracownika (godziny × stawka klienta - koszt)
- [x] Zaktualizować dashboard KPI o rzeczywiste obliczenia z time entries
- [x] Dodać procedury tRPC dla nowego symulatora

### Interfejs użytkownika
- [x] Zmienić symulator wypłaty właściciela na symulator zysku z pracownika
- [x] Dodać pole stawki klienta przy przypisywaniu pracownika do projektu (w schemacie)
- [x] Zaktualizować dashboard z dynamicznym zyskiem
- [x] Zaktualizować moduł pracowników o wykorzystane urlopy (w schemacie)

### Finalizacja
- [x] Przetestować nowe obliczenia
- [x] Zaktualizować dane testowe
- [x] Zapisać checkpoint

## Naprawa błędów i nowe funkcjonalności (Grudzień 2024)

### Naprawa błędów
- [x] Naprawić obliczenia przychodu w kalkulatorze zysku z pracownika (168h × 200 PLN powinno dać 33,600 PLN, nie 336 PLN)
- [ ] Sprawdzić wszystkie obliczenia finansowe w aplikacji

### Moduł raportowania godzin
- [x] Utworzyć stronę TimeReporting.tsx
- [x] Dodać formularz do wpisywania godzin pracowników
- [x] Dodać procedury tRPC dla time entries
- [x] Automatyczne obliczanie przychodów przy zapisie
- [x] Lista zaraportowanych godzin z możliwością edycji

### Rozbudowa modułu pracowników
- [ ] Dodać widok wykorzystanych urlopów
- [ ] Dodać historię zmian wynagrodzeń
- [ ] Dodać wykres rentowności per pracownik
- [ ] Dodać statystyki godzin i przychodów

### Moduł raportów finansowych
- [ ] Utworzyć stronę Reports.tsx
- [ ] Miesięczne zestawienie P&L (Profit & Loss)
- [ ] Raport rentowności projektów
- [ ] Raport rentowności pracowników
- [ ] Eksport do Excel/PDF
- [ ] Filtry czasowe (miesiąc, kwartał, rok)

### Finalizacja
- [x] Przetestować wszystkie nowe funkcje
- [x] Zapisać checkpoint

## Przeprojektowanie modułu raportowania godzin (Grudzień 2024)

- [x] Zmienić TimeReporting.tsx na miesięczny formularz
- [x] Lista wszystkich pracowników z polami do wpisania godzin
- [x] Wybór miesiąca i roku
- [x] Zapisywanie godzin miesięcznych dla każdego pracownika
- [x] Historia zapisanych miesięcy
- [x] Aktualizacja obliczeń raportów na podstawie miesięcznych danych

## Rozszerzenie symulatora i raportowania (Grudzień 2024)

### Symulator zysku z pracownika
- [x] Dodać pole "Stawka godzinowa dla pracownika"
- [x] Dodać wynik "Symulacja stawkowa" (godziny × stawka klienta - godziny × stawka pracownika)
- [x] Porównanie symulacji stawkowej z symulacją kosztową

### Raportowanie godzin
- [x] Obliczać rzeczywisty zysk (przychód - koszty pracownika)
- [x] Wyświetlać zysk w historii raportów
- [x] Aktualizować dashboard o rzeczywisty zysk

## Rozbudowa symulatora o szczegółowy breakdown kosztów (Grudzień 2024)

- [x] Pobrać aktualne dane o składkach ZUS i podatkach z internetu
- [x] Dodać obliczenia kosztów urlopu (21 dni płatnego rocznie)
- [x] Wyświetlać szczegółowy breakdown dla każdego typu umowy:
  - [x] B2B: VAT 23%, podatek, ZUS
  - [x] UoP: ZUS pracownika, ZUS pracodawcy, podatek
  - [x] Zlecenie: składki, podatek
  - [x] Zlecenie studenckie: brak składek
- [x] Dodać koszt urlopu miesięczny i roczny dla pracodawcy

## Poprawka kosztów urlopu B2B (Grudzień 2024)

- [x] Zmienić obliczanie kosztu urlopu dla B2B na: stawka godzinowa pracownika × 168h (21 dni × 8h)
- [x] Wyświetlać koszt miesięczny urlopu (roczny / 12)
- [x] Wyświetlać koszt roczny urlopu

## Poprawka breakdown kosztów B2B (Grudzień 2024)

- [x] Usunąć z breakdown B2B: VAT, składki ZUS, składkę zdrowotną, podatek
- [x] Zostawić tylko: kwota netto faktury + koszt urlopów
- [x] VAT nie jest kosztem firmy (odliczany)
- [x] Składki i podatki płaci kontrahent, nie pracodawca

## Poprawki dashboardu i symulatora (Grudzień 2024)

- [x] Usunąć koszty stałe z obliczeń dashboardu (nie są brane pod uwagę)
- [x] Usunąć kartę "Koszty stałe" z dashboardu
- [x] Dodać wyświetlanie kosztu urlopu miesięcznego i rocznego do wyników symulacji
- [x] Pokazać koszty urlopu dla wszystkich typów umów w symulatorze

## Poprawa formuł B2B (Grudzień 2024)

- [x] Poprawić obliczenia B2B w employeeProfitCalculator.ts - koszt firmy = kwota netto faktury
- [x] Poprawić obliczenia B2B w salaryCalculator.ts - usunąć odwracanie obliczeń
- [x] Dla B2B: koszt miesięczny = kwota netto + koszt urlopów
- [x] Usunąć błędne dzielenie przez 0.76 i inne współczynniki

## Rozbudowa symulatora - breakdown i prognozy (Grudzień 2024)

- [x] Dodać obliczenia kosztów per godzina w symulatorze
- [x] Wyszczególnić składowe kosztu godzinowego (wynagrodzenie + urlopy + inne)
- [x] Dodać prognozy strat dla współpracy nierentownej (3, 6, 12 miesięcy)
- [x] Rozbudować UI sekcji "Koszt Firmy" o breakdown per godzina
- [x] Dodać sekcję z prognozami strat gdy marża < 0

## Nowe funkcjonalności i poprawki (Grudzień 2024)

### Naprawa raportowania godzin
- [x] Naprawić obliczenia w raportowaniu - odliczać koszty pracowników od przychodów
- [x] Wyświetlać rzeczywisty zysk (przychód - koszty), nie tylko przychód
- [x] Dodać przykładowe dane do seedera (przypisania i raporty godzin)

### Eksport symulacji do PDF
- [ ] Dodać przycisk "Pobierz raport PDF" w symulatorze
- [ ] Wygenerować profesjonalny dokument PDF z pełnym breakdown kosztów
- [ ] Dołączyć prognozy strat (jeśli nierentowne)

### Wykresy w dashboardzie
- [ ] Dodać wykres liniowy przychodów vs kosztów (ostatnie 6 miesięcy)
- [ ] Dodać wykres kołowy struktury kosztów pracowników
- [ ] Użyć biblioteki recharts (już zainstalowana)

### Moduł porównania pracowników
- [ ] Utworzyć stronę EmployeeComparison.tsx
- [ ] Tabela z wszystkimi pracownikami: rentowność, marża, zysk miesięczny
- [ ] Możliwość sortowania i filtrowania
- [ ] Dodać routing w App.tsx

## Naprawa aktualizacji danych (Grudzień 2024)

- [ ] Zdiagnozować problem z brakiem aktualizacji danych w dashboardzie
- [ ] Sprawdzić invalidację cache tRPC po zapisie raportów
- [ ] Naprawić odświeżanie danych w czasie rzeczywistym
- [ ] Przetestować czy dane aktualizują się po zapisie

## Naprawa obliczeń zysku w raportach (Grudzień 2024)

- [x] Zdiagnozować błąd - przy 15h (3 pracowników × 5h) pokazuje zysk zamiast straty
- [x] Zmienić logikę - koszt miesięczny powinien być pełny koszt pracownika, nie proporcjonalny do godzin
- [x] Przychód = godziny × stawka klienta (OK)
- [x] Koszt = pełny miesięczny koszt wszystkich pracowników którzy mieli wpisy
- [x] Zysk = przychód - koszty (teraz poprawnie ujemny przy małej liczbie godzin)
- [x] Wyświetlać straty na czerwono w UI

## Nowe funkcjonalności (Grudzień 2024)

### Szczegóły raportu miesięcznego (W TRAKCIE)
- [x] Dodać procedurę tRPC do pobierania szczegółów raportu (GOTOWE - `trpc.timeEntries.details`)
- [ ] Dodać modal ze szczegółami raportu (DO ZROBIENIA - frontend)
- [ ] Pokazać tabelę: pracownik, godziny, stawka klienta, przychód, koszt, zysk
- [ ] Dodać podsumowanie na dole tabeli
- [ ] Kliknięcie na raport w historii otwiera modal

### Wykresy w dashboardzie (DO ZROBIENIA)
- [ ] Dodać procedurę tRPC do pobierania danych historycznych
- [ ] Dodać wykres liniowy przychodów vs kosztów (ostatnie 6 miesięcy)
- [ ] Dodać wykres kołowy struktury kosztów pracowników
- [ ] Użyć biblioteki recharts

### Tabela porównawcza w symulatorze (ODROCZONE)
- [ ] Dodać tabelę porównującą wszystkie typy umów (UoP, B2B, zlecenie, zlecenie studenckie)
- [ ] Pokazać dla każdego typu: koszt firmy, netto pracownika, zysk, marżę
- [ ] Wyróżnić najbardziej opłacalną opcję

## Rozbudowa modułu pracowników (Grudzień 2024)

### Rozszerzenie danych finansowych
- [x] Dodać pole hourlyRateEmployee do tabeli employees (stawka godzinowa pracownika)
- [x] Dodać pole hourlyRateClient do employees (domyślna stawka dla klienta)
- [x] Wyświetlać w tabeli: koszt urlopu miesięczny i roczny
- [x] Wyświetlać w tabeli: stawka godzinowa pracownika
- [x] Wyświetlać w tabeli: stawka godzinowa klienta
- [x] Wyświetlać w tabeli: koszt godzinowy pracodawcy
- [x] Dodać te pola do formularza dodawania/edycji pracownika

## Naprawa obliczeń kosztów w tabeli pracowników (Grudzień 2024)

### Problem
- [x] monthlyCostTotal w bazie JUŻ ZAWIERA koszt urlopów (zgodnie z symulatorem)
- [x] Tabela pracowników liczy koszt urlopu osobno - podwójne liczenie!
- [x] Trzeba przechowywać vacationCostMonthly w bazie i wyświetlać go zamiast liczyć na nowo

### Rozwiązanie
- [x] Dodać pole vacationCostMonthly do schematu employees
- [x] Dodać pole vacationCostAnnual do schematu employees
- [x] Zaktualizować kalkulator wynagrodzeń aby zapisywał te wartości
- [x] Poprawić wyświetlanie w tabeli - używać zapisanych wartości zamiast liczyć
- [x] Zaktualizować istniejących pracowników w bazie
- [x] Dodać funkcję calculateSalary jako wrapper dla wszystkich typów umów
- [x] Napisać testy dla calculateSalary

## Naprawa błędów w raportowaniu i formularzu pracowników (Grudzień 2024)

### Raportowanie godzin
- [x] Naprawić zapis raportów - nie pojawiają się w historii
- [x] Zweryfikować czy koszty pracowników są poprawnie pobierane z bazy
- [ ] Sprawdzić procedurę tRPC timeEntries.saveMonthlyReport

### Formularz pracownika
- [ ] Usunąć ręczne pole "Koszt PLN" 
- [ ] Dodać automatyczne obliczanie kosztów po wpisaniu netto/brutto
- [ ] Używać trpc.employees.calculateSalary do auto-kalkulacji
- [ ] Brutto powinno być liczone automatycznie (dla UoP)
- [ ] Wszystkie koszty liczone na zasadach z kalkulatora

### Edycja pracownika
- [ ] Naprawić odświeżanie tabeli po zapisie edycji
- [ ] Dodać invalidację cache tRPC dla employees.list
- [ ] Przetestować czy zmiany są widoczne od razu

### Duplikaty pracowników
- [ ] Usunąć duplikaty pracowników z bazy (12 pracowników zamiast 4)
- [ ] Zostawić tylko unikalnych pracowników
- [ ] Sprawdzić dlaczego powstały duplikaty

## Naprawa formularza pracownika - automatyczne obliczenia (Grudzień 2024)

- [ ] Usunąć ręczne pola Koszt i Brutto z formularza
- [ ] Dodać wywołanie trpc.employees.calculateSalary przy zmianie netto/typu umowy
- [ ] Wyświetlać obliczone wartości (brutto, koszt, koszt godz., urlopy) jako readonly
- [ ] Zapisywać wszystkie obliczone wartości do bazy przy dodawaniu pracownika
- [ ] Przetestować czy wszystkie pola wypełniają się poprawnie
- [ ] Naprawić edycję pracownika - również powinna używać auto-kalkulacji

## Naprawa procedury calculateSalary dla wszystkich typów umów (Grudzień 2024)

### Problem
- [x] B2B działa poprawnie (urlopy, koszty, koszt godzinowy)
- [x] UoP pokazuje 0 zł dla wszystkich pól
- [x] Zlecenie pokazuje 0 zł dla wszystkich pól
- [x] Zlecenie studenckie pokazuje 0 zł dla wszystkich pól
- [x] Stawka pracownika powinna być obliczana automatycznie (netto / 168h), nie wpisywana ręcznie

### Rozwiązanie
- [x] Sprawdzić procedurę tRPC employees.calculateSalary
- [x] Sprawdzić funkcje calculateUOP i calculateContract w salaryCalculator.ts
- [x] Upewnić się że zwracają wszystkie wymagane pola (grossSalary, employerCostWithVacation, vacationCostMonthly, vacationCostAnnual)
- [x] Dodać automatyczne obliczanie stawki pracownika jako netto / 168h
- [x] Przetestować dla wszystkich typów umów
- [x] Zweryfikować że obliczenia są zgodne z symulatorem zysku pracownika

### Problemy do naprawy
- [ ] Typ umowy nie aktualizuje się w formularzu (select nie zmienia formData.employmentType)
- [ ] Brak kolumn urlopów w tabeli pracowników
- [ ] Duplikaty pracowników (19 zamiast ~6)

## Rozbudowa tabeli pracowników o zyski (Grudzień 2024)

- [x] Dodać kolumnę "Zysk miesięczny" do tabeli pracowników
- [x] Dodać kolumnę "Zysk roczny" do tabeli pracowników
- [x] Obliczyć zysk miesięczny: (168h × stawka klienta) - koszt firmy
- [x] Obliczyć zysk roczny: zysk miesięczny × 12
- [x] Implementować kolorowanie tła dla zysku miesięcznego:
  - [x] Czerwone tło: zysk < 0 zł (strata)
  - [x] Pomarańczowe tło: 0 zł ≤ zysk < 4 000 zł
  - [x] Zielone tło: 4 000 zł ≤ zysk < 8 000 zł
  - [x] Złote tło: zysk ≥ 8 000 zł
- [x] Przetestować wyświetlanie i kolorowanie

## Automatyczne obliczanie stawki pracownika w symulatorze (Grudzień 2024)

- [x] Zmienić pole "Stawka godzinowa dla pracownika" na readonly w symulatorze
- [x] Dodać automatyczne obliczanie: stawka pracownika = netto / 168h
- [x] Aktualizować stawkę przy zmianie netto lub typu umowy
- [x] Przetestować dla wszystkich typów umów

## Rozbudowa symulatora - dodatkowe informacje finansowe (Grudzień 2024)

### Dla UoP
- [x] Dodać sekcję "Wynagrodzenie pracownika" pokazującą kwotę netto na rękę
- [x] Wyświetlić breakdown: brutto → składki ZUS → podatek → składka zdrowotna → netto na rękę
- [x] Sprawdzić czy backend zwraca te dane w procedurze employeeProfit.simulate

### Dla B2B
- [x] Dodać kwotę netto (bez VAT) w podliczeniach zysku dla firmy
- [x] Wyjaśnić że VAT jest neutralny podatkowo (odliczany)
- [x] Pokazać: przychód brutto → przychód netto (bez VAT) → koszt → zysk

## Naprawa podliczenia B2B w symulatorze (Grudzień 2024)

- [x] Naprawić sekcję "Zysk dla firmy" dla B2B - używać przychodu od klienta (monthlyRevenue) zamiast wynagrodzenia pracownika (invoiceNet)
- [x] Przychód brutto (z VAT) = monthlyRevenue × 1.23
- [x] Przychód netto (bez VAT) = monthlyRevenue
- [x] Koszt firmy = monthlyCostTotal (wynagrodzenie pracownika + urlopy)
- [x] Zysk = przychód netto - koszt firmy

## Zmiana semantyki pola wynagrodzenia (Grudzień 2024)

### Nowe podejście
- [x] Dla UoP: pole "Wynagrodzenie brutto pracownika" - użytkownik wpisuje brutto
- [x] Dla B2B, Zlecenie, Zlecenie studenckie: pole "Wynagrodzenie netto pracownika" - użytkownik wpisuje netto
- [x] Zaktualizować etykiety pól w formularzu pracownika (dynamiczne w zależności od typu umowy)
- [x] Zaktualizować etykiety pól w symulatorze (dynamiczne w zależności od typu umowy)
- [x] Zaktualizować procedurę calculateSalary aby obsługiwała brutto dla UoP
- [x] Przetestować wszystkie typy umów

## System raportów rocznych dla pracowników (Grudzień 2024)

- [x] Rozszerzenie schematu bazy danych o tabelę monthly_employee_reports
  - [x] employeeId, year, month, hoursWorked, clientRate, revenue, cost, profit
- [x] Procedury tRPC dla raportów rocznych
  - [x] getAnnualReport(employeeId, year) - pobieranie raportu rocznego
  - [x] updateMonthlyHours(employeeId, year, month, hours) - aktualizacja godzin
- [x] Strona /employee/:id/annual-report
  - [x] Tabela z podsumowaniem każdego miesiąca (godziny, przychód, koszt, zysk/strata)
  - [x] Podsumowanie roczne na dole (suma godzin, suma przychodów, suma kosztów, zysk/strata roczna)
  - [x] Możliwość edycji godzin dla każdego miesiąca
  - [x] Kolorowanie zysków (zielony) i strat (czerwony)
- [x] Przycisk "Raport roczny" przy każdym pracowniku na liście pracowników
- [x] Testowanie i zapisanie checkpointu

## Integracja raportu rocznego z raportowaniem miesięcznym (Grudzień 2024)

- [x] Modyfikacja procedury employees.getAnnualReport
  - [x] Pobierać godziny z tabeli timeEntries zamiast monthlyEmployeeReports
  - [x] Zsumować godziny per pracownik per miesiąc
  - [x] Obliczyć przychód, koszt i zysk na podstawie pobranych godzin
- [x] Aktualizacja frontend EmployeeAnnualReport.tsx
  - [x] Wyświetlać godziny z raportów miesięcznych
  - [x] Usunąć możliwość ręcznej edycji godzin (dane tylko z raportów)
  - [x] Dodać link do raportowania godzin jeśli brak danych
- [x] Testowanie i zapisanie checkpointu

## Moduł kosztów stałych i zysk operacyjny (Grudzień 2024)

### Schemat bazy danych
- [ ] Dodać tabelę fixedCosts (id, name, monthlyCost, category, description, createdAt, updatedAt)
- [ ] Uruchomić migrację bazy danych

### Backend - procedury tRPC
- [x] fixedCosts.list - pobieranie wszystkich kosztów stałych
- [x] fixedCosts.create - dodawanie nowego kosztu
- [x] fixedCosts.update - edycja kosztu
- [x] fixedCosts.delete - usuwanie kosztu
- [x] fixedCosts.totalMonthly - suma kosztów stałych miesięcznie

### Frontend - strona FixedCosts.tsx
- [x] Utworzyć stronę /fixed-costs
- [x] Tabela z listą kosztów stałych (nazwa, kategoria, kwota miesięczna, kwota roczna)
- [x] Formularz dodawania nowego kosztu
- [x] Przyciski edycji i usuwania
- [x] Podsumowanie: suma kosztów miesięcznych i rocznych

### Aktualizacja dashboardu
- [x] Dodać kartę "Koszty stałe miesięczne" z sumą kosztów
- [x] Dodać kartę "Zysk operacyjny" (zysk z pracowników - koszty stałe)
- [x] Wyświetlać zysk operacyjny miesięczny i roczny
- [x] Kolorowanie: zielony (zysk > 0), czerwony (strata < 0)

### Routing i nawigacja
- [x] Dodać routing dla /fixed-costs w App.tsx
- [x] Dodać link "Koszty stałe" w nawigacji DashboardLayout
- [x] Dodać link "Koszty stałe" w sekcji "Szybki start" na dashboardzie

### Testowanie
- [x] Przetestować dodawanie, edycję i usuwanie kosztów
- [x] Zweryfikować obliczenia zysku operacyjnego
- [x] Zapisać checkpoint

## Przyciski "Wróć" dla łatwiejszej nawigacji

### Strony wymagające przycisku Wróć
- [x] EmployeeAnnualReport.tsx - dodać przycisk "Wróć do listy pracowników"
- [x] FixedCosts.tsx - dodać przycisk "Wróć do dashboardu"
- [x] EmployeeProfitSimulator.tsx - dodać przycisk "Wróć do dashboardu"
- [x] TimeReporting.tsx - dodać przycisk "Wróć do dashboardu"

### Implementacja
- [x] Użyć useLocation() z wouter do nawigacji
- [x] Umieścić przycisk w lewym górnym rogu (przed nagłówkiem)
- [x] Dodać ikonę ArrowLeft z lucide-react
- [x] Testowanie nawigacji na wszystkich stronach

## Koszt rzeczywisty w raportach rocznych pracowników

### Cel
Dodać możliwość ręcznego wprowadzenia rzeczywistego kosztu pracownika dla danego miesiąca (np. dla B2B rozliczanych godzinowo), przy zachowaniu widoczności kosztu domyślnego z bazy danych.

### Backend - rozszerzenie schematu
- [x] Dodać kolumnę `actualCost` (int, nullable) do tabeli `monthlyEmployeeReports`
- [x] Uruchomić migrację bazy danych

### Backend - procedury tRPC
- [x] Zmodyfikować `employees.getAnnualReport` - zwracać koszt domyślny i koszt rzeczywisty
- [x] Dodać procedurę `employees.updateActualCost(employeeId, year, month, actualCost)` - zapisywanie kosztu rzeczywistego
- [x] Aktualizować logikę obliczeń: jeśli actualCost istnieje → użyj go, jeśli nie → użyj kosztu domyślnego

### Frontend - EmployeeAnnualReport.tsx
- [x] Dodać kolumnę "Koszt domyślny" (read-only, z bazy danych)
- [x] Dodać kolumnę "Koszt rzeczywisty" (edytowalne pole)
- [x] Dodać przyciski edycji (ołówek) przy każdym miesiącu
- [x] Implementować logikę zapisu kosztu rzeczywistego
- [x] Aktualizować obliczenia zysku/straty: użyć actualCost jeśli istnieje, w przeciwnym razie defaultCost

### Testowanie
- [x] Przetestować edycję kosztu rzeczywistego dla wybranego miesiąca
- [x] Zweryfikować że obliczenia zysku używają właściwego kosztu
- [x] Sprawdzić podsumowanie roczne
- [x] Zapisać checkpoint

## Przycisk Wróć na stronie pracowników + Dokładne wyniki miesięczne + Wykres trendów

### Przycisk Wróć
- [ ] Dodać przycisk "Wróć do dashboardu" na stronie Employees.tsx

### Backend - dokładne wyniki miesięczne
- [ ] Utworzyć procedurę `dashboard.getAccurateMonthlyResults(year, month)`
  - [ ] Pobrać wszystkie raporty pracowników dla danego miesiąca z monthlyEmployeeReports
  - [ ] Zsumować przychody (godziny × stawka klienta)
  - [ ] Zsumować koszty (actualCost jeśli istnieje, w przeciwnym razie defaultCost)
  - [ ] Zsumować koszty stałe dla danego miesiąca
  - [ ] Obliczyć zysk operacyjny (przychód - koszty pracowników - koszty stałe)

### Backend - dane do wykresu trendów
- [ ] Utworzyć procedurę `dashboard.getProfitTrends(months = 12)`
  - [ ] Pobrać dane z ostatnich 12 miesięcy
  - [ ] Zwrócić tablicę: [{month, revenue, employeeCosts, fixedCosts, profit}]

### Frontend - Dashboard.tsx
- [ ] Dodać box "Dokładne wyniki miesięczne" z kartami:
  - [ ] Przychód miesięczny (z raportów pracowników)
  - [ ] Koszty pracowników (z raportów)
  - [ ] Koszty stałe
  - [ ] Zysk operacyjny
- [ ] Dodać wykres liniowy trendów (ostatnie 12 miesięcy):
  - [ ] Linia przychodów (niebieska)
  - [ ] Linia kosztów całkowitych (pomarańczowa)
  - [ ] Linia zysku operacyjnego (zielona/czerwona)
  - [ ] Użyć biblioteki recharts lub chart.js

### Testowanie
- [ ] Przetestować przycisk Wróć na stronie pracowników
- [ ] Zweryfikować obliczenia w boxie "Dokładne wyniki"
- [ ] Sprawdzić wykres trendów dla ostatnich 12 miesięcy
- [ ] Zapisać checkpoint

## Nowe funkcje dashboardu (Grudzień 2024)

### Przycisk "Wróć" na stronie Employees
- [x] Dodać przycisk "Wróć do dashboardu" na stronie Employees.tsx (JUŻ ISTNIAŁ)

### Dokładne wyniki miesięczne
- [x] Utworzyć procedurę tRPC `dashboard.getAccurateMonthlyResults`
- [x] Agregować dane z raportów rocznych pracowników (hours × hourlyRateClient)
- [x] Uwzględniać actualCost jeśli wypełniony, w przeciwnym razie defaultCost
- [x] Obliczać zysk operacyjny (przychód - koszty pracowników - koszty stałe)
- [x] Dodać kartę "Dokładne wyniki miesięczne" na dashboardzie
- [x] Wyświetlać: przychód, koszty pracowników, koszty stałe, zysk operacyjny, marżę
- [x] Dodać informację o źródle danych (raport roczny za miesiąc/rok)

### Wykres trendów zysku/straty
- [x] Utworzyć procedurę tRPC `dashboard.getProfitTrends`
- [x] Agregować dane z ostatnich 12 miesięcy
- [x] Zwracać: miesiąc, przychód, koszty pracowników, koszty stałe, całkowite koszty, zysk
- [x] Zainstalować bibliotekę recharts
- [x] Dodać wykres liniowy na dashboardzie
- [x] Wyświetlać 3 linie: przychód (zielony), koszty całkowite (pomarańczowy), zysk operacyjny (niebieski)
- [x] Dodać tooltip z formatowaniem walut
- [x] Dodać legendę

### Testy jednostkowe
- [x] Napisać testy dla `dashboard.getAccurateMonthlyResults`
- [x] Napisać testy dla `dashboard.getProfitTrends`
- [x] Przetestować walidację parametrów
- [x] Przetestować spójność danych między procedurami
- [x] Wszystkie testy przeszły (9/9)

### Poprawki błędów
- [x] Naprawić błędy TypeScript w Simulator.tsx (nieistniejące pola efficiency, multiplierVsManagement)
- [x] Poprawić błąd TypeScript w routers.ts (calculateB2BFromNet zwraca obiekt, nie liczbę)
- [x] Zaktualizować Simulator.tsx aby używał simulation.total.* i simulation.remaining

## Uzupełnienie aplikacji rzetelnymi przykładowymi danymi (Grudzień 2024)

### Utworzenie nowego seedera
- [x] Przygotować rzetelne dane dla software house (12 pracowników)
- [x] Różne typy umów (UoP, B2B, zlecenie, zlecenie studenckie)
- [x] Realistyczne stawki i koszty (70-250 PLN/h)
- [x] 4 klientów i 4 projekty
- [x] Przypisania pracowników do projektów
- [x] Raporty roczne z godzinami za ostatnie 3 miesiące (10, 11, 12/2025)
- [x] 4 koszty stałe (wynajem, oprogramowanie, marketing, księgowość)

### Uruchomienie seedera
- [x] Wyczyścić bazę danych
- [x] Uruchomić nowy seeder (scripts/seedRealistic.ts)
- [x] Zweryfikować poprawność importu

### Poprawki
- [x] Poprawić nazwy kolumn w seederze (hours → hoursWorked, defaultCost → cost)
- [x] Dodać hourlyRateCost do createAssignment
- [x] Poprawić procedurę getAccurateMonthlyResults (pobieranie z monthlyEmployeeReports zamiast timeEntries)

### Weryfikacja
- [x] Sprawdzić dashboard z nowymi danymi
- [x] Sprawdzić kartę "Dokładne wyniki miesięczne" (przychód: 265 870 zł, koszty: 168 123 zł)
- [x] Sprawdzić wykres trendów finansowych
- [x] Zweryfikować obliczenia finansowe

### Finalizacja
- [x] Zapisać checkpoint

## Dodanie wpisów godzinowych do seedera (Grudzień 2024)

### Problem
- [x] Widok "Raportowanie godzin miesięcznych" nie wyświetlał żadnych raportów
- [x] Raporty roczne pracowników były puste
- [x] Seeder tworzył tylko monthlyEmployeeReports, ale nie timeEntries

### Rozwiązanie
- [x] Rozszerzyć seeder o tworzenie szczegółowych wpisów godzinowych (timeEntries)
- [x] Dla każdego pracownika utworzyć wpisy dzień po dniu za ostatnie 3 miesiące (768 wpisów)
- [x] Zsumowane godziny zgadzają się z hoursWorked w monthlyEmployeeReports

### Optymalizacja
- [x] Zoptymalizować procedurę monthlyReports (problem N+1 queries)
- [x] Pobrać wszystkie dane za jednym razem zamiast w pętli
- [x] Użyć Map do szybkiego dostępu do danych

### Weryfikacja
- [x] Sprawdzić widok "Raportowanie godzin miesięcznych" - działa poprawnie
- [x] Sprawdzić historię raportów - 4 miesiące z danymi finansowymi
- [x] Zweryfikować spójność danych - wszystko się zgadza

### Finalizacja
- [x] Zapisać checkpoint

## Przygotowanie aplikacji do wdrożenia na serwerze (Grudzień 2024)

### Dokumentacja deployment
- [x] Utworzyć DEPLOYMENT.md z pełną instrukcją wdrożenia
- [x] Dodać wymagania systemowe i zależności
- [x] Opisać proces instalacji krok po kroku
- [x] Dodać sekcję troubleshooting

### Pliki konfiguracyjne
- [x] Utworzyć Dockerfile dla produkcji
- [x] Utworzyć docker-compose.yml
- [x] Dodać konfigurację nginx (reverse proxy)
- [x] Utworzyć plik ecosystem.config.js dla PM2
- [x] Dodać .env.production.example z przykładowymi zmiennymi

### Skrypty i narzędzia
- [x] Utworzyć skrypt instalacyjny (setup.sh)
- [x] Dodać skrypt do budowania produkcyjnego (build.sh)
- [x] Skrypt migracji bazy danych (pnpm db:push)
- [x] Skrypt seedowania danych (scripts/seedRealistic.ts)

### Dokumentacja konfiguracji
- [x] Opisać wszystkie zmienne środowiskowe (ENV_VARIABLES.md)
- [x] Dodać instrukcję konfiguracji bazy danych MySQL/TiDB
- [x] Opisać konfigurację SSL/HTTPS
- [x] Dodać przykłady konfiguracji dla różnych środowisk

### Finalizacja
- [x] Utworzyć README.md z quick start guide
- [x] Zapisać checkpoint

## Instrukcja deployment na DigitalOcean (Grudzień 2024)

### Dokumentacja zakupu i konfiguracji
- [x] Utworzyć DIGITALOCEAN_SETUP.md z instrukcją zakupu konta
- [x] Dodać instrukcję tworzenia Droplet krok po kroku
- [x] Opisać konfigurację SSH keys
- [x] Dodać konfigurację firewall i security

### Skrypty automatyzacji
- [x] Utworzyć skrypt do-setup.sh dla DigitalOcean
- [x] Dodać automatyczną konfigurację firewall (ufw)
- [x] Dodać automatyczną instalację i konfigurację fail2ban
- [x] Skrypt konfiguracji swap (dla 4GB RAM)

### Instrukcja deployment
- [x] Krok po kroku deployment ProfitFlow na DigitalOcean
- [x] Konfiguracja domeny i DNS
- [x] Instalacja SSL z Let's Encrypt
- [x] Konfiguracja automatycznych backupów

### Finalizacja
- [x] Zapisać checkpoint


## Deployment na standalone server - wyłączenie OAuth (Styczeń 2025)

- [x] Wyłączyć OAuth w server/_core/context.ts - auto-logowanie jako właściciel
- [x] Usunąć redirect do OAuth w client/src/main.tsx
- [ ] Przebudować aplikację (pnpm build)
- [ ] Przetestować dostęp bez logowania na serwerze produkcyjnym
- [ ] Załadować dane testowe (pnpm exec tsx scripts/seedRealistic.ts)
