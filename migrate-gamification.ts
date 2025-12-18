import "dotenv/config";
import mysql from "mysql2/promise";
import { ENV } from "./server/_core/env";

async function main() {
  const databaseUrl = ENV.databaseUrl || process.env.DATABASE_URL || "";

  if (!databaseUrl) {
    console.error("[GamificationMigration] DATABASE_URL is not set. Cannot run migration.");
    process.exit(1);
  }

  console.log("[GamificationMigration] Connecting to database...");

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: true,
  });

  const sql = `
CREATE TABLE IF NOT EXISTS employeeLevels (
  id int NOT NULL AUTO_INCREMENT,
  employeeId int NOT NULL,
  level int NOT NULL DEFAULT 1,
  points int NOT NULL DEFAULT 0,
  totalPoints int NOT NULL DEFAULT 0,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY employeeLevels_employeeId_idx (employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employeePoints (
  id int NOT NULL AUTO_INCREMENT,
  employeeId int NOT NULL,
  points int NOT NULL,
  source enum('hours','quest','team_goal','innovation','vacation_planning','office_presence') NOT NULL,
  description text NULL,
  month int NULL,
  year int NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY employeePoints_employeeId_idx (employeeId),
  KEY employeePoints_source_idx (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS badges (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(200) NOT NULL,
  description text NULL,
  icon varchar(100) NULL,
  category varchar(100) NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employeeBadges (
  id int NOT NULL AUTO_INCREMENT,
  employeeId int NOT NULL,
  badgeId int NOT NULL,
  earnedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY employeeBadges_employeeId_idx (employeeId),
  KEY employeeBadges_badgeId_idx (badgeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quests (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(200) NOT NULL,
  description text NULL,
  type enum('individual','team','company') NOT NULL DEFAULT 'individual',
  targetType enum('hours','knowledge_base') NOT NULL,
  targetValue int NOT NULL,
  rewardPoints int NOT NULL,
  rewardBadgeId int NULL,
  startDate date NULL,
  endDate date NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employeeQuests (
  id int NOT NULL AUTO_INCREMENT,
  employeeId int NOT NULL,
  questId int NOT NULL,
  status enum('active','completed','failed') NOT NULL DEFAULT 'active',
  progress int NOT NULL DEFAULT 0,
  completedAt timestamp NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY employeeQuests_employeeId_idx (employeeId),
  KEY employeeQuests_questId_idx (questId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teamGoals (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(200) NOT NULL,
  description text NULL,
  targetHours int NOT NULL,
  currentHours int NOT NULL DEFAULT 0,
  status enum('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
  startDate date NULL,
  endDate date NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vacationPlans (
  id int NOT NULL AUTO_INCREMENT,
  employeeId int NOT NULL,
  startDate date NOT NULL,
  endDate date NOT NULL,
  plannedMonthsAhead int NULL,
  isSplit boolean NOT NULL DEFAULT false,
  conflictLevel enum('low','medium','high') NOT NULL DEFAULT 'low',
  pointsAwarded int NOT NULL DEFAULT 0,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY vacationPlans_employeeId_idx (employeeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS knowledgeBasePoints (
  id int NOT NULL AUTO_INCREMENT,
  employeeId int NOT NULL,
  knowledgeBaseId int NOT NULL,
  points int NOT NULL,
  reason enum('article_created','views','comments','innovation') NOT NULL,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY knowledgeBasePoints_employeeId_idx (employeeId),
  KEY knowledgeBasePoints_article_idx (knowledgeBaseId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  try {
    console.log("[GamificationMigration] Running SQL for gamification tables...");
    await connection.query(sql);
    console.log("[GamificationMigration] Migration completed successfully.");
  } catch (error) {
    console.error("[GamificationMigration] Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
    console.log("[GamificationMigration] Database connection closed.");
  }
}

main().catch((error) => {
  console.error("[GamificationMigration] Unexpected error:", error);
  process.exit(1);
});


