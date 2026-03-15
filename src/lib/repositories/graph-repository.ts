/**
 * Graph Repository
 * Data access layer for network graph visualization
 * Provides GraphData type and query functions for holder/entity graph pages
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

// ─── GraphData type ──────────────────────────────────────────────────────────

export type GraphData = {
  centerLabel: string;       // Holder canonical name or entity name
  centerType: 'holder' | 'entity';
  centerId: string;          // holderName (URL-encoded key) or entityId as string
  stocks: Array<{
    emitenId: string;        // e.g. "CUAN"
    emitenName: string;
    totalPercentage: string; // decimal string e.g. "8.50"
  }>;
};

// ─── Helper: resolve latest period id ───────────────────────────────────────

async function resolveLatestPeriodId(): Promise<string | null> {
  const result = await db.execute<{ id: string }>(
    sql`SELECT id FROM periods ORDER BY year DESC, month DESC LIMIT 1`
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ─── findHolderGraph ─────────────────────────────────────────────────────────

/**
 * Find graph data for a holder by canonical name.
 *
 * - Returns null if the holder does not exist in the database.
 * - If the holder belongs to an entity group, delegates to findEntityGraph()
 *   (entity-level portfolio shown, entity name is the centerLabel).
 * - If the holder is ungrouped, returns their individual ownership portfolio
 *   for the latest period. Returns { ...centerInfo, stocks: [] } when the
 *   holder exists but has no records in the latest period.
 */
export async function findHolderGraph(
  holderName: string
): Promise<GraphData | null> {
  // Step 1: Resolve holder id
  const holderResult = await db.execute<{ id: string }>(
    sql`SELECT id FROM holders WHERE canonical_name = ${holderName} LIMIT 1`
  );

  if (holderResult.rows.length === 0) {
    return null;
  }

  const holderId = holderResult.rows[0].id;

  // Step 2: Check if this holder belongs to an entity
  const entityResult = await db.execute<{
    entity_id: string;
    entity_name: string;
  }>(
    sql`
      SELECT eh.entity_id, e.name AS entity_name
      FROM entity_holders eh
      JOIN entities e ON e.id = eh.entity_id
      WHERE eh.holder_id = ${holderId}
      LIMIT 1
    `
  );

  // Step 3a: Entity member — delegate to findEntityGraph
  if (entityResult.rows.length > 0) {
    const entityId = Number(entityResult.rows[0].entity_id);
    return findEntityGraph(entityId);
  }

  // Step 3b: Ungrouped holder — resolve latest period
  const periodId = await resolveLatestPeriodId();

  if (periodId === null) {
    return {
      centerLabel: holderName,
      centerType: 'holder',
      centerId: holderName,
      stocks: [],
    };
  }

  // Step 4: Fetch ownership records for this holder in the latest period
  const ownershipResult = await db.execute<{
    emiten_id: string;
    emiten_name: string;
    pct: string;
  }>(
    sql`
      SELECT
        e.id   AS emiten_id,
        e.name AS emiten_name,
        or2.ownership_percentage::numeric(7,2)::text AS pct
      FROM ownership_records or2
      JOIN emiten e ON e.id = or2.emiten_id
      WHERE or2.holder_id = ${holderId}
        AND or2.period_id = ${periodId}
      ORDER BY or2.ownership_percentage DESC
    `
  );

  // Step 5: Return GraphData (stocks may be empty — not null)
  return {
    centerLabel: holderName,
    centerType: 'holder',
    centerId: holderName,
    stocks: ownershipResult.rows.map((r) => ({
      emitenId: r.emiten_id,
      emitenName: r.emiten_name,
      totalPercentage: r.pct,
    })),
  };
}

// ─── findEntityGraph ─────────────────────────────────────────────────────────

/**
 * Find graph data for an entity by id.
 *
 * - Returns null if the entity does not exist in the database.
 * - Aggregates ownership across all holder aliases linked to this entity.
 * - Returns { ...centerInfo, stocks: [] } when the entity exists but has no
 *   records in the latest period.
 */
export async function findEntityGraph(
  entityId: number
): Promise<GraphData | null> {
  // Step 1: Resolve entity name
  const entityResult = await db.execute<{ id: string; name: string }>(
    sql`SELECT id, name FROM entities WHERE id = ${entityId} LIMIT 1`
  );

  if (entityResult.rows.length === 0) {
    return null;
  }

  const entityName = entityResult.rows[0].name;

  // Step 2: Resolve latest period
  const periodId = await resolveLatestPeriodId();

  if (periodId === null) {
    return {
      centerLabel: entityName,
      centerType: 'entity',
      centerId: String(entityId),
      stocks: [],
    };
  }

  // Step 3: Aggregate ownership across all aliases for this entity
  const ownershipResult = await db.execute<{
    emiten_id: string;
    emiten_name: string;
    pct: string;
  }>(
    sql`
      SELECT
        e.id   AS emiten_id,
        e.name AS emiten_name,
        SUM(or2.ownership_percentage)::numeric(7,2)::text AS pct
      FROM entity_holders eh
      JOIN holders h ON h.id = eh.holder_id
      JOIN ownership_records or2
        ON or2.holder_id = h.id
       AND or2.period_id = ${periodId}
      JOIN emiten e ON e.id = or2.emiten_id
      WHERE eh.entity_id = ${entityId}
      GROUP BY e.id, e.name
      ORDER BY SUM(or2.ownership_percentage) DESC
    `
  );

  // Step 4: Return GraphData (stocks may be empty — not null)
  return {
    centerLabel: entityName,
    centerType: 'entity',
    centerId: String(entityId),
    stocks: ownershipResult.rows.map((r) => ({
      emitenId: r.emiten_id,
      emitenName: r.emiten_name,
      totalPercentage: r.pct,
    })),
  };
}
