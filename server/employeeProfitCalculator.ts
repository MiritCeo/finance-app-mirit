/**
 * Employee Profit Calculator
 * Oblicza zysk z pracownika uwzględniając płatne urlopy i rzeczywiste koszty
 */

const MONTHLY_WORKING_HOURS = 168; // Standardowe godziny miesięcznie
const WORKING_DAYS_PER_MONTH = 21; // Dni robocze w miesiącu
const HOURS_PER_DAY = 8; // Godziny pracy dziennie

/**
 * Oblicza koszt godzinowy pracownika uwzględniając płatne urlopy
 * @param monthlyCostTotal Całkowity koszt miesięczny w groszach
 * @param vacationDaysPerYear Dni urlopu rocznie (21 dla wszystkich)
 * @returns Koszt godzinowy w groszach
 */
export function calculateHourlyCostWithVacation(
  monthlyCostTotal: number,
  vacationDaysPerYear: number = 21
): number {
  // Oblicz efektywne godziny pracy w miesiącu uwzględniając urlopy
  // Urlopy są płatne, więc koszt się nie zmienia, ale efektywne godziny pracy tak
  const vacationDaysPerMonth = vacationDaysPerYear / 12;
  const effectiveWorkingDays = WORKING_DAYS_PER_MONTH - vacationDaysPerMonth;
  const effectiveHoursPerMonth = effectiveWorkingDays * HOURS_PER_DAY;
  
  // Koszt godzinowy = całkowity koszt / efektywne godziny
  // Ale dla uproszczenia używamy standardowych 168h, bo urlopy są płatne
  return Math.round(monthlyCostTotal / MONTHLY_WORKING_HOURS);
}

/**
 * Oblicza zysk miesięczny z pracownika
 * @param hoursWorked Godziny przepracowane w miesiącu
 * @param hourlyRateClient Stawka dla klienta w groszach
 * @param monthlyCostTotal Całkowity koszt pracownika w groszach
 * @returns Zysk w groszach
 */
export function calculateMonthlyProfit(
  hoursWorked: number,
  hourlyRateClient: number,
  monthlyCostTotal: number
): number {
  const revenue = Math.round((hoursWorked / 100) * hourlyRateClient);
  const profit = revenue - monthlyCostTotal;
  return profit;
}

/**
 * Oblicza zysk na godzinę
 * @param hourlyRateClient Stawka dla klienta w groszach
 * @param hourlyRateCost Koszt godzinowy w groszach
 * @returns Zysk na godzinę w groszach
 */
export function calculateHourlyProfit(
  hourlyRateClient: number,
  hourlyRateCost: number
): number {
  return hourlyRateClient - hourlyRateCost;
}

/**
 * Oblicza marżę procentową
 * @param revenue Przychód w groszach
 * @param cost Koszt w groszach
 * @returns Marża w procentach (0-100)
 */
export function calculateMarginPercentage(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return Math.round(((revenue - cost) / revenue) * 10000) / 100;
}

/**
 * Symulator negocjacji z pracownikiem
 * Pokazuje ile zostanie zysku przy różnych scenariuszach wynagrodzenia
 */
export interface CostBreakdown {
  grossSalary?: number; // Wynagrodzenie brutto (UoP)
  invoiceAmount?: number; // Kwota faktury (B2B)
  invoiceNet?: number; // Kwota netto faktury bez VAT (B2B)
  vat?: number; // VAT 23% (B2B)
  zusEmployee?: number; // Składki ZUS pracownika
  zusEmployer?: number; // Składki ZUS pracodawcy
  healthInsurance?: number; // Składka zdrowotna
  tax?: number; // Podatek dochodowy
  netSalaryTakeHome?: number; // Kwota netto na rękę (UoP)
  vacationCostMonthly?: number; // Koszt urlopów miesięcznie
  vacationCostAnnual?: number; // Koszt urlopów rocznie
}

export interface NegotiationScenario {
  monthlySalaryNet: number; // Wynagrodzenie netto pracownika
  monthlyCostTotal: number; // Koszt dla firmy
  hourlyRateCost: number; // Koszt godzinowy
  hourlyRateClient: number; // Stawka dla klienta
  hourlyRateEmployee: number; // Stawka płacona pracownikowi
  expectedHoursPerMonth: number; // Oczekiwane godziny miesięcznie
  monthlyRevenue: number; // Przychód miesięczny
  monthlyProfit: number; // Zysk miesięczny (kosztowy)
  monthlyProfitHourly: number; // Zysk miesięczny (stawkowy)
  hourlyProfit: number; // Zysk na godzinę (kosztowy)
  hourlyProfitDirect: number; // Zysk na godzinę (stawkowy)
  marginPercentage: number; // Marża procentowa
  annualProfit: number; // Zysk roczny (kosztowy)
  annualProfitHourly: number; // Zysk roczny (stawkowy)
  breakdown: CostBreakdown; // Szczegółowy rozkład kosztów
  hourlyCostBreakdown: { // Breakdown kosztu godzinowego
    baseSalaryPerHour: number; // Wynagrodzenie per godzina
    vacationPerHour: number; // Koszt urlopów per godzina
    zusPerHour?: number; // ZUS per godzina (jeśli dotyczy)
    otherPerHour?: number; // Inne koszty per godzina
  };
  lossProjections?: { // Prognozy strat (tylko gdy nierentowne)
    loss3Months: number;
    loss6Months: number;
    loss12Months: number;
  };
}

/**
 * Symuluje scenariusz negocjacji z pracownikiem
 * @param employmentType Typ umowy
 * @param monthlySalaryNet Proponowane wynagrodzenie netto
 * @param hourlyRateClient Stawka dla klienta
 * @param expectedHoursPerMonth Oczekiwane godziny miesięcznie (domyślnie 168)
 * @param vacationDaysPerYear Dni urlopu rocznie (domyślnie 21)
 * @returns Scenariusz negocjacji
 */
export function simulateNegotiation(
  employmentType: "uop" | "b2b" | "zlecenie" | "zlecenie_studenckie",
  monthlySalaryNet: number,
  hourlyRateClient: number,
  hourlyRateEmployee: number,
  expectedHoursPerMonth: number = MONTHLY_WORKING_HOURS,
  vacationDaysPerYear: number = 21
): NegotiationScenario {
  // Oblicz koszt firmy i breakdown w zależności od typu umowy
  let monthlyCostTotal: number;
  let breakdown: CostBreakdown = {};
  
  // Koszt urlopów: X dni roboczych / 252 dni robocze w roku
  const vacationCostPercentage = vacationDaysPerYear / 252;
  
  switch (employmentType) {
    case "uop": {
      // UoP: Aktualne składki 2025
      // Dla UoP: monthlySalaryNet to BRUTTO (nie netto!)
      const grossSalary = monthlySalaryNet;
      
      // Składki ZUS pracownika (13.71%)
      const zusEmployee = Math.round(grossSalary * 0.1371);
      
      // Składki ZUS pracodawcy (17.93%)
      const zusEmployer = Math.round(grossSalary * 0.1793);
      
      // Podstawa opodatkowania
      const taxBase = grossSalary - zusEmployee;
      
      // Składka zdrowotna (7.77% podstawy)
      const healthInsurance = Math.round(taxBase * 0.0777);
      
      // Zaliczka na PIT (7.05% - kwota wolna)
      const taxFreeAmount = 30000; // 300 PLN w groszach miesięcznie
      const tax = Math.max(0, Math.round(taxBase * 0.0705) - taxFreeAmount);
      
      monthlyCostTotal = grossSalary + zusEmployer;
      
      // Koszt urlopów
      const vacationCostMonthly = Math.round(monthlyCostTotal * vacationCostPercentage);
      const vacationCostAnnual = vacationCostMonthly * 12;
      
      // Kwota netto na rękę = brutto - ZUS pracownika - podatek - składka zdrowotna
      const netSalaryTakeHome = grossSalary - zusEmployee - tax - healthInsurance;
      
      breakdown = {
        grossSalary,
        zusEmployee,
        zusEmployer,
        healthInsurance,
        tax,
        netSalaryTakeHome,
        vacationCostMonthly,
        vacationCostAnnual,
      };
      break;
    }
    
    case "b2b": {
      // B2B: Koszt firmy = kwota netto faktury + koszt urlopów
      // Firma płaci tylko kwotę netto, VAT/ZUS/podatki to sprawa kontrahenta
      const invoiceNet = monthlySalaryNet; // Kwota netto faktury
      const vat = Math.round(invoiceNet * 0.23); // VAT 23% (informacyjnie, nie jest kosztem)
      const invoiceAmount = invoiceNet + vat; // Faktura brutto (informacyjnie)
      
      // Koszt urlopów dla B2B: stawka godzinowa pracownika × (dni urlopu × 8h)
      const vacationHoursPerYear = vacationDaysPerYear * 8;
      const vacationCostAnnual = Math.round(hourlyRateEmployee * vacationHoursPerYear);
      const vacationCostMonthly = Math.round(vacationCostAnnual / 12);
      
      // Koszt całkowity firmy = kwota netto faktury + koszt urlopów
      monthlyCostTotal = invoiceNet + vacationCostMonthly;
      
      breakdown = {
        invoiceAmount, // Informacyjnie
        invoiceNet, // Kwota netto bez VAT
        vat, // Informacyjnie (nie jest kosztem, bo odliczany)
        vacationCostMonthly,
        vacationCostAnnual,
      };
      break;
    }
    
    case "zlecenie": {
      // Zlecenie: Składki ~29.19%
      const grossAmount = Math.round(monthlySalaryNet / 0.68);
      const zusEmployee = Math.round(grossAmount * 0.2919);
      const taxBase = grossAmount - zusEmployee;
      const healthInsurance = Math.round(taxBase * 0.09);
      const tax = Math.round(taxBase * 0.12);
      
      monthlyCostTotal = grossAmount;
      
      // Koszt urlopów
      const vacationCostMonthly = Math.round(monthlyCostTotal * vacationCostPercentage);
      const vacationCostAnnual = vacationCostMonthly * 12;
      
      breakdown = {
        grossSalary: grossAmount,
        zusEmployee,
        healthInsurance,
        tax,
        vacationCostMonthly,
        vacationCostAnnual,
      };
      break;
    }
    
    case "zlecenie_studenckie": {
      // Zlecenie studenckie: Brak składek ZUS i zdrowotnej
      const grossAmount = Math.round(monthlySalaryNet / 0.88); // Tylko podatek 12%
      const tax = Math.round(grossAmount * 0.12);
      
      monthlyCostTotal = grossAmount;
      
      // Koszt urlopów
      const vacationCostMonthly = Math.round(monthlyCostTotal * vacationCostPercentage);
      const vacationCostAnnual = vacationCostMonthly * 12;
      
      breakdown = {
        grossSalary: grossAmount,
        tax,
        vacationCostMonthly,
        vacationCostAnnual,
      };
      break;
    }
    
    default:
      monthlyCostTotal = monthlySalaryNet;
      breakdown = {};
  }
  
  // Oblicz koszt godzinowy
  const hourlyRateCost = calculateHourlyCostWithVacation(monthlyCostTotal);
  
  // Oblicz przychód miesięczny
  // expectedHoursPerMonth to normalna liczba (np. 168), hourlyRateClient w groszach
  const monthlyRevenue = Math.round(expectedHoursPerMonth * hourlyRateClient);
  
  // Oblicz zysk miesięczny
  const monthlyProfit = monthlyRevenue - monthlyCostTotal;
  
  // Oblicz zysk na godzinę
  const hourlyProfit = calculateHourlyProfit(hourlyRateClient, hourlyRateCost);
  
  // Oblicz marżę
  const marginPercentage = calculateMarginPercentage(monthlyRevenue, monthlyCostTotal);
  
  // Oblicz zysk roczny
  const annualProfit = monthlyProfit * 12;
  
  // Oblicz symulację stawkową (przychód - koszty stawkowe)
  const monthlyCostHourly = Math.round(expectedHoursPerMonth * hourlyRateEmployee);
  const monthlyProfitHourly = monthlyRevenue - monthlyCostHourly;
  const hourlyProfitDirect = hourlyRateClient - hourlyRateEmployee;
  const annualProfitHourly = monthlyProfitHourly * 12;
  
  // Oblicz breakdown kosztu godzinowego
  const baseSalaryPerHour = Math.round(monthlySalaryNet / MONTHLY_WORKING_HOURS);
  const vacationPerHour = breakdown.vacationCostMonthly ? Math.round(breakdown.vacationCostMonthly / MONTHLY_WORKING_HOURS) : 0;
  const zusPerHour = breakdown.zusEmployer ? Math.round(breakdown.zusEmployer / MONTHLY_WORKING_HOURS) : undefined;
  const otherPerHour = zusPerHour ? Math.round((monthlyCostTotal - monthlySalaryNet - (breakdown.vacationCostMonthly || 0) - (breakdown.zusEmployer || 0)) / MONTHLY_WORKING_HOURS) : undefined;
  
  // Oblicz prognozy strat jeśli nierentowne
  const lossProjections = monthlyProfit < 0 ? {
    loss3Months: Math.abs(monthlyProfit * 3),
    loss6Months: Math.abs(monthlyProfit * 6),
    loss12Months: Math.abs(monthlyProfit * 12),
  } : undefined;
  
  return {
    monthlySalaryNet,
    monthlyCostTotal,
    hourlyRateCost,
    hourlyRateClient,
    hourlyRateEmployee,
    expectedHoursPerMonth,
    monthlyRevenue,
    monthlyProfit,
    monthlyProfitHourly,
    hourlyProfit,
    hourlyProfitDirect,
    marginPercentage,
    annualProfit,
    annualProfitHourly,
    breakdown,
    hourlyCostBreakdown: {
      baseSalaryPerHour,
      vacationPerHour,
      zusPerHour,
      otherPerHour,
    },
    lossProjections,
  };
}

/**
 * Oblicza minimalną stawkę dla klienta aby osiągnąć docelową marżę
 * @param monthlyCostTotal Koszt pracownika
 * @param targetMarginPercentage Docelowa marża (np. 20 = 20%)
 * @param expectedHoursPerMonth Oczekiwane godziny
 * @returns Minimalna stawka dla klienta w groszach
 */
export function calculateMinimumClientRate(
  monthlyCostTotal: number,
  targetMarginPercentage: number,
  expectedHoursPerMonth: number = MONTHLY_WORKING_HOURS
): number {
  // revenue = cost / (1 - margin%)
  const requiredRevenue = Math.round(monthlyCostTotal / (1 - targetMarginPercentage / 100));
  const hourlyRate = Math.round((requiredRevenue * 100) / expectedHoursPerMonth);
  return hourlyRate;
}
