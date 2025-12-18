CREATE TABLE IF NOT EXISTS `hrappkaEmployeeInfoCache` (
  `id` int AUTO_INCREMENT NOT NULL,
  `employeeId` int NOT NULL UNIQUE,
  `data` text NOT NULL,
  `cachedAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `hrappkaEmployeeInfoCache_id` PRIMARY KEY(`id`),
  CONSTRAINT `hrappkaEmployeeInfoCache_employeeId_unique` UNIQUE(`employeeId`)
);

