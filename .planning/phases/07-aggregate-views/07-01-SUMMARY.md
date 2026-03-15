---
phase: 07-aggregate-views
plan: "01"
subsystem: ui
tags: [tanstack-table, drizzle-orm, postgresql, aggregate-query, expandable-rows, next-js]

# Dependency graph
requires:
  - phase: 06-entity-data-model-and-management
    provides: entity_holders join table, entities table, entity-repository.ts CRUD functions
  - phase: 03-data-model
    provides: ownership_records table, holders table, emiten table, periods table

provides:
  - findEntityPortfolio(entityId) — GROUP BY JOIN aggregate query returning EntityPortfolioRow[]
  - EntityPortfolioRow and AliasBreakdown types exported from entity-repository.ts
  - EntityPortfolioTable client component with TanStack expandable rows + sorting
  - /entities/[id] page now shows portfolio section below alias management

affects:
  - 07-aggregate-views (07-02 builds on same entity context patterns)
  - future stock detail page enhancements (entity context query already wired)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - db.execute<RowType>(sql`...`) for raw SQL with GROUP BY + json_agg aggregates
    - TanStack getExpandedRowModel + getSubRows for nested alias breakdown rows
    - Discriminated union (EntityPortfolioRow | AliasBreakdown) with type guards in cell renderers
    - Promise.all() for parallel alias + portfolio fetching in server components

key-files:
  created:
    - src/components/entity-portfolio-table.tsx
  modified:
    - src/lib/repositories/entity-repository.ts
    - src/app/entities/[id]/page.tsx
    - src/app/stocks/[code]/page.tsx

key-decisions:
  - "Resolve latest period via SELECT id FROM periods ORDER BY year DESC, month DESC LIMIT 1 — same pattern as other repository functions"
  - "typeof check before JSON.parse for aliases column — Neon returns parsed objects, not strings"
  - "Union type (EntityPortfolioRow | AliasBreakdown) + type guards for TanStack sub-rows — avoids separate column definitions per row type"

patterns-established:
  - "Pattern: json_agg with ORDER BY inside aggregate for sorted sub-row arrays"
  - "Pattern: getSubRows returning row.aliases cast to union type for TanStack expandable rows"
  - "Pattern: isParentRow/isAliasRow type guard functions for discriminated rendering in cell definitions"

requirements-completed: [AGGR-01]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 7 Plan 01: Aggregate Views Summary

**Entity portfolio view with SQL GROUP BY aggregate + TanStack expandable rows showing combined alias ownership per stock on /entities/[id]**

## Performance

- **Duration:** 4 min (213 seconds)
- **Started:** 2026-03-15T13:09:33Z
- **Completed:** 2026-03-15T13:13:06Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added `findEntityPortfolio(entityId)` to entity-repository.ts using raw SQL with `json_agg` and `GROUP BY` across entity_holders, holders, ownership_records, emiten
- Created `EntityPortfolioTable` client component with TanStack `getExpandedRowModel` + `getSubRows` for alias breakdown rows, initial sort by totalPercentage DESC
- Updated `/entities/[id]` page to fetch and render portfolio section in parallel with alias management section

## Task Commits

Each task was committed atomically:

1. **Task 1: Add findEntityPortfolio() to entity-repository.ts** - `658d4ec` (feat)
2. **Task 2: Create EntityPortfolioTable component** - `74ca5ce` (feat)
3. **Task 3: Upgrade /entities/[id]/page.tsx with portfolio section** - `5bb23d0` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/repositories/entity-repository.ts` - Added AliasBreakdown, EntityPortfolioRow types and findEntityPortfolio() aggregate function
- `src/components/entity-portfolio-table.tsx` - New 'use client' component with expandable rows, discriminated type guards, empty state
- `src/app/entities/[id]/page.tsx` - Added portfolio section with parallel Promise.all() fetch
- `src/app/stocks/[code]/page.tsx` - Rule 1 auto-fix: switched to findOwnershipByStockWithEntityContext

## Decisions Made
- Used `typeof r.aliases === 'string' ? JSON.parse(r.aliases) : r.aliases` pattern — Neon returns already-parsed JSON objects from json_agg, but string check guards against driver behavior differences
- Discriminated union type `EntityPortfolioRow | AliasBreakdown` with `isParentRow`/`isAliasRow` type guards in cell renderers, avoiding per-row-type column duplication
- `getSubRows: (row) => isParentRow(row) ? row.aliases as PortfolioRowData[] : undefined` — TanStack sub-rows use same union type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type error in /stocks/[code]/page.tsx**
- **Found during:** Task 2 (EntityPortfolioTable TypeScript check)
- **Issue:** `feat(07-02)` committed `HolderRowWithEntity` type with new required fields (`holderId`, `entityId`, `entityName`) but the stock page still called `findOwnershipByStockWithHolders` (old function) and passed its result as `currentData` to `StockDetailComparison` which now expected `HolderRowWithEntity[]` — causing `tsc --noEmit` to fail
- **Fix:** Stock page was already updated in working tree (pre-existing staged change) to use `findOwnershipByStockWithEntityContext` — included in Task 2 commit
- **Files modified:** `src/app/stocks/[code]/page.tsx`
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** `74ca5ce` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing bug from feat(07-02))
**Impact on plan:** Auto-fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
- `git stash` during investigation revealed the stock page fix was already applied as an unstaged working-tree change from prior `07-02` work — included it in the Task 2 commit since it resolves the type error blocking `tsc`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AGGR-01 complete: entity portfolio view live on /entities/[id]
- findOwnershipByStockWithEntityContext already available in ownership-repository.ts (from feat(07-02)) — ready for AGGR-02 (entity context on stock detail page)
- No blockers

---
*Phase: 07-aggregate-views*
*Completed: 2026-03-15*
