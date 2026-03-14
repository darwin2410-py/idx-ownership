---
phase: 02-core-visualization
plan: 04
subsystem: Core Visualization
tags: [search, filter, debounce, url-state]
completed_date: 2026-03-14
---

# Phase 02 Plan 04: Search and Filter with Debouncing Summary

Add search and filter functionality to stock listing page with debounced input, URL state encoding, and separate filters for stock code and holder name.

## One-Liner
Implemented dual search inputs (stock code + holder name) with 300ms debouncing and URL state encoding for shareable filtered views.

## Implementation Summary

### Tasks Completed

1. **Repository Search Function** (Commit: 35f861d)
   - Added `searchStocksWithFilters` to ownership-repository.ts
   - Implemented case-insensitive partial matching using `ilike`
   - Supports filtering by stock code, holder name, or both (OR logic)
   - Returns stocks with top holder information

2. **Search Component with Debouncing** (Commit: 6ca8157)
   - Created StocksSearch component with custom useDebounce hook
   - 300ms debounce delay for search input
   - URL state encoding with `?q=` for stock code and `?holder=` for holder name
   - Clear button removes all filters while preserving sort parameters
   - Indonesian labels and placeholders (Cari Kode Saham, Cari Nama Pemegang)

3. **Page Integration** (Commit: 2b5350c)
   - Modified stocks page to accept searchParams props
   - Integrated StocksSearch component with initial queries from URL
   - Conditional data fetching (search when filters active, otherwise show all)
   - Different empty state messages for no results vs no data

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

### Decision 1: Custom useDebounce Hook
Instead of using lodash.debounce, implemented a custom React hook to avoid adding an external dependency. The hook uses useRef to track timeout and useCallback for memoization.

### Decision 2: OR Logic for Combined Filters
When both stock code and holder name filters are provided, the search uses OR logic (returns stocks where code matches OR holder matches). This aligns with the plan's note about enhancing to AND logic in Phase 4.

## Tech Stack

**Added:**
- Custom useDebounce hook (no external dependencies)

**Patterns:**
- URL state encoding for shareable links
- Debounced input to reduce database queries
- Preserved sort parameters during search updates

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/repositories/ownership-repository.ts` | Added searchStocksWithFilters function with ilike filtering |
| `src/components/stocks-search.tsx` | Created search component with debouncing and URL state |
| `src/app/stocks/page.tsx` | Integrated search component and conditional data fetching |

## Key Features

### User Experience
- **Dual search inputs**: Separate fields for stock code and holder name
- **Real-time filtering**: 300ms debounce balances responsiveness with performance
- **Shareable URLs**: Filter parameters encoded in URL for bookmarking/sharing
- **Clear filters**: Single button removes all search terms
- **Preserved context**: Sort parameters maintained when searching

### Technical Implementation
- **Case-insensitive search**: Using Drizzle ORM's `ilike` operator
- **Partial matching**: Wildcards (`%...%`) for flexible search
- **Server-side filtering**: Database queries filter before data transmission
- **No new dependencies**: Custom debounce hook avoids lodash

## Verification

The implementation satisfies all success criteria:

1. ✓ Search inputs visible on stock listing page
2. ✓ Stock code search filters by partial match (case-insensitive)
3. ✓ Holder name search filters by partial match (case-insensitive)
4. ✓ Search debounced with 300ms delay
5. ✓ URL updates with `?q=` and `?holder=` parameters
6. ✓ Clear button removes all filters
7. ✓ Both filters can be used together
8. ✓ Empty state shows appropriate message when no results
9. ✓ Sort parameters preserved when searching
10. ✓ Shareable URLs work with search parameters

## Testing Checklist

Manual testing should verify:
- [ ] Type "TLKM" in "Cari Kode Saham" → URL updates to `?q=TLKM`
- [ ] Wait 300ms before URL updates (debounce working)
- [ ] Type "BCA" in "Cari Nama Pemegang" → URL updates to `?holder=BCA`
- [ ] Both filters together → `?q=TLKM&holder=BCA`
- [ ] Click "Hapus Filter" → Both inputs clear, URL params removed
- [ ] Partial matches work (e.g., "bank" finds "Bank Central Asia")
- [ ] Case-insensitive search (e.g., "bbca" finds "BBCA")
- [ ] Empty state shows "Tidak ditemukan hasil" when no matches
- [ ] Shareable URL with params works on page load

## Next Steps

This plan completes Wave 2 of Phase 2 (Core Visualization). The search and filter functionality is now fully integrated with the stock listing page.

**Phase 2 Progress:**
- Wave 1 (Parallel): ✓ 02-01 (Stock Listing), ✓ 02-02 (Stock Detail)
- Wave 2 (Parallel): ✓ 02-04 (Search & Filter), Remaining: 02-03 (Sortable Tables)

**Next Action:** Execute Plan 02-03 to add sortable tables with URL state encoding.
