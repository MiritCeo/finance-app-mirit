import { getTimeEntriesByEmployeeAndYear } from "./server/db.ts";

const employeeId = 60011; // Maciej K
const year = 2024;

console.log(`Testing getTimeEntriesByEmployeeAndYear(${employeeId}, ${year})...`);

const entries = await getTimeEntriesByEmployeeAndYear(employeeId, year);

console.log(`Found ${entries.length} entries:`);
console.log(JSON.stringify(entries, null, 2));
