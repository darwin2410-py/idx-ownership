import { config } from 'dotenv';
config();
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('Clearing all data...');
  await sql`DELETE FROM ownership_records`;
  await sql`DELETE FROM holders`;
  await sql`DELETE FROM emiten`;
  await sql`DELETE FROM periods`;
  console.log('Done! All tables cleared.');
}
main().catch(err => { console.error(err); process.exit(1); });
