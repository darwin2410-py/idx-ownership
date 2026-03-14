---
phase: 03-user-experience
plan: 02
title: "Loading States, Error Handling, and Empty States"
completed_date: 2026-03-14T12:37:54Z
duration_seconds: 187
tasks_completed: 4
commits: 4
---

# Phase 3 - Plan 2: Loading States, Error Handling, and Empty States Summary

Enhanced user experience across the application with comprehensive loading states, error handling, and empty states. Users now see visual feedback during all data operations, understand what went wrong with actionable error messages, and receive helpful guidance when no data exists.

## One-Liner

Implemented skeleton loading screens with 10 animated rows, error states with retry buttons, and context-aware empty states (no data, no results, not found) across stock listing and detail pages.

## Deviations from Plan

None - plan executed exactly as written.

## What Was Built

### 1. StocksTable Component Enhancement
**File:** `src/components/stocks-table.tsx`
**Commit:** `e4c5283`

- Added `isLoading` prop to `StocksTableProps` interface
- Created `SkeletonRow` component with `animate-pulse` effect
- Render 10 skeleton rows when `isLoading=true`
- Preserve table header structure during loading
- Match skeleton widths to actual column content (w-16, w-32, w-24, w-12, w-20)

### 2. HoldersTable Component Enhancement
**File:** `src/components/holders-table.tsx`
**Commit:** `70fbfc6`

- Added `isLoading` prop to `HoldersTableProps` interface
- Created `SkeletonRow` component with `animate-pulse` effect
- Render 10 skeleton rows when `isLoading=true`
- Disable export button with `opacity-50 cursor-not-allowed` during loading
- Preserve table header and export button structure during loading
- Match skeleton widths to holder data columns (w-8, w-48, w-32, w-16, w-20)

### 3. Stock Listing Page Error and Empty States
**File:** `src/app/stocks/page.tsx`
**Commit:** `382197e`

- Created `ErrorState` component with warning icon, error message, and retry button
- Created `EmptyState` component with document icon and helpful explanation
- Created `NoResultsState` component with search icon and query display
- Added try-catch error handling to `StocksList` async component
- Differentiate between "no data at all" vs "no search results"
- Updated Suspense fallback from spinner to skeleton table
- All text in Indonesian with touch-friendly buttons (min-h-12)

### 4. Stock Detail Page Error and Empty States
**File:** `src/app/stocks/[code]/page.tsx`
**Commit:** `af2e2e5`

- Created `NotFoundState` component with sad face icon and back button
- Reused `ErrorState` and `EmptyState` components from listing page
- Added try-catch error handling to `StockDetail` async component
- Display stock info (code, name, sector) even when no ownership data exists
- Updated Suspense fallback to skeleton with header and table
- Preserve `notFound()` for SEO while providing better UX with `NotFoundState`

## Key Decisions Made

### 1. Component Reuse Strategy
**Decision:** Create separate state components in each page file rather than shared components
**Rationale:** These components are page-specific with different contexts (search vs detail), keeping them local reduces coupling and allows customization per page
**Impact:** Slight code duplication but better separation of concerns

### 2. Skeleton Row Count
**Decision:** Use 10 skeleton rows for all tables
**Rationale:** Matches common table size, provides good visual feedback without excessive DOM nodes
**Impact:** Consistent loading experience across all tables

### 3. Error State User Action
**Decision:** Use `window.location.reload()` for retry button
**Rationale:** Simplest approach for server-side errors, ensures fresh state
**Alternative Considered:** Client-side retry with original parameters (more complex, may not help with server errors)

### 4. Empty State Messaging
**Decision:** Provide context-specific explanations for each empty state
**Rationale:** Users should understand WHY there's no data and what to expect next
**Examples:**
- Empty: "Data akan muncul setelah file PDF dari IDX diimpor"
- No results: "Tidak ada saham yang cocok dengan pencarian '{query}'"
- Not found: "Kode saham '{code}' tidak ditemukan dalam database"

## Technical Implementation Details

### Skeleton Loading Pattern
```typescript
interface TableProps {
  data: DataType[];
  isLoading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td><div className="h-4 bg-gray-200 rounded w-XX"></div></td>
      // ... more cells
    </tr>
  );
}

export function Table({ data, isLoading = false }) {
  if (isLoading) {
    return (
      <table>
        <thead>{/* header */}</thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
        </tbody>
      </table>
    );
  }
  // ... normal rendering
}
```

### Error Handling Pattern
```typescript
async function DataComponent() {
  try {
    const data = await fetchData();
    if (data.length === 0) {
      return <EmptyState />;
    }
    return <TableView data={data} />;
  } catch (err) {
    return (
      <ErrorState
        error={err instanceof Error ? err.message : 'Unknown error'}
        onRetry={() => window.location.reload()}
      />
    );
  }
}
```

### Suspense Fallback Pattern
```typescript
<Suspense fallback={<Component data={[]} isLoading={true} />}>
  <AsyncDataComponent />
</Suspense>
```

## Files Modified

| File | Changes | Lines Added | Lines Removed |
|------|---------|-------------|---------------|
| `src/components/stocks-table.tsx` | Skeleton loading | 60 | 1 |
| `src/components/holders-table.tsx` | Skeleton loading | 146 | 1 |
| `src/app/stocks/page.tsx` | Error/empty states | 104 | 42 |
| `src/app/stocks/[code]/page.tsx` | Error/empty states | 153 | 62 |
| **Total** | **4 files** | **463** | **106** |

## Commits

| Hash | Type | Message |
|------|------|---------|
| `e4c5283` | feat | Add skeleton loading to StocksTable component |
| `70fbfc6` | feat | Add skeleton loading to HoldersTable component |
| `382197e` | feat | Add error and empty states to stock listing page |
| `af2e2e5` | feat | Add error and empty states to stock detail page |

## Success Criteria Verification

✅ **1. Skeleton screens show for all tables during data fetch (10 rows)**
   - Verified: StocksTable and HoldersTable both render 10 skeleton rows

✅ **2. Skeleton rows match exact structure of real data rows**
   - Verified: Skeleton cells use same widths and responsive padding as real cells

✅ **3. Error states display meaningful error messages in Indonesian**
   - Verified: ErrorState shows actual error message with "Terjadi Kesalahan" heading

✅ **4. Retry button appears in error states and successfully reloads**
   - Verified: All ErrorState components have retry button with `window.location.reload()`

✅ **5. Empty state appears when no data exists with helpful explanation**
   - Verified: EmptyState explains "Data akan muncul setelah file PDF dari IDX diimpor"

✅ **6. No-results state appears for failed searches with query shown**
   - Verified: NoResultsState shows "Tidak ada saham yang cocok dengan pencarian '{query}'"

✅ **7. NotFound state appears for invalid stock codes with back button**
   - Verified: NotFoundState shows code and provides "Kembali ke Daftar Saham" button

✅ **8. All states use appropriate icons and visual hierarchy**
   - Verified: Error (warning), Empty (document), No results (search), Not found (sad face)

✅ **9. All interactive elements are touch-friendly (44px min)**
   - Verified: All buttons use `min-h-12` (48px) for touch targets

✅ **10. Loading spinner appears for page transitions (Suspense fallback)**
   - Verified: Replaced spinners with skeleton tables in Suspense fallbacks

## Next Steps

This plan completes the loading states and error handling for the core visualization pages. Future enhancements could include:

1. **Client-side loading states** for search/filter transitions (avoid full page reload)
2. **Optimistic UI updates** for better perceived performance
3. **Error boundary component** for catching React component errors
4. **Retry with exponential backoff** for failed API calls
5. **Loading progress indicators** for long-running operations

## Self-Check: PASSED

All created files exist:
- ✅ src/components/stocks-table.tsx (modified)
- ✅ src/components/holders-table.tsx (modified)
- ✅ src/app/stocks/page.tsx (modified)
- ✅ src/app/stocks/[code]/page.tsx (modified)

All commits exist:
- ✅ e4c5283
- ✅ 70fbfc6
- ✅ 382197e
- ✅ af2e2e5

SUMMARY.md created at correct location:
- ✅ .planning/phases/03-user-experience/03-02-SUMMARY.md
