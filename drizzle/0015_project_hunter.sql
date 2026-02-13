-- Add Project Hunter functionality
-- 1. Add project hunter rate fields to employees table
-- 2. Create project hunter assignments table
-- 3. Create project hunter passwords table

-- Add projectHunterRateMin and projectHunterRateMax to employees
ALTER TABLE `employees` 
ADD COLUMN `projectHunterRateMin` int NULL DEFAULT NULL AFTER `hrappkaId`,
ADD COLUMN `projectHunterRateMax` int NULL DEFAULT NULL AFTER `projectHunterRateMin`;

-- Create projectHunterAssignments table
CREATE TABLE `projectHunterAssignments` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `projectHunterId` int NOT NULL,
  `employeeId` int NOT NULL,
  `isActive` boolean DEFAULT true NOT NULL,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  KEY `projectHunterId_idx` (`projectHunterId`),
  KEY `employeeId_idx` (`employeeId`),
  UNIQUE KEY `unique_assignment` (`projectHunterId`, `employeeId`)
);

-- Create projectHunterPasswords table
CREATE TABLE `projectHunterPasswords` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `passwordHash` varchar(255) NOT NULL,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  KEY `userId_idx` (`userId`)
);

