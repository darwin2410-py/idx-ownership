import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { sql } from 'drizzle-orm';
import { db } from '../src/lib/db';

async function main() {
  console.log('Enabling pg_trgm extension...');
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  console.log('pg_trgm extension enabled');

  console.log('Creating GIN index on holders.canonical_name...');
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS holders_canonical_name_trgm_idx
    ON holders USING GIN (canonical_name gin_trgm_ops)
  `);
  console.log('GIN index created');
}

main().catch(console.error).finally(() => process.exit());
