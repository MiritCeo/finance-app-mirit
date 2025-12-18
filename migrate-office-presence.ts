import "dotenv/config";
import mysql from "mysql2/promise";
import { ENV } from "./server/_core/env";

async function main() {
  const databaseUrl = ENV.databaseUrl || process.env.DATABASE_URL || "";

  if (!databaseUrl) {
    console.error("[OfficePresenceMigration] DATABASE_URL is not set. Cannot run migration.");
    process.exit(1);
  }

  console.log("[OfficePresenceMigration] Connecting to database...");

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: true,
  });

  const sql = `
CREATE TABLE IF NOT EXISTS officeLocations (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(200) NOT NULL,
  latitude decimal(10,6) NOT NULL,
  longitude decimal(10,6) NOT NULL,
  radiusMeters int NOT NULL DEFAULT 200,
  isActive boolean NOT NULL DEFAULT true,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS officePresenceSettings (
  id int NOT NULL AUTO_INCREMENT,
  minSessionMinutes int NOT NULL DEFAULT 240,
  dayPoints int NOT NULL DEFAULT 10,
  streakLengthDays int NOT NULL DEFAULT 14,
  streakPoints int NOT NULL DEFAULT 100,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS officeSessions (
  id int NOT NULL AUTO_INCREMENT,
  userId int NOT NULL,
  employeeId int NULL,
  officeLocationId int NOT NULL,
  startTime timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  endTime timestamp NULL,
  durationMinutes int NULL,
  isQualified boolean NOT NULL DEFAULT false,
  dayPointsAwarded int NOT NULL DEFAULT 0,
  streakPointsAwarded int NOT NULL DEFAULT 0,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  try {
    console.log("[OfficePresenceMigration] Running SQL for office presence tables...");
    await connection.query(sql);
    console.log("[OfficePresenceMigration] Migration completed successfully.");
  } catch (error) {
    console.error("[OfficePresenceMigration] Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
    console.log("[OfficePresenceMigration] Database connection closed.");
  }
}

main().catch((error) => {
  console.error("[OfficePresenceMigration] Unexpected error:", error);
  process.exit(1);
});


