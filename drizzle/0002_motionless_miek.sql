ALTER TABLE `employees` MODIFY COLUMN `vacationDaysPerYear` int NOT NULL DEFAULT 21;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `billingModel` enum('time_material') NOT NULL DEFAULT 'time_material';--> statement-breakpoint
ALTER TABLE `employeeProjectAssignments` ADD `hourlyRateClient` int NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `vacationDaysUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeProjectAssignments` DROP COLUMN `hourlyRateSell`;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `budget`;