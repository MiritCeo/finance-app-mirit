import { describe, it, expect } from "vitest";
import { calculateSalary } from "./salaryCalculator";

describe("employees.calculateSalary", () => {
  it("should calculate UoP salary with vacation costs", () => {
    const result = calculateSalary({
      employmentType: "uop",
      monthlySalaryGross: 1200000, // 12,000 PLN
      monthlySalaryNet: 876000, // 8,760 PLN
      hourlyRateEmployee: 6000, // 60 PLN/h
    });

    // Sprawdź czy koszt pracodawcy jest większy niż brutto
    expect(result.employerCost).toBeGreaterThan(1200000);
    
    // Sprawdź czy koszt urlopu jest obliczony (60 zł/h × 168h / 12 = 840 zł/mies)
    expect(result.vacationCostMonthly).toBe(84000); // 840 PLN
    expect(result.vacationCostAnnual).toBe(1008000); // 10,080 PLN
    
    // Sprawdź czy całkowity koszt zawiera urlopy
    expect(result.employerCostWithVacation).toBe(result.employerCost + result.vacationCostMonthly);
  });

  it("should calculate B2B salary with vacation costs", () => {
    const result = calculateSalary({
      employmentType: "b2b",
      monthlySalaryNet: 1140000, // 11,400 PLN
      hourlyRateEmployee: 8000, // 80 PLN/h
    });

    // Dla B2B koszt pracodawcy = netto faktury
    expect(result.employerCost).toBe(1140000);
    
    // Sprawdź czy koszt urlopu jest obliczony (80 zł/h × 168h / 12 = 1,120 zł/mies)
    expect(result.vacationCostMonthly).toBe(112000); // 1,120 PLN
    expect(result.vacationCostAnnual).toBe(1344000); // 13,440 PLN
    
    // Sprawdź czy całkowity koszt zawiera urlopy
    expect(result.employerCostWithVacation).toBe(1140000 + 112000); // 12,520 PLN
  });

  it("should calculate Zlecenie salary with vacation costs", () => {
    const result = calculateSalary({
      employmentType: "zlecenie",
      monthlySalaryGross: 800000, // 8,000 PLN
      monthlySalaryNet: 640000, // 6,400 PLN
      hourlyRateEmployee: 4500, // 45 PLN/h
    });

    // Sprawdź czy koszt pracodawcy jest obliczony
    expect(result.employerCost).toBeGreaterThan(640000);
    
    // Sprawdź czy koszt urlopu jest obliczony (45 zł/h × 168h / 12 = 630 zł/mies)
    expect(result.vacationCostMonthly).toBe(63000); // 630 PLN
    expect(result.vacationCostAnnual).toBe(756000); // 7,560 PLN
    
    // Sprawdź czy całkowity koszt zawiera urlopy
    expect(result.employerCostWithVacation).toBe(result.employerCost + result.vacationCostMonthly);
  });

  it("should handle zero hourly rate", () => {
    const result = calculateSalary({
      employmentType: "uop",
      monthlySalaryGross: 1200000,
      monthlySalaryNet: 876000,
      hourlyRateEmployee: 0,
    });

    // Jeśli stawka = 0, koszt urlopu też = 0
    expect(result.vacationCostMonthly).toBe(0);
    expect(result.vacationCostAnnual).toBe(0);
    expect(result.employerCostWithVacation).toBe(result.employerCost);
  });
});
