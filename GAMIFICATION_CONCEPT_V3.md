# 🎮 System Grywalizacji - Mirit Performance Hub (Wersja 3.0)
## Wersja oparta na godzinach i weryfikowalnych danych

---

## 🎯 Główne Założenia

### ✅ **CO DZIAŁA:**
- System oparty na **rzeczywistych godzinach** z `timeEntries`
- Wszystko **weryfikowalne** - dane z systemu, nie subiektywne oceny
- **Proste i przejrzyste** - oparte na danych, które już mamy
- **Motywacja do rozłożenia urlopów** - nagrody za planowanie

### ❌ **CO USUWAMY:**
- Subiektywne weryfikacje ("ukończenie bez błędów")
- Trudne do zweryfikowania ("pomaganie komuś")
- Deadline'y projektów (nie mamy ich)
- Cele jakościowe (nie można zweryfikować)

---

## 🎮 System Punktów - Oparty na Godzinach

### 1. **Punkty za Godziny Indywidualne**

#### Podstawowe punkty:
- **1 punkt = 1 godzina zaraportowana** (podstawa)
- **Bonus za przekroczenie normy:**
  - Norma: 160h/miesiąc
  - 160-180h: +0.5 pkt za każdą godzinę powyżej 160h
  - 180-200h: +1 pkt za każdą godzinę powyżej 180h
  - 200h+: +1.5 pkt za każdą godzinę powyżej 200h

#### Przykład:
```
Jan zaraportował 175h w styczniu:
- 160h × 1 pkt = 160 pkt (podstawa)
- 15h × 0.5 pkt = 7.5 pkt (bonus)
─────────────────────────────
Suma: 167.5 pkt
```

#### Bonus za konsekwencję (streak):
- **3 miesiące z rzędu ≥160h:** +50 pkt bonus
- **6 miesięcy z rzędu ≥160h:** +150 pkt bonus
- **12 miesięcy z rzędu ≥160h:** +300 pkt bonus + badge "Consistency Master"

### 2. **Punkty za Cele Grupowe (Zespołowe)**

#### Cel Grupowy - Godziny:
- **Admin ustawia:** "Zespół ma zrealizować 2000h w styczniu"
- **System śledzi:** Suma godzin wszystkich pracowników
- **Po osiągnięciu:** Wszyscy dostają bonusowe punkty

#### Podział punktów za cel grupowy:
- **Równy podział:** Wszyscy dostają tę samą kwotę punktów
- **Lub proporcjonalnie:** Do wkładu w cel (ale bez ujawniania konkretnych godzin innych)

#### Przykład:
```
Cel: 2000h w styczniu
Osiągnięto: 2100h
Nagroda: 500 pkt do podziału

Opcja 1 (równo): Wszyscy dostają 500 pkt
Opcja 2 (proporcjonalnie): 
  - Jan (175h) → 175/2100 × 500 = 42 pkt
  - Anna (200h) → 200/2100 × 500 = 48 pkt
  - (ale Jan nie widzi, że Anna ma więcej)
```

### 3. **Punkty za Cel Firmowy (Cała Firma)**

#### Cel Firmowy - Godziny:
- **Admin ustawia:** "Firma ma zrealizować 5000h w kwartale"
- **System śledzi:** Suma godzin wszystkich pracowników
- **Po osiągnięciu:** Wszyscy dostają bonusowe punkty + premia finansowa

#### Nagrody za cel firmowy:
- **Punkty:** 100-500 pkt (zależnie od wielkości celu)
- **Premia finansowa:** Równa dla wszystkich lub proporcjonalna do poziomu
- **Badge:** "Team Champion" dla wszystkich

---

## 📅 System Motywacji do Rozłożenia Urlopów

### Problem:
- Pracownik bierze cały urlop ciągiem (np. 3 tygodnie) → problem dla firmy
- Kilku pracowników bierze urlop jednocześnie → duży problem

### Rozwiązanie - System Planowania Urlopów:

#### 1. **Nagroda za Planowanie Z Wyprzedzeniem**
- **Urlop zaplanowany 3+ miesiące wcześniej:** +20 pkt
- **Urlop zaplanowany 2 miesiące wcześniej:** +10 pkt
- **Urlop zaplanowany 1 miesiąc wcześniej:** +5 pkt
- **Urlop zaplanowany <1 miesiąc:** 0 pkt (brak kary, ale brak nagrody)

#### 2. **Nagroda za Rozłożenie Urlopu**
- **Urlop rozłożony na kilka dni (np. 5 dni w 2-3 częściach):** +30 pkt
- **Urlop ciągły 1-2 tygodnie:** 0 pkt (brak kary)
- **Urlop ciągły 3+ tygodnie:** -50 pkt (kara, ale tylko jeśli to możliwe)

#### 3. **Nagroda za Unikanie Konfliktów**
- **Pracownik planuje urlop, gdy nikt inny nie ma:** +15 pkt
- **System pokazuje:** "Dostępne terminy" (gdy mniej ludzi na urlopie)
- **Pracownik wybiera termin z mniejszym obciążeniem:** +10 pkt

#### 4. **Kara za Konflikt (Opcjonalnie)**
- **Kilku pracowników jednocześnie na urlopie (3+):** -20 pkt dla każdego
- **Ale tylko jeśli:** Admin ustawi limit (np. max 2 osoby jednocześnie)

#### 5. **Badge za Dobrą Praktykę**
- **"Smart Planner"** - Planujesz urlopy z wyprzedzeniem i rozłożone
- **"Team Player"** - Unikasz konfliktów z innymi
- **"Flexible"** - Dostosowujesz się do potrzeb zespołu

### Interfejs Planowania Urlopów:
```
┌─────────────────────────────────────┐
│  📅 Planowanie Urlopu               │
│                                     │
│  Wybierz daty: [____] - [____]      │
│                                     │
│  💡 Wskazówki:                      │
│  ✅ Planujesz 3 miesiące wcześniej  │
│     → +20 pkt                       │
│  ✅ Rozłożony urlop (5 dni)         │
│     → +30 pkt                       │
│  ✅ Termin z małym obciążeniem      │
│     → +10 pkt                       │
│                                     │
│  📊 Obciążenie w tym terminie:      │
│  [Wizualizacja kalendarza]          │
│  🟢 Niskie (1 osoba)                │
│  🟡 Średnie (2 osoby)               │
│  🔴 Wysokie (3+ osoby)               │
└─────────────────────────────────────┘
```

---

## 💡 System Nagród za Innowacje

### Problem: Jak zweryfikować "wprowadzenie nowego rozwiązania"?

### Rozwiązanie - Opieramy się na Bazie Wiedzy:

#### 1. **Punkty za Artykuły w Bazie Wiedzy**
- **Pracownik dodaje artykuł do bazy wiedzy:**
  - Artykuł techniczny (rozwiązanie problemu): +50 pkt
  - Artykuł procesowy (ulepszenie procesu): +40 pkt
  - Artykuł szkoleniowy (dokumentacja): +30 pkt
  - Notatka/poradnik: +20 pkt

#### 2. **Punkty za Popularność Artykułu**
- **Artykuł ma 10+ wyświetleń:** +10 pkt
- **Artykuł ma 25+ wyświetleń:** +25 pkt
- **Artykuł ma 50+ wyświetleń:** +50 pkt
- **Artykuł ma 100+ wyświetleń:** +100 pkt + badge "Knowledge Hero"

#### 3. **Punkty za Komentarze i Dyskusje**
- **Ktoś skomentował twój artykuł:** +5 pkt za komentarz
- **Ktoś dodał link do twojego artykułu:** +10 pkt
- **Twój artykuł został oznaczony jako ulubiony:** +15 pkt

#### 4. **Badge za Wiedzę**
- **"Knowledge Contributor"** - Dodałeś 5+ artykułów
- **"Knowledge Hero"** - Twój artykuł ma 100+ wyświetleń
- **"Problem Solver"** - Dodałeś rozwiązanie problemu technicznego
- **"Process Innovator"** - Dodałeś ulepszenie procesu

#### 5. **Weryfikacja przez Admina (Opcjonalnie)**
- **Admin może oznaczyć artykuł jako "Innowacja":** +100 pkt bonus
- **Admin może oznaczyć artykuł jako "Kluczowe rozwiązanie":** +200 pkt + badge "Innovation Master"

### Przykład:
```
Jan dodaje artykuł "Jak zoptymalizować deployment"
→ +50 pkt (artykuł techniczny)
→ Po 2 tygodniach: 35 wyświetleń → +25 pkt
→ 5 komentarzy → +25 pkt
→ Admin oznacza jako "Innowacja" → +100 pkt
─────────────────────────────────────────────
Suma: 200 pkt + badge "Knowledge Contributor"
```

---

## 🎯 System Questów (Uproszczony)

### Questy oparte tylko na godzinach:

#### Questy Indywidualne:
- 🎯 **"Konsystencja"** - Zaraportuj 160h w miesiącu → 200 pkt
- 🎯 **"Dedication"** - Zaraportuj 180h+ w miesiącu → 300 pkt
- 🎯 **"Overachiever"** - Zaraportuj 200h+ w miesiącu → 500 pkt
- 🎯 **"Streak Master"** - 3 miesiące z rzędu ≥160h → 150 pkt + badge
- 🎯 **"Quarter Champion"** - 480h+ w kwartale → 1000 pkt + badge

#### Questy Zespołowe:
- 🎯 **"Team Goal"** - Zespół zrealizował X godzin → Wszyscy dostają Y pkt
- 🎯 **"Quarter Goal"** - Firma zrealizowała X godzin w kwartale → Wszyscy dostają Y pkt + premia

#### Questy za Innowacje:
- 🎯 **"Knowledge Contributor"** - Dodaj 3 artykuły do bazy wiedzy → 150 pkt + badge
- 🎯 **"Problem Solver"** - Dodaj rozwiązanie problemu → 100 pkt
- 🎯 **"Process Innovator"** - Dodaj ulepszenie procesu → 120 pkt

---

## 🏆 System Badges (Zaktualizowany)

### Badges za Godziny:
- ⏰ **"Consistent"** - 3 miesiące z rzędu ≥160h
- 🔥 **"Streak Master"** - 6 miesięcy z rzędu ≥160h
- 💪 **"Dedication Hero"** - 12 miesięcy z rzędu ≥160h
- 🚀 **"Overachiever"** - 200h+ w miesiącu
- 📊 **"Quarter Champion"** - 480h+ w kwartale
- ⭐ **"Year Champion"** - 1920h+ w roku (160h × 12)

### Badges za Planowanie:
- 📅 **"Smart Planner"** - Planujesz urlopy z wyprzedzeniem
- 🤝 **"Team Player"** - Unikasz konfliktów z urlopami
- 🎯 **"Flexible"** - Dostosowujesz się do potrzeb zespołu

### Badges za Wiedzę:
- 📚 **"Knowledge Contributor"** - 5+ artykułów w bazie wiedzy
- 🌟 **"Knowledge Hero"** - Artykuł z 100+ wyświetleń
- 💡 **"Problem Solver"** - Rozwiązanie problemu technicznego
- 🔧 **"Process Innovator"** - Ulepszenie procesu
- 🏆 **"Innovation Master"** - Admin oznaczył jako innowację

### Badges Zespołowe:
- 🤝 **"Team Champion"** - Zespół osiągnął cel godzinowy
- 🎯 **"Company Champion"** - Firma osiągnęła cel kwartalny

---

## 📊 Dashboard Pracownika (Zaktualizowany)

### Karta 1: "Moje Godziny i Punkty"
```
┌─────────────────────────────────────┐
│  📊 Styczeń 2025                    │
│  Zaraportowane godziny: 175h        │
│  Punkty: 167.5 pkt                  │
│                                     │
│  [Progress Bar: 175/160h]           │
│  ✅ Cel osiągnięty!                  │
│                                     │
│  Bonusy:                            │
│  ✅ +7.5 pkt (przekroczenie normy)  │
│  ✅ +50 pkt (streak 3 miesiące)     │
└─────────────────────────────────────┘
```

### Karta 2: "Moje Questy"
```
┌─────────────────────────────────────┐
│  🎯 Aktywne Questy                  │
│  ✅ "Konsystencja" - Zrealizowane!  │
│  🎯 "Dedication" - 175/180h         │
│  📚 "Knowledge Contributor" - 2/3  │
└─────────────────────────────────────┘
```

### Karta 3: "Cele Zespołowe"
```
┌─────────────────────────────────────┐
│  🤝 Cel Zespołowy: 2000h            │
│  Postęp: ████████░░ 80%             │
│  Twój wkład: 175h ✅                │
│  Status: "Prawie tam!"              │
└─────────────────────────────────────┘
```

### Karta 4: "Planowanie Urlopów"
```
┌─────────────────────────────────────┐
│  📅 Moje Urlopy                     │
│  Zaplanowane: 5 dni (luty)          │
│  ✅ +20 pkt (planowanie 3m wcześniej)│
│  ✅ +30 pkt (rozłożony)             │
│  ✅ +10 pkt (termin z małym obciąż.) │
│                                     │
│  💡 Wskazówka:                      │
│  Planuj urlopy z wyprzedzeniem!     │
└─────────────────────────────────────┘
```

### Karta 5: "Moje Innowacje"
```
┌─────────────────────────────────────┐
│  💡 Artykuły w Bazie Wiedzy         │
│  "Optymalizacja deployment"         │
│  👁️ 35 wyświetleń → +25 pkt        │
│  💬 5 komentarzy → +25 pkt          │
│  ⭐ Oznaczony jako innowacja → +100  │
└─────────────────────────────────────┘
```

### Karta 6: "Moje Nagrody" (Prywatna)
```
┌─────────────────────────────────────┐
│  💰 Moje Premie                     │
│  Quest "Konsystencja": 500 PLN      │
│  Cel zespołowy: 800 PLN             │
│  ─────────────────────────          │
│  Suma: 1,300 PLN                    │
└─────────────────────────────────────┘
```

---

## 🗄️ Struktura Bazy Danych (Zaktualizowana)

```sql
-- Poziomy pracowników
employeeLevels (
  id, employeeId, level, points, totalPoints,
  updatedAt
)

-- System punktów (historia)
employeePoints (
  id, employeeId, points, source (hours/quest/team_goal/innovation/vacation_planning),
  description, month, year, createdAt
)

-- Questy (wyzwania)
quests (
  id, name, description, type (individual/team/company),
  targetType (hours/knowledge_base),
  targetValue, rewardPoints, rewardBadgeId,
  startDate, endDate, createdAt
)

-- Przypisane questy
employeeQuests (
  id, employeeId, questId, status (active/completed/failed),
  progress, completedAt, createdAt
)

-- Badges (odznaki)
badges (
  id, name, description, icon, category,
  createdAt
)

-- Otrzymane badges
employeeBadges (
  id, employeeId, badgeId, earnedAt, createdAt
)

-- Nagrody (premie)
employeeRewards (
  id, employeeId, rewardType (quest/team_goal/company_goal/streak),
  amount, description, status (pending/paid),
  awardedAt, paidAt, createdAt
)

-- Cele zespołowe/firmowe (tylko godziny)
teamGoals (
  id, name, description, targetHours, currentHours,
  status, startDate, endDate, createdAt
)

-- Planowanie urlopów (dla punktów)
vacationPlans (
  id, employeeId, startDate, endDate,
  plannedMonthsAhead, isSplit, conflictLevel,
  pointsAwarded, createdAt
)

-- Punkty za innowacje (baza wiedzy)
knowledgeBasePoints (
  id, employeeId, knowledgeBaseId, points,
  reason (article_created/views/comments/innovation),
  createdAt
)
```

---

## 🎯 Przykładowe Scenariusze

### Scenariusz 1: Punkty za Godziny
```
Jan zaraportował 175h w styczniu:
- 160h × 1 pkt = 160 pkt
- 15h × 0.5 pkt = 7.5 pkt
- Streak 3 miesiące = +50 pkt
─────────────────────────────
Suma: 217.5 pkt
Poziom: 4 (6,234 / 10,000 pkt)
```

### Scenariusz 2: Cel Zespołowy
```
Cel: 2000h w styczniu
Osiągnięto: 2100h
Nagroda: 500 pkt do podziału

Jan (175h) → 175/2100 × 500 = 42 pkt
Anna (200h) → 200/2100 × 500 = 48 pkt
(Jan widzi tylko swoje 42 pkt)
```

### Scenariusz 3: Planowanie Urlopu
```
Jan planuje urlop na luty (3 miesiące wcześniej):
- 5 dni rozłożonych na 2 części
- Termin z małym obciążeniem (1 osoba)
─────────────────────────────
+20 pkt (planowanie)
+30 pkt (rozłożony)
+10 pkt (małe obciążenie)
─────────────────────────────
Suma: +60 pkt
```

### Scenariusz 4: Innowacja
```
Jan dodaje artykuł "Optymalizacja deployment":
- +50 pkt (artykuł techniczny)
- Po 2 tygodniach: 35 wyświetleń → +25 pkt
- 5 komentarzy → +25 pkt
- Admin oznacza jako "Innowacja" → +100 pkt
─────────────────────────────
Suma: 200 pkt + badge "Knowledge Contributor"
```

---

## 🔒 Bezpieczeństwo (Bez Zmian)

- Pracownicy widzą tylko swoje dane
- Premie prywatne
- Brak porównań finansowych
- Cele zespołowe bez konkretnych kwot innych

---

## 🚀 Implementacja - Priorytety

### Faza 1: Podstawy (2-3 tygodnie)
- [ ] System punktów za godziny
- [ ] System poziomów
- [ ] Podstawowe questy (godziny)
- [ ] Dashboard pracownika

### Faza 2: Cele i Planowanie (2 tygodnie)
- [ ] Cele zespołowe/firmowe
- [ ] System planowania urlopów
- [ ] Punkty za planowanie
- [ ] Badges

### Faza 3: Innowacje (1-2 tygodnie)
- [ ] Integracja z bazą wiedzy
- [ ] Punkty za artykuły
- [ ] System weryfikacji przez admina

### Faza 4: Nagrody (1 tydzień)
- [ ] System premii
- [ ] Kalkulator nagród
- [ ] Powiadomienia

---

## 📊 Metryki Sukcesu

- **Realizacja godzin:** Średnia godzin na pracownika
- **Planowanie urlopów:** % urlopów zaplanowanych z wyprzedzeniem
- **Innowacje:** Liczba artykułów w bazie wiedzy
- **Zaangażowanie:** Częstotliwość logowań
- **Satysfakcja:** Feedback od pracowników

---

**To podejście jest oparte na weryfikowalnych danych i eliminuje subiektywne oceny!** 🎉


