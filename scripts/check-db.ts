#!/usr/bin/env tsx
import { config } from 'dotenv';
config();

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function main() {
  console.log('Checking database...');

  const periods = await sql`SELECT COUNT(*) as count FROM periods`;
  console.log('Periods:', periods[0].count);

  const emiten = await sql`SELECT COUNT(*) as count FROM emiten`;
  console.log('Emiten:', emiten[0].count);

  const holders = await sql`SELECT COUNT(*) as count FROM holders`;
  console.log('Holders:', holders[0].count);

  const records = await sql`SELECT COUNT(*) as count FROM ownership_records`;
  console.log('Ownership Records:', records[0].count);

  if (parseInt(records[0].count) === 0) {
    console.log('\n⚠ Ownership records table is EMPTY!');
    console.log('Need to delete period 2026-03 and re-import with --force flag');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
