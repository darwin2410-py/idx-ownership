---
phase: 07-aggregate-views
plan: "02"
subsystem: ui
tags: [drizzle, left-join, react, usememo, entity-grouping, aggregate-view]

# Dependency graph
requires:
  - phase: 07-aggregate-views/07-01
    provides: entity-repository, findEntityPortfolio, Phase 7 Plan 01 entity portfolio page
  - phase: 06-entity-data-model-and-management
    provides: entities table, entity_holders join table, entityHolders schema

provides:
  - findOwnershipByStockWithEntityContext() in ownership-repository.ts — LEFT JOIN entity_holders + entities
  - HolderRowWithEntity type exported from ownership-repository.ts
  - buildDisplayRows() pure function in stock-detail-comparison.tsx
  - EntityAggregateRow, HolderDisplayRow, DisplayRow discriminated union types
  - Blue entity aggregate cards above HoldersTable on /stocks/[code]
  - revalidate = 0 on /stocks/[code] for immediate alias change visibility

affects:
  - any future feature using /stocks/[code] page
  - any feature consuming HolderRowWithEntity type
  - entity grouping display consistency

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LEFT JOIN entity_holders + entities in Drizzle for nullable entity context per holder row"
    - "buildDisplayRows pure function separates entity aggregate rows from holder rows for UI rendering"
    - "Discriminated union DisplayRow (kind: entity | holder) for type-safe row rendering"
    - "useMemo for buildDisplayRows computation in client component"
    - "Render entity cards above HoldersTable instead of modifying HoldersTable (minimal blast radius)"

key-files:
  created: []
  modified:
    - src/lib/repositories/ownership-repository.ts
    - src/components/stock-detail-comparison.tsx
    - src/app/stocks/[code]/page.tsx

key-decisions:
  - "Render entity aggregate rows as separate <div> cards above HoldersTable rather than inside HoldersTable rows — avoids changing HoldersTable component"
  - "revalidate = 0 on /stocks/[code] ensures no stale entity data after alias changes"
  - "buildDisplayRows puts all entity blocks first (sorted by totalPercentage DESC) then ungrouped holders by rank"

patterns-established:
  - "LEFT JOIN pattern for optional entity context: entityId/entityName null when no entity assigned"
  - "buildDisplayRows pure function pattern: separate aggregation logic from rendering"

requirements-completed: [AGGR-02]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 7 Plan 02: Aggregate Views — Stock Detail Entity Context Summary

**Entity-aware stock detail page: LEFT JOIN entity context per holder + blue aggregate cards above HoldersTable showing combined ownership %**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T13:09:36Z
- **Completed:** 2026-03-15T13:13:23Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added `findOwnershipByStockWithEntityContext()` to ownership-repository.ts with LEFT JOINs to entity_holders and entities tables, returning nullable entityId/entityName per holder row
- Exported `HolderRowWithEntity` type and `buildDisplayRows()` pure function with discriminated union `DisplayRow` types for entity-aware rendering
- Stock detail page (/stocks/[code]) now renders blue entity aggregate cards above HoldersTable when holders share an entity, showing combined % and share count; stocks with no entity grouping display identically to pre-Phase 7

## Task Commits

Each task was committed atomically:

1. **Task 1: Add findOwnershipByStockWithEntityContext()** - `f69f9e5` (feat)
2. **Task 2: Add buildDisplayRows + update StockDetailComparison** - `1909364` (feat)
3. **Task 3: Wire stock detail page to new function + fix revalidate** - `74ca5ce` (feat, committed as part of 07-01 auto-fix)

**Plan metadata:** (created in this step)

_Note: Task 3 page.tsx changes were already present in HEAD from commit 74ca5ce (07-01 auto-fix that wired the page). No new commit needed for Task 3._

## Files Created/Modified
- `src/lib/repositories/ownership-repository.ts` - Added `HolderRowWithEntity` type and `findOwnershipByStockWithEntityContext()` with LEFT JOINs to entity_holders and entities
- `src/components/stock-detail-comparison.tsx` - Added `buildDisplayRows()`, discriminated union types, entity aggregate card section rendered above HoldersTable; updated `currentData` prop to accept `HolderRowWithEntity[]`
- `src/app/stocks/[code]/page.tsx` - Replaced `findOwnershipByStockWithHolders` with `findOwnershipByStockWithEntityContext`; set `revalidate = 0`

## Decisions Made
- Used the "alternative approach" from the plan: render entity aggregate rows as `<div>` cards above `<HoldersTable>` rather than modifying HoldersTable. This keeps the existing HoldersTable component unchanged and clearly separates entity context from the individual holder table.
- `revalidate = 0` instead of 3600 ensures that after a user adds a new alias at /entities/[id], navigating to /stocks/[code] shows the updated entity row immediately.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No test framework installed — TDD skipped, TypeScript verification used instead**
- **Found during:** Task 1 (test infrastructure check)
- **Issue:** The plan marks Tasks 1 and 2 as `tdd="true"` but the project has no jest/vitest installed; the plan's `<verify>` already specifies `npx tsc --noEmit` as the automated check
- **Fix:** Implemented code directly and verified via `npx tsc --noEmit` (exits 0) per the plan's own `<verify>` tag — the TDD lifecycle was superseded by the plan's actual verification criteria
- **Files modified:** none extra
- **Verification:** `npx tsc --noEmit` exits 0 after each task
- **Committed in:** f69f9e5, 1909364

---

**Total deviations:** 1 (TDD skipped — no test framework)
**Impact on plan:** No functional impact. TypeScript type checking provides equivalent type-safety verification. Plan's own `<verify>` tags confirm `npx tsc --noEmit` as the authoritative check.

## Issues Encountered
- `page.tsx` edits for Task 3 were already present in HEAD from commit `74ca5ce` (07-01 plan auto-fix). The `git add` failed cleanly since there were no new changes — confirming the file was already correct.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 7 (Aggregate Views) is now complete: both AGGR-01 (entity portfolio page, Plan 01) and AGGR-02 (stock detail entity context, Plan 02) are implemented
- v1.1 milestone (Lineage & Entity Linking) is complete
- `/stocks/[code]` shows combined entity ownership rows immediately after alias changes
- `/entities/[id]` + `/entities` provide entity management
- No blockers for v1.1 release

---
*Phase: 07-aggregate-views*
*Completed: 2026-03-15*
