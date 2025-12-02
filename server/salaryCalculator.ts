/**
 * Salary Calculator Service
 * Wszystkie kwoty są w groszach (PLN * 100)
 */

export interface UOPCalculation {
  netSalary: number; // Wynagrodzenie netto w groszach
  employerCost: number; // Koszt pracodawcy w groszach (BEZ urlopów)
  employerCostWithVacation: number; // Koszt pracodawcy z urlopami
  vacationCostMonthly: number; // Koszt urlopów miesięcznie
  vacationCostAnnual: number; // Koszt urlopów rocznie
  breakdown: {
    grossSalary: number;
    zusEmployee: number;
    zusEmployer: number;
    taxBase: number;
    healthInsurance: number;
    tax: number;
  };
}

export interface B2BCalculation {
  netSalary: number;
  employerCost: number; // Koszt pracodawcy (BEZ urlopów)
  employerCostWithVacation: number; // Koszt pracodawcy z urlopami
  vacationCostMonthly: number; // Koszt urlopów miesięcznie
  vacationCostAnnual: number; // Koszt urlopów rocznie
  breakdown: {
    invoiceAmount: number;
    tax: number;
    zus: number;
    taxRatePercent: number;
  };
}

/**
 * Oblicza wynagrodzenie dla UoP
 * @param grossSalary Wynagrodzenie brutto w groszach
 */
export function calculateUOP(grossSalary: number): UOPCalculation {
  // Składki ZUS pracownika (13.71%)
  // - Ubezpieczenie emerytalne: 9.76%
  // - Ubezpieczenie rentowe: 1.5%
  // - Ubezpieczenie chorobowe: 2.45%
  const zusEmployee = Math.round(grossSalary * 0.1371);
  
  // Podstawa opodatkowania
  const taxBase = grossSalary - zusEmployee;
  
  // Składka zdrowotna (7.77% od podstawy)
  const healthInsurance = Math.round(taxBase * 0.0777);
  
  // Zaliczka na PIT (7.05% od podstawy opodatkowania)
  const taxFreeAmount = 30000; // 300 PLN w groszach miesięcznie
  const tax = Math.max(0, Math.round(taxBase * 0.0705) - taxFreeAmount);
  
  // Wynagrodzenie netto na rękę
  const netSalary = grossSalary - zusEmployee - healthInsurance - tax;
  
  // Składki ZUS pracodawcy (17.93%)
  const zusEmployer = Math.round(grossSalary * 0.1793);
  
  // Całkowity koszt pracodawcy (bez urlopów)
  const employerCost = grossSalary + zusEmployer;
  
  // Koszt urlopów: 21 dni / 252 dni robocze w roku = 8.33%
  const vacationCostPercentage = 21 / 252;
  const vacationCostMonthly = Math.round(employerCost * vacationCostPercentage);
  const vacationCostAnnual = vacationCostMonthly * 12;
  
  // Koszt pracodawcy z urlopami
  const employerCostWithVacation = employerCost + vacationCostMonthly;
  
  return {
    netSalary,
    employerCost,
    employerCostWithVacation,
    vacationCostMonthly,
    vacationCostAnnual,
    breakdown: {
      grossSalary,
      zusEmployee,
      zusEmployer,
      taxBase,
      healthInsurance,
      tax,
    }
  };
}

/**
 * Oblicza wynagrodzenie dla B2B
 * @param invoiceNetAmount Kwota netto na fakturze w groszach (koszt pracodawcy)
 * @param hourlyRateEmployee Stawka godzinowa pracownika w groszach (do obliczenia kosztów urlopów)
 * Uwaga: VAT, ZUS i podatki płaci kontrahent, nie pracodawca
 */
export function calculateB2B(
  invoiceNetAmount: number,
  hourlyRateEmployee: number = 0
): B2BCalculation {
  // Dla B2B: koszt pracodawcy = kwota netto faktury
  // VAT jest odliczany, ZUS i podatki płaci kontrahent
  const vat = Math.round(invoiceNetAmount * 0.23); // Informacyjnie
  const invoiceGrossAmount = invoiceNetAmount + vat; // Informacyjnie
  
  // Koszt urlopów: 21 dni / 252 dni robocze w roku = 8.33%
  // Obliczamy od stawki godzinowej pracownika * 168h
  const vacationCostPercentage = 21 / 252;
  const monthlySalaryEquivalent = hourlyRateEmployee * 168;
  const vacationCostMonthly = Math.round(monthlySalaryEquivalent * vacationCostPercentage);
  const vacationCostAnnual = vacationCostMonthly * 12;
  
  // Całkowity koszt pracodawcy (faktura + urlopy)
  const employerCost = invoiceNetAmount;
  const employerCostWithVacation = employerCost + vacationCostMonthly;
  
  return {
    netSalary: invoiceNetAmount, // Dla B2B: kwota na fakturze = "netto" kontrahenta
    employerCost,
    employerCostWithVacation,
    vacationCostMonthly,
    vacationCostAnnual,
    breakdown: {
      invoiceAmount: invoiceNetAmount,
      tax: 0, // Płaci kontrahent
      zus: 0, // Płaci kontrahent
      taxRatePercent: 0,
    }
  };
}

/**
 * Oblicza B2B od kwoty netto którą kontrahent chce otrzymać
 * @param netAmount Kwota netto którą kontrahent chce otrzymać w groszach
 * @param taxRate Stawka podatku (domyślnie 0.12)
 * @param zusAmount Składka ZUS w groszach (domyślnie 180000 = 1800 PLN)
 * @param hourlyRateEmployee Stawka godzinowa pracownika w groszach (do obliczenia kosztów urlopów)
 */
export function calculateB2BFromNet(
  netAmount: number,
  taxRate: number = 0.12,
  zusAmount: number = 180000,
  hourlyRateEmployee: number = 0
): B2BCalculation {
  // Kwota na fakturze = netto + podatek + ZUS
  const invoiceAmount = netAmount + Math.round(netAmount * taxRate) + zusAmount;
  
  // Koszt urlopów
  const vacationCostPercentage = 21 / 252;
  const monthlySalaryEquivalent = hourlyRateEmployee * 168;
  const vacationCostMonthly = Math.round(monthlySalaryEquivalent * vacationCostPercentage);
  const vacationCostAnnual = vacationCostMonthly * 12;
  
  const employerCost = invoiceAmount;
  const employerCostWithVacation = employerCost + vacationCostMonthly;
  
  return {
    netSalary: netAmount,
    employerCost,
    employerCostWithVacation,
    vacationCostMonthly,
    vacationCostAnnual,
    breakdown: {
      invoiceAmount,
      tax: Math.round(netAmount * taxRate),
      zus: zusAmount,
      taxRatePercent: taxRate * 100,
    }
  };
}

/**
 * Oblicza wynagrodzenie dla umowy zlecenie
 * @param grossAmount Kwota brutto w groszach
 */
export function calculateZlecenie(grossAmount: number) {
  // Składki ZUS (29.19%)
  const zusEmployee = Math.round(grossAmount * 0.2919);
  
  // Podstawa opodatkowania
  const taxBase = grossAmount - zusEmployee;
  
  // Podatek 12%
  const tax = Math.round(taxBase * 0.12);
  
  // Netto
  const netSalary = grossAmount - zusEmployee - tax;
  
  return {
    netSalary,
    employerCost: grossAmount,
    breakdown: {
      grossAmount,
      zusEmployee,
      taxBase,
      tax,
    }
  };
}

/**
 * Oblicza wynagrodzenie dla umowy zlecenie studenckiej
 * @param grossAmount Kwota brutto w groszach
 */
export function calculateZlecenieStudenckie(grossAmount: number) {
  // Brak składek ZUS dla studentów do 26 roku życia
  const zusEmployee = 0;
  
  // Podatek 12% od całej kwoty
  const tax = Math.round(grossAmount * 0.12);
  
  // Netto
  const netSalary = grossAmount - tax;
  
  return {
    netSalary,
    employerCost: grossAmount,
    breakdown: {
      grossAmount,
      zusEmployee,
      taxBase: grossAmount,
      tax,
    }
  };
}

/**
 * Oblicza efektywność podatkową różnych form zatrudnienia
 * @param grossAmount Kwota brutto w groszach
 */
export function calculateTaxEfficiency(grossAmount: number) {
  const uop = calculateUOP(grossAmount);
  const b2b = calculateB2B(grossAmount);
  const zlecenie = calculateZlecenie(grossAmount);
  const zlecenieStudenckie = calculateZlecenieStudenckie(grossAmount);
  
  return {
    uop,
    b2b,
    zlecenie,
    zlecenieStudenckie,
    comparison: {
      highestNet: Math.max(uop.netSalary, b2b.netSalary, zlecenie.netSalary, zlecenieStudenckie.netSalary),
      lowestCost: Math.min(uop.employerCost, b2b.employerCost, zlecenie.employerCost, zlecenieStudenckie.employerCost),
    }
  };
}

/**
 * Symuluje wypłatę właściciela z zysku firmy
 * @param availableProfit Dostępny zysk w groszach
 * @param profitPercentage Procent zysku do wypłaty (0-100)
 * @param managementSalary Opcjonalne wynagrodzenie z tytułu zarządzania w groszach
 */
export function simulateOwnerSalary(
  availableProfit: number,
  profitPercentage: number,
  managementSalary: number = 0
) {
  const profitToDistribute = Math.round(availableProfit * (profitPercentage / 100));
  
  // Dywidenda (19% podatku)
  const dividendTax = Math.round(profitToDistribute * 0.19);
  const dividendNet = profitToDistribute - dividendTax;
  
  // Wynagrodzenie z zarządzania (jeśli podane)
  let managementNet = 0;
  let managementTax = 0;
  let managementZUS = 0;
  
  if (managementSalary > 0) {
    const uopCalc = calculateUOP(managementSalary);
    managementNet = uopCalc.netSalary;
    managementTax = uopCalc.breakdown.tax;
    managementZUS = uopCalc.breakdown.zusEmployee + uopCalc.breakdown.zusEmployer;
  }
  
  // Łączne wartości
  const totalGross = profitToDistribute + managementSalary;
  const totalNet = dividendNet + managementNet;
  const totalTax = dividendTax + managementTax + managementZUS;
  const effectiveTaxRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;
  
  return {
    dividend: {
      gross: profitToDistribute,
      tax: dividendTax,
      net: dividendNet,
      taxRate: 19,
    },
    management: {
      gross: managementSalary,
      tax: managementTax,
      zus: managementZUS,
      net: managementNet,
    },
    total: {
      gross: totalGross,
      net: totalNet,
      tax: totalTax,
      effectiveTaxRate,
    },
    remaining: availableProfit - profitToDistribute,
  };
}

/**
 * Oblicza UoP od kwoty netto którą pracownik chce otrzymać
 * @param netSalary Kwota netto którą pracownik chce otrzymać w groszach
 * @param hourlyRateEmployee Stawka godzinowa pracownika w groszach
 */
export function calculateUOPFromNet(netSalary: number, hourlyRateEmployee: number): UOPCalculation {
  // Iteracyjne szukanie brutto które da nam zadane netto
  let grossSalary = Math.round(netSalary * 1.4); // Początkowe przybliżenie
  let iterations = 0;
  const maxIterations = 100;
  
  while (iterations < maxIterations) {
    const result = calculateUOP(grossSalary);
    const diff = result.netSalary - netSalary;
    
    if (Math.abs(diff) < 100) { // Tolerancja 1 PLN
      return result;
    }
    
    // Dostosuj brutto proporcjonalnie do różnicy
    grossSalary = Math.round(grossSalary - diff);
    iterations++;
  }
  
  // Fallback: zwróć ostatni wynik
  return calculateUOP(grossSalary);
}

/**
 * Oblicza umowę zlecenie od kwoty netto którą pracownik chce otrzymać
 * @param netSalary Kwota netto którą pracownik chce otrzymać w groszach
 */
export function calculateZlecenieFromNet(netSalary: number) {
  // Iteracyjne szukanie brutto które da nam zadane netto
  let grossAmount = Math.round(netSalary * 1.5); // Początkowe przybliżenie
  let iterations = 0;
  const maxIterations = 100;
  
  while (iterations < maxIterations) {
    const result = calculateZlecenie(grossAmount);
    const diff = result.netSalary - netSalary;
    
    if (Math.abs(diff) < 100) { // Tolerancja 1 PLN
      return result;
    }
    
    // Dostosuj brutto proporcjonalnie do różnicy
    grossAmount = Math.round(grossAmount - diff);
    iterations++;
  }
  
  // Fallback: zwróć ostatni wynik
  return calculateZlecenie(grossAmount);
}

/**
 * Oblicza umowę zlecenie studencką od kwoty netto którą pracownik chce otrzymać
 * @param netSalary Kwota netto którą pracownik chce otrzymać w groszach
 */
export function calculateZlecenieStudenckieFromNet(netSalary: number) {
  // Dla studenckiej: netto = brutto - 12% podatku
  // brutto = netto / 0.88
  const grossAmount = Math.round(netSalary / 0.88);
  return calculateZlecenieStudenckie(grossAmount);
}
