/**
 * Script to add hrappkaId field to employees table
 * Run with: node scripts/add-hrappka-id-field.mjs
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

async function addHRappkaIdField() {
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

    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'employees' 
      AND COLUMN_NAME = 'hrappkaId'
    `);

    if (columns.length > 0) {
      console.log("ℹ️  Column 'hrappkaId' already exists in 'employees' table");
      await connection.end();
      return;
    }

    // Add column
    console.log("📝 Adding 'hrappkaId' column to 'employees' table...");
    await connection.execute(`
      ALTER TABLE \`employees\` 
      ADD COLUMN \`hrappkaId\` int NULL AFTER \`notes\`
    `);

    console.log("✅ Successfully added 'hrappkaId' column to 'employees' table");
    
    await connection.end();
    console.log("✅ Migration completed successfully");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
}

addHRappkaIdField();

