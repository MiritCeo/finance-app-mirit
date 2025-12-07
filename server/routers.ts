import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { employeeProjectAssignments } from "../drizzle/schema";
import { 
  calculateUOP, 
  calculateB2B, 
  calculateB2BFromNet,
  calculateUOPFromNet,
  calculateZlecenieFromNet,
  calculateZlecenieStudenckieFromNet,
  calculateZlecenieStudenckie,
  calculateZlecenie,
  calculateTaxEfficiency,
  simulateOwnerSalary
} from "./salaryCalculator";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ EMPLOYEES ============
  employees: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllEmployees();
    }),
    
    active: protectedProcedure.query(async () => {
      return await db.getActiveEmployees();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEmployeeById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        position: z.string().optional(),
        employmentType: z.enum(["uop", "b2b", "zlecenie", "zlecenie_studenckie"]),
        hourlyRateCost: z.number().default(0),
        hourlyRateEmployee: z.number().default(0),
        hourlyRateClient: z.number().default(0),
        monthlySalaryGross: z.number().default(0),
        monthlySalaryNet: z.number().default(0),
        monthlyCostTotal: z.number().default(0),
        vacationCostMonthly: z.number().default(0),
        vacationCostAnnual: z.number().default(0),
        vacationDaysPerYear: z.number().default(21),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createEmployee(input);
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        position: z.string().optional(),
        employmentType: z.enum(["uop", "b2b", "zlecenie", "zlecenie_studenckie"]).optional(),
        hourlyRateCost: z.number().optional(),
        hourlyRateEmployee: z.number().optional(),
        hourlyRateClient: z.number().optional(),
        monthlySalaryGross: z.number().optional(),
        monthlySalaryNet: z.number().optional(),
        monthlyCostTotal: z.number().optional(),
        vacationCostMonthly: z.number().optional(),
        vacationCostAnnual: z.number().optional(),
        vacationDaysPerYear: z.number().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateEmployee(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEmployee(input.id);
        return { success: true };
      }),
    
    calculateSalary: protectedProcedure
      .input(z.object({
        employmentType: z.enum(["uop", "b2b", "zlecenie", "zlecenie_studenckie"]),
        monthlySalaryNet: z.number(),
        hourlyRateEmployee: z.number(),
        vacationDaysPerYear: z.number().default(21),
      }))
      .query(async ({ input }) => {
        const { employmentType, monthlySalaryNet, hourlyRateEmployee, vacationDaysPerYear } = input;
        
        let result: any = {};
        
        // Oblicz godziny urlopu na podstawie dni
        const vacationHoursPerYear = vacationDaysPerYear * 8;
        
        // Dla UoP: monthlySalaryNet to BRUTTO, dla pozostałych to NETTO
        if (employmentType === "uop") {
          const uopResult = calculateUOP(monthlySalaryNet);
          // Koszt urlopów jako procent kosztu pracodawcy (252 dni robocze w roku)
          const vacationCostPercentage = vacationDaysPerYear / 252;
          const vacationCostMonthly = Math.round(uopResult.employerCost * vacationCostPercentage);
          const vacationCostAnnual = vacationCostMonthly * 12;
          result = {
            ...uopResult,
            employerCostWithVacation: uopResult.employerCost + vacationCostMonthly,
            vacationCostMonthly,
            vacationCostAnnual,
          };
        } else if (employmentType === "b2b") {
          // Dla B2B obliczamy koszt urlopu jako procent wynagrodzenia
          // 252 dni robocze w roku (21 dni × 12 miesięcy)
          const vacationCostPercentage = vacationDaysPerYear / 252;
          const employerCost = monthlySalaryNet; // Dla B2B to kwota netto faktury
          
          // Koszt urlopów miesięcznie jako procent wynagrodzenia
          const vacationCostMonthly = Math.round(employerCost * vacationCostPercentage);
          const vacationCostAnnual = vacationCostMonthly * 12;
          
          result = {
            monthlySalaryNet,
            monthlySalaryGross: monthlySalaryNet,
            grossSalary: monthlySalaryNet,
            netSalary: monthlySalaryNet,
            employerCost,
            employerCostWithVacation: employerCost + vacationCostMonthly,
            vacationCostMonthly,
            vacationCostAnnual,
          };
        } else if (employmentType === "zlecenie") {
          result = calculateZlecenieFromNet(monthlySalaryNet);
          // Koszt urlopów jako procent kosztu pracodawcy (252 dni robocze w roku)
          const vacationCostPercentage = vacationDaysPerYear / 252;
          const vacationCostMonthly = Math.round(result.employerCost * vacationCostPercentage);
          const vacationCostAnnual = vacationCostMonthly * 12;
          result = {
            ...result,
            employerCostWithVacation: result.employerCost + vacationCostMonthly,
            vacationCostMonthly,
            vacationCostAnnual,
          };
        } else if (employmentType === "zlecenie_studenckie") {
          result = calculateZlecenieStudenckieFromNet(monthlySalaryNet);
          // Koszt urlopów jako procent kosztu pracodawcy (252 dni robocze w roku)
          const vacationCostPercentage = vacationDaysPerYear / 252;
          const vacationCostMonthly = Math.round(result.employerCost * vacationCostPercentage);
          const vacationCostAnnual = vacationCostMonthly * 12;
          result = {
            ...result,
            employerCostWithVacation: result.employerCost + vacationCostMonthly,
            vacationCostMonthly,
            vacationCostAnnual,
          };
        }
        
        // Oblicz koszt godzinowy
        const hourlyRateCost = result.employerCostWithVacation ? Math.round(result.employerCostWithVacation / 168) : 0;
        
        // Dla różnych typów umów pola są w różnych miejscach
        const monthlySalaryGross = result.grossSalary || result.breakdown?.grossSalary || result.monthlySalaryGross || 0;
        
        return {
          monthlySalaryGross,
          netSalary: result.netSalary || result.monthlySalaryNet || 0,
          monthlyCostTotal: result.employerCostWithVacation || 0,
          hourlyRateCost,
          vacationCostMonthly: result.vacationCostMonthly || 0,
          vacationCostAnnual: result.vacationCostAnnual || 0,
        };
      }),
      
    // Raport roczny pracownika
    getAnnualReport: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        year: z.number(),
      }))
      .query(async ({ input }) => {
        const { employeeId, year } = input;
        
        // Pobierz dane pracownika
        const employee = await db.getEmployeeById(employeeId);
        if (!employee) {
          throw new Error("Employee not found");
        }
        
        // Pobierz wszystkie wpisy godzinowe dla tego pracownika w danym roku
        const timeEntriesData = await db.getTimeEntriesByEmployeeAndYear(employeeId, year);
        console.log(`[getAnnualReport] employeeId=${employeeId}, year=${year}, found ${timeEntriesData.length} entries:`, timeEntriesData);
        
        // Grupuj godziny per miesiąc
        const monthlyHours: Record<number, number> = {};
        for (const entry of timeEntriesData) {
          const entryDate = new Date(entry.workDate);
          const month = entryDate.getMonth() + 1; // 1-12
          if (!monthlyHours[month]) {
            monthlyHours[month] = 0;
          }
          monthlyHours[month] += entry.hoursWorked; // Sumuj w groszach (13100)
        }
        
        // Pobierz zapisane raporty miesięczne (z actualCost)
        const savedReports = await db.getMonthlyReportsByEmployeeAndYear(employeeId, year);
        const savedReportsMap = new Map(savedReports.map(r => [r.month, r]));
        
        // Uzupełnij wszystkie miesiące (1-12)
        const allMonths = [];
        for (let month = 1; month <= 12; month++) {
          // Pobierz zapisany raport miesięczny (jeśli istnieje)
          const savedReport = savedReportsMap.get(month) as any;
          
          // Jeśli istnieje zapisany raport, użyj zapisanych wartości (snapshot)
          // W przeciwnym razie użyj aktualnych danych pracownika
          let hoursWorked: number;
          let hourlyRateClient: number;
          let revenue: number;
          let defaultCost: number;
          
          if (savedReport && savedReport.hoursWorked > 0) {
            // Użyj zapisanych wartości z momentu zapisu raportu (snapshot)
            hoursWorked = savedReport.hoursWorked / 100; // Konwersja z groszy na godziny
            hourlyRateClient = savedReport.hourlyRateClient; // Zapisana stawka
            revenue = savedReport.revenue; // Zapisany przychód
            defaultCost = savedReport.cost; // Zapisany koszt domyślny - NIE ZMIENIA SIĘ po edycji pracownika
          } else {
            // Brak zapisanego raportu - użyj aktualnych danych
            hoursWorked = (monthlyHours[month] || 0) / 100; // Konwersja z groszy na godziny (13100 -> 131h)
            hourlyRateClient = employee.hourlyRateClient; // Aktualna stawka w groszach
            revenue = Math.round(hoursWorked * hourlyRateClient); // godziny × stawka w groszach
            defaultCost = employee.monthlyCostTotal; // Aktualny koszt domyślny z bazy (w groszach)
          }
          
          // Pobierz actualCost z zapisanego raportu (jeśli istnieje)
          const actualCost = savedReport?.actualCost ?? null;
          
          // Użyj actualCost jeśli istnieje, w przeciwnym razie defaultCost
          // defaultCost jest zawsze zapisaną wartością z momentu zapisu raportu (jeśli raport istnieje)
          const cost = actualCost ?? defaultCost;
          
          // Jeśli mamy zapisany raport, użyj zapisanego profit, w przeciwnym razie oblicz
          let profit: number;
          if (savedReport && savedReport.hoursWorked > 0 && actualCost === null) {
            // Użyj zapisanego profit jeśli nie ma actualCost
            profit = savedReport.profit;
          } else {
            // Przelicz profit (może być zmieniony przez actualCost)
            profit = revenue - cost;
          }
          
          allMonths.push({
            id: savedReport?.id || 0,
            employeeId,
            year,
            month,
            hoursWorked,
            hourlyRateClient,
            revenue,
            defaultCost,
            actualCost,
            cost,
            profit,
            createdAt: savedReport?.createdAt || new Date(),
            updatedAt: savedReport?.updatedAt || new Date(),
          });
        }
        
        // Oblicz podsumowanie roczne
        const totalHours = allMonths.reduce((sum, m) => sum + m.hoursWorked, 0);
        const totalRevenue = allMonths.reduce((sum, m) => sum + m.revenue, 0);
        const totalCost = allMonths.reduce((sum, m) => sum + m.cost, 0);
        const totalProfit = totalRevenue - totalCost;
        
        return {
          employee,
          months: allMonths,
          summary: {
            totalHours,
            totalRevenue,
            totalCost,
            totalProfit,
          },
        };
      }),
      
    // Aktualizacja kosztu rzeczywistego w raporcie miesięcznym
    updateActualCost: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        year: z.number(),
        month: z.number(),
        actualCost: z.number().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { employeeId, year, month, actualCost } = input;
        
        // Zapisz actualCost do bazy
        await db.upsertMonthlyReport({
          employeeId,
          year,
          month,
          actualCost,
        });
        
        return { success: true };
      }),
      
    // Aktualizacja godzin w raporcie miesięcznym
    updateMonthlyHours: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        year: z.number(),
        month: z.number(),
        hoursWorked: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { employeeId, year, month, hoursWorked } = input;
        
        // Pobierz dane pracownika
        const employee = await db.getEmployeeById(employeeId);
        if (!employee) {
          throw new Error("Employee not found");
        }
        
        // Oblicz przychód, koszt i zysk
        const hourlyRateClient = employee.hourlyRateClient;
        const revenue = Math.round(hoursWorked * hourlyRateClient); // hoursWorked jako liczba całkowita
        const cost = employee.monthlyCostTotal;
        const profit = revenue - cost;
        // Ta procedura nie jest już używana - godziny są pobierane z timeEntries
        // Pozostawiam dla kompatybilności wstecznej
        return { success: true };
      }),
  }),

  // ============ CLIENTS ============
  clients: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllClients();
    }),
    
    active: protectedProcedure.query(async () => {
      return await db.getActiveClients();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getClientById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createClient(input);
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateClient(id, data);
        return { success: true };
      }),
  }),

  // ============ PROJECTS ============
  projects: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProjects();
    }),
    
    byStatus: protectedProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        return await db.getProjectsByStatus(input.status);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        name: z.string().min(1),
        billingModel: z.enum(["time_material"]).default("time_material"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).default("planning"),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const data = {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        };
        const id = await db.createProject(data as any);
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number().optional(),
        name: z.string().min(1).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data = {
          ...rest,
          startDate: rest.startDate ? new Date(rest.startDate) : undefined,
          endDate: rest.endDate ? new Date(rest.endDate) : undefined,
        };
        await db.updateProject(id, data as any);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProject(input.id);
        return { success: true };
      }),
    
    getStats: protectedProcedure
      .input(z.object({
        year: z.number().optional(),
        month: z.number().min(1).max(12).optional(),
      }).optional())
      .query(async ({ input }) => {
        const now = new Date();
        const year = input?.year ?? now.getFullYear();
        const month = input?.month ?? now.getMonth() + 1;
        
        const projects = await db.getAllProjects();
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { employeeProjectAssignments, timeEntries } = await import("../drizzle/schema");
        const { sql, eq, and } = await import("drizzle-orm");
        
        // Pobierz wszystkich aktywnych pracowników dla weryfikacji
        const activeEmployees = await db.getActiveEmployees();
        const activeEmployeeIds = new Set(activeEmployees.map(emp => emp.id));
        
        const projectStats = [];
        
        for (const project of projects) {
          // Pobierz tylko aktywne assignments dla tego projektu
          const assignments = await database
            .select({
              id: employeeProjectAssignments.id,
              employeeId: employeeProjectAssignments.employeeId,
              hourlyRateClient: employeeProjectAssignments.hourlyRateClient,
              hourlyRateCost: employeeProjectAssignments.hourlyRateCost,
            })
            .from(employeeProjectAssignments)
            .where(
              and(
                eq(employeeProjectAssignments.projectId, project.id),
                eq(employeeProjectAssignments.isActive, true)
              )
            );
          
          // Filtruj tylko assignments z aktywnymi pracownikami
          const activeAssignments = assignments.filter(a => activeEmployeeIds.has(a.employeeId));
          
          // Policz unikalnych aktywnych pracowników
          const uniqueEmployees = new Set(activeAssignments.map(a => a.employeeId));
          const employeeCount = uniqueEmployees.size;
          
          let totalRevenue = 0;
          let totalCost = 0;
          let totalHours = 0;
          
          // Używaj tylko aktywnych assignments do obliczeń
          for (const assignment of activeAssignments) {
            // Pobierz wpisy godzinowe dla tego assignment w danym miesiącu
            const entries = await database
              .select()
              .from(timeEntries)
              .where(
                and(
                  eq(timeEntries.assignmentId, assignment.id),
                  sql`YEAR(${timeEntries.workDate}) = ${year}`,
                  sql`MONTH(${timeEntries.workDate}) = ${month}`
                )
              );
            
            const hours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0) / 100;
            const revenue = Math.round(hours * assignment.hourlyRateClient);
            const cost = Math.round(hours * assignment.hourlyRateCost);
            
            totalRevenue += revenue;
            totalCost += cost;
            totalHours += hours;
          }
          
          const profit = totalRevenue - totalCost;
          const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
          
          // Oblicz średnią stawkę godzinową (dla klienta) na podstawie aktywnych assignments
          let totalRateSum = 0;
          let rateCount = 0;
          for (const assignment of activeAssignments) {
            totalRateSum += assignment.hourlyRateClient;
            rateCount++;
          }
          const averageHourlyRate = rateCount > 0 ? Math.round(totalRateSum / rateCount) : 0;
          
          projectStats.push({
            projectId: project.id,
            employeeCount: employeeCount,
            revenue: totalRevenue,
            cost: totalCost,
            profit,
            hours: totalHours,
            margin: Math.round(margin * 100) / 100,
            averageHourlyRate: averageHourlyRate,
          });
        }
        
        return projectStats;
      }),
  }),

  // ============ ASSIGNMENTS ============
  assignments: router({
    byProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssignmentsByProject(input.projectId);
      }),
    
    byEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssignmentsByEmployee(input.employeeId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        projectId: z.number(),
        hourlyRateClient: z.number(),
        hourlyRateCost: z.number(),
        assignmentStart: z.string().optional(),
        assignmentEnd: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const data = {
          ...input,
          assignmentStart: input.assignmentStart ? new Date(input.assignmentStart) : undefined,
          assignmentEnd: input.assignmentEnd ? new Date(input.assignmentEnd) : undefined,
        };
        const id = await db.createAssignment(data as any);
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number().optional(),
        hourlyRateClient: z.number().optional(),
        hourlyRateCost: z.number().optional(),
        assignmentStart: z.string().optional(),
        assignmentEnd: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data = {
          ...rest,
          assignmentStart: rest.assignmentStart ? new Date(rest.assignmentStart) : undefined,
          assignmentEnd: rest.assignmentEnd ? new Date(rest.assignmentEnd) : undefined,
        };
        await db.updateAssignment(id, data as any);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAssignment(input.id);
        return { success: true };
      }),
  }),

  // ============ TIME ENTRIES ============
  timeEntries: router({
    byAssignment: protectedProcedure
      .input(z.object({ assignmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTimeEntriesByAssignment(input.assignmentId);
      }),
    
    recent: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit || 50;
        const entries = await db.getAllTimeEntries();
        
        // Pobierz dodatkowe dane dla każdego wpisu
        const enrichedEntries = await Promise.all(
          entries.slice(0, limit).map(async (entry) => {
            const assignment = await db.getAssignmentById(entry.assignmentId);
            return {
              ...entry,
              employeeId: assignment?.employeeId || 0,
              projectId: assignment?.projectId || 0,
              hourlyRateClient: assignment?.hourlyRateClient || 0,
            };
          })
        );
        
        return enrichedEntries;
      }),
    
    create: protectedProcedure
      .input(z.object({
        assignmentId: z.number(),
        workDate: z.string(),
        hoursWorked: z.number(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // workDate jako string YYYY-MM-DD, konwertuj na Date (jak w seed.mjs)
        // hoursWorked musi być w groszach (×100)
        const data = {
          ...input,
          workDate: new Date(input.workDate),
          hoursWorked: Math.round(input.hoursWorked * 100),
        };
        const id = await db.createTimeEntry(data as any);
        return { id, success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTimeEntry(input.id);
        return { success: true };
      }),
    
    saveMonthlyHours: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        entries: z.array(z.object({
          employeeId: z.number(),
          assignmentId: z.number(),
          hoursWorked: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Grupuj wpisy po pracowniku, aby móc sumować godziny i przychody
        const employeeEntries = new Map<number, Array<{ assignmentId: number; hoursWorked: number; hourlyRateClient: number }>>();
        
        // Najpierw zbierz wszystkie wpisy i sprawdź czy wszystko jest poprawne
        for (const entry of input.entries) {
          const employee = await db.getEmployeeById(entry.employeeId);
          if (!employee) {
            console.warn('[saveMonthlyHours] Employee not found:', entry.employeeId);
            continue;
          }
          
          // Sprawdź czy assignment istnieje
          const assignment = await db.getAssignmentById(entry.assignmentId);
          if (!assignment) {
            console.warn('[saveMonthlyHours] Assignment not found:', entry.assignmentId);
            continue;
          }
          
          const hoursWorkedInGrosze = Math.round(entry.hoursWorked * 100); // Konwersja do groszy (131h = 13100)
          const hourlyRateClient = assignment.hourlyRateClient || employee.hourlyRateClient || 0;
          
          if (!employeeEntries.has(entry.employeeId)) {
            employeeEntries.set(entry.employeeId, []);
          }
          
          employeeEntries.get(entry.employeeId)!.push({
            assignmentId: entry.assignmentId,
            hoursWorked: hoursWorkedInGrosze,
            hourlyRateClient: hourlyRateClient,
          });
        }
        
        // Utwórz wpisy godzinowe i zapisz snapshoty
        const lastDay = new Date(input.year, input.month, 0).getDate();
        const workDate = new Date(input.year, input.month - 1, lastDay);
        
        for (const [employeeId, entries] of Array.from(employeeEntries.entries())) {
          const employee = await db.getEmployeeById(employeeId);
          if (!employee) continue;
          
          // Sumuj godziny i przychody ze wszystkich projektów
          let totalHoursWorked = 0; // w groszach
          let totalRevenue = 0; // w groszach
          
          // Zapisz każdy wpis godzinowy osobno
          for (const entry of entries) {
            try {
              // Zapisz wpis godzinowy
              await db.createTimeEntry({
                assignmentId: entry.assignmentId,
                workDate: workDate,
                hoursWorked: entry.hoursWorked,
                description: `Raport miesięczny za ${input.month}/${input.year}`,
              });
              
              // Dodaj do sumy
              totalHoursWorked += entry.hoursWorked;
              const hours = entry.hoursWorked / 100; // Konwersja z groszy na godziny
              totalRevenue += Math.round(hours * entry.hourlyRateClient);
              
              console.log('[saveMonthlyHours] Created time entry:', {
                assignmentId: entry.assignmentId,
                hoursWorked: entry.hoursWorked,
                hourlyRate: entry.hourlyRateClient,
                revenue: Math.round(hours * entry.hourlyRateClient),
              });
            } catch (error: any) {
              console.error('[saveMonthlyHours] Error creating time entry:', error);
              throw error;
            }
          }
          
          // Oblicz średnią ważoną stawki (dla zapisu w snapshot)
          // Używamy średniej ważonej godzinami
          // totalRevenue jest w groszach, totalHoursWorked jest w groszach (godziny * 100)
          const totalHours = totalHoursWorked / 100; // Konwersja na godziny
          const averageHourlyRate = totalHours > 0 
            ? Math.round(totalRevenue / totalHours) // Przychód w groszach / godziny = stawka w groszach
            : entries[0]?.hourlyRateClient || employee.hourlyRateClient || 0;
          
          // Zapisz snapshot z sumą godzin i przychodów
          await db.saveMonthlyReportSnapshot({
            employeeId: employeeId,
            year: input.year,
            month: input.month,
            hoursWorked: totalHoursWorked, // Suma godzin ze wszystkich projektów (w groszach)
            hourlyRateClient: averageHourlyRate, // Średnia ważona stawka w groszach (już obliczona)
            monthlyCostTotal: employee.monthlyCostTotal || 0,
          });
          
          console.log('[saveMonthlyHours] Saved snapshot:', {
            employeeId: employeeId,
            totalHours: totalHoursWorked / 100,
            totalRevenue: totalRevenue,
            averageHourlyRate: averageHourlyRate,
          });
        }
        
        return { success: true };
      }),
    
    deleteMonthlyReport: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Usuń wszystkie wpisy godzinowe dla danego miesiąca
        const { sql } = await import("drizzle-orm");
        const db = await import("./db");
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { timeEntries, monthlyEmployeeReports } = await import("../drizzle/schema");
        
        // Usuń wpisy z time_entries dla danego miesiąca i roku
        await database.delete(timeEntries).where(
          sql`MONTH(${timeEntries.workDate}) = ${input.month} AND YEAR(${timeEntries.workDate}) = ${input.year}`
        );
        
        // Usuń również snapshoty raportów miesięcznych dla wszystkich pracowników w danym miesiącu
        // (monthlyReports teraz używa danych z monthlyEmployeeReports, więc musimy je też usunąć)
        await database.delete(monthlyEmployeeReports).where(
          sql`${monthlyEmployeeReports.month} = ${input.month} AND ${monthlyEmployeeReports.year} = ${input.year}`
        );
        
        return { success: true };
      }),
    
    getMonthlyReportDetails: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .query(async ({ input }) => {
        const { year, month } = input;
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { timeEntries, employeeProjectAssignments } = await import("../drizzle/schema");
        const { sql, eq, and } = await import("drizzle-orm");
        
        // Pobierz wszystkie wpisy godzinowe dla danego miesiąca z informacją o assignment
        const entries = await database
          .select({
            id: timeEntries.id,
            assignmentId: timeEntries.assignmentId,
            hoursWorked: timeEntries.hoursWorked,
            employeeId: employeeProjectAssignments.employeeId,
          })
          .from(timeEntries)
          .innerJoin(
            employeeProjectAssignments,
            eq(timeEntries.assignmentId, employeeProjectAssignments.id)
          )
          .where(
            and(
              sql`YEAR(${timeEntries.workDate}) = ${year}`,
              sql`MONTH(${timeEntries.workDate}) = ${month}`
            )
          );
        
        // Grupuj po employeeId i assignmentId
        const result: Array<{ employeeId: number; assignmentId: number; hours: number }> = [];
        const grouped = new Map<string, number>();
        
        for (const entry of entries) {
          const key = `${entry.employeeId}-${entry.assignmentId}`;
          const hours = (entry.hoursWorked / 100); // Konwersja z groszy na godziny
          grouped.set(key, (grouped.get(key) || 0) + hours);
        }
        
        // Konwertuj na tablicę
        Array.from(grouped.entries()).forEach(([key, hours]) => {
          const [employeeId, assignmentId] = key.split('-').map(Number);
          result.push({ employeeId, assignmentId, hours });
        });
        
        return result;
      }),
    
    monthlyReports: protectedProcedure.query(async () => {
      try {
        // Pobierz zapisane raporty miesięczne z monthlyEmployeeReports
        // To zapewnia, że raporty nie zmienią się gdy zmienią się ustawienia pracownika
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { monthlyEmployeeReports } = await import("../drizzle/schema");
        const allReports = await database.select().from(monthlyEmployeeReports);
        
        // Grupuj po miesiącu i roku
        const reportMap = new Map<string, {
          month: number;
          year: number;
          totalHours: number;
          totalRevenue: number;
          totalCost: number;
          totalProfit: number;
          employeeCount: Set<number>;
        }>();
        
        for (const report of allReports) {
          const key = `${report.year}-${report.month}`;
          
          if (!reportMap.has(key)) {
            reportMap.set(key, {
              month: report.month,
              year: report.year,
              totalHours: 0,
              totalRevenue: 0,
              totalCost: 0,
              totalProfit: 0,
              employeeCount: new Set(),
            });
          }
          
          const monthReport = reportMap.get(key)!;
          
          // Użyj zapisanych wartości z momentu zapisu raportu (snapshot)
          const hours = report.hoursWorked / 100; // Konwersja z groszy na godziny (13100 -> 131h)
          const revenue = report.revenue; // Już zapisane w groszach
          const cost = report.actualCost ?? report.cost; // Użyj actualCost jeśli istnieje, w przeciwnym razie cost
          const profit = report.profit; // Już zapisane w groszach
          
          monthReport.totalHours += hours;
          monthReport.totalRevenue += revenue;
          monthReport.totalCost += cost;
          monthReport.employeeCount.add(report.employeeId);
        }
        
        // Oblicz totalProfit dla każdego miesiąca (revenue - cost)
        for (const [key, report] of Array.from(reportMap.entries())) {
          report.totalProfit = report.totalRevenue - report.totalCost;
        }
        
        // Konwertuj na tablicę i sortuj
        return Array.from(reportMap.values())
          .map(r => ({
            ...r,
            employeeCount: r.employeeCount.size,
          }))
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });
      } catch (error: any) {
        console.error('[monthlyReports] Error:', error);
        throw new Error(`Failed to fetch monthly reports: ${error.message}`);
      }
    }),
    
    details: protectedProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020),
      }))
      .query(async ({ input }) => {
        const { month, year } = input;
        
        // Pobierz wszystkie wpisy dla danego miesiąca
        const entries = await db.getTimeEntriesByDateRange(
          new Date(year, month - 1, 1).toISOString(),
          new Date(year, month, 0, 23, 59, 59).toISOString()
        );
        
        const { calculateUOP, calculateB2BFromNet, calculateZlecenie, calculateZlecenieStudenckie } = await import("./salaryCalculator");
        
        const employeeDetails = new Map<number, {
          employeeId: number;
          employeeName: string;
          hours: number;
          hourlyRateClient: number;
          revenue: number;
          cost: number;
          profit: number;
        }>();
        
        for (const entry of entries) {
          const assignment = await db.getAssignmentById(entry.assignmentId);
          if (!assignment) continue;
          
          const employee = await db.getEmployeeById(assignment.employeeId);
          if (!employee) continue;
          
          const hours = entry.hoursWorked / 100; // Konwersja z groszy na godziny (13100 -> 131h)
          const revenue = Math.round(hours * assignment.hourlyRateClient); // godziny × stawka w groszach
          
          // Oblicz pełny miesięczny koszt pracownika
          let monthlyCost = 0;
          switch (employee.employmentType) {
            case "uop":
              const grossEstimate = Math.round(employee.monthlySalaryNet / 0.73);
              const uopCalc = calculateUOP(grossEstimate);
              monthlyCost = uopCalc.employerCost;
              break;
            case "b2b":
              const b2bCalc = calculateB2BFromNet(employee.monthlySalaryNet);
              monthlyCost = b2bCalc.employerCost;
              break;
            case "zlecenie":
              const zlecenieCalc = calculateZlecenie(employee.monthlySalaryNet);
              monthlyCost = zlecenieCalc.employerCost;
              break;
            case "zlecenie_studenckie":
              const studentCalc = calculateZlecenieStudenckie(employee.monthlySalaryNet);
              monthlyCost = studentCalc.employerCost;
              break;
            default:
              monthlyCost = employee.monthlySalaryNet;
          }
          
          if (!employeeDetails.has(employee.id)) {
            employeeDetails.set(employee.id, {
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              hours: 0,
              hourlyRateClient: assignment.hourlyRateClient,
              revenue: 0,
              cost: monthlyCost,
              profit: 0,
            });
          }
          
          const detail = employeeDetails.get(employee.id)!;
          detail.hours += hours;
          detail.revenue += revenue;
        }
        
        // Oblicz zysk dla każdego pracownika
        const details = Array.from(employeeDetails.values()).map(d => ({
          ...d,
          profit: d.revenue - d.cost,
        }));
        
        return {
          month,
          year,
          employees: details,
          summary: {
            totalHours: details.reduce((sum, d) => sum + d.hours, 0),
            totalRevenue: details.reduce((sum, d) => sum + d.revenue, 0),
            totalCost: details.reduce((sum, d) => sum + d.cost, 0),
            totalProfit: details.reduce((sum, d) => sum + d.profit, 0),
          },
        };
      }),
  }),

  // ============ FIXED COSTS ============
  fixedCosts: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllFixedCosts();
    }),
    
    active: protectedProcedure.query(async () => {
      return await db.getActiveFixedCosts();
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        amount: z.number(),
        frequency: z.enum(["monthly", "quarterly", "yearly", "one_time"]).default("monthly"),
        startDate: z.string(),
        endDate: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const data = {
          ...input,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        };
        const id = await db.createFixedCost(data as any);
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        amount: z.number().optional(),
        frequency: z.enum(["monthly", "quarterly", "yearly", "one_time"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const data = {
          ...rest,
          startDate: rest.startDate ? new Date(rest.startDate) : undefined,
          endDate: rest.endDate ? new Date(rest.endDate) : undefined,
        };
        await db.updateFixedCost(id, data as any);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFixedCost(input.id);
        return { success: true };
      }),
    
    totalMonthly: protectedProcedure.query(async () => {
      const costs = await db.getActiveFixedCosts();
      const total = costs.reduce((sum, cost) => {
        // Przelicz na koszt miesięczny w zależności od frequency
        let monthlyCost = 0;
        switch (cost.frequency) {
          case 'monthly':
            monthlyCost = cost.amount;
            break;
          case 'quarterly':
            monthlyCost = Math.round(cost.amount / 3);
            break;
          case 'yearly':
            monthlyCost = Math.round(cost.amount / 12);
            break;
          case 'one_time':
            monthlyCost = 0; // Jednorazowe koszty nie wliczamy do miesięcznych
            break;
        }
        return sum + monthlyCost;
      }, 0);
      return { total };
    }),
  }),

  // ============ SALARY CALCULATOR ============
  calculator: router({
    uop: publicProcedure
      .input(z.object({ grossSalary: z.number() }))
      .query(({ input }) => {
        return calculateUOP(input.grossSalary);
      }),
    
    b2b: publicProcedure
      .input(z.object({ 
        invoiceAmount: z.number(),
        taxRate: z.number().optional(),
        zusAmount: z.number().optional(),
      }))
      .query(({ input }) => {
        return calculateB2B(input.invoiceAmount); // Kwota netto faktury
      }),
    
    b2bFromNet: publicProcedure
      .input(z.object({ 
        targetNet: z.number(),
        taxRate: z.number().optional(),
        zusAmount: z.number().optional(),
      }))
      .query(({ input }) => {
        const cost = calculateB2BFromNet(input.targetNet);
        return { grossAmount: cost }; // Dla B2B koszt = kwota netto
      }),
    
    zlecenieStudenckie: publicProcedure
      .input(z.object({ amount: z.number() }))
      .query(({ input }) => {
        return calculateZlecenieStudenckie(input.amount);
      }),
    
    zlecenie: publicProcedure
      .input(z.object({ amount: z.number() }))
      .query(({ input }) => {
        return calculateZlecenie(input.amount);
      }),
  }),

  // ============ OWNER SALARY SIMULATOR ============
  simulator: router({
    simulate: protectedProcedure
      .input(z.object({
        availableProfit: z.number(),
        profitPercentage: z.number(),
        managementSalary: z.number().optional(),
      }))
      .query(({ input }) => {
        return simulateOwnerSalary(
          input.availableProfit,
          input.profitPercentage,
          input.managementSalary
        );
      }),
    
    save: protectedProcedure
      .input(z.object({
        scenarioName: z.string().min(1),
        netSalary: z.number(),
        grossCost: z.number(),
        profitPercentage: z.number(),
        remainingProfit: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const id = await db.createSimulation({
          userId: ctx.user.id,
          ...input,
        });
        return { id, success: true };
      }),
    
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await db.getSimulationsByUser(ctx.user.id);
    }),
  }),

  // ============ DASHBOARD / REPORTS ============
  dashboard: router({
    kpi: protectedProcedure
      .input(z.object({
        year: z.number().optional(),
        month: z.number().min(1).max(12).optional(),
      }).optional())
      .query(async ({ input }) => {
        const now = new Date();
        const year = input?.year ?? now.getFullYear();
        const month = input?.month ?? (now.getMonth() + 1);
      
      // Pobierz wszystkich aktywnych pracowników
      const employees = await db.getActiveEmployees();
      
      let totalRevenue = 0;
      let totalEmployeeCosts = 0;
      
      // Dla każdego pracownika pobierz godziny z time_entries
      for (const employee of employees) {
        // Pobierz zapisany raport miesięczny (jeśli istnieje)
        const savedReport = await db.getMonthlyReport(employee.id, year, month);
        
        // Jeśli istnieje zapisany raport, użyj zapisanych wartości (snapshot)
        if (savedReport && savedReport.hoursWorked > 0) {
          // Użyj zapisanych wartości z momentu zapisu raportu
          const revenue = savedReport.revenue; // Zapisany przychód
          const employeeCost = savedReport.actualCost ?? savedReport.cost; // Użyj actualCost jeśli istnieje, w przeciwnym razie zapisany cost
          
          totalRevenue += revenue;
          totalEmployeeCosts += employeeCost;
        } else {
          // Brak zapisanego raportu - użyj aktualnych danych
          // Pobierz wszystkie wpisy godzinowe dla pracownika w bieżącym miesiącu z informacją o assignment
          const database = await db.getDb();
          if (!database) continue;
          
          const { timeEntries, employeeProjectAssignments } = await import("../drizzle/schema");
          const { sql, eq, and } = await import("drizzle-orm");
          
          const entries = await database
            .select({
              hoursWorked: timeEntries.hoursWorked,
              assignmentId: timeEntries.assignmentId,
              hourlyRateClient: employeeProjectAssignments.hourlyRateClient,
            })
            .from(timeEntries)
            .innerJoin(
              employeeProjectAssignments,
              eq(timeEntries.assignmentId, employeeProjectAssignments.id)
            )
            .where(
              and(
                eq(employeeProjectAssignments.employeeId, employee.id),
                sql`YEAR(${timeEntries.workDate}) = ${year}`,
                sql`MONTH(${timeEntries.workDate}) = ${month}`
              )
            );
          
          // Jeśli brak wpisów, pomiń pracownika
          if (entries.length === 0) continue;
          
          // Oblicz przychód używając stawki z assignment dla każdego wpisu
          let revenue = 0;
          for (const entry of entries) {
            const hours = entry.hoursWorked / 100; // Konwersja z groszy na godziny
            const hourlyRate = entry.hourlyRateClient || employee.hourlyRateClient || 0;
            revenue += Math.round(hours * hourlyRate);
          }
          
          totalRevenue += revenue;
          
          // Użyj aktualnego kosztu pracownika
          totalEmployeeCosts += employee.monthlyCostTotal;
        }
      }
      
      // Pobierz koszty stałe
      const fixedCosts = await db.getActiveFixedCosts();
      const totalFixedCosts = fixedCosts.reduce((sum, cost) => {
        // Przelicz na koszt miesięczny w zależności od frequency
        let monthlyCost = 0;
        switch (cost.frequency) {
          case 'monthly':
            monthlyCost = cost.amount;
            break;
          case 'quarterly':
            monthlyCost = Math.round(cost.amount / 3);
            break;
          case 'yearly':
            monthlyCost = Math.round(cost.amount / 12);
            break;
          case 'one_time':
            monthlyCost = 0; // Jednorazowe koszty nie wliczamy do miesięcznych
            break;
        }
        return sum + monthlyCost;
      }, 0);
      
      const operatingProfit = totalRevenue - totalEmployeeCosts - totalFixedCosts;
      const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
      
      // Debug log
      console.log('[dashboard.kpi] Calculations:', {
        totalRevenue: totalRevenue,
        totalEmployeeCosts: totalEmployeeCosts,
        totalFixedCosts: totalFixedCosts,
        operatingProfit: operatingProfit,
        operatingMargin: operatingMargin,
      });
      
      return {
        totalRevenue: Math.round(totalRevenue), // Już w groszach z bazy (hourlyRateClient jest w groszach)
        employeeCosts: Math.round(totalEmployeeCosts), // Już w groszach z bazy (monthlyCostTotal jest w groszach)
        fixedCosts: totalFixedCosts, // Już w groszach z bazy (fixedCosts.amount jest w groszach)
        operatingProfit: Math.round(operatingProfit), // Już w groszach (różnica wartości w groszach)
        operatingMargin: Math.round(operatingMargin * 100) / 100,
        employeeCount: employees.length,
      };
    }),

    // Dokładne wyniki miesięczne z raportów pracowników
    getAccurateMonthlyResults: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        const { year, month } = input;
        
        // Pobierz wszystkich aktywnych pracowników
        const employees = await db.getActiveEmployees();
        
        let totalRevenue = 0;
        let totalEmployeeCosts = 0;
        
        // Dla każdego pracownika pobierz godziny z time_entries
        for (const employee of employees) {
          // Pobierz zapisany raport miesięczny (jeśli istnieje)
          const savedReport = await db.getMonthlyReport(employee.id, year, month);
          
          // Jeśli istnieje zapisany raport, użyj zapisanych wartości (snapshot)
          if (savedReport && savedReport.hoursWorked > 0) {
            // Użyj zapisanych wartości z momentu zapisu raportu
            const revenue = savedReport.revenue; // Zapisany przychód
            const employeeCost = savedReport.actualCost ?? savedReport.cost; // Użyj actualCost jeśli istnieje, w przeciwnym razie zapisany cost
            
            totalRevenue += revenue;
            totalEmployeeCosts += employeeCost;
          } else {
            // Brak zapisanego raportu - użyj aktualnych danych
            // Pobierz wszystkie wpisy godzinowe dla pracownika w danym miesiącu z informacją o assignment
            const database = await db.getDb();
            if (!database) continue;
            
            const { timeEntries, employeeProjectAssignments } = await import("../drizzle/schema");
            const { sql, eq, and } = await import("drizzle-orm");
            
            const entries = await database
              .select({
                hoursWorked: timeEntries.hoursWorked,
                hourlyRateClient: employeeProjectAssignments.hourlyRateClient,
              })
              .from(timeEntries)
              .innerJoin(
                employeeProjectAssignments,
                eq(timeEntries.assignmentId, employeeProjectAssignments.id)
              )
              .where(
                and(
                  eq(employeeProjectAssignments.employeeId, employee.id),
                  sql`YEAR(${timeEntries.workDate}) = ${year}`,
                  sql`MONTH(${timeEntries.workDate}) = ${month}`
                )
              );
            
            // Jeśli brak wpisów, pomiń pracownika
            if (entries.length === 0) continue;
            
            // Oblicz przychód używając stawki z assignment dla każdego wpisu
            let revenue = 0;
            for (const entry of entries) {
              const hours = entry.hoursWorked / 100; // Konwersja z groszy na godziny
              const hourlyRate = entry.hourlyRateClient || employee.hourlyRateClient || 0;
              revenue += Math.round(hours * hourlyRate);
            }
            
            totalRevenue += revenue;
            
            // Użyj aktualnego kosztu pracownika
            totalEmployeeCosts += employee.monthlyCostTotal;
          }
        }
        
        // Pobierz koszty stałe
        const fixedCosts = await db.getActiveFixedCosts();
        const totalFixedCosts = fixedCosts.reduce((sum: number, cost: any) => {
          let monthlyCost = 0;
          switch (cost.frequency) {
            case 'monthly':
              monthlyCost = cost.amount;
              break;
            case 'quarterly':
              monthlyCost = Math.round(cost.amount / 3);
              break;
            case 'yearly':
              monthlyCost = Math.round(cost.amount / 12);
              break;
            case 'one_time':
              monthlyCost = 0;
              break;
          }
          return sum + monthlyCost;
        }, 0);
        
        const operatingProfit = totalRevenue - totalEmployeeCosts - totalFixedCosts;
        const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
        
        return {
          totalRevenue: Math.round(totalRevenue), // Zaokrąglij dla spójności z dashboard.kpi
          employeeCosts: Math.round(totalEmployeeCosts), // Zaokrąglij dla spójności z dashboard.kpi
          fixedCosts: totalFixedCosts, // Już zaokrąglone w reduce (monthlyCost)
          operatingProfit: Math.round(operatingProfit), // Zaokrąglij dla spójności z dashboard.kpi
          operatingMargin: Math.round(operatingMargin * 100) / 100,
        };
      }),
    
    // Ranking pracowników według rentowności (cały rok)
    getTopEmployeesByYear: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(20).default(10),
        year: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const now = new Date();
        const year = input?.year ?? now.getFullYear();
        const limit = input?.limit ?? 10;
        
        const employees = await db.getActiveEmployees();
        const employeeStats = [];
        
        for (const employee of employees) {
          // Pobierz wszystkie zapisane raporty miesięczne dla tego pracownika w danym roku
          const savedReports = await db.getMonthlyReportsByEmployeeAndYear(employee.id, year);
          
          let totalRevenue = 0;
          let totalCost = 0;
          let totalHours = 0;
          
          // Sumuj dane ze wszystkich miesięcy
          for (const savedReport of savedReports) {
            if (savedReport.hoursWorked > 0) {
              totalRevenue += savedReport.revenue;
              totalCost += savedReport.actualCost ?? savedReport.cost;
              totalHours += savedReport.hoursWorked / 100; // Konwersja z groszy na godziny
            }
          }
          
          // Jeśli brak zapisanych raportów, spróbuj pobrać z timeEntries
          if (totalHours === 0) {
            const entries = await db.getTimeEntriesByEmployeeAndYear(employee.id, year);
            if (entries.length > 0) {
              // Grupuj godziny per miesiąc i oblicz dla każdego miesiąca
              const monthlyHours: Record<number, number> = {};
              for (const entry of entries) {
                const entryDate = new Date(entry.workDate);
                const month = entryDate.getMonth() + 1;
                if (!monthlyHours[month]) {
                  monthlyHours[month] = 0;
                }
                monthlyHours[month] += entry.hoursWorked;
              }
              
              // Dla każdego miesiąca oblicz przychód i koszt
              for (let month = 1; month <= 12; month++) {
                const hours = (monthlyHours[month] || 0) / 100;
                if (hours > 0) {
                  const revenue = Math.round(hours * employee.hourlyRateClient);
                  const cost = employee.monthlyCostTotal;
                  totalRevenue += revenue;
                  totalCost += cost;
                  totalHours += hours;
                }
              }
            }
          }
          
          if (totalHours > 0) {
            const totalProfit = totalRevenue - totalCost;
            const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
            employeeStats.push({
              employeeId: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              position: employee.position,
              revenue: totalRevenue,
              cost: totalCost,
              profit: totalProfit,
              hours: totalHours,
              margin: Math.round(margin * 100) / 100,
            });
          }
        }
        
        // Sortuj po zysku (malejąco) i zwróć top N
        return employeeStats
          .sort((a, b) => b.profit - a.profit)
          .slice(0, limit);
      }),
    
    // Ranking pracowników według rentowności (bieżący miesiąc)
    getTopEmployees: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(20).default(10),
        year: z.number().optional(),
        month: z.number().min(1).max(12).optional(),
      }).optional())
      .query(async ({ input }) => {
        const now = new Date();
        const year = input?.year ?? now.getFullYear();
        const month = input?.month ?? now.getMonth() + 1;
        const limit = input?.limit ?? 10;
        
        const employees = await db.getActiveEmployees();
        const employeeStats = [];
        
        for (const employee of employees) {
          // Pobierz zapisany raport miesięczny (jeśli istnieje)
          const savedReport = await db.getMonthlyReport(employee.id, year, month);
          
          let revenue = 0;
          let cost = 0;
          let profit = 0;
          let hours = 0;
          
          if (savedReport && savedReport.hoursWorked > 0) {
            // Użyj zapisanych wartości
            revenue = savedReport.revenue;
            cost = savedReport.actualCost ?? savedReport.cost;
            profit = savedReport.profit;
            hours = savedReport.hoursWorked / 100;
          } else {
            // Brak zapisanego raportu - użyj aktualnych danych
            const database = await db.getDb();
            if (!database) continue;
            
            const { timeEntries, employeeProjectAssignments } = await import("../drizzle/schema");
            const { sql, eq, and } = await import("drizzle-orm");
            
            const entries = await database
              .select({
                hoursWorked: timeEntries.hoursWorked,
                hourlyRateClient: employeeProjectAssignments.hourlyRateClient,
              })
              .from(timeEntries)
              .innerJoin(
                employeeProjectAssignments,
                eq(timeEntries.assignmentId, employeeProjectAssignments.id)
              )
              .where(
                and(
                  eq(employeeProjectAssignments.employeeId, employee.id),
                  sql`YEAR(${timeEntries.workDate}) = ${year}`,
                  sql`MONTH(${timeEntries.workDate}) = ${month}`
                )
              );
            
            if (entries.length === 0) continue;
            
            // Oblicz godziny i przychód używając stawki z assignment
            hours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0) / 100;
            revenue = 0;
            for (const entry of entries) {
              const entryHours = entry.hoursWorked / 100;
              const hourlyRate = entry.hourlyRateClient || employee.hourlyRateClient || 0;
              revenue += Math.round(entryHours * hourlyRate);
            }
            cost = employee.monthlyCostTotal;
            profit = revenue - cost;
          }
          
          if (hours > 0) {
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
            employeeStats.push({
              employeeId: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              position: employee.position,
              revenue,
              cost,
              profit,
              hours,
              margin: Math.round(margin * 100) / 100,
            });
          }
        }
        
        // Sortuj po zysku (malejąco) i zwróć top N
        return employeeStats
          .sort((a, b) => b.profit - a.profit)
          .slice(0, limit);
      }),
    
    // Analiza rentowności projektów
    getProjectProfitability: protectedProcedure
      .input(z.object({
        year: z.number().optional(),
        month: z.number().min(1).max(12).optional(),
      }).optional())
      .query(async ({ input }) => {
        const now = new Date();
        const year = input?.year ?? now.getFullYear();
        const month = input?.month ?? now.getMonth() + 1;
        
        const projects = await db.getAllProjects();
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { employeeProjectAssignments, timeEntries } = await import("../drizzle/schema");
        const { sql, eq, and } = await import("drizzle-orm");
        
        const projectStats = [];
        
        for (const project of projects) {
          // Pobierz wszystkie assignments dla tego projektu
          const assignments = await database
            .select({
              id: employeeProjectAssignments.id,
              employeeId: employeeProjectAssignments.employeeId,
              hourlyRateClient: employeeProjectAssignments.hourlyRateClient,
              hourlyRateCost: employeeProjectAssignments.hourlyRateCost,
            })
            .from(employeeProjectAssignments)
            .where(eq(employeeProjectAssignments.projectId, project.id));
          
          // Policz unikalnych pracowników
          const uniqueEmployees = new Set(assignments.map(a => a.employeeId));
          const employeeCount = uniqueEmployees.size;
          
          let totalRevenue = 0;
          let totalCost = 0;
          let totalHours = 0;
          
          for (const assignment of assignments) {
            // Pobierz wpisy godzinowe dla tego assignment w danym miesiącu
            const entries = await database
              .select()
              .from(timeEntries)
              .where(
                and(
                  eq(timeEntries.assignmentId, assignment.id),
                  sql`YEAR(${timeEntries.workDate}) = ${year}`,
                  sql`MONTH(${timeEntries.workDate}) = ${month}`
                )
              );
            
            const hours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0) / 100;
            const revenue = Math.round(hours * assignment.hourlyRateClient);
            const cost = Math.round(hours * assignment.hourlyRateCost);
            
            totalRevenue += revenue;
            totalCost += cost;
            totalHours += hours;
          }
          
          const profit = totalRevenue - totalCost;
          const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
          
          // Oblicz średnią stawkę godzinową (dla klienta) na podstawie wszystkich assignments
          let totalRateSum = 0;
          let rateCount = 0;
          for (const assignment of assignments) {
            totalRateSum += assignment.hourlyRateClient;
            rateCount++;
          }
          const averageHourlyRate = rateCount > 0 ? Math.round(totalRateSum / rateCount) : 0;
          
          projectStats.push({
            projectId: project.id,
            projectName: project.name,
            clientId: project.clientId,
            status: project.status,
            revenue: totalRevenue,
            cost: totalCost,
            profit,
            hours: totalHours,
            margin: Math.round(margin * 100) / 100,
            employeeCount: employeeCount,
            averageHourlyRate: averageHourlyRate,
          });
        }
        
        // Sortuj po zysku (malejąco)
        return projectStats.sort((a, b) => b.profit - a.profit);
      }),
    
    // Trendy zysków/strat (ostatnie N miesięcy)
    getProfitTrends: protectedProcedure
      .input(z.object({
        months: z.number().min(1).max(24).default(12),
      }))
      .query(async ({ input }) => {
        const { months } = input;
        const now = new Date();
        const trends = [];
        
        // Iteruj przez ostatnie N miesięcy
        for (let i = months - 1; i >= 0; i--) {
          const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = targetDate.getFullYear();
          const month = targetDate.getMonth() + 1;
          
          // Pobierz wszystkich aktywnych pracowników
          const employees = await db.getActiveEmployees();
          
          let totalRevenue = 0;
          let totalEmployeeCosts = 0;
          
          for (const employee of employees) {
            // Pobierz wszystkie wpisy godzinowe dla pracownika w danym miesiącu
            const entries = await db.getTimeEntriesByEmployeeAndMonth(employee.id, year, month);
            
            // Jeśli brak wpisów, pomiń pracownika
            if (entries.length === 0) continue;
            
            // Zsumuj godziny (godziny są zapisane jako grosze, np. 13100 = 131h)
            const totalHours = entries.reduce((sum: number, entry: any) => sum + entry.hoursWorked, 0) / 100; // Konwersja z groszy na godziny
            
            // Oblicz przychód: godziny × stawka klienta (w groszach)
            const revenue = Math.round(totalHours * employee.hourlyRateClient);
            totalRevenue += revenue;
            
            // Sprawdź czy jest custom koszt w monthlyEmployeeReports
            const customReport = await db.getMonthlyReport(employee.id, year, month);
            const employeeCost = customReport?.actualCost 
              ? customReport.actualCost 
              : employee.monthlyCostTotal;
            
            totalEmployeeCosts += employeeCost;
          }
          
          // Koszty stałe
          const fixedCosts = await db.getActiveFixedCosts();
          const totalFixedCosts = fixedCosts.reduce((sum: number, cost: any) => {
            let monthlyCost = 0;
            switch (cost.frequency) {
              case 'monthly': monthlyCost = cost.amount; break;
              case 'quarterly': monthlyCost = Math.round(cost.amount / 3); break;
              case 'yearly': monthlyCost = Math.round(cost.amount / 12); break;
              case 'one_time': monthlyCost = 0; break;
            }
            return sum + monthlyCost;
          }, 0);
          
          const operatingProfit = totalRevenue - totalEmployeeCosts - totalFixedCosts;
          
          trends.push({
            month: `${year}-${String(month).padStart(2, '0')}`,
            revenue: totalRevenue,
            employeeCosts: totalEmployeeCosts,
            fixedCosts: totalFixedCosts,
            totalCosts: totalEmployeeCosts + totalFixedCosts,
            profit: operatingProfit,
          });
        }
        
        return trends;
      }),
  }),

  // ============ EMPLOYEE PROFIT SIMULATOR ============
  employeeProfit: router({
    simulate: protectedProcedure
      .input(z.object({
        employmentType: z.enum(["uop", "b2b", "zlecenie", "zlecenie_studenckie"]),
        monthlySalaryNet: z.number(),
        hourlyRateClient: z.number(),
        hourlyRateEmployee: z.number(),
        expectedHoursPerMonth: z.number().optional(),
        vacationDaysPerYear: z.number().min(0).max(365).optional(),
      }))
      .query(async ({ input }) => {
        const { simulateNegotiation } = await import("./employeeProfitCalculator");
        return simulateNegotiation(
          input.employmentType,
          input.monthlySalaryNet,
          input.hourlyRateClient,
          input.hourlyRateEmployee,
          input.expectedHoursPerMonth,
          input.vacationDaysPerYear
        );
      }),
    
    calculateMinRate: protectedProcedure
      .input(z.object({
        monthlyCostTotal: z.number(),
        targetMarginPercentage: z.number(),
        expectedHoursPerMonth: z.number().default(168),
      }))
      .query(async ({ input }) => {
        const { calculateMinimumClientRate } = await import("./employeeProfitCalculator");
        return {
          minimumRate: calculateMinimumClientRate(
            input.monthlyCostTotal,
            input.targetMarginPercentage,
            input.expectedHoursPerMonth
          ),
        };
      }),
  }),

  // ============ TASKS ============
  tasks: router({
    getAll: protectedProcedure.query(async () => {
      return db.getAllTasks();
    }),
    
    getByStatus: protectedProcedure
      .input(z.object({
        status: z.enum(["planned", "in_progress", "urgent", "done"]),
      }))
      .query(async ({ input }) => {
        return db.getTasksByStatus(input.status);
      }),
    
    getUrgent: protectedProcedure
      .input(z.object({
        limit: z.number().default(10),
      }))
      .query(async ({ input }) => {
        return db.getUrgentTasks(input.limit);
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        status: z.enum(["planned", "in_progress", "urgent", "done"]).default("planned"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTask(input);
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        status: z.enum(["planned", "in_progress", "urgent", "done"]).optional(),
        completedAt: z.date().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTask(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteTask(input.id);
        return { success: true };
      }),
  }),

  // ============ KNOWLEDGE BASE ============
  knowledgeBase: router({
    getAll: protectedProcedure.query(async () => {
      return db.getAllKnowledgeBase();
    }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        content: z.string().min(1),
        label: z.string().max(100).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createKnowledgeBase(input);
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().min(1).optional(),
        label: z.string().max(100).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateKnowledgeBase(id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteKnowledgeBase(input.id);
        return { success: true };
      }),
  }),

  // ============ EMPLOYEE CV ============
  employeeCV: router({
    get: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
      }))
      .query(async ({ input }) => {
        const cv = await db.getEmployeeCVWithDetails(input.employeeId);
        return cv;
      }),
    
    createOrUpdate: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        yearsOfExperience: z.number().min(0),
        summary: z.string().optional(), // Opis profilu (długi opis)
        tagline: z.string().optional(), // Krótki opis (2-3 zdania)
        seniorityLevel: z.string().optional(), // Poziom: Junior, Mid, Senior
        skills: z.array(z.object({
          name: z.string(), // Umiejętności miękkie - wpisywane ręcznie
        })).optional(),
        technologies: z.array(z.object({
          name: z.string(), // Technologie - wybierane z listy
          category: z.string().optional(), // Kategoria technologii
          proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]),
        })).optional(),
        languages: z.array(z.object({
          name: z.string(), // Nazwa języka (np. "Polski", "Angielski")
          level: z.string().optional(), // Poziom (np. "ojczysty", "B2", "C1", "B2 / C1 – swobodna komunikacja w projektach")
        })).optional(),
        projects: z.array(z.object({
          projectId: z.number(),
          description: z.string().optional(),
          role: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          technologies: z.string().optional(),
          keywords: z.string().optional(), // Słowa kluczowe dla projektu (pomocne dla AI)
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const cvId = await db.createOrUpdateEmployeeCV(input);
        return { cvId, success: true };
      }),
    
    generate: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
      }))
      .query(async ({ input }) => {
        const cv = await db.getEmployeeCVWithDetails(input.employeeId);
        if (!cv) {
          throw new Error("CV not found");
        }
        
        const employee = await db.getEmployeeById(input.employeeId);
        if (!employee) {
          throw new Error("Employee not found");
        }
        
        // Pobierz projekty z pełnymi danymi
        const cvProjects = await db.getEmployeeCVProjects(cv.id);
        
        return {
          employee,
          cv,
          projects: cvProjects.map(p => ({
            ...p.cvProject,
            project: p.project,
          })),
        };
      }),
    
    generateHTML: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        language: z.enum(["pl", "en"]).default("pl"), // Język CV: pl = polski, en = angielski
      }))
      .mutation(async ({ input }) => {
        const { generateCVHTML } = await import("./cvGenerator");
        const result = await generateCVHTML(input.employeeId, input.language);
        return result;
      }),
    
    getHistory: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getCVHistory(input.employeeId);
      }),
    
    getHistoryById: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input }) => {
        const history = await db.getCVHistoryById(input.id);
        if (!history) {
          throw new Error("CV history not found");
        }
        return history;
      }),
    
    deleteHistory: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const history = await db.getCVHistoryById(input.id);
        if (!history) {
          throw new Error("CV history not found");
        }
        await db.deleteCVHistory(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
