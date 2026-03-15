import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  // Test pg_trgm
  const trgmResult = await sql`SELECT similarity('test', 'test') as sim`;
  console.log('pg_trgm OK: similarity("test","test") =', trgmResult[0].sim);

  // Check GIN index
  const ginIdx = await sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'holders' AND indexname = 'holders_canonical_name_trgm_idx'
  `;
  console.log('GIN index exists:', ginIdx.length > 0 ? 'YES' : 'NO');

  // Check entity_holders UNIQUE constraint
  const uniqueConstraint = await sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'entity_holders' AND indexname = 'entity_holders_unique_holder'
  `;
  console.log('UNIQUE(holder_id) constraint:', uniqueConstraint.length > 0 ? 'YES' : 'NO');

  // Check entities table
  const entitiesCheck = await sql`SELECT * FROM entities LIMIT 1`;
  console.log('entities table accessible: YES (rows:', entitiesCheck.length, ')');

  // Check entity_holders table
  const ehCheck = await sql`SELECT * FROM entity_holders LIMIT 1`;
  console.log('entity_holders table accessible: YES (rows:', ehCheck.length, ')');
}

main().catch(console.error);
