import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Create database connection
// Note: DATABASE_URL must be set in environment variables
function createDbConnection() {
  const sql = neon(process.env.DATABASE_URL || '');
  return drizzle(sql, { schema });
}

// Export database client and schema
export const db = createDbConnection();
export { schema };
