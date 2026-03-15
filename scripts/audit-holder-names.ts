#!/usr/bin/env tsx
/**
 * Audit script for detecting truncated holder names in the database.
 *
 * Queries the holders table for:
 * 1. Short name candidates (canonical_name length < 12)
 * 2. Known name spot-check (prominent investors)
 * 3. Summary statistics
 *
 * Exit code 0 = clean state (no short names found)
 * Exit code 1 = truncation detected (short names present)
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' }); // fallback if .env.local is absent

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // --- Section 1: Short name candidates ---
  console.log('=== SHORT NAME CANDIDATES (canonical_name length < 12) ===');
  const shortNames = await sql`
    SELECT
      id,
      canonical_name,
      original_name,
      length(canonical_name) AS name_length
    FROM holders
    WHERE length(canonical_name) < 12
    ORDER BY length(canonical_name) ASC
    LIMIT 100
  `;

  if (shortNames.length === 0) {
    console.log('  (none found — clean state)');
  } else {
    for (const row of shortNames) {
      console.log(`  [len=${row.name_length}] canonical="${row.canonical_name}" | original="${row.original_name}"`);
    }
  }

  // --- Section 2: Known name spot-check ---
  console.log('\n=== KNOWN INVESTOR SPOT-CHECK ===');
  const knownNames = await sql`
    SELECT
      id,
      canonical_name,
      original_name,
      length(canonical_name) AS name_length
    FROM holders
    WHERE
      canonical_name ILIKE '%prajogo%'
      OR canonical_name ILIKE '%pangestu%'
      OR canonical_name ILIKE '%salim%'
      OR canonical_name ILIKE '%anthoni%'
      OR canonical_name ILIKE '%hartono%'
      OR canonical_name ILIKE '%bakrie%'
    ORDER BY canonical_name ASC
  `;

  if (knownNames.length === 0) {
    console.log('  (no known investor names found — database may be empty or names are truncated)');
  } else {
    for (const row of knownNames) {
      console.log(`  [id=${row.id}, len=${row.name_length}] "${row.canonical_name}" | original="${row.original_name}"`);
    }
  }

  // --- Section 3: Holder count summary ---
  console.log('\n=== HOLDER COUNT SUMMARY ===');
  const summary = await sql`
    SELECT
      COUNT(*) AS total_holders,
      COUNT(*) FILTER (WHERE length(canonical_name) < 12) AS short_name_count
    FROM holders
  `;

  const totalHolders = Number(summary[0].total_holders);
  const shortCount = Number(summary[0].short_name_count);
  const fraction = totalHolders > 0 ? ((shortCount / totalHolders) * 100).toFixed(2) : '0.00';

  console.log(`  Total holders: ${totalHolders}`);
  console.log(`  Short names (<12 chars): ${shortCount} (${fraction}% of total)`);

  if (shortCount > 0) {
    console.log('\nRESULT: TRUNCATION DETECTED — fix required.');
    process.exit(1);
  } else {
    console.log('\nRESULT: CLEAN — no truncated holder names detected.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(2);
});
