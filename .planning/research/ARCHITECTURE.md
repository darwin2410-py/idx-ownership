# Architecture Research

**Domain:** Entity linking and graph queries on top of existing IDX ownership database
**Researched:** 2026-03-15
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer (Next.js)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Fuzzy Search│  │  Aggregate   │  │   Graph      │           │
│  │  (holders)   │  │  View        │  │  Visualizer  │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                    │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                    API Layer (Next.js Route Handlers)            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/holders/search  /api/persons  /api/graph           │   │
│  └──────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────┤
│                    Service / Repository Layer                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ PersonService  │  │ HolderService  │  │  GraphService  │     │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘     │
│           │                   │                   │              │
├───────────┴───────────────────┴───────────────────┴──────────────┤
│                 Neon PostgreSQL (Drizzle ORM)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ ┌───────────┐  │
│  │ persons  │ │ holders  │ │ person_holders   │ │ownership_ │  │
│  │ (new)    │ │(existing)│ │ junction (new)   │ │ records   │  │
│  └──────────┘ └──────────┘ └──────────────────┘ └───────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| persons table | One row per real-world individual/entity | New table, manual admin-only inserts |
| person_holders junction | Links one person to multiple holder records | New junction table with optional notes |
| holders table | Existing — one row per unique name in PDFs | Add `trgm_gin` index; no breaking changes |
| GraphService | Fetches nodes (persons+emitens) + edges (ownership records aggregated by person) | Drizzle raw SQL with CTE |
| PersonService | CRUD for persons and their holder assignments | Drizzle typed queries |
| HolderService | Fuzzy name search using pg_trgm | Drizzle sql`` tagged template with similarity() |

---

## Schema Changes

### Existing Tables — What Changes

**holders** — add a GIN trigram index only, no column changes:
```sql
CREATE INDEX holders_canonical_name_trgm_idx
  ON holders USING GIN (canonical_name gin_trgm_ops);
```
This is backward-compatible. The existing `canonicalNameIdx` btree index stays for exact-match queries. The new GIN index handles fuzzy.

**ownership_records** — no changes. The bigint fix for `shares_owned` (already in schema.ts but the migration shows `integer`) should be corrected in this migration pass as a separate ALTER.

### New Tables

**persons** — one row per real-world person or controlling entity:
```sql
CREATE TABLE persons (
  id     serial PRIMARY KEY,
  name   text   NOT NULL UNIQUE,  -- Display name, e.g. "Prajogo Pangestu"
  notes  text,                    -- Optional background notes
  created_at timestamp NOT NULL DEFAULT now()
);
```

**person_holders** — junction table linking one person to many holders:
```sql
CREATE TABLE person_holders (
  person_id  integer NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  holder_id  integer NOT NULL REFERENCES holders(id) ON DELETE RESTRICT,
  PRIMARY KEY (person_id, holder_id),
  -- Optional: capture why this alias exists
  alias_note text
);
CREATE INDEX person_holders_holder_id_idx ON person_holders(holder_id);
CREATE INDEX person_holders_person_id_idx ON person_holders(person_id);
```

Junction design rationale:
- Composite PK prevents duplicate mappings.
- `CASCADE` on person delete removes the mapping rows but leaves holder rows intact (existing ownership_records are unaffected).
- `RESTRICT` on holder delete prevents removing a holder that has been tagged to a person without unlinking first — surfaces data integrity issues visibly.
- `alias_note` (nullable) is cheap to add now; useful later to record "same ABN", "same NPWP", "director of", etc.

### Schema Dependency Map

```
persons
  └─── person_holders ──→ holders ──→ ownership_records ──→ emiten
                                                         ──→ periods
```

No existing FK chain is modified. The new tables hang off the side of `holders`.

---

## Recommended Project Structure

```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts          # Add persons + person_holders tables here
│   │   ├── index.ts           # No change needed
│   │   └── migrate.ts         # No change needed
│   ├── repositories/
│   │   ├── ownership-repository.ts   # Existing
│   │   ├── person-repository.ts      # New: CRUD for persons + junction
│   │   └── holder-repository.ts      # New: fuzzy search, list unlinked
│   ├── services/
│   │   ├── import-service.ts         # Existing
│   │   ├── person-service.ts         # New: aggregate logic, graph data
│   │   └── graph-service.ts          # New: node+edge query
│   └── types/
│       ├── pdf-data.ts               # Existing
│       └── graph.ts                  # New: GraphNode, GraphEdge types
├── app/
│   ├── api/
│   │   ├── holders/
│   │   │   └── search/route.ts       # Fuzzy search endpoint
│   │   ├── persons/
│   │   │   ├── route.ts              # List + create persons
│   │   │   └── [id]/
│   │   │       ├── route.ts          # Get/update/delete person
│   │   │       └── holders/route.ts  # Manage holder assignments
│   │   └── graph/
│   │       └── route.ts              # Graph nodes+edges for period
│   └── (pages)
drizzle/
│   ├── 0000_smart_maddog.sql         # Existing v1 migration
│   ├── 0001_entity_linking.sql       # New: persons + person_holders
│   └── 0002_trgm_extension.sql       # New: CREATE EXTENSION + GIN index
```

### Structure Rationale

- **Separate `person-repository.ts` and `holder-repository.ts`**: The holder repository gains fuzzy-search responsibility without polluting the ownership import path. Person repository stays focused on entity management only.
- **`graph-service.ts` separate from `person-service.ts`**: Graph queries are read-heavy, potentially complex CTEs, and will likely need tuning. Isolating them makes profiling easier.
- **Two migration files (0001 + 0002)**: `CREATE EXTENSION` is a superuser-level DDL; keeping it separate allows running it once against a shared Neon instance without bundling it into schema migrations that may be replayed.

---

## Architectural Patterns

### Pattern 1: Junction Table for Person-to-Holder Grouping

**What:** A `person_holders` join table with composite PK stores the many-to-many relationship between persons (real entities) and holders (PDF name strings).

**When to use:** When one real-world entity appears under multiple distinct name strings across different PDFs or time periods. The junction table lets you assign or remove aliases without touching ownership_records.

**Trade-offs:** Slightly more JOINs in queries; but allows the grouping to be built and edited incrementally without any data migration of historical records.

**Example — list all holders assigned to a person:**
```typescript
const rows = await db
  .select({ holderId: personHolders.holderId, canonicalName: holders.canonicalName })
  .from(personHolders)
  .innerJoin(holders, eq(personHolders.holderId, holders.id))
  .where(eq(personHolders.personId, personId));
```

### Pattern 2: pg_trgm GIN Index for Fuzzy Search

**What:** Enable `pg_trgm` extension, create a GIN index on `holders.canonical_name`, and use the `%` similarity operator in queries.

**When to use:** For the "find holder by partial name" UI. pg_trgm handles Indonesian corporate name fragments well (e.g. "DANANTARA", "ASTRA", partial spellings from truncated PDFs).

**Trade-offs:**
- GIN index adds ~20% storage on the holders table. At the current scale (likely < 10K unique holder names), this is negligible.
- Similarity threshold (default 0.3) may need tuning for Indonesian names — test with `SET pg_trgm.similarity_threshold = 0.2`.
- Application-level fuzzy (fuse.js) is an alternative but requires loading all holder names into memory on each serverless cold start. Not recommended for this use case.

**Example query pattern (using Drizzle sql tag):**
```typescript
import { sql } from 'drizzle-orm';

const results = await db.execute(sql`
  SELECT id, canonical_name, type,
         similarity(canonical_name, ${query}) AS score
  FROM   holders
  WHERE  canonical_name % ${query}
  ORDER  BY score DESC
  LIMIT  20
`);
```

**Migration — must run before any schema migration that uses trgm indexes:**
```sql
-- 0002_trgm_extension.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX holders_canonical_name_trgm_idx
  ON holders USING GIN (canonical_name gin_trgm_ops);
```

Confidence: HIGH — pg_trgm is a standard bundled Postgres extension. Neon official docs confirm it is supported and enabled via `CREATE EXTENSION IF NOT EXISTS pg_trgm`. [Source: https://neon.com/docs/extensions/pg_trgm]

### Pattern 3: Aggregate Ownership via Group-by JOIN

**What:** Sum ownership percentages across all holders linked to the same person for a given emiten+period combination.

**When to use:** The "aggregate view" feature — person X owns 12% of TLKM via 3 different entities.

**Trade-offs:** This is a read-time aggregation, not stored. At current scale it is fast enough; if performance degrades later, a materialized view or cached JSON column is the next step.

**Example CTE pattern:**
```sql
SELECT
  p.id          AS person_id,
  p.name        AS person_name,
  e.id          AS emiten_id,
  o.period_id,
  SUM(o.shares_owned)         AS total_shares,
  SUM(o.ownership_percentage) AS total_pct
FROM persons p
JOIN person_holders ph ON ph.person_id = p.id
JOIN holders h         ON h.id = ph.holder_id
JOIN ownership_records o ON o.holder_id = h.id
JOIN emiten e          ON e.id = o.emiten_id
WHERE o.period_id = $1
GROUP BY p.id, p.name, e.id, o.period_id
ORDER BY total_pct DESC;
```

### Pattern 4: Graph Data as Nodes + Edges from SQL

**What:** Produce a graph payload (for a visualization library like react-force-graph or D3) directly from a SQL query. Persons and emitens are nodes; aggregate ownership relationships are edges.

**When to use:** The network visualization feature.

**Trade-offs:** A pure Postgres approach (two queries: one for nodes, one for edges) is simpler than recursive CTEs here because the ownership graph is not hierarchical — it is bipartite (persons ↔ emitens, no person-to-person edges needed at this stage).

**Two-query approach (recommended over single complex CTE):**

Query 1 — nodes:
```sql
-- Person nodes
SELECT 'person' AS node_type, p.id::text AS id, p.name AS label
FROM   persons p
UNION ALL
-- Emiten nodes that appear in this period
SELECT 'emiten', e.id, e.name
FROM   emiten e
WHERE  EXISTS (
  SELECT 1 FROM ownership_records o WHERE o.emiten_id = e.id AND o.period_id = $1
);
```

Query 2 — edges (aggregate per person+emiten):
```sql
SELECT
  p.id::text  AS source,
  e.id        AS target,
  SUM(o.ownership_percentage)::float AS weight
FROM persons p
JOIN person_holders ph ON ph.person_id = p.id
JOIN ownership_records o ON o.holder_id = ph.holder_id
JOIN emiten e ON e.id = o.emiten_id
WHERE o.period_id = $1
GROUP BY p.id, e.id
HAVING SUM(o.ownership_percentage) > 0;
```

The API route `/api/graph?period=2026-02` merges both results into `{ nodes: [...], edges: [...] }` before returning to the client.

---

## Data Flow

### Fuzzy Search Flow

```
User types "DANANTARA" in search box
    ↓
Debounced fetch → GET /api/holders/search?q=DANANTARA
    ↓
HolderRepository.fuzzySearch(q)
    → SELECT ... FROM holders WHERE canonical_name % $1 ORDER BY similarity DESC
    ↓
Returns: [{ id, canonicalName, type, alreadyLinked: boolean }]
    ↓
UI shows list; user clicks "Link to person" → POST /api/persons/:id/holders
```

### Entity Grouping Admin Flow

```
Admin navigates to /admin/persons
    ↓
Creates new person (name, notes) → POST /api/persons
    ↓
Searches for holder aliases → GET /api/holders/search?q=...
    ↓
Links each holder to person → POST /api/persons/:id/holders { holderId }
    → INSERT INTO person_holders (person_id, holder_id)
    ↓
Aggregate view auto-updates (read-time join, no extra step)
```

### Aggregate / Graph Read Flow

```
User opens /emiten/TLKM
    ↓
Page fetches GET /api/graph?period=2026-02&emiten=TLKM
    ↓
GraphService.getGraphForPeriod(period, emitenFilter?)
    → Run nodes query + edges query (two parallel db.execute calls)
    ↓
Merge into { nodes, edges }; return as JSON
    ↓
react-force-graph (or D3) renders network diagram
```

---

## Migration Approach (Drizzle + Neon)

### Recommended: Generate + Custom Migration Combo

The project already uses `drizzle-kit generate` + `src/lib/db/migrate.ts`. The entity linking milestone requires:

1. **Schema changes** (generated automatically): Add `persons` and `person_holders` tables to `schema.ts`, then run `npm run db:generate`. Drizzle Kit diffs the schema and produces `0001_entity_linking.sql`.

2. **Extension + index** (custom migration): Run `npx drizzle-kit generate --custom --name=trgm_extension` to get an empty `0002_trgm_extension.sql`. Manually add:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX IF NOT EXISTS holders_canonical_name_trgm_idx
     ON holders USING GIN (canonical_name gin_trgm_ops);
   ```

3. **Apply**: `npm run db:migrate` runs both in sequence.

### Important: Migration Ordering

The `CREATE EXTENSION` SQL must run before any query that uses `gin_trgm_ops` or the `%` operator. Since both are in separate migration files and drizzle-kit applies them in filename order, the naming `0002_trgm_extension` ensures it runs after the table creation in `0001`.

### Important: neon-http driver limitation

The existing codebase notes that `neon-http` driver does not support transactions. This is fine for schema migrations — each `-->statement-breakpoint` in generated SQL runs as independent statements. No change needed to `migrate.ts`.

For local dev using `db:push` (`drizzle-kit push`) — this works fine for iterating on schema but **skips the custom migration file** containing `CREATE EXTENSION`. Always run `db:migrate` in production, and run the extension SQL manually once in local dev:
```bash
# One-time local setup
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

---

## Anti-Patterns

### Anti-Pattern 1: Storing Aggregated Ownership on the Person Row

**What people do:** Add `total_shares` and `total_pct` columns to the `persons` table and update them on every import.

**Why it's wrong:** These values are period-specific. A person's "total ownership" changes every month. Storing it denormalized means stale data between imports and complex update logic in the import pipeline.

**Do this instead:** Compute aggregations at read time via the GROUP BY join pattern (Pattern 3). For the current data scale (monthly updates, hundreds of persons, thousands of records), read-time aggregation is fast enough.

### Anti-Pattern 2: Using Application-Level Fuzzy Search (fuse.js) Instead of pg_trgm

**What people do:** Load all holder canonical names into memory on the API route, run fuse.js similarity, return matches.

**Why it's wrong:** Neon serverless function cold starts with a full holder table scan (even cached) is wasteful. It also means the search behavior depends on client-side library config rather than database-level indexing. pg_trgm GIN index scales to millions of rows; fuse.js in a serverless function does not.

**Do this instead:** Enable pg_trgm, create the GIN index, use the `%` operator in a parameterized query. The index makes it sub-10ms at any realistic holder count.

### Anti-Pattern 3: Putting person_id Directly on the holders Table

**What people do:** Add a nullable `person_id` FK column to `holders` instead of a junction table.

**Why it's wrong:** A holder name cannot belong to two persons (no many-to-many). But more critically, adding a column to `holders` requires an ALTER TABLE on a table that may already have thousands of rows and is actively used by the import pipeline. It also conflates the extraction-time concept (a holder name from a PDF) with the editorial concept (a person grouping). They should remain separate.

**Do this instead:** Use the `person_holders` junction table. It adds zero changes to existing tables and is reversible without touching ownership_records.

### Anti-Pattern 4: Recursive CTE for Ownership Graph

**What people do:** Model the ownership graph as a recursive traversal (AGE extension, recursive CTE with depth).

**Why it's wrong:** The ownership data here is bipartite — persons own emitens, emitens don't own persons (at this milestone scope). Recursive CTEs add complexity with no benefit for a two-level graph. They also complicate the Drizzle ORM integration since recursive CTEs require raw SQL.

**Do this instead:** Two simple SELECT queries (nodes + edges) joined in the service layer. Add recursion only if the scope expands to model company-owns-company relationships.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Neon PostgreSQL | `neon-http` driver via `@neondatabase/serverless` | Already in use. No driver change needed for new tables. |
| Drizzle ORM | Schema-first: add tables to schema.ts, run generate | Use `db.execute(sql\`...\`)` for pg_trgm queries |
| Vercel Edge Functions | No change | Graph endpoint may need `maxDuration` if the graph is large |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Import pipeline → person grouping | None (import does not touch persons/person_holders) | Person grouping is purely editorial, post-import |
| Person service → Holder repository | Direct Drizzle query | HolderService.fuzzySearch() is stateless; no shared state |
| Graph service → DB | Two raw SQL queries merged in service layer | Keep graph query logic in service, not in route handler |

---

## Build Order (Dependency-Aware)

The milestone has five deliverables with hard dependencies:

```
Step 1: Schema migration
  → Create persons + person_holders tables
  → Enable pg_trgm + GIN index on holders
  → Must be FIRST — everything else depends on it

Step 2: Fix PDF parsing (holder name truncation)
  → Independent of entity linking tables
  → Should be SECOND — fixes dirty data before grouping is done
  → If done after grouping, some aliases may already be wrong names

Step 3: Person + Holder management API + admin UI
  → Depends on Step 1 (tables exist)
  → Fuzzy search endpoint uses pg_trgm from Step 1
  → Can start in parallel with Step 2

Step 4: Aggregate ownership view
  → Depends on Step 3 (persons must exist to aggregate)
  → Simple GROUP BY query added to existing emiten/holder pages

Step 5: Graph visualization
  → Depends on Step 4 (needs persons linked to meaningful data)
  → Most complex frontend work; keep for last
```

Summary table:

| Step | Deliverable | Depends On | Blocks |
|------|-------------|------------|--------|
| 1 | Schema migration | — | 3, 4, 5 |
| 2 | PDF parsing fix | — | data quality for 3+ |
| 3 | Person/holder management | 1 | 4, 5 |
| 4 | Aggregate view | 3 | 5 |
| 5 | Graph visualization | 4 | — |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (< 5K holders, < 500 persons) | Read-time aggregation, GIN index, no caching needed |
| 10K–50K holders | GIN index still sufficient; consider pg_trgm threshold tuning |
| Graph with 1K+ persons | Add pagination/filtering to graph endpoint; full graph render will be slow in browser |
| Graph with company-owns-company | Add recursive CTE or consider Apache AGE extension; out of current scope |

### Scaling Priorities

1. **First bottleneck:** Browser rendering of graph with >200 nodes. Fix with server-side filtering (show only top N persons by total ownership, or filter by emiten).
2. **Second bottleneck:** Aggregate query at high holder count. Fix with a materialized view refreshed on import completion.

---

## Sources

- Neon pg_trgm docs (HIGH confidence): https://neon.com/docs/extensions/pg_trgm
- Drizzle custom migrations (HIGH confidence): https://orm.drizzle.team/docs/kit-custom-migrations
- Drizzle migrations with Neon (HIGH confidence): https://neon.com/docs/guides/drizzle-migrations
- Neon graph DB guide (MEDIUM confidence): https://neon.com/guides/graph-db
- Postgres graph queries with CTE (MEDIUM confidence): https://www.sheshbabu.com/posts/graph-retrieval-using-postgres-recursive-ctes/
- Many-to-many junction table pattern (HIGH confidence — standard SQL): https://www.beekeeperstudio.io/blog/many-to-many-database-relationships-complete-guide

---

*Architecture research for: IDX Ownership Visualizer v1.1 — Entity Linking & Graph*
*Researched: 2026-03-15*
