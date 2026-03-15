---
phase: 06-entity-data-model-and-management
plan: "01"
subsystem: database
tags: [drizzle-orm, neon, postgres, pg_trgm, cmdk, schema, entity-grouping]

# Dependency graph
requires:
  - phase: 05-pdf-fix-and-data-quality
    provides: clean holders table with 7253 records and correct canonical names
provides:
  - entities table (id, name unique, description, created_at) in Neon PostgreSQL
  - entity_holders join table (id, entity_id FK cascade, holder_id FK restrict, UNIQUE holder_id, created_at) in Neon PostgreSQL
  - UNIQUE(holder_id) constraint preventing a holder from belonging to more than one entity
  - pg_trgm extension enabled with GIN index on holders.canonical_name for fuzzy search
  - cmdk package installed for entity grouping UI in later plans
affects:
  - 06-02-entity-management-ui
  - 06-03-entity-api
  - 07-aggregate-views

# Tech tracking
tech-stack:
  added:
    - cmdk@1.1.1 (shadcn Command combobox primitive for entity search UI)
  patterns:
    - Join table pattern for entity-to-holder M:1 grouping with UNIQUE(holder_id) at DB level
    - Direct SQL via neon client for DDL operations that drizzle-kit prompts on (existing data constraints)
    - Migration scripts in scripts/ directory for one-time DB setup operations

key-files:
  created:
    - scripts/enable-trgm.ts
    - scripts/create-entity-tables.ts
    - scripts/check-tables.ts
    - scripts/verify-trgm.ts
  modified:
    - src/lib/db/schema.ts
    - package.json
    - package-lock.json

key-decisions:
  - "Direct SQL via neon client used for DDL (not drizzle-kit push) because drizzle-kit push triggered interactive TTY prompt about unique_period_emiten_holder constraint rename on existing 7253-row table — non-interactive CI environment cannot respond to TTY prompts"
  - "entities.id is SERIAL PK (not UUID) for consistency with holders.id pattern already in schema"
  - "entity_holders.entity_id uses ON DELETE CASCADE so deleting an entity removes all its holder links; holder_id uses ON DELETE RESTRICT to prevent orphan entity_holders when a holder is deleted"

patterns-established:
  - "Entity grouping: UNIQUE(holder_id) at DB level is the primary correctness guarantee — prevents double-counting in aggregate queries"
  - "Fuzzy search: pg_trgm GIN index on holders.canonical_name enables similarity() queries for candidate holder lookup"

requirements-completed: [ENTITY-01, ENTITY-02, ENTITY-03]

# Metrics
duration: 11min
completed: 2026-03-15
---

# Phase 6 Plan 01: Entity Data Model Summary

**entities + entity_holders tables with UNIQUE(holder_id) constraint pushed to Neon; pg_trgm enabled with GIN index on holders.canonical_name; cmdk@1.1.1 installed**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-15T12:19:21Z
- **Completed:** 2026-03-15T12:30:56Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- entities table created in Neon PostgreSQL (id SERIAL PK, name TEXT UNIQUE, description TEXT nullable, created_at)
- entity_holders join table created with UNIQUE(holder_id) — the single most critical correctness property preventing double-counting in aggregate queries
- pg_trgm extension enabled and GIN index holders_canonical_name_trgm_idx created — similarity('test','test') = 1 confirmed
- cmdk@1.1.1 installed for future entity grouping Command combobox UI
- TypeScript compiles without errors; npm run build exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Install cmdk and add entities + entity_holders to schema** - `be7d141` (feat)
2. **Task 2: Enable pg_trgm extension and push schema to Neon** - `972432c` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added entities and entityHolders pgTable definitions; updated schema export
- `package.json` - Added cmdk@1.1.1 dependency
- `package-lock.json` - Updated lock file after cmdk install
- `scripts/enable-trgm.ts` - Creates pg_trgm extension and GIN index on holders.canonical_name
- `scripts/create-entity-tables.ts` - Creates entities and entity_holders tables via direct SQL with all indexes
- `scripts/check-tables.ts` - Utility: lists all tables and indexes in public schema
- `scripts/verify-trgm.ts` - Verifies pg_trgm, GIN index, UNIQUE constraint, table accessibility

## Decisions Made

- Used direct SQL via neon client for DDL instead of drizzle-kit push because drizzle-kit push triggered an interactive TTY prompt about renaming the `unique_period_emiten_holder` constraint on the existing 7253-row ownership_records table. The --force flag did not bypass this prompt. Direct SQL with IF NOT EXISTS is idempotent and safe.
- SERIAL primary keys used (matching holders.id pattern) rather than UUID for consistency with existing schema.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used direct SQL for DDL instead of drizzle-kit push**
- **Found during:** Task 2 (Enable pg_trgm extension and push schema to Neon)
- **Issue:** `npm run db:push` and `npx drizzle-kit push --force` both triggered an interactive TTY prompt: "You're about to add unique_period_emiten_holder unique constraint to the table..." — non-interactive environment cannot select from arrow-key menu. This constraint already existed in the DB under a different name from a previous push.
- **Fix:** Created `scripts/create-entity-tables.ts` to create the new entities and entity_holders tables via direct neon SQL with `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. This is idempotent and bypasses drizzle-kit's interactive prompts entirely.
- **Files modified:** scripts/create-entity-tables.ts (created)
- **Verification:** Tables entities and entity_holders confirmed present via `pg_tables` query; all 7 indexes visible in `pg_indexes`
- **Committed in:** 972432c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix necessary to complete task in non-interactive environment. Tables created correctly with all required constraints and indexes. No scope creep.

## Issues Encountered

- drizzle-kit push interactive prompt blocks non-interactive execution — resolved by direct SQL DDL scripts (see Deviations).

## User Setup Required

None - no external service configuration required beyond the existing .env.local DATABASE_URL.

## Next Phase Readiness

- entities and entity_holders tables are live in Neon and ready for API routes and UI in plans 06-02 and 06-03
- pg_trgm fuzzy search ready: GIN index on holders.canonical_name enables `similarity()` and `%` operator queries
- cmdk installed: entity search combobox UI can import from 'cmdk'
- All FK constraints in place: entity_holders.entity_id → entities.id (CASCADE), entity_holders.holder_id → holders.id (RESTRICT)
- No blockers for Phase 6 Plan 02

---
*Phase: 06-entity-data-model-and-management*
*Completed: 2026-03-15*
