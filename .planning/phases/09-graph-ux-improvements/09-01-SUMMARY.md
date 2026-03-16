---
phase: 09-graph-ux-improvements
plan: 01
subsystem: ui
tags: [reactflow, xyflow, d3-force, graph, minimap, tooltip]

# Dependency graph
requires:
  - phase: 08-network-graph-visualization
    provides: graph-canvas.tsx with ReactFlow + d3-force layout, stock-node.tsx with static 96px circle
provides:
  - MiniMap in bottom-right of graph canvas with teal/amber color coding
  - Edge strokeWidth proportional to ownership percentage (range 1–8px)
  - Stock node circle diameter proportional to ownership percentage (range 72–120px)
  - NodeToolbar hover tooltip showing full emiten name and exact percentage
affects: [graph-canvas, stock-node, graph-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "maxPct normalization: compute max once, derive relative sizes and widths as ratio * range"
    - "NodeToolbar hover pattern: useState(false) + onMouseEnter/onMouseLeave controls isVisible"
    - "Inline style for dynamic sizing: use style={{ width: sz, height: sz }} instead of static Tailwind w-N h-N"

key-files:
  created: []
  modified:
    - src/components/graph-canvas.tsx
    - src/components/stock-node.tsx

key-decisions:
  - "Node size range [72, 120]px and edge width range [1, 8]px — minimum ensures all nodes/edges are visible even for smallest holder"
  - "maxPct guard of 1 (Math.max(..., 1)) — prevents division by zero when only one stock or all have same percentage"

patterns-established:
  - "Relative visual encoding: maxPct computed once from data, individual values normalized as ratio for consistent range"
  - "NodeToolbar hover: simpler than Radix/shadcn tooltip — no portal, no library, directly supported by @xyflow/react"

requirements-completed:
  - GRAPH-02

# Metrics
duration: 8min
completed: 2026-03-16
---

# Phase 9 Plan 01: Graph UX Improvements Summary

**MiniMap added to graph canvas, edge thickness and stock node diameter scaled proportionally to ownership percentage, hover tooltip shows full emiten name via NodeToolbar**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-16T00:00:00Z
- **Completed:** 2026-03-16T00:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- graph-canvas.tsx: MiniMap component imported and rendered inside ReactFlow (teal for holder node, amber for stock nodes, circular shape)
- graph-canvas.tsx: buildGraph() computes maxPct, edges carry style.strokeWidth in [1, 8] range, nodes carry data.size in [72, 120] range
- stock-node.tsx: StockNodeData type extended with size: number, circle uses inline style instead of static w-24 h-24 Tailwind classes
- stock-node.tsx: NodeToolbar renders on hover with dark tooltip showing full emiten name and exact ownership percentage

## Task Commits

Each task was committed atomically:

1. **Task 1: graph-canvas.tsx — MiniMap, edge thickness scaling, node size data** - `4f36dce` (feat)
2. **Task 2: stock-node.tsx — dynamic size + NodeToolbar hover tooltip** - `cd63783` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/graph-canvas.tsx` - Added MiniMap import + render; buildGraph computes maxPct, edges with strokeWidth, nodes with size
- `src/components/stock-node.tsx` - Added size to type, useState hover, NodeToolbar tooltip, inline style sizing

## Decisions Made
- Node size range [72, 120]px and edge width range [1, 8]px: minimum values ensure smallest holders remain visible and clickable
- maxPct guard of 1 prevents division by zero in single-stock or equal-percentage edge cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Graph canvas now visually encodes ownership magnitude — users can see dominant positions at a glance
- Hover tooltips eliminate the need to navigate away for full emiten names
- Phase 09 Plan 02 can proceed (if any further graph UX work planned)

---
*Phase: 09-graph-ux-improvements*
*Completed: 2026-03-16*
