// @ts-nocheck
/**
 * Ownership Repository
 * Data access layer for ownership data using Drizzle ORM
 * Provides upsert operations for all tables with transaction support
 */

import { db, schema } from '../db';
import { eq, and, desc, or, ilike, sql } from 'drizzle-orm';
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

/**
 * Find all holders with basic stats
 * Returns all holders with their stock count and top stock
 */
export async function findAllHolders(periodId?: string): Promise<{
  holder: {
    id: number;
    name: string;
    type: string;
  };
  stocksCount: number;
  topStock: {
    code: string;
    name: string;
    percentage: string;
  } | null;
}[]> {
  // Use latest period if not specified
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

  // Query holders with their ownership count and top stock
  const result = await db
    .select({
      holderId: schema.holders.id,
      holderName: schema.holders.canonicalName,
      holderType: schema.holders.type,
      stockCount: sql<number>`count(distinct ${schema.ownershipRecords.emitenId})`,
      topStockCode: schema.emiten.id,
      topStockName: schema.emiten.name,
      topPercentage: schema.ownershipRecords.ownershipPercentage,
    })
    .from(schema.holders)
    .innerJoin(
      schema.ownershipRecords,
      eq(schema.holders.id, schema.ownershipRecords.holderId)
    )
    .innerJoin(
      schema.emiten,
      eq(schema.ownershipRecords.emitenId, schema.emiten.id)
    )
    .where(eq(schema.ownershipRecords.periodId, targetPeriod))
    .groupBy(
      schema.holders.id,
      schema.holders.canonicalName,
      schema.holders.type,
      schema.emiten.id,
      schema.emiten.name,
      schema.ownershipRecords.ownershipPercentage
    )
    .orderBy(desc(sql`count(distinct ${schema.ownershipRecords.emitenId})`));

  // Transform to get top stock per holder (first result after ordering)
  const holderMap = new Map<number, any>();

  for (const row of result) {
    if (!holderMap.has(row.holderId)) {
      holderMap.set(row.holderId, {
        holder: {
          id: row.holderId,
          name: row.holderName,
          type: row.holderType,
        },
        stocksCount: Number(row.stockCount),
        topStock: {
          code: row.topStockCode,
          name: row.topStockName,
          percentage: row.topPercentage.toString(),
        },
      });
    }
  }

  return Array.from(holderMap.values());
}

/**
 * Search holders by name
 * Returns holders matching the query with their stock count and top stock
 */
export async function searchHoldersByName(
  query: string,
  periodId?: string
): Promise<{
  holder: {
    id: number;
    name: string;
    type: string;
  };
  stocksCount: number;
  topStock: {
    code: string;
    name: string;
    percentage: string;
  } | null;
}[]> {
  // Use latest period if not specified
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

  // Query with name filter
  const result = await db
    .select({
      holderId: schema.holders.id,
      holderName: schema.holders.canonicalName,
      holderType: schema.holders.type,
      stockCount: sql<number>`count(distinct ${schema.ownershipRecords.emitenId})`,
      topStockCode: schema.emiten.id,
      topStockName: schema.emiten.name,
      topPercentage: schema.ownershipRecords.ownershipPercentage,
    })
    .from(schema.holders)
    .innerJoin(
      schema.ownershipRecords,
      eq(schema.holders.id, schema.ownershipRecords.holderId)
    )
    .innerJoin(
      schema.emiten,
      eq(schema.ownershipRecords.emitenId, schema.emiten.id)
    )
    .where(
      and(
        eq(schema.ownershipRecords.periodId, targetPeriod),
        ilike(schema.holders.canonicalName, `%${query}%`)
      )
    )
    .groupBy(
      schema.holders.id,
      schema.holders.canonicalName,
      schema.holders.type,
      schema.emiten.id,
      schema.emiten.name,
      schema.ownershipRecords.ownershipPercentage
    )
    .orderBy(desc(sql`count(distinct ${schema.ownershipRecords.emitenId})`))
    .limit(50); // Limit results for performance

  // Transform same as findAllHolders
  const holderMap = new Map<number, any>();

  for (const row of result) {
    if (!holderMap.has(row.holderId)) {
      holderMap.set(row.holderId, {
        holder: {
          id: row.holderId,
          name: row.holderName,
          type: row.holderType,
        },
        stocksCount: Number(row.stockCount),
        topStock: {
          code: row.topStockCode,
          name: row.topStockName,
          percentage: row.topPercentage.toString(),
        },
      });
    }
  }

  return Array.from(holderMap.values());
}

/**
 * Find all stocks for a holder
 * Returns complete portfolio for a specific holder
 */
export async function findStocksByHolder(
  holderId: number,
  periodId?: string
): Promise<{
  emiten: Emiten;
  rank: number;
  sharesOwned: number;
  ownershipPercentage: string;
}[]> {
  // Use latest period if not specified
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

  // Query all stocks held by this holder
  const result = await db
    .select({
      emiten: schema.emiten,
      rank: schema.ownershipRecords.rank,
      sharesOwned: schema.ownershipRecords.sharesOwned,
      ownershipPercentage: schema.ownershipRecords.ownershipPercentage,
    })
    .from(schema.ownershipRecords)
    .innerJoin(
      schema.emiten,
      eq(schema.ownershipRecords.emitenId, schema.emiten.id)
    )
    .where(
      and(
        eq(schema.ownershipRecords.holderId, holderId),
        eq(schema.ownershipRecords.periodId, targetPeriod)
      )
    )
    .orderBy(schema.ownershipRecords.rank);

  return result.map((row) => ({
    emiten: row.emiten,
    rank: row.rank,
    sharesOwned: row.sharesOwned,
    ownershipPercentage: row.ownershipPercentage.toString(),
  }));
}

/**
 * Find holder by ID
 * Returns holder details
 */
export async function findHolderById(holderId: number): Promise<{
  id: number;
  name: string;
  type: string;
} | null> {
  const [holder] = await db
    .select()
    .from(schema.holders)
    .where(eq(schema.holders.id, holderId))
    .limit(1);

  return holder
    ? {
        id: holder.id,
        name: holder.canonicalName,
        type: holder.type,
      }
    : null;
}

/**
 * Get the previous period for a given period ID
 * Calculates the month before the given period
 */
export async function getPreviousPeriod(periodId: string): Promise<Period | null> {
  // Parse periodId (format: "YYYY-MM")
  const [year, month] = periodId.split('-').map(Number);

  // Calculate previous month
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  // Format as "YYYY-MM"
  const prevPeriodId = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

  // Query database
  const [period] = await db
    .select()
    .from(schema.periods)
    .where(eq(schema.periods.id, prevPeriodId))
    .limit(1);

  return period || null;
}

/**
 * Get historical comparison data for a stock
 * Compares current period ownership with previous period
 */
export async function getHistoricalComparison(
  emitenId: string,
  currentPeriodId: string
): Promise<{
  holderName: string;
  holderType: string;
  currentRank: number;
  currentShares: number;
  currentPercentage: string;
  previousRank: number | null;
  previousShares: number | null;
  previousPercentage: string | null;
  changePercentage: number; // Can be positive (accumulation) or negative (disposal)
  status: 'new' | 'exited' | 'increased' | 'decreased' | 'unchanged';
}[]> {
  // Get previous period
  const previousPeriod = await getPreviousPeriod(currentPeriodId);
  if (!previousPeriod) {
    // No historical data available, return current holders with status 'new'
    const currentHolders = await findOwnershipByStockWithHolders(emitenId, currentPeriodId);
    return currentHolders.map(h => ({
      holderName: h.holderName,
      holderType: h.holderType,
      currentRank: h.rank,
      currentShares: h.sharesOwned,
      currentPercentage: h.ownershipPercentage,
      previousRank: null,
      previousShares: null,
      previousPercentage: null,
      changePercentage: 0,
      status: 'new' as const,
    }));
  }

  // Fetch current and previous period ownership
  const currentHolders = await findOwnershipByStockWithHolders(emitenId, currentPeriodId);
  const previousHolders = await findOwnershipByStockWithHolders(emitenId, previousPeriod.id);

  // Build maps for efficient lookup
  const currentMap = new Map(currentHolders.map(h => [h.holderName, h]));
  const previousMap = new Map(previousHolders.map(h => [h.holderName, h]));

  // Collect all unique holder names
  const allHolderNames = new Set([
    ...currentHolders.map(h => h.holderName),
    ...previousHolders.map(h => h.holderName),
  ]);

  // Build comparison array
  const comparison = Array.from(allHolderNames).map(holderName => {
    const current = currentMap.get(holderName);
    const previous = previousMap.get(holderName);

    const currentPct = current ? parseFloat(current.ownershipPercentage) : 0;
    const previousPct = previous ? parseFloat(previous.ownershipPercentage) : 0;
    const changePct = currentPct - previousPct;

    // Determine status
    let status: 'new' | 'exited' | 'increased' | 'decreased' | 'unchanged';
    if (!previous && current) {
      status = 'new';
    } else if (previous && !current) {
      status = 'exited';
    } else if (changePct > 0.01) { // More than 0.01% change
      status = 'increased';
    } else if (changePct < -0.01) {
      status = 'decreased';
    } else {
      status = 'unchanged';
    }

    return {
      holderName,
      holderType: current?.holderType || previous?.holderType || 'unknown',
      currentRank: current?.rank || null,
      currentShares: current?.sharesOwned || 0,
      currentPercentage: current ? current.ownershipPercentage : '0.00',
      previousRank: previous?.rank || null,
      previousShares: previous?.sharesOwned || null,
      previousPercentage: previous ? previous.ownershipPercentage : null,
      changePercentage: changePct,
      status,
    };
  });

  // Sort: new holders first, then by current rank
  return comparison.sort((a, b) => {
    if (a.status === 'new' && b.status !== 'new') return -1;
    if (a.status !== 'new' && b.status === 'new') return 1;
    return (a.currentRank ?? 999) - (b.currentRank ?? 999);
  });
}

/**
 * Get all available periods for filtering
 * Returns periods ordered by most recent first
 */
export async function getAllPeriods(): Promise<Period[]> {
  return db
    .select()
    .from(schema.periods)
    .orderBy(desc(schema.periods.year), desc(schema.periods.month));
}
