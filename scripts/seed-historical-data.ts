#!/usr/bin/env tsx
// @ts-nocheck
/**
 * Seed Historical Data for Testing
 *
 * Creates a second period with realistic ownership changes for testing:
 * - Historical comparison (04-01)
 * - Top Movers dashboard (04-03)
 *
 * Usage:
 *   npm run seed-historical
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { db } from '../src/lib/db';
import { schema } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get current period data
 */
async function getCurrentPeriodData() {
  const currentPeriod = await db
    .select()
    .from(schema.periods)
    .orderBy(schema.periods.year, schema.periods.month)
    .limit(1);

  if (currentPeriod.length === 0) {
    throw new Error('No periods found in database');
  }

  const period = currentPeriod[0];

  // Get all ownership records for current period
  const records = await db
    .select()
    .from(schema.ownershipRecords)
    .where(eq(schema.ownershipRecords.periodId, period.id));

  return { period, records };
}

/**
 * Generate previous period date (1 month before)
 */
function generatePreviousPeriod(currentYear: number, currentMonth: number) {
  let prevYear = currentYear;
  let prevMonth = currentMonth - 1;

  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = currentYear - 1;
  }

  return {
    year: prevYear,
    month: prevMonth,
    id: `${prevYear}-${prevMonth.toString().padStart(2, '0')}`,
  };
}

/**
 * Create realistic ownership changes for testing
 */
function createPreviousPeriodData(currentRecords: typeof schema.ownershipRecords.$inferInsert[]) {
  // Group by stock to make changes per stock
  const stockGroups = new Map<string, typeof currentRecords>();

  for (const record of currentRecords) {
    if (!stockGroups.has(record.emitenId)) {
      stockGroups.set(record.emitenId, []);
    }
    stockGroups.get(record.emitenId)!.push(record);
  }

  const previousRecords: typeof currentRecords = [];

  for (const [emitenId, stockRecords] of stockGroups) {
    // Sort by rank (top holders first)
    stockRecords.sort((a, b) => a.rank - b.rank);

    // Strategy: Create realistic changes
    // - Top 3 holders: slight accumulation (simulate "smart money" buying)
    // - Middle holders: random small changes
    // - Bottom 2 holders: make one exit (simulate "getting out")
    // - Add 1 new holder per stock (simulate "new investor")

    for (let i = 0; i < stockRecords.length; i++) {
      const record = stockRecords[i];
      const currentPct = parseFloat(record.ownershipPercentage);
      let newPct = currentPct;

      // Apply percentage changes based on position
      if (i < 3) {
        // Top holders: accumulate 1-3%
        newPct = currentPct - (1 + Math.random() * 2);
      } else if (i >= stockRecords.length - 2) {
        // Bottom holders: dispose 0.5-2%
        newPct = currentPct + (0.5 + Math.random() * 1.5);
      } else {
        // Middle holders: small random change -0.5% to +0.5%
        newPct = currentPct + (Math.random() - 0.5);
      }

      // Ensure percentage is positive
      newPct = Math.max(0.01, newPct);

      // Calculate shares based on new percentage (rough approximation)
      const shareRatio = newPct / currentPct;
      const newShares = Math.round(record.sharesOwned * shareRatio);

      previousRecords.push({
        ...record,
        ownershipPercentage: newPct.toFixed(2),
        sharesOwned: newShares,
        rank: record.rank, // Keep same rank for simplicity
      });
    }

    // Simulate one holder exiting for this stock (remove from previous period)
    // This creates "KELUAR" (exited) badge scenario
    if (stockRecords.length > 5) {
      const exitIndex = stockRecords.length - 1;
      const exitedRecord = previousRecords.find(
        r => r.emitenId === emitenId && r.rank === exitIndex + 1
      );
      if (exitedRecord) {
        const idx = previousRecords.indexOf(exitedRecord);
        if (idx > -1) {
          previousRecords.splice(idx, 1);
        }
      }
    }
  }

  return previousRecords;
}

/**
 * Main seed function
 */
async function main() {
  console.log('\n=== Seeding Historical Test Data ===\n');

  try {
    // 1. Get current period data
    console.log('Step 1: Reading current period data...');
    const { period: currentPeriod, records: currentRecords } = await getCurrentPeriodData();

    console.log(`  Current period: ${currentPeriod.id} (${currentPeriod.year}-${currentPeriod.month})`);
    console.log(`  Records found: ${currentRecords.length}`);
    console.log(`  Unique stocks: ${new Set(currentRecords.map(r => r.emitenId)).size}`);
    console.log(`  Unique holders: ${new Set(currentRecords.map(r => r.holderId)).size}`);

    // 2. Generate previous period date
    console.log('\nStep 2: Generating previous period date...');
    const prevPeriod = generatePreviousPeriod(currentPeriod.year, currentPeriod.month);
    console.log(`  Previous period: ${prevPeriod.id} (${prevPeriod.year}-${prevPeriod.month})`);

    // Check if previous period already exists
    const existingPeriod = await db
      .select()
      .from(schema.periods)
      .where(eq(schema.periods.id, prevPeriod.id));

    if (existingPeriod.length > 0) {
      console.log(`\n⚠ Warning: Period ${prevPeriod.id} already exists.`);
      console.log('To re-seed, delete the period first or use --force flag.');
      process.exit(1);
    }

    // 3. Create previous period with ownership changes
    console.log('\nStep 3: Creating ownership changes for testing...');
    const previousRecords = createPreviousPeriodData(currentRecords);

    console.log(`  Previous records created: ${previousRecords.length}`);
    console.log(`  Changes simulation:`);
    console.log(`    - Top holders: accumulation (1-3% decrease from current)`);
    console.log(`    - Bottom holders: disposal (0.5-2% increase from current)`);
    console.log(`    - 1 holder per stock: exited (removed from previous)`);

    // 4. Insert previous period
    console.log('\nStep 4: Inserting previous period into database...');
    await db.insert(schema.periods).values({
      id: prevPeriod.id,
      year: prevPeriod.year,
      month: prevPeriod.month,
      dataCurrency: 'IDR',
      createdAt: new Date(),
    });
    console.log(`  ✓ Period ${prevPeriod.id} created`);

    // 5. Insert ownership records
    console.log('\nStep 5: Inserting ownership records...');
    let inserted = 0;

    for (const record of previousRecords) {
      await db.insert(schema.ownershipRecords).values({
        periodId: prevPeriod.id,
        emitenId: record.emitenId,
        holderId: record.holderId,
        rank: record.rank,
        sharesOwned: record.sharesOwned,
        ownershipPercentage: record.ownershipPercentage,
        createdAt: new Date(),
      });
      inserted++;

      if (inserted % 100 === 0) {
        console.log(`  Progress: ${inserted}/${previousRecords.length} records`);
      }
    }

    console.log(`  ✓ Inserted ${inserted} ownership records`);

    // 6. Summary
    console.log('\n=== Seed Complete! ===\n');
    console.log('Summary:');
    console.log(`  Previous period: ${prevPeriod.id}`);
    console.log(`  Records inserted: ${inserted}`);
    console.log('\nTest scenarios now available:');
    console.log('  ✓ Historical comparison (2 periods)');
    console.log('  ✓ Accumulators (top holders increased position)');
    console.log('  ✓ Disposals (bottom holders decreased position)');
    console.log('  ✓ Exited holders (removed from previous period)');
    console.log('  ✓ New holders (will appear in current period only)');
    console.log('\nResume UAT with: /gsd:verify-work 4\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seed failed!');
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
