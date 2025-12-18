/**
 * Script to add 'hrappka_daily_hours' to employeePoints.source enum
 * Run with: node scripts/add-hrappka-daily-hours-source.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: resolve(__dirname, "../.env") });

async function addHRappkaDailyHoursSource() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set in environment variables");
    process.exit(1);
  }

  console.log("🔌 Connecting to database...");
  
  try {
    // Parse connection string
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

    // Check current enum values
    const [enumInfo] = await connection.execute(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'employeePoints' 
      AND COLUMN_NAME = 'source'
    `);

    if (enumInfo.length > 0) {
      const currentEnum = enumInfo[0].COLUMN_TYPE;
      console.log(`📋 Current enum values: ${currentEnum}`);
      
      if (currentEnum.includes("hrappka_daily_hours")) {
        console.log("ℹ️  'hrappka_daily_hours' already exists in enum");
        await connection.end();
        return;
      }
    }

    // Modify enum to add new value
    console.log("🔨 Adding 'hrappka_daily_hours' to enum...");
    await connection.execute(`
      ALTER TABLE \`employeePoints\` 
      MODIFY COLUMN \`source\` ENUM(
        'hours',
        'quest',
        'team_goal',
        'innovation',
        'vacation_planning',
        'office_presence',
        'hrappka_daily_hours'
      ) NOT NULL
    `);

    console.log("✅ Successfully added 'hrappka_daily_hours' to enum");
    
    await connection.end();
    console.log("✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
}

addHRappkaDailyHoursSource();

