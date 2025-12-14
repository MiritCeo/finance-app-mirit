import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
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
  employeeLanguages, InsertEmployeeLanguage, EmployeeLanguage
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
  return result[0].insertId;
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
