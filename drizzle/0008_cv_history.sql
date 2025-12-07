-- Create employeeCVHistory table
CREATE TABLE IF NOT EXISTS `employeeCVHistory` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `cvId` int NOT NULL,
  `htmlContent` text NOT NULL,
  `generatedAt` timestamp DEFAULT (now()) NOT NULL,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

