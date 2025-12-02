# Wyniki testu aktualizacji składek ZUS i podatku dla UoP

## Data testu: 2025-12-01

### Parametry testowe
- Wynagrodzenie brutto: 10 000,00 zł
- Typ umowy: Umowa o pracę (UoP)

### Wyniki z systemu (po aktualizacji)

**Szczegółowy rozkład kosztów:**
- Wynagrodzenie brutto: 10 000,00 zł
- Składki ZUS pracownika (13.71%): -1 371,00 zł
- Składki ZUS pracodawcy (17.93%): -1 793,00 zł
- **Składka zdrowotna (7.77%): -670,47 zł** ✅
- **Zaliczka na PIT (7.05%): -605,34 zł** ❌

**Wynagrodzenie pracownika:**
- Brutto: 10 000,00 zł
- Składki ZUS pracownika: 1 371,00 zł
- Podatek: 605,34 zł
- Składka zdrowotna: 670,47 zł
- **Netto na rękę: 7 353,19 zł** ❌

**Koszty firmy:**
- Koszt miesięczny: 11 793,00 zł ✅
- Koszt godzinowy: 70,20 zł/h

### Oczekiwane wartości (według nowych stawek 2024/2025)

**Obliczenia ręczne:**
- Brutto: 10 000,00 zł
- ZUS pracownika (13.71%): 1 371,00 zł
- Podstawa opodatkowania: 8 629,00 zł
- **Składka zdrowotna (7.77%): 670,47 zł** ✅
- **Zaliczka na PIT (7.05%): 608,34 - 300 = 308,34 zł** 
- **Netto na rękę: 7 650,18 zł**

### Status

❌ **BŁĄD: System nadal pokazuje stare wartości podatku**

**Problem:**
- Składka zdrowotna: ✅ Prawidłowo (670,47 zł = 7.77%)
- Etykiety: ✅ Zaktualizowane (7.77%, 7.05%)
- **Podatek: ❌ Błędna wartość (605,34 zł zamiast 308,34 zł)**
- **Netto: ❌ Błędna wartość (7 353,19 zł zamiast 7 650,18 zł)**

**Różnica:**
- Podatek: 605,34 - 308,34 = **297,00 zł za dużo**
- Netto: 7 650,18 - 7 353,19 = **296,99 zł za mało**

### Kod zaktualizowany w plikach:
1. ✅ `server/salaryCalculator.ts` - funkcja `calculateUOP` (7.77%, 7.05%, 17.93%)
2. ✅ `server/employeeProfitCalculator.ts` - sekcja UoP (7.77%, 7.05%)
3. ✅ `client/src/pages/EmployeeProfitSimulator.tsx` - etykiety (7.77%, 7.05%)

### Hipoteza
Wartość 605,34 zł sugeruje że gdzieś w kodzie jest jeszcze obliczenie używające starej stawki ~7% lub istnieje problem z cache.

Wartość 605,34 zł = 8629 zł * 0.0705 - 300 zł ≈ 308,34 zł (prawidłowo)
Ale system pokazuje 605,34 zł, co odpowiada: 8629 zł * 0.12 - 300 zł = 1035,48 - 300 = 735,48 zł (nie zgadza się)

Lub: 8629 zł * ~0.105 = 905,34 zł - 300 = 605,34 zł (możliwe że gdzieś jest 10.5%)
