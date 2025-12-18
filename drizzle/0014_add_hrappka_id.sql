-- Add hrappkaId field to employees table for HRappka integration

ALTER TABLE `employees` 
ADD COLUMN `hrappkaId` int NULL AFTER `notes`;

