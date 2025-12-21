import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, employeeProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { employeeProjectAssignments, officePresenceSettings, officeLocations } from "../drizzle/schema";
import { eq } from "drizzle-orm";
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
import XLSX from "xlsx";
import {
  testHRappkaConnection,
  getHRappkaEmployees,
  getHRappkaTimeReports,
  getAllHRappkaTimeReports,
  callHRappkaApi,
  authenticateHRappka,
  getHRappkaEmployeeInfo,
} from "./_core/hrappka";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      console.log("[Auth] me query - user role:", user?.role, "employeeId:", user?.employeeId);
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ EMPLOYEES ============
  employees: router({
    list: adminProcedure.query(async () => {
      return await db.getAllEmployees();
    }),
    
    active: adminProcedure.query(async () => {
      return await db.getActiveEmployees();
    }),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEmployeeById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        position: z.string().optional(),
        employmentType: z.enum(["uop", "b2b", "zlecenie", "zlecenie_studenckie"]),
        email: z.string().email().optional().nullable(),
        passwordHash: z.string().optional().nullable(),
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
        // Jeśli podano hasło, zahashuj je przed zapisaniem
        let employeeData = { ...input };
        if (input.passwordHash && input.passwordHash.length > 0) {
          const bcrypt = await import("bcrypt");
          employeeData.passwordHash = await bcrypt.default.hash(input.passwordHash, 10);
        } else {
          employeeData.passwordHash = null;
        }
        
        const id = await db.createEmployee(employeeData);
        return { id, success: true };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        position: z.string().optional(),
        employmentType: z.enum(["uop", "b2b", "zlecenie", "zlecenie_studenckie"]).optional(),
        email: z.string().email().optional().nullable(),
        passwordHash: z.string().optional().nullable(),
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
        
        // Jeśli podano hasło, zahashuj je przed zapisaniem
        if (data.passwordHash && data.passwordHash.length > 0) {
          const bcrypt = await import("bcrypt");
          data.passwordHash = await bcrypt.default.hash(data.passwordHash, 10);
        } else if (data.passwordHash === "") {
          // Puste string oznacza usunięcie hasła
          data.passwordHash = null;
        }
        
        await db.updateEmployee(id, data);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEmployee(input.id);
        return { success: true };
      }),

    /**
     * Przypisuje HRappka ID do pracownika
     */
    assignHRappkaId: adminProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
        hrappkaId: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.assignHRappkaId(input.employeeId, input.hrappkaId);
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: errorMessage,
          });
        }
      }),

    /**
     * Usuwa przypisanie HRappka ID z pracownika
     */
    unassignHRappkaId: adminProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        await db.unassignHRappkaId(input.employeeId);
        return { success: true };
      }),

    /**
     * Pobiera listę pracowników z HRappka do mapowania
     */
    getHRappkaEmployeesForMapping: adminProcedure.query(async () => {
      try {
        // Pobierz lokalnych pracowników (zawsze dostępne)
        const localEmployees = await db.getAllEmployees();
        
        // Spróbuj pobrać pracowników z HRappka (może nie być dostępne)
        let hrappkaEmployees: any[] = [];
        try {
          hrappkaEmployees = await getHRappkaEmployees();
        } catch (hrappkaError) {
          console.warn("[HRappka] Could not fetch employees from HRappka, using empty list:", hrappkaError);
          // Kontynuuj z pustą listą - użytkownik zobaczy tylko lokalnych pracowników
        }
        
        // Stwórz mapę lokalnych pracowników z hrappkaId
        const mappedHRappkaIds = new Set(
          localEmployees
            .filter(emp => emp.hrappkaId !== null)
            .map(emp => emp.hrappkaId)
        );
        
        return {
          success: true,
          hrappkaEmployees: hrappkaEmployees.map(emp => ({
            ...emp,
            isMapped: mappedHRappkaIds.has(emp.id),
            localEmployeeId: localEmployees.find(le => le.hrappkaId === emp.id)?.id,
          })),
          localEmployees: localEmployees.map(emp => ({
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            hrappkaId: emp.hrappkaId,
            hrappkaEmployee: emp.hrappkaId 
              ? hrappkaEmployees.find(he => he.id === emp.hrappkaId)
              : null,
          })),
        };
      } catch (error) {
        console.error("[HRappka] Error in getHRappkaEmployeesForMapping:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Nie udało się pobrać danych do mapowania: ${errorMessage}`,
        });
      }
    }),

    /**
     * Pobiera raporty godzinowe dla pracownika z naszej aplikacji (używając jego hrappkaId)
     */
    getTimeReportsFromHRappka: adminProcedure
      .input(
        z.object({
          employeeId: z.number().int().positive(),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD").optional(),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD").optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          // Pobierz pracownika z naszej aplikacji
          const employee = await db.getEmployeeById(input.employeeId);
          if (!employee) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pracownik nie został znaleziony",
            });
          }

          if (!employee.hrappkaId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Pracownik nie ma przypisanego HRappka ID. Najpierw przypisz HRappka ID do pracownika.",
            });
          }

          // Pobierz raporty z HRappka używając hrappkaId
          // Daty są opcjonalne - jeśli nie podano, pobierz wszystkie dostępne dane
          const reports = await getHRappkaTimeReports(
            employee.hrappkaId,
            input.startDate,
            input.endDate
          );

          return {
            success: true,
            employee: {
              id: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              hrappkaId: employee.hrappkaId,
            },
            reports,
            count: reports.length,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          console.error(`[HRappka] Error fetching time reports for employee ${input.employeeId}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Nie udało się pobrać raportów godzinowych: ${errorMessage}`,
          });
        }
      }),

    /**
     * Synchronizuje godziny z HRappka dla pojedynczego pracownika
     */
    syncHoursFromHRappka: adminProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { employeeId, month, year } = input;
          
          // Pobierz pracownika
          const employee = await db.getEmployeeById(employeeId);
          if (!employee) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pracownik nie został znaleziony",
            });
          }

          if (!employee.hrappkaId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Pracownik nie ma przypisanego HRappka ID. Najpierw przypisz HRappka ID do pracownika.",
            });
          }

          // Pobierz przypisania pracownika do projektów
          const assignments = await db.getAssignmentsByEmployee(employeeId);
          const activeAssignments = assignments.filter(a => a.isActive);
          
          if (activeAssignments.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Pracownik nie ma aktywnych przypisań do projektów. Najpierw przypisz pracownika do projektu.",
            });
          }

          // Oblicz daty początku i końca miesiąca
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

          console.log(`[HRappka Sync] Fetching hours for employee ${employee.id} (HRappka ID: ${employee.hrappkaId}), month: ${month}/${year}, dates: ${startDate} to ${endDate}`);

          // Pobierz godziny z HRappka (najpierw REAL)
          let reports = await getHRappkaTimeReports(
            employee.hrappkaId,
            startDate,
            endDate,
            "REAL"
          );

          console.log(`[HRappka Sync] Received ${reports.length} REAL reports for employee ${employee.id}`);

          // Jeśli brak danych w REAL, spróbuj NORMALIZED
          if (reports.length === 0) {
            console.log(`[HRappka Sync] No REAL reports, trying NORMALIZED type for employee ${employee.id}`);
            const normalizedReports = await getHRappkaTimeReports(
              employee.hrappkaId,
              startDate,
              endDate,
              "NORMALIZED"
            );
            console.log(`[HRappka Sync] Received ${normalizedReports.length} NORMALIZED reports for employee ${employee.id}`);
            
            if (normalizedReports.length > 0) {
              reports = normalizedReports; // Użyj znormalizowanych raportów
            }
          }

          if (reports.length === 0) {
            return {
              success: true,
              message: "Brak godzin do synchronizacji. Sprawdź logi serwera dla szczegółów lub czy pracownik ma zarejestrowane godziny w HRappka dla wybranego miesiąca.",
              syncedCount: 0,
            };
          }

          // Grupuj godziny per dzień (suma godzin w danym dniu)
          const hoursByDate = new Map<string, number>();
          for (const report of reports) {
            const date = report.date;
            const hours = report.hours || 0;
            if (hours > 0) {
              const current = hoursByDate.get(date) || 0;
              hoursByDate.set(date, current + hours);
            }
          }

          // Dla każdego dnia, rozdziel godziny między projekty
          // Jeśli jest tylko jeden projekt, przypisz wszystkie godziny do niego
          // Jeśli jest więcej projektów, rozdziel równo (można później ulepszyć)
          let syncedCount = 0;
          const workDate = new Date(year, month - 1, lastDay);

          for (const [date, totalHours] of hoursByDate.entries()) {
            // Jeśli jest tylko jeden projekt, przypisz wszystkie godziny
            if (activeAssignments.length === 1) {
              const assignment = activeAssignments[0];
              const hoursInGrosze = Math.round(totalHours * 100); // Konwersja do groszy
              
              // Sprawdź czy już istnieje wpis dla tego assignment i daty
              const existingEntries = await db.getTimeEntriesByAssignment(assignment.id);
              const dateObj = new Date(date);
              const exists = existingEntries.some(e => {
                const eDate = new Date(e.workDate);
                return eDate.getFullYear() === dateObj.getFullYear() &&
                       eDate.getMonth() === dateObj.getMonth() &&
                       eDate.getDate() === dateObj.getDate();
              });

              if (!exists) {
                await db.createTimeEntry({
                  assignmentId: assignment.id,
                  workDate: dateObj,
                  hoursWorked: hoursInGrosze,
                  description: `Synchronizacja z HRappka - ${date}`,
                });
                syncedCount++;
              }
            } else {
              // Jeśli jest więcej projektów, rozdziel równo
              const hoursPerProject = totalHours / activeAssignments.length;
              for (const assignment of activeAssignments) {
                const hoursInGrosze = Math.round(hoursPerProject * 100);
                
                // Sprawdź czy już istnieje wpis
                const existingEntries = await db.getTimeEntriesByAssignment(assignment.id);
                const dateObj = new Date(date);
                const exists = existingEntries.some(e => {
                  const eDate = new Date(e.workDate);
                  return eDate.getFullYear() === dateObj.getFullYear() &&
                         eDate.getMonth() === dateObj.getMonth() &&
                         eDate.getDate() === dateObj.getDate();
                });

                if (!exists && hoursInGrosze > 0) {
                  await db.createTimeEntry({
                    assignmentId: assignment.id,
                    workDate: dateObj,
                    hoursWorked: hoursInGrosze,
                    description: `Synchronizacja z HRappka - ${date}`,
                  });
                  syncedCount++;
                }
              }
            }
          }

          return {
            success: true,
            message: `Zsynchronizowano ${syncedCount} wpisów godzinowych`,
            syncedCount,
            totalHoursFromHRappka: Array.from(hoursByDate.values()).reduce((a, b) => a + b, 0),
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          console.error(`[HRappka] Error syncing hours for employee ${input.employeeId}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Nie udało się zsynchronizować godzin: ${errorMessage}`,
          });
        }
      }),

    /**
     * Synchronizuje godziny z HRappka dla wszystkich zmapowanych pracowników w danym miesiącu
     */
    syncHoursFromHRappkaForMonth: adminProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { month, year } = input;
          
          // Pobierz wszystkich pracowników z hrappkaId
          const employees = await db.getEmployeesWithHRappkaId();
          
          if (employees.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Brak pracowników z przypisanym HRappka ID. Najpierw przypisz HRappka ID do pracowników.",
            });
          }

          // Oblicz daty
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

          const results = [];
          let totalSynced = 0;

          // Synchronizuj dla każdego pracownika
          for (const employee of employees) {
            try {
              // Pobierz przypisania
              const assignments = await db.getAssignmentsByEmployee(employee.id);
              const activeAssignments = assignments.filter(a => a.isActive);
              
              if (activeAssignments.length === 0) {
                results.push({
                  employeeId: employee.id,
                  employeeName: `${employee.firstName} ${employee.lastName}`,
                  success: false,
                  message: "Brak aktywnych przypisań do projektów",
                });
                continue;
              }

              // Pobierz godziny z HRappka
              const reports = await getHRappkaTimeReports(
                employee.hrappkaId!,
                startDate,
                endDate
              );

              if (reports.length === 0) {
                results.push({
                  employeeId: employee.id,
                  employeeName: `${employee.firstName} ${employee.lastName}`,
                  success: true,
                  message: "Brak godzin do synchronizacji",
                  syncedCount: 0,
                });
                continue;
              }

              // Grupuj godziny per dzień
              const hoursByDate = new Map<string, number>();
              for (const report of reports) {
                const date = report.date;
                const hours = report.hours || 0;
                if (hours > 0) {
                  const current = hoursByDate.get(date) || 0;
                  hoursByDate.set(date, current + hours);
                }
              }

              // Zapisz wpisy
              let syncedCount = 0;
              for (const [date, totalHours] of hoursByDate.entries()) {
                if (activeAssignments.length === 1) {
                  const assignment = activeAssignments[0];
                  const hoursInGrosze = Math.round(totalHours * 100);
                  
                  const existingEntries = await db.getTimeEntriesByAssignment(assignment.id);
                  const dateObj = new Date(date);
                  const exists = existingEntries.some(e => {
                    const eDate = new Date(e.workDate);
                    return eDate.getFullYear() === dateObj.getFullYear() &&
                           eDate.getMonth() === dateObj.getMonth() &&
                           eDate.getDate() === dateObj.getDate();
                  });

                  if (!exists) {
                    await db.createTimeEntry({
                      assignmentId: assignment.id,
                      workDate: dateObj,
                      hoursWorked: hoursInGrosze,
                      description: `Synchronizacja z HRappka - ${date}`,
                    });
                    syncedCount++;
                  }
                } else {
                  const hoursPerProject = totalHours / activeAssignments.length;
                  for (const assignment of activeAssignments) {
                    const hoursInGrosze = Math.round(hoursPerProject * 100);
                    
                    const existingEntries = await db.getTimeEntriesByAssignment(assignment.id);
                    const dateObj = new Date(date);
                    const exists = existingEntries.some(e => {
                      const eDate = new Date(e.workDate);
                      return eDate.getFullYear() === dateObj.getFullYear() &&
                             eDate.getMonth() === dateObj.getMonth() &&
                             eDate.getDate() === dateObj.getDate();
                    });

                    if (!exists && hoursInGrosze > 0) {
                      await db.createTimeEntry({
                        assignmentId: assignment.id,
                        workDate: dateObj,
                        hoursWorked: hoursInGrosze,
                        description: `Synchronizacja z HRappka - ${date}`,
                      });
                      syncedCount++;
                    }
                  }
                }
              }

              totalSynced += syncedCount;
              results.push({
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                success: true,
                message: `Zsynchronizowano ${syncedCount} wpisów`,
                syncedCount,
              });
            } catch (error) {
              results.push({
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                success: false,
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }

          return {
            success: true,
            message: `Zsynchronizowano godziny dla ${results.filter(r => r.success).length} z ${results.length} pracowników`,
            totalSynced,
            results,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          console.error(`[HRappka] Error syncing hours for month ${input.month}/${input.year}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Nie udało się zsynchronizować godzin: ${errorMessage}`,
          });
        }
      }),

    /**
     * Synchronizuje godziny z HRappka dla wszystkich zmapowanych pracowników w danym miesiącu z nadpisaniem istniejących
     */
    syncHoursFromHRappkaForMonthWithOverwrite: adminProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { month, year } = input;
          
          // Pobierz wszystkich pracowników z hrappkaId
          const employees = await db.getEmployeesWithHRappkaId();
          
          if (employees.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Brak pracowników z przypisanym HRappka ID. Najpierw przypisz HRappka ID do pracowników.",
            });
          }

          // Oblicz daty
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

          const results = [];
          let totalSynced = 0;
          let totalDeleted = 0;

          // Synchronizuj dla każdego pracownika
          for (const employee of employees) {
            try {
              // Pobierz przypisania
              const assignments = await db.getAssignmentsByEmployee(employee.id);
              const activeAssignments = assignments.filter(a => a.isActive);
              
              if (activeAssignments.length === 0) {
                results.push({
                  employeeId: employee.id,
                  employeeName: `${employee.firstName} ${employee.lastName}`,
                  success: false,
                  message: "Brak aktywnych przypisań do projektów",
                });
                continue;
              }

              // USUŃ istniejące wpisy dla tego pracownika w danym miesiącu
              await db.deleteTimeEntriesForEmployeeInMonth(employee.id, month, year);
              totalDeleted++;

              // Pobierz godziny z HRappka
              const reports = await getHRappkaTimeReports(
                employee.hrappkaId!,
                startDate,
                endDate
              );

              if (reports.length === 0) {
                results.push({
                  employeeId: employee.id,
                  employeeName: `${employee.firstName} ${employee.lastName}`,
                  success: true,
                  message: "Brak godzin do synchronizacji (stare wpisy zostały usunięte)",
                  syncedCount: 0,
                });
                continue;
              }

              // Grupuj godziny per dzień
              const hoursByDate = new Map<string, number>();
              for (const report of reports) {
                const date = report.date;
                const hours = report.hours || 0;
                if (hours > 0) {
                  const current = hoursByDate.get(date) || 0;
                  hoursByDate.set(date, current + hours);
                }
              }

              // Zapisz nowe wpisy
              let syncedCount = 0;
              for (const [date, totalHours] of hoursByDate.entries()) {
                if (activeAssignments.length === 1) {
                  const assignment = activeAssignments[0];
                  const hoursInGrosze = Math.round(totalHours * 100);
                  
                  if (hoursInGrosze > 0) {
                    await db.createTimeEntry({
                      assignmentId: assignment.id,
                      workDate: new Date(date),
                      hoursWorked: hoursInGrosze,
                      description: `Synchronizacja z HRappka (nadpisanie) - ${date}`,
                    });
                    syncedCount++;
                  }
                } else {
                  const hoursPerProject = totalHours / activeAssignments.length;
                  for (const assignment of activeAssignments) {
                    const hoursInGrosze = Math.round(hoursPerProject * 100);
                    
                    if (hoursInGrosze > 0) {
                      await db.createTimeEntry({
                        assignmentId: assignment.id,
                        workDate: new Date(date),
                        hoursWorked: hoursInGrosze,
                        description: `Synchronizacja z HRappka (nadpisanie) - ${date}`,
                      });
                      syncedCount++;
                    }
                  }
                }
              }

              totalSynced += syncedCount;
              results.push({
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                success: true,
                message: `Zaktualizowano ${syncedCount} wpisów`,
                syncedCount,
              });
            } catch (error) {
              results.push({
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                success: false,
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }

          return {
            success: true,
            message: `Zaktualizowano godziny dla ${results.filter(r => r.success).length} z ${results.length} pracowników (usunięto ${totalDeleted} starych wpisów)`,
            totalSynced,
            totalDeleted,
            results,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          console.error(`[HRappka] Error syncing hours with overwrite for month ${input.month}/${input.year}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Nie udało się zaktualizować godzin: ${errorMessage}`,
          });
        }
      }),

    /**
     * Synchronizuje dane pracownika z HRappka (pobiera aktualne dane z HRappka)
     */
    syncFromHRappka: adminProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Pobierz pracownika z naszej aplikacji
          const employee = await db.getEmployeeById(input.employeeId);
          if (!employee) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pracownik nie został znaleziony",
            });
          }

          if (!employee.hrappkaId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Pracownik nie ma przypisanego HRappka ID. Najpierw przypisz HRappka ID do pracownika.",
            });
          }

          // Pobierz dane pracownika z HRappka
          const hrappkaEmployees = await getHRappkaEmployees();
          const hrappkaEmployee = hrappkaEmployees.find(he => he.id === employee.hrappkaId);

          if (!hrappkaEmployee) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Nie znaleziono pracownika z ID ${employee.hrappkaId} w HRappka`,
            });
          }

          // Zaktualizuj dane pracownika (tylko podstawowe informacje, które mogą się zmienić)
          const updateData: Partial<typeof employee> = {};
          
          if (hrappkaEmployee.firstName && hrappkaEmployee.firstName !== employee.firstName) {
            updateData.firstName = hrappkaEmployee.firstName;
          }
          if (hrappkaEmployee.lastName && hrappkaEmployee.lastName !== employee.lastName) {
            updateData.lastName = hrappkaEmployee.lastName;
          }
          if (hrappkaEmployee.email && hrappkaEmployee.email !== employee.email) {
            updateData.email = hrappkaEmployee.email;
          }
          if (hrappkaEmployee.position && hrappkaEmployee.position !== employee.position) {
            updateData.position = hrappkaEmployee.position;
          }
          if (hrappkaEmployee.isActive !== undefined && hrappkaEmployee.isActive !== employee.isActive) {
            updateData.isActive = hrappkaEmployee.isActive;
          }

          if (Object.keys(updateData).length > 0) {
            await db.updateEmployee(input.employeeId, updateData);
          }

          return {
            success: true,
            updated: Object.keys(updateData).length > 0,
            updateData,
            hrappkaEmployee,
          };
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          console.error(`[HRappka] Error syncing employee ${input.employeeId}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Nie udało się zsynchronizować danych pracownika: ${errorMessage}`,
          });
        }
      }),
    
    updateLoginData: adminProcedure
      .input(z.object({
        id: z.number(),
        email: z.string().email().optional().nullable(),
        password: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, email, password } = input;
        
        const updateData: any = {};
        if (email !== undefined) {
          updateData.email = email;
        }
        
        if (password !== undefined && password !== null && password.length > 0) {
          const bcrypt = await import("bcrypt");
          const passwordHash = await bcrypt.default.hash(password, 10);
          await db.updateEmployeePassword(id, passwordHash);
        }
        
        if (Object.keys(updateData).length > 0) {
          await db.updateEmployee(id, updateData);
        }
        
        return { success: true };
      }),
    
    calculateSalary: adminProcedure
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
    getAnnualReport: adminProcedure
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
          
          if (savedReport) {
            // Użyj zapisanych wartości z momentu zapisu raportu (snapshot)
            // Używamy zapisanego raportu niezależnie od liczby godzin - jeśli raport istnieje, jest to prawda źródłowa
            hoursWorked = savedReport.hoursWorked / 100; // Konwersja z groszy na godziny
            hourlyRateClient = savedReport.hourlyRateClient; // Zapisana stawka w groszach
            revenue = savedReport.revenue; // Zapisany przychód w groszach
            defaultCost = savedReport.cost; // Zapisany koszt domyślny - NIE ZMIENIA SIĘ po edycji pracownika
          } else {
            // Brak zapisanego raportu - użyj aktualnych danych
            hoursWorked = (monthlyHours[month] || 0) / 100; // Konwersja z groszy na godziny (13100 -> 131h)
            hourlyRateClient = employee.hourlyRateClient ?? 0; // Aktualna stawka w groszach
            revenue = Math.round(hoursWorked * hourlyRateClient); // godziny × stawka w groszach
            defaultCost = employee.monthlyCostTotal ?? 0; // Aktualny koszt domyślny z bazy (w groszach)
          }
          
          // Pobierz actualCost z zapisanego raportu (jeśli istnieje)
          const actualCost = savedReport?.actualCost ?? null;
          
          // Użyj actualCost jeśli istnieje, w przeciwnym razie defaultCost
          // defaultCost jest zawsze zapisaną wartością z momentu zapisu raportu (jeśli raport istnieje)
          const cost = actualCost ?? defaultCost;
          
          // Jeśli mamy zapisany raport i nie zmieniono actualCost, użyj zapisanego profit
          // W przeciwnym razie przelicz profit (może być zmieniony przez actualCost)
          let profit: number;
          if (savedReport && actualCost === null) {
            // Użyj zapisanego profit jeśli nie ma actualCost (zapisany profit jest poprawny)
            profit = savedReport.profit;
          } else {
            // Przelicz profit (może być zmieniony przez actualCost lub to nowy raport)
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
    updateActualCost: adminProcedure
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

    /**
     * Aktualizuje godzin, stawkę i/lub koszt w raporcie miesięcznym
     * Automatycznie propaguje zmiany do timeEntries i assignments
     */
    updateMonthlyReport: adminProcedure
      .input(z.object({
        employeeId: z.number(),
        year: z.number(),
        month: z.number(),
        hoursWorked: z.number().optional(), // w godzinach (będzie przekonwertowane na grosze)
        hourlyRateClient: z.number().optional(), // w PLN (będzie przekonwertowane na grosze)
        actualCost: z.number().nullable().optional(), // w PLN (będzie przekonwertowane na grosze)
        propagateChanges: z.boolean().default(true), // Czy propagować zmiany do timeEntries i assignments
      }))
      .mutation(async ({ input }) => {
        const { employeeId, year, month, hoursWorked, hourlyRateClient, actualCost, propagateChanges } = input;
        
        // Konwertuj wartości na grosze jeśli są podane
        const hoursWorkedInGrosze = hoursWorked !== undefined ? Math.round(hoursWorked * 100) : undefined;
        const hourlyRateClientInGrosze = hourlyRateClient !== undefined ? Math.round(hourlyRateClient * 100) : undefined;
        const actualCostInGrosze = actualCost !== null && actualCost !== undefined ? Math.round(actualCost * 100) : actualCost;
        
        await db.updateMonthlyReportFields({
          employeeId,
          year,
          month,
          hoursWorked: hoursWorkedInGrosze,
          hourlyRateClient: hourlyRateClientInGrosze,
          actualCost: actualCostInGrosze,
          propagateChanges,
        });
        
        return { success: true };
      }),

    /**
     * Propaguje wszystkie zmiany z raportów miesięcznych do timeEntries i assignments
     * dla wszystkich pracowników w danym miesiącu
     */
    propagateAllMonthlyChanges: adminProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .mutation(async ({ input }) => {
        const { year, month } = input;
        
        // Pobierz wszystkie raporty dla danego miesiąca
        const reports = await db.getMonthlyReportsByMonthAndYear(year, month);
        
        if (reports.length === 0) {
          return { 
            success: true, 
            message: "Brak raportów do propagacji",
            updatedCount: 0 
          };
        }
        
        let updatedCount = 0;
        const errors: string[] = [];
        
        // Dla każdego raportu wywołaj propagację zmian
        for (const report of reports) {
          try {
            // Wywołaj updateMonthlyReportFields z propagateChanges=true
            // Używamy aktualnych wartości z raportu, aby wymusić propagację
            await db.updateMonthlyReportFields({
              employeeId: report.employeeId,
              year: report.year,
              month: report.month,
              hoursWorked: report.hoursWorked, // Użyj aktualnych wartości
              hourlyRateClient: report.hourlyRateClient,
              actualCost: report.actualCost,
              propagateChanges: true, // Wymuś propagację
            });
            updatedCount++;
          } catch (error) {
            const employee = await db.getEmployeeById(report.employeeId);
            const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `ID: ${report.employeeId}`;
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`${employeeName}: ${errorMessage}`);
            console.error(`[Propagate] Błąd dla pracownika ${report.employeeId}:`, error);
          }
        }
        
        return {
          success: errors.length === 0,
          message: errors.length === 0
            ? `Zaktualizowano ${updatedCount} raportów i propagowano zmiany do timeEntries i assignments`
            : `Zaktualizowano ${updatedCount} z ${reports.length} raportów. Błędy: ${errors.length}`,
          updatedCount,
          totalCount: reports.length,
          errors: errors.length > 0 ? errors : undefined,
        };
      }),

    /**
     * Pobiera wszystkie raporty pracowników dla danego miesiąca i roku
     * Zwraca wszystkich aktywnych pracowników, nawet jeśli nie mają zapisanego raportu
     */
    getMonthlyReports: adminProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        const { year, month } = input;
        
        // Pobierz wszystkich aktywnych pracowników
        const allEmployees = await db.getActiveEmployees();
        
        // Pobierz zapisane raporty dla danego miesiąca
        const savedReports = await db.getMonthlyReportsByMonthAndYear(year, month);
        const reportsMap = new Map(savedReports.map(r => [r.employeeId, r]));
        
        // Dla każdego pracownika utwórz raport (zapisany lub obliczony z aktualnych danych)
        const reportsWithEmployees = await Promise.all(
          allEmployees.map(async (employee) => {
            const savedReport = reportsMap.get(employee.id);
            
            if (savedReport) {
              // Użyj zapisanego raportu
              return {
                id: savedReport.id,
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                year: savedReport.year,
                month: savedReport.month,
                hoursWorked: savedReport.hoursWorked, // w groszach (setnych godzin)
                hourlyRateClient: savedReport.hourlyRateClient,
                revenue: savedReport.revenue,
                cost: savedReport.cost,
                actualCost: savedReport.actualCost,
                profit: savedReport.profit,
                createdAt: savedReport.createdAt,
                updatedAt: savedReport.updatedAt,
                hasSavedReport: true,
              };
            } else {
              // Brak zapisanego raportu - oblicz z aktualnych danych
              try {
                // Pobierz godziny z timeEntries dla tego pracownika w danym miesiącu
                const timeEntriesList = await db.getTimeEntriesByEmployeeAndMonth(employee.id, year, month);
                
                // Oblicz łączne godziny
                const totalHoursWorked = timeEntriesList.reduce((sum, entry) => sum + (entry.hoursWorked || 0), 0);
                const hours = totalHoursWorked / 100; // Konwersja z groszy na godziny
                
                // Użyj domyślnej stawki klienta z pracownika (w groszach)
                let hourlyRateClient = (employee.hourlyRateClient ?? 0);
                
                // Jeśli są timeEntries, oblicz średnią ważoną stawki z assignments
                if (timeEntriesList.length > 0) {
                  const assignmentsMap = new Map<number, number>();
                  let totalHoursForRate = 0;
                  
                  for (const entry of timeEntriesList) {
                    if (entry.assignmentId) {
                      try {
                        const assignment = await db.getAssignmentById(entry.assignmentId);
                        if (assignment) {
                          const entryHours = (entry.hoursWorked || 0) / 100;
                          const rate = assignment.hourlyRateClient ?? employee.hourlyRateClient ?? 0;
                          assignmentsMap.set(entry.assignmentId, rate);
                          totalHoursForRate += entryHours;
                        }
                      } catch (err) {
                        console.error(`[getMonthlyReports] Error fetching assignment ${entry.assignmentId}:`, err);
                      }
                    }
                  }
                  
                  // Oblicz średnią ważoną stawki
                  if (totalHoursForRate > 0) {
                    let weightedSum = 0;
                    for (const entry of timeEntriesList) {
                      const entryHours = (entry.hoursWorked || 0) / 100;
                      const rate = assignmentsMap.get(entry.assignmentId) ?? employee.hourlyRateClient ?? 0;
                      weightedSum += entryHours * rate;
                    }
                    hourlyRateClient = Math.round(weightedSum / totalHoursForRate);
                  }
                }
                
                // Oblicz przychód (godziny w godzinach * stawka w groszach = przychód w groszach)
                const revenue = Math.round(hours * hourlyRateClient);
                
                // Koszt pracownika (w groszach)
                const cost = employee.monthlyCostTotal ?? 0;
                const profit = revenue - cost;
                
                return {
                  id: 0, // Brak zapisanego raportu
                  employeeId: employee.id,
                  employeeName: `${employee.firstName} ${employee.lastName}`,
                  year,
                  month,
                  hoursWorked: totalHoursWorked, // w groszach
                  hourlyRateClient,
                  revenue,
                  cost,
                  actualCost: null,
                  profit,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  hasSavedReport: false,
                };
              } catch (error) {
                console.error(`[getMonthlyReports] Error processing employee ${employee.id}:`, error);
                // Zwróć pusty raport w przypadku błędu
                return {
                  id: 0,
                  employeeId: employee.id,
                  employeeName: `${employee.firstName} ${employee.lastName}`,
                  year,
                  month,
                  hoursWorked: 0,
                  hourlyRateClient: employee.hourlyRateClient ?? 0,
                  revenue: 0,
                  cost: employee.monthlyCostTotal ?? 0,
                  actualCost: null,
                  profit: -(employee.monthlyCostTotal ?? 0),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  hasSavedReport: false,
                };
              }
            }
          })
        );
        
        // Sortuj po nazwisku
        reportsWithEmployees.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
        
        // Oblicz podsumowanie
        const summary = {
          totalHours: reportsWithEmployees.reduce((sum, r) => sum + (r.hoursWorked / 100), 0),
          totalRevenue: reportsWithEmployees.reduce((sum, r) => sum + r.revenue, 0),
          totalCost: reportsWithEmployees.reduce((sum, r) => sum + (r.actualCost ?? r.cost), 0),
          totalProfit: reportsWithEmployees.reduce((sum, r) => sum + r.profit, 0),
          employeeCount: reportsWithEmployees.length,
        };
        
        return {
          reports: reportsWithEmployees,
          summary,
        };
      }),
      
    // Aktualizacja godzin w raporcie miesięcznym
    updateMonthlyHours: adminProcedure
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
    
    // Eksport listy pracowników do Excel
    exportEmployees: adminProcedure.mutation(async () => {
      const employees = await db.getAllEmployees();
      
      // Przygotuj dane do eksportu
      const exportData = employees.map(emp => ({
        'ID': emp.id,
        'Imię': emp.firstName,
        'Nazwisko': emp.lastName,
        'Stanowisko': emp.position || '',
        'Typ umowy': emp.employmentType,
        'Wynagrodzenie brutto (PLN)': (emp.monthlySalaryGross / 100).toFixed(2),
        'Wynagrodzenie netto (PLN)': (emp.monthlySalaryNet / 100).toFixed(2),
        'Koszt całkowity (PLN)': (emp.monthlyCostTotal / 100).toFixed(2),
        'Stawka godzinowa koszt (PLN)': (emp.hourlyRateCost / 100).toFixed(2),
        'Stawka godzinowa pracownik (PLN)': (emp.hourlyRateEmployee / 100).toFixed(2),
        'Stawka godzinowa klient (PLN)': (emp.hourlyRateClient / 100).toFixed(2),
        'Koszt urlopu miesięczny (PLN)': (emp.vacationCostMonthly / 100).toFixed(2),
        'Koszt urlopu roczny (PLN)': (emp.vacationCostAnnual / 100).toFixed(2),
        'Dni urlopu rocznie': emp.vacationDaysPerYear,
        'Wykorzystane dni urlopu': emp.vacationDaysUsed,
        'Aktywny': emp.isActive ? 'Tak' : 'Nie',
        'Notatki': emp.notes || '',
      }));
      
      // Utwórz workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pracownicy');
      
      // Konwertuj do base64
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const base64 = excelBuffer.toString('base64');
      
      return {
        filename: `pracownicy_${new Date().toISOString().split('T')[0]}.xlsx`,
        data: base64,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),
    
    // Import listy pracowników z Excel
    importEmployees: adminProcedure
      .input(z.object({
        filename: z.string(),
        data: z.string(), // base64 string
      }))
      .mutation(async ({ input }) => {
        const { filename, data } = input;
        
        try {
          // Konwertuj base64 na buffer
          const buffer = Buffer.from(data, 'base64');
          
          if (buffer.length === 0) {
            throw new Error('Błąd: Pusty plik po konwersji base64');
          }
          
          // Odczytaj plik Excel
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Błąd: Plik Excel nie zawiera żadnych arkuszy');
          }
          
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          if (!worksheet) {
            throw new Error('Błąd: Nie można odczytać pierwszego arkusza');
          }
          
          const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          console.log(`[Import] Wczytano ${rows.length} wierszy z pliku Excel`);
          
          if (rows.length === 0) {
            throw new Error('Plik Excel jest pusty - brak danych do importu');
          }
          
          // Loguj pierwszy wiersz dla debugowania
          if (rows.length > 0) {
            console.log('[Import] Przykładowy wiersz:', JSON.stringify(rows[0], null, 2));
          }
        
        // Mapowanie typów umów
        const employmentTypeMap: Record<string, 'uop' | 'b2b' | 'zlecenie' | 'zlecenie_studenckie'> = {
          'uop': 'uop',
          'b2b': 'b2b',
          'zlecenie': 'zlecenie',
          'zlecenie_studenckie': 'zlecenie_studenckie',
          'zlecenie studenckie': 'zlecenie_studenckie',
        };
        
        const results = {
          created: 0,
          updated: 0,
          errors: [] as string[],
        };
        
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
              // Pobierz ID jeśli istnieje (dla aktualizacji)
              // Sprawdź czy ID jest rzeczywiście liczbą (nie puste, nie NaN)
              let id: number | null = null;
              const idValue = row['ID'];
              console.log(`[Import] Wiersz ${i + 2}: Surowa wartość ID z Excela:`, idValue, `(typ: ${typeof idValue})`);
              
              if (idValue !== null && idValue !== undefined && idValue !== '') {
                const parsedId = parseInt(String(idValue));
                if (!isNaN(parsedId) && parsedId > 0) {
                  id = parsedId;
                } else {
                  console.log(`[Import] Wiersz ${i + 2}: ID nie jest poprawną liczbą (${idValue} -> ${parsedId}), traktuję jako nowy pracownik`);
                }
              } else {
                console.log(`[Import] Wiersz ${i + 2}: Brak ID w Excelu, traktuję jako nowy pracownik`);
              }
              
              console.log(`[Import] Wiersz ${i + 2}: ID=${id}, Imię=${row['Imię'] || row['Imie']}, Nazwisko=${row['Nazwisko']}`);
            const firstName = row['Imię'] || row['Imie'] || '';
            const lastName = row['Nazwisko'] || '';
            const position = row['Stanowisko'] || '';
            const employmentTypeRaw = (row['Typ umowy'] || 'uop').toLowerCase();
            const employmentType = employmentTypeMap[employmentTypeRaw] || 'uop';
            
            // Funkcja pomocnicza do parsowania wartości finansowych
            // Obsługuje zarówno stringi jak i liczby, usuwa spacje i zamienia przecinki na kropki
            const parseFinancialValue = (value: any, defaultValue: number = 0): number => {
              if (value === null || value === undefined || value === '') {
                return defaultValue;
              }
              // Jeśli to już liczba, zwróć ją
              if (typeof value === 'number') {
                return value;
              }
              // Jeśli to string, usuń spacje i zamień przecinki na kropki
              const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
              const parsed = parseFloat(cleaned);
              return isNaN(parsed) ? defaultValue : parsed;
            };
            
            // Konwersja wartości finansowych z PLN na grosze
            const monthlySalaryGross = Math.round(parseFinancialValue(row['Wynagrodzenie brutto (PLN)'] || row['Wynagrodzenie brutto'], 0) * 100);
            const monthlySalaryNet = Math.round(parseFinancialValue(row['Wynagrodzenie netto (PLN)'] || row['Wynagrodzenie netto'], 0) * 100);
            const monthlyCostTotal = Math.round(parseFinancialValue(row['Koszt całkowity (PLN)'] || row['Koszt calkowity (PLN)'] || row['Koszt całkowity'], 0) * 100);
            const hourlyRateCost = Math.round(parseFinancialValue(row['Stawka godzinowa koszt (PLN)'] || row['Stawka godzinowa koszt'], 0) * 100);
            const hourlyRateEmployee = Math.round(parseFinancialValue(row['Stawka godzinowa pracownik (PLN)'] || row['Stawka godzinowa pracownik'], 0) * 100);
            const hourlyRateClient = Math.round(parseFinancialValue(row['Stawka godzinowa klient (PLN)'] || row['Stawka godzinowa klient'], 0) * 100);
            const vacationCostMonthly = Math.round(parseFinancialValue(row['Koszt urlopu miesięczny (PLN)'] || row['Koszt urlopu miesieczny (PLN)'] || row['Koszt urlopu miesięczny'], 0) * 100);
            const vacationCostAnnual = Math.round(parseFinancialValue(row['Koszt urlopu roczny (PLN)'] || row['Koszt urlopu roczny'], 0) * 100);
            const vacationDaysPerYear = parseInt(String(row['Dni urlopu rocznie'] || '21')) || 21;
            const vacationDaysUsed = parseInt(String(row['Wykorzystane dni urlopu'] || '0')) || 0;
            const isActive = row['Aktywny'] === 'Tak' || row['Aktywny'] === true || row['Aktywny'] === 'tak' || row['Aktywny'] === 1 || row['Aktywny'] === 'TAK';
            const notes = row['Notatki'] || '';
            
            // Walidacja wymaganych pól
            if (!firstName || !lastName) {
              results.errors.push(`Wiersz ${i + 2}: Brak imienia lub nazwiska`);
              continue;
            }
            
            const employeeData = {
              firstName,
              lastName,
              position: position || undefined,
              employmentType,
              monthlySalaryGross,
              monthlySalaryNet,
              monthlyCostTotal,
              hourlyRateCost,
              hourlyRateEmployee,
              hourlyRateClient,
              vacationCostMonthly,
              vacationCostAnnual,
              vacationDaysPerYear,
              vacationDaysUsed,
              isActive,
              notes: notes || undefined,
            };
            
            // Loguj dane przed zapisem (tylko dla pierwszych 2 wierszy, aby nie zaśmiecać logów)
            if (i < 2) {
              console.log(`[Import] Dane pracownika wiersz ${i + 2}:`, {
                id,
                firstName,
                lastName,
                employmentType,
                monthlySalaryNet: monthlySalaryNet / 100,
                monthlyCostTotal: monthlyCostTotal / 100,
                isActive
              });
            }
            
            if (id) {
              // Sprawdź czy pracownik z tym ID istnieje w bazie
              const existingEmployee = await db.getEmployeeById(id);
              if (existingEmployee) {
                // Aktualizuj istniejącego pracownika
                console.log(`[Import] Próba aktualizacji pracownika ID ${id}: ${firstName} ${lastName}`);
                await db.updateEmployee(id, employeeData);
                results.updated++;
                console.log(`[Import] ✓ Zaktualizowano pracownika ID ${id}: ${firstName} ${lastName}`);
              } else {
                // ID istnieje w Excelu, ale nie w bazie - utwórz nowego pracownika
                console.log(`[Import] ID ${id} istnieje w Excelu, ale nie w bazie - utworzenie nowego pracownika: ${firstName} ${lastName}`);
                const newId = await db.createEmployee(employeeData);
                results.created++;
                console.log(`[Import] ✓ Utworzono nowego pracownika ID ${newId} (Excel miał ID ${id}): ${firstName} ${lastName}`);
              }
            } else {
              // Utwórz nowego pracownika (brak ID w Excelu)
              console.log(`[Import] Próba utworzenia nowego pracownika (brak ID): ${firstName} ${lastName}`);
              const newId = await db.createEmployee(employeeData);
              results.created++;
              console.log(`[Import] ✓ Utworzono nowego pracownika ID ${newId}: ${firstName} ${lastName}`);
            }
          } catch (error: any) {
            const errorMsg = `Wiersz ${i + 2}: ${error.message || 'Nieznany błąd'}`;
            results.errors.push(errorMsg);
            console.error(`[Import] ✗ Błąd w wierszu ${i + 2}:`, {
              error: error.message,
              stack: error.stack,
              row: row
            });
          }
        }
        
        console.log(`[Import] Zakończono: ${results.created} utworzonych, ${results.updated} zaktualizowanych, ${results.errors.length} błędów`);
        
        return results;
        } catch (error: any) {
          console.error('[Import] Błąd podczas importu:', error);
          throw new Error(`Błąd importu: ${error.message || 'Nieznany błąd'}`);
        }
      }),
  }),

  vacations: router({
    // Pracownik: podsumowanie urlopów na dany rok
    mySummary: employeeProcedure
      .input(
        z
          .object({
            year: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.user?.employeeId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Brak powiązanego pracownika.",
          });
        }
        const year = input?.year ?? new Date().getFullYear();
        return db.getVacationSummaryForEmployee(ctx.user.employeeId, year);
      }),

    // Pracownik: lista własnych wniosków urlopowych
    myVacations: employeeProcedure
      .input(
        z
          .object({
            year: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.user?.employeeId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Brak powiązanego pracownika.",
          });
        }
        const year = input?.year ?? new Date().getFullYear();
        return db.getVacationsForEmployee(ctx.user.employeeId, year);
      }),

    // Admin: lista wszystkich wniosków urlopowych
    list: adminProcedure
      .input(
        z
          .object({
            year: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        const year = input?.year ?? new Date().getFullYear();
        const { vacations } = await import("../drizzle/schema");
        return database
          .select()
          .from(vacations)
          .where(sql`YEAR(${vacations.startDate}) = ${year}`)
          .orderBy(vacations.startDate);
      }),

    // Admin: zmiana statusu wniosku (zatwierdzenie / odrzucenie)
    changeStatus: adminProcedure
      .input(
        z.object({
          vacationId: z.number(),
          status: z.enum(["approved", "rejected"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.changeVacationStatus({
          vacationId: input.vacationId,
          status: input.status,
        });
        return { success: true as const };
      }),
  }),

  // ============ CLIENTS ============
  clients: router({
    list: adminProcedure.query(async () => {
      return await db.getAllClients();
    }),
    
    active: adminProcedure.query(async () => {
      return await db.getActiveClients();
    }),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getClientById(input.id);
      }),
    
    create: adminProcedure
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
    
    update: adminProcedure
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
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClient(input.id);
        return { success: true };
      }),
  }),

  // ============ PROJECTS ============
  projects: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProjects();
    }),
    
    byStatus: adminProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        return await db.getProjectsByStatus(input.status);
      }),
    
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectById(input.id);
      }),
    
    create: adminProcedure
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
    
    update: adminProcedure
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
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        try {
          await db.deleteProject(input.id);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message || "Nie można usunąć projektu",
          });
        }
      }),
    
    getStats: adminProcedure
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
    byProject: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssignmentsByProject(input.projectId);
      }),
    
    byEmployee: adminProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssignmentsByEmployee(input.employeeId);
      }),
    
    create: adminProcedure
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
    
    update: adminProcedure
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
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAssignment(input.id);
        return { success: true };
      }),
  }),

  // ============ TIME ENTRIES ============
  timeEntries: router({
    byAssignment: adminProcedure
      .input(z.object({ assignmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTimeEntriesByAssignment(input.assignmentId);
      }),
    
    recent: adminProcedure
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
    
    create: adminProcedure
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
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTimeEntry(input.id);
        return { success: true };
      }),
    
    saveMonthlyHours: adminProcedure
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
    
    deleteMonthlyReport: adminProcedure
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
    
    getMonthlyReportDetails: adminProcedure
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
    
    monthlyReports: adminProcedure.query(async () => {
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
    
    details: adminProcedure
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
    list: adminProcedure.query(async () => {
      return await db.getAllFixedCosts();
    }),
    
    active: adminProcedure.query(async () => {
      return await db.getActiveFixedCosts();
    }),
    
    create: adminProcedure
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
    
    update: adminProcedure
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
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFixedCost(input.id);
        return { success: true };
      }),
    
    totalMonthly: adminProcedure.query(async () => {
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
    simulate: adminProcedure
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
    
    save: adminProcedure
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
    
    list: adminProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await db.getSimulationsByUser(ctx.user.id);
    }),
  }),

  // ============ DASHBOARD / REPORTS ============
  dashboard: router({
    kpi: adminProcedure
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
          // KOSZT PRACOWNIKA ZAWSZE JEST LICZONY - niezależnie od zapisanych godzin
          // Dla WSZYSTKICH typów umów (UoP, B2B, zlecenie, zlecenie studenckie) 
          // koszt jest stały miesięczny - niezależnie od liczby przepracowanych godzin
          const employeeCost = employee.monthlyCostTotal;
          totalEmployeeCosts += employeeCost;
          
          // Przychód liczony tylko z rzeczywistych godzin (jeśli są wpisy)
          const database = await db.getDb();
          if (database) {
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
            
            // Oblicz przychód używając stawki z assignment dla każdego wpisu
            if (entries.length > 0) {
              let revenue = 0;
              
              // Oblicz przychód na podstawie godzin
              for (const entry of entries) {
                const hours = entry.hoursWorked / 100; // Konwersja z groszy na godziny
                const hourlyRateClient = entry.hourlyRateClient || employee.hourlyRateClient || 0;
                revenue += Math.round(hours * hourlyRateClient);
              }
              
              totalRevenue += revenue;
            }
          }
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
    getAccurateMonthlyResults: adminProcedure
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
            // KOSZT PRACOWNIKA ZAWSZE JEST LICZONY - niezależnie od zapisanych godzin
            // Dla WSZYSTKICH typów umów (UoP, B2B, zlecenie, zlecenie studenckie) 
            // koszt jest stały miesięczny - niezależnie od liczby przepracowanych godzin
            totalEmployeeCosts += employee.monthlyCostTotal;
            
            // Przychód liczony tylko z rzeczywistych godzin (jeśli są wpisy)
            const database = await db.getDb();
            if (database) {
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
              
              // Oblicz przychód używając stawki z assignment dla każdego wpisu
              if (entries.length > 0) {
                let revenue = 0;
                for (const entry of entries) {
                  const hours = entry.hoursWorked / 100; // Konwersja z groszy na godziny
                  const hourlyRate = entry.hourlyRateClient || employee.hourlyRateClient || 0;
                  revenue += Math.round(hours * hourlyRate);
                }
                
                totalRevenue += revenue;
              }
            }
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
    getTopEmployeesByYear: adminProcedure
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
    getTopEmployees: adminProcedure
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
    getProjectProfitability: adminProcedure
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
    
    // Rentowność projektu dla wszystkich 12 miesięcy danego roku
    getProjectProfitabilityByYear: adminProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        year: z.number().int().positive(),
      }))
      .query(async ({ input }) => {
        const { projectId, year } = input;
        
        const project = await db.getProjectById(projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Projekt nie został znaleziony",
          });
        }
        
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { employeeProjectAssignments, timeEntries } = await import("../drizzle/schema");
        const { sql, eq, and } = await import("drizzle-orm");
        
        // Pobierz wszystkie assignments dla tego projektu
        const assignments = await database
          .select({
            id: employeeProjectAssignments.id,
            employeeId: employeeProjectAssignments.employeeId,
            hourlyRateClient: employeeProjectAssignments.hourlyRateClient,
            hourlyRateCost: employeeProjectAssignments.hourlyRateCost,
          })
          .from(employeeProjectAssignments)
          .where(eq(employeeProjectAssignments.projectId, projectId));
        
        const monthlyStats = [];
        
        // Iteruj przez wszystkie 12 miesięcy
        for (let month = 1; month <= 12; month++) {
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
          
          monthlyStats.push({
            month,
            year,
            revenue: totalRevenue,
            cost: totalCost,
            profit,
            hours: totalHours,
            margin: Math.round(margin * 100) / 100,
          });
        }
        
        return {
          projectId: project.id,
          projectName: project.name,
          clientId: project.clientId,
          year,
          monthlyStats,
        };
      }),
    
    // Trendy zysków/strat (ostatnie N miesięcy)
    getProfitTrends: adminProcedure
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
            // KOSZT PRACOWNIKA ZAWSZE JEST LICZONY - niezależnie od zapisanych godzin
            // Sprawdź czy jest custom koszt w monthlyEmployeeReports
            const customReport = await db.getMonthlyReport(employee.id, year, month);
            const employeeCost = customReport?.actualCost 
              ? customReport.actualCost 
              : employee.monthlyCostTotal;
            
            totalEmployeeCosts += employeeCost;
            
            // Przychód liczony tylko z rzeczywistych godzin (jeśli są wpisy)
            const entries = await db.getTimeEntriesByEmployeeAndMonth(employee.id, year, month);
            
            if (entries.length > 0) {
              // Zsumuj godziny (godziny są zapisane jako grosze, np. 13100 = 131h)
              const totalHours = entries.reduce((sum: number, entry: any) => sum + entry.hoursWorked, 0) / 100; // Konwersja z groszy na godziny
              
              // Oblicz przychód: godziny × stawka klienta (w groszach)
              const revenue = Math.round(totalHours * employee.hourlyRateClient);
              totalRevenue += revenue;
            }
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
    simulate: adminProcedure
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
    
    calculateMinRate: adminProcedure
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
    getAll: adminProcedure.query(async () => {
      return db.getAllTasks();
    }),
    
    getByStatus: adminProcedure
      .input(z.object({
        status: z.enum(["planned", "in_progress", "urgent", "done"]),
      }))
      .query(async ({ input }) => {
        return db.getTasksByStatus(input.status);
      }),
    
    getUrgent: adminProcedure
      .input(z.object({
        limit: z.number().default(10),
      }))
      .query(async ({ input }) => {
        return db.getUrgentTasks(input.limit);
      }),
    
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        status: z.enum(["planned", "in_progress", "urgent", "done"]).default("planned"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTask(input);
        return { id, success: true };
      }),
    
    update: adminProcedure
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
    
    delete: adminProcedure
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
    // Pracownicy mogą czytać, ale tylko admin może edytować
    getAll: protectedProcedure.query(async () => {
      const articles = await db.getAllKnowledgeBase();
      // Dodaj informacje o autorach dla artykułów pracowników
      for (const article of articles) {
        if ((article as any).authorId && (article as any).articleType === "employee") {
          const author = await db.getUserById((article as any).authorId);
          if (author && author.employeeId) {
            const employee = await db.getEmployeeById(author.employeeId);
            if (employee) {
              (article as any).authorName = `${employee.firstName} ${employee.lastName}`;
            }
          } else if (author) {
            (article as any).authorName = author.name || author.email || "Nieznany";
          }
        }
      }
      return articles;
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        // Zwiększ licznik odczytów
        await db.incrementKnowledgeBaseViewCount(input.id, ctx.user?.id || null);
        return db.getKnowledgeBaseById(input.id);
      }),
    
    search: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        label: z.string().optional(),
        tags: z.string().optional(),
        projectId: z.number().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        sortBy: z.enum(["newest", "oldest", "title", "views"]).default("newest"),
      }))
      .query(async ({ input }) => {
        const articles = await db.searchKnowledgeBase(input);
        // Dodaj informacje o autorach dla artykułów pracowników
        for (const article of articles) {
          if ((article as any).authorId && (article as any).articleType === "employee") {
            const author = await db.getUserById((article as any).authorId);
            if (author && author.employeeId) {
              const employee = await db.getEmployeeById(author.employeeId);
              if (employee) {
                (article as any).authorName = `${employee.firstName} ${employee.lastName}`;
              }
            } else if (author) {
              (article as any).authorName = author.name || author.email || "Nieznany";
            }
          }
        }
        return articles;
      }),
    
    getFavorites: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.id) return [];
        return db.getKnowledgeBaseFavorites(ctx.user.id);
      }),
    
    toggleFavorite: protectedProcedure
      .input(z.object({ knowledgeBaseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
        return db.toggleKnowledgeBaseFavorite(ctx.user.id, input.knowledgeBaseId);
      }),
    
    getStats: adminProcedure
      .query(async () => {
        return db.getKnowledgeBaseStats();
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        content: z.string().min(1),
        label: z.string().max(100).optional(),
        tags: z.string().max(500).optional(),
        isPinned: z.boolean().optional(),
        projectId: z.number().optional().nullable(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        publishedAt: z.date().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Określ typ artykułu na podstawie roli użytkownika
        const articleType = ctx.user?.role === "admin" ? "admin" : "employee";
        const id = await db.createKnowledgeBase({
          ...input,
          authorId: ctx.user?.id || null,
          articleType: articleType as "admin" | "employee",
          projectId: input.projectId || null,
          status: (input.status || "published") as "draft" | "published" | "archived",
          publishedAt: input.publishedAt || null,
        });
        return { id, success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().min(1).optional(),
        label: z.string().max(100).optional(),
        tags: z.string().max(500).optional(),
        isPinned: z.boolean().optional(),
        projectId: z.number().optional().nullable(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        publishedAt: z.date().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Sprawdź czy artykuł istnieje i kto jest jego autorem
        const article = await db.getKnowledgeBaseById(id);
        if (!article) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Artykuł nie został znaleziony" });
        }
        
        // Pracownik może edytować tylko swoje artykuły, admin może edytować wszystkie
        if (ctx.user?.role !== "admin" && article.authorId !== ctx.user?.id) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Nie masz uprawnień do edycji tego artykułu" 
          });
        }
        
        await db.updateKnowledgeBase(id, data);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteKnowledgeBase(input.id);
        return { success: true };
      }),
    
    // ============ COMMENTS ============
    getComments: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input }) => {
        return db.getKnowledgeBaseComments(input.articleId);
      }),
    
    createComment: protectedProcedure
      .input(z.object({
        articleId: z.number(),
        parentId: z.number().optional().nullable(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
        const id = await db.createKnowledgeBaseComment({
          knowledgeBaseId: input.articleId,
          userId: ctx.user.id,
          parentId: input.parentId || null,
          content: input.content,
        });
        return { id, success: true };
      }),
    
    updateComment: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
        // TODO: Sprawdź czy użytkownik jest autorem komentarza
        await db.updateKnowledgeBaseComment(input.id, input.content);
        return { success: true };
      }),
    
    deleteComment: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
        // TODO: Sprawdź czy użytkownik jest autorem komentarza lub adminem
        await db.deleteKnowledgeBaseComment(input.id);
        return { success: true };
      }),
    
    // ============ LINKS ============
    getRelated: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .query(async ({ input }) => {
        return db.getRelatedArticles(input.articleId);
      }),
    
    suggestSimilar: protectedProcedure
      .input(z.object({ 
        articleId: z.number(),
        limit: z.number().min(1).max(10).optional().default(5),
      }))
      .query(async ({ input }) => {
        return db.suggestSimilarArticles(input.articleId, input.limit);
      }),
    
    createLink: protectedProcedure
      .input(z.object({
        fromArticleId: z.number(),
        toArticleId: z.number(),
        linkType: z.enum(["manual", "suggested"]).default("manual"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createKnowledgeBaseLink(input);
        return { id, success: true };
      }),
    
    deleteLink: protectedProcedure
      .input(z.object({
        fromArticleId: z.number(),
        toArticleId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteKnowledgeBaseLink(input.fromArticleId, input.toArticleId);
        return { success: true };
      }),
  }),

  // ============ EMPLOYEE CV ============
  employeeCV: router({
    get: employeeProcedure
      .input(z.object({
        employeeId: z.number().optional(), // Opcjonalne - jeśli nie podane, używa employeeId z kontekstu
      }))
      .query(async ({ input, ctx }) => {
        // Jeśli użytkownik jest pracownikiem, może zobaczyć tylko swoje CV
        let employeeId = input.employeeId;
        if (ctx.user?.role === 'employee' && ctx.user.employeeId) {
          employeeId = ctx.user.employeeId;
        } else if (!employeeId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "employeeId jest wymagane" });
        }
        
        const cv = await db.getEmployeeCVWithDetails(employeeId);
        return cv;
      }),
    
    createOrUpdate: employeeProcedure
      .input(z.object({
        employeeId: z.number().optional(), // Opcjonalne - jeśli nie podane, używa employeeId z kontekstu
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
      .mutation(async ({ input, ctx }) => {
        // Jeśli użytkownik jest pracownikiem, może edytować tylko swoje CV
        let employeeId = input.employeeId;
        if (ctx.user?.role === 'employee' && ctx.user.employeeId) {
          employeeId = ctx.user.employeeId;
        } else if (!employeeId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "employeeId jest wymagane" });
        }
        
        // Sprawdź czy pracownik próbuje edytować swoje CV
        if (ctx.user?.role === 'employee' && ctx.user.employeeId !== employeeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Możesz edytować tylko swoje CV" });
        }
        
        const cvId = await db.createOrUpdateEmployeeCV({ ...input, employeeId });
        return { cvId, success: true };
      }),
    
    generate: employeeProcedure
      .input(z.object({
        employeeId: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Jeśli użytkownik jest pracownikiem, może generować tylko swoje CV
        let employeeId = input.employeeId;
        if (ctx.user?.role === 'employee' && ctx.user.employeeId) {
          employeeId = ctx.user.employeeId;
        } else if (!employeeId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "employeeId jest wymagane" });
        }
        
        // Sprawdź czy pracownik próbuje generować swoje CV
        if (ctx.user?.role === 'employee' && ctx.user.employeeId !== employeeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Możesz generować tylko swoje CV" });
        }
        
        const cv = await db.getEmployeeCVWithDetails(employeeId);
        if (!cv) {
          throw new Error("CV not found");
        }
        
        const employee = await db.getEmployeeById(employeeId);
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
    
    generateHTML: employeeProcedure
      .input(z.object({
        employeeId: z.number().optional(), // Opcjonalne - jeśli nie podane, używa employeeId z kontekstu
        language: z.enum(["pl", "en"]).default("pl"), // Język CV: pl = polski, en = angielski
      }))
      .mutation(async ({ input, ctx }) => {
        // Jeśli użytkownik jest pracownikiem, może generować tylko swoje CV
        let employeeId = input.employeeId;
        if (ctx.user?.role === 'employee' && ctx.user.employeeId) {
          employeeId = ctx.user.employeeId;
        } else if (!employeeId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "employeeId jest wymagane" });
        }
        
        // Sprawdź czy pracownik próbuje generować swoje CV
        if (ctx.user?.role === 'employee' && ctx.user.employeeId !== employeeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Możesz generować tylko swoje CV" });
        }
        
        const { generateCVHTML } = await import("./cvGenerator");
        const result = await generateCVHTML(employeeId, input.language);
        return result;
      }),
    
    getHistory: employeeProcedure
      .input(z.object({
        employeeId: z.number().optional(), // Opcjonalne - jeśli nie podane, używa employeeId z kontekstu
      }))
      .query(async ({ input, ctx }) => {
        // Jeśli użytkownik jest pracownikiem, może zobaczyć tylko swoją historię
        let employeeId = input.employeeId;
        if (ctx.user?.role === 'employee' && ctx.user.employeeId) {
          employeeId = ctx.user.employeeId;
        } else if (!employeeId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "employeeId jest wymagane" });
        }
        
        return await db.getCVHistory(employeeId);
      }),
    
    getHistoryById: employeeProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const history = await db.getCVHistoryById(input.id);
        if (!history) {
          throw new Error("CV history not found");
        }
        
        // Zabezpieczenie: pracownik może zobaczyć tylko własną historię CV
        if (ctx.user?.role === "employee") {
          if (!ctx.user.employeeId || history.employeeId !== ctx.user.employeeId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Nie masz uprawnień do podglądu tej wersji CV",
            });
          }
        }
        
        return history;
      }),
    
    deleteHistory: employeeProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const history = await db.getCVHistoryById(input.id);
        if (!history) {
          throw new Error("CV history not found");
        }
        
        // Zabezpieczenie: pracownik może usuwać tylko własną historię CV
        if (ctx.user?.role === "employee") {
          if (!ctx.user.employeeId || history.employeeId !== ctx.user.employeeId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Nie masz uprawnień do usunięcia tej wersji CV",
            });
          }
        }
        
        await db.deleteCVHistory(input.id);
        return { success: true };
      }),
  }),

  // ============ OFFICE PRESENCE ============
  officePresence: router({
    /**
     * Returns current office presence status for logged-in employee.
     * Can be used to show whether there is an active session and today's rewards.
     */
    status: employeeProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return db.getOfficePresenceStatusForUser(ctx.user.id);
      }),

    /**
     * Starts office session for logged-in employee using geolocation coordinates.
     * If user is not within any active office location, returns isFromOffice=false.
     */
    startSession: employeeProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return db.startOfficeSessionForUser({
          userId: ctx.user.id,
          employeeId: ctx.user.employeeId || null,
          latitude: input.latitude,
          longitude: input.longitude,
        });
      }),

    /**
     * Ends current active office session for logged-in employee and calculates rewards.
     */
    endSession: employeeProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return db.endOfficeSessionForUser(ctx.user.id);
      }),

    /**
     * Admin-only: get current office presence settings (thresholds, points).
     */
    getSettings: adminProcedure
      .query(async () => {
        return db.getOrCreateOfficePresenceSettings();
      }),

    /**
     * Admin-only: update office presence settings (thresholds, points).
     */
    updateSettings: adminProcedure
      .input(z.object({
        minSessionMinutes: z.number().min(30).max(12 * 60).optional(),
        dayPoints: z.number().min(0).max(10000).optional(),
        streakLengthDays: z.number().min(1).max(365).optional(),
        streakPoints: z.number().min(0).max(100000).optional(),
      }))
      .mutation(async ({ input }) => {
        const settings = await db.getOrCreateOfficePresenceSettings();
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");

        const now = new Date();
        await database
          .update(officePresenceSettings)
          .set({
            minSessionMinutes: input.minSessionMinutes ?? settings.minSessionMinutes,
            dayPoints: input.dayPoints ?? settings.dayPoints,
            streakLengthDays: input.streakLengthDays ?? settings.streakLengthDays,
            streakPoints: input.streakPoints ?? settings.streakPoints,
            updatedAt: now,
          })
          .where(eq(officePresenceSettings.id, settings.id));

        const updated = await db.getOrCreateOfficePresenceSettings();
        return { success: true, settings: updated };
      }),

    /**
     * Admin-only: list all office locations.
     */
    listLocations: adminProcedure.query(async () => {
      return db.getAllOfficeLocations();
    }),

    /**
     * Admin-only: create a new office location.
     */
    createLocation: adminProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          radiusMeters: z.number().min(10).max(10000),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const location = await db.createOfficeLocation(input);
        return { success: true, location };
      }),

    /**
     * Admin-only: update an existing office location.
     */
    updateLocation: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(200).optional(),
          latitude: z.number().min(-90).max(90).optional(),
          longitude: z.number().min(-180).max(180).optional(),
          radiusMeters: z.number().min(10).max(10000).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        const location = await db.updateOfficeLocation({ id, ...updateData });
        return { success: true, location };
      }),

    /**
     * Admin-only: delete an office location.
     */
    deleteLocation: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOfficeLocation(input.id);
        return { success: true };
      }),
  }),

  // ============ GAMIFICATION ============
  gamification: router({
    /**
     * Employee view: basic overview of level, total points and office presence contribution.
     */
    mySummary: employeeProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.employeeId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Brak powiązanego pracownika dla tego konta.",
        });
      }

      return db.getGamificationSummaryForEmployee(ctx.user.employeeId);
    }),

    listQuests: adminProcedure.query(async () => {
      return db.getAllQuests();
    }),

    createQuest: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["individual", "team", "company"]).default("individual"),
        targetType: z.enum(["hours", "knowledge_base"]),
        targetValue: z.number().min(1),
        rewardPoints: z.number().min(0),
        rewardBadgeId: z.number().optional().nullable(),
        startDate: z.date().optional().nullable(),
        endDate: z.date().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createQuest({
          name: input.name,
          description: input.description || null,
          type: input.type,
          targetType: input.targetType,
          targetValue: input.targetValue,
          rewardPoints: input.rewardPoints,
          rewardBadgeId: input.rewardBadgeId || null,
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          createdAt: new Date(),
        } as any);
        return { success: true, id };
      }),

    listTeamGoals: adminProcedure.query(async () => {
      return db.getActiveTeamGoals();
    }),

    createTeamGoal: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        targetHours: z.number().min(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTeamGoal({
          name: input.name,
          description: input.description || null,
          targetHours: input.targetHours,
          currentHours: 0,
          status: "planned",
          startDate: null,
          endDate: null,
          createdAt: new Date(),
        } as any);
        return { success: true, id };
      }),

    /**
     * Admin: award/synchronize points za godziny dla wskazanego miesiąca.
     */
    awardHoursForMonth: adminProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }))
      .mutation(async ({ input }) => {
        const result = await db.awardHoursPointsForMonth(input.year, input.month);
        return { success: true, ...result };
      }),

    /**
     * Employee: list assigned quests with basic info.
     */
    myQuests: employeeProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.employeeId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Brak powiązanego pracownika dla tego konta.",
          });
        }
        return db.getQuestsForEmployee(ctx.user.employeeId);
      }),

    /**
     * Employee: register vacation plan and automatically award points
     * according to planning rules (no penalties). This now tworzy wniosek urlopowy
     * w tabeli vacations (status: pending) oraz meta-informacje w vacationPlans.
     * Punkty są przyznawane dopiero po zatwierdzeniu przez admina.
     */
    planVacation: employeeProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.employeeId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Brak powiązanego pracownika dla tego konta.",
          });
        }

        return {
          success: true,
          ...(await db.requestVacationWithPlan({
            employeeId: ctx.user.employeeId,
            startDate: input.startDate,
            endDate: input.endDate,
          })),
        };
      }),
  }),

  // ============ AI FINANCIAL ANALYTICS ============
  aiFinancial: router({
    /**
     * Analizuje rentowność projektów i zwraca insights z AI
     */
    analyzeProjects: adminProcedure
      .input(z.object({
        year: z.number().optional(),
        month: z.number().min(1).max(12).optional(),
      }).optional())
      .query(async ({ input }) => {
        const now = new Date();
        const year = input?.year ?? now.getFullYear();
        const month = input?.month ?? (now.getMonth() + 1);
        
        // Pobierz statystyki projektów - użyj bezpośrednio logiki z projects.getStats
        const projects = await db.getAllProjects();
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { employeeProjectAssignments, timeEntries } = await import("../drizzle/schema");
        const { sql, eq, and } = await import("drizzle-orm");
        
        const activeEmployees = await db.getActiveEmployees();
        const activeEmployeeIds = new Set(activeEmployees.map(emp => emp.id));
        
        const projectStats = [];
        
        for (const project of projects) {
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
          
          const activeAssignments = assignments.filter(a => activeEmployeeIds.has(a.employeeId));
          const uniqueEmployees = new Set(activeAssignments.map(a => a.employeeId));
          const employeeCount = uniqueEmployees.size;
          
          let totalRevenue = 0;
          let totalCost = 0;
          let totalHours = 0;
          
          for (const assignment of activeAssignments) {
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
          
          let totalRateSum = 0;
          let rateCount = 0;
          for (const assignment of activeAssignments) {
            totalRateSum += assignment.hourlyRateClient;
            rateCount++;
          }
          const averageHourlyRate = rateCount > 0 ? Math.round(totalRateSum / rateCount) : 0;
          
          projectStats.push({
            projectId: project.id,
            name: project.name,
            employeeCount,
            revenue: totalRevenue,
            cost: totalCost,
            profit,
            hours: totalHours,
            margin: Math.round(margin * 100) / 100,
            averageHourlyRate,
          });
        }
        
        if (projectStats.length === 0) {
          return {
            insights: "Brak danych o projektach do analizy.",
            recommendations: [],
            topProjects: [],
            lowMarginProjects: [],
          };
        }
        
        // Przygotuj dane dla AI
        const projectsData = projectStats.map(p => ({
          name: p.name || `Projekt ${p.projectId}`,
          revenue: p.revenue / 100, // Konwersja z groszy na PLN
          cost: p.cost / 100,
          profit: p.profit / 100,
          margin: p.margin,
          hours: p.hours,
          employeeCount: p.employeeCount,
          averageHourlyRate: p.averageHourlyRate / 100,
        }));
        
        // Wywołaj AI
        const { invokeLLM } = await import("./_core/llm");
        const { ENV } = await import("./_core/env");
        
        // Debug: sprawdź czy klucz API jest dostępny
        console.log("[AI] Sprawdzanie klucza API przed wywołaniem:");
        console.log("[AI] ENV.forgeApiKey:", ENV.forgeApiKey ? `ustawiony (${ENV.forgeApiKey.substring(0, 10)}...)` : "BRAK");
        console.log("[AI] process.env.OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? `ustawiony (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : "BRAK");
        
        const prompt = `Jesteś ekspertem finansowym analizującym rentowność projektów w firmie IT.

Dane o projektach:
${JSON.stringify(projectsData, null, 2)}

Przeanalizuj te projekty i odpowiedz w formacie JSON:
{
  "insights": "Główne wnioski z analizy (2-3 zdania)",
  "recommendations": ["Rekomendacja 1", "Rekomendacja 2", "Rekomendacja 3"],
  "topProjects": ["Nazwa projektu 1", "Nazwa projektu 2"],
  "lowMarginProjects": ["Nazwa projektu z niską marżą"],
  "trends": "Obserwowane trendy (1-2 zdania)"
}

Odpowiedz TYLKO w formacie JSON, bez dodatkowego tekstu.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "Jesteś ekspertem finansowym. Odpowiadaj zawsze w formacie JSON." },
              { role: "user", content: prompt }
            ],
          });
          
          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent || {});
          console.log("[AI] Raw response:", content);
          
          // Spróbuj wyciągnąć JSON z odpowiedzi (może być otoczony markdown)
          let jsonContent = content.trim();
          if (jsonContent.startsWith("```json")) {
            jsonContent = jsonContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
          } else if (jsonContent.startsWith("```")) {
            jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }
          
          const analysis = JSON.parse(jsonContent);
          
          return {
            insights: analysis.insights || "Analiza zakończona.",
            recommendations: analysis.recommendations || [],
            topProjects: analysis.topProjects || [],
            lowMarginProjects: analysis.lowMarginProjects || [],
            trends: analysis.trends || "",
            rawData: projectsData,
          };
        } catch (error) {
          console.error("[AI] Error analyzing projects:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            insights: `Nie udało się przeprowadzić analizy AI: ${errorMessage}. Sprawdź dane ręcznie.`,
            recommendations: [],
            topProjects: [],
            lowMarginProjects: [],
            rawData: projectsData,
          };
        }
      }),

    /**
     * Analizuje efektywność pracowników
     */
    analyzeEmployees: adminProcedure
      .input(z.object({
        year: z.number().optional(),
        month: z.number().min(1).max(12).optional(),
      }).optional())
      .query(async ({ input }) => {
        const now = new Date();
        const year = input?.year ?? now.getFullYear();
        const month = input?.month ?? (now.getMonth() + 1);
        
        // Pobierz pracowników i ich dane
        const employees = await db.getActiveEmployees();
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { timeEntries, employeeProjectAssignments } = await import("../drizzle/schema");
        const { sql, eq, and } = await import("drizzle-orm");
        
        const employeesData = [];
        
        for (const employee of employees) {
          // Pobierz wpisy godzinowe
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
          
          const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0) / 100;
          const totalRevenue = entries.reduce((sum, e) => {
            const hours = e.hoursWorked / 100;
            return sum + Math.round(hours * (e.hourlyRateClient || 0));
          }, 0);
          
          const monthlyCost = employee.monthlyCostTotal;
          const costToValueRatio = totalRevenue > 0 ? monthlyCost / totalRevenue : 0;
          const efficiency = totalRevenue > 0 ? (totalRevenue / monthlyCost) : 0;
          
          employeesData.push({
            name: `${employee.firstName} ${employee.lastName}`,
            position: employee.position || "",
            monthlyCost: monthlyCost / 100,
            totalRevenue: totalRevenue / 100,
            totalHours,
            costToValueRatio: Math.round(costToValueRatio * 100) / 100,
            efficiency: Math.round(efficiency * 100) / 100,
            employmentType: employee.employmentType,
          });
        }
        
        if (employeesData.length === 0) {
          return {
            insights: "Brak danych o pracownikach do analizy.",
            recommendations: [],
            topPerformers: [],
            lowEfficiencyEmployees: [],
          };
        }
        
        // Wywołaj AI
        const { invokeLLM } = await import("./_core/llm");
        
        const prompt = `Jesteś ekspertem HR i finansowym analizującym efektywność pracowników.

Dane o pracownikach:
${JSON.stringify(employeesData, null, 2)}

Przeanalizuj efektywność pracowników i odpowiedz w formacie JSON:
{
  "insights": "Główne wnioski z analizy (2-3 zdania)",
  "recommendations": ["Rekomendacja 1", "Rekomendacja 2", "Rekomendacja 3"],
  "topPerformers": ["Imię Nazwisko 1", "Imię Nazwisko 2"],
  "lowEfficiencyEmployees": ["Imię Nazwisko z niską efektywnością"],
  "costOptimization": "Sugestie optymalizacji kosztów (1-2 zdania)"
}

Odpowiedz TYLKO w formacie JSON, bez dodatkowego tekstu.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "Jesteś ekspertem HR i finansowym. Odpowiadaj zawsze w formacie JSON." },
              { role: "user", content: prompt }
            ],
          });
          
          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent || {});
          console.log("[AI] Raw response:", content);
          
          // Spróbuj wyciągnąć JSON z odpowiedzi (może być otoczony markdown)
          let jsonContent = content.trim();
          if (jsonContent.startsWith("```json")) {
            jsonContent = jsonContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
          } else if (jsonContent.startsWith("```")) {
            jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }
          
          const analysis = JSON.parse(jsonContent);
          
          return {
            insights: analysis.insights || "Analiza zakończona.",
            recommendations: analysis.recommendations || [],
            topPerformers: analysis.topPerformers || [],
            lowEfficiencyEmployees: analysis.lowEfficiencyEmployees || [],
            costOptimization: analysis.costOptimization || "",
            rawData: employeesData,
          };
        } catch (error) {
          console.error("[AI] Error analyzing employees:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            insights: `Nie udało się przeprowadzić analizy AI: ${errorMessage}. Sprawdź dane ręcznie.`,
            recommendations: [],
            topPerformers: [],
            lowEfficiencyEmployees: [],
            rawData: employeesData,
          };
        }
      }),

    /**
     * Analiza pojedynczego pracownika (AI) z wykorzystaniem danych finansowych i CV
     */
    analyzeEmployee: adminProcedure
      .input(z.object({
        employeeId: z.number(),
      }))
      .query(async ({ input }) => {
        const employee = await db.getEmployeeById(input.employeeId);
        if (!employee) {
          throw new Error("Employee not found");
        }

        // Pobierz CV pracownika (jeśli istnieje)
        const cvData = await db.getEmployeeCVWithDetails(input.employeeId);

        // Pobierz przypisania do projektów
        const assignments = await db.getAssignmentsByEmployee(input.employeeId);
        const projects = await db.getAllProjects();
        const projectMap = new Map(projects.map(p => [p.id, p]));

        // Oblicz metryki finansowe bazując na stałych kosztach (stałe 168h)
        const baseClientRate = (employee.hourlyRateClient || 0) / 100;
        const baseCost = (employee.monthlyCostTotal || 0) / 100;
        const monthlyRevenue = 168 * baseClientRate;
        const monthlyProfit = monthlyRevenue - baseCost;
        const annualProfit = monthlyProfit * 12;
        const margin = monthlyRevenue > 0 ? ((monthlyProfit / monthlyRevenue) * 100) : 0;

        // Lista projektów pracownika (tylko aktywne)
        const employeeProjects = assignments
          .filter(a => a.isActive)
          .map(a => {
            const project = projectMap.get(a.projectId);
            return {
              name: project?.name || `Projekt #${a.projectId}`,
              hourlyRateClient: (a.hourlyRateClient || 0) / 100,
              hourlyRateCost: (a.hourlyRateCost || 0) / 100,
            };
          });

        // Średnie do porównania
        const allEmployees = await db.getActiveEmployees();
        const avgClientRate = allEmployees.length > 0
          ? allEmployees.reduce((sum, e) => sum + ((e.hourlyRateClient || 0) / 100), 0) / allEmployees.length
          : 0;
        const avgCost = allEmployees.length > 0
          ? allEmployees.reduce((sum, e) => sum + ((e.monthlyCostTotal || 0) / 100), 0) / allEmployees.length
          : 0;
        const avgMargin = allEmployees.length > 0
          ? allEmployees.reduce((sum, e) => {
              const rate = (e.hourlyRateClient || 0) / 100;
              const cost = (e.monthlyCostTotal || 0) / 100;
              const revenue = 168 * rate;
              const profit = revenue - cost;
              const m = revenue > 0 ? ((profit / revenue) * 100) : 0;
              return sum + m;
            }, 0) / allEmployees.length
          : 0;

        // Przygotuj dane CV (escape, skrócenie)
        const escapeForPrompt = (text: string | null | undefined): string => {
          if (!text) return "";
          return text
            .replace(/\n/g, " ")
            .replace(/\r/g, "")
            .replace(/\t/g, " ")
            .replace(/"/g, "'")
            .replace(/\\/g, "/")
            .substring(0, 500);
        };

        const cvInfo = cvData ? {
          yearsOfExperience: cvData.yearsOfExperience || 0,
          seniorityLevel: escapeForPrompt(cvData.seniorityLevel) || "Brak danych",
          summary: escapeForPrompt(cvData.summary) || "",
          tagline: escapeForPrompt(cvData.tagline) || "",
          skills: (cvData.skills || []).map((s: any) => escapeForPrompt(s.skillName)).filter(Boolean).join(", ") || "Brak",
          technologies: (cvData.technologies || []).map((t: any) =>
            `${escapeForPrompt(t.technologyName)} (${t.proficiency}${t.category ? `, ${escapeForPrompt(t.category)}` : ''})`
          ).join(", ") || "Brak",
          languages: (cvData.languages || []).map((l: any) =>
            `${escapeForPrompt(l.name)}${l.level ? ` (${escapeForPrompt(l.level)})` : ''}`
          ).join(", ") || "Brak",
          cvProjects: (cvData.projects || []).map((p: any) => {
            const project = projectMap.get(p.projectId);
            const projectName = project?.name || `Projekt #${p.projectId}`;
            return `${escapeForPrompt(projectName)}${p.role ? ` jako ${escapeForPrompt(p.role)}` : ''}${p.description ? `: ${escapeForPrompt(p.description)}` : ''}`;
          }).join("; ") || "Brak projektów w CV",
        } : null;

        const employeeData = {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          position: employee.position || "Brak stanowiska",
          employmentType: employee.employmentType,
          isActive: employee.isActive,
          hourlyRateClient: baseClientRate,
          hourlyRateEmployee: (employee.hourlyRateEmployee || 0) / 100,
          monthlyCost: baseCost,
          monthlyRevenue,
          monthlyProfit,
          annualProfit,
          margin,
          projects: employeeProjects,
          vacationDays: employee.vacationDaysPerYear || 21,
          vsAverage: {
            clientRate: ((baseClientRate / avgClientRate - 1) * 100) || 0,
            cost: ((baseCost / avgCost - 1) * 100) || 0,
            margin: (margin - avgMargin) || 0,
          },
          cv: cvInfo,
        };

        // Prompt dla AI
        const prompt = `Jesteś ekspertem HR i finansowym analizującym indywidualnego pracownika w firmie IT.

Dane o pracowniku:
- Imię i nazwisko: ${employeeData.name}
- Stanowisko: ${employeeData.position}
- Typ umowy: ${employeeData.employmentType}
- Status: ${employeeData.isActive ? 'Aktywny' : 'Nieaktywny'}
- Stawka godzinowa dla klienta: ${employeeData.hourlyRateClient.toFixed(2)} PLN/h
- Stawka godzinowa pracownika: ${employeeData.hourlyRateEmployee.toFixed(2)} PLN/h
- Koszt miesięczny firmy: ${employeeData.monthlyCost.toFixed(2)} PLN
- Przychód miesięczny: ${employeeData.monthlyRevenue.toFixed(2)} PLN
- Zysk miesięczny: ${employeeData.monthlyProfit.toFixed(2)} PLN
- Zysk roczny: ${employeeData.annualProfit.toFixed(2)} PLN
- Marża: ${employeeData.margin.toFixed(1)}%
- Dni urlopu: ${employeeData.vacationDays}
- Przypisany do projektów: ${employeeData.projects.length > 0 ? employeeData.projects.map(p => `${p.name} (${p.hourlyRateClient.toFixed(2)} PLN/h)`).join(', ') : 'Brak przypisań'}

${cvInfo ? `Dane z CV pracownika:
- Lata doświadczenia: ${cvInfo.yearsOfExperience}
- Poziom seniority: ${cvInfo.seniorityLevel}
- Krótki opis: ${cvInfo.tagline || 'Brak'}
- Opis profilu: ${cvInfo.summary || 'Brak'}
- Umiejętności miękkie: ${cvInfo.skills}
- Technologie i umiejętności twarde: ${cvInfo.technologies}
- Języki: ${cvInfo.languages}
- Projekty w CV: ${cvInfo.cvProjects}
` : 'UWAGA: Pracownik nie ma CV w systemie - analiza będzie oparta tylko na danych finansowych.'}

Porównanie ze średnią w firmie:
- Stawka klienta: ${employeeData.vsAverage.clientRate >= 0 ? '+' : ''}${employeeData.vsAverage.clientRate.toFixed(1)}% względem średniej
- Koszt: ${employeeData.vsAverage.cost >= 0 ? '+' : ''}${employeeData.vsAverage.cost.toFixed(1)}% względem średniej
- Marża: ${employeeData.vsAverage.margin >= 0 ? '+' : ''}${employeeData.vsAverage.margin.toFixed(1)}% względem średniej

Przeanalizuj tego pracownika uwzględniając jego doświadczenie, umiejętności i technologie z CV. ${cvInfo ? 'Użyj danych z CV do lepszej oceny potencjału, rozwoju kariery i ryzyka odejścia.' : 'Pamiętaj, że brak CV może wpływać na dokładność analizy.'}

Odpowiedz w formacie JSON:
{
  "riskLevel": "low" | "medium" | "high",
  "riskReason": "Krótkie wyjaśnienie poziomu ryzyka odejścia (1-2 zdania)",
  "recommendations": [
    {
      "type": "salary_increase" | "project_change" | "training" | "promotion" | "retention" | "optimization",
      "title": "Tytuł rekomendacji",
      "description": "Szczegółowy opis rekomendacji (2-3 zdania)",
      "priority": "high" | "medium" | "low",
      "impact": "Krótki opis wpływu na firmę (1 zdanie)"
    }
  ],
  "careerDevelopment": {
    "currentLevel": "junior" | "mid" | "senior" | "expert",
    "potential": "low" | "medium" | "high",
    "suggestions": [
      "Sugestia rozwoju 1",
      "Sugestia rozwoju 2",
      "Sugestia rozwoju 3"
    ],
    "nextSteps": "Krótki opis następnych kroków w rozwoju kariery (2-3 zdania)"
  },
  "valueAnalysis": {
    "currentValue": "low" | "medium" | "high",
    "growthPotential": "low" | "medium" | "high",
    "analysis": "Analiza wartości pracownika dla firmy (2-3 zdania)"
  },
  "summary": "Krótkie podsumowanie analizy (2-3 zdania)"
}

Odpowiedz TYLKO w formacie JSON, bez dodatkowego tekstu.`;

        const { invokeLLM } = await import("./_core/llm");

        // Bezpieczne parsowanie JSON
        const safeParseJSON = (text: string): any => {
          let jsonContent = text.trim();

          if (jsonContent.startsWith("```json")) {
            jsonContent = jsonContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
          } else if (jsonContent.startsWith("```")) {
            jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }

          const match = jsonContent.match(/\{[\s\S]*\}/);
          if (match) {
            jsonContent = match[0];
          }

          try {
            return JSON.parse(jsonContent);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[AI Employee Analysis] JSON parse error:", msg);
            throw new Error(`Nie udało się sparsować odpowiedzi JSON: ${msg}`);
          }
        };

        try {
          const response = await invokeLLM({
            messages: [
              { 
                role: "system", 
                content: "Jesteś ekspertem HR i finansowym. Odpowiadaj zawsze w formacie JSON. Analizuj pracowników pod kątem wartości dla firmy, ryzyka odejścia i potencjału rozwoju." 
              },
              { role: "user", content: prompt }
            ],
          });

          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent || {});
          console.log("[AI Employee Analysis] Raw response length:", content.length);
          console.log("[AI Employee Analysis] Raw response (first 400 chars):", content.substring(0, 400));

          const analysis = safeParseJSON(content);

          return {
            employeeId: employee.id,
            employeeName: employeeData.name,
            riskLevel: analysis.riskLevel || "medium",
            riskReason: analysis.riskReason || "",
            recommendations: analysis.recommendations || [],
            careerDevelopment: analysis.careerDevelopment || {
              currentLevel: "mid",
              potential: "medium",
              suggestions: [],
              nextSteps: "",
            },
            valueAnalysis: analysis.valueAnalysis || {
              currentValue: "medium",
              growthPotential: "medium",
              analysis: "",
            },
            summary: analysis.summary || "",
            rawData: employeeData,
          };
        } catch (error) {
          console.error("[AI Employee Analysis] Error:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            employeeId: employee.id,
            employeeName: employeeData.name,
            riskLevel: "medium" as const,
            riskReason: `Nie udało się przeprowadzić analizy: ${errorMessage}`,
            recommendations: [],
            careerDevelopment: {
              currentLevel: "mid" as const,
              potential: "medium" as const,
              suggestions: [],
              nextSteps: "",
            },
            valueAnalysis: {
              currentValue: "medium" as const,
              growthPotential: "medium" as const,
              analysis: "",
            },
            summary: "",
            rawData: employeeData,
          };
        }
      }),

    /**
     * Analiza trendów rynku (AI) - analizuje trendy rynkowe na podstawie danych pracowników
     */
    analyzeMarketTrends: adminProcedure
      .query(async () => {
        const employees = await db.getActiveEmployees();
        if (employees.length === 0) {
          throw new Error("Brak pracowników do analizy");
        }

        // Przygotuj dane agreagowane
        const totalEmployees = employees.length;
        const totalMonthlyRevenue = employees.reduce((sum, e) => {
          const rate = (e.hourlyRateClient || 0) / 100;
          return sum + (168 * rate);
        }, 0);
        const totalMonthlyCost = employees.reduce((sum, e) => sum + ((e.monthlyCostTotal || 0) / 100), 0);
        const totalMonthlyProfit = totalMonthlyRevenue - totalMonthlyCost;
        const avgClientRate = employees.reduce((sum, e) => sum + ((e.hourlyRateClient || 0) / 100), 0) / totalEmployees;
        const avgCost = employees.reduce((sum, e) => sum + ((e.monthlyCostTotal || 0) / 100), 0) / totalEmployees;
        const avgMargin = totalMonthlyRevenue > 0 ? ((totalMonthlyProfit / totalMonthlyRevenue) * 100) : 0;

        // Grupowanie po typach umów
        const byEmploymentType = employees.reduce((acc, e) => {
          const type = e.employmentType;
          if (!acc[type]) {
            acc[type] = { count: 0, totalRevenue: 0, totalCost: 0 };
          }
          acc[type].count++;
          const rate = (e.hourlyRateClient || 0) / 100;
          acc[type].totalRevenue += 168 * rate;
          acc[type].totalCost += (e.monthlyCostTotal || 0) / 100;
          return acc;
        }, {} as Record<string, { count: number; totalRevenue: number; totalCost: number }>);

        const employmentTypeBreakdown = Object.entries(byEmploymentType).map(([type, data]) => ({
          type,
          count: data.count,
          avgRevenue: data.totalRevenue / data.count,
          avgCost: data.totalCost / data.count,
          avgProfit: (data.totalRevenue - data.totalCost) / data.count,
        }));

        // Prompt dla AI
        const prompt = `Jesteś ekspertem rynku IT i analitykiem finansowym. Przeanalizuj trendy rynkowe na podstawie danych firmy.

Dane firmy:
- Liczba pracowników: ${totalEmployees}
- Łączny przychód miesięczny: ${totalMonthlyRevenue.toFixed(2)} PLN
- Łączny koszt miesięczny: ${totalMonthlyCost.toFixed(2)} PLN
- Łączny zysk miesięczny: ${totalMonthlyProfit.toFixed(2)} PLN
- Średnia marża: ${avgMargin.toFixed(1)}%
- Średnia stawka klienta: ${avgClientRate.toFixed(2)} PLN/h
- Średni koszt pracownika: ${avgCost.toFixed(2)} PLN/mies

Podział po typach umów:
${employmentTypeBreakdown.map(e => `- ${e.type}: ${e.count} pracowników, średni przychód ${e.avgRevenue.toFixed(2)} PLN, średni koszt ${e.avgCost.toFixed(2)} PLN, średni zysk ${e.avgProfit.toFixed(2)} PLN`).join('\n')}

Przeanalizuj trendy rynkowe i daj rekomendacje dotyczące:
1. Optymalnych stawek rynkowych
2. Trendów w kosztach pracowniczych
3. Rekomendacji dotyczących struktury zatrudnienia
4. Prognoz na najbliższe miesiące
5. Ryzyk i szans

Odpowiedz w formacie JSON:
{
  "trends": [
    {
      "category": "Kategoria trendu (np. 'Stawki rynkowe', 'Koszty', 'Struktura zatrudnienia')",
      "description": "Opis trendu (2-3 zdania)",
      "impact": "low" | "medium" | "high",
      "recommendation": "Rekomendacja (2-3 zdania)"
    }
  ],
  "forecast": {
    "next3Months": "Prognoza na najbliższe 3 miesiące (2-3 zdania)",
    "next6Months": "Prognoza na najbliższe 6 miesięcy (2-3 zdania)",
    "risks": ["Ryzyko 1", "Ryzyko 2", "Ryzyko 3"],
    "opportunities": ["Szanse 1", "Szanse 2", "Szanse 3"]
  },
  "recommendations": [
    {
      "title": "Tytuł rekomendacji",
      "description": "Opis rekomendacji (2-3 zdania)",
      "priority": "high" | "medium" | "low",
      "expectedImpact": "Oczekiwany wpływ (1 zdanie)"
    }
  ],
  "summary": "Krótkie podsumowanie analizy trendów (3-4 zdania)"
}

Odpowiedz TYLKO w formacie JSON, bez dodatkowego tekstu.`;

        const { invokeLLM } = await import("./_core/llm");

        // Bezpieczne parsowanie JSON
        const safeParseJSON = (text: string): any => {
          let jsonContent = text.trim();

          if (jsonContent.startsWith("```json")) {
            jsonContent = jsonContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
          } else if (jsonContent.startsWith("```")) {
            jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }

          const match = jsonContent.match(/\{[\s\S]*\}/);
          if (match) {
            jsonContent = match[0];
          }

          try {
            return JSON.parse(jsonContent);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[AI Market Trends] JSON parse error:", msg);
            throw new Error(`Nie udało się sparsować odpowiedzi JSON: ${msg}`);
          }
        };

        try {
          const response = await invokeLLM({
            messages: [
              { 
                role: "system", 
                content: "Jesteś ekspertem rynku IT i analitykiem finansowym. Odpowiadaj zawsze w formacie JSON. Analizuj trendy rynkowe i daj praktyczne rekomendacje." 
              },
              { role: "user", content: prompt }
            ],
          });

          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent || {});
          console.log("[AI Market Trends] Raw response length:", content.length);

          const analysis = safeParseJSON(content);

          return {
            trends: analysis.trends || [],
            forecast: analysis.forecast || {
              next3Months: "",
              next6Months: "",
              risks: [],
              opportunities: [],
            },
            recommendations: analysis.recommendations || [],
            summary: analysis.summary || "",
            rawData: {
              totalEmployees,
              totalMonthlyRevenue,
              totalMonthlyCost,
              totalMonthlyProfit,
              avgClientRate,
              avgCost,
              avgMargin,
            },
          };
        } catch (error) {
          console.error("[AI Market Trends] Error:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            trends: [],
            forecast: {
              next3Months: "",
              next6Months: "",
              risks: [`Błąd analizy: ${errorMessage}`],
              opportunities: [],
            },
            recommendations: [],
            summary: `Nie udało się przeprowadzić pełnej analizy: ${errorMessage}`,
            rawData: {
              totalEmployees,
              totalMonthlyRevenue,
              totalMonthlyCost,
              totalMonthlyProfit,
              avgClientRate,
              avgCost,
              avgMargin,
            },
          };
        }
      }),

    /**
     * Chat finansowy - odpowiada na pytania o finanse firmy
     */
    chat: adminProcedure
      .input(z.object({
        message: z.string(),
        context: z.object({
          year: z.number().optional(),
          month: z.number().min(1).max(12).optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { message, context } = input;
        const now = new Date();
        const year = context?.year ?? now.getFullYear();
        const month = context?.month ?? (now.getMonth() + 1);
        
        // Pobierz podstawowe dane finansowe - użyj bezpośrednio logiki z dashboard.kpi
        const employees = await db.getActiveEmployees();
        let totalRevenue = 0;
        let totalEmployeeCosts = 0;
        
        for (const employee of employees) {
          const savedReport = await db.getMonthlyReport(employee.id, year, month);
          
          if (savedReport && savedReport.hoursWorked > 0) {
            totalRevenue += savedReport.revenue;
            totalEmployeeCosts += savedReport.actualCost ?? savedReport.cost;
          } else {
            totalEmployeeCosts += employee.monthlyCostTotal;
            
            const database = await db.getDb();
            if (database) {
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
              
              if (entries.length > 0) {
                let revenue = 0;
                for (const entry of entries) {
                  const hours = entry.hoursWorked / 100;
                  const hourlyRateClient = entry.hourlyRateClient || employee.hourlyRateClient || 0;
                  revenue += Math.round(hours * hourlyRateClient);
                }
                totalRevenue += revenue;
              }
            }
          }
        }
        
        const fixedCosts = await db.getActiveFixedCosts();
        const totalFixedCosts = fixedCosts.reduce((sum, cost) => {
          let monthlyCost = 0;
          switch (cost.frequency) {
            case 'monthly': monthlyCost = cost.amount; break;
            case 'quarterly': monthlyCost = Math.round(cost.amount / 3); break;
            case 'yearly': monthlyCost = Math.round(cost.amount / 12); break;
            case 'one_time': monthlyCost = 0; break;
          }
          return sum + monthlyCost;
        }, 0);
        
        const totalCosts = totalEmployeeCosts + totalFixedCosts;
        const totalProfit = totalRevenue - totalCosts;
        const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        
        // Pobierz statystyki projektów
        const projects = await db.getAllProjects();
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        
        const { employeeProjectAssignments, timeEntries } = await import("../drizzle/schema");
        const { sql, eq, and } = await import("drizzle-orm");
        
        const activeEmployees = await db.getActiveEmployees();
        const activeEmployeeIds = new Set(activeEmployees.map(emp => emp.id));
        
        const projectStats = [];
        
        for (const project of projects) {
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
          
          const activeAssignments = assignments.filter(a => activeEmployeeIds.has(a.employeeId));
          
          let totalRevenueProj = 0;
          let totalCostProj = 0;
          
          for (const assignment of activeAssignments) {
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
            
            totalRevenueProj += revenue;
            totalCostProj += cost;
          }
          
          const profit = totalRevenueProj - totalCostProj;
          const marginProj = totalRevenueProj > 0 ? (profit / totalRevenueProj) * 100 : 0;
          
          projectStats.push({
            name: project.name,
            revenue: totalRevenueProj,
            profit,
            margin: marginProj,
          });
        }
        
        // Przygotuj kontekst dla AI
        const financialContext = {
          kpi: {
            totalRevenue: totalRevenue / 100,
            totalCosts: totalCosts / 100,
            totalProfit: totalProfit / 100,
            margin: Math.round(margin * 100) / 100,
          },
          projects: {
            count: projectStats.length,
            totalRevenue: projectStats.reduce((sum, p) => sum + p.revenue, 0) / 100,
            totalProfit: projectStats.reduce((sum, p) => sum + p.profit, 0) / 100,
            averageMargin: projectStats.length > 0 
              ? projectStats.reduce((sum, p) => sum + p.margin, 0) / projectStats.length 
              : 0,
          },
          period: { year, month },
        };
        
        const { invokeLLM } = await import("./_core/llm");
        
        const systemPrompt = `Jesteś asystentem finansowym dla firmy IT. Pomagasz właścicielowi firmy analizować finanse i podejmować decyzje biznesowe.

Dostępne dane finansowe:
${JSON.stringify(financialContext, null, 2)}

Odpowiadaj na pytania w sposób zwięzły, profesjonalny i pomocny. Jeśli pytanie wymaga dodatkowych danych, które nie są dostępne, poinformuj o tym użytkownika.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
          });
          
          return {
            response: response.choices[0]?.message?.content || "Przepraszam, nie mogę odpowiedzieć na to pytanie.",
          };
        } catch (error) {
          console.error("[AI] Error in financial chat:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            response: `Przepraszam, wystąpił błąd podczas przetwarzania pytania: ${errorMessage}. Sprawdź czy klucz API jest ustawiony (BUILT_IN_FORGE_API_KEY).`,
          };
        }
      }),
  }),

  // ============ HRAPPKA API ============
  hrappka: router({
    /**
     * Pobiera informacje o pracowniku z HRappka (dla panelu pracownika)
     */
    getEmployeeInfo: publicProcedure
      .input(z.object({ 
        employeeId: z.number().optional(),
        forceRefresh: z.boolean().optional().default(false), // Opcjonalny parametr do wymuszenia odświeżenia
      }))
      .query(async ({ input, ctx }) => {
        console.log(`[HRappka] ===== getEmployeeInfo CALLED =====`);
        console.log(`[HRappka] Input: employeeId=${input.employeeId}, forceRefresh=${input.forceRefresh}`);
        console.log(`[HRappka] Context user: employeeId=${ctx.user?.employeeId}, role=${ctx.user?.role}`);
        try {
          // Jeśli employeeId nie jest podane, spróbuj pobrać z kontekstu użytkownika
          let targetEmployeeId: number | undefined = input.employeeId;
          
          if (!targetEmployeeId && ctx.user?.employeeId) {
            // Pobierz pracownika z bazy danych
            const employee = await db.getEmployeeById(ctx.user.employeeId);
            if (employee?.hrappkaId) {
              targetEmployeeId = employee.hrappkaId;
            }
          }
          
          if (!targetEmployeeId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Brak HRappka ID dla pracownika. Upewnij się, że pracownik ma przypisane HRappka ID.",
            });
          }
          
          // UWAGA: TYMCZASOWO WYŁĄCZAMY CACHE dla debugowania - zawsze pobieramy świeże dane
          // TODO: Przywrócić cache po rozwiązaniu problemu z 0h dla bieżącego miesiąca
          const shouldUseCache = false; // TYMCZASOWO WYŁĄCZONE: !input.forceRefresh;
          console.log(`[HRappka] Cache check: shouldUseCache=${shouldUseCache}, forceRefresh=${input.forceRefresh}`);
          
          if (shouldUseCache) {
            const cached = await db.getHRappkaEmployeeInfoCache(targetEmployeeId);
            if (cached) {
              // Sprawdź czy cache nie jest zbyt stary (max 5 minut dla danych "dzisiaj")
              const cacheAge = new Date().getTime() - new Date(cached.cachedAt).getTime();
              const maxCacheAge = 5 * 60 * 1000; // 5 minut - bardzo krótki czas dla danych "dzisiaj"
              
              // Sprawdź czy dane "dzisiaj" w cache są aktualne (czy to nadal ten sam dzień)
              const now = new Date();
              const today = new Date(now);
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              
              const cacheDate = new Date(cached.cachedAt);
              const cacheToday = new Date(cacheDate);
              const cacheTodayStr = `${cacheToday.getFullYear()}-${String(cacheToday.getMonth() + 1).padStart(2, '0')}-${String(cacheToday.getDate()).padStart(2, '0')}`;
              
              // ZAWSZE sprawdź cache przed użyciem - nawet jeśli jest świeży, może zawierać 0h dla bieżącego miesiąca
              try {
                const info = JSON.parse(cached.data);
                
                // ZAWSZE sprawdź czy cache zawiera aktualne dane dla bieżącego miesiąca
                // Jeśli totalHoursThisMonth jest 0, ZAWSZE pobierz świeże dane (nawet jeśli cache jest świeży)
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();
                const cachedMonthSummary = info.monthlySummary?.find((m: { month: number; year: number }) => m.month === currentMonth && m.year === currentYear);
                const cachedTotalHoursThisMonth = info.totalHoursThisMonth || 0;
                
                console.log(`[HRappka] Checking cache for current month: month=${currentMonth}/${currentYear}, cachedMonthSummary=${cachedMonthSummary ? JSON.stringify(cachedMonthSummary) : 'null'}, cachedTotalHoursThisMonth=${cachedTotalHoursThisMonth}`);
                
                // Jeśli cache ma 0h dla bieżącego miesiąca, ZAWSZE pobierz świeże dane
                if ((cachedMonthSummary && cachedMonthSummary.acceptedHours === 0) || cachedTotalHoursThisMonth === 0) {
                  console.log(`[HRappka] Cache has 0h for current month (${currentMonth}/${currentYear}) - forcing fresh data fetch (deleting cache)`);
                  await db.deleteHRappkaEmployeeInfoCache(targetEmployeeId);
                  // Kontynuuj do pobrania świeżych danych - NIE zwracaj cache
                } else if (todayStr === cacheTodayStr && cacheAge < maxCacheAge) {
                  // Cache jest OK - użyj go
                  console.log(`[HRappka] Using cached data for employee ${targetEmployeeId} (cached at: ${cached.cachedAt}, age: ${Math.round(cacheAge / 1000 / 60)}min, same day: ${todayStr}, current month hours: ${cachedTotalHoursThisMonth})`);
                  return {
                    success: true,
                    info,
                    cached: true,
                    cachedAt: cached.cachedAt,
                  };
                } else {
                  // Cache jest stary lub z innego dnia
                  if (todayStr !== cacheTodayStr) {
                    console.log(`[HRappka] Cache outdated - different day (cache: ${cacheTodayStr}, today: ${todayStr}) - fetching fresh data`);
                  } else {
                    console.log(`[HRappka] Cache too old (${Math.round(cacheAge / 1000 / 60)}min, max: 5min) - fetching fresh data`);
                  }
                  await db.deleteHRappkaEmployeeInfoCache(targetEmployeeId);
                }
              } catch (parseError) {
                console.error(`[HRappka] Error parsing cached data for employee ${targetEmployeeId}:`, parseError);
                // Jeśli nie można sparsować cache, usuń go i pobierz nowe dane
                await db.deleteHRappkaEmployeeInfoCache(targetEmployeeId);
              }
              
              // Jeśli doszliśmy tutaj, cache został usunięty lub był nieprawidłowy - kontynuuj do pobrania świeżych danych
              if (todayStr !== cacheTodayStr || cacheAge >= maxCacheAge) {
                if (todayStr !== cacheTodayStr) {
                  console.log(`[HRappka] Cache outdated - different day (cache: ${cacheTodayStr}, today: ${todayStr}) - fetching fresh data`);
                } else {
                  console.log(`[HRappka] Cache too old (${Math.round(cacheAge / 1000 / 60)}min, max: 5min) - fetching fresh data`);
                }
                // Usuń stary cache
                await db.deleteHRappkaEmployeeInfoCache(targetEmployeeId);
              }
            }
          } else {
            // Usuń cache jeśli wymuszamy odświeżenie
            await db.deleteHRappkaEmployeeInfoCache(targetEmployeeId);
            console.log(`[HRappka] Force refresh requested for employee ${targetEmployeeId} - cache cleared`);
          }
          
          // Pobierz nowe dane z HRappka
          console.log(`[HRappka] ===== ROUTER: Fetching fresh data from HRappka API for employee ${targetEmployeeId} =====`);
          const info = await getHRappkaEmployeeInfo(targetEmployeeId);
          console.log(`[HRappka] ===== ROUTER: Got data from getHRappkaEmployeeInfo, totalHoursThisMonth=${info.totalHoursThisMonth.toFixed(2)}h =====`);
          
          // Sprawdź czy pracownik ma przypisane employeeId w naszej bazie (do przyznawania punktów)
          let localEmployeeId: number | undefined = undefined;
          if (ctx.user?.employeeId) {
            localEmployeeId = ctx.user.employeeId;
          } else if (input.employeeId) {
            // Jeśli employeeId jest podane jako parametr, znajdź lokalnego pracownika
            const employee = await db.getEmployeeByHRappkaId(targetEmployeeId);
            if (employee) {
              localEmployeeId = employee.id;
            }
          }
          
          // Jeśli wczoraj były uzupełnione godziny i mamy lokalnego pracownika, przyznaj punkty
          if (info.yesterdayHoursReported && info.yesterdayHours && localEmployeeId) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            try {
              const awarded = await db.awardHRappkaDailyHoursPoints(
                localEmployeeId,
                yesterday,
                info.yesterdayHours
              );
              if (awarded) {
                console.log(`[HRappka] Awarded gamification points for daily hours to employee ${localEmployeeId}`);
              }
            } catch (pointsError) {
              console.error(`[HRappka] Error awarding gamification points:`, pointsError);
              // Nie rzucaj błędu - przyznawanie punktów jest opcjonalne
            }
          }
          
          // Zapisz do cache (cache na 10 minut - krótki czas dla danych "dzisiaj")
          try {
            await db.setHRappkaEmployeeInfoCache(targetEmployeeId, info, 10 / 60); // 10 minut = 10/60 godzin
            console.log(`[HRappka] Cached data for employee ${targetEmployeeId} (cache duration: 10 minutes)`);
          } catch (cacheError) {
            console.error(`[HRappka] Error caching data for employee ${targetEmployeeId}:`, cacheError);
            // Nie rzucaj błędu - cache jest opcjonalny
          }
          
          return {
            success: true,
            info,
            cached: false,
          };
        } catch (error) {
          console.error("[HRappka] Error fetching employee info:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Nie udało się pobrać informacji z HRappka: ${errorMessage}`,
          });
        }
      }),
    /**
     * Testuje połączenie z HRappka API
     */
    testConnection: adminProcedure.query(async () => {
      try {
        const isConnected = await testHRappkaConnection();
        return {
          success: isConnected,
          message: isConnected
            ? "Połączenie z HRappka API działa poprawnie"
            : "Nie udało się połączyć z HRappka API",
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Błąd połączenia: ${errorMessage}`,
        };
      }
    }),

    /**
     * Pobiera listę pracowników z HRappka
     */
    getEmployees: adminProcedure.query(async () => {
      try {
        const employees = await getHRappkaEmployees();
        console.log("[HRappka] getEmployees endpoint - returned", employees.length, "employees");
        return {
          success: true,
          employees,
          count: employees.length,
        };
      } catch (error) {
        console.error("[HRappka] Error fetching employees:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Nie udało się pobrać pracowników z HRappka: ${errorMessage}`,
        });
      }
    }),

    /**
     * Testuje endpoint HRappka i zwraca surową odpowiedź
     */
    testHRappkaEndpoint: adminProcedure
      .input(z.object({
        endpoint: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          const { getHRappkaConfig, authenticateHRappka } = await import("./_core/hrappka");
          const config = getHRappkaConfig();
          
          console.log("[HRappka Test] Config:", {
            baseUrl: config.baseUrl,
            email: config.email ? `${config.email.substring(0, 3)}***` : "NOT SET",
            hasPassword: !!config.password,
            companyId: config.companyId,
          });
          
          let token: string;
          try {
            token = await authenticateHRappka();
            console.log("[HRappka Test] Token obtained, length:", token.length);
          } catch (authError) {
            console.error("[HRappka Test] Authentication failed:", authError);
            return {
              success: false,
              error: `Authentication failed: ${authError instanceof Error ? authError.message : String(authError)}`,
            };
          }
          
          // Domyślnie testuj /api/employees/get (właściwy endpoint)
          const testEndpoint = input.endpoint || "/api/employees/get";
          const url = new URL(
            testEndpoint.startsWith("/") ? testEndpoint.slice(1) : testEndpoint,
            config.baseUrl
          );
          
          let response: Response;
          try {
            response = await fetch(url.toString(), {
              method: "GET",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
            });
          } catch (fetchError) {
            // Jeśli fetch nie działa (np. problem z SSL), użyj https modułu
            const https = await import("https");
            const urlObj = new URL(url.toString());
            
            response = await new Promise<Response>((resolve, reject) => {
              const httpsOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: "GET",
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                },
                rejectUnauthorized: false, // Wyłącz weryfikację SSL dla testów
              };
              
              const req = https.request(httpsOptions, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                  data += chunk;
                });
                res.on("end", () => {
                  const responseObj = {
                    ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode || 0,
                    statusText: res.statusMessage || "",
                    headers: new Headers(Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v || ""])),
                    text: async () => data,
                    json: async () => JSON.parse(data),
                  } as Response;
                  resolve(responseObj as Response);
                });
              });
              
              req.on("error", (error) => {
                reject(error);
              });
              
              req.end();
            });
          }
          
          const status = response.status;
          const statusText = response.statusText;
          const contentType = response.headers.get("content-type");
          const text = await response.text();
          
          let jsonData = null;
          try {
            jsonData = JSON.parse(text);
          } catch {
            // Nie jest JSON
          }
          
          return {
            success: response.ok,
            status,
            statusText,
            contentType,
            text: text.substring(0, 1000), // Pierwsze 1000 znaków
            json: jsonData,
            url: url.toString(),
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: errorMessage,
          };
        }
      }),

    /**
     * Pobiera raporty godzinowe dla konkretnego pracownika
     */
    getTimeReports: adminProcedure
      .input(
        z.object({
          employeeId: z.number().int().positive(),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD").optional(),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD").optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const reports = await getHRappkaTimeReports(
            input.employeeId,
            input.startDate,
            input.endDate
          );
          return {
            success: true,
            reports,
            count: reports.length,
          };
        } catch (error) {
          console.error(`[HRappka] Error fetching time reports for employee ${input.employeeId}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Nie udało się pobrać raportów godzinowych: ${errorMessage}`,
          });
        }
      }),

    /**
     * Pobiera wszystkie raporty godzinowe dla wszystkich pracowników
     */
    getAllTimeReports: adminProcedure
      .input(
        z.object({
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD"),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data musi być w formacie YYYY-MM-DD"),
        })
      )
      .query(async ({ input }) => {
        try {
          const reports = await getAllHRappkaTimeReports(input.startDate, input.endDate);
          return {
            success: true,
            reports,
            count: reports.length,
          };
        } catch (error) {
          console.error("[HRappka] Error fetching all time reports:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Nie udało się pobrać raportów godzinowych: ${errorMessage}`,
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
