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
  knowledgeBase, InsertKnowledgeBase, KnowledgeBase
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
    // Update
    await database.update(monthlyEmployeeReports)
      .set({ actualCost: data.actualCost, updatedAt: new Date() })
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
