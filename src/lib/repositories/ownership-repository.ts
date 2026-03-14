// @ts-nocheck
/**
 * Ownership Repository
 * Data access layer for ownership data using Drizzle ORM
 * Provides upsert operations for all tables with transaction support
 */

import { db, schema } from '../db';
import { eq, and, desc, or, ilike } from 'drizzle-orm';
import type {
  ExtractedOwnershipRecord,
  ExtractedPeriod,
} from '../types/pdf-data';

/**
 * Period type from database
 */
export type Period = typeof schema.periods.$inferSelect;
export type NewPeriod = typeof schema.periods.$inferInsert;

/**
 * Emiten type from database
 */
export type Emiten = typeof schema.emiten.$inferSelect;
export type NewEmiten = typeof schema.emiten.$inferInsert;

/**
 * Holder type from database
 */
export type Holder = typeof schema.holders.$inferSelect;
export type NewHolder = typeof schema.holders.$inferInsert;

/**
 * Ownership record type from database
 */
export type OwnershipRecord = typeof schema.ownershipRecords.$inferSelect;
export type NewOwnershipRecord = typeof schema.ownershipRecords.$inferInsert;

/**
 * Transaction type from Drizzle
 */
type Transaction = Parameters<typeof db.transaction>[0];

/**
 * Upsert period record
 * Insert or update period based on ID
 */
export async function upsertPeriod(data: ExtractedPeriod): Promise<Period> {
  const [period] = await db
    .insert(schema.periods)
    .values({
      id: data.period,
      month: parseInt(data.period.split('-')[1], 10),
      year: parseInt(data.period.split('-')[0], 10),
      pdfFileName: data.pdfFileName,
      extractionVersion: '1.0.0', // Track extraction version
    })
    .onConflictDoUpdate({
      target: schema.periods.id,
      set: {
        pdfFileName: data.pdfFileName,
        extractionVersion: '1.0.0',
      },
    })
    .returning();

  return period;
}

/**
 * Find period by ID
 * Check if period already exists in database
 */
export async function findPeriodById(periodId: string): Promise<Period | null> {
  const [period] = await db
    .select()
    .from(schema.periods)
    .where(eq(schema.periods.id, periodId))
    .limit(1);

  return period || null;
}

/**
 * Upsert emiten record
 * Insert or update stock based on code
 */
export async function upsertEmiten(
  code: string,
  name: string
): Promise<Emiten> {
  const [emiten] = await db
    .insert(schema.emiten)
    .values({
      id: code,
      name,
      sector: null, // Sector data not available from PDF
    })
    .onConflictDoUpdate({
      target: schema.emiten.id,
      set: {
        name,
      },
    })
    .returning();

  return emiten;
}

/**
 * Normalize holder name to canonical form
 * Removes common variations for deduplication
 */
function normalizeHolderName(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bPT\b/g, 'PT.')
    .replace(/\bTbk\b/g, 'TBK.')
    .replace(/\bCV\b/g, 'CV.')
    .replace(/PT\./g, 'PT ')
    .replace(/TBK\./g, 'TBK ')
    .replace(/CV\./g, 'CV ')
    .trim();
}

/**
 * Detect holder type from name
 * Simple heuristic based on name patterns
 */
function detectHolderType(name: string): NewHolder['type'] {
  const upperName = name.toUpperCase();

  // Government patterns
  if (
    upperName.includes('NEGARA') ||
    upperName.includes('REPUBLIK') ||
    upperName.includes('Pemerintah') ||
    upperName.includes('Government')
  ) {
    return 'government';
  }

  // Institution patterns
  if (
    upperName.includes('PT.') ||
    upperName.includes('PT ') ||
    upperName.includes('TBK') ||
    upperName.includes('CV.') ||
    upperName.includes('CV ') ||
    upperName.includes('YAYASAN') ||
    upperName.includes('FOUNDATION') ||
    upperName.includes('BANK') ||
    upperName.includes('DANA') ||
    upperName.includes('FUND')
  ) {
    return 'institution';
  }

  // Foreign patterns
  if (
    /[A-Z]{2,}/.test(name) && // Has multiple consecutive uppercase words
    !upperName.includes('PT') &&
    !upperName.includes('TBK')
  ) {
    return 'foreign';
  }

  // Default to individual
  return 'individual';
}

/**
 * Find existing holder by canonical name
 * Check for similar holder to prevent duplicates
 */
async function findExistingHolder(canonicalName: string): Promise<Holder | null> {
  const [holder] = await db
    .select()
    .from(schema.holders)
    .where(eq(schema.holders.canonicalName, canonicalName))
    .limit(1);

  return holder || null;
}

/**
 * Upsert holder record
 * Insert or update holder with canonical name for deduplication
 */
export async function upsertHolder(
  name: string,
  type?: string
): Promise<Holder> {
  const canonicalName = normalizeHolderName(name);
  const holderType = type || detectHolderType(name);

  // Check if holder already exists
  const existing = await findExistingHolder(canonicalName);
  if (existing) {
    return existing;
  }

  // Insert new holder
  const [holder] = await db
    .insert(schema.holders)
    .values({
      canonicalName,
      originalName: name,
      type: holderType,
    })
    .returning();

  return holder;
}

/**
 * Upsert ownership record
 * Insert or update ownership record with composite key
 */
export async function upsertOwnershipRecord(
  record: ExtractedOwnershipRecord,
  periodId: string,
  emitenId: string,
  holderId: number
): Promise<OwnershipRecord> {
  const [ownershipRecord] = await db
    .insert(schema.ownershipRecords)
    .values({
      periodId,
      emitenId,
      holderId,
      rank: record.rank,
      sharesOwned: record.sharesOwned,
      ownershipPercentage: record.ownershipPercentage.toString(),
    })
    .onConflictDoUpdate({
      target: [schema.ownershipRecords.periodId, schema.ownershipRecords.emitenId, schema.ownershipRecords.holderId],
      set: {
        rank: record.rank,
        sharesOwned: record.sharesOwned,
        ownershipPercentage: record.ownershipPercentage.toString(),
      },
    })
    .returning();

  return ownershipRecord;
}

/**
 * Execute callback within database transaction
 * Provides all-or-nothing semantics for import operations
 */
export async function withTransaction<T>(
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}

/**
 * Find ownership records by period
 * Query all ownership records for a specific period
 */
export async function findOwnershipRecordsByPeriod(
  periodId: string
): Promise<OwnershipRecord[]> {
  return db
    .select()
    .from(schema.ownershipRecords)
    .where(eq(schema.ownershipRecords.periodId, periodId));
}

/**
 * Find ownership records by emiten
 * Query all ownership records for a specific stock
 */
export async function findOwnershipRecordsByEmiten(
  emitenId: string
): Promise<OwnershipRecord[]> {
  return db
    .select()
    .from(schema.ownershipRecords)
    .where(eq(schema.ownershipRecords.emitenId, emitenId));
}

/**
 * Find ownership records by holder
 * Query all ownership records for a specific holder
 */
export async function findOwnershipRecordsByHolder(
  holderId: number
): Promise<OwnershipRecord[]> {
  return db
    .select()
    .from(schema.ownershipRecords)
    .where(eq(schema.ownershipRecords.holderId, holderId));
}

/**
 * Find all ownership records for a specific stock with holder details
 * Returns complete ownership data ordered by rank
 */
export async function findOwnershipByStockWithHolders(
  emitenId: string,
  periodId?: string
): Promise<{
  rank: number;
  holderName: string;
  holderType: string;
  sharesOwned: number;
  ownershipPercentage: string;
  periodId: string;
}[]> {
  // If no period specified, use latest period
  let targetPeriod = periodId;
  if (!targetPeriod) {
    const latestPeriod = await db
      .select()
      .from(schema.periods)
      .orderBy(desc(schema.periods.year), desc(schema.periods.month))
      .limit(1);
    if (latestPeriod.length === 0) {
      return [];
    }
    targetPeriod = latestPeriod[0].id;
  }

  // Query ownership records with holder details
  const result = await db
    .select({
      rank: schema.ownershipRecords.rank,
      holderName: schema.holders.canonicalName,
      holderType: schema.holders.type,
      sharesOwned: schema.ownershipRecords.sharesOwned,
      ownershipPercentage: schema.ownershipRecords.ownershipPercentage,
      periodId: schema.ownershipRecords.periodId,
    })
    .from(schema.ownershipRecords)
    .innerJoin(
      schema.holders,
      eq(schema.holders.id, schema.ownershipRecords.holderId)
    )
    .where(
      and(
        eq(schema.ownershipRecords.emitenId, emitenId),
        eq(schema.ownershipRecords.periodId, targetPeriod)
      )
    )
    .orderBy(schema.ownershipRecords.rank);

  return result.map((row) => ({
    ...row,
    ownershipPercentage: row.ownershipPercentage.toString(),
  }));
}

/**
 * Get stock information by code
 */
export async function findEmitenByCode(code: string): Promise<Emiten | null> {
  const [emiten] = await db
    .select()
    .from(schema.emiten)
    .where(eq(schema.emiten.id, code))
    .limit(1);

  return emiten || null;
}

/**
 * Get latest period from database
 */
export async function getLatestPeriod(): Promise<Period | null> {
  const [period] = await db
    .select()
    .from(schema.periods)
    .orderBy(desc(schema.periods.year), desc(schema.periods.month))
    .limit(1);

  return period || null;
}

/**
 * Find all stocks with their top holder information
 * Returns array of stocks with top holder name and percentage
 */
export async function findAllStocksWithTopHolder(periodId?: string): Promise<{
  emiten: Emiten;
  topHolder: {
    name: string;
    percentage: string;
    rank: number;
  } | null;
  updatedAt: string;
}[]> {
  // If no period specified, use latest period
  let targetPeriod = periodId;
  if (!targetPeriod) {
    const latestPeriod = await db
      .select()
      .from(schema.periods)
      .orderBy(desc(schema.periods.year), desc(schema.periods.month))
      .limit(1);
    if (latestPeriod.length === 0) {
      return []; // No data yet
    }
    targetPeriod = latestPeriod[0].id;
  }

  // Query all stocks with their top holder (rank = 1)
  const result = await db
    .select({
      emiten: schema.emiten,
      holderName: schema.holders.canonicalName,
      rank: schema.ownershipRecords.rank,
      percentage: schema.ownershipRecords.ownershipPercentage,
      periodId: schema.ownershipRecords.periodId,
      year: schema.periods.year,
      month: schema.periods.month,
    })
    .from(schema.emiten)
    .innerJoin(
      schema.ownershipRecords,
      eq(schema.ownershipRecords.emitenId, schema.emiten.id)
    )
    .innerJoin(
      schema.holders,
      eq(schema.holders.id, schema.ownershipRecords.holderId)
    )
    .innerJoin(
      schema.periods,
      eq(schema.periods.id, schema.ownershipRecords.periodId)
    )
    .where(
      and(
        eq(schema.ownershipRecords.periodId, targetPeriod),
        eq(schema.ownershipRecords.rank, 1) // Top holder only
      )
    );

  // Transform to expected format
  const stockMap = new Map<string, any>();

  for (const row of result) {
    if (!stockMap.has(row.emiten.id)) {
      stockMap.set(row.emiten.id, {
        emiten: row.emiten,
        topHolder: {
          name: row.holderName,
          percentage: row.percentage,
          rank: row.rank,
        },
        updatedAt: `${row.year}-${row.month.toString().padStart(2, '0')}`,
      });
    }
  }

  return Array.from(stockMap.values());
}

/**
 * Search stocks with optional filters
 * Supports filtering by stock code and/or holder name
 */
export async function searchStocksWithFilters(filters: {
  stockCode?: string;
  holderName?: string;
  periodId?: string;
}): Promise<{
  emiten: Emiten;
  topHolder: {
    name: string;
    percentage: string;
    rank: number;
  } | null;
  updatedAt: string;
}[]> {
  // If no period specified, use latest period
  let targetPeriod = filters.periodId;
  if (!targetPeriod) {
    const latestPeriod = await db
      .select()
      .from(schema.periods)
      .orderBy(desc(schema.periods.year), desc(schema.periods.month))
      .limit(1);
    if (latestPeriod.length === 0) {
      return [];
    }
    targetPeriod = latestPeriod[0].id;
  }

  // Build query conditions
  const conditions = [];

  // Filter by stock code (partial match, case-insensitive)
  if (filters.stockCode) {
    conditions.push(ilike(schema.emiten.id, `%${filters.stockCode}%`));
  }

  // Filter by holder name (partial match, case-insensitive)
  if (filters.holderName) {
    conditions.push(ilike(schema.holders.canonicalName, `%${filters.holderName}%`));
  }

  // Query with filters
  const result = await db
    .select({
      emiten: schema.emiten,
      holderName: schema.holders.canonicalName,
      rank: schema.ownershipRecords.rank,
      percentage: schema.ownershipRecords.ownershipPercentage,
      periodId: schema.ownershipRecords.periodId,
      year: schema.periods.year,
      month: schema.periods.month,
    })
    .from(schema.emiten)
    .innerJoin(
      schema.ownershipRecords,
      eq(schema.ownershipRecords.emitenId, schema.emiten.id)
    )
    .innerJoin(
      schema.holders,
      eq(schema.holders.id, schema.ownershipRecords.holderId)
    )
    .innerJoin(
      schema.periods,
      eq(schema.periods.id, schema.ownershipRecords.periodId)
    )
    .where(
      and(
        eq(schema.ownershipRecords.periodId, targetPeriod),
        eq(schema.ownershipRecords.rank, 1),
        conditions.length > 0 ? or(...conditions) : undefined
      )
    );

  // Transform to expected format
  const stockMap = new Map<string, any>();

  for (const row of result) {
    if (!stockMap.has(row.emiten.id)) {
      stockMap.set(row.emiten.id, {
        emiten: row.emiten,
        topHolder: {
          name: row.holderName,
          percentage: row.percentage,
          rank: row.rank,
        },
        updatedAt: `${row.year}-${row.month.toString().padStart(2, '0')}`,
      });
    }
  }

  return Array.from(stockMap.values());
}
