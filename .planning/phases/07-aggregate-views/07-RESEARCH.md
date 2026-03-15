# Phase 7: Aggregate Views - Research

**Researched:** 2026-03-15
**Domain:** PostgreSQL aggregate queries + Next.js Server Components + TanStack Table expand/collapse
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGGR-01 | Entity Profile Page — `/entities/[id]` shows all stocks held via aliases with combined % and shares, breakdown per alias, sortable by total % | Repository function `findEntityPortfolio(entityId)` using GROUP BY JOIN across entity_holders + ownership_records; TanStack Table with expandable rows for per-alias breakdown |
| AGGR-02 | Stock Detail Page shows entity aggregate row above individual alias rows when multiple aliases of the same entity hold the stock | New repository function `findOwnershipByStockWithEntityContext(emitenId)` that annotates each row with entityId/entityName and injects synthetic entity-aggregate rows; StockDetailComparison receives enriched data |

</phase_requirements>

---

## Summary

Phase 7 builds two aggregate views on top of the entity grouping schema established in Phase 6. The core data work is standard PostgreSQL GROUP BY with JOINs across `entity_holders`, `holders`, `ownership_records`, and `emiten` — no schema changes needed. Both queries are computed at read time (no materialized views required at this data scale).

The entity profile page (`/entities/[id]`) currently shows only aliases (plain table). Phase 7 upgrades it to show a portfolio table: one row per emiten held by any alias, with summed % and shares, plus an expandable detail showing which aliases contribute. The stock detail page (`/stocks/[code]`) needs its raw holder list enriched: alias rows get annotated with their entity, and synthetic "entity aggregate" rows are injected above each group of aliases.

No new npm packages are needed. TanStack Table 8.x already installed supports `getExpandedRowModel()` for expand/collapse. Next.js `revalidatePath()` already used in the entity API routes handles cache invalidation. The pattern for enriched data flowing from a Server Component to a Client Table component already exists (see `StockDetailComparison`).

**Primary recommendation:** Add two repository functions, one new server-side query utility, and two new/modified client components. No schema migrations, no new npm installs.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.36.0 | ORM for aggregate queries | Already the project ORM; `sql` tagged template for raw GROUP BY |
| @neondatabase/serverless | ^0.10.4 | Neon HTTP driver | Already in use; `db.execute(sql`...`)` for complex aggregates |
| @tanstack/react-table | ^8.21.3 | Expandable rows on entity portfolio table | `getExpandedRowModel()` built-in, client-side expand without new deps |
| next | ^15.0.0 | Server Components, `revalidatePath()` | Server-first data fetching already established |
| tailwindcss | ^3.4.0 | Row styling: entity aggregate rows need visual distinction | Already the styling system |

### No New Packages Required

All required functionality is covered by installed dependencies. Specifically:

- TanStack Table 8.x ships `getExpandedRowModel` and `getSubRows` — no separate tree-table library needed
- `revalidatePath()` is a Next.js built-in — no separate cache library needed
- Drizzle `sql` template handles `SUM()`, `GROUP BY`, sub-selects without raw pg client

---

## Architecture Patterns

### Recommended File Changes

```
src/lib/repositories/
├── entity-repository.ts          # ADD: findEntityPortfolio()
└── ownership-repository.ts       # ADD: findOwnershipByStockWithEntityContext()

src/app/entities/[id]/
└── page.tsx                      # MODIFY: call findEntityPortfolio(), render EntityPortfolioTable

src/app/stocks/[code]/
└── page.tsx                      # MODIFY: call findOwnershipByStockWithEntityContext() instead of findOwnershipByStockWithHolders()

src/components/
├── entity-portfolio-table.tsx    # NEW: expandable entity portfolio, sortable by total %
└── stock-detail-comparison.tsx   # MODIFY: accept enriched rows with entityId/entityName, inject aggregate rows
```

### Pattern 1: Entity Portfolio Query (GROUP BY JOIN)

**What:** Single SQL query that walks entity_holders -> holders -> ownership_records -> emiten, groups by emiten, sums percentages and shares.

**When to use:** AGGR-01 — entity profile page.

**Query shape (Drizzle sql template):**
```typescript
// In entity-repository.ts
export async function findEntityPortfolio(
  entityId: number,
  periodId?: string
): Promise<EntityPortfolioRow[]> {
  // Resolve period as in existing ownership-repository pattern
  const targetPeriod = periodId ?? (await resolveLatestPeriod());

  const rows = await db.execute<{
    emiten_id: string;
    emiten_name: string;
    total_percentage: string;
    total_shares: string;
    aliases: string; // JSON array of alias breakdowns
  }>(sql`
    SELECT
      e.id            AS emiten_id,
      e.name          AS emiten_name,
      SUM(or2.ownership_percentage)::numeric(7,2) AS total_percentage,
      SUM(or2.shares_owned)                        AS total_shares,
      json_agg(json_build_object(
        'holderId',   h.id,
        'holderName', h.canonical_name,
        'percentage', or2.ownership_percentage,
        'shares',     or2.shares_owned
      ) ORDER BY or2.ownership_percentage DESC)    AS aliases
    FROM entity_holders eh
    JOIN holders        h   ON h.id  = eh.holder_id
    JOIN ownership_records or2
                            ON or2.holder_id  = h.id
                           AND or2.period_id  = ${targetPeriod}
    JOIN emiten         e   ON e.id  = or2.emiten_id
    WHERE eh.entity_id = ${entityId}
    GROUP BY e.id, e.name
    ORDER BY total_percentage DESC
  `);

  return rows.rows.map(r => ({
    emitenId:        r.emiten_id,
    emitenName:      r.emiten_name,
    totalPercentage: r.total_percentage,
    totalShares:     Number(r.total_shares),
    aliases:         JSON.parse(r.aliases as unknown as string),
  }));
}
```

**Confidence:** HIGH — standard PostgreSQL pattern; `json_agg` + `json_build_object` are Neon-supported built-ins.

### Pattern 2: Stock Holders Enriched with Entity Context

**What:** Existing `findOwnershipByStockWithHolders()` extended to LEFT JOIN entity_holders and entities, returning entityId and entityName per row. The page (or a helper) then sorts and injects synthetic aggregate rows.

**When to use:** AGGR-02 — stock detail page.

**Return type extension:**
```typescript
// Each row gets two optional fields added
type HolderRowWithEntity = {
  rank: number;
  holderId: number;           // NEW — needed to match entity_holders
  holderName: string;
  holderType: string;
  sharesOwned: number;
  ownershipPercentage: string;
  periodId: string;
  entityId: number | null;    // NEW
  entityName: string | null;  // NEW
};
```

**Query extension (add LEFT JOINs to existing query):**
```sql
LEFT JOIN entity_holders eh ON eh.holder_id = holders.id
LEFT JOIN entities        en ON en.id        = eh.entity_id
```
Add `holderId`, `entityId`, `entityName` to `.select({...})`.

### Pattern 3: Aggregate Row Injection (client-side, zero DB round trips)

**What:** A pure TypeScript function that takes `HolderRowWithEntity[]` and returns a display list with synthetic entity-aggregate rows inserted above their alias groups.

**Why client-side:** The stock detail page already uses a Client Component (`StockDetailComparison`) that receives the full holder list. Injecting aggregate rows in the same component keeps DB calls at 1 and avoids a second fetch.

```typescript
type DisplayRow =
  | { kind: 'entity'; entityId: number; entityName: string; totalPct: number; totalShares: number }
  | { kind: 'holder'; data: HolderRowWithEntity };

function buildDisplayRows(holders: HolderRowWithEntity[]): DisplayRow[] {
  // Group by entityId; ungrouped holders (entityId === null) pass through as-is
  // For each entity group: insert entity aggregate row first, then alias rows
  // Ungrouped holders sort by rank
}
```

This is a pure function — easy to unit-test without DB.

### Pattern 4: Expandable Rows — TanStack Table getExpandedRowModel

**What:** EntityPortfolioTable uses TanStack's built-in row expansion to show/hide per-alias breakdown.

**Key TanStack Table APIs (v8, already installed):**
```typescript
import { getExpandedRowModel } from '@tanstack/react-table';

const table = useReactTable({
  data,
  columns,
  state: { expanded },
  onExpandedChange: setExpanded,
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),   // built-in
  getSubRows: (row) => row.aliases,              // nested data
});
```

The aliases array from `findEntityPortfolio` maps directly to `getSubRows`.

**Confidence:** HIGH — `getExpandedRowModel` ships in @tanstack/react-table 8.x. No extra install.

### Pattern 5: Cache Invalidation after Alias Changes

**What:** When a user adds/removes an alias (via existing API routes), the entity portfolio and affected stock pages need revalidation.

**Existing pattern** (Phase 6 already uses `revalidatePath('/entities')`):
```typescript
// In /api/entities/[id]/aliases/route.ts — already calls revalidatePath
// EXTEND to also invalidate:
revalidatePath(`/entities/${entityId}`);   // entity portfolio
// For AGGR-02, stock pages: revalidatePath(`/stocks/${stockCode}`) per affected stock
```

**Consideration:** Invalidating every `/stocks/[code]` page when an alias changes is impractical (could be many stocks). Use `revalidatePath('/stocks', 'layout')` or set `export const revalidate = 0` on the stock detail page. The stock detail page currently has `export const revalidate = 3600`. For Phase 7, change this to `0` (always fresh) given entity group data can change, or alternatively tag the entity data with a separate cache tag.

**Recommended approach:** Set `export const revalidate = 0` on `/stocks/[code]/page.tsx` (already set to 0 on entity detail page). This is the simplest correct solution at this scale.

### Anti-Patterns to Avoid

- **Materializing aggregates in a separate table:** Unnecessary complexity at current data scale (7253 records). GROUP BY at read time is fast enough.
- **Two separate DB calls for entity portfolio (one for totals, one for aliases):** The `json_agg` pattern combines both into one round trip.
- **Adding `holderId` to the existing `findOwnershipByStockWithHolders` return type mid-stream:** Better to add a new function `findOwnershipByStockWithEntityContext` that extends the select without changing existing callers.
- **Rendering entity aggregate rows as separate TanStack Table rows without a kind discriminator:** Mixing row types in TanStack Table requires a discriminator (`kind: 'entity' | 'holder'`) or the cell renderers cannot distinguish them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Expand/collapse table rows | Custom accordion HTML | TanStack `getExpandedRowModel` + `getSubRows` | Already installed; handles keyboard, aria, state out of the box |
| Per-entity total aggregation | JavaScript reduce over holder list | PostgreSQL `SUM() GROUP BY` in `findEntityPortfolio` | DB aggregation is correct for decimal precision; JS float addition loses precision on 7000+ records |
| Cache invalidation on entity change | setTimeout or polling | `revalidatePath()` from `next/cache` | Already used in Phase 6 API routes; zero additional code |

**Key insight:** The entire aggregate logic is two SQL GROUP BY queries and one pure TypeScript sort/inject function. Nothing complex enough to justify a library.

---

## Common Pitfalls

### Pitfall 1: Decimal Precision Loss When Summing Percentages in JavaScript

**What goes wrong:** Summing `ownershipPercentage` strings in JavaScript: `"5.50" + "3.25"` via `parseFloat()` can produce floating point drift (e.g., `8.749999999999998`).

**Why it happens:** IEEE 754 float arithmetic. `5.50 + 3.25` in JS = `8.75` (fine), but accumulating many fractional percentages can drift.

**How to avoid:** Perform the SUM in PostgreSQL where DECIMAL/NUMERIC arithmetic is exact. The `findEntityPortfolio` query uses `SUM(ownership_percentage)::numeric(7,2)` so the result is already a correctly rounded string.

**Warning signs:** Entity total percentage shows 8.749999999999998% in the UI.

### Pitfall 2: Entity Aggregate Row Appearing Twice (Double-Counting)

**What goes wrong:** If `buildDisplayRows` is called before or after a filter/sort, entity rows might be regenerated or duplicated.

**Why it happens:** Calling `buildDisplayRows` inside `useMemo` with the wrong dependency array, or calling it again inside TanStack Table's sort pipeline.

**How to avoid:** Call `buildDisplayRows` once in the Server Component (or in a stable `useMemo`) before passing data to TanStack Table. Do not make TanStack Table's sort operate on the injected aggregate rows alongside holder rows — aggregate rows should float to the top of their group regardless of sort.

**Warning signs:** An entity name appears as both an aggregate row and a regular holder row.

### Pitfall 3: Stock Detail Page Shows Entity Rows for Stocks with No Entity Grouping

**What goes wrong:** The enriched query LEFT JOINs entities. If the join or the `buildDisplayRows` function has a bug, ungrouped holders (entityId = null) might be assigned a synthetic entity row.

**Why it happens:** Off-by-one in the grouping filter: `if (entityId !== null)` vs `if (entityId)` — both fail on entityId = 0, but 0 is not a valid serial PK so `if (entityId !== null)` is correct.

**How to avoid:** Use `!== null` not `!` for entityId checks. Write a unit test for `buildDisplayRows` with a mix of grouped and ungrouped holders.

**Warning signs:** Stocks with no entity grouping suddenly show an entity row labeled "undefined".

### Pitfall 4: N+1 Query in Entity Portfolio

**What goes wrong:** Fetching all aliases then fetching ownership records per alias in a loop.

**Why it happens:** Natural "for each alias, get their stocks" thinking.

**How to avoid:** The `findEntityPortfolio` single-query pattern with `json_agg` is the solution. One query, one round trip.

**Warning signs:** Entity portfolio page is slow (>500ms) when entity has many aliases.

### Pitfall 5: Stale Stock Detail Page After Alias Add/Remove

**What goes wrong:** User adds a new alias in `/entities/[id]`, navigates to the affected `/stocks/[code]` page, but the aggregate row is missing or shows old data.

**Why it happens:** The stock detail page has `export const revalidate = 3600`. Neon + Next.js caches the page for 1 hour.

**How to avoid:** Change `/stocks/[code]/page.tsx` to `export const revalidate = 0`. This page is already fast (single DB query, not a heavy page).

**Warning signs:** After adding an alias, the stock detail page still shows the old holder list without an entity aggregate row.

---

## Code Examples

Verified patterns from existing codebase:

### Existing: db.execute for raw SQL (entity-repository.ts)

```typescript
// Source: src/lib/repositories/entity-repository.ts lines 185-203
const result = await db.execute<{
  id: number;
  name: string;
  type: string;
}>(
  sql`
    SELECT id, canonical_name AS name, type, ...
    FROM holders
    WHERE canonical_name % ${query}
    ORDER BY sim DESC
    LIMIT ${limit}
  `
);
return result.rows.map((row) => ({ ... }));
```

### Existing: LEFT JOIN pattern (ownership-repository.ts)

```typescript
// Source: src/lib/repositories/ownership-repository.ts lines 304-356
const result = await db
  .select({
    rank: schema.ownershipRecords.rank,
    holderName: schema.holders.canonicalName,
    ...
  })
  .from(schema.ownershipRecords)
  .innerJoin(schema.holders, eq(schema.holders.id, schema.ownershipRecords.holderId))
  .where(and(
    eq(schema.ownershipRecords.emitenId, emitenId),
    eq(schema.ownershipRecords.periodId, targetPeriod)
  ))
  .orderBy(schema.ownershipRecords.rank);
```

**For AGGR-02:** Add LEFT JOINs for entity_holders and entities to this pattern.

### Existing: revalidatePath pattern (inferred from Phase 6 API routes)

```typescript
// Pattern already used in /api/entities/[id]/aliases/route.ts
import { revalidatePath } from 'next/cache';
revalidatePath('/entities');
// EXTEND Phase 7: also call revalidatePath(`/entities/${entityId}`)
```

### Existing: expandable component pattern (holdings-table.tsx structure)

TanStack Table in this codebase always follows: `useReactTable` with state object + `getCoreRowModel`. For expandable rows, add:
```typescript
import { getExpandedRowModel } from '@tanstack/react-table';
// Add to useReactTable config:
getExpandedRowModel: getExpandedRowModel(),
getSubRows: (row) => row.aliases,
state: { ..., expanded },
onExpandedChange: setExpanded,
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Materialize aggregate in DB (view/trigger) | Compute at read time via GROUP BY | N/A — never needed at this data scale | Simpler, no migration needed |
| Client-side float sum | DB-side NUMERIC SUM | N/A | Precision safety |
| Separate expand library (react-collapsed) | TanStack Table getExpandedRowModel | TanStack Table v8+ | No new dep needed |

---

## Open Questions

1. **Should entity aggregate rows on the stock detail page be expandable inline?**
   - What we know: AGGR-02 acceptance criteria says "alias individual tetap tampil di bawahnya (collapsible atau indent)" — collapsible OR indent are both acceptable.
   - What's unclear: Whether to implement expand/collapse (adds complexity) or always-visible indent.
   - Recommendation: Use always-visible indent (indented rows below entity row) for the stock detail page. Reserve expand/collapse for the entity portfolio page (AGGR-01) where it adds more value. This matches "collapsible atau indent" criterion.

2. **Period selection on entity portfolio page**
   - What we know: The entity portfolio page must show ownership data for a specific period. All other data pages use the latest period by default.
   - What's unclear: Whether the entity portfolio needs a period selector UI (like `/dashboard` has `PeriodFilter`).
   - Recommendation: Use latest period by default, no period selector for now (AGGR-01 acceptance criteria does not mention period selection). This keeps scope tight.

3. **Sorting entity aggregate rows vs alias rows on stock detail**
   - What we know: The stock detail page uses server-side sorting via URL params + TanStack Table manualSorting.
   - What's unclear: Should entity aggregate rows participate in rank-based sorting, or always float above their aliases?
   - Recommendation: Entity aggregate rows always appear above their aliases, regardless of sort column. Sort applies to the alias sub-rows and to ungrouped holders. This is the UX stated in AGGR-02 ("ditampilkan di atas baris alias").

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config, no vitest.config, no pytest.ini found) |
| Config file | None — Wave 0 gap |
| Quick run command | `npx tsc --noEmit` (type-check only, available now) |
| Full suite command | `npm run build` (build-time type check + Next.js route validation) |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGGR-01 | `findEntityPortfolio` returns correct SUM of percentages and shares across aliases | unit | manual verify via `npm run build` + spot-check | No test file |
| AGGR-01 | Entity portfolio page renders expandable rows | smoke | `npm run build` exits 0 | N/A |
| AGGR-02 | `buildDisplayRows` injects entity aggregate rows above aliases, passes through ungrouped holders unchanged | unit | manual verify | No test file |
| AGGR-02 | Stock detail page renders entity rows when aliases exist, unchanged for stocks without entity grouping | smoke | `npm run build` exits 0 | N/A |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit` (type safety, fast)
- **Per wave merge:** `npm run build` (full Next.js build validation)
- **Phase gate:** `npm run build` exits 0 before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test runner installed — `buildDisplayRows` pure function is the prime unit-testable artifact but has no test harness. Given project has no existing test infrastructure, **do not block implementation on installing a test framework**. Manual verification via `npm run build` and browser spot-check is the pragmatic gate.

---

## Sources

### Primary (HIGH confidence)

- Codebase — `src/lib/repositories/entity-repository.ts` — confirmed db.execute + sql template pattern, confirmed entity_holders schema
- Codebase — `src/lib/repositories/ownership-repository.ts` — confirmed LEFT JOIN extension point (findOwnershipByStockWithHolders), confirmed period resolution pattern
- Codebase — `src/lib/db/schema.ts` — confirmed all table shapes (entities, entity_holders, holders, ownership_records, emiten)
- Codebase — `src/components/holders-table.tsx` — confirmed TanStack Table 8.x usage pattern in this project
- Codebase — `src/app/stocks/[code]/page.tsx` — confirmed `revalidate = 3600` (needs change to `0`)
- Codebase — `src/app/entities/[id]/page.tsx` — confirmed `revalidate = 0` and existing page structure to extend
- `package.json` — confirmed `@tanstack/react-table ^8.21.3` installed, no test runner present

### Secondary (MEDIUM confidence)

- TanStack Table v8 docs (training knowledge) — `getExpandedRowModel`, `getSubRows` API verified against installed version 8.21.x
- PostgreSQL docs (training knowledge) — `json_agg`, `json_build_object`, `SUM()::numeric` syntax confirmed as standard Neon-supported PostgreSQL

### Tertiary (LOW confidence)

- None — all key facts verified from codebase directly.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json
- Architecture: HIGH — all patterns derived from existing codebase code, not speculation
- Pitfalls: HIGH — precision, double-counting, and stale cache are direct consequences of the schema and existing code patterns

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable stack; Neon/Drizzle APIs are stable)
