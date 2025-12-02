import { drizzle } from "drizzle-orm/mysql2";
import { employees, clients, projects, fixedCosts, employeeProjectAssignments, timeEntries } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("🌱 Rozpoczynam seedowanie bazy danych...");

  try {
    // Dodaj przykładowych pracowników
    console.log("Dodawanie pracowników...");
    await db.insert(employees).values([
      {
        firstName: "Jan",
        lastName: "Kowalski",
        position: "Senior Developer",
        employmentType: "uop",
        hourlyRateCost: 0,
        monthlySalaryGross: 1200000, // 12000 PLN
        monthlySalaryNet: 876000, // 8760 PLN
        monthlyCostTotal: 1445760, // 14457.60 PLN
        vacationDaysPerYear: 26,
        isActive: true,
      },
      {
        firstName: "Anna",
        lastName: "Nowak",
        position: "Frontend Developer",
        employmentType: "b2b",
        hourlyRateCost: 0,
        monthlySalaryGross: 1500000, // 15000 PLN (faktura)
        monthlySalaryNet: 1140000, // 11400 PLN netto
        monthlyCostTotal: 1500000,
        vacationDaysPerYear: 0,
        isActive: true,
      },
      {
        firstName: "Piotr",
        lastName: "Wiśniewski",
        position: "Backend Developer",
        employmentType: "uop",
        hourlyRateCost: 0,
        monthlySalaryGross: 1000000, // 10000 PLN
        monthlySalaryNet: 730000, // 7300 PLN
        monthlyCostTotal: 1204800,
        vacationDaysPerYear: 20,
        isActive: true,
      },
      {
        firstName: "Maria",
        lastName: "Lewandowska",
        position: "UX Designer",
        employmentType: "zlecenie",
        hourlyRateCost: 0,
        monthlySalaryGross: 800000, // 8000 PLN
        monthlySalaryNet: 640000, // 6400 PLN
        monthlyCostTotal: 800000,
        vacationDaysPerYear: 0,
        isActive: true,
      },
    ]);

    // Dodaj przykładowych klientów
    console.log("Dodawanie klientów...");
    await db.insert(clients).values([
      {
        name: "TechCorp Sp. z o.o.",
        contactPerson: "Marek Zieliński",
        email: "marek.zielinski@techcorp.pl",
        phone: "+48 123 456 789",
        address: "ul. Technologiczna 10, 00-001 Warszawa",
        isActive: true,
      },
      {
        name: "Digital Solutions",
        contactPerson: "Katarzyna Dąbrowska",
        email: "k.dabrowska@digitalsolutions.pl",
        phone: "+48 987 654 321",
        address: "al. Cyfrowa 25, 30-002 Kraków",
        isActive: true,
      },
      {
        name: "StartupHub",
        contactPerson: "Tomasz Kamiński",
        email: "tomasz@startuphub.pl",
        phone: "+48 555 123 456",
        address: "ul. Innowacyjna 5, 50-003 Wrocław",
        isActive: true,
      },
    ]);

    // Pobierz ID klientów
    const clientsList = await db.select().from(clients);
    
    // Dodaj przykładowe projekty
    console.log("Dodawanie projektów...");
    await db.insert(projects).values([
      {
        clientId: clientsList[0].id,
        name: "Platforma e-commerce",
        billingModel: "time_material",
        startDate: new Date("2024-01-15"),
        status: "active",
        description: "Budowa platformy sprzedażowej online - rozliczenie miesięczne",
      },
      {
        clientId: clientsList[1].id,
        name: "Aplikacja mobilna",
        billingModel: "time_material",
        startDate: new Date("2024-02-01"),
        status: "active",
        description: "Aplikacja mobilna iOS/Android - rozliczenie miesięczne",
      },
      {
        clientId: clientsList[2].id,
        name: "System CRM",
        billingModel: "time_material",
        startDate: new Date("2024-03-01"),
        status: "planning",
        description: "Dedykowany system CRM dla startupu - rozliczenie miesięczne",
      },
    ]);

    // Dodaj koszty stałe
    console.log("Dodawanie kosztów stałych...");
    await db.insert(fixedCosts).values([
      {
        name: "Wynagrodzenie Maciej Kaźmierski",
        amount: 1100000, // 11000 PLN netto
        frequency: "monthly",
        startDate: new Date("2024-01-01"),
        category: "Zarząd",
        isActive: true,
      },
      {
        name: "Wynagrodzenie Maciej Jabczyński",
        amount: 1100000, // 11000 PLN netto
        frequency: "monthly",
        startDate: new Date("2024-01-01"),
        category: "Zarząd",
        isActive: true,
      },
      {
        name: "Czynsz biura",
        amount: 500000, // 5000 PLN
        frequency: "monthly",
        startDate: new Date("2024-01-01"),
        category: "Biuro",
        isActive: true,
      },
      {
        name: "Księgowość",
        amount: 150000, // 1500 PLN
        frequency: "monthly",
        startDate: new Date("2024-01-01"),
        category: "Usługi",
        isActive: true,
      },
      {
        name: "Oprogramowanie i subskrypcje",
        amount: 200000, // 2000 PLN
        frequency: "monthly",
        startDate: new Date("2024-01-01"),
        category: "IT",
        isActive: true,
      },
    ]);

    // Dodaj przypisania pracowników do projektów
    console.log("Dodawanie przypisań pracowników do projektów...");
    const assignments = await db.insert(employeeProjectAssignments).values([
      {
        employeeId: 1, // Jan Kowalski
        projectId: 1, // Projekt A
        hourlyRateClient: 20000, // 200 PLN/h
        hourlyRateCost: 8600, // ~86 PLN/h
        startDate: new Date("2024-09-01"),
        isActive: true,
      },
      {
        employeeId: 2, // Anna Nowak
        projectId: 2, // Projekt B
        hourlyRateClient: 25000, // 250 PLN/h
        hourlyRateCost: 8900, // ~89 PLN/h
        startDate: new Date("2024-09-01"),
        isActive: true,
      },
      {
        employeeId: 3, // Piotr Wiśniewski
        projectId: 3, // Projekt C
        hourlyRateClient: 18000, // 180 PLN/h
        hourlyRateCost: 7200, // ~72 PLN/h
        startDate: new Date("2024-09-01"),
        isActive: true,
      },
      {
        employeeId: 4, // Maria Zielińska
        projectId: 1, // Projekt A
        hourlyRateClient: 15000, // 150 PLN/h
        hourlyRateCost: 5000, // ~50 PLN/h
        startDate: new Date("2024-09-01"),
        isActive: true,
      },
    ]).$returningId();

    // Dodaj przykładowe miesięczne raporty godzin (ostatnie 3 miesiące)
    console.log("Dodawanie przykładowych raportów godzin...");
    const currentDate = new Date();
    const months = [
      { month: 10, year: 2024, day: 31 }, // Październik
      { month: 11, year: 2024, day: 30 }, // Listopad
      { month: 12, year: 2024, day: 31 }, // Grudzień
    ];

    for (const { month, year, day } of months) {
      await db.insert(timeEntries).values([
        {
          assignmentId: assignments[0].id,
          workDate: new Date(year, month - 1, day),
          hoursWorked: 16800, // 168h
          description: `Raport miesięczny za ${month}/${year}`,
        },
        {
          assignmentId: assignments[1].id,
          workDate: new Date(year, month - 1, day),
          hoursWorked: 15000, // 150h
          description: `Raport miesięczny za ${month}/${year}`,
        },
        {
          assignmentId: assignments[2].id,
          workDate: new Date(year, month - 1, day),
          hoursWorked: 16000, // 160h
          description: `Raport miesięczny za ${month}/${year}`,
        },
        {
          assignmentId: assignments[3].id,
          workDate: new Date(year, month - 1, day),
          hoursWorked: 14000, // 140h
          description: `Raport miesięczny za ${month}/${year}`,
        },
      ]);
    }

    console.log("✅ Seedowanie zakończone pomyślnie!");
    console.log("\n📊 Dodano:");
    console.log("- 4 pracowników");
    console.log("- 3 klientów");
    console.log("- 3 projekty");
    console.log("- 4 przypisań pracowników");
    console.log("- 12 raportów godzin (3 miesiące)");
    console.log("- 5 kosztów stałych");
    
  } catch (error) {
    console.error("❌ Błąd podczas seedowania:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("\n🎉 Baza danych gotowa do użycia!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Niepowodzenie:", error);
    process.exit(1);
  });
