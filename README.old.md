# ProfitFlow - System zarządzania finansami firmy

**ProfitFlow** to kompleksowa aplikacja webowa MVP do zarządzania finansami firmy outsourcingowej. System umożliwia śledzenie kosztów pracowników, zarządzanie projektami, analizę rentowności oraz symulację wypłat dla właściciela firmy.

## 🚀 Funkcjonalności MVP

### ✅ Dashboard z KPI
- Wyświetlanie kluczowych wskaźników finansowych w czasie rzeczywistym
- Całkowity przychód, koszty pracowników, zysk operacyjny, koszty stałe
- Przejrzyste karty z podsumowaniem finansowym
- Szybki dostęp do najważniejszych funkcji

### ✅ Moduł Pracownicy
- Lista wszystkich pracowników z filtrowaniem
- Dodawanie, edycja i usuwanie pracowników
- Obsługa różnych typów umów: UoP, B2B, Zlecenie, Zlecenie studenckie
- Automatyczne obliczanie kosztów pracodawcy
- Zarządzanie statusem aktywności pracowników

### ✅ Moduł Projekty
- Zarządzanie projektami klientów
- Wsparcie dla modeli rozliczeniowych: Time & Material oraz Fixed Price
- Śledzenie statusu projektów (planowanie, aktywny, wstrzymany, zakończony)
- Przypisywanie budżetów do projektów

### ✅ Symulator wypłaty właściciela
- Interaktywny kalkulator wypłaty na podstawie zysku firmy
- Regulacja procentu zysku do wypłaty (10-100%)
- Porównanie z wynagrodzeniem zarządu (mnożnik)
- Obliczanie efektywności podatkowej
- Zapisywanie scenariuszy symulacji
- Rekomendacje oparte na analizie finansowej

### ✅ Kalkulator wynagrodzeń
- Automatyczne obliczenia dla różnych typów umów
- UoP: składki ZUS, podatek, koszt pracodawcy
- B2B: podatek liniowy, ZUS, efektywność
- Zlecenia: uproszczone obliczenia podatkowe

## 📋 Wymagania systemowe

- **Node.js** 18.x lub nowszy
- **pnpm** (menedżer pakietów)
- **MySQL** 8.0+ lub kompatybilna baza danych
- Przeglądarka internetowa (Chrome, Firefox, Safari, Edge)

## 🛠️ Instalacja lokalna

### 1. Sklonuj repozytorium (lub rozpakuj archiwum)

```bash
cd profitflow
```

### 2. Zainstaluj zależności

```bash
pnpm install
```

### 3. Skonfiguruj bazę danych

Upewnij się, że masz dostęp do bazy danych MySQL. Zmienna `DATABASE_URL` powinna być już skonfigurowana w środowisku.

### 4. Uruchom migracje bazy danych

```bash
pnpm db:push
```

Ta komenda wygeneruje i wykona migracje, tworząc wszystkie wymagane tabele.

### 5. (Opcjonalnie) Załaduj dane testowe

Aby wypełnić bazę przykładowymi danymi (pracownicy, klienci, projekty, koszty):

```bash
pnpm exec tsx seed.mjs
```

Dane testowe zawierają:
- 4 pracowników (różne typy umów)
- 3 klientów
- 3 projekty
- 5 kosztów stałych (w tym wynagrodzenia zarządu)

### 6. Uruchom serwer deweloperski

```bash
pnpm dev
```

Aplikacja będzie dostępna pod adresem: **http://localhost:3000**

## 🎯 Pierwsze kroki

1. **Zaloguj się** - Kliknij przycisk "Zaloguj się" na stronie głównej
2. **Przeglądaj Dashboard** - Zobacz podsumowanie finansowe firmy
3. **Zarządzaj pracownikami** - Przejdź do zakładki "Zarządzaj pracownikami"
4. **Dodaj projekty** - Utwórz projekty dla swoich klientów
5. **Symuluj wypłatę** - Użyj symulatora do obliczenia optymalnej wypłaty właściciela

## 📊 Struktura bazy danych

Aplikacja wykorzystuje następujące główne tabele:

- **users** - Użytkownicy systemu (autentykacja)
- **employees** - Pracownicy firmy
- **clients** - Klienci
- **projects** - Projekty
- **employeeProjectAssignments** - Przypisania pracowników do projektów
- **timeEntries** - Wpisy czasu pracy
- **projectRevenues** - Przychody z projektów
- **vacations** - Urlopy pracowników
- **fixedCosts** - Koszty stałe firmy
- **ownerSalarySimulations** - Zapisane symulacje wypłat

## 🔧 Stack technologiczny

### Backend
- **Node.js** + **Express** - Serwer aplikacji
- **tRPC** - Type-safe API
- **Drizzle ORM** - Zarządzanie bazą danych
- **MySQL** - Baza danych
- **Zod** - Walidacja danych

### Frontend
- **React 19** - Framework UI
- **TypeScript** - Typowanie
- **Tailwind CSS 4** - Stylowanie
- **shadcn/ui** - Komponenty UI
- **Wouter** - Routing
- **TanStack Query** - Zarządzanie stanem

## 📝 Kluczowe pliki projektu

```
profitflow/
├── client/                    # Frontend aplikacji
│   ├── src/
│   │   ├── pages/            # Strony aplikacji
│   │   │   ├── Dashboard.tsx # Dashboard z KPI
│   │   │   ├── Employees.tsx # Zarządzanie pracownikami
│   │   │   ├── Projects.tsx  # Zarządzanie projektami
│   │   │   └── Simulator.tsx # Symulator wypłaty
│   │   ├── components/       # Komponenty UI
│   │   ├── lib/trpc.ts       # Klient tRPC
│   │   └── App.tsx           # Routing
├── server/                    # Backend aplikacji
│   ├── routers.ts            # Procedury tRPC
│   ├── db.ts                 # Helpery bazy danych
│   ├── salaryCalculator.ts  # Kalkulator wynagrodzeń
│   └── _core/                # Infrastruktura
├── drizzle/                   # Schemat bazy danych
│   └── schema.ts             # Definicje tabel
├── seed.mjs                   # Seeder danych testowych
└── package.json              # Zależności projektu
```

## 💡 Wskazówki użytkowania

### Dodawanie pracowników
1. Przejdź do zakładki "Pracownicy"
2. Kliknij "Dodaj pracownika"
3. Wypełnij formularz (imię, nazwisko, typ umowy, wynagrodzenia)
4. System automatycznie obliczy koszty pracodawcy

### Symulacja wypłaty właściciela
1. Przejdź do "Symulator wypłaty"
2. Wprowadź dostępny zysk (lub użyj wartości z dashboardu)
3. Wprowadź łączne wynagrodzenie zarządu
4. Przesuń suwak, aby wybrać procent zysku do wypłaty
5. Zobacz obliczoną kwotę netto i pozostały zysk
6. Zapisz symulację dla przyszłego odniesienia

### Zarządzanie projektami
1. Najpierw dodaj klientów (jeśli nie istnieją)
2. Utwórz projekt przypisany do klienta
3. Wybierz model rozliczenia (T&M lub Fixed Price)
4. Określ budżet i status projektu

## 🔐 Bezpieczeństwo

- Wszystkie procedury tRPC wymagające danych finansowych są chronione (`protectedProcedure`)
- Autentykacja oparta na Manus OAuth
- Sesje użytkowników zarządzane przez bezpieczne ciasteczka HTTP-only
- Walidacja danych wejściowych za pomocą Zod

## 🚀 Deployment

### Budowanie produkcyjne

```bash
pnpm build
```

### Uruchomienie w trybie produkcyjnym

```bash
pnpm start
```

## 📈 Roadmapa (Post-MVP)

Funkcje planowane w przyszłych wersjach:

- **Moduł fakturowania** - Generowanie faktur dla klientów
- **Zaawansowane raporty** - Eksport do PDF/Excel, wykresy rentowności
- **Time tracking** - Szczegółowe śledzenie czasu pracy
- **Integracje** - Fakturownia, InFakt, systemy księgowe
- **Budżetowanie projektów** - Planowanie i śledzenie budżetów
- **Aplikacja mobilna** - Time tracking w wersji mobilnej
- **Multi-company** - Zarządzanie wieloma firmami

## 🐛 Znane ograniczenia MVP

- Dashboard pokazuje uproszczone obliczenia przychodów (20% marża na kosztach pracowników)
- Brak zaawansowanych raportów i wykresów
- Brak eksportu danych do CSV/Excel
- Brak modułu fakturowania
- Brak szczegółowego time trackingu

## 📞 Wsparcie

W przypadku pytań lub problemów:
- Sprawdź dokumentację w kodzie źródłowym
- Przejrzyj pliki w katalogu `server/` i `client/src/`
- Sprawdź logi serwera w konsoli

## 📄 Licencja

MIT License - Projekt stworzony jako MVP dla firmy Mirit.

---

**Wersja:** 1.0.0 (MVP)  
**Data:** Grudzień 2024  
**Autor:** System ProfitFlow
