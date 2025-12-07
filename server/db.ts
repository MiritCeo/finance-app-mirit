import { eq, and, desc, sql } from "drizzle-orm";
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
  employeeCV, InsertEmployeeCV, EmployeeCV,
  employeeSkills, InsertEmployeeSkill, EmployeeSkill,
  employeeTechnologies, InsertEmployeeTechnology, EmployeeTechnology,
  employeeCVProjects, InsertEmployeeCVProject, EmployeeCVProject,
  employeeCVHistory, InsertEmployeeCVHistory, EmployeeCVHistory,
  employeeLanguages, InsertEmployeeLanguage, EmployeeLanguage
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
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

export async function createEmployee(employee: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employees).values(employee);
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
  await db.delete(projects).where(eq(projects.id, id));
}

// ============ ASSIGNMENT HELPERS ============

export async function getAssignmentsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employeeProjectAssignments).where(eq(employeeProjectAssignments.projectId, projectId));
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

// Knowledge Base
export async function getAllKnowledgeBase() {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(knowledgeBase).orderBy(sql`${knowledgeBase.createdAt} DESC`);
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
  const result = await database.insert(knowledgeBase).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result[0].insertId;
}

export async function updateKnowledgeBase(id: number, data: Partial<InsertKnowledgeBase>) {
  const database = await getDb();
  if (!database) return;
  await database.update(knowledgeBase).set({ ...data, updatedAt: new Date() }).where(eq(knowledgeBase.id, id));
}

export async function deleteKnowledgeBase(id: number) {
  const database = await getDb();
  if (!database) return;
  await database.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
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
  
  // Pobierz umiejętności
  const skills = await database
    .select()
    .from(employeeSkills)
    .where(eq(employeeSkills.employeeId, employeeId));
  
  // Pobierz technologie
  const technologies = await database
    .select()
    .from(employeeTechnologies)
    .where(eq(employeeTechnologies.employeeId, employeeId));
  
  // Pobierz projekty CV
  const cvProjects = await database
    .select()
    .from(employeeCVProjects)
    .where(and(
      eq(employeeCVProjects.employeeId, employeeId),
      eq(employeeCVProjects.cvId, cv.id)
    ));
  
  // Pobierz języki
  const languages = await database
    .select()
    .from(employeeLanguages)
    .where(eq(employeeLanguages.employeeId, employeeId));
  
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
      project: projects,
    })
    .from(employeeCVProjects)
    .innerJoin(projects, eq(employeeCVProjects.projectId, projects.id))
    .where(eq(employeeCVProjects.cvId, cvId));
}

export async function saveCVHistory(employeeId: number, cvId: number, htmlContent: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  // Zapisz nową wersję
  await database.insert(employeeCVHistory).values({
    employeeId,
    cvId,
    htmlContent,
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
