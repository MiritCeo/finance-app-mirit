/**
 * Ensure required columns exist in the employees table.
 * Run with: node scripts/ensure-employee-columns.mjs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

const REQUIRED_COLUMNS = [
  {
    name: "isActive",
    sql: "ALTER TABLE `employees` ADD COLUMN `isActive` TINYINT(1) NOT NULL DEFAULT 1 AFTER `vacationDaysUsed`",
  },
  {
    name: "hrappkaId",
    sql: "ALTER TABLE `employees` ADD COLUMN `hrappkaId` int NULL AFTER `notes`",
  },
  {
    name: "projectHunterRateMin",
    sql: "ALTER TABLE `employees` ADD COLUMN `projectHunterRateMin` int NULL AFTER `hrappkaId`",
  },
  {
    name: "projectHunterRateMax",
    sql: "ALTER TABLE `employees` ADD COLUMN `projectHunterRateMax` int NULL AFTER `projectHunterRateMin`",
  },
];

async function ensureEmployeeColumns() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set in environment variables");
    process.exit(1);
  }

  console.log("🔌 Connecting to database...");

  try {
    const url = new URL(connectionString.replace(/^mysql:\/\//, "mysql://"));
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace(/^\//, ""),
      ssl: url.searchParams.get("ssl") ? JSON.parse(url.searchParams.get("ssl")) : undefined,
    });

    console.log("✅ Connected to database");

    const [rows] = await connection.execute(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'employees'
        AND COLUMN_NAME IN (${REQUIRED_COLUMNS.map(() => "?").join(", ")})
    `,
      REQUIRED_COLUMNS.map((column) => column.name),
    );

    const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));

    for (const column of REQUIRED_COLUMNS) {
      if (existingColumns.has(column.name)) {
        console.log(`ℹ️  Column '${column.name}' already exists`);
        continue;
      }

      console.log(`📝 Adding '${column.name}' column...`);
      await connection.execute(column.sql);
      console.log(`✅ Added '${column.name}'`);
    }

    await connection.end();
    console.log("✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
}

ensureEmployeeColumns();
