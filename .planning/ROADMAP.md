# ROADMAP - IDX Ownership Visualizer

**Project:** IDX Ownership Visualizer
**Version:** 1.0 (MVP)
**Last Updated:** 2026-03-14
**Granularity:** Standard (5-8 phases expected)

---

## Progress Summary

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 1/4 | In progress | 01-02 |
| 2. Core Visualization | 0/4 | Not started | - |
| 3. User Experience | 0/3 | Not started | - |
| 4. Enhancement Features | 0/3 | Not started | - |

**Overall Progress:** 1/14 plans complete (7%)

---

## Phases

- [ ] **Phase 1: Data Foundation** - PDF extraction pipeline and database schema for ownership data storage
- [ ] **Phase 2: Core Visualization** - Per-Emiten view with searchable, sortable stock list and detail pages
- [ ] **Phase 3: User Experience** - Responsive mobile layout, loading states, and landing page
- [ ] **Phase 4: Enhancement Features** - Historical comparison, per-holder view, and top movers dashboard

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
- [ ] [01-01-PLAN.md](.planning/phases/01-data-foundation/01-01-PLAN.md) — Database schema setup with Drizzle ORM (4 tables, composite keys, indexes)
- [x] [01-02-PLAN.md](.planning/phases/01-data-foundation/01-02-PLAN.md) — PDF extraction pipeline with pdf-parse and fallback strategies ✅

**Wave 2 (Parallel):**
- [ ] [01-03-PLAN.md](.planning/phases/01-data-foundation/01-03-PLAN.md) — Data validation with Zod schemas
- [ ] [01-04-PLAN.md](.planning/phases/01-data-foundation/01-04-PLAN.md) — Import workflow with API endpoint and CLI script

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

**Plans:** TBD

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

**Plans:** TBD

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

**Plans:** TBD

---

## v2+ Requirements (Future)

Deferred to post-MVP releases:

- **[ANAL-01]** Accumulation/Disposal Detection — Automatically flag significant ownership changes (>5%)
- **[SECT-01]** Sector Analysis — Aggregate ownership by sector (requires external sector mapping data)
- **[COMP-01]** Cross-Holder Comparison — Compare holdings between two investors
- **[API-01]** Public API — Provide API access for developers

---

## Traceability Matrix

| Requirement | Phase | Status | Plans |
|-------------|-------|--------|-------|
| DATA-01: PDF Extraction Pipeline | Phase 1 | Pending | 01-02, 01-04 |
| DATA-02: Database Schema Design | Phase 1 | Pending | 01-01 |
| DATA-03: Data Quality Validation | Phase 1 | Pending | 01-03, 01-04 |
| EMIT-01: Stock Listing Page | Phase 2 | Pending | - |
| EMIT-02: Stock Detail Page | Phase 2 | Pending | - |
| CORE-01: Sortable Tables | Phase 2 | Pending | - |
| CORE-02: Search & Filter | Phase 2 | Pending | - |
| CORE-03: Data Freshness Indicator | Phase 2 | Pending | - |
| CORE-04: Export to CSV | Phase 2 | Pending | - |
| UX-01: Responsive Mobile Layout | Phase 3 | Pending | - |
| UX-02: Loading States | Phase 3 | Pending | - |
| UX-03: Landing Page | Phase 3 | Pending | - |
| HIST-01: Historical Comparison | Phase 4 | Pending | - |
| HOLD-01: Per-Holder View | Phase 4 | Pending | - |
| DASH-01: Top Movers Dashboard | Phase 4 | Pending | - |

**Coverage:** 16/16 requirements mapped (100%) ✓

---

## Phase Dependencies

```
Phase 1: Data Foundation (foundation)
    ↓
Phase 2: Core Visualization (requires data)
    ↓
Phase 3: User Experience (requires core features)
    ↓
Phase 4: Enhancement Features (requires core + historical data)
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

---

## Out of Scope

Explicitly excluded from v1:

- Real-time updates (IDX data is monthly)
- Portfolio tracking (adds authentication complexity)
- Trading signals (legal liability, ownership ≠ trading signal)
- User authentication (frictionless public access is differentiator)
- Social features (comments, discussion)
- Predictive analytics (overpromising, wrong predictions damage credibility)
- Multi-exchange support (dilutes focus, IDX focus is competitive moat)
- User-uploaded PDFs (quality control, storage costs, abuse potential)
- Alert system (monthly cadence makes alerts low urgency)

---

*Last updated: 2026-03-14*
*Next action: `/gsd:execute-phase 01-data-foundation`*
