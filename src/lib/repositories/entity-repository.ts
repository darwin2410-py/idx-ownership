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
