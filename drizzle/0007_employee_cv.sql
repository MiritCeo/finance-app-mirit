-- Create employeeCV table
CREATE TABLE IF NOT EXISTS `employeeCV` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `yearsOfExperience` int DEFAULT 0 NOT NULL,
  `summary` text,
  `version` int DEFAULT 1 NOT NULL,
  `isActive` boolean DEFAULT true NOT NULL,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create employeeSkills table
CREATE TABLE IF NOT EXISTS `employeeSkills` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `cvId` int,
  `skillName` varchar(200) NOT NULL,
  `skillType` enum('soft') DEFAULT 'soft' NOT NULL,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create employeeTechnologies table
CREATE TABLE IF NOT EXISTS `employeeTechnologies` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `cvId` int,
  `technologyName` varchar(200) NOT NULL,
  `category` varchar(100),
  `proficiency` enum('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate' NOT NULL,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create employeeCVProjects table
CREATE TABLE IF NOT EXISTS `employeeCVProjects` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `cvId` int NOT NULL,
  `projectId` int NOT NULL,
  `projectDescription` text,
  `role` varchar(200),
  `startDate` date,
  `endDate` date,
  `technologies` text,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

