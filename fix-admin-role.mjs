import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users, employees } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function fixAdminRole() {
  console.log("🔧 Sprawdzanie i naprawa roli administratora...\n");

  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@mirit.pl";
    
    // Znajdź administratora w employees
    const adminEmployee = await db.select().from(employees).where(eq(employees.email, adminEmail)).limit(1);
    
    if (adminEmployee.length === 0) {
      console.error("❌ Nie znaleziono administratora w employees!");
      process.exit(1);
    }
    
    const adminEmployeeId = adminEmployee[0].id;
    const openId = `admin_${adminEmployeeId}`;
    
    console.log(`📋 Znaleziono administratora:`);
    console.log(`   Employee ID: ${adminEmployeeId}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   OpenID: ${openId}\n`);
    
    // Sprawdź użytkownika w users
    const existingUser = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    
    if (existingUser.length === 0) {
      console.log("⚠️  Użytkownik nie istnieje w users - tworzę...");
      await db.insert(users).values({
        openId: openId,
        name: "Administrator Systemu",
        email: adminEmail,
        loginMethod: "admin",
        role: "admin",
        employeeId: adminEmployeeId,
        lastSignedIn: new Date(),
      });
      console.log("✅ Utworzono użytkownika z rolą admin");
    } else {
      const user = existingUser[0];
      console.log(`📋 Znaleziono użytkownika:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   OpenID: ${user.openId}`);
      console.log(`   Rola: ${user.role}`);
      console.log(`   Employee ID: ${user.employeeId}`);
      console.log(`   Email: ${user.email}\n`);
      
      if (user.role !== "admin") {
        console.log(`⚠️  Użytkownik ma rolę '${user.role}' zamiast 'admin' - aktualizuję...`);
        await db.update(users).set({
          role: "admin",
          loginMethod: "admin",
          employeeId: adminEmployeeId,
          email: adminEmail,
          name: "Administrator Systemu"
        }).where(eq(users.openId, openId));
        console.log("✅ Zaktualizowano rolę na 'admin'");
      } else {
        console.log("✅ Użytkownik ma poprawną rolę 'admin'");
      }
    }
    
    // Sprawdź ponownie po aktualizacji
    const updatedUser = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (updatedUser.length > 0) {
      console.log(`\n✅ Finalna weryfikacja:`);
      console.log(`   OpenID: ${updatedUser[0].openId}`);
      console.log(`   Rola: ${updatedUser[0].role}`);
      console.log(`   Employee ID: ${updatedUser[0].employeeId}`);
    }
    
    console.log("\n🎉 Naprawa zakończona!");
  } catch (error) {
    console.error("❌ Błąd podczas naprawy:", error);
    process.exit(1);
  }
}

fixAdminRole()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Niepowodzenie:", error);
    process.exit(1);
  });

