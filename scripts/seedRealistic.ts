/**
 * Seeder z rzetelnymi przykładowymi danymi dla firmy software house
 * Dane odzwierciedlają rzeczywiste stawki i koszty w polskim rynku IT (2024)
 */

import * as db from '../server/db';
import { monthlyEmployeeReports } from '../drizzle/schema';
import { calculateUOP, calculateB2B, calculateZlecenieFromNet, calculateZlecenieStudenckieFromNet } from '../server/salaryCalculator';

async function clearDatabase() {
  console.log('\n=== CZYSZCZENIE BAZY DANYCH ===\n');
  
  const existingEmployees = await db.getAllEmployees();
  console.log(`Usuwanie ${existingEmployees.length} pracowników...`);
  for (const employee of existingEmployees) {
    await db.deleteEmployee(employee.id);
  }
  
  console.log('✅ Baza danych wyczyszczona\n');
}

async function seedRealisticData() {
  console.log('=== SEEDOWANIE RZETELNYCH DANYCH ===\n');
  
  // KROK 1: Klienci
  console.log('📋 Tworzenie klientów...\n');
  
  const client1 = await db.createClient({
    name: 'TechStart Ventures',
    email: 'kontakt@techstart.pl',
    phone: '+48 22 123 4567',
    address: 'ul. Innowacyjna 15, 00-001 Warszawa',
    nip: '1234567890',
  });
  
  const client2 = await db.createClient({
    name: 'E-Commerce Solutions',
    email: 'biuro@ecommerce.pl',
    phone: '+48 12 987 6543',
    address: 'ul. Handlowa 8, 30-002 Kraków',
    nip: '9876543210',
  });
  
  const client3 = await db.createClient({
    name: 'FinTech Poland',
    email: 'info@fintech.pl',
    phone: '+48 61 555 1234',
    address: 'al. Bankowa 22, 60-003 Poznań',
    nip: '5555123456',
  });
  
  const client4 = await db.createClient({
    name: 'MedTech Systems',
    email: 'kontakt@medtech.pl',
    phone: '+48 71 444 7890',
    address: 'ul. Medyczna 10, 50-004 Wrocław',
    nip: '4447890123',
  });
  
  console.log('✅ Utworzono 4 klientów\n');
  
  // KROK 2: Projekty
  console.log('🚀 Tworzenie projektów...\n');
  
  const project1 = await db.createProject({
    name: 'Aplikacja mobilna - Startup MVP',
    clientId: client1,
    startDate: new Date('2024-01-15'),
    endDate: null,
    budget: null,
    status: 'active',
    billingType: 'time_material',
  });
  
  const project2 = await db.createProject({
    name: 'Platforma e-commerce B2B',
    clientId: client2,
    startDate: new Date('2024-03-01'),
    endDate: null,
    budget: null,
    status: 'active',
    billingType: 'time_material',
  });
  
  const project3 = await db.createProject({
    name: 'System płatności online',
    clientId: client3,
    startDate: new Date('2024-06-01'),
    endDate: null,
    budget: null,
    status: 'active',
    billingType: 'time_material',
  });
  
  const project4 = await db.createProject({
    name: 'Portal pacjenta - telemedycyna',
    clientId: client4,
    startDate: new Date('2024-09-01'),
    endDate: null,
    budget: null,
    status: 'active',
    billingType: 'time_material',
  });
  
  console.log('✅ Utworzono 4 projekty\n');
  
  // KROK 3: Pracownicy z rzetelnymi danymi
  console.log('👥 Tworzenie pracowników...\n');
  
  const employees = [
    // Senior Developers (UoP)
    {
      firstName: 'Mateusz',
      lastName: 'Kowalski',
      position: 'Senior Full-Stack Developer',
      employmentType: 'uop' as const,
      netSalary: 1200000, // 12000 PLN netto
      hourlyRateClient: 20000, // 200 PLN/h dla klienta
      projectId: project1,
    },
    {
      firstName: 'Anna',
      lastName: 'Nowak',
      position: 'Senior Frontend Developer',
      employmentType: 'uop' as const,
      netSalary: 1100000, // 11000 PLN netto
      hourlyRateClient: 18000, // 180 PLN/h
      projectId: project2,
    },
    
    // Mid Developers (B2B)
    {
      firstName: 'Piotr',
      lastName: 'Wiśniewski',
      position: 'Mid Backend Developer',
      employmentType: 'b2b' as const,
      netSalary: 1500000, // 15000 PLN netto (faktura)
      hourlyRateClient: 17000, // 170 PLN/h
      projectId: project2,
    },
    {
      firstName: 'Katarzyna',
      lastName: 'Lewandowska',
      position: 'Mid Mobile Developer',
      employmentType: 'b2b' as const,
      netSalary: 1400000, // 14000 PLN netto
      hourlyRateClient: 16000, // 160 PLN/h
      projectId: project1,
    },
    
    // Junior Developers (zlecenie)
    {
      firstName: 'Jakub',
      lastName: 'Kamiński',
      position: 'Junior Frontend Developer',
      employmentType: 'zlecenie' as const,
      netSalary: 700000, // 7000 PLN netto
      hourlyRateClient: 12000, // 120 PLN/h
      projectId: project3,
    },
    {
      firstName: 'Maria',
      lastName: 'Zielińska',
      position: 'Junior Backend Developer',
      employmentType: 'zlecenie' as const,
      netSalary: 650000, // 6500 PLN netto
      hourlyRateClient: 11000, // 110 PLN/h
      projectId: project3,
    },
    
    // Stażyści (zlecenie studenckie)
    {
      firstName: 'Tomasz',
      lastName: 'Dąbrowski',
      position: 'Stażysta - Frontend',
      employmentType: 'zlecenie_studenckie' as const,
      netSalary: 400000, // 4000 PLN netto
      hourlyRateClient: 8000, // 80 PLN/h
      projectId: project4,
    },
    {
      firstName: 'Natalia',
      lastName: 'Szymańska',
      position: 'Stażystka - QA',
      employmentType: 'zlecenie_studenckie' as const,
      netSalary: 350000, // 3500 PLN netto
      hourlyRateClient: 7000, // 70 PLN/h
      projectId: project4,
    },
    
    // Specjaliści
    {
      firstName: 'Michał',
      lastName: 'Wójcik',
      position: 'DevOps Engineer',
      employmentType: 'b2b' as const,
      netSalary: 1800000, // 18000 PLN netto
      hourlyRateClient: 22000, // 220 PLN/h
      projectId: project3,
    },
    {
      firstName: 'Aleksandra',
      lastName: 'Krawczyk',
      position: 'UX/UI Designer',
      employmentType: 'zlecenie' as const,
      netSalary: 800000, // 8000 PLN netto
      hourlyRateClient: 13000, // 130 PLN/h
      projectId: project1,
    },
    
    // Team Lead
    {
      firstName: 'Paweł',
      lastName: 'Jankowski',
      position: 'Tech Lead',
      employmentType: 'uop' as const,
      netSalary: 1500000, // 15000 PLN netto
      hourlyRateClient: 25000, // 250 PLN/h
      projectId: project2,
    },
    
    // QA
    {
      firstName: 'Ewa',
      lastName: 'Mazur',
      position: 'QA Engineer',
      employmentType: 'zlecenie' as const,
      netSalary: 600000, // 6000 PLN netto
      hourlyRateClient: 10000, // 100 PLN/h
      projectId: project2,
    },
  ];
  
  const createdEmployees: number[] = [];
  
  for (const emp of employees) {
    // Oblicz dane finansowe
    let salaryData: any = {};
    
    if (emp.employmentType === 'uop') {
      const grossEstimate = Math.round(emp.netSalary / 0.73);
      const uopResult = calculateUOP(grossEstimate);
      const hourlyRateEmp = Math.round(emp.netSalary / 168);
      const vacationCostMonthly = Math.round((hourlyRateEmp * 168) / 12);
      const vacationCostAnnual = hourlyRateEmp * 168;
      salaryData = {
        ...uopResult,
        employerCostWithVacation: uopResult.employerCost + vacationCostMonthly,
        vacationCostMonthly,
        vacationCostAnnual,
      };
    } else if (emp.employmentType === 'b2b') {
      const hourlyRateEmp = Math.round(emp.netSalary / 168);
      salaryData = calculateB2B(emp.netSalary, hourlyRateEmp);
    } else if (emp.employmentType === 'zlecenie') {
      salaryData = calculateZlecenieFromNet(emp.netSalary);
    } else if (emp.employmentType === 'zlecenie_studenckie') {
      salaryData = calculateZlecenieStudenckieFromNet(emp.netSalary);
    }
    
    const monthlySalaryGross = emp.employmentType === 'uop' 
      ? salaryData.breakdown.grossSalary 
      : emp.netSalary;
    
    const hourlyRateEmployee = Math.round(emp.netSalary / 168);
    
    // Utwórz pracownika
    const employeeId = await db.createEmployee({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@company.pl`,
      phone: null,
      position: emp.position,
      employmentType: emp.employmentType,
      monthlySalaryGross,
      monthlySalaryNet: emp.netSalary,
      monthlyCostTotal: salaryData.employerCostWithVacation || salaryData.employerCost,
      hourlyRateCost: Math.round((salaryData.employerCostWithVacation || salaryData.employerCost) / 168),
      hourlyRateEmployee,
      hourlyRateClient: emp.hourlyRateClient,
      vacationCostMonthly: salaryData.vacationCostMonthly || 0,
      vacationCostAnnual: salaryData.vacationCostAnnual || 0,
      vacationDaysTotal: emp.employmentType === 'uop' ? 26 : 0,
      vacationDaysUsed: 0,
      startDate: new Date('2024-01-01'),
      endDate: null,
      isActive: true,
    });
    
    createdEmployees.push(employeeId);
    
    // Przypisz do projektu
    await db.createAssignment({
      employeeId,
      projectId: emp.projectId,
      hourlyRateClient: emp.hourlyRateClient,
      hourlyRateCost: Math.round((salaryData.employerCostWithVacation || salaryData.employerCost) / 168),
      startDate: new Date('2024-01-01'),
      endDate: null,
    });
    
    console.log(`✓ ${emp.firstName} ${emp.lastName} (${emp.employmentType}) → ${emp.position}`);
  }
  
  console.log(`\n✅ Utworzono ${createdEmployees.length} pracowników\n`);
  
  // KROK 4: Raporty roczne z godzinami (ostatnie 3 miesiące)
  console.log('📊 Tworzenie raportów rocznych...\n');
  
  const currentYear = 2025;
  const months = [10, 11, 12]; // Październik, Listopad, Grudzień
  
  let reportCount = 0;
  
  for (const employeeId of createdEmployees) {
    const employee = await db.getEmployeeById(employeeId);
    if (!employee) continue;
    
    for (const month of months) {
      // Różne ilości godzin (120-168h)
      const hoursWorked = Math.floor(Math.random() * 48) + 120; // 120-168h
      
      // Pobierz przypisanie pracownika
      const assignments = await db.getAssignmentsByEmployee(employeeId);
      const assignment = assignments[0];
      if (!assignment) continue;
      
      // Oblicz przychód (godziny × stawka klienta)
      const revenue = hoursWorked * assignment.hourlyRateClient;
      
      // Koszt to pełny miesięczny koszt pracownika
      const cost = employee.monthlyCostTotal;
      
      // Zysk = przychód - koszt
      const profit = revenue - cost;
      
      // Wstaw raport bezpośrednio do bazy (upsertMonthlyReport nie przyjmuje tych parametrów)
      const database = await db.getDb();
      if (!database) continue;
      
      await database.insert(monthlyEmployeeReports).values({
        employeeId,
        year: currentYear,
        month,
        hoursWorked: hoursWorked * 100, // Godziny * 100 (schema wymaga)
        hourlyRateClient: assignment.hourlyRateClient,
        revenue,
        cost,
        actualCost: null,
        profit,
      });
      
      reportCount++;
    }
  }
  
  console.log(`✅ Utworzono ${reportCount} raportów miesięcznych\n`);
  
  // KROK 4.5: Wpisy godzinowe (time entries) dla raportów
  console.log('🕒 Tworzenie wpisów godzinowych...\n');
  
  let timeEntryCount = 0;
  
  for (const employeeId of createdEmployees) {
    const employee = await db.getEmployeeById(employeeId);
    if (!employee) continue;
    
    const assignments = await db.getAssignmentsByEmployee(employeeId);
    const assignment = assignments[0];
    if (!assignment) continue;
    
    for (const month of months) {
      // Pobierz raport miesięczny aby wiedzieć ile godzin pracownik przepracował
      const report = await db.getMonthlyReport(employeeId, currentYear, month);
      if (!report) continue;
      
      const totalHours = report.hoursWorked / 100; // Konwersja z formatu * 100
      
      // Rozdziel godziny na dni robocze (średnio 21 dni roboczych w miesiącu)
      const workDays = 21;
      const hoursPerDay = totalHours / workDays;
      
      // Utwórz wpisy dla każdego dnia roboczego
      for (let day = 1; day <= 30; day++) {
        // Data w miesiącu
        const date = new Date(currentYear, month - 1, day);
        
        // Sprawdź czy data jest prawidłowa dla tego miesiąca
        if (date.getMonth() !== month - 1) continue;
        
        const dayOfWeek = date.getDay();
        
        // Pomiń weekendy (0 = niedziela, 6 = sobota)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        // Losowa liczba godzin w dniu (6-9h, średnio hoursPerDay)
        const dailyHours = Math.max(6, Math.min(9, hoursPerDay + (Math.random() - 0.5) * 2));
        
        await db.createTimeEntry({
          assignmentId: assignment.id,
          workDate: date,
          hoursWorked: Math.round(dailyHours * 100), // Godziny * 100
          description: `Praca nad projektem`,
        });
        
        timeEntryCount++;
      }
    }
  }
  
  console.log(`✅ Utworzono ${timeEntryCount} wpisów godzinowych\n`);
  
  // KROK 5: Koszty stałe
  console.log('💰 Tworzenie kosztów stałych...\n');
  
  await db.createFixedCost({
    name: 'Wynajem biura',
    amount: 800000, // 8000 PLN
    category: 'rent',
    frequency: 'monthly',
    startDate: new Date('2024-01-01'),
    endDate: null,
    isActive: true,
  });
  
  await db.createFixedCost({
    name: 'Oprogramowanie i licencje',
    amount: 500000, // 5000 PLN
    category: 'software',
    frequency: 'monthly',
    startDate: new Date('2024-01-01'),
    endDate: null,
    isActive: true,
  });
  
  await db.createFixedCost({
    name: 'Marketing i reklama',
    amount: 300000, // 3000 PLN
    category: 'marketing',
    frequency: 'monthly',
    startDate: new Date('2024-01-01'),
    endDate: null,
    isActive: true,
  });
  
  await db.createFixedCost({
    name: 'Księgowość',
    amount: 150000, // 1500 PLN
    category: 'accounting',
    frequency: 'monthly',
    startDate: new Date('2024-01-01'),
    endDate: null,
    isActive: true,
  });
  
  console.log('✅ Utworzono 4 koszty stałe\n');
  
  console.log('=== PODSUMOWANIE ===\n');
  console.log(`✅ Klienci: 4`);
  console.log(`✅ Projekty: 4`);
  console.log(`✅ Pracownicy: ${createdEmployees.length}`);
  console.log(`✅ Raporty miesięczne: ${reportCount}`);
  console.log(`✅ Wpisy godzinowe: ${timeEntryCount}`);
  console.log(`✅ Koszty stałe: 4`);
  console.log(`\n💰 Suma kosztów stałych: 16 750 PLN/miesiąc`);
  console.log(`\n🎉 Seedowanie zakończone pomyślnie!`);
}

async function main() {
  try {
    await clearDatabase();
    await seedRealisticData();
  } catch (error) {
    console.error('❌ Błąd podczas seedowania:', error);
    process.exit(1);
  }
}

main();
