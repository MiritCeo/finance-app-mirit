import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from '../server/db';
import { calculateUOP, calculateB2B, calculateZlecenie, calculateZlecenieStudenckie, calculateZlecenieFromNet, calculateZlecenieStudenckieFromNet } from '../server/salaryCalculator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ścieżka do pliku Excel
const excelPath = path.join(__dirname, '..', 'Mirit-kalkulacje.xlsx');

console.log('=== IMPORT REALNYCH DANYCH Z EXCEL ===\n');
console.log('Odczytywanie pliku:', excelPath);

// Odczytaj plik Excel
const workbook = XLSX.readFile(excelPath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`\nZnaleziono ${data.length} pracowników w pliku Excel\n`);

// Mapowanie typów umów z Excela na typy w aplikacji
const employmentTypeMap: Record<string, 'uop' | 'b2b' | 'zlecenie' | 'zlecenie_studenckie'> = {
  'uop': 'uop',
  'b2b': 'b2b',
  'zlecenie': 'zlecenie',
  'zlecenie studenckie': 'zlecenie_studenckie',
};

interface ExcelRow {
  'Pracownik': string;
  'Koszt firmy': number;
  ' Koszt firmy z urlopem': number;
  'Wypłata netto': number;
  'Stawka': number;
  'Liczba godzin': number;
  'Stawka * Liczba godzin': number;
  'Dni urlopu': number;
  ' Roczny koszt  urlopu': number;
  ' Koszt miesięcznego urlopu': number;
  ' Czysty zarobek': number;
  'Forma wypłaty': string;
  'Spółka opłacająca': string;
}

async function main() {
  console.log('=== KROK 1: CZYSZCZENIE BAZY DANYCH ===\n');
  
  // Pobierz wszystkich pracowników
  const existingEmployees = await db.getAllEmployees();
  console.log(`Znaleziono ${existingEmployees.length} pracowników w bazie danych`);
  
  // Usuń wszystkich pracowników (kaskadowo usunie przypisania i wpisy)
  for (const employee of existingEmployees) {
    await db.deleteEmployee(employee.id);
    console.log(`✓ Usunięto: ${employee.firstName} ${employee.lastName}`);
  }
  
  // Projekty i klienci zostaną usunięci kaskadowo przez bazę danych
  console.log('✓ Projekty i klienci zostaną usunięci automatycznie');
  
  console.log('\n✅ Baza danych wyczyszczona (pracownicy usunięci)\n');
  
  console.log('=== KROK 2: IMPORT KLIENTÓW/PROJEKTÓW ===\n');
  
  // Zbierz unikalne spółki (klientów/projektów)
  const uniqueCompanies = new Set<string>();
  data.forEach((row: any) => {
    const company = row['Spółka opłacająca'];
    if (company && company !== 'nic') {
      uniqueCompanies.add(company);
    }
  });
  
  // Utwórz mapę klientów
  const clientMap = new Map<string, number>();
  
  for (const companyName of uniqueCompanies) {
    // Utwórz klienta
    const clientId = await db.createClient({
      name: companyName,
      email: `kontakt@${companyName.toLowerCase().replace(/\s+/g, '')}.pl`,
      phone: null,
      address: null,
      nip: null,
    });
    
    // Utwórz projekt dla tego klienta
    const projectId = await db.createProject({
      name: `Projekt ${companyName}`,
      clientId,
      startDate: new Date('2024-01-01'),
      endDate: null,
      budget: null,
      status: 'active',
      billingType: 'time_material',
    });
    
    clientMap.set(companyName, projectId);
    console.log(`✓ Utworzono klienta i projekt: ${companyName}`);
  }
  
  console.log(`\n✅ Utworzono ${clientMap.size} klientów i projektów\n`);
  
  console.log('=== KROK 3: IMPORT PRACOWNIKÓW ===\n');
  
  let importedCount = 0;
  let skippedCount = 0;
  
  for (const row of data as ExcelRow[]) {
    try {
      const fullName = row['Pracownik'];
      
      // Walidacja - pomiń wiersze bez nazwy pracownika lub z nieprawidłowymi danymi
      if (!fullName || typeof fullName !== 'string') {
        console.log(`⚠️  Pominięto wiersz bez nazwy pracownika`);
        skippedCount++;
        continue;
      }
      
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const netSalary = Math.round(row['Wypłata netto'] * 100); // Konwersja na grosze
      const hourlyRateClient = Math.round(row['Stawka'] * 100); // Stawka klienta w groszach
      
      // Walidacja - pomiń wiersze z nieprawidłowymi danymi finansowymi
      if (isNaN(netSalary) || netSalary <= 0 || isNaN(hourlyRateClient) || hourlyRateClient <= 0) {
        console.log(`⚠️  Pominięto ${fullName} - nieprawidłowe dane finansowe`);
        skippedCount++;
        continue;
      }
      
      const employmentTypeRaw = row['Forma wypłaty']?.toLowerCase() || 'zlecenie';
      const employmentType = employmentTypeMap[employmentTypeRaw] || 'zlecenie';
      const companyName = row['Spółka opłacająca'];
      
      // Oblicz dane finansowe używając kalkulatora
      let salaryData: any = {};
      
      if (employmentType === 'uop') {
        // Dla UoP musimy obliczyć brutto z netto
        const grossEstimate = Math.round(netSalary / 0.73);
        const uopResult = calculateUOP(grossEstimate);
        const hourlyRateEmp = Math.round(netSalary / 168);
        const vacationCostMonthly = Math.round((hourlyRateEmp * 168) / 12);
        const vacationCostAnnual = hourlyRateEmp * 168;
        salaryData = {
          ...uopResult,
          employerCostWithVacation: uopResult.employerCost + vacationCostMonthly,
          vacationCostMonthly,
          vacationCostAnnual,
        };
      } else if (employmentType === 'b2b') {
        const hourlyRateEmp = Math.round(netSalary / 168);
        salaryData = calculateB2B(netSalary, hourlyRateEmp);
      } else if (employmentType === 'zlecenie') {
        salaryData = calculateZlecenieFromNet(netSalary);
      } else if (employmentType === 'zlecenie_studenckie') {
        salaryData = calculateZlecenieStudenckieFromNet(netSalary);
      }
      
      // Dla UoP używamy brutto jako wynagrodzenie
      const monthlySalaryGross = employmentType === 'uop' 
        ? salaryData.breakdown.grossSalary 
        : netSalary;
      
      // Stawka godzinowa pracownika = netto / 168h
      const hourlyRateEmployee = Math.round(netSalary / 168);
      
      // Utwórz pracownika
      const employeeId = await db.createEmployee({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mirit.pl`,
        phone: null,
        position: 'Developer',
        employmentType,
        monthlySalaryGross,
        monthlySalaryNet: netSalary,
        monthlyCostTotal: salaryData.employerCostWithVacation,
        hourlyRateCost: Math.round(salaryData.employerCostWithVacation / 168),
        hourlyRateEmployee,
        hourlyRateClient,
        vacationCostMonthly: salaryData.vacationCostMonthly,
        vacationCostAnnual: salaryData.vacationCostAnnual,
        vacationDaysTotal: 26,
        vacationDaysUsed: 0,
        startDate: new Date('2024-01-01'),
        endDate: null,
        isActive: true,
      });
      
      // Przypisz do projektu jeśli istnieje
      if (companyName && companyName !== 'nic' && clientMap.has(companyName)) {
        const projectId = clientMap.get(companyName)!;
        await db.createAssignment({
          employeeId,
          projectId,
          hourlyRateClient,
          startDate: new Date('2024-01-01'),
          endDate: null,
        });
        console.log(`✓ ${firstName} ${lastName} (${employmentType}) → ${companyName}`);
      } else {
        console.log(`✓ ${firstName} ${lastName} (${employmentType}) → bez projektu`);
      }
      
      importedCount++;
    } catch (error) {
      console.error(`✗ Błąd importu: ${row['Pracownik']}`, error);
      skippedCount++;
    }
  }
  
  console.log(`\n✅ Import zakończony:`);
  console.log(`   - Zaimportowano: ${importedCount} pracowników`);
  console.log(`   - Pominięto: ${skippedCount} pracowników`);
  
  console.log('\n=== PODSUMOWANIE ===\n');
  const finalEmployees = await db.getAllEmployees();
  const finalProjects = await db.getAllProjects();
  const finalClients = await db.getAllClients();
  
  console.log(`Pracownicy: ${finalEmployees.length}`);
  console.log(`Projekty: ${finalProjects.length}`);
  console.log(`Klienci: ${finalClients.length}`);
  
  console.log('\n✅ Import realnych danych zakończony pomyślnie!');
}

main().catch(console.error);
