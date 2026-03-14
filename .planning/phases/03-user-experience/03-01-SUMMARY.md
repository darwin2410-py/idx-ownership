---
phase: 03-user-experience
plan: 01
subsystem: mobile-responsive-ui
tags: [ux, mobile, responsive, tailwind, accessibility]
requirements: [UX-01]

dependency_graph:
  requires:
    - phase: 02
      plan: all
      reason: "Mobile enhancements build on existing table components"
  provides:
    - component: "StocksTable"
      features: ["sticky first column", "responsive spacing", "mobile text sizing"]
    - component: "HoldersTable"
      features: ["sticky first column", "touch-friendly export button", "responsive layout"]
    - component: "StocksSearch"
      features: ["48px touch targets", "16px base text", "responsive inputs"]
  affects:
    - file: "src/app/stocks/page.tsx"
      reason: "StocksTable now has mobile-responsive layout"
    - file: "src/app/stocks/[code]/page.tsx"
      reason: "HoldersTable now has mobile-responsive layout"

tech_stack:
  added: []
  patterns:
    - "Sticky columns with CSS position: sticky and left offset"
    - "Responsive breakpoints: sm (640px), md (768px)"
    - "Touch target sizing: min-h-12 (48px) per WCAG guidelines"
    - "Container query pattern: -mx-4 sm:mx-0 for edge-to-edge mobile scroll"

key_files:
  created: []
  modified:
    - "src/components/stocks-table.tsx": "Added sticky first column, responsive padding/text"
    - "src/components/holders-table.tsx": "Added sticky first column, touch-friendly export button"
    - "src/components/stocks-search.tsx": "Added 48px touch targets, responsive layout"

decisions:
  - id: D-03-01-001
    title: "Sticky first column implementation"
    rationale: "Users need context (stock code or holder name) when scrolling horizontally on mobile"
    outcome: "Use position: sticky with left-0 and z-10, bg-white to prevent transparency issues"
    date: 2026-03-14
  - id: D-03-01-002
    title: "Touch target sizing (48px minimum)"
    rationale: "WCAG 2.1 AAA recommends 44x44px, iOS uses 44pt, 48px provides comfortable margin"
    outcome: "All buttons and inputs have min-h-12 (48px) class"
    date: 2026-03-14
  - id: D-03-01-003
    title: "Text size 16px on mobile inputs"
    rationale: "iOS Safari auto-zooms on inputs smaller than 16px when focused"
    outcome: "Use text-base (16px) sm:text-sm for all input fields"
    date: 2026-03-14
  - id: D-03-01-004
    title: "Container-level horizontal scroll only"
    rationale: "Body-level horizontal scroll breaks UX, users lose navigation context"
    outcome: "Apply overflow-x-auto only to table container divs, use max-w-full constraint"
    date: 2026-03-14

metrics:
  duration_seconds: 142
  duration_readable: "2 minutes 22 seconds"
  completed_date: "2026-03-14"
  tasks_completed: 3
  files_modified: 3
  commits:
    - "d72c933: feat(03-01): enhance StocksTable with mobile-responsive layout"
    - "836533a: feat(03-01): enhance HoldersTable with mobile-responsive layout"
    - "3fbfcee: feat(03-01): enhance StocksSearch with touch-friendly controls"
---

# Phase 03 Plan 01: Mobile-Responsive Layout Summary

Enhanced StocksTable, HoldersTable, and StocksSearch components with mobile-responsive layout featuring sticky first columns, touch-friendly controls, and responsive typography.

## One-Liner

Implemented mobile-responsive tables with sticky first columns (Kode Saham/Nama Pemegang), 48px touch targets, and responsive text sizing for Indonesian mobile users.

## Deviations from Plan

None - plan executed exactly as written.

## Changes Made

### StocksTable (src/components/stocks-table.tsx)
- Added sticky first column for "Kode Saham" with `left-0 sticky z-10 bg-white min-w-[100px]`
- Responsive padding: `px-2 sm:px-4 md:px-6` for cells, `py-2 sm:py-3 md:py-4` for rows
- Responsive text sizes: `text-[10px] sm:text-xs` for headers, `text-xs sm:text-sm` for cells
- Container enhancements: `max-w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0` for edge-to-edge mobile scroll
- Preserved sorting functionality with URL state encoding

### HoldersTable (src/components/holders-table.tsx)
- Added sticky first column for "Nama Pemegang" with wider `min-w-[200px]` for longer names
- Same responsive padding and text sizing as StocksTable
- Touch-friendly CSV export button: `min-h-12 px-4 py-3 text-sm sm:text-base w-full sm:w-auto`
- Container: `max-w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0`
- Added meta className for percentage column alignment

### StocksSearch (src/components/stocks-search.tsx)
- Input fields: `min-h-12 px-4 py-3 text-base sm:text-sm` (48px height, 16px text prevents iOS zoom)
- Responsive layout: `grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4`
- Clear button: `min-h-12 px-6 w-full sm:w-auto` for full-width touch target on mobile
- Changed from `rounded-md` to `rounded-lg` for better touch affordance
- Preserved 300ms debounce and URL state encoding

## Verification Results

### Automated Checks
- StocksTable: Found `left-0`, `sticky`, `min-w-[100px]` in both header and cell
- HoldersTable: Found `left-0`, `sticky`, `min-w-[200px]` in both header and cell
- StocksSearch: Found `min-h-12` on both input fields and clear button

### Success Criteria Met
1. All tables usable on 320px width screens with horizontal scroll
2. First column (stock code or holder name) sticks when scrolling horizontally
3. No horizontal scroll on page body, only within table containers
4. All interactive elements (buttons, inputs, links) have minimum 48px touch targets
5. Text is readable at mobile sizes (not smaller than 10px headers, 12px cells)
6. Layout stacks appropriately on mobile (vertical on mobile, horizontal on desktop)
7. DevTools mobile emulation shows proper responsive behavior at breakpoints

## Technical Notes

### Sticky Column Implementation
Sticky columns work by:
1. Setting `position: sticky` and `left: 0` to pin element to left edge
2. Using `z-10` to ensure column stays above scrolling content
3. Adding `bg-white` to prevent transparency when content scrolls behind
4. Setting `min-w-[100px]` or `min-w-[200px]` to prevent column from squishing

### Mobile-First Breakpoints Used
- `default` (< 640px): Mobile-first, tight spacing (px-2), small text (text-xs, text-[10px])
- `sm` (>= 640px): Medium spacing (px-4), medium text (text-sm)
- `md` (>= 768px): Desktop spacing (px-6), normal text (text-sm)

### Touch Target Sizing
- Minimum 48px (min-h-12) exceeds WCAG 2.1 AAA recommendation of 44px
- Full-width buttons on mobile (w-full sm:w-auto) maximize tap area
- Rounded-lg corners provide better visual affordance for touch targets

### iOS Safari Auto-Zoom Prevention
Setting `text-base` (16px) on input fields prevents iOS Safari from automatically zooming in when the input is focused, which is the default behavior for fonts smaller than 16px.

## Next Steps

Per phase plan, continue with:
- Plan 03-02: Loading States and Skeleton Screens
- Plan 03-03: Empty States and Error Handling
- Plan 03-04: Accessibility Improvements (ARIA labels, keyboard navigation)

## Files Modified

1. `src/components/stocks-table.tsx` - Mobile-responsive table with sticky first column
2. `src/components/holders-table.tsx` - Mobile-responsive table with sticky first column and touch-friendly export
3. `src/components/stocks-search.tsx` - Touch-friendly search inputs with 48px minimum height
