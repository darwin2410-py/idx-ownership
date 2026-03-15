/**
 * Entity Repository
 * Data access layer for entity grouping and holder alias management
 * Provides CRUD operations for entities and entity_holders join table
 */

import { db, schema } from '../db';
import { eq, and, sql, asc } from 'drizzle-orm';

// Inferred types from schema
export type Entity = typeof schema.entities.$inferSelect;
export type EntityHolder = typeof schema.entityHolders.$inferSelect;

/**
 * Create a new entity
 * Throws PG error 23505 if name already exists (UNIQUE constraint)
 */
export async function createEntity(
  name: string,
  description?: string
): Promise<Entity> {
  const [entity] = await db
    .insert(schema.entities)
    .values({ name, description: description ?? null })
    .returning();

  return entity;
}

/**
 * Find all entities with their alias count
 * Returns all entities ordered by name with a count of linked holders
 */
export async function findAllEntities(): Promise<
  Array<{
    id: number;
    name: string;
    description: string | null;
    aliasCount: number;
    createdAt: Date;
  }>
> {
  const result = await db
    .select({
      id: schema.entities.id,
      name: schema.entities.name,
      description: schema.entities.description,
      aliasCount: sql<number>`count(${schema.entityHolders.id})`,
      createdAt: schema.entities.createdAt,
    })
    .from(schema.entities)
    .leftJoin(
      schema.entityHolders,
      eq(schema.entityHolders.entityId, schema.entities.id)
    )
    .groupBy(
      schema.entities.id,
      schema.entities.name,
      schema.entities.description,
      schema.entities.createdAt
    )
    .orderBy(asc(schema.entities.name));

  return result.map((row) => ({
    ...row,
    aliasCount: Number(row.aliasCount),
  }));
}

/**
 * Find a single entity by ID
 */
export async function findEntityById(id: number): Promise<Entity | null> {
  const [entity] = await db
    .select()
    .from(schema.entities)
    .where(eq(schema.entities.id, id))
    .limit(1);

  return entity ?? null;
}

/**
 * Find which entity owns a given holder (for conflict message)
 * Returns minimal entity info: id and name
 */
export async function findEntityByHolderId(
  holderId: number
): Promise<{ id: number; name: string } | null> {
  const [row] = await db
    .select({
      id: schema.entities.id,
      name: schema.entities.name,
    })
    .from(schema.entityHolders)
    .innerJoin(
      schema.entities,
      eq(schema.entities.id, schema.entityHolders.entityId)
    )
    .where(eq(schema.entityHolders.holderId, holderId))
    .limit(1);

  return row ?? null;
}

/**
 * Find all holder aliases for an entity
 * Returns holder details joined from holders table
 */
export async function findAliasesByEntityId(
  entityId: number
): Promise<
  Array<{
    holderId: number;
    holderName: string;
    holderType: string;
    addedAt: Date;
  }>
> {
  const result = await db
    .select({
      holderId: schema.entityHolders.holderId,
      holderName: schema.holders.canonicalName,
      holderType: schema.holders.type,
      addedAt: schema.entityHolders.createdAt,
    })
    .from(schema.entityHolders)
    .innerJoin(
      schema.holders,
      eq(schema.holders.id, schema.entityHolders.holderId)
    )
    .where(eq(schema.entityHolders.entityId, entityId))
    .orderBy(asc(schema.holders.canonicalName));

  return result;
}

/**
 * Add a holder alias to an entity
 * Inserts into entity_holders join table
 * Throws PG error 23505 if holder is already assigned to any entity
 * (UNIQUE constraint on holder_id in entity_holders)
 */
export async function addAlias(
  entityId: number,
  holderId: number
): Promise<EntityHolder> {
  const [row] = await db
    .insert(schema.entityHolders)
    .values({ entityId, holderId })
    .returning();

  return row;
}

/**
 * Remove a holder alias from an entity
 * ONLY deletes from entity_holders — never touches holders or ownership_records
 */
export async function removeAlias(
  entityId: number,
  holderId: number
): Promise<void> {
  await db
    .delete(schema.entityHolders)
    .where(
      and(
        eq(schema.entityHolders.entityId, entityId),
        eq(schema.entityHolders.holderId, holderId)
      )
    );
}

// ─── Portfolio aggregate types ──────────────────────────────────────────────

export type AliasBreakdown = {
  holderId: number;
  holderName: string;
  percentage: string; // decimal string e.g. "5.25"
  shares: number;
};

export type EntityPortfolioRow = {
  emitenId: string;
  emitenName: string;
  totalPercentage: string; // SUM as decimal string e.g. "10.50"
  totalShares: number;
  aliases: AliasBreakdown[];
};

/**
 * Find portfolio aggregate for all aliases of an entity
 * Returns one row per stock held by any alias, with combined totals and per-alias breakdowns
 * Resolved against the latest period (most recent year/month)
 * Results ordered by totalPercentage DESC; aliases within each row ordered by percentage DESC
 */
export async function findEntityPortfolio(
  entityId: number
): Promise<EntityPortfolioRow[]> {
  // Resolve the latest period
  const periodResult = await db.execute<{ id: string }>(
    sql`SELECT id FROM periods ORDER BY year DESC, month DESC LIMIT 1`
  );

  if (periodResult.rows.length === 0) {
    return [];
  }

  const targetPeriod = periodResult.rows[0].id;

  const result = await db.execute<{
    emiten_id: string;
    emiten_name: string;
    total_percentage: string;
    total_shares: string | number;
    aliases: AliasBreakdown[] | string;
  }>(
    sql`
      SELECT
        e.id            AS emiten_id,
        e.name          AS emiten_name,
        SUM(or2.ownership_percentage)::numeric(7,2)::text AS total_percentage,
        SUM(or2.shares_owned)                             AS total_shares,
        json_agg(json_build_object(
          'holderId',   h.id,
          'holderName', h.canonical_name,
          'percentage', or2.ownership_percentage::text,
          'shares',     or2.shares_owned
        ) ORDER BY or2.ownership_percentage DESC)         AS aliases
      FROM entity_holders eh
      JOIN holders        h   ON h.id  = eh.holder_id
      JOIN ownership_records or2
                              ON or2.holder_id = h.id
                             AND or2.period_id = ${targetPeriod}
      JOIN emiten         e   ON e.id  = or2.emiten_id
      WHERE eh.entity_id = ${entityId}
      GROUP BY e.id, e.name
      ORDER BY total_percentage DESC
    `
  );

  return result.rows.map((r) => ({
    emitenId: r.emiten_id,
    emitenName: r.emiten_name,
    totalPercentage: r.total_percentage,
    totalShares: Number(r.total_shares),
    aliases:
      typeof r.aliases === 'string'
        ? (JSON.parse(r.aliases) as AliasBreakdown[])
        : r.aliases,
  }));
}

// ─── Holder trigram search ───────────────────────────────────────────────────

/**
 * Search holders by trigram similarity on canonical_name
 * Uses pg_trgm % operator (similarity operator) for fuzzy matching
 * Sets threshold to 0.2 to capture partial matches
 * Returns ranked results ordered by similarity descending, limited to 20
 */
export async function searchHoldersByTrigram(
  query: string,
  limit: number = 20
): Promise<Array<{ id: number; name: string; type: string }>> {
  // Set similarity threshold for this session
  await db.execute(sql`SET pg_trgm.similarity_threshold = 0.2`);

  const result = await db.execute<{
    id: number;
    name: string;
    type: string;
  }>(
    sql`
      SELECT
        id,
        canonical_name AS name,
        type,
        similarity(canonical_name, ${query}) AS sim
      FROM holders
      WHERE canonical_name % ${query}
      ORDER BY sim DESC
      LIMIT ${limit}
    `
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    type: row.type,
  }));
}
