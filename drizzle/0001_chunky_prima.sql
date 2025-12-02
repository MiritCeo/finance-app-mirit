CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`contactPerson` varchar(200),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employeeProjectAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`projectId` int NOT NULL,
	`hourlyRateSell` int NOT NULL,
	`hourlyRateCost` int NOT NULL,
	`assignmentStart` date,
	`assignmentEnd` date,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employeeProjectAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`position` varchar(200),
	`employmentType` enum('uop','b2b','zlecenie','zlecenie_studenckie') NOT NULL,
	`hourlyRateCost` int NOT NULL DEFAULT 0,
	`monthlySalaryGross` int NOT NULL DEFAULT 0,
	`monthlySalaryNet` int NOT NULL DEFAULT 0,
	`monthlyCostTotal` int NOT NULL DEFAULT 0,
	`vacationDaysPerYear` int NOT NULL DEFAULT 20,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixedCosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`amount` int NOT NULL,
	`frequency` enum('monthly','quarterly','yearly','one_time') NOT NULL DEFAULT 'monthly',
	`startDate` date NOT NULL,
	`endDate` date,
	`category` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixedCosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ownerSalarySimulations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scenarioName` varchar(200) NOT NULL,
	`netSalary` int NOT NULL,
	`grossCost` int NOT NULL,
	`profitPercentage` int NOT NULL,
	`remainingProfit` int NOT NULL,
	`simulationDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ownerSalarySimulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectRevenues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`amount` int NOT NULL,
	`revenueDate` date NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'invoice',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectRevenues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`billingModel` enum('time_material','fixed_price') NOT NULL,
	`budget` int NOT NULL DEFAULT 0,
	`startDate` date,
	`endDate` date,
	`status` enum('planning','active','on_hold','completed','cancelled') NOT NULL DEFAULT 'planning',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timeEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`workDate` date NOT NULL,
	`hoursWorked` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timeEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vacations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`daysCount` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vacations_id` PRIMARY KEY(`id`)
);
