import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('Creating entities table...');
  await sql`
    CREATE TABLE IF NOT EXISTS entities (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('entities table created');

  await sql`
    CREATE INDEX IF NOT EXISTS entities_name_idx ON entities (name)
  `;
  console.log('entities_name_idx created');

  console.log('Creating entity_holders table...');
  await sql`
    CREATE TABLE IF NOT EXISTS entity_holders (
      id SERIAL PRIMARY KEY,
      entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      holder_id INTEGER NOT NULL REFERENCES holders(id) ON DELETE RESTRICT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('entity_holders table created');

  await sql`
    ALTER TABLE entity_holders
    ADD CONSTRAINT entity_holders_unique_holder UNIQUE (holder_id)
  `;
  console.log('entity_holders_unique_holder UNIQUE constraint added');

  await sql`CREATE INDEX IF NOT EXISTS entity_holders_entity_id_idx ON entity_holders (entity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS entity_holders_holder_id_idx ON entity_holders (holder_id)`;
  console.log('entity_holders indexes created');

  // Verify
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log('Tables now:', tables.map((r: any) => r.tablename));

  const indexes = await sql`SELECT indexname FROM pg_indexes WHERE tablename IN ('entities', 'entity_holders') ORDER BY indexname`;
  console.log('New indexes:', indexes.map((r: any) => r.indexname));
}

main().catch(console.error);
