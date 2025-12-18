# 🎮 System Grywalizacji - Mirit Performance Hub

## 📊 Koncepcja

System motywujący pracowników do osiągania celów finansowych firmy poprzez:
- **Transparentność finansowa** (w ograniczonym zakresie)
- **Cele i wyzwania** (indywidualne i zespołowe)
- **System punktów i odznak**
- **Nagrody za osiągnięcia**
- **Leaderboardy** (z opcją anonimizacji)
- **Dzielenie się zyskiem** za realizację celów

---

## 🎯 Główne Komponenty

### 1. **System Celów Finansowych**

#### Cele Firmowe (ustawiane przez admina):
- **Cel przychodu miesięcznego/rocznego** (np. 500k PLN/miesiąc)
- **Cel zysku** (np. 150k PLN/miesiąc)
- **Cel marży** (np. 30% marży)
- **Cel godzin** (np. 1000h/miesiąc dla całego zespołu)

#### Cele Indywidualne (automatyczne lub ręczne):
- **Cel godzin miesięcznych** (np. 160h)
- **Cel przychodu** (np. 50k PLN/miesiąc)
- **Cel zysku** (np. 15k PLN/miesiąc)
- **Cel marży** (np. 25% marży)

### 2. **System Punktów i Odznak**

#### Punkty za:
- ✅ **Realizacja celów** (100-500 pkt)
- ✅ **Przekroczenie celu** (bonus 50-200 pkt)
- ✅ **Konsekwentna realizacja** (streak bonus)
- ✅ **Wysoka marża** (bonus za efektywność)
- ✅ **Dodatkowe godziny** (powyżej normy)
- ✅ **Ukończenie projektów** (100-300 pkt)
- ✅ **Pozytywne feedbacki od klientów** (50-150 pkt)

#### Odznaki (Badges):
- 🏆 **"Top Performer"** - najwyższy zysk w miesiącu
- ⚡ **"Efficiency Master"** - najwyższa marża
- 📈 **"Growth Champion"** - największy wzrost
- 🎯 **"Goal Crusher"** - 100% realizacja celów przez 3 miesiące
- 💪 **"Consistency King"** - realizacja celów 6 miesięcy z rzędu
- 🌟 **"Team Player"** - pomoc w projektach zespołowych
- 🚀 **"Overachiever"** - przekroczenie celu o 20%+

### 3. **System Nagród**

#### Nagrody Finansowe:
- **Premia za realizację celu firmowego** (np. 5-10% zysku do podziału)
- **Premia indywidualna** za przekroczenie celu (np. 500-2000 PLN)
- **Bonus za streak** (np. 100 PLN za każdy miesiąc z rzędu)

#### Nagrody Niefinansowe:
- **Dodatkowy dzień urlopu**
- **Preferencyjne godziny pracy**
- **Szkolenia/preferencyjne projekty**
- **Gadżety firmowe**
- **Uznanie publiczne** (w aplikacji)

### 4. **Dashboard Pracownika**

#### Widok dla pracownika:
- 📊 **Mój wkład w cele firmowe** (procent realizacji)
- 🎯 **Moje cele indywidualne** (postęp)
- 🏅 **Moje odznaki i osiągnięcia**
- 📈 **Mój ranking** (opcjonalnie anonimowy)
- 💰 **Moja premia** (jeśli cel został osiągnięty)
- 📅 **Historia osiągnięć**

#### Widok dla admina:
- 📊 **Realizacja celów firmowych**
- 👥 **Ranking pracowników**
- 💰 **Kalkulator premii**
- 📈 **Analiza efektywności**
- 🎯 **Zarządzanie celami**

### 5. **Transparentność Finansowa**

#### Co widzi pracownik:
- ✅ **Własne metryki** (godziny, przychód, zysk, marża)
- ✅ **Procent realizacji celów firmowych** (bez konkretnych kwot)
- ✅ **Własny ranking** (pozycja względem innych)
- ✅ **Własną premię** (jeśli przysługuje)
- ❌ **NIE widzi** konkretnych kwot innych pracowników
- ❌ **NIE widzi** szczegółów finansowych firmy

---

## 🗄️ Struktura Bazy Danych

### Nowe tabele:

```sql
-- Cele firmowe
companyGoals (
  id, year, month, goalType (revenue/profit/margin/hours),
  targetValue, achievedValue, status, createdAt, updatedAt
)

-- Cele indywidualne
employeeGoals (
  id, employeeId, year, month, goalType, targetValue,
  achievedValue, status, pointsAwarded, createdAt, updatedAt
)

-- System punktów
employeePoints (
  id, employeeId, points, source (goal_achieved/overachieved/streak/etc),
  description, createdAt
)

-- Odznaki
employeeBadges (
  id, employeeId, badgeType, badgeName, description,
  earnedAt, createdAt
)

-- Nagrody
employeeRewards (
  id, employeeId, rewardType (bonus/vacation_day/etc),
  amount (dla bonusów), description, status (pending/paid),
  awardedAt, paidAt, createdAt
)

-- Leaderboard (cache)
employeeLeaderboard (
  id, employeeId, year, month, rank, points, revenue, profit, margin,
  updatedAt
)
```

---

## 🎨 Interfejs Użytkownika

### Strona główna dla pracownika:
1. **Karta "Moje Cele"**
   - Postęp w realizacji celów (progress bars)
   - Pozostało do osiągnięcia celu
   - Deadline

2. **Karta "Mój Wkład w Firmę"**
   - Procent realizacji celów firmowych
   - "Twój wkład: 12% do celu przychodu"
   - Wizualizacja (np. koło postępu)

3. **Karta "Moje Osiągnięcia"**
   - Ostatnie odznaki
   - Aktualne punkty
   - Ranking (opcjonalnie)

4. **Karta "Moja Premia"**
   - Status premii (jeśli cel osiągnięty)
   - Kwota (jeśli przysługuje)
   - Historia premii

### Strona dla admina:
1. **Zarządzanie celami firmowymi**
2. **Ranking pracowników**
3. **Kalkulator premii**
4. **Przydzielanie nagród**

---

## 💡 Przykładowe Scenariusze

### Scenariusz 1: Cel Firmowy
- **Admin ustawia:** Cel przychodu 500k PLN w styczniu
- **System oblicza:** Każdy pracownik widzi swój % wkładu
- **Po osiągnięciu:** Premia 10k PLN do podziału proporcjonalnie
- **Pracownik widzi:** "Twój wkład: 15% → Premia: 1500 PLN"

### Scenariusz 2: Cel Indywidualny
- **System automatycznie ustawia:** Cel 160h w styczniu
- **Pracownik osiąga:** 175h
- **Nagrody:**
  - 200 pkt za realizację celu
  - 50 pkt bonus za przekroczenie
  - Odznaka "Overachiever"
  - Premia 500 PLN

### Scenariusz 3: Streak
- **Pracownik realizuje cele:** 3 miesiące z rzędu
- **Nagrody:**
  - Odznaka "Goal Crusher"
  - Bonus streak: 300 PLN
  - 100 pkt za konsekwencję

---

## 🔒 Bezpieczeństwo i Prywatność

1. **Pracownicy NIE widzą:**
   - Konkretnych kwot innych pracowników
   - Szczegółów finansowych firmy
   - Pełnych danych innych pracowników

2. **Pracownicy widzą:**
   - Własne metryki
   - Własny ranking (pozycja)
   - Procent wkładu w cele firmowe
   - Własne nagrody

3. **Opcja anonimizacji:**
   - Leaderboard może pokazywać tylko pozycje bez imion
   - "Jesteś na pozycji #3 z 15 pracowników"

---

## 🚀 Implementacja - Fazy

### Faza 1: Podstawy (2-3 tygodnie)
- [ ] Tabele w bazie danych
- [ ] System celów firmowych (admin)
- [ ] Dashboard pracownika z celami
- [ ] Podstawowe obliczenia punktów

### Faza 2: System punktów i odznak (2 tygodnie)
- [ ] Automatyczne przyznawanie punktów
- [ ] System odznak
- [ ] Leaderboard
- [ ] Historia osiągnięć

### Faza 3: Nagrody i premie (2 tygodnie)
- [ ] Kalkulator premii
- [ ] System nagród
- [ ] Integracja z płatnościami
- [ ] Powiadomienia

### Faza 4: Zaawansowane funkcje (opcjonalnie)
- [ ] Wyzwania zespołowe
- [ ] Integracja z feedbackami klientów
- [ ] Gamifikacja projektów
- [ ] Mobile app

---

## 📈 Metryki Sukcesu

- **Wzrost efektywności:** Średnia marża pracowników
- **Realizacja celów:** % pracowników osiągających cele
- **Zaangażowanie:** Częstotliwość logowań do aplikacji
- **Retention:** Zmniejszenie rotacji pracowników
- **Satysfakcja:** Feedback od pracowników

---

## 💰 Budżet Premii (Przykład)

### Miesięczny budżet: 10-15% zysku operacyjnego
- **50%** - Premie za cele firmowe (do podziału)
- **30%** - Premie indywidualne za przekroczenie celów
- **20%** - Nagrody niefinansowe i bonusy streak

### Przykład:
- Zysk miesięczny: 100k PLN
- Budżet premii: 12k PLN (12%)
- Premia za cel firmowy: 6k PLN
- Premie indywidualne: 3.6k PLN
- Nagrody niefinansowe: 2.4k PLN

---

## 🎯 Korzyści

### Dla Pracowników:
- ✅ Transparentność i sprawiedliwość
- ✅ Motywacja do osiągania celów
- ✅ Nagrody za wysiłek
- ✅ Rozwój i uznanie

### Dla Firmy:
- ✅ Wzrost efektywności
- ✅ Lepsze osiąganie celów finansowych
- ✅ Zwiększona przynależność
- ✅ Redukcja rotacji
- ✅ Lepsza komunikacja celów

---

## 🔄 Integracja z Istniejącym Systemem

System wykorzystuje istniejące dane:
- `monthlyEmployeeReports` - dla metryk
- `timeEntries` - dla godzin
- `employeeProjectAssignments` - dla projektów
- `employees` - dla danych pracowników

**Nie wymaga dodatkowych danych wejściowych od pracowników!**


