---
phase: 08-network-graph-visualization
plan: "01"
subsystem: database
tags: [graph, xyflow, d3-force, repository, typescript, neon, drizzle]

# Dependency graph
requires:
  - phase: 07-aggregate-views
    provides: findEntityPortfolio and entity_holders join pattern used as reference
  - phase: 06-entity-data-model
    provides: entities, entity_holders, holders tables and entity-repository.ts pattern

provides:
  - GraphData type (centerLabel, centerType, centerId, stocks[])
  - findHolderGraph(holderName) — returns GraphData or null, delegates to entity if member
  - findEntityGraph(entityId) — aggregates across all aliases for latest period
  - @xyflow/react and d3-force installed and ready for graph canvas components

affects:
  - 08-02 (graph page components will consume GraphData and these query functions)
  - 08-03 (holder link wiring on stock detail page depends on findHolderGraph contract)

# Tech tracking
tech-stack:
  added:
    - "@xyflow/react — network graph canvas library"
    - "d3-force — force-directed layout algorithm"
    - "@types/d3-force — TypeScript types for d3-force"
  patterns:
    - "db.execute<RowType>(sql`...`) raw SQL pattern for aggregate queries"
    - "null return for missing records; empty stocks[] for existing records with no data"
    - "Entity delegation: findHolderGraph calls findEntityGraph when holder is an entity member"

key-files:
  created:
    - src/lib/repositories/graph-repository.ts
  modified:
    - package.json

key-decisions:
  - "GraphData centerId is holderName string (not numeric id) for holders — keeps URL routing simple since /graph/holder/[name] uses canonical name"
  - "findHolderGraph delegates fully to findEntityGraph when holder is entity member — entity name is always the centerLabel, consistent with entity aggregate view approach"
  - "Empty stocks[] returned (not null) when holder/entity exists but has no records in latest period — avoids null checks downstream in graph components"

patterns-established:
  - "Graph data layer in dedicated graph-repository.ts — does not pollute holder-repository or entity-repository"
  - "resolveLatestPeriodId() extracted as private helper — reused by both query functions without duplication"

requirements-completed:
  - GRAPH-01

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 8 Plan 01: Graph Repository — Data Layer Summary

**GraphData type + findHolderGraph/findEntityGraph query functions with @xyflow/react and d3-force installed, establishing the full data layer for network graph visualization**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-15T15:00:31Z
- **Completed:** 2026-03-15T15:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Installed @xyflow/react, d3-force, and @types/d3-force — graph canvas library ready for Phase 8 Plan 02
- Created graph-repository.ts with GraphData exported type and two query functions
- findHolderGraph: resolves canonical name to holder, delegates to entity graph if member of entity group, otherwise returns individual portfolio for latest period
- findEntityGraph: aggregates ownership across all entity aliases via entity_holders JOIN, returns combined portfolio for latest period
- npm run build exits 0 with no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @xyflow/react and d3-force** - `e34847b` (chore)
2. **Task 2: Create graph-repository.ts** - `9303808` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/repositories/graph-repository.ts` - GraphData type, findHolderGraph, findEntityGraph
- `package.json` - Added @xyflow/react, d3-force in dependencies; @types/d3-force in devDependencies
- `package-lock.json` - Lock file updated for new packages

## Decisions Made
- GraphData.centerId for holders is the canonical name string (not numeric id), matching the `/graph/holder/[name]` URL route pattern
- findHolderGraph delegates entirely to findEntityGraph when a holder is an entity member — the entity name becomes the centerLabel, consistent with the entity aggregate cards in stock detail view
- null is returned only when the holder/entity does not exist; empty stocks array is returned when the record exists but has no ownership data in the latest period

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GraphData type and repository functions are ready for consumption by graph page components
- @xyflow/react canvas component and /graph/holder/[name] + /graph/entity/[id] routes can be built in Plan 02
- findHolderGraph(holderName) is the entry point from /stocks/[code] holder name links

---
*Phase: 08-network-graph-visualization*
*Completed: 2026-03-15*
