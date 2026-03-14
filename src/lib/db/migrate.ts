import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Migration runner for applying SQL migrations to the database.
 *
 * This script reads migration files from src/lib/db/migrations/ and applies them
 * to the database in order. Migrations are applied atomically - if any part fails,
 * the entire migration is rolled back.
 *
 * Usage:
 *   npm run db:migrate
 *
 * Environment variables required:
 *   DATABASE_URL - PostgreSQL connection string
 */
async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please set DATABASE_URL before running migrations');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log('🚀 Starting database migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '0001_initial.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    // Split migration into individual statements
    // Drizzle uses "--> statement-breakpoint" as a delimiter
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📜 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

      try {
        await sql(statement);
        console.log(`✅ Statement ${i + 1} completed\n`);
      } catch (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error);
        console.error('\n⚠️  Migration failed. Please check the error above and fix the issue.');
        console.error('Note: Some statements may have been applied before the failure.');
        process.exit(1);
      }
    }

    console.log('✨ Migration completed successfully!');
    console.log('\n📊 Database schema is now ready.\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
