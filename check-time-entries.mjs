import { drizzle } from 'drizzle-orm/mysql2';
import { timeEntries } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);
const entries = await db.select().from(timeEntries).limit(10);

console.log('Time entries:', JSON.stringify(entries, null, 2));
console.log(`Total entries: ${entries.length}`);

process.exit(0);
