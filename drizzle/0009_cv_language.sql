-- Add language column to employeeCVHistory table
ALTER TABLE employeeCVHistory ADD COLUMN language ENUM('pl', 'en') NOT NULL DEFAULT 'pl' AFTER htmlContent;

