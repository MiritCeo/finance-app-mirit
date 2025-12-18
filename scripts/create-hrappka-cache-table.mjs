import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Załaduj zmienne środowiskowe z .env
config({ path: join(__dirname, "..", ".env") });

// Pobierz DATABASE_URL z zmiennych środowiskowych
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL nie jest ustawiona w zmiennych środowiskowych");
  process.exit(1);
}

// Parsuj connection string
// Format: mysql://user:password@host:port/database lub mysql2://user:password@host:port/database
let user, password, host, port, database;

try {
  const url = new URL(databaseUrl.replace(/^mysql2?:\/\//, "http://"));
  user = decodeURIComponent(url.username);
  password = decodeURIComponent(url.password);
  host = url.hostname;
  port = url.port || "3306";
  database = url.pathname.replace(/^\//, "").split("?")[0]; // Usuń / z początku i parametry query
} catch (error) {
  console.error("❌ Nieprawidłowy format DATABASE_URL:", error.message);
  console.error("   Oczekiwany format: mysql://user:password@host:port/database");
  process.exit(1);
}

console.log(`📦 Tworzenie tabeli hrappkaEmployeeInfoCache w bazie ${database}...`);

try {
  // Połącz z bazą danych
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port),
    user,
    password,
    database,
    multipleStatements: true, // Pozwól na wiele zapytań
  });

  console.log("✅ Połączono z bazą danych");

  // Przeczytaj plik SQL
  const sqlFile = join(__dirname, "create-hrappka-cache-table.sql");
  const sql = readFileSync(sqlFile, "utf-8");

  // Wykonaj SQL
  console.log("🔨 Wykonywanie SQL...");
  await connection.query(sql);

  console.log("✅ Tabela hrappkaEmployeeInfoCache została utworzona pomyślnie!");

  // Sprawdź czy tabela istnieje
  const [tables] = await connection.query(
    "SHOW TABLES LIKE 'hrappkaEmployeeInfoCache'"
  );

  if (tables.length > 0) {
    console.log("✅ Tabela została zweryfikowana w bazie danych");
  }

  await connection.end();
  console.log("✅ Zakończono pomyślnie");
  process.exit(0);
} catch (error) {
  console.error("❌ Błąd podczas tworzenia tabeli:", error.message);
  if (error.code === "ER_TABLE_EXISTS_ERROR") {
    console.log("ℹ️  Tabela już istnieje - to jest OK");
    process.exit(0);
  }
  process.exit(1);
}

