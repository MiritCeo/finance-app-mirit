-- Add keywords column to employeeCVProjects table
ALTER TABLE employeeCVProjects ADD COLUMN keywords TEXT NULL AFTER technologies;

