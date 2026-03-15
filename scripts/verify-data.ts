#!/usr/bin/env tsx
import { config } from 'dotenv';
config();
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  // Check unique stocks
  const stocks = await sql`SELECT COUNT(DISTINCT emiten_id) as c FROM ownership_records`;
  console.log('Unique stocks:', stocks[0].c);

  // Check unique holders
  const holders = await sql`SELECT COUNT(DISTINCT holder_id) as c FROM ownership_records`;
  console.log('Unique holders:', holders[0].c);

  // Sample records
  const sample = await sql`SELECT * FROM ownership_records LIMIT 5`;
  console.log('\nSample records:');
  for (const r of sample) {
    console.log(`  ${r.period_id} | ${r.emiten_id} | holder=${r.holder_id} | ${r.shares_owned} shares | ${r.ownership_percentage}%`);
  }
}
main();
