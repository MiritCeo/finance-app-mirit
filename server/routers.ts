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
        vacationDaysPerYear: z.number().default(20),
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
      }))
      .query(async ({ input }) => {
        const { employmentType, monthlySalaryNet, hourlyRateEmployee } = input;
        
        let result: any = {};
        
        // Dla UoP: monthlySalaryNet to BRUTTO, dla pozostałych to NETTO
        if (employmentType === "uop") {
          const uopResult = calculateUOP(monthlySalaryNet);
          // Dodaj koszty urlopów
          const vacationCostMonthly = Math.round((hourlyRateEmployee * 168) / 12);
          const vacationCostAnnual = hourlyRateEmployee * 168;
          result = {
            ...uopResult,
            employerCostWithVacation: uopResult.employerCost + vacationCostMonthly,
            vacationCostMonthly,
            vacationCostAnnual,
          };
        } else if (employmentType === "b2b") {
          result = calculateB2B(monthlySalaryNet, hourlyRateEmployee);
        } else if (employmentType === "zlecenie") {
          result = calculateZlecenieFromNet(monthlySalaryNet);
        } else if (employmentType === "zlecenie_studenckie") {
          result = calculateZlecenieStudenckieFromNet(monthlySalaryNet);
        }
        
        // Oblicz koszt godzinowy
        const hourlyRateCost = result.employerCostWithVacation ? Math.round(result.employerCostWithVacation / 168) : 0;
        
        return {
          monthlySalaryGross: result.grossSalary || result.breakdown?.grossSalary || 0,
          netSalary: result.netSalary || 0,
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
          monthlyHours[month] += entry.hoursWorked / 100; // Konwersja z groszy na godziny
        }
        
        // Pobierz zapisane raporty miesięczne (z actualCost)
        const savedReports = await db.getMonthlyReportsByEmployeeAndYear(employeeId, year);
        const savedReportsMap = new Map(savedReports.map(r => [r.month, r]));
        
        // Uzupełnij wszystkie miesiące (1-12)
        const allMonths = [];
        for (let month = 1; month <= 12; month++) {
          const hoursWorked = monthlyHours[month] || 0;
          const hourlyRateClient = employee.hourlyRateClient / 100; // Konwersja z groszy na złotówki
          const revenue = Math.round(hoursWorked * hourlyRateClient); // hourlyRateClient już jest w groszach
          const defaultCost = employee.monthlyCostTotal; // Koszt domyślny z bazy (w groszach)
          
          // Pobierz actualCost z zapisanego raportu (jeśli istnieje)
          const savedReport = savedReportsMap.get(month) as any;
          const actualCost = savedReport?.actualCost ?? null;
          
          // Użyj actualCost jeśli istnieje, w przeciwnym razie defaultCost
          const cost = actualCost ?? defaultCost;
          const profit = revenue - cost;
          
          allMonths.push({
            id: (savedReport as any)?.id || 0,
            employeeId,
            year,
            month,
            hoursWorked,
            hourlyRateClient: employee.hourlyRateClient,
            revenue,
            defaultCost,
            actualCost,
            cost,
            profit,
            createdAt: (savedReport as any)?.createdAt || new Date(),
            updatedAt: (savedReport as any)?.updatedAt || new Date(),
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
        const revenue = Math.round((hoursWorked / 100) * hourlyRateClient); // hoursWorked w groszach (np. 16800 = 168h)
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
        const data = {
          ...input,
          workDate: new Date(input.workDate),
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
          hoursWorked: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Sprawdź czy istnieje domyślny projekt dla raportowania
        const projects = await db.getAllProjects();
        let defaultProject = projects.find(p => p.name === "Raportowanie miesięczne");
        
        if (!defaultProject) {
          // Utwórz domyślny projekt
          const clients = await db.getAllClients();
          const defaultClient = clients[0]; // Użyj pierwszego klienta lub utwórz domyślnego
          
          if (!defaultClient) {
            throw new Error("Brak klientów w systemie. Dodaj przynajmniej jednego klienta.");
          }
          
          const projectId = await db.createProject({
            clientId: defaultClient.id,
            name: "Raportowanie miesięczne",
            billingModel: "time_material",
            status: "active",
            startDate: new Date(),
          });
          
          defaultProject = await db.getProjectById(projectId);
        }
        
        // Dla każdego pracownika, znajdź lub utwórz aktywne przypisanie
        for (const entry of input.entries) {
          const employee = await db.getEmployeeById(entry.employeeId);
          if (!employee) continue;
          
          const assignments = await db.getAssignmentsByEmployee(entry.employeeId);
          let activeAssignment = assignments.find(a => a.isActive);
          
          if (!activeAssignment && defaultProject) {
            // Utwórz domyślne przypisanie
            const assignmentId = await db.createAssignment({
              employeeId: entry.employeeId,
              projectId: defaultProject.id,
              hourlyRateClient: employee.hourlyRateClient || 0,
              hourlyRateCost: employee.hourlyRateCost || 0,
              assignmentStart: new Date(),
              isActive: true,
            });
            
            activeAssignment = await db.getAssignmentById(assignmentId);
          }
          
          if (activeAssignment) {
            // Utwórz wpis na ostatni dzień miesiąca
            const lastDay = new Date(input.year, input.month, 0).getDate();
            const workDate = new Date(input.year, input.month - 1, lastDay);
            
            await db.createTimeEntry({
              assignmentId: activeAssignment.id,
              workDate,
              hoursWorked: Math.round(entry.hoursWorked * 100), // Konwersja na setne (100h = 10000)
              description: `Raport miesięczny za ${input.month}/${input.year}`,
            });
          }
        }
        return { success: true };
      }),
    
    monthlyReports: protectedProcedure.query(async () => {
      // Pobierz wszystkie dane za jednym razem (optymalizacja N+1)
      const entries = await db.getAllTimeEntries();
      const allEmployees = await db.getActiveEmployees();
      
      // Pobierz wszystkie assignments
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      const allAssignments = await database.select().from(employeeProjectAssignments);
      
      // Utwórz mapy dla szybkiego dostępu
      const assignmentMap = new Map(allAssignments.map((a: any) => [a.id, a]));
      const employeeMap = new Map(allEmployees.map(e => [e.id, e]));
      
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
      
      for (const entry of entries) {
        const date = new Date(entry.workDate);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const key = `${year}-${month}`;
        
        const assignment = assignmentMap.get(entry.assignmentId);
        if (!assignment) continue;
        
        const employee = employeeMap.get(assignment.employeeId);
        if (!employee) continue;
        
        if (!reportMap.has(key)) {
          reportMap.set(key, {
            month,
            year,
            totalHours: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            employeeCount: new Set(),
          });
        }
        
        const report = reportMap.get(key)!;
        const hours = entry.hoursWorked / 100;
        const revenue = hours * assignment.hourlyRateClient;
        
        report.totalHours += hours;
        report.totalRevenue += revenue;
        report.employeeCount.add(assignment.employeeId);
      }
      
      // Oblicz pełne miesięczne koszty pracowników dla każdego miesiąca
      for (const [key, report] of Array.from(reportMap.entries())) {
        let totalMonthlyCost = 0;
        
        // Dla każdego pracownika który miał wpisy w tym miesiącu, dodaj pełny miesięczny koszt
        for (const employeeId of Array.from(report.employeeCount)) {
          const employee = employeeMap.get(employeeId);
          if (!employee) continue;
          
          // Użyj zapisanego kosztu miesięcznego (już zawiera urlopy)
          totalMonthlyCost += employee.monthlyCostTotal;
        }
        
        report.totalCost = totalMonthlyCost;
        report.totalProfit = report.totalRevenue - totalMonthlyCost;
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
          
          const hours = entry.hoursWorked / 100;
          const revenue = hours * assignment.hourlyRateClient;
          
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
    kpi: protectedProcedure.query(async () => {
      // Pobierz wszystkich aktywnych pracowników
      const employees = await db.getActiveEmployees();
      
      // Suma kosztów pracowników
      const employeeCosts = employees.reduce((sum, emp) => sum + emp.monthlyCostTotal, 0);
      
      // Oblicz rzeczywisty przychód z time entries
      // Pobierz wszystkie time entries z bieżącego miesiąca
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const timeEntries = await db.getTimeEntriesByDateRange(
        firstDayOfMonth.toISOString().split('T')[0],
        lastDayOfMonth.toISOString().split('T')[0]
      );
      
      // Oblicz przychód: suma (godziny × stawka klienta) dla każdego time entry
      let totalRevenue = 0;
      for (const entry of timeEntries) {
        // Pobierz assignment aby uzyskać stawkę klienta i projekt
        const assignment = await db.getAssignmentById(entry.assignmentId);
        
        if (assignment) {
          // Przychód = godziny × stawka klienta
          // hoursWorked jest w setnych (np. 8.5h = 850)
          const revenue = Math.round((entry.hoursWorked / 100) * assignment.hourlyRateClient);
          totalRevenue += revenue;
        }
      }
      
      // Jeśli brak time entries (np. nowy miesiąc), użyj uproszczonego obliczenia
      if (totalRevenue === 0 && employees.length > 0) {
        totalRevenue = Math.round(employeeCosts * 1.2); // 20% marża dla przykładu
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
      
      const operatingProfit = totalRevenue - employeeCosts - totalFixedCosts;
      const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
      
      return {
        totalRevenue,
        employeeCosts,
        fixedCosts: totalFixedCosts,
        operatingProfit,
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
        
        // Dla każdego pracownika pobierz raport miesięczny
        for (const employee of employees) {
          // Pobierz raport miesięczny dla tego pracownika
          const report = await db.getMonthlyReport(employee.id, year, month);
          
          // Jeśli brak raportu, pomiń pracownika
          if (!report) continue;
          
          // Dodaj przychód i koszt z raportu
          totalRevenue += report.revenue;
          
          // Koszt = actualCost jeśli istnieje, w przeciwnym razie cost
          const cost = report.actualCost ?? report.cost;
          totalEmployeeCosts += cost;
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
          totalRevenue,
          employeeCosts: totalEmployeeCosts,
          fixedCosts: totalFixedCosts,
          operatingProfit,
          operatingMargin: Math.round(operatingMargin * 100) / 100,
        };
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
            // Pobierz raport miesięczny dla tego pracownika
            const report = await db.getMonthlyReport(employee.id, year, month);
            
            // Jeśli brak raportu, pomiń pracownika
            if (!report) continue;
            
            // Dodaj przychód i koszt z raportu
            totalRevenue += report.revenue;
            
            // Koszt = actualCost jeśli istnieje, w przeciwnym razie cost
            const cost = report.actualCost ?? report.cost;
            totalEmployeeCosts += cost;
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
      }))
      .query(async ({ input }) => {
        const { simulateNegotiation } = await import("./employeeProfitCalculator");
        return simulateNegotiation(
          input.employmentType,
          input.monthlySalaryNet,
          input.hourlyRateClient,
          input.hourlyRateEmployee,
          input.expectedHoursPerMonth
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
});

export type AppRouter = typeof appRouter;
