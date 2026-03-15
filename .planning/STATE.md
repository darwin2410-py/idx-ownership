---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-03-15T15:11:14.907Z"
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 25
  completed_plans: 24
---

# STATE - IDX Ownership Visualizer

**Project:** IDX Ownership Visualizer
**Last Updated:** 2026-03-15
**Session:** 7 - v1.1 Roadmap Created (Phases 5-7)

---

## Project Reference

### Core Value
Menyediakan akses instan dan terstruktur ke data kepemilikan 1% saham IDX untuk mendeteksi accumulation pattern dan quick lookup pemegang saham.

### What This Is
Website publik untuk visualisasi data kepemilikan 1% saham IDX. Data diambil dari PDF yang dirilis IDX bulanan, diekstrak dan disimpan dalam database untuk mendukung analisa historis dan deteksi akumulasi/disposal.

### Current Focus
v1.1 Lineage & Entity Linking — memungkinkan user menelusuri kepemilikan berdasarkan orang/entitas dengan entity grouping dan aggregate view.

---

## Current Position

**Milestone:** v1.1 (Lineage & Entity Linking) - COMPLETE
**Phase:** 7 (Aggregate Views) - COMPLETE
**Plan:** 08-02 complete
**Status:** In progress (Phase 8)
**Progress Bar (v1.0):** ██████████ 100% (15/15 plans)
**Progress Bar (v1.1):** ██████████ 100% (7/7 plans)
**Progress Bar (v1.2):** [██░░░░░░░░] 20% (2/10 plans — Phase 8 graph UI components done)

### Next Action
Phase 8 Plan 03: Build /graph/holder/[name] and /graph/entity/[id] page routes + wire holder name links on /stocks/[code].

### Context File
`.planning/phases/08-network-graph-visualization/08-02-SUMMARY.md` - Most recent plan summary

### Recent Work
**Session 14:** Phase 7 Plan 02 Complete (Phase 7 COMPLETE — v1.1 COMPLETE)
- Added findOwnershipByStockWithEntityContext() to ownership-repository.ts with LEFT JOINs to entity_holders + entities
- Exported HolderRowWithEntity type with holderId, entityId, entityName fields
- Added buildDisplayRows() pure function and DisplayRow discriminated union to stock-detail-comparison.tsx
- StockDetailComparison renders blue entity aggregate cards above HoldersTable when holders share an entity
- Stocks with no entity grouping: entityRows.length === 0, section hidden (no regression)
- Set revalidate = 0 on /stocks/[code] for immediate alias change visibility
- npm run build exits 0; all success criteria pass
- Commits: f69f9e5 (ownership-repository), 1909364 (stock-detail-comparison)

**Session 13:** Phase 7 Plan 01 Complete
- Added findEntityPortfolio() to entity-repository.ts: groups ownership records by stock, sums shares + percentage per entity across all aliases
- Created EntityPortfolioTable client component with TanStack Table expandable rows
- Created /entities/[id]/portfolio page (server component, parallel data fetch)
- Auto-fix: wired /stocks/[code] page to findOwnershipByStockWithEntityContext (74ca5ce)
- npm run build exits 0

**Session 12:** Phase 6 Plan 03 Complete (Phase 6 COMPLETE)
- Created /entities server page with entity table (name, alias count, Lihat link) and empty state
- Created EntityCreateForm client component: POST /api/entities, 409 shows inline error, 201 clears + router.refresh()
- Created /entities/[id] server page: findEntityById (notFound if null), findAliasesByEntityId
- Created EntityAliasesTable client component: per-row Hapus button calls DELETE /api/entities/[id]/aliases/[holderId] + router.refresh()
- Created AliasSearchCombobox using cmdk Command.Dialog: 300ms debounce, min 2 chars, pg_trgm results, 409 conflict shown inline
- Added "Entitas" nav link to layout.tsx (between Beranda and Daftar Saham)
- npm run build exits 0; /entities and /entities/[id] visible in build output
- Commits: 1f502a7 (Task 1: list page + create form), c1d4057 (Task 2: detail + combobox + nav)

**Session 11:** Phase 6 Plan 02 Complete
- Created entity-repository.ts with 8 exported functions: createEntity, findAllEntities, findEntityById, findEntityByHolderId, findAliasesByEntityId, addAlias, removeAlias, searchHoldersByTrigram
- pg_trgm fuzzy search uses db.execute() raw SQL with % operator; SET similarity_threshold = 0.2 before query
- Created 4 API routes: POST/GET /api/entities, POST /api/entities/[id]/aliases, DELETE /api/entities/[id]/aliases/[holderId], GET /api/holders/search
- 409 conflict on POST aliases returns ownerEntityName by calling findEntityByHolderId after catching PG 23505
- DELETE alias removes from entity_holders only — ownership_records never touched
- npm run build exits 0; all 4 routes visible in build output
- Commits: 9bea7f6 (entity-repository.ts), f02941d (4 API routes)

**Session 10:** Phase 6 Plan 01 Complete
- Installed cmdk@1.1.1 for entity grouping Command combobox UI
- Added entities table (id, name UNIQUE, description, created_at) to Drizzle schema
- Added entity_holders join table with UNIQUE(holder_id) — prevents holder double-counting at DB level
- Created tables in Neon via direct SQL (drizzle-kit push blocked by interactive TTY on existing ownership_records constraint)
- Enabled pg_trgm extension; created GIN index holders_canonical_name_trgm_idx; similarity('test','test') = 1 confirmed
- Build passes: npm run build exits 0, npx tsc --noEmit clean
- Commits: be7d141 (schema), 972432c (Neon DDL + pg_trgm)

**Session 9:** Phase 5 Plan 02 Complete
- Discovered second extractor bug: replace(/[A-Z]{3}$/, '') at line 122 of pdf-extractor.ts was stripping last 3 chars of holder names ending in uppercase (e.g. "PRAJOGO PANGESTU" -> "PRAJOGO PANGE")
- Removed the trailing 3-char strip — Tbk boundary logic already excludes type code, making the strip redundant and destructive
- Fixed audit-holder-names.ts to fallback to .env when .env.local is absent
- Cleared all old data, re-imported with both fixes applied: 7253 clean records stored
- Short-name holders reduced from 1046 (20.22%) to 446 (8.57%) — remaining are legitimate single-name individuals
- "PRAJOGO PANGESTU" confirmed in full in DB (id=19260, len=16)
- Commits: 42d640e (audit script dotenv fix), 097c64e (extractor trailing-strip fix)

**Session 8:** Phase 5 Plan 01 Complete
- Fixed tryIDXConcatenatedStrategy() in pdf-extractor.ts using Tbk boundary + first non-global type code match
- Eliminated holder name truncation caused by type codes embedded in emiten names (e.g. CPD in 'ASURANSI CPD')
- Created audit-holder-names.ts script for Neon DB holder name quality auditing
- Dry-run on ownership_one_percent_202603.pdf: 7211 records extracted (threshold: 7000+)
- Commits: 76c2216 (audit script), 2c150ca (pdf-extractor fix)

**Session 7:** v1.1 Roadmap Created
- Added Phase 5: PDF Fix & Data Quality (PARSE-01, PARSE-02)
- Added Phase 6: Entity Data Model & Management (ENTITY-01, ENTITY-02, ENTITY-03)
- Added Phase 7: Aggregate Views (AGGR-01, AGGR-02)
- Updated traceability matrix: 23/23 requirements mapped (100%)
- Updated REQUIREMENTS.md traceability for all v1.1 requirements
- All 7 v1.1 requirements mapped to phases with observable success criteria

**Session 6:** Plan 04-03 Complete (Phase 4 COMPLETE)
- Added three repository functions: getTopAccumulators(), getTopDisposals(), getMostActiveStocks()
- Created PeriodFilter component with Indonesian month names and URL state encoding
- Created TopMoversTable component supporting accumulators, disposals, and active-stocks types
- Created dashboard page at /dashboard with parallel data fetching and conditional rendering
- Added Spinner component to stock-states.tsx for loading states
- All 4 tasks completed with atomic commits
- Commits: 17ade9e, 8ba4ba3, b03482b, bbc60e4

**Plan 04-02 Complete:** Per-Holder View
- Created HolderSearch component with debounced input (300ms delay)
- Created HoldingsTable component with sortable columns and clickable stock links
- Created holders listing page at /holders with search integration
- Created holder detail page at /holders/[id] showing complete portfolio
- Added CSV export API endpoint for downloading holder portfolios
- All 5 tasks completed in 123 seconds (2 minutes)
- Commits: 7daa9c4, 9f83dc3, bbecd3f, fce8078

**Plan 04-01 Complete:** Month-over-Month Historical Comparison
- Added three repository functions: getPreviousPeriod(), getHistoricalComparison(), getAllPeriods()
- Enhanced HoldersTable with comparison mode: status badges (BARU/KELUAR), color-coded changes (green ↑ / red ↓)
- Created API endpoint /api/stocks/[code]/comparison for on-demand historical data fetching
- Created StockDetailComparison client component with comparison toggle button
- Added row highlighting: blue tint for new holders, gray tint for exited holders
- All 3 tasks completed in 8 minutes
- Commits: c52c688, 7e0ce97, ff630dc
- Button text: 'Bandingkan Bulan Lalu' / 'Sembunyikan Perbandingan'

---

## Performance Metrics

**Planning Metrics:**
- Total Requirements: 23 (17 v1.0 + 7 v1.1 — includes HIST-01, HOLD-01, DASH-01 previously in v1.1 post-MVP)
- Requirements Mapped: 23 (100%)
- Phases Defined: 7 (5 complete, 2 new for v1.1)
- Total Success Criteria: 34 (20 v1.0 + 14 v1.1)
- Average Criteria per Phase: ~5

**Complexity Assessment:** HIGH
- PDF extraction fix with historical backfill (data integrity risk)
- Entity grouping schema design (join table with conflict detection)
- Aggregate query patterns (GROUP BY JOIN, cache invalidation)
- Fuzzy search tuning for Indonesian corporate names

---

## Accumulated Context

### Pending Todos
**2 todos pending:**
- `fix-deployment-protection-and-import-initial-data` - Deployment protection blocking access, database empty
- `add-network-graph-ownership-visualization` - Interactive force-directed graph (nodes: entity/holder/emiten, edges: ownership stake)

### Roadmap Evolution
- Phase 8 added: Network Graph Visualization

### Key Decisions Made

1. **Next.js Framework** (Decision ID: KD-001)
   - Rationale: Rekomendasi user + great for Vercel deployment, SEO-friendly untuk public site
   - Outcome: Implemented (Next.js 15 + React 19 + TypeScript 5.7)
   - Date: 2025-03-14

2. **Full History Storage** (Decision ID: KD-002)
   - Rationale: Enable historical comparison dan trend analysis
   - Outcome: Implemented (schema supports append-only historical records)
   - Date: 2025-03-14

3. **Public Access** (Decision ID: KD-003)
   - Rationale: Simplify development, maximize reach
   - Outcome: Pending implementation
   - Date: 2025-03-14

4. **Neon Database** (Decision ID: KD-004)
   - Rationale: @vercel/postgres deprecated, Neon is recommended replacement
   - Outcome: Implemented (@neondatabase/serverless + drizzle-orm/neon-http)
   - Date: 2026-03-14

5. **Zod Runtime Validation** (Decision ID: KD-005)
   - Rationale: Type-safe runtime validation, excellent error messages, TypeScript integration
   - Outcome: Implemented (schemas for all ownership fields, validation service with logging)
   - Date: 2026-03-14

6. **Ownership Sum < 100% is Expected** (Decision ID: KD-006)
   - Rationale: IDX PDFs only contain >1% holders, smaller holders excluded
   - Outcome: Implemented (logs WARNING not ERROR for <100% sums)
   - Date: 2026-03-14

7. **Server Component Data Fetching** (Decision ID: KD-007)
   - Rationale: Best for SEO, fast initial load, less client JS, automatic caching
   - Outcome: Implemented (stock detail page with parallel Promise.all() fetching)
   - Date: 2026-03-14

8. **Server-Side CSV Export** (Decision ID: KD-008)
   - Rationale: No browser memory limits, handles large datasets, consistent UTF-8 encoding
   - Outcome: Implemented (API endpoint at /api/stocks/[code]/export)
   - Date: 2026-03-14

9. **Indonesian Localization** (Decision ID: KD-009)
   - Rationale: User familiarity, professional appearance for local market
   - Outcome: Implemented (Indonesian headers, holder types, month names)
   - Date: 2026-03-14

10. **Mobile-First Responsive Design** (Decision ID: KD-010)
    - Rationale: Indonesian users heavily use mobile devices, need touch-friendly interface
    - Outcome: Implemented (sticky columns, 48px touch targets, responsive breakpoints)
    - Date: 2026-03-14

11. **Sticky First Column for Tables** (Decision ID: KD-011)
    - Rationale: Users need context (stock code or holder name) when scrolling horizontally
    - Outcome: Implemented (position: sticky with left-0 and z-10, bg-white)
    - Date: 2026-03-14

12. **Touch Target Sizing 48px Minimum** (Decision ID: KD-012)
    - Rationale: WCAG 2.1 AAA recommends 44x44px, 48px provides comfortable margin
    - Outcome: Implemented (min-h-12 on all buttons and inputs)
    - Date: 2026-03-14

13. **Holder ID as URL Parameter** (Decision ID: KD-013)
    - Rationale: Numeric IDs are clean and URL-safe, holder names can be long/special characters
    - Outcome: Implemented (/holders/[id] route pattern)
    - Date: 2026-03-15

14. **Search Result Limit of 50** (Decision ID: KD-014)
    - Rationale: Prevents performance degradation, most users find what they need in top 50
    - Outcome: Implemented (searchHoldersByName limits to 50 results)
    - Date: 2026-03-15

15. **CSV Export via API Route** (Decision ID: KD-015)
    - Rationale: Server-side generation avoids browser limits, consistent with stock export pattern
    - Outcome: Implemented (/api/holders/[id]/export endpoint)
    - Date: 2026-03-15

16. **Join Table for Entity Grouping (not nullable FK)** (Decision ID: KD-016)
    - Rationale: A direct FK on holders cannot support audit trail, clean ungroup, or conflict detection; join table with composite PK and UNIQUE holder_id prevents double-counting
    - Outcome: Pending (Phase 6)
    - Date: 2026-03-15

17. **Manual Entity Grouping with Fuzzy Search Assist** (Decision ID: KD-017)
    - Rationale: Automated ML entity resolution rejected — false positives corrupt financial data; pg_trgm fuzzy search finds candidates, human confirms before saving
    - Outcome: Pending (Phase 6)
    - Date: 2026-03-15

18. **PDF Fix Before Entity Grouping** (Decision ID: KD-018)
    - Rationale: Building entity groups on truncated holder names creates wrong aliases that require manual re-merge; fixing source data first eliminates this compounding debt
    - Outcome: Implemented (Phase 5, Plan 01)
    - Date: 2026-03-15

19. **Tbk Boundary Anchor for IDX Holder Name Extraction** (Decision ID: KD-019)
    - Rationale: In IDX PDFs, the emiten "Tbk" always precedes the investor section. Using indexOf('Tbk') as a boundary cleanly separates emiten name from investor name without relying on last type code occurrence (which fails when emiten name contains a type code substring)
    - Outcome: Implemented (pdf-extractor.ts, Phase 5, Plan 01)
    - Date: 2026-03-15

20. **Non-Global Regex for Type Code Matching** (Decision ID: KD-020)
    - Rationale: Using /g flag on a regex in a loop causes stateful lastIndex reuse bug; non-global regex with .match() is idiomatic and avoids the pitfall entirely
    - Outcome: Implemented (TYPE_CODE_NONGLOBAL in pdf-extractor.ts)
    - Date: 2026-03-15

21. **No Post-Boundary Trailing Strip in PDF Extractor** (Decision ID: KD-021)
    - Rationale: After Tbk boundary + first type code match, the holder name is already clean. Stripping trailing [A-Z]{3} is destructive to names ending in 3 uppercase chars (e.g. PANGESTU, SALIM, BAKRIE)
    - Outcome: Implemented (removed replace(/[A-Z]{3}$/, '') from pdf-extractor.ts line 122, Phase 5 Plan 02)
    - Date: 2026-03-15

22. **Direct SQL DDL for New Tables (not drizzle-kit push)** (Decision ID: KD-022)
    - Rationale: drizzle-kit push triggered interactive TTY prompt about renaming unique_period_emiten_holder constraint on existing 7253-row table; --force flag did not bypass it; direct SQL with IF NOT EXISTS is idempotent, non-interactive, and safe
    - Outcome: Implemented (scripts/create-entity-tables.ts, Phase 6, Plan 01)
    - Date: 2026-03-15

23. **Entity aggregate rows rendered as cards above HoldersTable** (Decision ID: KD-023)
    - Rationale: Inserting aggregate rows inside HoldersTable would require modifying TanStack Table data model and row rendering logic; rendering as separate <div> cards above the table keeps HoldersTable unchanged and maintains clear visual separation of entity context from individual holder records
    - Outcome: Implemented (stock-detail-comparison.tsx, Phase 7, Plan 02)
    - Date: 2026-03-15

24. **revalidate = 0 on /stocks/[code] (no caching)** (Decision ID: KD-024)
    - Rationale: Entity alias changes at /entities/[id] must be immediately visible on /stocks/[code]; a 3600s cache would show stale entity aggregate rows after an alias is added or removed
    - Outcome: Implemented (src/app/stocks/[code]/page.tsx, Phase 7, Plan 02)
    - Date: 2026-03-15

25. **BackgroundVariant.Dots enum required for @xyflow/react v12** (Decision ID: KD-025)
    - Rationale: @xyflow/react v12 TypeScript types only accept BackgroundVariant enum values, not string literals like "dots"; string literal causes TS2322 type error
    - Outcome: Implemented (graph-canvas.tsx, Phase 8, Plan 02)
    - Date: 2026-03-15

26. **onNodeClick + router.push for graph navigation (not Link inside node)** (Decision ID: KD-026)
    - Rationale: Wrapping ReactFlow custom nodes in Next.js Link interferes with the library's drag detection; click-based navigation via onNodeClick callback is the correct pattern
    - Outcome: Implemented (graph-canvas.tsx, Phase 8, Plan 02)
    - Date: 2026-03-15

### Stack Choices
- **Frontend:** Next.js 15 + React 19 + TypeScript 5.x
- **Styling:** Tailwind CSS
- **Database:** Neon + Drizzle ORM
- **PDF Processing:** pdf-parse
- **Validation:** Zod
- **Charts/Tables:** TanStack Table 8.x
- **State:** @tanstack/react-query + Zustand (pending)
- **Deployment:** Vercel (pending)
- **Fuzzy Search (v1.1):** pg_trgm (built into Neon PostgreSQL, GIN index)
- **Entity Grouping UI (v1.1):** shadcn Command combobox (cmdk, already installed)

### Architecture Approach
Server-first Next.js with:
- Server Components for data fetching and static layout
- Client Components for interactivity (charts, tables, search)
- Repository pattern for data access
- API route handlers with validation
- Service layer for PDF extraction and historical analysis
- v1.1 addition: persons + person_holders join table hanging off existing holders table (no FK chain modification); aggregate queries computed at read time via GROUP BY JOIN

### Critical Risks Identified

1. **Brittle PDF Extraction** (Highest Priority)
   - Impact: When IDX changes PDF format, extraction logic fails silently
   - Mitigation: Versioned extraction modules, multiple strategies, data validation, store raw PDFs

2. **Shareholder Name Deduplication**
   - Impact: Name variations prevent accurate historical tracking
   - Mitigation: Canonical entity table, normalization rules, fuzzy matching, manual merge workflow

3. **Performance Degradation**
   - Impact: Historical joins on millions of rows timeout
   - Mitigation: Indexing strategy, partitioning, materialized views, Redis caching

4. **Missing Data ≠ Zero**
   - Impact: Shareholders below 1% threshold disappear but still hold shares
   - Mitigation: Mark as "below_threshold", track last known position, show "< 1%"

5. **Entity Double-Counting** (v1.1)
   - Impact: Aggregate percentages inflated if a holder appears in two groups
   - Mitigation: UNIQUE constraint on holder_id in person_holders; 409 conflict response before save

6. **Fuzzy Search Over-Merging Indonesian Names** (v1.1)
   - Impact: PT Astra International and PT Astra Otoparts share high trigram similarity; wrong merge corrupts aggregates
   - Mitigation: Strip PT/Tbk before scoring; threshold 0.85-0.90 for institutional; require user confirmation

---

## Session Continuity

### Previous Session Actions
- `/gsd:new-project` initialized project structure
- Research completed (PDF extraction, visualization patterns, critical pitfalls)
- Requirements defined and categorized (v1.0: 17, v1.1: 7)
- Roadmap created with 4 phases (v1.0)
- All v1.0 phases planned and implemented (Phases 1-4 complete)

### Current Session
- v1.1 roadmap phases 5-7 appended to ROADMAP.md
- STATE.md updated to reflect v1.1 milestone
- REQUIREMENTS.md traceability updated for all v1.1 requirements
- 23/23 requirements mapped (100%)

### Next Session Actions
1. `/gsd:plan-phase 5` — Create detailed plans for Phase 5: PDF Fix & Data Quality
2. Fix pdf-extractor.ts truncation bug (lastTypeIdx logic — see research/PITFALLS.md)
3. Audit existing holders table for truncated names before writing fix
4. Confirm historical PDFs are retained on disk before committing to backfill approach

### Blockers
None identified.

### Technical Debt
- Fuzzy search threshold for Indonesian names needs empirical tuning against production holders table (Phase 6)
- Historical re-extraction feasibility depends on whether original PDF files are still on disk (verify at Phase 5 start)

---

## Research Notes

### Research Confidence: HIGH (v1.1)
- Stack confirmed: pg_trgm via Neon official docs; @xyflow/react React 19 peer-dep verified
- PDF truncation mechanism identified in pdf-extractor.ts lines 90-114 (PITFALLS.md)
- Architecture confirmed: join table pattern, GIN index, bipartite graph queries
- Build order derives directly from FK dependencies (clean names → schema → aggregate)

### Research Flags
- **Phase 5:** No external research needed — code-level fix to existing pdf-extractor.ts; truncation mechanism already identified
- **Phase 6:** No external research needed — junction table, pg_trgm GIN index, shadcn Command combobox all well-documented
- **Phase 7:** No external research needed — standard GROUP BY JOIN SQL + Next.js cache invalidation

### Gaps to Address
- Fuzzy threshold tuning: pg_trgm threshold for Indonesian corporate names needs empirical validation against actual holders table (Phase 6)
- PDF extractor regression coverage: full set of truncation patterns in existing holders table is unknown — audit first (Phase 5)
- Historical re-extraction feasibility: confirm all historical PDFs are retained on disk before committing to backfill (Phase 5 start)

---

## Configuration

**Mode:** yolo
**Granularity:** standard (5-8 phases expected)
**Parallelization:** enabled
**Auto-advance:** disabled

**Workflow Settings:**
- Research: Complete
- Plan check: Enabled
- Verifier: Enabled
- Nyquist validation: Enabled

---

## Deployment Status

**Target:** Vercel (user will provide access)
**Current Status:** Not deployed
**Environment:** Development

**Deployment Checklist:**
- [ ] Set up Vercel project
- [ ] Configure Vercel Postgres database
- [ ] Set up environment variables
- [ ] Configure custom domain (if applicable)
- [ ] Set up monitoring and error tracking

---

## File Locations

**Planning Files:**
- `.planning/PROJECT.md` - Project overview and constraints
- `.planning/REQUIREMENTS.md` - Requirements specification with traceability
- `.planning/ROADMAP.md` - Phase structure and success criteria (Phases 1-7)
- `.planning/STATE.md` - This file (project memory)
- `.planning/research/SUMMARY.md` - Research findings and implications (v1.1)
- `.planning/config.json` - Workflow configuration

**Project Structure:**
```
/ (root)
├── app/                    # Next.js App Router
├── components/             # React components (Server + Client)
├── lib/                    # Utilities and helpers
│   ├── db/                # Database client and schema
│   ├── services/          # PDF extraction, historical analysis
│   └── repositories/      # Data access layer
├── public/                # Static assets
└── scripts/               # Data import and maintenance scripts
```

---

*Last updated: 2026-03-15*
*Session: 7 - v1.1 Roadmap Created (Phases 5-7)*
