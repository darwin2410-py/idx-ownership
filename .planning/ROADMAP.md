# ROADMAP - IDX Ownership Visualizer

**Project:** IDX Ownership Visualizer
**Version:** 1.0 (MVP) + 1.1 (Lineage & Entity Linking)
**Last Updated:** 2026-03-15
**Granularity:** Standard (5-8 phases expected)

---

## Progress Summary

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 4/4 | Complete | 01-01, 01-02, 01-03, 01-04 |
| 2. Core Visualization | 4/4 | Complete | 02-01, 02-02, 02-03, 02-04 |
| 2.1. Solve Error | 1/1 | Complete | 02.1-01 |
| 3. User Experience | 3/3 | Complete | 03-01, 03-02, 03-03 |
| 4. Enhancement Features | 3/3 | Complete | 04-01, 04-02, 04-03 |
| 5. PDF Fix & Data Quality | 2/2 | Complete   | 2026-03-15 |
| 6. Entity Data Model & Management | 3/3 | Complete   | 2026-03-15 |
| 7. Aggregate Views | 2/2 | Complete    | 2026-03-15 |
| 8. Network Graph Visualization | 2/3 | In Progress|  |

**v1.0 Progress:** 15/15 plans complete (100%)
**v1.1 Progress:** 0 plans complete (Not started)

---

## Phases

- [x] **Phase 1: Data Foundation** - PDF extraction pipeline and database schema for ownership data storage ✅
- [x] **Phase 2: Core Visualization** - Per-Emiten view with searchable, sortable stock list and detail pages ✅
- [x] **Phase 2.1: Solve Error** - Database connection setup and environment configuration ✅
- [x] **Phase 3: User Experience** - Responsive mobile layout, loading states, and landing page ✅
- [x] **Phase 4: Enhancement Features** - Historical comparison, per-holder view, and top movers dashboard ✅
- [x] **Phase 5: PDF Fix & Data Quality** - Fix holder name truncation in PDF extractor and re-import clean data (completed 2026-03-15)
- [x] **Phase 6: Entity Data Model & Management** - Schema, API, and admin UI for creating and managing entity groups
 (completed 2026-03-15)
- [x] **Phase 7: Aggregate Views** - Entity profile page and aggregate ownership display on stock detail pages
 (completed 2026-03-15)

---

## Phase Details

### Phase 1: Data Foundation

**Goal:** Establish reliable data pipeline for extracting and storing IDX ownership data from monthly PDFs

**Depends on:** Nothing (foundational phase)

**Requirements:** DATA-01, DATA-02, DATA-03

**Success Criteria** (what must be TRUE):
1. System can successfully extract ownership data from sample IDX PDF file (ownership_one_percent_202603.pdf) with stock code, holder name, ownership percentage, and share count
2. Extracted data is stored in normalized PostgreSQL database with proper schema (emiten, holders, ownership_records, periods tables) and foreign key constraints
3. Data validation checks catch missing or malformed data, validate ownership percentages sum to ~100%, and log results for monitoring
4. Database supports historical data storage with proper indexing for time-series queries

**Plans:** 4 plans in 2 waves

**Wave 1 (Parallel):**
- [x] [01-01-PLAN.md](.planning/phases/01-data-foundation/01-01-PLAN.md) — Database schema setup with Drizzle ORM (4 tables, composite keys, indexes) ✅
- [x] [01-02-PLAN.md](.planning/phases/01-data-foundation/01-02-PLAN.md) — PDF extraction pipeline with pdf-parse and fallback strategies ✅

**Wave 2 (Parallel):**
- [x] [01-03-PLAN.md](.planning/phases/01-data-foundation/01-03-PLAN.md) — Data validation with Zod schemas ✅
- [x] [01-04-PLAN.md](.planning/phases/01-data-foundation/01-04-PLAN.md) — Import workflow with API endpoint and CLI script ✅

---

### Phase 2: Core Visualization

**Goal:** Enable users to search, browse, and view ownership data for any IDX stock

**Depends on:** Phase 1 (Data Foundation)

**Requirements:** EMIT-01, EMIT-02, CORE-01, CORE-02, CORE-03, CORE-04

**Success Criteria** (what must be TRUE):
1. User can view a searchable, filterable list of all IDX stocks with top holder information and sort by any column
2. User can click any stock to view detailed ownership table showing all holders with rank, name, shares owned, and percentage ownership
3. User can sort all table columns by clicking headers (ascending/descending) with visual sort indicators
4. User can search by stock code or holder name with debounced input (300ms) and URL state encoding for shareable links
5. User can see "Data per: [Month Year]" badge on all pages showing data freshness in Indonesian format
6. User can export ownership data to CSV with UTF-8 encoding and proper headers for offline analysis

**Plans:** 4 plans in 2 waves

**Wave 1 (Parallel):**
- [x] [02-01-PLAN.md](.planning/phases/02-core-visualization/02-01-PLAN.md) — Stock listing page with TanStack Table and data freshness badge ✅
- [x] [02-02-PLAN.md](.planning/phases/02-core-visualization/02-02-PLAN.md) — Stock detail page with holders table and CSV export ✅

**Wave 2 (Parallel):**
- [x] [02-03-PLAN.md](.planning/phases/02-core-visualization/02-03-PLAN.md) — Sortable tables with URL state encoding ✅
- [ ] [02-04-PLAN.md](.planning/phases/02-core-visualization/02-04-PLAN.md) — Search and filter with debounced input

---

### Phase 2.1: Solve Error

**Goal:** Fix database connection error and configure environment variables for local development and deployment

**Depends on:** Phase 1 (Data Foundation), Phase 2 (Core Visualization)

**Requirements:** ENV-01 (Environment Setup)

**Success Criteria** (what must be TRUE):
1. Database connection works locally with environment variable configured
2. Application runs without DATABASE_URL error
3. .env.example file documents required environment variables
4. Database schema migrations run successfully

**Plans:** 1 plan in 1 wave

**Wave 1:**
- [ ] [02.1-01-PLAN.md](.planning/phases/02.1-solve-error/02.1-01-PLAN.md) — Environment setup with .env.example and README documentation

---

### Phase 3: User Experience

**Goal:** Ensure website is fully functional on mobile devices and provides clear navigation and loading feedback

**Depends on:** Phase 2 (Core Visualization)

**Requirements:** UX-01, UX-02, UX-03

**Success Criteria** (what must be TRUE):
1. Website is fully usable on mobile devices (320px width) with horizontal scroll for wide tables and touch-friendly tap targets (44px min)
2. User sees skeleton screens for tables during data fetch with proper loading spinners for page transitions
3. User sees appropriate error states with retry buttons and empty states when no data is available
4. Landing page clearly explains the tool's purpose with hero section, how it works explanation, and CTA button to browse stocks
5. Footer includes FAQ section about data source and update frequency, plus credits and disclaimer

**Plans:** 3 plans in 2 waves

**Wave 1 (Parallel):**
- [x] [03-01-PLAN.md](.planning/phases/03-user-experience/03-01-PLAN.md) — Responsive mobile layout for tables and pages
- [x] [03-02-PLAN.md](.planning/phases/03-user-experience/03-02-PLAN.md) — Loading states, error handling, and empty states

**Wave 2:**
- [x] [03-03-PLAN.md](.planning/phases/03-user-experience/03-03-PLAN.md) — Landing page with hero, how it works, and FAQ

---

### Phase 4: Enhancement Features

**Goal:** Provide historical analysis capabilities and advanced views for power users

**Depends on:** Phase 2 (Core Visualization), Phase 3 (User Experience)

**Requirements:** HIST-01, HOLD-01, DASH-01

**Success Criteria** (what must be TRUE):
1. User can view month-over-month ownership changes on stock detail pages with color coding (green for accumulation, red for disposal)
2. User can see highlighted new holders (appeared this month) and exited holders (sold position) with change in percentage ownership
3. User can search by holder name to view all stocks held by that specific holder with percentage ownership for each stock
4. User can view "Top Movers" dashboard showing biggest accumulators, biggest disposals, and most active stocks with links to detail pages
5. User can filter dashboard tables by time period when multiple periods of historical data are available

**Plans:** 3 plans in 2 waves

**Wave 1 (Parallel):**
- [x] [04-01-PLAN.md](.planning/phases/04-enhancement-features/04-01-PLAN.md) — Historical comparison on stock detail pages ✅
- [x] [04-02-PLAN.md](.planning/phases/04-enhancement-features/04-02-PLAN.md) — Per-holder view with search and portfolio export ✅

**Wave 2:**
- [x] [04-03-PLAN.md](.planning/phases/04-enhancement-features/04-03-PLAN.md) — Top movers dashboard showing accumulations and disposals ✅

---

### Phase 5: PDF Fix & Data Quality

**Goal:** Holder names in the database are complete and accurate, ready for entity grouping

**Depends on:** Phase 4 (Enhancement Features — v1.0 complete)

**Requirements:** PARSE-01, PARSE-02

**Success Criteria** (what must be TRUE):
1. Holder names in the database are no longer truncated — "Prajogo Pangestu" appears in full, not as "Prajogo Pange"
2. All known truncation cases (names with PT, Tbk, and multi-word Indonesian family names) pass spot-check verification
3. Re-imported data contains at least as many records as before the fix (7209+ ownership records)
4. No regression in other extracted fields — stock codes, ownership percentages, and share counts remain correct
5. Import script runs to completion without errors on all available historical PDFs

**Plans:** 2/2 plans complete

**Wave 1:**
- [ ] [05-01-PLAN.md](.planning/phases/05-pdf-fix-and-data-quality/05-01-PLAN.md) — Audit script + fix tryIDXConcatenatedStrategy() holder name truncation bug

**Wave 2:**
- [ ] [05-02-PLAN.md](.planning/phases/05-pdf-fix-and-data-quality/05-02-PLAN.md) — Clear all data and re-import with fixed extractor, spot-check name quality

---

### Phase 6: Entity Data Model & Management

**Goal:** Users can create named entity groups and link holder aliases to them, with conflict detection preventing double-counting

**Depends on:** Phase 5 (PDF Fix & Data Quality)

**Requirements:** ENTITY-01, ENTITY-02, ENTITY-03

**Success Criteria** (what must be TRUE):
1. User can create a new named entity (e.g., "Hartono Family") and see it appear in a list of all entities
2. User can search for holders by partial name (case-insensitive, fuzzy match) and add a holder as an alias of an entity
3. User receives a clear error message when attempting to add a holder that already belongs to another entity — no silent data corruption
4. User can remove a holder alias from an entity, and that holder immediately reappears as an independent entry in all views
5. All existing ownership records and holder data remain intact after any alias add or remove operation

**Plans:** 3/3 plans complete

**Wave 1:**
- [ ] [06-01-PLAN.md](.planning/phases/06-entity-data-model-and-management/06-01-PLAN.md) — Schema (entities + entity_holders tables), cmdk install, pg_trgm extension + GIN index

**Wave 2:**
- [ ] [06-02-PLAN.md](.planning/phases/06-entity-data-model-and-management/06-02-PLAN.md) — Entity repository (8 DB functions) + 4 API routes (entity CRUD, alias add/remove, holder fuzzy search)

**Wave 3:**
- [ ] [06-03-PLAN.md](.planning/phases/06-entity-data-model-and-management/06-03-PLAN.md) — Entity list page (/entities), entity detail page (/entities/[id]), cmdk combobox, nav link

---

### Phase 7: Aggregate Views

**Goal:** Users can see combined ownership totals for an entity across all its aliases, both on a dedicated entity page and inline on stock detail pages

**Depends on:** Phase 6 (Entity Data Model & Management)

**Requirements:** AGGR-01, AGGR-02

**Success Criteria** (what must be TRUE):
1. User can navigate to `/entities/[id]` and see a list of all stocks held by that entity, showing combined percentage and combined share count across all aliases
2. On the entity profile page, user can expand each stock row to see the breakdown of which individual aliases contribute to the total
3. On `/stocks/[code]`, when multiple holders are aliases of the same entity, a combined entity row appears above the individual alias rows showing the aggregate total percentage
4. Stocks with no entity grouping display exactly as before — no visual change or regression
5. User can sort the entity profile page by total ownership percentage to identify the entity's largest positions

**Plans:** 2/2 plans complete

**Wave 1 (Parallel):**
- [ ] [07-01-PLAN.md](.planning/phases/07-aggregate-views/07-01-PLAN.md) — Entity portfolio table on /entities/[id]: findEntityPortfolio() + expandable TanStack Table
- [ ] [07-02-PLAN.md](.planning/phases/07-aggregate-views/07-02-PLAN.md) — Stock detail entity aggregate rows: findOwnershipByStockWithEntityContext() + buildDisplayRows() + StockDetailComparison update

---

## v2+ Requirements (Future)

Deferred to post-v1.1 releases:

- **[GRAPH-01]** Network Graph Visualization — Visual graph menampilkan hubungan antara entity/holder dan emiten (defer from v1.1; prioritize aggregate view first)
- **[ANAL-01]** Accumulation/Disposal Detection — Automatically flag significant ownership changes (>5%)
- **[SECT-01]** Sector Analysis — Aggregate ownership by sector (requires external sector mapping data)
- **[COMP-01]** Cross-Holder Comparison — Compare holdings between two investors
- **[API-01]** Public API — Provide API access for developers

---

## Traceability Matrix

| Requirement | Phase | Status | Plans |
|-------------|-------|--------|-------|
| DATA-01: PDF Extraction Pipeline | Phase 1 | Complete | 01-02, 01-04 |
| DATA-02: Database Schema Design | Phase 1 | Complete | 01-01 |
| DATA-03: Data Quality Validation | Phase 1 | Complete | 01-03, 01-04 |
| EMIT-01: Stock Listing Page | Phase 2 | Complete | 02-01 |
| EMIT-02: Stock Detail Page | Phase 2 | Complete | 02-02 |
| CORE-01: Sortable Tables | Phase 2 | Complete | 02-03 |
| CORE-02: Search & Filter | Phase 2 | Complete | 02-04 |
| CORE-03: Data Freshness Indicator | Phase 2 | Complete | 02-01, 02-02 |
| CORE-04: Export to CSV | Phase 2 | Complete | 02-02 |
| ENV-01: Environment Setup | Phase 2.1 | Complete | 02.1-01 |
| UX-01: Responsive Mobile Layout | Phase 3 | Complete | 03-01 |
| UX-02: Loading States | Phase 3 | Complete | 03-02 |
| UX-03: Landing Page | Phase 3 | Complete | 03-03 |
| HIST-01: Historical Comparison | Phase 4 | Complete | 04-01 |
| HOLD-01: Per-Holder View | Phase 4 | Complete | 04-02 |
| DASH-01: Top Movers Dashboard | Phase 4 | Complete | 04-03 |
| PARSE-01: Fix Holder Name Truncation | Phase 5 | Pending | TBD |
| PARSE-02: Re-import Data dengan Extractor Baru | Phase 5 | Pending | TBD |
| ENTITY-01: User Dapat Membuat Entity Group | Phase 6 | Pending | 06-01, 06-02, 06-03 |
| ENTITY-02: User Dapat Tambah Holder Alias ke Entity | Phase 6 | Pending | 06-01, 06-02, 06-03 |
| ENTITY-03: User Dapat Hapus Alias dari Entity | Phase 6 | Pending | 06-02, 06-03 |
| AGGR-01: Entity Profile Page | Phase 7 | Pending | TBD |
| AGGR-02: Stock Detail Page Tampilkan Entity Aggregate | Phase 7 | Pending | TBD |

**Coverage:** 23/23 requirements mapped (100%) ✓

---

## Phase Dependencies

```
Phase 1: Data Foundation (foundation)
    ↓
Phase 2: Core Visualization (requires data)
    ↓
Phase 2.1: Solve Error (fixes runtime issues)
    ↓
Phase 3: User Experience (requires core features)
    ↓
Phase 4: Enhancement Features (requires core + historical data)
    ↓
Phase 5: PDF Fix & Data Quality (v1.1 — fix source data before grouping)
    ↓
Phase 6: Entity Data Model & Management (requires clean holder names)
    ↓
Phase 7: Aggregate Views (requires entity grouping to be populated)
```

---

## Risk Mitigation

**Critical Path Risks:**

1. **Brittle PDF Extraction** (Phase 1)
   - Mitigation: Versioned extraction modules, multiple extraction strategies, data validation rules, store raw PDFs for re-processing

2. **Shareholder Name Deduplication** (Phase 1)
   - Mitigation: Canonical shareholder entity table, normalization rules, fuzzy matching (Levenshtein distance), manual merge workflow

3. **Performance Degradation** (Phase 2+)
   - Mitigation: Proper indexing from day one, partition by year, materialized views for common queries, Redis caching, monitor slow queries

4. **Missing Data ≠ Zero** (Phase 4)
   - Mitigation: Mark disappeared holders as "below_threshold" not zero, track last known position, show "< 1%" for disappeared holders

5. **Entity Double-Counting** (Phase 6)
   - Mitigation: UNIQUE constraint on holder_id in person_holders join table; conflict detection with human-readable 409 response before any merge is saved

6. **Fuzzy Search Over-Merging Indonesian Names** (Phase 6)
   - Mitigation: Strip PT/Tbk tokens before similarity scoring; raise threshold to 0.85-0.90 for institutional names; always require user confirmation before saving a merge

7. **Stale Cache After Entity Ungroup** (Phase 7)
   - Mitigation: Call revalidatePath() on entity membership changes to invalidate affected stock detail pages

---

## Out of Scope

Explicitly excluded from v1 and v1.1:

- Real-time updates (IDX data is monthly)
- Portfolio tracking (adds authentication complexity)
- Trading signals (legal liability, ownership ≠ trading signal)
- User authentication (frictionless public access is differentiator)
- Social features (comments, discussion)
- Predictive analytics (overpromising, wrong predictions damage credibility)
- Multi-exchange support (dilutes focus, IDX focus is competitive moat)
- User-uploaded PDFs (quality control, storage costs, abuse potential)
- Alert system (monthly cadence makes alerts low urgency)
- Network graph visualization (deferred to v2; aggregate view delivers most value first)
- Automated ML entity resolution (false positives corrupt financial data)
- Public/crowdsourced entity grouping (data integrity risk without moderation)

### Phase 8: Network Graph Visualization

**Goal:** Users can click any holder name on a stock detail page and see an interactive force-directed graph showing all stocks that holder owns, with navigation to any stock or related holder

**Requirements:** GRAPH-01

**Depends on:** Phase 7

**Success Criteria** (what must be TRUE):
1. User can click a holder name on /stocks/[code] and navigate to /graph/holder/[name]
2. Graph page shows a star layout: teal center node (holder/entity) surrounded by amber stock nodes
3. Each edge between center and stock node is labeled with the ownership percentage
4. Clicking an amber stock node navigates to /stocks/[code]
5. If a holder belongs to an entity group, the graph shows the entity's aggregated portfolio (all aliases combined)
6. Navigating to /graph/entity/[id] shows the entity's full portfolio as a graph
7. Unknown holder names and invalid entity IDs return 404 pages

**Plans:** 2/3 plans executed

**Wave 1:**
- [ ] [08-01-PLAN.md](.planning/phases/08-network-graph-visualization/08-01-PLAN.md) — Install @xyflow/react + d3-force; create graph-repository.ts with GraphData type, findHolderGraph, findEntityGraph

**Wave 2:**
- [ ] [08-02-PLAN.md](.planning/phases/08-network-graph-visualization/08-02-PLAN.md) — Create HolderNode (teal), StockNode (amber), and GraphCanvas client component with d3-force layout

**Wave 3:**
- [ ] [08-03-PLAN.md](.planning/phases/08-network-graph-visualization/08-03-PLAN.md) — Create /graph/holder/[name] and /graph/entity/[id] page routes; add graph entry links to holders-table.tsx

---

*Last updated: 2026-03-15*
*v1.0 complete. v1.1 phases 5-7 added. Phase 8 planned: 3 plans in 3 waves.*
