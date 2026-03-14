# Phase 2: Core Visualization - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the user-facing interface for searching, browsing, and viewing IDX stock ownership data. This phase creates the primary product value — making the extracted data accessible and useful.

**Two main views:**
1. **Stock Listing Page** — Searchable, sortable list of all ~500 IDX stocks with top holder information
2. **Stock Detail Page** — Complete ownership table for a specific stock with all holders

**Critical understanding:** Indonesian users heavily use mobile devices. Tables must be usable on small screens with horizontal scroll and sticky first column.

</domain>

<decisions>
## Implementation Decisions

### Table UI & Density
- **Row density:** Standard (medium) — 12-16px padding, medium text (~14px)
- **Color scheme:** Clean/Minimal — White background, gray borders, minimal tinting (professional financial data look)
- **Sticky columns:** Yes, sticky first column (Stock Code/Holder Name) for mobile horizontal scroll
- **Top holder highlight:** No row highlighting — just sort by top holder % in listing

### Table Component Library
- **Library:** TanStack Table v8 (@tanstack/react-table)
  - Rationale: Headless, full styling control, works great with Tailwind CSS
  - Trade-off: More boilerplate but maximum flexibility
- **Pagination:** Virtual scroll (render only visible rows + infinite scroll)
  - Rationale: Modern UX, handles 500+ stocks smoothly
- **Sorting approach:** Hybrid
  - Stock listing page: Client-side sort (fetch all, sort in browser)
  - Stock detail page: Server-side sort (many holders, re-query on sort change)
- **CSV export:** Server-side (full dataset via API endpoint)
  - Rationale: Handles larger exports, no browser memory limits

### Data Fetching Pattern
- **Rendering:** Server Components (default Next.js approach)
  - Rationale: Best for SEO, fast initial load, less client JS
  - Pattern: Fetch data in Server Component, pass to Client Component for interactivity
- **Caching:** Longer cache (1+ hours) with Next.js revalidate
  - Rationale: IDX data updates monthly, no need for frequent queries
  - Implementation: `export const revalidate = 3600` or use `fetch(..., { next: { revalidate: 3600 } })`
- **Search:** DB search on input (debounced)
  - Rationale: Real-time search with database filtering
- **Error handling:** Show error + retry button
  - User action required on failure, graceful UI feedback

### Search UX Details
- **Location:** Inline in listing page (search bar at top of stock list)
- **URL state encoding:** Yes, URL params (?q=TLKM or ?holder=BCA)
  - Rationale: Shareable links, browser history works
- **Debounce timing:** 300ms (standard)
- **Search scope:** Separate filters
  - One input for stock code search
  - One input for holder name search
  - Can be used together (AND logic) or separately

### Data Freshness Indicator (CORE-03)
- **Display:** Badge showing "Data per: [Month Year]" in Indonesian format
- **Location:** Visible on all data pages (listing and detail)
- **Source:** Period table in database (latest period_id)

### Claude's Discretion
- Exact virtual scroll library (@tanstack/react-virtual or custom)
- TanStack Table column definitions structure
- API route structure for CSV export
- Search query parsing logic (partial matches, case-insensitive)
- Error message text and retry button styling
- Skeleton loading animation style

</decisions>

<specifics>
## Specific Ideas

- **Mobile consideration:** Horizontal scroll for wide tables with sticky first column is critical
- **Shareable URLs:** Encode search params so users can bookmark/share filtered views
- **Indonesian date format:** Use locale format for "Data per: Maret 2026"
- **CSV filename:** Include stock code and date (e.g., `TLKM_ownership_2026-03.csv`)
- **Virtual scroll threshold:** Start with 50 items rendered, adjust based on performance

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

**Database Schema (from Phase 1):**
```typescript
// Tables: periods, emiten, holders, ownershipRecords
// Available in: src/lib/db/schema.ts
```

**Repository Functions (from Phase 1):**
```typescript
// Data access layer in: src/lib/repositories/ownership-repository.ts
// Available functions:
// - findOwnershipRecordsByPeriod(periodId: string)
// - findOwnershipRecordsByEmiten(emitenId: string)
// - findOwnershipRecordsByHolder(holderId: number)
// - All with proper Drizzle ORM types inferred
```

**Database Client:**
```typescript
// Available in: src/lib/db/index.ts
// export const db = createDbConnection();
```

### Integration Points

**Existing Pages:**
- `src/app/layout.tsx` — Root layout (lang="id", basic structure)
- `src/app/page.tsx` — Placeholder home page (will be replaced or modified)

**API Endpoint (from Phase 1):**
- `src/app/api/import/route.ts` — PDF import endpoint (can reference for API patterns)

**Styling:**
- Tailwind CSS configured and ready
- globals.css includes base Tailwind directives

### New Dependencies Needed

```json
{
  "@tanstack/react-table": "^8.x",
  "@tanstack/react-virtual": "^3.x" // for virtual scroll
}
```

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-visualization*
*Context gathered: 2026-03-14*
