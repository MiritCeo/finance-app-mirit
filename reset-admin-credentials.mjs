import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users, employees } from "./drizzle/schema.ts";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@mirit.pl";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || "Administrator";
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || "Systemu";

async function resetAdminCredentials() {
  console.log("🔧 Resetowanie danych logowania administratora...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Błąd: DATABASE_URL nie jest ustawione w zmiennych środowiskowych");
    process.exit(1);
  }

  try {
    // Połącz z bazą danych
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    console.log("📋 Sprawdzanie istniejącego administratora...");
    console.log(`   Email: ${ADMIN_EMAIL}`);

    // Sprawdź czy administrator istnieje
    const existingAdmin = await db
      .select()
      .from(employees)
      .where(eq(employees.email, ADMIN_EMAIL))
      .limit(1);

    let adminEmployeeId;

    if (existingAdmin.length === 0) {
      console.log("⚠️  Administrator nie istnieje - tworzę nowego...");
      
      // Wygeneruj hash hasła
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      // Utwórz nowego administratora
      const result = await db.insert(employees).values({
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        email: ADMIN_EMAIL,
        passwordHash: passwordHash,
        employmentType: "uop",
        isActive: true,
        hourlyRateCost: 0,
        hourlyRateEmployee: 0,
        hourlyRateClient: 0,
        monthlySalaryGross: 0,
        monthlySalaryNet: 0,
        monthlyCostTotal: 0,
        vacationCostMonthly: 0,
        vacationCostAnnual: 0,
        vacationDaysPerYear: 21,
        vacationDaysUsed: 0,
      });

      adminEmployeeId = Number(result[0].insertId);
      console.log(`✅ Utworzono administratora z ID: ${adminEmployeeId}`);
    } else {
      adminEmployeeId = existingAdmin[0].id;
      console.log(`✅ Znaleziono administratora z ID: ${adminEmployeeId}`);
      
      // Resetuj hasło
      console.log("🔑 Resetowanie hasła...");
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      await db
        .update(employees)
        .set({
          passwordHash: passwordHash,
          isActive: true,
          firstName: ADMIN_FIRST_NAME,
          lastName: ADMIN_LAST_NAME,
        })
        .where(eq(employees.id, adminEmployeeId));
      
      console.log("✅ Hasło zostało zresetowane");
    }

    // Utwórz lub zaktualizuj użytkownika z rolą admin
    const openId = `admin_${adminEmployeeId}`;
    console.log(`\n👤 Tworzenie/aktualizacja użytkownika w tabeli users...`);
    console.log(`   OpenID: ${openId}`);

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        openId: openId,
        name: `${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`,
        email: ADMIN_EMAIL,
        loginMethod: "admin",
        role: "admin",
        employeeId: adminEmployeeId,
        lastSignedIn: new Date(),
      });
      console.log("✅ Utworzono użytkownika z rolą 'admin'");
    } else {
      await db
        .update(users)
        .set({
          name: `${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`,
          email: ADMIN_EMAIL,
          loginMethod: "admin",
          role: "admin",
          employeeId: adminEmployeeId,
          lastSignedIn: new Date(),
        })
        .where(eq(users.openId, openId));
      console.log("✅ Zaktualizowano użytkownika z rolą 'admin'");
    }

    // Weryfikacja
    const finalUser = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);

    const finalEmployee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, adminEmployeeId))
      .limit(1);

    console.log("\n" + "=".repeat(50));
    console.log("✅ RESET ZAKOŃCZONY POMYŚLNIE!");
    console.log("=".repeat(50));
    console.log("\n📧 DANE LOGOWANIA:");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Hasło: ${ADMIN_PASSWORD}`);
    console.log("\n⚠️  WAŻNE: Zmień hasło po pierwszym logowaniu!");
    console.log("\n📋 SZCZEGÓŁY KONTA:");
    console.log(`   Employee ID: ${adminEmployeeId}`);
    console.log(`   OpenID: ${openId}`);
    console.log(`   Rola: ${finalUser[0]?.role || "N/A"}`);
    console.log(`   Aktywny: ${finalEmployee[0]?.isActive ? "Tak" : "Nie"}`);
    console.log("=".repeat(50) + "\n");

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Błąd podczas resetowania:", error);
    process.exit(1);
  }
}

resetAdminCredentials();

