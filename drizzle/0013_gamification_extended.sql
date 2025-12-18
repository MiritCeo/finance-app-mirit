-- Additional gamification tables: quests, employeeQuests, teamGoals, vacationPlans, knowledgeBasePoints

CREATE TABLE IF NOT EXISTS `quests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `description` text NULL,
  `type` enum('individual','team','company') NOT NULL DEFAULT 'individual',
  `targetType` enum('hours','knowledge_base') NOT NULL,
  `targetValue` int NOT NULL,
  `rewardPoints` int NOT NULL,
  `rewardBadgeId` int NULL,
  `startDate` date NULL,
  `endDate` date NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employeeQuests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `questId` int NOT NULL,
  `status` enum('active','completed','failed') NOT NULL DEFAULT 'active',
  `progress` int NOT NULL DEFAULT 0,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employeeQuests_employeeId_idx` (`employeeId`),
  KEY `employeeQuests_questId_idx` (`questId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `teamGoals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `description` text NULL,
  `targetHours` int NOT NULL,
  `currentHours` int NOT NULL DEFAULT 0,
  `status` enum('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
  `startDate` date NULL,
  `endDate` date NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vacationPlans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `plannedMonthsAhead` int NULL,
  `isSplit` boolean NOT NULL DEFAULT false,
  `conflictLevel` enum('low','medium','high') NOT NULL DEFAULT 'low',
  `pointsAwarded` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vacationPlans_employeeId_idx` (`employeeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `knowledgeBasePoints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `knowledgeBaseId` int NOT NULL,
  `points` int NOT NULL,
  `reason` enum('article_created','views','comments','innovation') NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `knowledgeBasePoints_employeeId_idx` (`employeeId`),
  KEY `knowledgeBasePoints_article_idx` (`knowledgeBaseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


