import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ścieżka do pliku Excel
const excelPath = join(__dirname, '..', 'Mirit-kalkulacje.xlsx');

console.log('Odczytywanie pliku Excel:', excelPath);

// Odczytaj plik Excel
const workbook = XLSX.readFile(excelPath);

console.log('\n=== STRUKTURA PLIKU EXCEL ===\n');
console.log('Arkusze:', workbook.SheetNames);

// Przeanalizuj każdy arkusz
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n\n=== ARKUSZ: ${sheetName} ===\n`);
  
  const worksheet = workbook.Sheets[sheetName];
  
  // Konwertuj arkusz na JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Wyświetl pierwsze 20 wierszy
  console.log('Pierwsze 20 wierszy:');
  data.slice(0, 20).forEach((row, idx) => {
    console.log(`Wiersz ${idx + 1}:`, row);
  });
  
  // Wyświetl statystyki
  console.log(`\nLiczba wierszy: ${data.length}`);
  if (data.length > 0) {
    console.log(`Liczba kolumn: ${data[0].length}`);
  }
});

// Spróbuj wyodrębnić dane pracowników
console.log('\n\n=== PRÓBA WYODRĘBNIENIA DANYCH ===\n');

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  if (data.length > 0) {
    console.log(`\nArkusz "${sheetName}" - dane w formacie obiektów:`);
    console.log('Pierwsze 5 rekordów:');
    data.slice(0, 5).forEach((record, idx) => {
      console.log(`\nRekord ${idx + 1}:`, JSON.stringify(record, null, 2));
    });
  }
});
