---
phase: 08-network-graph-visualization
plan: "02"
subsystem: ui
tags: [graph, xyflow, d3-force, react, typescript, client-component]

# Dependency graph
requires:
  - phase: 08-network-graph-visualization
    plan: "01"
    provides: GraphData type and graph-repository.ts (findHolderGraph/findEntityGraph)

provides:
  - HolderNode custom @xyflow/react node — teal-500 circle with name label
  - StockNode custom @xyflow/react node — amber-400 circle with stock code label
  - GraphCanvas client component — accepts GraphData, computes d3-force layout, renders ReactFlow canvas with pan/zoom

affects:
  - 08-03 (graph page routes will import GraphCanvas and pass GraphData props)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Synchronous d3-force layout: simulation.stop() before tick loop prevents live animation; 120 ticks converge to static positions"
    - "BackgroundVariant enum from @xyflow/react (not string literal) required for TypeScript compatibility"
    - "nodeTypes map defined at module level (not inside component) to avoid React re-mount on each render"
    - "onNodeClick with router.push() handles navigation — Link inside ReactFlow nodes breaks drag detection"

key-files:
  created:
    - src/components/holder-node.tsx
    - src/components/stock-node.tsx
    - src/components/graph-canvas.tsx
  modified: []

key-decisions:
  - "BackgroundVariant.Dots enum used instead of string literal 'dots' — @xyflow/react v12 TypeScript types require enum value"
  - "Navigation via onNodeClick + router.push, not Link inside node — Link inside ReactFlow custom nodes interferes with drag detection"
  - "Empty state check before rendering ReactFlow — avoids mounting canvas with zero nodes which would show a blank/broken graph"

patterns-established:
  - "GraphCanvas is the single integration boundary: all @xyflow/react imports live here, page routes stay server-side"
  - "Custom node components are purely presentational — no navigation or state; all interactivity in GraphCanvas"

requirements-completed:
  - GRAPH-01

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 8 Plan 02: Graph UI Components Summary

**HolderNode (teal circle), StockNode (amber circle), and GraphCanvas with synchronous d3-force layout — full @xyflow/react canvas ready for page route integration**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-15T15:08:22Z
- **Completed:** 2026-03-15T15:10:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created HolderNode: teal-500 circle with line-clamp-3 name label and invisible source/target handles for edge attachment
- Created StockNode: amber-400 circle with bold stock code label and invisible handles
- Created GraphCanvas: converts GraphData to Node[]/Edge[], computes static d3-force positions (simulation.stop() + 120 ticks), renders ReactFlow with fitView, Background dots, Controls, and onNodeClick navigation
- Empty state renders Indonesian message when data.stocks.length === 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HolderNode and StockNode custom node components** - `50a60e8` (feat)
2. **Task 2: Create GraphCanvas client component with d3-force layout** - `28caf3e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/holder-node.tsx` - HolderNode: teal circle with name, NodeProps<Node<{name}, 'holder'>>
- `src/components/stock-node.tsx` - StockNode: amber circle with code, NodeProps<Node<{code,name}, 'stock'>>
- `src/components/graph-canvas.tsx` - GraphCanvas: GraphData -> ReactFlow with d3-force layout, onNodeClick routing

## Decisions Made
- Used BackgroundVariant.Dots enum (not string "dots") — @xyflow/react v12 TypeScript types only accept the enum value, not the string literal
- Navigation handled in onNodeClick + router.push rather than wrapping nodes in Link — Link inside ReactFlow custom nodes interferes with the library's drag detection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BackgroundVariant string literal rejected by TypeScript**
- **Found during:** Task 2 (GraphCanvas component creation)
- **Issue:** `variant="dots"` produced Type error: Type '"dots"' is not assignable to type 'BackgroundVariant | undefined' — @xyflow/react v12 requires the enum
- **Fix:** Imported BackgroundVariant from @xyflow/react; replaced string literal with `BackgroundVariant.Dots`
- **Files modified:** src/components/graph-canvas.tsx
- **Verification:** npm run build exits 0 after fix
- **Committed in:** 28caf3e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type error)
**Impact on plan:** Minimal fix to satisfy TypeScript strictness. No scope creep.

## Issues Encountered
- @xyflow/react v12 tightened the Background variant prop to require the BackgroundVariant enum. The plan's code snippet used a string literal which is no longer valid. Fixed inline per Rule 1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GraphCanvas, HolderNode, StockNode are ready for consumption by page routes
- Plan 03: Create /graph/holder/[name] and /graph/entity/[id] route pages that import GraphCanvas and pass fetched GraphData props
- findHolderGraph(holderName) and findEntityGraph(entityId) from graph-repository.ts feed directly into these page routes

---
*Phase: 08-network-graph-visualization*
*Completed: 2026-03-15*
