import { eq, and, desc, sql, or, isNull, isNotNull, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  employees, InsertEmployee, Employee,
  clients, InsertClient, Client,
  projects, InsertProject, Project,
  employeeProjectAssignments, InsertEmployeeProjectAssignment,
  timeEntries, InsertTimeEntry,
  projectRevenues, InsertProjectRevenue,
  vacations, InsertVacation,
  fixedCosts, InsertFixedCost,
  ownerSalarySimulations, InsertOwnerSalarySimulation,
  monthlyEmployeeReports, InsertMonthlyEmployeeReport, MonthlyEmployeeReport,
  tasks, InsertTask, Task,
  knowledgeBase, InsertKnowledgeBase, KnowledgeBase,
  knowledgeBaseFavorites, InsertKnowledgeBaseFavorite, KnowledgeBaseFavorite,
  knowledgeBaseViews, InsertKnowledgeBaseView, KnowledgeBaseView,
  knowledgeBaseComments, InsertKnowledgeBaseComment, KnowledgeBaseComment,
  knowledgeBaseLinks, InsertKnowledgeBaseLink, KnowledgeBaseLink,
  employeeCV, InsertEmployeeCV, EmployeeCV,
  employeeSkills, InsertEmployeeSkill, EmployeeSkill,
  employeeTechnologies, InsertEmployeeTechnology, EmployeeTechnology,
  employeeCVProjects, InsertEmployeeCVProject, EmployeeCVProject,
  employeeCVHistory, InsertEmployeeCVHistory, EmployeeCVHistory,
  employeeLanguages, InsertEmployeeLanguage, EmployeeLanguage,
  officeLocations, InsertOfficeLocation, OfficeLocation,
  officePresenceSettings, OfficePresenceSetting,
  officeSessions, InsertOfficeSession, OfficeSession,
  employeeLevels, InsertEmployeeLevel, EmployeeLevel,
  employeePoints, InsertEmployeePoint, EmployeePoint,
  badges, InsertBadge, Badge,
  employeeBadges, InsertEmployeeBadge, EmployeeBadge,
  quests, InsertQuest, Quest,
  employeeQuests, InsertEmployeeQuest, EmployeeQuest,
  teamGoals, InsertTeamGoal, TeamGoal,
  vacationPlans, InsertVacationPlan, VacationPlan,
  knowledgeBasePoints, InsertKnowledgeBasePoint, KnowledgeBasePoint,
  hrappkaEmployeeInfoCache, InsertHRappkaEmployeeInfoCache, HRappkaEmployeeInfoCache,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      console.error("[Database] DATABASE_URL is not set in environment variables");
      console.error("[Database] Available env vars:", Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB')));
      return null;
    }
    
    try {
      console.log("[Database] Connecting to database...");
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER HELPERS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.employeeId !== undefined) {
      values.employeeId = user.employeeId;
      updateSet.employeeId = user.employeeId;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  const user = result.length > 0 ? result[0] : undefined;
  
  // Debug: loguj rolę użytkownika
  if (user) {
    console.log(`[DB] getUserByOpenId(${openId}) - role: ${user.role}, employeeId: ${user.employeeId}`);
  }
  
  return user;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ EMPLOYEE HELPERS ============

export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employees).orderBy(desc(employees.createdAt));
}

export async function getActiveEmployees() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employees).where(eq(employees.isActive, true)).orderBy(desc(employees.createdAt));
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEmployeeByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateEmployeePassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set({ passwordHash }).where(eq(employees.id, id));
}

export async function createEmployee(employee: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Upewnij się, że email i passwordHash są null jeśli nie są podane
  const employeeData: InsertEmployee = {
    ...employee,
    email: employee.email ?? null,
    passwordHash: employee.passwordHash ?? null,
  };
  
  const result = await db.insert(employees).values(employeeData);
  return Number(result[0].insertId);
}

export async function updateEmployee(id: number, employee: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set(employee).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employees).where(eq(employees.id, id));
}

/**
 * Pobiera pracownika po HRappka ID
 */
export async function getEmployeeByHRappkaId(hrappkaId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.hrappkaId, hrappkaId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Przypisuje HRappka ID do pracownika
 */
export async function assignHRappkaId(employeeId: number, hrappkaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Sprawdź czy hrappkaId nie jest już przypisany do innego pracownika
  const existing = await getEmployeeByHRappkaId(hrappkaId);
  if (existing && existing.id !== employeeId) {
    throw new Error(`HRappka ID ${hrappkaId} jest już przypisany do pracownika ${existing.firstName} ${existing.lastName}`);
  }
  
  await db.update(employees).set({ hrappkaId }).where(eq(employees.id, employeeId));
}

/**
 * Usuwa przypisanie HRappka ID z pracownika
 */
export async function unassignHRappkaId(employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set({ hrappkaId: null }).where(eq(employees.id, employeeId));
}

/**
 * Pobiera wszystkich pracowników z przypisanym HRappka ID
 */
export async function getEmployeesWithHRappkaId() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(employees).where(isNotNull(employees.hrappkaId));
  return result;
}

// ============ CLIENT HELPERS ============

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getActiveClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).where(eq(clients.isActive, true)).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(client);
  return Number(result[0].insertId);
}

export async function updateClient(id: number, client: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(client).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Sprawdź czy klient ma powiązane projekty
  const clientProjects = await db.select().from(projects).where(eq(projects.clientId, id));
  if (clientProjects.length > 0) {
    throw new Error(`Nie można usunąć klienta, ponieważ ma ${clientProjects.length} powiązanych projektów. Najpierw usuń lub zmień przypisanie projektów.`);
  }
  
  // Usuń klienta
  await db.delete(clients).where(eq(clients.id, id));
}

// ============ PROJECT HELPERS ============

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(eq(projects.status, status as any)).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(project);
  return Number(result[0].insertId);
}

export async function updateProject(id: number, project: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(project).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Sprawdź czy są przypisania pracowników do projektu
  const assignments = await getAssignmentsByProject(id);
  if (assignments.length > 0) {
    throw new Error(`Nie można usunąć projektu - przypisanych jest ${assignments.length} pracowników. Najpierw usuń przypisania pracowników.`);
  }
  
  await db.delete(projects).where(eq(projects.id, id));
}

// ============ ASSIGNMENT HELPERS ============

export async function getAssignmentsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(employeeProjectAssignments)
    .where(
      and(
        eq(employeeProjectAssignments.projectId, projectId),
        eq(employeeProjectAssignments.isActive, true)
      )
    );
}

export async function getAssignmentsByEmployee(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employeeProjectAssignments).where(eq(employeeProjectAssignments.employeeId, employeeId));
}

export async function createAssignment(assignment: InsertEmployeeProjectAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employeeProjectAssignments).values(assignment);
  return Number(result[0].insertId);
}

export async function updateAssignment(id: number, assignment: Partial<InsertEmployeeProjectAssignment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employeeProjectAssignments).set(assignment).where(eq(employeeProjectAssignments.id, id));
}

export async function deleteAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employeeProjectAssignments).where(eq(employeeProjectAssignments.id, id));
}

export async function getAssignmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employeeProjectAssignments).where(eq(employeeProjectAssignments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ TIME ENTRY HELPERS ============

export async function getTimeEntriesByAssignment(assignmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(timeEntries).where(eq(timeEntries.assignmentId, assignmentId)).orderBy(desc(timeEntries.workDate));
}

export async function createTimeEntry(entry: InsertTimeEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    // Konwertuj workDate na string YYYY-MM-DD jeśli jest obiektem Date
    const entryData: any = { ...entry };
    if (entryData.workDate instanceof Date) {
      const year = entryData.workDate.getFullYear();
      const month = String(entryData.workDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryData.workDate.getDate()).padStart(2, '0');
      entryData.workDate = `${year}-${month}-${day}`;
    }
    
    const result = await db.insert(timeEntries).values(entryData);
    return Number(result[0].insertId);
  } catch (error: any) {
    console.error('[DB] createTimeEntry error:', error);
    console.error('[DB] Entry data:', JSON.stringify(entry, null, 2));
    if (error.cause) {
      console.error('[DB] SQL Error:', error.cause.message);
      console.error('[DB] SQL Code:', error.cause.code);
    }
    throw error;
  }
}

export async function getTimeEntriesByDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const { gte, lte, and } = await import("drizzle-orm");
  return await db.select().from(timeEntries).where(
    and(
      gte(timeEntries.workDate, new Date(startDate)),
      lte(timeEntries.workDate, new Date(endDate))
    )
  );
}

export async function getAllTimeEntries() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(timeEntries).orderBy(desc(timeEntries.workDate));
  } catch (error) {
    console.error('[DB] getAllTimeEntries error:', error);
    return [];
  }
}

export async function deleteTimeEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(timeEntries).where(eq(timeEntries.id, id));
}

export async function updateTimeEntry(id: number, data: { hoursWorked?: number }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  await database.update(timeEntries)
    .set(data)
    .where(eq(timeEntries.id, id));
}

/**
 * Usuwa wszystkie wpisy godzinowe dla danego assignment w danym miesiącu
 */
export async function deleteTimeEntriesForAssignmentInMonth(
  assignmentId: number,
  month: number,
  year: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { sql } = await import("drizzle-orm");
  
  await db.delete(timeEntries).where(
    and(
      eq(timeEntries.assignmentId, assignmentId),
      sql`YEAR(${timeEntries.workDate}) = ${year}`,
      sql`MONTH(${timeEntries.workDate}) = ${month}`
    )
  );
}

/**
 * Usuwa wszystkie wpisy godzinowe dla danego pracownika w danym miesiącu
 */
export async function deleteTimeEntriesForEmployeeInMonth(
  employeeId: number,
  month: number,
  year: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { sql, inArray } = await import("drizzle-orm");
  const { employeeProjectAssignments } = await import("../drizzle/schema");
  
  // Pobierz wszystkie assignments dla pracownika
  const assignments = await db
    .select({ id: employeeProjectAssignments.id })
    .from(employeeProjectAssignments)
    .where(eq(employeeProjectAssignments.employeeId, employeeId));
  
  const assignmentIds = assignments.map(a => a.id);
  
  if (assignmentIds.length === 0) {
    return; // Brak assignments, nic do usunięcia
  }
  
  // Usuń wszystkie wpisy dla tych assignments w danym miesiącu
  await db.delete(timeEntries).where(
    and(
      inArray(timeEntries.assignmentId, assignmentIds),
      sql`YEAR(${timeEntries.workDate}) = ${year}`,
      sql`MONTH(${timeEntries.workDate}) = ${month}`
    )
  );
}

// ============ FIXED COST HELPERS ============

export async function getAllFixedCosts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(fixedCosts).orderBy(desc(fixedCosts.createdAt));
}

export async function getActiveFixedCosts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(fixedCosts).where(eq(fixedCosts.isActive, true));
}

export async function createFixedCost(cost: InsertFixedCost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(fixedCosts).values(cost);
  return Number(result[0].insertId);
}

export async function updateFixedCost(id: number, cost: Partial<InsertFixedCost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fixedCosts).set(cost).where(eq(fixedCosts.id, id));
}

export async function deleteFixedCost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(fixedCosts).where(eq(fixedCosts.id, id));
}

// ============ OWNER SALARY SIMULATION HELPERS ============

export async function getSimulationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(ownerSalarySimulations).where(eq(ownerSalarySimulations.userId, userId)).orderBy(desc(ownerSalarySimulations.simulationDate));
}

export async function createSimulation(simulation: InsertOwnerSalarySimulation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ownerSalarySimulations).values(simulation);
  return Number(result[0].insertId);
}

// ============ MONTHLY EMPLOYEE REPORTS HELPERS ============

export async function getAnnualReport(employeeId: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(monthlyEmployeeReports)
    .where(and(
      eq(monthlyEmployeeReports.employeeId, employeeId),
      eq(monthlyEmployeeReports.year, year)
    ))
    .orderBy(monthlyEmployeeReports.month);
}

export async function getMonthlyReport(employeeId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(monthlyEmployeeReports)
    .where(and(
      eq(monthlyEmployeeReports.employeeId, employeeId),
      eq(monthlyEmployeeReports.year, year),
      eq(monthlyEmployeeReports.month, month)
    ))
    .limit(1);
    
  return results[0] || null;
}

export async function getMonthlyReportsByMonthAndYear(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(monthlyEmployeeReports)
    .where(and(
      eq(monthlyEmployeeReports.year, year),
      eq(monthlyEmployeeReports.month, month)
    ));
}

// Stara funkcja upsertMonthlyReport została zastąpiona przez nową wersję poniżej

// Get time entries by employee and year
export async function getTimeEntriesByEmployeeAndYear(employeeId: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const { sql } = await import("drizzle-orm");
    
    return await db
      .select({
        id: timeEntries.id,
        assignmentId: timeEntries.assignmentId,
        workDate: timeEntries.workDate,
        hoursWorked: timeEntries.hoursWorked,
        description: timeEntries.description,
        employeeId: employeeProjectAssignments.employeeId,
      })
      .from(timeEntries)
      .innerJoin(
        employeeProjectAssignments,
        eq(timeEntries.assignmentId, employeeProjectAssignments.id)
      )
      .where(
        and(
          eq(employeeProjectAssignments.employeeId, employeeId),
          sql`YEAR(${timeEntries.workDate}) = ${year}`
        )
      )
      .orderBy(timeEntries.workDate);
  } catch (error) {
    console.error('[DB] getTimeEntriesByEmployeeAndYear error:', error);
    return [];
  }
}

// Get time entries by employee, year and month
export async function getTimeEntriesByEmployeeAndMonth(employeeId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const { sql } = await import("drizzle-orm");
    
    return await db
      .select({
        id: timeEntries.id,
        assignmentId: timeEntries.assignmentId,
        workDate: timeEntries.workDate,
        hoursWorked: timeEntries.hoursWorked,
        description: timeEntries.description,
        employeeId: employeeProjectAssignments.employeeId,
      })
      .from(timeEntries)
      .innerJoin(
        employeeProjectAssignments,
        eq(timeEntries.assignmentId, employeeProjectAssignments.id)
      )
      .where(
        and(
          eq(employeeProjectAssignments.employeeId, employeeId),
          sql`YEAR(${timeEntries.workDate}) = ${year}`,
          sql`MONTH(${timeEntries.workDate}) = ${month}`
        )
      )
      .orderBy(timeEntries.workDate);
  } catch (error) {
    console.error('[DB] getTimeEntriesByEmployeeAndMonth error:', error);
    return [];
  }
}

// Monthly Employee Reports
export async function getMonthlyReportsByEmployeeAndYear(employeeId: number, year: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(monthlyEmployeeReports).where(
    sql`${monthlyEmployeeReports.employeeId} = ${employeeId} AND ${monthlyEmployeeReports.year} = ${year}`
  );
}

export async function upsertMonthlyReport(data: {
  employeeId: number;
  year: number;
  month: number;
  actualCost: number | null;
}) {
  const database = await getDb();
  if (!database) return 0;
  const existing = await database.select().from(monthlyEmployeeReports).where(
    sql`${monthlyEmployeeReports.employeeId} = ${data.employeeId} AND ${monthlyEmployeeReports.year} = ${data.year} AND ${monthlyEmployeeReports.month} = ${data.month}`
  );
  
  if (existing.length > 0) {
    // Update tylko actualCost i przelicz profit (nie nadpisuj zapisanych wartości)
    const report = existing[0];
    const cost = data.actualCost ?? report.cost; // Użyj actualCost jeśli istnieje, w przeciwnym razie cost
    const profit = report.revenue - cost; // Przelicz profit
    
    await database.update(monthlyEmployeeReports)
      .set({ 
        actualCost: data.actualCost, 
        profit: profit,
        updatedAt: new Date() 
      })
      .where(sql`${monthlyEmployeeReports.id} = ${existing[0].id}`);
    return existing[0].id;
  } else {
    // Insert
    const result = await database.insert(monthlyEmployeeReports).values({
      employeeId: data.employeeId,
      year: data.year,
      month: data.month,
      actualCost: data.actualCost,
      hoursWorked: 0,
      hourlyRateClient: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    });
    return result[0].insertId;
  }
}

export async function updateMonthlyReportFields(data: {
  employeeId: number;
  year: number;
  month: number;
  hoursWorked?: number; // w groszach (setnych godzin)
  hourlyRateClient?: number; // w groszach
  actualCost?: number | null;
  propagateChanges?: boolean; // Czy propagować zmiany do timeEntries i assignments
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const existing = await database.select().from(monthlyEmployeeReports).where(
    sql`${monthlyEmployeeReports.employeeId} = ${data.employeeId} AND ${monthlyEmployeeReports.year} = ${data.year} AND ${monthlyEmployeeReports.month} = ${data.month}`
  );
  
  // Pobierz dane pracownika do obliczenia kosztu domyślnego
  const employee = await getEmployeeById(data.employeeId);
  if (!employee) {
    throw new Error("Pracownik nie został znaleziony");
  }
  
  let reportId: number;
  let oldHoursWorked = 0;
  let oldHourlyRateClient = 0;
  
  if (existing.length > 0) {
    // Aktualizuj istniejący raport
    const report = existing[0];
    oldHoursWorked = report.hoursWorked;
    oldHourlyRateClient = report.hourlyRateClient;
    
    // Użyj nowych wartości lub zachowaj istniejące
    const hoursWorked = data.hoursWorked !== undefined ? data.hoursWorked : report.hoursWorked;
    const hourlyRateClient = data.hourlyRateClient !== undefined ? data.hourlyRateClient : report.hourlyRateClient;
    const actualCost = data.actualCost !== undefined ? data.actualCost : report.actualCost;
    
    // Przelicz przychód na podstawie godzin i stawki
    const hours = hoursWorked / 100; // Konwersja z groszy na godziny
    const revenue = Math.round(hours * hourlyRateClient);
    
    // Użyj actualCost jeśli istnieje, w przeciwnym razie zapisany cost
    const cost = actualCost ?? report.cost;
    const profit = revenue - cost;
    
    await database.update(monthlyEmployeeReports)
      .set({
        hoursWorked,
        hourlyRateClient,
        revenue,
        actualCost,
        profit,
        updatedAt: new Date(),
      })
      .where(sql`${monthlyEmployeeReports.id} = ${report.id}`);
    
    reportId = report.id;
  } else {
    // Utwórz nowy raport - wymagane są wszystkie wartości
    if (data.hoursWorked === undefined || data.hourlyRateClient === undefined) {
      throw new Error("Aby utworzyć nowy raport, musisz podać godziny i stawkę");
    }
    
    const hoursWorked = data.hoursWorked;
    const hourlyRateClient = data.hourlyRateClient;
    const hours = hoursWorked / 100;
    const revenue = Math.round(hours * hourlyRateClient);
    const cost = data.actualCost ?? employee.monthlyCostTotal ?? 0;
    const profit = revenue - cost;
    
    const result = await database.insert(monthlyEmployeeReports).values({
      employeeId: data.employeeId,
      year: data.year,
      month: data.month,
      hoursWorked,
      hourlyRateClient,
      revenue,
      cost,
      actualCost: data.actualCost,
      profit,
    });
    
    reportId = Number(result[0].insertId);
  }
  
  // Propaguj zmiany do timeEntries i assignments jeśli wymagane
  if (data.propagateChanges !== false) {
    const timeEntriesList = await getTimeEntriesByEmployeeAndMonth(data.employeeId, data.year, data.month);
    
    // Jeśli zmieniono godziny, zaktualizuj proporcjonalnie wszystkie timeEntries
    if (data.hoursWorked !== undefined && timeEntriesList.length > 0) {
      const newTotalHours = data.hoursWorked / 100; // w godzinach
      
      // Jeśli istnieje stary raport, użyj jego godzin do obliczenia proporcji
      if (existing.length > 0 && oldHoursWorked > 0 && newTotalHours > 0) {
        const oldTotalHours = oldHoursWorked / 100;
        const ratio = newTotalHours / oldTotalHours;
        
        // Zaktualizuj każdy wpis proporcjonalnie
        for (const entry of timeEntriesList) {
          const newHoursWorked = Math.round(entry.hoursWorked * ratio);
          await updateTimeEntry(entry.id, { hoursWorked: newHoursWorked });
        }
      } else if (existing.length === 0 && newTotalHours > 0) {
        // Nowy raport - rozłóż godziny równomiernie na wszystkie wpisy
        const entryCount = timeEntriesList.length;
        if (entryCount > 0) {
          const hoursPerEntry = Math.round(data.hoursWorked / entryCount);
          for (const entry of timeEntriesList) {
            await updateTimeEntry(entry.id, { hoursWorked: hoursPerEntry });
          }
        }
      }
    }
    
    // Jeśli zmieniono stawkę, zaktualizuj wszystkie assignments używane w danym miesiącu
    if (data.hourlyRateClient !== undefined && timeEntriesList.length > 0) {
      const uniqueAssignmentIds = new Set(timeEntriesList.map(e => e.assignmentId));
      
      for (const assignmentId of uniqueAssignmentIds) {
        await database.update(employeeProjectAssignments)
          .set({ hourlyRateClient: data.hourlyRateClient })
          .where(eq(employeeProjectAssignments.id, assignmentId));
      }
    }
  }
  
  return reportId;
}

// Zapisz pełny raport miesięczny z wartościami z momentu zapisu (snapshot)
export async function saveMonthlyReportSnapshot(data: {
  employeeId: number;
  year: number;
  month: number;
  hoursWorked: number; // w groszach (13100 = 131h)
  hourlyRateClient: number; // w groszach
  monthlyCostTotal: number; // w groszach
}) {
  const database = await getDb();
  if (!database) return 0;
  
  const revenue = Math.round((data.hoursWorked / 100) * data.hourlyRateClient); // godziny × stawka
  const profit = revenue - data.monthlyCostTotal;
  
  const existing = await database.select().from(monthlyEmployeeReports).where(
    sql`${monthlyEmployeeReports.employeeId} = ${data.employeeId} AND ${monthlyEmployeeReports.year} = ${data.year} AND ${monthlyEmployeeReports.month} = ${data.month}`
  );
  
  if (existing.length > 0) {
    // Update - SUMUJ godziny i przychody zamiast nadpisywać
    // ZAWSZE zachowaj zapisany cost (wartość historyczna z momentu pierwszego zapisu)
    const existingReport = existing[0];
    
    // Sumuj godziny (oba są w groszach)
    const totalHoursWorked = existingReport.hoursWorked + data.hoursWorked;
    
    // Sumuj przychody (oba są w groszach)
    const existingRevenue = existingReport.revenue || 0;
    const totalRevenue = existingRevenue + revenue;
    
    // Oblicz średnią ważoną stawki
    // totalRevenue jest w groszach, totalHoursWorked jest w groszach (godziny * 100)
    const totalHours = totalHoursWorked / 100; // Konwersja na godziny
    const averageHourlyRate = totalHours > 0 
      ? Math.round(totalRevenue / totalHours) // Przychód w groszach / godziny = stawka w groszach
      : existingReport.hourlyRateClient || data.hourlyRateClient;
    
    // Przelicz zysk na podstawie sumy przychodów
    const totalProfit = totalRevenue - existingReport.cost;
    
    await database.update(monthlyEmployeeReports)
      .set({
        hoursWorked: totalHoursWorked, // Suma godzin (w groszach)
        hourlyRateClient: averageHourlyRate, // Średnia ważona stawka w groszach (już obliczona)
        revenue: totalRevenue, // Suma przychodów (w groszach)
        // ZACHOWAJ zapisaną wartość cost (nie nadpisuj wartości historycznej)
        cost: existingReport.cost, // Użyj istniejącej wartości, nie nadpisuj
        profit: totalProfit, // Przeliczony zysk
        updatedAt: new Date(),
      })
      .where(sql`${monthlyEmployeeReports.id} = ${existing[0].id}`);
    return existing[0].id;
  } else {
    // Insert
    const result = await database.insert(monthlyEmployeeReports).values({
      employeeId: data.employeeId,
      year: data.year,
      month: data.month,
      hoursWorked: data.hoursWorked,
      hourlyRateClient: data.hourlyRateClient,
      revenue: revenue,
      cost: data.monthlyCostTotal,
      actualCost: null,
      profit: profit,
    });
    return result[0].insertId;
  }
}

// Tasks
export async function getAllTasks() {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(tasks).orderBy(sql`${tasks.createdAt} DESC`);
}

export async function getTasksByStatus(status: "planned" | "in_progress" | "urgent" | "done") {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(tasks).where(eq(tasks.status, status)).orderBy(sql`${tasks.createdAt} DESC`);
}

export async function getUrgentTasks(limit: number = 10) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(tasks).where(eq(tasks.status, "urgent")).orderBy(sql`${tasks.createdAt} DESC`).limit(limit);
}

export async function getTaskById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(tasks).where(eq(tasks.id, id));
  return result[0] || null;
}

export async function createTask(data: InsertTask) {
  const database = await getDb();
  if (!database) return 0;
  // createdAt i updatedAt mają defaultNow() w schemacie, więc nie ustawiamy ich ręcznie
  // completedAt też może być null
  const taskData: any = {
    title: data.title,
    description: data.description ?? null,
    status: data.status ?? "planned",
  };
  const result = await database.insert(tasks).values(taskData);
  return result[0].insertId;
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const database = await getDb();
  if (!database) return;
  await database.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const database = await getDb();
  if (!database) return;
  await database.delete(tasks).where(eq(tasks.id, id));
}

// ============ GAMIFICATION HELPERS ============

export type GamificationSource =
  | "hours"
  | "quest"
  | "team_goal"
  | "innovation"
  | "vacation_planning"
  | "office_presence"
  | "hrappka_daily_hours";

/**
 * Simple leveling curve: each level requires 1,000 total points.
 * Level 1: 0–999, Level 2: 1,000–1,999, etc.
 */
function calculateLevelFromTotalPoints(totalPoints: number) {
  const pointsPerLevel = 1000;
  const level = Math.max(1, Math.floor(totalPoints / pointsPerLevel) + 1);
  const previousLevelsThreshold = (level - 1) * pointsPerLevel;
  const pointsInCurrentLevel = totalPoints - previousLevelsThreshold;
  const nextLevelThreshold = level * pointsPerLevel;
  return {
    level,
    pointsInCurrentLevel,
    nextLevelThreshold,
  };
}

/**
 * Calculate points for monthly hours based on GAMIFICATION_CONCEPT_V3:
 * - 1 pkt za każdą godzinę do 160h
 * - 160-180h: +0.5 pkt za każdą godzinę powyżej 160h
 * - 180-200h: +1 pkt za każdą godzinę powyżej 180h
 * - 200h+: +1.5 pkt za każdą godzinę powyżej 200h
 * Wynik jest zaokrąglany do najbliższej liczby całkowitej.
 */
export function calculateHoursGamificationPoints(hours: number): number {
  if (hours <= 0) return 0;

  let points = 0;

  // Podstawowe punkty do 160h
  const baseHours = Math.min(hours, 160);
  points += baseHours * 1;

  // Bonus 0.5 pkt za 160-180h
  if (hours > 160) {
    const bonusHours1 = Math.min(hours, 180) - 160;
    if (bonusHours1 > 0) {
      points += bonusHours1 * 0.5;
    }
  }

  // Bonus 1 pkt za 180-200h
  if (hours > 180) {
    const bonusHours2 = Math.min(hours, 200) - 180;
    if (bonusHours2 > 0) {
      points += bonusHours2 * 1;
    }
  }

  // Bonus 1.5 pkt powyżej 200h
  if (hours > 200) {
    const bonusHours3 = hours - 200;
    if (bonusHours3 > 0) {
      points += bonusHours3 * 1.5;
    }
  }

  return Math.round(points);
}

export async function getOrCreateEmployeeLevel(employeeId: number): Promise<EmployeeLevel> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const existing = await database
    .select()
    .from(employeeLevels)
    .where(eq(employeeLevels.employeeId, employeeId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const now = new Date();
  const result = await database.insert(employeeLevels).values({
    employeeId,
    level: 1,
    points: 0,
    totalPoints: 0,
    createdAt: now,
    updatedAt: now,
  } as InsertEmployeeLevel);

  const insertedId = Number(result[0].insertId);
  const created = await database
    .select()
    .from(employeeLevels)
    .where(eq(employeeLevels.id, insertedId))
    .limit(1);

  return created[0];
}

export async function applyGamificationPointsForEmployee(params: {
  employeeId: number;
  points: number;
  source: GamificationSource;
  description?: string;
  date?: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  if (params.points === 0) return;

  const createdAt = params.date ?? new Date();
  const month = createdAt.getMonth() + 1;
  const year = createdAt.getFullYear();

  const insertData: InsertEmployeePoint = {
    employeeId: params.employeeId,
    points: params.points,
    source: params.source,
    description: params.description ?? null,
    month,
    year,
    createdAt,
  };

  await database.insert(employeePoints).values(insertData);

  // Update or create employee level
  const levelRow = await getOrCreateEmployeeLevel(params.employeeId);
  const newTotal = levelRow.totalPoints + params.points;
  const { level, pointsInCurrentLevel } = calculateLevelFromTotalPoints(newTotal);

  await database
    .update(employeeLevels)
    .set({
      level,
      totalPoints: newTotal,
      points: pointsInCurrentLevel,
      updatedAt: new Date(),
    })
    .where(eq(employeeLevels.id, levelRow.id));
}

export type EmployeeGamificationSummary = {
  level: number;
  totalPoints: number;
  pointsInCurrentLevel: number;
  nextLevelThreshold: number;
  breakdownBySource: { source: GamificationSource; points: number }[];
  officePresence: {
    totalPoints: number;
    qualifiedDays: number;
  };
};

export async function getGamificationSummaryForEmployee(
  employeeId: number
): Promise<EmployeeGamificationSummary> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const levelRow = await getOrCreateEmployeeLevel(employeeId);

  // Aggregate points by source from history
  const rows = await database
    .select({
      source: employeePoints.source,
      total: sql<number>`SUM(${employeePoints.points})`,
    })
    .from(employeePoints)
    .where(eq(employeePoints.employeeId, employeeId))
    .groupBy(employeePoints.source);

  const breakdownBySource = rows.map((row) => ({
    source: row.source as GamificationSource,
    points: Number(row.total ?? 0),
  }));

  // Loguj breakdown dla debugowania
  console.log(`[Gamification] Breakdown by source for employee ${employeeId}:`, breakdownBySource);

  const totalPoints = breakdownBySource.reduce((sum, row) => sum + row.points, 0);
  console.log(`[Gamification] Total points for employee ${employeeId}: ${totalPoints} (from ${breakdownBySource.length} sources)`);
  const { pointsInCurrentLevel, nextLevelThreshold } = calculateLevelFromTotalPoints(totalPoints);

  const officeSource = breakdownBySource.find((r) => r.source === "office_presence");
  const officeTotalPoints = officeSource?.points ?? 0;
  const qualifiedDays = await database
    .select({ count: sql<number>`COUNT(*) as count` })
    .from(employeePoints)
    .where(
      and(
        eq(employeePoints.employeeId, employeeId),
        eq(employeePoints.source, "office_presence" as any)
      )
    );

  return {
    level: levelRow.level,
    totalPoints,
    pointsInCurrentLevel,
    nextLevelThreshold,
    breakdownBySource,
    officePresence: {
      totalPoints: officeTotalPoints,
      qualifiedDays: qualifiedDays[0] ? Number((qualifiedDays[0] as any).count ?? 0) : 0,
    },
  };
}

/**
 * Award or sync points for a single monthlyEmployeeReports row.
 * Uses calculateHoursGamificationPoints(hours) and only adds the difference
 * compared to already awarded "hours" points for given month/year.
 */
export async function awardHoursPointsForMonthlyReport(
  report: MonthlyEmployeeReport
): Promise<{ awarded: number; totalForMonth: number }> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  if (!report.hoursWorked || report.hoursWorked <= 0) {
    return { awarded: 0, totalForMonth: 0 };
  }

  const hours = report.hoursWorked / 100; // reports store godziny * 100
  const targetPoints = calculateHoursGamificationPoints(hours);
  if (targetPoints <= 0) {
    return { awarded: 0, totalForMonth: 0 };
  }

  const existingRows = await database
    .select({
      total: sql<number>`COALESCE(SUM(${employeePoints.points}), 0)`,
    })
    .from(employeePoints)
    .where(
      and(
        eq(employeePoints.employeeId, report.employeeId),
        eq(employeePoints.source, "hours" as any),
        eq(employeePoints.year, report.year),
        eq(employeePoints.month, report.month)
      )
    );

  const existingTotal = existingRows[0]?.total ?? 0;

  if (existingTotal >= targetPoints) {
    return { awarded: 0, totalForMonth: existingTotal };
  }

  const delta = targetPoints - existingTotal;

  await applyGamificationPointsForEmployee({
    employeeId: report.employeeId,
    points: delta,
    source: "hours",
    description: `Punkty za godziny: ${hours.toFixed(1)}h (${report.month}/${report.year})`,
    date: new Date(report.year, report.month - 1, 1),
  });

  return { awarded: delta, totalForMonth: targetPoints };
}

export async function awardHoursPointsForMonth(year: number, month: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const reports = await database
    .select()
    .from(monthlyEmployeeReports)
    .where(
      and(
        eq(monthlyEmployeeReports.year, year),
        eq(monthlyEmployeeReports.month, month)
      )
    );

  let processed = 0;
  let totalAwarded = 0;

  for (const report of reports) {
    const { awarded, totalForMonth } = await awardHoursPointsForMonthlyReport(
      report
    );
    if (totalForMonth > 0) {
      processed += 1;
    }
    totalAwarded += awarded;
  }

  return {
    processedReports: processed,
    totalPointsAwarded: totalAwarded,
  };
}

// ============ QUESTS & TEAM GOALS ============

export async function getAllQuests() {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(quests).orderBy(desc(quests.createdAt));
}

export async function createQuest(data: InsertQuest) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(quests).values(data);
  return Number(result[0].insertId);
}

export async function assignQuestToEmployee(data: {
  employeeId: number;
  questId: number;
}): Promise<number> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const existing = await database
    .select()
    .from(employeeQuests)
    .where(
      and(
        eq(employeeQuests.employeeId, data.employeeId),
        eq(employeeQuests.questId, data.questId)
      )
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const result = await database.insert(employeeQuests).values({
    employeeId: data.employeeId,
    questId: data.questId,
    status: "active",
    progress: 0,
    createdAt: new Date(),
  } as InsertEmployeeQuest);

  return Number(result[0].insertId);
}

export async function getQuestsForEmployee(employeeId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const rows = await database
    .select({
      quest: quests,
      assignment: employeeQuests,
    })
    .from(employeeQuests)
    .innerJoin(quests, eq(employeeQuests.questId, quests.id))
    .where(eq(employeeQuests.employeeId, employeeId));

  return rows;
}

export async function completeQuestForEmployee(params: {
  employeeId: number;
  questId: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const [assignment] = await database
    .select()
    .from(employeeQuests)
    .where(
      and(
        eq(employeeQuests.employeeId, params.employeeId),
        eq(employeeQuests.questId, params.questId)
      )
    )
    .limit(1);

  if (!assignment) {
    return { success: false as const, reason: "not_assigned" as const };
  }

  if (assignment.status === "completed") {
    return { success: false as const, reason: "already_completed" as const };
  }

  const [quest] = await database
    .select()
    .from(quests)
    .where(eq(quests.id, params.questId))
    .limit(1);

  if (!quest) {
    return { success: false as const, reason: "quest_not_found" as const };
  }

  const now = new Date();

  await database
    .update(employeeQuests)
    .set({
      status: "completed",
      progress: quest.targetValue,
      completedAt: now,
    })
    .where(eq(employeeQuests.id, assignment.id));

  if (quest.rewardPoints && quest.rewardPoints > 0) {
    await applyGamificationPointsForEmployee({
      employeeId: params.employeeId,
      points: quest.rewardPoints,
      source: "quest",
      description: `Quest: ${quest.name}`,
      date: now,
    });
  }

  return { success: true as const };
}

export async function createTeamGoal(data: InsertTeamGoal) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(teamGoals).values(data);
  return Number(result[0].insertId);
}

export async function getActiveTeamGoals() {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  return database
    .select()
    .from(teamGoals)
    .where(
      or(
        eq(teamGoals.status, "planned" as any),
        eq(teamGoals.status, "active" as any)
      )
    )
    .orderBy(desc(teamGoals.createdAt));
}

export async function updateTeamGoalProgress(goalId: number, currentHours: number, status?: TeamGoal["status"]) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const update: Partial<InsertTeamGoal> = {
    currentHours,
  };
  if (status) {
    (update as any).status = status;
  }

  await database
    .update(teamGoals)
    .set(update)
    .where(eq(teamGoals.id, goalId));
}

// ============ KNOWLEDGE BASE & VACATION GAMIFICATION ============

export async function awardKnowledgeBasePoints(params: {
  employeeId: number;
  knowledgeBaseId: number;
  points: number;
  reason: KnowledgeBasePoint["reason"];
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  if (params.points === 0) return;

  const createdAt = new Date();

  const insertData: InsertKnowledgeBasePoint = {
    employeeId: params.employeeId,
    knowledgeBaseId: params.knowledgeBaseId,
    points: params.points,
    reason: params.reason,
    createdAt,
  };

  await database.insert(knowledgeBasePoints).values(insertData);

  await applyGamificationPointsForEmployee({
    employeeId: params.employeeId,
    points: params.points,
    source: "innovation",
    description: `Baza wiedzy: ${params.reason}`,
    date: createdAt,
  });
}

export function calculateVacationPlanningPoints(input: {
  plannedMonthsAhead: number;
  isSplit: boolean;
  conflictLevel: "low" | "medium" | "high";
}): number {
  let points = 0;

  if (input.plannedMonthsAhead >= 3) {
    points += 20;
  } else if (input.plannedMonthsAhead >= 2) {
    points += 10;
  } else if (input.plannedMonthsAhead >= 1) {
    points += 5;
  }

  if (input.isSplit) {
    points += 30;
  }

  if (input.conflictLevel === "low") {
    points += 10;
  }

  return points;
}

export async function createVacationPlanWithPoints(params: {
  employeeId: number;
  startDate: Date;
  endDate: Date;
  plannedMonthsAhead: number;
  isSplit: boolean;
  conflictLevel: "low" | "medium" | "high";
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const points = calculateVacationPlanningPoints({
    plannedMonthsAhead: params.plannedMonthsAhead,
    isSplit: params.isSplit,
    conflictLevel: params.conflictLevel,
  });

  const createdAt = new Date();

  const result = await database.insert(vacationPlans).values({
    employeeId: params.employeeId,
    startDate: params.startDate,
    endDate: params.endDate,
    plannedMonthsAhead: params.plannedMonthsAhead,
    isSplit: params.isSplit,
    conflictLevel: params.conflictLevel,
    pointsAwarded: points,
    createdAt,
  } as InsertVacationPlan);

  const id = Number(result[0].insertId);

  return { id, pointsAwarded: points };
}

// ============ VACATION REQUESTS & SUMMARY ============

export type EmployeeVacationSummary = {
  year: number;
  totalDaysPerYear: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
};

export async function getVacationSummaryForEmployee(
  employeeId: number,
  year: number
): Promise<EmployeeVacationSummary> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const employee = await getEmployeeById(employeeId);
  const totalDaysPerYear = employee?.vacationDaysPerYear ?? 21;

  const approved = await database
    .select({
      days: sql<number>`COALESCE(SUM(${vacations.daysCount}), 0)`,
    })
    .from(vacations)
    .where(
      and(
        eq(vacations.employeeId, employeeId),
        eq(vacations.status, "approved" as any),
        sql`YEAR(${vacations.startDate}) = ${year}`
      )
    );

  const pending = await database
    .select({
      days: sql<number>`COALESCE(SUM(${vacations.daysCount}), 0)`,
    })
    .from(vacations)
    .where(
      and(
        eq(vacations.employeeId, employeeId),
        eq(vacations.status, "pending" as any),
        sql`YEAR(${vacations.startDate}) = ${year}`
      )
    );

  const usedDays = Number(approved[0]?.days ?? 0);
  const pendingDays = Number(pending[0]?.days ?? 0);
  const availableDays = Math.max(0, totalDaysPerYear - usedDays - pendingDays);

  return {
    year,
    totalDaysPerYear,
    usedDays,
    pendingDays,
    availableDays,
  };
}

export async function getVacationsForEmployee(employeeId: number, year: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  return database
    .select()
    .from(vacations)
    .where(
      and(
        eq(vacations.employeeId, employeeId),
        sql`YEAR(${vacations.startDate}) = ${year}`
      )
    )
    .orderBy(vacations.startDate);
}

export async function requestVacationWithPlan(params: {
  employeeId: number;
  startDate: Date;
  endDate: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const msPerDay = 1000 * 60 * 60 * 24;
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const rawDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  const daysCount = Math.max(0, rawDays);

  const year = start.getFullYear();
  const summary = await getVacationSummaryForEmployee(params.employeeId, year);

  if (daysCount <= 0) {
    throw new Error("Zakres dat urlopu jest nieprawidłowy.");
  }

  if (daysCount > summary.availableDays) {
    throw new Error(
      `Brak wystarczającej liczby dni urlopu. Dostępne: ${summary.availableDays}, wniosek: ${daysCount}.`
    );
  }

  // Oblicz wyprzedzenie w miesiącach
  const plannedMonthsAhead =
    (start.getFullYear() - new Date().getFullYear()) * 12 +
    (start.getMonth() - new Date().getMonth());

  // Oblicz poziom konfliktu na podstawie innych urlopów (pending + approved) w tym okresie
  const overlapping = await database
    .select()
    .from(vacations)
    .where(
      and(
        sql`${vacations.employeeId} != ${params.employeeId}`,
        sql`${vacations.status} IN ('pending','approved')`,
        sql`${vacations.startDate} <= ${end}`,
        sql`${vacations.endDate} >= ${start}`
      )
    );

  const overlappingEmployees = new Set(overlapping.map((v) => v.employeeId));
  let conflictLevel: "low" | "medium" | "high" = "low";
  if (overlappingEmployees.size >= 3) {
    conflictLevel = "high";
  } else if (overlappingEmployees.size === 2) {
    conflictLevel = "medium";
  }

  // Na tym etapie nie wiemy jeszcze, czy urlop jest "rozłożony" w skali roku – każdy wniosek to jeden blok
  const isSplit = false;

  // Stwórz wniosek urlopowy (pending)
  const vacationResult = await database.insert(vacations).values({
    employeeId: params.employeeId,
    startDate: start,
    endDate: end,
    daysCount,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as InsertVacation);

  const vacationId = Number(vacationResult[0].insertId);

  // Zapisz meta-informacje do vacationPlans (bez przyznawania punktów)
  const { id: vacationPlanId, pointsAwarded } = await createVacationPlanWithPoints({
    employeeId: params.employeeId,
    startDate: start,
    endDate: end,
    plannedMonthsAhead: plannedMonthsAhead,
    isSplit,
    conflictLevel,
  });

  return {
    vacationId,
    vacationPlanId,
    pointsPreview: pointsAwarded,
    conflictLevel,
    daysCount,
    summary,
  };
}

export async function changeVacationStatus(params: {
  vacationId: number;
  status: "approved" | "rejected";
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const [vacation] = await database
    .select()
    .from(vacations)
    .where(eq(vacations.id, params.vacationId))
    .limit(1);

  if (!vacation) {
    throw new Error("Wniosek urlopowy nie został znaleziony.");
  }

  await database
    .update(vacations)
    .set({
      status: params.status,
      updatedAt: new Date(),
    })
    .where(eq(vacations.id, params.vacationId));

  // Przy zatwierdzeniu przyznaj punkty według wcześniej zapisanych parametrów planu
  if (params.status === "approved") {
    const plans = await database
      .select()
      .from(vacationPlans)
      .where(
        and(
          eq(vacationPlans.employeeId, vacation.employeeId),
          eq(vacationPlans.startDate, vacation.startDate),
          eq(vacationPlans.endDate, vacation.endDate)
        )
      )
      .limit(1);

    const plan = plans[0] as VacationPlan | undefined;
    if (plan && plan.pointsAwarded > 0) {
      await applyGamificationPointsForEmployee({
        employeeId: vacation.employeeId,
        points: plan.pointsAwarded,
        source: "vacation_planning",
        description: `Zatwierdzony urlop (${vacation.startDate.toISOString().slice(0, 10)} - ${vacation.endDate
          .toISOString()
          .slice(0, 10)})`,
        date: vacation.startDate instanceof Date ? vacation.startDate : new Date(vacation.startDate),
      });
    }
  }
}

// Knowledge Base
export async function getAllKnowledgeBase(filters?: { status?: "draft" | "published" | "archived" }) {
  const database = await getDb();
  if (!database) return [];
  
  let query = database.select().from(knowledgeBase);
  
  if (filters?.status) {
    query = query.where(eq(knowledgeBase.status, filters.status)) as any;
  }
  
  return query.orderBy(sql`${knowledgeBase.createdAt} DESC`);
}

export async function getKnowledgeBaseById(id: number) {
  const database = await getDb();
  if (!database) return null;
  const result = await database.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
  return result[0] || null;
}

export async function createKnowledgeBase(data: InsertKnowledgeBase) {
  const database = await getDb();
  if (!database) return 0;
  
  const insertData: any = {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Jeśli status to "published", ustaw publishedAt
  if ((data as any).status === "published" && !(data as any).publishedAt) {
    insertData.publishedAt = new Date();
  }
  
  const result = await database.insert(knowledgeBase).values(insertData);
  const id = result[0].insertId;

  // Award basic gamification points for employee-authored articles
  if ((data as any).authorId) {
    const author = await getUserById((data as any).authorId);
    if (author && author.employeeId) {
      try {
        await awardKnowledgeBasePoints({
          employeeId: author.employeeId,
          knowledgeBaseId: Number(id),
          points: 30, // baseline for now; can be adjusted by article type later
          reason: "article_created",
        });
      } catch (error) {
        console.error("[Gamification] Failed to award knowledge base points", error);
      }
    }
  }

  return id;
}

export async function updateKnowledgeBase(id: number, data: Partial<InsertKnowledgeBase>) {
  const database = await getDb();
  if (!database) return;
  
  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };
  
  // Jeśli zmieniamy status z draft na published, ustaw publishedAt
  if ((data as any).status === "published") {
    const current = await getKnowledgeBaseById(id);
    if (current && (current as any).status !== "published" && !(data as any).publishedAt) {
      updateData.publishedAt = new Date();
    }
  }
  
  await database.update(knowledgeBase).set(updateData).where(eq(knowledgeBase.id, id));
}

export async function deleteKnowledgeBase(id: number) {
  const database = await getDb();
  if (!database) return;
  await database.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
}

// ============ KNOWLEDGE BASE ENHANCED FUNCTIONS ============

export async function searchKnowledgeBase(filters: {
  query?: string;
  label?: string;
  tags?: string;
  projectId?: number;
  status?: "draft" | "published" | "archived";
  sortBy?: "newest" | "oldest" | "title" | "views";
}) {
  const database = await getDb();
  if (!database) return [];
  
  const conditions: any[] = [];
  
  if (filters.query) {
    conditions.push(
      or(
        sql`${knowledgeBase.title} LIKE ${`%${filters.query}%`}`,
        sql`${knowledgeBase.content} LIKE ${`%${filters.query}%`}`
      )
    );
  }
  
  if (filters.label) {
    conditions.push(eq(knowledgeBase.label, filters.label));
  }
  
  if (filters.tags) {
    const tagsArray = filters.tags.split(",").map(t => t.trim());
    const tagConditions = tagsArray.map(tag => 
      sql`${knowledgeBase.tags} LIKE ${`%${tag}%`}`
    );
    conditions.push(or(...tagConditions));
  }
  
  // Filtruj po statusie (domyślnie tylko published)
  if (!filters.status) {
    conditions.push(eq(knowledgeBase.status, "published"));
  } else {
    conditions.push(eq(knowledgeBase.status, filters.status));
  }
  
  // Filtruj po projectId jeśli podano
  if (filters.projectId) {
    conditions.push(eq(knowledgeBase.projectId, filters.projectId));
  }
  
  let queryBuilder = database.select().from(knowledgeBase);
  
  if (conditions.length > 0) {
    queryBuilder = queryBuilder.where(and(...conditions)) as any;
  }
  
  // Sortowanie
  switch (filters.sortBy) {
    case "oldest":
      queryBuilder = queryBuilder.orderBy(knowledgeBase.createdAt) as any;
      break;
    case "title":
      queryBuilder = queryBuilder.orderBy(knowledgeBase.title) as any;
      break;
    case "views":
      queryBuilder = queryBuilder.orderBy(desc(knowledgeBase.viewCount)) as any;
      break;
    case "newest":
    default:
      queryBuilder = queryBuilder.orderBy(desc(knowledgeBase.createdAt)) as any;
      break;
  }
  
  // Najpierw przypięte
  const results = await queryBuilder;
  return results.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });
}

export async function incrementKnowledgeBaseViewCount(knowledgeBaseId: number, userId: number | null) {
  const database = await getDb();
  if (!database) return;
  
  // Zwiększ licznik w tabeli knowledgeBase
  const article = await getKnowledgeBaseById(knowledgeBaseId);
  if (article) {
    await database.update(knowledgeBase)
      .set({ viewCount: (article.viewCount || 0) + 1 })
      .where(eq(knowledgeBase.id, knowledgeBaseId));
  }
  
  // Dodaj wpis do historii odczytów
  await database.insert(knowledgeBaseViews).values({
    knowledgeBaseId,
    userId: userId || null,
    viewedAt: new Date(),
  });
}

export async function getKnowledgeBaseFavorites(userId: number) {
  const database = await getDb();
  if (!database) return [];
  
  return await database
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      content: knowledgeBase.content,
      label: knowledgeBase.label,
      tags: knowledgeBase.tags,
      viewCount: knowledgeBase.viewCount,
      isPinned: knowledgeBase.isPinned,
      createdAt: knowledgeBase.createdAt,
      updatedAt: knowledgeBase.updatedAt,
    })
    .from(knowledgeBaseFavorites)
    .innerJoin(knowledgeBase, eq(knowledgeBaseFavorites.knowledgeBaseId, knowledgeBase.id))
    .where(eq(knowledgeBaseFavorites.userId, userId))
    .orderBy(desc(knowledgeBaseFavorites.createdAt));
}

export async function toggleKnowledgeBaseFavorite(userId: number, knowledgeBaseId: number): Promise<{ isFavorite: boolean }> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Sprawdź czy już jest w ulubionych
  const existing = await database
    .select()
    .from(knowledgeBaseFavorites)
    .where(
      and(
        eq(knowledgeBaseFavorites.userId, userId),
        eq(knowledgeBaseFavorites.knowledgeBaseId, knowledgeBaseId)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // Usuń z ulubionych
    await database
      .delete(knowledgeBaseFavorites)
      .where(
        and(
          eq(knowledgeBaseFavorites.userId, userId),
          eq(knowledgeBaseFavorites.knowledgeBaseId, knowledgeBaseId)
        )
      );
    return { isFavorite: false };
  } else {
    // Dodaj do ulubionych
    await database.insert(knowledgeBaseFavorites).values({
      userId,
      knowledgeBaseId,
      createdAt: new Date(),
    });
    return { isFavorite: true };
  }
}

export async function getKnowledgeBaseStats() {
  const database = await getDb();
  if (!database) return null;
  
  const totalArticles = await database.select({ count: sql<number>`count(*)` }).from(knowledgeBase);
  const totalViews = await database.select({ count: sql<number>`count(*)` }).from(knowledgeBaseViews);
  const mostViewed = await database
    .select()
    .from(knowledgeBase)
    .orderBy(desc(knowledgeBase.viewCount))
    .limit(10);
  
  return {
    totalArticles: totalArticles[0]?.count || 0,
    totalViews: totalViews[0]?.count || 0,
    mostViewed,
  };
}

// ============ KNOWLEDGE BASE COMMENTS ============

export async function getKnowledgeBaseComments(articleId: number) {
  const database = await getDb();
  if (!database) return [];
  
  // Pobierz wszystkie komentarze dla artykułu
  const comments = await database
    .select()
    .from(knowledgeBaseComments)
    .where(eq(knowledgeBaseComments.knowledgeBaseId, articleId))
    .orderBy(knowledgeBaseComments.createdAt);
  
  // Pobierz informacje o użytkownikach
  const commentsWithUsers = await Promise.all(
    comments.map(async (comment) => {
      const user = await database
        .select()
        .from(users)
        .where(eq(users.id, comment.userId))
        .limit(1);
      
      return {
        ...comment,
        user: user[0] || null,
      };
    })
  );
  
  // Zbuduj strukturę drzewa (komentarze główne i odpowiedzi)
  const rootComments = commentsWithUsers.filter(c => !c.parentId);
  const repliesMap = new Map<number, typeof commentsWithUsers>();
  
  commentsWithUsers.forEach(comment => {
    if (comment.parentId) {
      if (!repliesMap.has(comment.parentId)) {
        repliesMap.set(comment.parentId, []);
      }
      repliesMap.get(comment.parentId)!.push(comment);
    }
  });
  
  return rootComments.map(comment => ({
    ...comment,
    replies: repliesMap.get(comment.id) || [],
  }));
}

export async function createKnowledgeBaseComment(data: {
  knowledgeBaseId: number;
  userId: number;
  parentId?: number | null;
  content: string;
}) {
  const database = await getDb();
  if (!database) return 0;
  
  const result = await database.insert(knowledgeBaseComments).values({
    knowledgeBaseId: data.knowledgeBaseId,
    userId: data.userId,
    parentId: data.parentId || null,
    content: data.content,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return result[0].insertId;
}

export async function updateKnowledgeBaseComment(id: number, content: string) {
  const database = await getDb();
  if (!database) return;
  
  await database
    .update(knowledgeBaseComments)
    .set({ content, updatedAt: new Date() })
    .where(eq(knowledgeBaseComments.id, id));
}

export async function deleteKnowledgeBaseComment(id: number) {
  const database = await getDb();
  if (!database) return;
  
  // Usuń również wszystkie odpowiedzi (CASCADE)
  await database
    .delete(knowledgeBaseComments)
    .where(eq(knowledgeBaseComments.id, id));
}

// ============ KNOWLEDGE BASE LINKS ============

export async function getRelatedArticles(articleId: number) {
  const database = await getDb();
  if (!database) return [];
  
  // Pobierz artykuły powiązane (gdzie ten artykuł jest źródłem)
  const links = await database
    .select({
      article: knowledgeBase,
      linkType: knowledgeBaseLinks.linkType,
    })
    .from(knowledgeBaseLinks)
    .innerJoin(knowledgeBase, eq(knowledgeBaseLinks.toArticleId, knowledgeBase.id))
    .where(eq(knowledgeBaseLinks.fromArticleId, articleId));
  
  // Pobierz również artykuły, które linkują do tego artykułu (odwrotne powiązania)
  const reverseLinks = await database
    .select({
      article: knowledgeBase,
      linkType: knowledgeBaseLinks.linkType,
    })
    .from(knowledgeBaseLinks)
    .innerJoin(knowledgeBase, eq(knowledgeBaseLinks.fromArticleId, knowledgeBase.id))
    .where(eq(knowledgeBaseLinks.toArticleId, articleId));
  
  // Połącz i usuń duplikaty
  const allLinks = [...links, ...reverseLinks];
  const uniqueArticles = new Map<number, typeof links[0]>();
  
  allLinks.forEach(link => {
    if (!uniqueArticles.has(link.article.id)) {
      uniqueArticles.set(link.article.id, link);
    }
  });
  
  return Array.from(uniqueArticles.values()).map(l => l.article);
}

export async function suggestSimilarArticles(articleId: number, limit: number = 5) {
  const database = await getDb();
  if (!database) return [];
  
  // Pobierz aktualny artykuł
  const currentArticle = await getKnowledgeBaseById(articleId);
  if (!currentArticle) return [];
  
  // Pobierz wszystkie artykuły (oprócz aktualnego)
  const allArticles = await database
    .select()
    .from(knowledgeBase)
    .where(and(
      sql`${knowledgeBase.id} != ${articleId}`,
      eq(knowledgeBase.status, "published")
    ));
  
  // Oblicz podobieństwo na podstawie tagów i labeli
  const scoredArticles = allArticles.map(article => {
    let score = 0;
    
    // Podobieństwo tagów
    if (currentArticle.tags && article.tags) {
      const currentTags = new Set(currentArticle.tags.split(",").map(t => t.trim().toLowerCase()));
      const articleTags = new Set(article.tags.split(",").map(t => t.trim().toLowerCase()));
      const commonTags = Array.from(currentTags).filter(t => articleTags.has(t));
      score += commonTags.length * 2;
    }
    
    // Podobieństwo labeli
    if (currentArticle.label && article.label && currentArticle.label === article.label) {
      score += 3;
    }
    
    // Podobieństwo projektu
    if (currentArticle.projectId && article.projectId && currentArticle.projectId === article.projectId) {
      score += 2;
    }
    
    // Podobieństwo typu artykułu
    if ((currentArticle as any).articleType === (article as any).articleType) {
      score += 1;
    }
    
    return { article, score };
  });
  
  // Sortuj po score i zwróć top N
  return scoredArticles
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.article);
}

export async function createKnowledgeBaseLink(data: {
  fromArticleId: number;
  toArticleId: number;
  linkType: "manual" | "suggested";
}) {
  const database = await getDb();
  if (!database) return 0;
  
  // Sprawdź czy link już istnieje
  const existing = await database
    .select()
    .from(knowledgeBaseLinks)
    .where(
      and(
        eq(knowledgeBaseLinks.fromArticleId, data.fromArticleId),
        eq(knowledgeBaseLinks.toArticleId, data.toArticleId)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  const result = await database.insert(knowledgeBaseLinks).values({
    fromArticleId: data.fromArticleId,
    toArticleId: data.toArticleId,
    linkType: data.linkType,
    createdAt: new Date(),
  });
  
  return result[0].insertId;
}

export async function deleteKnowledgeBaseLink(fromArticleId: number, toArticleId: number) {
  const database = await getDb();
  if (!database) return;
  
  await database
    .delete(knowledgeBaseLinks)
    .where(
      and(
        eq(knowledgeBaseLinks.fromArticleId, fromArticleId),
        eq(knowledgeBaseLinks.toArticleId, toArticleId)
      )
    );
}

export async function getKnowledgeBaseLinkGraph(articleId: number) {
  const database = await getDb();
  if (!database) return { incoming: [], outgoing: [] };
  
  const outgoing = await database
    .select()
    .from(knowledgeBaseLinks)
    .where(eq(knowledgeBaseLinks.fromArticleId, articleId));
  
  const incoming = await database
    .select()
    .from(knowledgeBaseLinks)
    .where(eq(knowledgeBaseLinks.toArticleId, articleId));
  
  return { incoming, outgoing };
}

// ============ EMPLOYEE CV HELPERS ============

export async function getEmployeeCV(employeeId: number) {
  const database = await getDb();
  if (!database) return null;
  
  const cv = await database
    .select()
    .from(employeeCV)
    .where(and(
      eq(employeeCV.employeeId, employeeId),
      eq(employeeCV.isActive, true)
    ))
    .limit(1);
  
  return cv[0] || null;
}

export async function getEmployeeCVWithDetails(employeeId: number) {
  const database = await getDb();
  if (!database) return null;
  
  const cv = await getEmployeeCV(employeeId);
  if (!cv) return null;
  
  // Pobierz umiejętności - tylko z aktualnego CV
  const skills = await database
    .select()
    .from(employeeSkills)
    .where(and(
      eq(employeeSkills.employeeId, employeeId),
      eq(employeeSkills.cvId, cv.id)
    ));
  
  // Pobierz technologie - tylko z aktualnego CV
  const technologies = await database
    .select()
    .from(employeeTechnologies)
    .where(and(
      eq(employeeTechnologies.employeeId, employeeId),
      eq(employeeTechnologies.cvId, cv.id)
    ));
  
  // Pobierz projekty CV - tylko z aktualnego CV
  const cvProjects = await database
    .select()
    .from(employeeCVProjects)
    .where(and(
      eq(employeeCVProjects.employeeId, employeeId),
      eq(employeeCVProjects.cvId, cv.id)
    ));
  
  // Pobierz języki - tylko z aktualnego CV (lub wszystkie jeśli cvId jest null)
  const languages = await database
    .select()
    .from(employeeLanguages)
    .where(and(
      eq(employeeLanguages.employeeId, employeeId),
      or(
        eq(employeeLanguages.cvId, cv.id),
        isNull(employeeLanguages.cvId)
      )
    ));
  
  return {
    ...cv,
    skills,
    technologies,
    projects: cvProjects,
    languages,
  };
}

export async function createOrUpdateEmployeeCV(data: {
  employeeId: number;
  yearsOfExperience: number;
  summary?: string;
  tagline?: string; // Krótki opis (2-3 zdania)
  seniorityLevel?: string; // Junior, Mid, Senior
  skills?: Array<{ name: string }>; // Umiejętności miękkie - bez poziomu
  technologies?: Array<{ name: string; category?: string; proficiency: string }>; // Technologie z kategorią
  languages?: Array<{ name: string; level?: string }>; // Języki z poziomami
  projects?: Array<{
    projectId: number;
    description?: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    technologies?: string;
    keywords?: string;
  }>;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Pobierz najwyższą wersję i dezaktywuj poprzednie CV
  const existingCVs = await database
    .select()
    .from(employeeCV)
    .where(eq(employeeCV.employeeId, data.employeeId));
  
  // Dezaktywuj poprzednie CV (jeśli istnieją)
  if (existingCVs.length > 0) {
    try {
      await database
        .update(employeeCV)
        .set({ isActive: false })
        .where(eq(employeeCV.employeeId, data.employeeId));
    } catch (error: any) {
      console.warn('[createOrUpdateEmployeeCV] Warning: Could not deactivate previous CV:', error.message);
      // Kontynuuj - nie jest to krytyczne
    }
  }
  
  const maxVersion = existingCVs.length > 0
    ? Math.max(...existingCVs.map(cv => cv.version))
    : 0;
  
  // Utwórz nowe CV
  let cvId: number;
  try {
    const newCV = await database.insert(employeeCV).values({
      employeeId: data.employeeId,
      yearsOfExperience: data.yearsOfExperience,
      summary: data.summary || null,
      tagline: data.tagline || null,
      seniorityLevel: data.seniorityLevel || null,
      version: maxVersion + 1,
      isActive: true,
    });
    cvId = Number(newCV[0].insertId);
    console.log('[createOrUpdateEmployeeCV] Created CV with id:', cvId);
  } catch (error: any) {
    console.error('[createOrUpdateEmployeeCV] Error creating CV:', error);
    throw new Error(`Błąd podczas tworzenia CV: ${error.message}`);
  }
  
  // Usuń stare umiejętności dla tego pracownika (z poprzednich wersji CV)
  try {
    await database
      .delete(employeeSkills)
      .where(eq(employeeSkills.employeeId, data.employeeId));
  } catch (error: any) {
    console.warn('[createOrUpdateEmployeeCV] Warning: Could not delete old skills:', error.message);
  }
  
  // Dodaj umiejętności miękkie
  if (data.skills && data.skills.length > 0) {
    try {
      await database.insert(employeeSkills).values(
        data.skills.map(skill => ({
          employeeId: data.employeeId,
          cvId,
          skillName: skill.name,
          skillType: "soft" as "soft",
        }))
      );
    } catch (error: any) {
      console.error('[createOrUpdateEmployeeCV] Error inserting skills:', error);
      throw new Error(`Błąd podczas zapisywania umiejętności: ${error.message}`);
    }
  }
  
  // Usuń stare technologie dla tego pracownika (z poprzednich wersji CV)
  try {
    await database
      .delete(employeeTechnologies)
      .where(eq(employeeTechnologies.employeeId, data.employeeId));
  } catch (error: any) {
    console.warn('[createOrUpdateEmployeeCV] Warning: Could not delete old technologies:', error.message);
  }
  
  // Dodaj technologie (umiejętności twarde)
  if (data.technologies && data.technologies.length > 0) {
    try {
      await database.insert(employeeTechnologies).values(
        data.technologies.map(tech => ({
          employeeId: data.employeeId,
          cvId,
          technologyName: tech.name,
          category: tech.category || null,
          proficiency: tech.proficiency as "beginner" | "intermediate" | "advanced" | "expert",
        }))
      );
    } catch (error: any) {
      console.error('[createOrUpdateEmployeeCV] Error inserting technologies:', error);
      throw new Error(`Błąd podczas zapisywania technologii: ${error.message}`);
    }
  }
  
  // Usuń stare języki dla tego pracownika (z poprzednich wersji CV)
  try {
    await database
      .delete(employeeLanguages)
      .where(eq(employeeLanguages.employeeId, data.employeeId));
  } catch (error: any) {
    console.warn('[createOrUpdateEmployeeCV] Warning: Could not delete old languages:', error.message);
  }
  
  // Dodaj języki
  if (data.languages && data.languages.length > 0) {
    try {
      await database.insert(employeeLanguages).values(
        data.languages.map(lang => ({
          employeeId: data.employeeId,
          cvId,
          languageName: lang.name,
          level: lang.level || null,
        }))
      );
    } catch (error: any) {
      console.error('[createOrUpdateEmployeeCV] Error inserting languages:', error);
      throw new Error(`Błąd podczas zapisywania języków: ${error.message}`);
    }
  }
  
  // Usuń stare projekty dla tego pracownika (z poprzednich wersji CV)
  try {
    await database
      .delete(employeeCVProjects)
      .where(eq(employeeCVProjects.employeeId, data.employeeId));
  } catch (error: any) {
    console.warn('[createOrUpdateEmployeeCV] Warning: Could not delete old projects:', error.message);
  }
  
  // Dodaj projekty
  if (data.projects && data.projects.length > 0) {
    try {
      await database.insert(employeeCVProjects).values(
        data.projects.map(project => ({
          employeeId: data.employeeId,
          cvId,
          projectId: project.projectId,
          projectDescription: project.description || null,
          role: project.role || null,
          startDate: project.startDate ? new Date(project.startDate) : null,
          endDate: project.endDate ? new Date(project.endDate) : null,
          technologies: project.technologies || null,
          keywords: project.keywords || null,
        }))
      );
    } catch (error: any) {
      console.error('[createOrUpdateEmployeeCV] Error inserting projects:', error);
      throw new Error(`Błąd podczas zapisywania projektów: ${error.message}`);
    }
  }
  
  return cvId;
}

export async function getEmployeeCVProjects(cvId: number) {
  const database = await getDb();
  if (!database) return [];
  
  const { projects } = await import("../drizzle/schema");
  
  return await database
    .select({
      cvProject: employeeCVProjects,
      project: {
        id: projects.id,
        name: projects.name,
        clientId: projects.clientId,
        description: projects.description, // Dodajemy opis projektu
      },
    })
    .from(employeeCVProjects)
    .innerJoin(projects, eq(employeeCVProjects.projectId, projects.id))
    .where(eq(employeeCVProjects.cvId, cvId));
}

export async function saveCVHistory(employeeId: number, cvId: number, htmlContent: string, language: "pl" | "en" = "pl") {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Zapisz nową wersję
  await database.insert(employeeCVHistory).values({
    employeeId,
    cvId,
    htmlContent,
    language,
  });
  
  // Pobierz wszystkie wersje dla tego pracownika
  const allVersions = await database
    .select()
    .from(employeeCVHistory)
    .where(eq(employeeCVHistory.employeeId, employeeId))
    .orderBy(desc(employeeCVHistory.generatedAt));
  
  // Jeśli jest więcej niż 5, usuń najstarsze
  if (allVersions.length > 5) {
    const toDelete = allVersions.slice(5);
    for (const version of toDelete) {
      await database
        .delete(employeeCVHistory)
        .where(eq(employeeCVHistory.id, version.id));
    }
  }
  
  return allVersions[0].id;
}

export async function getCVHistory(employeeId: number) {
  const database = await getDb();
  if (!database) return [];
  
  return await database
    .select()
    .from(employeeCVHistory)
    .where(eq(employeeCVHistory.employeeId, employeeId))
    .orderBy(desc(employeeCVHistory.generatedAt))
    .limit(5);
}

export async function getCVHistoryById(id: number) {
  const database = await getDb();
  if (!database) return null;
  
  const result = await database
    .select()
    .from(employeeCVHistory)
    .where(eq(employeeCVHistory.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function deleteCVHistory(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database
    .delete(employeeCVHistory)
    .where(eq(employeeCVHistory.id, id));
  
  return { success: true };
}

// ============ OFFICE PRESENCE HELPERS ============

export type OfficePresenceStatus = {
  hasActiveSession: boolean;
  sessionId: number | null;
  isFromOffice: boolean;
  minSessionMinutes: number;
  dayPoints: number;
  streakLengthDays: number;
  streakPoints: number;
  // For active sessions we return how many minutes already passed on server
  elapsedMinutes?: number;
  // For finished/qualified sessions today
  todayQualified?: boolean;
  todayPointsAwarded?: number;
  todayStreakPointsAwarded?: number;
};

/**
 * Returns single active office presence settings row or creates a default one.
 */
export async function getOrCreateOfficePresenceSettings(): Promise<OfficePresenceSetting> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const existing = await database.select().from(officePresenceSettings).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }

  const now = new Date();
  const result = await database.insert(officePresenceSettings).values({
    minSessionMinutes: 240,
    dayPoints: 10,
    streakLengthDays: 14,
    streakPoints: 100,
    createdAt: now,
    updatedAt: now,
  });

  const insertedId = Number(result[0].insertId);
  const created = await database
    .select()
    .from(officePresenceSettings)
    .where(eq(officePresenceSettings.id, insertedId))
    .limit(1);

  if (!created[0]) {
    throw new Error("Failed to create default office presence settings");
  }
  return created[0];
}

/**
 * Find nearest active office location within its radius based on coordinates.
 * We keep logic in TypeScript as number of offices is expected to be small.
 */
export async function findNearestOfficeLocation(
  latitude: number,
  longitude: number
): Promise<OfficeLocation | null> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const locations = await database
    .select()
    .from(officeLocations)
    .where(eq(officeLocations.isActive, true));

  if (locations.length === 0) {
    return null;
  }

  // Haversine formula helpers
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  let nearest: OfficeLocation | null = null;
  let nearestDistance = Infinity;

  for (const loc of locations) {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);

    const dLat = toRad(latitude - lat);
    const dLng = toRad(longitude - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) *
        Math.cos(toRad(latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance <= loc.radiusMeters && distance < nearestDistance) {
      nearest = loc;
      nearestDistance = distance;
    }
  }

  return nearest;
}

// ============ OFFICE LOCATIONS MANAGEMENT ============

export async function getAllOfficeLocations(): Promise<OfficeLocation[]> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  return database
    .select()
    .from(officeLocations)
    .orderBy(officeLocations.name);
}

export async function createOfficeLocation(params: {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive?: boolean;
}): Promise<OfficeLocation> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const now = new Date();
  const result = await database.insert(officeLocations).values({
    name: params.name,
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    radiusMeters: params.radiusMeters,
    isActive: params.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  } as InsertOfficeLocation);

  const insertedId = Number(result[0].insertId);
  const created = await database
    .select()
    .from(officeLocations)
    .where(eq(officeLocations.id, insertedId))
    .limit(1);

  if (!created[0]) {
    throw new Error("Failed to create office location");
  }
  return created[0];
}

export async function updateOfficeLocation(params: {
  id: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  isActive?: boolean;
}): Promise<OfficeLocation> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const now = new Date();
  const updateData: Partial<InsertOfficeLocation> = {
    updatedAt: now,
  };

  if (params.name !== undefined) updateData.name = params.name;
  if (params.latitude !== undefined) updateData.latitude = params.latitude.toString();
  if (params.longitude !== undefined) updateData.longitude = params.longitude.toString();
  if (params.radiusMeters !== undefined) updateData.radiusMeters = params.radiusMeters;
  if (params.isActive !== undefined) updateData.isActive = params.isActive;

  await database
    .update(officeLocations)
    .set(updateData)
    .where(eq(officeLocations.id, params.id));

  const updated = await database
    .select()
    .from(officeLocations)
    .where(eq(officeLocations.id, params.id))
    .limit(1);

  if (!updated[0]) {
    throw new Error("Failed to update office location");
  }
  return updated[0];
}

export async function deleteOfficeLocation(id: number): Promise<void> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database.delete(officeLocations).where(eq(officeLocations.id, id));
}

/**
 * Get current office presence status for logged-in user (e.g. for dashboard widget).
 */
export async function getOfficePresenceStatusForUser(userId: number): Promise<OfficePresenceStatus> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const settings = await getOrCreateOfficePresenceSettings();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Active session (no endTime yet)
  const activeSessions = await database
    .select()
    .from(officeSessions)
    .where(and(eq(officeSessions.userId, userId), isNull(officeSessions.endTime)));

  const activeSession = activeSessions[0] || null;

  // Qualified session today
  const todaySessions = await database
    .select()
    .from(officeSessions)
    .where(
      and(
        eq(officeSessions.userId, userId),
        gte(officeSessions.startTime, todayStart),
        lte(officeSessions.startTime, todayEnd)
      )
    );

  const todayQualifiedSession = todaySessions.find(s => s.isQualified) || null;

  let elapsedMinutes: number | undefined;
  if (activeSession) {
    const now = new Date();
    const start = activeSession.startTime instanceof Date ? activeSession.startTime : new Date(activeSession.startTime);
    elapsedMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
  }

  return {
    hasActiveSession: !!activeSession,
    sessionId: activeSession ? activeSession.id : null,
    isFromOffice: !!activeSession, // if we created it, it was from office
    minSessionMinutes: settings.minSessionMinutes,
    dayPoints: settings.dayPoints,
    streakLengthDays: settings.streakLengthDays,
    streakPoints: settings.streakPoints,
    elapsedMinutes,
    todayQualified: !!todayQualifiedSession,
    todayPointsAwarded: todayQualifiedSession?.dayPointsAwarded ?? 0,
    todayStreakPointsAwarded: todayQualifiedSession?.streakPointsAwarded ?? 0,
  };
}

/**
 * Starts office session if user is within any active office location.
 */
export async function startOfficeSessionForUser(params: {
  userId: number;
  employeeId?: number | null;
  latitude: number;
  longitude: number;
}): Promise<OfficePresenceStatus> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const settings = await getOrCreateOfficePresenceSettings();

  // First, check if user already has active session
  const existingActive = await database
    .select()
    .from(officeSessions)
    .where(and(eq(officeSessions.userId, params.userId), isNull(officeSessions.endTime)));

  if (existingActive.length > 0) {
    // Just return status instead of creating another session
    return await getOfficePresenceStatusForUser(params.userId);
  }

  const office = await findNearestOfficeLocation(params.latitude, params.longitude);
  if (!office) {
    // Not in office - no session created, but return settings for UI
    return {
      hasActiveSession: false,
      sessionId: null,
      isFromOffice: false,
      minSessionMinutes: settings.minSessionMinutes,
      dayPoints: settings.dayPoints,
      streakLengthDays: settings.streakLengthDays,
      streakPoints: settings.streakPoints,
    };
  }

  const now = new Date();
  const result = await database.insert(officeSessions).values({
    userId: params.userId,
    employeeId: params.employeeId ?? null,
    officeLocationId: office.id,
    startTime: now,
    createdAt: now,
    updatedAt: now,
  });

  const insertedId = Number(result[0].insertId);

  return {
    hasActiveSession: true,
    sessionId: insertedId,
    isFromOffice: true,
    minSessionMinutes: settings.minSessionMinutes,
    dayPoints: settings.dayPoints,
    streakLengthDays: settings.streakLengthDays,
    streakPoints: settings.streakPoints,
    elapsedMinutes: 0,
  };
}

/**
 * Ends latest active office session for user and calculates points (day + optional streak).
 */
export async function endOfficeSessionForUser(userId: number): Promise<OfficePresenceStatus> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const settings = await getOrCreateOfficePresenceSettings();

  const activeSessions = await database
    .select()
    .from(officeSessions)
    .where(and(eq(officeSessions.userId, userId), isNull(officeSessions.endTime)));

  const active = activeSessions[0];
  if (!active) {
    // Nothing to close, just return current status
    return await getOfficePresenceStatusForUser(userId);
  }

  const now = new Date();
  const start = active.startTime instanceof Date ? active.startTime : new Date(active.startTime);
  const durationMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);

  let isQualified = false;
  let dayPointsAwarded = 0;
  let streakPointsAwarded = 0;
  let streakDays = 0;

  if (durationMinutes >= settings.minSessionMinutes) {
    isQualified = true;
    dayPointsAwarded = settings.dayPoints;

    // Check streak: consecutive qualified days including today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Get qualified sessions ordered by day descending
    const qualifiedSessions = await database
      .select()
      .from(officeSessions)
      .where(and(eq(officeSessions.userId, userId), eq(officeSessions.isQualified, true)))
      .orderBy(desc(officeSessions.startTime));

    // Add today's session at the beginning (we'll treat it as qualified already)
    const allDays: Date[] = [];
    allDays.push(startOfToday);

    for (const session of qualifiedSessions) {
      const d = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      // Avoid duplicates for same calendar day
      if (!allDays.some(existing => existing.getTime() === day.getTime())) {
        allDays.push(day);
      }
    }

    // Compute current streak from today backwards
    allDays.sort((a, b) => b.getTime() - a.getTime()); // newest first

    let streak = 0;
    let cursor = new Date(startOfToday);

    for (const day of allDays) {
      const diffDays = Math.round((cursor.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        streak += 1;
        // Move cursor one day back
        cursor.setDate(cursor.getDate() - 1);
      } else if (diffDays === 1) {
        // Missing a day - break streak
        break;
      } else if (diffDays > 1) {
        break;
      }
    }

    streakDays = streak;

    if (streak >= settings.streakLengthDays) {
      streakPointsAwarded = settings.streakPoints;
    }
  }

  await database
    .update(officeSessions)
    .set({
      endTime: now,
      durationMinutes,
      isQualified,
      dayPointsAwarded,
      streakPointsAwarded,
      updatedAt: now,
    })
    .where(eq(officeSessions.id, active.id));

  // If session qualified and we know employeeId, award gamification points for office presence
  if (isQualified && (dayPointsAwarded > 0 || streakPointsAwarded > 0) && active.employeeId) {
    const totalPointsAwarded = dayPointsAwarded + streakPointsAwarded;
    const descriptionParts = [`Obecność w biurze - kwalifikowany dzień (${durationMinutes} min)`];
    if (streakPointsAwarded > 0 && streakDays > 0) {
      descriptionParts.push(`streak ${streakDays} dni`);
    }
    const description = descriptionParts.join(", ");

    try {
      await applyGamificationPointsForEmployee({
        employeeId: active.employeeId,
        points: totalPointsAwarded,
        source: "office_presence",
        description,
        date: now,
      });
    } catch (error) {
      console.error("[Gamification] Failed to award office presence points", error);
    }
  }

  return await getOfficePresenceStatusForUser(userId);
}

/**
 * Pobiera cache danych HRappka dla pracownika
 */
export async function getHRappkaEmployeeInfoCache(employeeId: number): Promise<HRappkaEmployeeInfoCache | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cache = await db
    .select()
    .from(hrappkaEmployeeInfoCache)
    .where(eq(hrappkaEmployeeInfoCache.employeeId, employeeId))
    .limit(1);

  if (cache.length === 0) {
    return null;
  }

  const cached = cache[0];
  
  // Sprawdź czy cache nie wygasł
  const now = new Date();
  const expiresAt = new Date(cached.expiresAt);
  
  if (expiresAt < now) {
    // Cache wygasł - usuń go
    await db
      .delete(hrappkaEmployeeInfoCache)
      .where(eq(hrappkaEmployeeInfoCache.employeeId, employeeId));
    return null;
  }

  return cached;
}

/**
 * Zapisuje cache danych HRappka dla pracownika
 */
export async function setHRappkaEmployeeInfoCache(
  employeeId: number,
  data: unknown,
  cacheDurationHours: number = 1
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + cacheDurationHours * 60 * 60 * 1000); // cacheDurationHours godzin

  const cacheData: InsertHRappkaEmployeeInfoCache = {
    employeeId,
    data: JSON.stringify(data),
    cachedAt: now,
    expiresAt,
  };

  // Sprawdź czy już istnieje cache dla tego pracownika
  const existing = await getHRappkaEmployeeInfoCache(employeeId);
  
  if (existing) {
    // Aktualizuj istniejący cache
    await db
      .update(hrappkaEmployeeInfoCache)
      .set({
        data: cacheData.data,
        cachedAt: now,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(hrappkaEmployeeInfoCache.employeeId, employeeId));
  } else {
    // Utwórz nowy cache
    await db.insert(hrappkaEmployeeInfoCache).values(cacheData);
  }
}

/**
 * Usuwa cache danych HRappka dla pracownika (force refresh)
 */
export async function deleteHRappkaEmployeeInfoCache(employeeId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(hrappkaEmployeeInfoCache)
    .where(eq(hrappkaEmployeeInfoCache.employeeId, employeeId));
}

/**
 * Sprawdza czy punkty za uzupełnienie godzin wczoraj już zostały przyznane
 */
export async function hasHRappkaDailyHoursPointsForDate(
  employeeId: number,
  date: Date
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const startOfDay = new Date(dateStr + "T00:00:00");
  const endOfDay = new Date(dateStr + "T23:59:59");

  const points = await db
    .select()
    .from(employeePoints)
    .where(
      and(
        eq(employeePoints.employeeId, employeeId),
        eq(employeePoints.source, "hrappka_daily_hours" as any),
        gte(employeePoints.createdAt, startOfDay),
        lte(employeePoints.createdAt, endOfDay)
      )
    )
    .limit(1);

  return points.length > 0;
}

/**
 * Przyznaje punkty za uzupełnienie godzin wczoraj w HRappka
 */
export async function awardHRappkaDailyHoursPoints(
  employeeId: number,
  date: Date,
  hours: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Sprawdź czy punkty już zostały przyznane
  const alreadyAwarded = await hasHRappkaDailyHoursPointsForDate(employeeId, date);
  if (alreadyAwarded) {
    console.log(`[Gamification] Points already awarded for HRappka daily hours on ${date.toISOString().split('T')[0]} for employee ${employeeId}`);
    return false;
  }

  // Przyznaj 15 punktów
  const points = 15;
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  try {
    await applyGamificationPointsForEmployee({
      employeeId,
      points,
      source: "hrappka_daily_hours" as GamificationSource,
      description: `Uzupełnienie godzin w HRappka za dzień ${dateStr} (${hours.toFixed(1)}h)`,
      date,
    });
    
    console.log(`[Gamification] Awarded ${points} points for HRappka daily hours on ${dateStr} for employee ${employeeId}`);
    return true;
  } catch (error) {
    console.error(`[Gamification] Failed to award HRappka daily hours points for employee ${employeeId}:`, error);
    return false;
  }
}
