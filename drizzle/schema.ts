import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Employees table - stores all workers and contractors
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  position: varchar("position", { length: 200 }),
  employmentType: mysqlEnum("employmentType", ["uop", "b2b", "zlecenie", "zlecenie_studenckie"]).notNull(),
  hourlyRateCost: int("hourlyRateCost").default(0).notNull(), // Koszt godzinowy pracodawcy w groszach (obliczany: koszt miesięczny / 168h)
  hourlyRateEmployee: int("hourlyRateEmployee").default(0).notNull(), // Stawka godzinowa dla pracownika w groszach
  hourlyRateClient: int("hourlyRateClient").default(0).notNull(), // Stawka godzinowa dla klienta w groszach
  monthlySalaryGross: int("monthlySalaryGross").default(0).notNull(), // Wynagrodzenie brutto w groszach
  monthlySalaryNet: int("monthlySalaryNet").default(0).notNull(), // Wynagrodzenie netto w groszach
  monthlyCostTotal: int("monthlyCostTotal").default(0).notNull(), // Całkowity koszt w groszach (zawiera koszt urlopów)
  vacationCostMonthly: int("vacationCostMonthly").default(0).notNull(), // Koszt urlopów miesięcznie w groszach
  vacationCostAnnual: int("vacationCostAnnual").default(0).notNull(), // Koszt urlopów rocznie w groszach
  vacationDaysPerYear: int("vacationDaysPerYear").default(21).notNull(), // Płatne urlopy (21 dni dla wszystkich)
  vacationDaysUsed: int("vacationDaysUsed").default(0).notNull(), // Wykorzystane dni urlopu w bieżącym roku
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Clients table - stores company clients
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 200 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Projects table - stores client projects
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  billingModel: mysqlEnum("billingModel", ["time_material"]).notNull().default("time_material"), // Tylko T&M - rozliczenie miesięczne
  startDate: date("startDate"),
  endDate: date("endDate"),
  status: mysqlEnum("status", ["planning", "active", "on_hold", "completed", "cancelled"]).default("planning").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Employee project assignments - links employees to projects with rates
 */
export const employeeProjectAssignments = mysqlTable("employeeProjectAssignments", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId").notNull(),
  hourlyRateClient: int("hourlyRateClient").notNull(), // Stawka dla klienta w groszach (cena sprzedaży)
  hourlyRateCost: int("hourlyRateCost").notNull(), // Stawka kosztowa w groszach (koszt pracownika)
  assignmentStart: date("assignmentStart"),
  assignmentEnd: date("assignmentEnd"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeProjectAssignment = typeof employeeProjectAssignments.$inferSelect;
export type InsertEmployeeProjectAssignment = typeof employeeProjectAssignments.$inferInsert;

/**
 * Time entries - tracks hours worked on projects
 */
export const timeEntries = mysqlTable("timeentries", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull(),
  workDate: date("workDate").notNull(),
  hoursWorked: int("hoursWorked").notNull(), // Godziny * 100 (np. 8.5h = 850)
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

/**
 * Project revenues - tracks income from projects
 */
export const projectRevenues = mysqlTable("projectRevenues", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  amount: int("amount").notNull(), // Kwota w groszach
  revenueDate: date("revenueDate").notNull(),
  type: varchar("type", { length: 50 }).default("invoice").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectRevenue = typeof projectRevenues.$inferSelect;
export type InsertProjectRevenue = typeof projectRevenues.$inferInsert;

/**
 * Vacations - tracks employee vacation days
 */
export const vacations = mysqlTable("vacations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  daysCount: int("daysCount").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vacation = typeof vacations.$inferSelect;
export type InsertVacation = typeof vacations.$inferInsert;

/**
 * Fixed costs - recurring company expenses
 */
export const fixedCosts = mysqlTable("fixedCosts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  amount: int("amount").notNull(), // Kwota w groszach
  frequency: mysqlEnum("frequency", ["monthly", "quarterly", "yearly", "one_time"]).default("monthly").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  category: varchar("category", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FixedCost = typeof fixedCosts.$inferSelect;
export type InsertFixedCost = typeof fixedCosts.$inferInsert;

/**
 * Owner salary simulations - stores simulation scenarios
 */
export const ownerSalarySimulations = mysqlTable("ownerSalarySimulations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  scenarioName: varchar("scenarioName", { length: 200 }).notNull(),
  netSalary: int("netSalary").notNull(), // Kwota netto w groszach
  grossCost: int("grossCost").notNull(), // Koszt brutto w groszach
  profitPercentage: int("profitPercentage").notNull(), // Procent * 100 (np. 60% = 6000)
  remainingProfit: int("remainingProfit").notNull(), // Pozostały zysk w groszach
  simulationDate: timestamp("simulationDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OwnerSalarySimulation = typeof ownerSalarySimulations.$inferSelect;
export type InsertOwnerSalarySimulation = typeof ownerSalarySimulations.$inferInsert;

/**
 * Monthly employee reports - tracks monthly hours, revenue, costs and profit per employee
 */
export const monthlyEmployeeReports = mysqlTable("monthlyEmployeeReports", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  hoursWorked: int("hoursWorked").default(0).notNull(), // Godziny * 100 (np. 168h = 16800)
  hourlyRateClient: int("hourlyRateClient").default(0).notNull(), // Stawka klienta w groszach
  revenue: int("revenue").default(0).notNull(), // Przychód w groszach (hoursWorked * hourlyRateClient)
  cost: int("cost").default(0).notNull(), // Koszt domyślny pracownika w groszach (z bazy employees.monthlyCostTotal)
  actualCost: int("actualCost"), // Opcjonalny koszt rzeczywisty w groszach (ręcznie wprowadzony)
  profit: int("profit").default(0).notNull(), // Zysk w groszach (revenue - (actualCost ?? cost))
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyEmployeeReport = typeof monthlyEmployeeReports.$inferSelect;
export type InsertMonthlyEmployeeReport = typeof monthlyEmployeeReports.$inferInsert;

/**
 * Tasks table - stores company tasks and to-dos
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["planned", "in_progress", "urgent", "done"]).default("planned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Knowledge base table - stores important company information
 */
export const knowledgeBase = mysqlTable("knowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  label: varchar("label", { length: 100 }), // Kolorowa labelka (np. "Finanse", "HR", "IT")
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;
