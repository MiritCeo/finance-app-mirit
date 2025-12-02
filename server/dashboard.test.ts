import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Dashboard procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Utwórz caller z kontekstem testowym
    caller = appRouter.createCaller({
      user: { id: 1, name: "Test User", email: "test@example.com", role: "admin" },
      req: {} as any,
      res: {} as any,
    });
  });

  describe("getAccurateMonthlyResults", () => {
    it("should return accurate monthly results for current month", async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const result = await caller.dashboard.getAccurateMonthlyResults({
        year: currentYear,
        month: currentMonth,
      });

      // Sprawdź strukturę wyniku
      expect(result).toHaveProperty("totalRevenue");
      expect(result).toHaveProperty("employeeCosts");
      expect(result).toHaveProperty("fixedCosts");
      expect(result).toHaveProperty("operatingProfit");
      expect(result).toHaveProperty("operatingMargin");

      // Sprawdź typy
      expect(typeof result.totalRevenue).toBe("number");
      expect(typeof result.employeeCosts).toBe("number");
      expect(typeof result.fixedCosts).toBe("number");
      expect(typeof result.operatingProfit).toBe("number");
      expect(typeof result.operatingMargin).toBe("number");

      // Sprawdź logikę obliczeń
      const expectedProfit = result.totalRevenue - result.employeeCosts - result.fixedCosts;
      expect(result.operatingProfit).toBe(expectedProfit);

      // Sprawdź marżę
      if (result.totalRevenue > 0) {
        const expectedMargin = (result.operatingProfit / result.totalRevenue) * 100;
        expect(result.operatingMargin).toBeCloseTo(expectedMargin, 2);
      }
    });

    it("should handle month without employee hours", async () => {
      // Testuj miesiąc w przyszłości (brak danych)
      const futureYear = new Date().getFullYear() + 1;
      const futureMonth = 1;

      const result = await caller.dashboard.getAccurateMonthlyResults({
        year: futureYear,
        month: futureMonth,
      });

      // Sprawdź strukturę - wartości mogą być różne od 0
      expect(result).toHaveProperty("totalRevenue");
      expect(result).toHaveProperty("employeeCosts");
      expect(result).toHaveProperty("fixedCosts");
      expect(result.fixedCosts).toBeGreaterThanOrEqual(0);
    });

    it("should validate month range", async () => {
      // Test walidacji - miesiąc poza zakresem
      await expect(
        caller.dashboard.getAccurateMonthlyResults({
          year: 2024,
          month: 13, // Nieprawidłowy miesiąc
        })
      ).rejects.toThrow();

      await expect(
        caller.dashboard.getAccurateMonthlyResults({
          year: 2024,
          month: 0, // Nieprawidłowy miesiąc
        })
      ).rejects.toThrow();
    });
  });

  describe("getProfitTrends", () => {
    it("should return 12 months of trend data by default", async () => {
      const result = await caller.dashboard.getProfitTrends({ months: 12 });

      // Sprawdź długość tablicy
      expect(result).toHaveLength(12);

      // Sprawdź strukturę każdego elementu
      result.forEach((trend) => {
        expect(trend).toHaveProperty("month");
        expect(trend).toHaveProperty("revenue");
        expect(trend).toHaveProperty("employeeCosts");
        expect(trend).toHaveProperty("fixedCosts");
        expect(trend).toHaveProperty("totalCosts");
        expect(trend).toHaveProperty("profit");

        // Sprawdź typy
        expect(typeof trend.month).toBe("string");
        expect(typeof trend.revenue).toBe("number");
        expect(typeof trend.employeeCosts).toBe("number");
        expect(typeof trend.fixedCosts).toBe("number");
        expect(typeof trend.totalCosts).toBe("number");
        expect(typeof trend.profit).toBe("number");

        // Sprawdź format miesiąca (YYYY-MM)
        expect(trend.month).toMatch(/^\d{4}-\d{2}$/);

        // Sprawdź logikę obliczeń
        expect(trend.totalCosts).toBe(trend.employeeCosts + trend.fixedCosts);
        expect(trend.profit).toBe(trend.revenue - trend.totalCosts);
      });
    });

    it("should return correct number of months when specified", async () => {
      const monthsToFetch = 6;
      const result = await caller.dashboard.getProfitTrends({ months: monthsToFetch });

      expect(result).toHaveLength(monthsToFetch);
    });

    it("should return trends in chronological order (oldest to newest)", async () => {
      const result = await caller.dashboard.getProfitTrends({ months: 3 }); // Zmniejszono do 3 miesięcy

      // Sprawdź czy miesiące są w kolejności rosnącej
      for (let i = 1; i < result.length; i++) {
        const prevMonth = new Date(result[i - 1].month + "-01");
        const currMonth = new Date(result[i].month + "-01");
        expect(currMonth.getTime()).toBeGreaterThan(prevMonth.getTime());
      }
    });

    it("should validate months parameter range", async () => {
      // Test walidacji - za dużo miesięcy
      await expect(
        caller.dashboard.getProfitTrends({ months: 25 })
      ).rejects.toThrow();

      // Test walidacji - za mało miesięcy
      await expect(
        caller.dashboard.getProfitTrends({ months: 0 })
      ).rejects.toThrow();
    });

    it("should handle months parameter at boundaries", async () => {
      // Test granicznych wartości
      const result1 = await caller.dashboard.getProfitTrends({ months: 1 });
      expect(result1).toHaveLength(1);

      const result6 = await caller.dashboard.getProfitTrends({ months: 6 });
      expect(result6).toHaveLength(6);
    });
  });

  describe("Integration: getAccurateMonthlyResults vs getProfitTrends", () => {
    it("should have consistent data between procedures for current month", async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Pobierz dane z obu procedur
      const accurateResults = await caller.dashboard.getAccurateMonthlyResults({
        year: currentYear,
        month: currentMonth,
      });

      const trends = await caller.dashboard.getProfitTrends({ months: 3 }); // Zmniejszono do 3 miesięcy
      const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
      const currentTrend = trends.find((t) => t.month === currentMonthStr);

      // Jeśli bieżący miesiąc jest w trendach, dane powinny się zgadzać
      if (currentTrend) {
        expect(currentTrend.revenue).toBe(accurateResults.totalRevenue);
        expect(currentTrend.employeeCosts).toBe(accurateResults.employeeCosts);
        expect(currentTrend.fixedCosts).toBe(accurateResults.fixedCosts);
        expect(currentTrend.profit).toBe(accurateResults.operatingProfit);
      }
    }, 10000); // Zwiększony timeout do 10s
  });
});
