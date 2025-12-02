import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ścieżka do bazy danych
const dbPath = path.join(__dirname, '..', 'data', 'sqlite.db');

console.log('Łączenie z bazą danych:', dbPath);

const db = new Database(dbPath);

console.log('\n=== CZYSZCZENIE BAZY DANYCH ===\n');

try {
  // Rozpocznij transakcję
  db.prepare('BEGIN').run();
  
  // Usuń dane z tabel (w odpowiedniej kolejności ze względu na klucze obce)
  console.log('Usuwanie time entries...');
  const timeEntriesDeleted = db.prepare('DELETE FROM timeEntries').run();
  console.log(`✓ Usunięto ${timeEntriesDeleted.changes} wpisów godzinowych`);
  
  console.log('Usuwanie monthly employee reports...');
  const reportsDeleted = db.prepare('DELETE FROM monthlyEmployeeReports').run();
  console.log(`✓ Usunięto ${reportsDeleted.changes} raportów miesięcznych`);
  
  console.log('Usuwanie employee project assignments...');
  const assignmentsDeleted = db.prepare('DELETE FROM employeeProjectAssignments').run();
  console.log(`✓ Usunięto ${assignmentsDeleted.changes} przypisań pracowników`);
  
  console.log('Usuwanie employees...');
  const employeesDeleted = db.prepare('DELETE FROM employees').run();
  console.log(`✓ Usunięto ${employeesDeleted.changes} pracowników`);
  
  console.log('Usuwanie projects...');
  const projectsDeleted = db.prepare('DELETE FROM projects').run();
  console.log(`✓ Usunięto ${projectsDeleted.changes} projektów`);
  
  console.log('Usuwanie clients...');
  const clientsDeleted = db.prepare('DELETE FROM clients').run();
  console.log(`✓ Usunięto ${clientsDeleted.changes} klientów`);
  
  // NIE usuwamy fixed costs - to są rzeczywiste koszty stałe firmy
  console.log('\n⚠️  Zachowano koszty stałe (fixedCosts)');
  
  // NIE usuwamy simulations - to są zapisane symulacje właściciela
  console.log('⚠️  Zachowano symulacje właściciela (simulations)');
  
  // Zatwierdź transakcję
  db.prepare('COMMIT').run();
  
  console.log('\n✅ Baza danych wyczyszczona pomyślnie!');
  
  // Wyświetl statystyki
  console.log('\n=== STATYSTYKI PO CZYSZCZENIU ===\n');
  const stats = {
    employees: db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number },
    projects: db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number },
    clients: db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number },
    assignments: db.prepare('SELECT COUNT(*) as count FROM employeeProjectAssignments').get() as { count: number },
    timeEntries: db.prepare('SELECT COUNT(*) as count FROM timeEntries').get() as { count: number },
    reports: db.prepare('SELECT COUNT(*) as count FROM monthlyEmployeeReports').get() as { count: number },
    fixedCosts: db.prepare('SELECT COUNT(*) as count FROM fixedCosts').get() as { count: number },
  };
  
  console.log('Pracownicy:', stats.employees.count);
  console.log('Projekty:', stats.projects.count);
  console.log('Klienci:', stats.clients.count);
  console.log('Przypisania:', stats.assignments.count);
  console.log('Wpisy godzinowe:', stats.timeEntries.count);
  console.log('Raporty miesięczne:', stats.reports.count);
  console.log('Koszty stałe:', stats.fixedCosts.count);
  
} catch (error) {
  // W razie błędu, wycofaj transakcję
  db.prepare('ROLLBACK').run();
  console.error('\n❌ Błąd podczas czyszczenia bazy danych:', error);
  process.exit(1);
} finally {
  db.close();
}
