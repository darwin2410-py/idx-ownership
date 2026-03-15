# Project Research Summary

**Project:** IDX Ownership Visualizer — v1.1 Lineage & Entity Linking
**Domain:** Financial ownership data — entity resolution and network visualization for IDX shareholding platform
**Researched:** 2026-03-15
**Confidence:** HIGH

## Executive Summary

The IDX Ownership Visualizer v1.1 adds entity linking on top of an already-shipped v1 stack (Next.js 15, React 19, Neon PostgreSQL, Drizzle ORM). The core challenge is that IDX PDF extraction produces inconsistent and truncated holder names — "Prajogo Pangestu" becomes "Prajogo Pange" — making it impossible to group the same real-world person across stocks and periods without first fixing the source data. The recommended approach is to treat this as a data quality problem first (fix the PDF extractor, backfill historical records), then build the grouping layer as a thin admin-only join table on top of the existing schema, and finally add read-time aggregate queries and optional graph visualization on top.

The stack additions for v1.1 are minimal by design: pg_trgm (built into Neon PostgreSQL) handles fuzzy holder name search without a separate search service, @xyflow/react handles network graph rendering with React 19 compatibility, and shadcn's Command component (already present via cmdk) handles the entity grouping admin UI. No new infrastructure or external services are required. The only new npm package is `@xyflow/react`.

The most significant risk is data integrity: incorrect entity groupings corrupt ownership aggregates for all users and are difficult to detect automatically. The mitigation is strict design choices — join table (not nullable FK on holders), admin-only writes, unique constraint preventing a holder from belonging to two groups, and conflict detection surfaced to the user before any merge is saved. Automated ML entity resolution must be explicitly rejected; manual grouping with fuzzy search as a candidate-finding assist is the correct approach for this dataset size and trust requirement.

---

## Key Findings

### Recommended Stack

The v1.1 additions require only one new npm package. The existing Neon PostgreSQL database gains a `pg_trgm` extension (one SQL statement, zero infrastructure change) for indexed fuzzy search on holder names. @xyflow/react replaces raw D3 or Cytoscape.js for network graph rendering — it is React-native, React 19 compatible, and sized for the expected graph scale (< 200 nodes per view). The shadcn Command combobox (cmdk transitive dep, already installed) handles the entity grouping UI.

See full details: `.planning/research/STACK.md`

**Core technologies:**
- **pg_trgm** (Neon PostgreSQL built-in): fuzzy holder name search — indexed, scales to 5000+ holders, zero extra dependency
- **@xyflow/react ^12.10.1**: network graph visualization — React-native, React 19 peer-dep confirmed, pan/zoom built-in
- **cmdk ^1.1.1 via shadcn Command**: entity grouping combobox UI — already present as shadcn transitive dep
- **drizzle-orm `sql` tag** (existing): raw pg_trgm similarity() queries — no version bump needed
- **d3-force ^3.0.0** (optional, 5KB): custom layout for @xyflow/react if default auto-layout is insufficient at 100+ nodes

**What NOT to add:** Meilisearch/Elasticsearch (overkill for 5000 names), Fuse.js as primary search (requires loading all names client-side on every cold start), full D3 (500KB, DOM conflicts with React), Cytoscape.js (150KB, Canvas rendering, overkill for < 200 nodes), vis-network (React wrappers unmaintained 5-8 years).

### Expected Features

See full details: `.planning/research/FEATURES.md`

**Must have for v1.1 launch (P1):**
- Fix PDF name truncation + backfill historical data — foundational; all other features depend on clean names
- Fuzzy search with match highlighting — unblocks entity discovery; without this, grouping is manual and tedious
- Entity grouping admin CRUD (`persons` + `person_holders` tables) — admin-only in v1.1, no public writes
- Aggregate ownership view per emiten — combined %, combined shares, contributing holder list; the core payoff

**Should have after validation (P2):**
- Rank-within-emiten for aggregated group — "this group would rank #2 in TLKM"
- "Also holds" sidebar on holder/group detail — cross-emiten navigation
- Historical comparison for groups — extends existing comparison infrastructure

**Defer to v2+ (P3):**
- Network graph visualization — high implementation cost; aggregate view delivers most value first
- Export grouped data to CSV
- Public grouping submissions with admin review workflow

**Anti-features to reject:** Automated ML entity resolution (false positives corrupt financial data; no labeled training data exists for IDX names), public/crowdsourced grouping (data integrity risk without moderation), animated force-directed graph layout (hairball at 200+ nodes), full UBO lineage (requires separate corporate hierarchy database, out of scope).

**Indonesian market specifics that must be accommodated:** PT/Tbk prefix stripping before similarity scoring; Chinese-Indonesian name dual forms (Romanized vs. colonial transliteration); honorific variants (H., Ir., Dr.); government/BUMN entities must never be auto-suggested for merge with private entities even at high similarity scores.

### Architecture Approach

The architecture adds two new tables (`persons`, `person_holders`) that hang off the side of the existing `holders` table without modifying any existing FK chain. All ownership_records remain linked to holders; persons are an editorial grouping layer above holders. Aggregate queries compute at read time via GROUP BY JOIN — no denormalization on the persons row. The graph is bipartite (persons to emitens, no person-to-person edges at this scope), handled by two simple SELECT queries merged in a GraphService rather than recursive CTEs.

See full details: `.planning/research/ARCHITECTURE.md`

**Major components:**
1. **persons + person_holders tables** — new schema; composite PK prevents duplicate mappings; CASCADE/RESTRICT FK design preserves ownership_records integrity on delete
2. **HolderRepository** (new) — fuzzy search via pg_trgm GIN index; stateless, parameterized queries only
3. **PersonService** (new) — CRUD for persons and holder assignments; aggregate ownership query logic
4. **GraphService** (new) — two-query pattern (nodes UNION + edges GROUP BY), merged in service layer; never rendered server-side
5. **API routes** — `/api/holders/search`, `/api/persons/[id]/holders`, `/api/graph` — graph query logic lives in service, not route handler
6. **Migration files** — 0001 (schema: persons + person_holders), 0002 (pg_trgm extension + GIN index, kept separate because CREATE EXTENSION is superuser DDL)

**Build order (hard dependencies):** Schema migration → PDF parsing fix → Person/holder management API+UI → Aggregate view → Graph visualization

### Critical Pitfalls

See full details: `.planning/research/PITFALLS.md`

1. **PDF name truncation creates ghost holder records** — The extractor's `lastTypeIdx` logic fails when an emiten name contains a substring matching a type code (CPD, SCD). Fix the extractor first and run a backfill migration against all historical PDFs; orphaned truncated holders must be re-mapped before entity grouping begins, or aliases will be wrong from the start.

2. **group_id as nullable FK on holders instead of join table** — A direct FK cannot support audit trail, clean ungroup, or conflict detection. Use `person_holders` join table with composite PK, `added_at`, and `alias_note`. Never put grouping state directly on the holders row.

3. **Holder in two groups causes aggregate double-counting** — Ownership percentages are counted twice if a holder_id appears in multiple groups. Enforce `UNIQUE (holder_id)` in the junction table and add a pre-insert conflict check with a human-readable 409 response rather than a raw 500 constraint violation.

4. **Fuzzy search threshold too low merges unrelated Indonesian names** — PT Astra International and PT Astra Otoparts score high on trigram similarity due to shared prefix. Strip PT/Tbk tokens before scoring, raise threshold to 0.85-0.90 for institutional names, always require user confirmation before saving a merge — never auto-apply.

5. **Network graph freezes browser with full dataset** — 955 stocks + 5172 holders = ~13,000 graph elements, well above the ~7,000 element degradation threshold for react-force-graph. Enforce a hard 200-node cap at the API level. Default view must be a filtered subgraph (single entity + immediate connections, max 50 nodes). Lazy-load the graph component with `dynamic({ ssr: false })`.

---

## Implications for Roadmap

Based on research, the architecture's explicit build order maps directly to phases. No phase can be safely reordered without breaking downstream work.

### Phase 1: PDF Parsing Fix + Data Backfill

**Rationale:** All v1.1 features depend on clean holder names. Building entity grouping on top of truncated names creates aliases that must be manually re-merged later — a compounding debt that grows with every group created. This must be resolved first.

**Delivers:** Fixed PDF extractor for current and future imports; backfill migration that re-maps truncated holder records in existing ownership_records; audit query confirming no orphaned holders after backfill.

**Addresses:** FEATURES.md P1 "Fix truncated holder names at source"; PITFALLS Pitfall 1 (ghost records) and Pitfall 9 (historical backfill divergence).

**Avoids:** Entering entity grouping phase with dirty source data that would require re-grouping after the fix. A holder named "PRAJOGO PANGE" in the DB at grouping time becomes an alias for the wrong string.

**Research flag:** Skip research-phase — code-level fix to existing pdf-extractor.ts; the truncation mechanism is already identified in PITFALLS.md with specific line numbers.

### Phase 2: Schema Migration + Entity Grouping Admin

**Rationale:** Tables must exist before any feature can use them. Entity grouping is admin-only in v1.1; shipping it before the aggregate view validates the data model against real data before investing in the read-side.

**Delivers:** `persons` and `person_holders` tables with correct constraints (composite PK, `UNIQUE holder_id`, `alias_note`, `added_at`); pg_trgm extension + GIN index migration; admin UI for creating persons, fuzzy-searching holder candidates, and linking holders to persons with conflict detection.

**Uses:** pg_trgm (STACK), cmdk/shadcn Command combobox (STACK), Drizzle sql tag (STACK).

**Implements:** HolderRepository (fuzzy search), PersonService (CRUD), `/api/holders/search` and `/api/persons/[id]/holders` routes (ARCHITECTURE).

**Avoids:** Pitfall 2 (FK vs join table), Pitfall 3 (double-counting via unique constraint), Pitfall 8 (conflict detection with 409 response), Pitfall 10 (pg_trgm not enabled in production).

**Research flag:** Skip research-phase — patterns are well-established: junction table design, pg_trgm GIN index, shadcn combobox are all confirmed via official sources.

### Phase 3: Aggregate Ownership View

**Rationale:** This is the primary payoff of entity grouping — "the Hartono family controls X% of BBCA combined." It must be built before the graph because graph nodes represent entities that need meaningful aggregate data. It also requires updating the existing historical comparison to be group-aware to avoid two inconsistent views of the same data shown on different pages.

**Delivers:** Aggregate ownership view per emiten showing combined %, combined shares, and contributing holder list for each person entity; updated `getHistoricalComparison()` with optional groupId parameter; rank-within-emiten for grouped entities (P2); cache invalidation on group membership changes via `revalidatePath()`.

**Implements:** PersonService aggregate query pattern (GROUP BY JOIN CTE from ARCHITECTURE.md Pattern 3); prerequisite aggregate query for GraphService.

**Avoids:** Pitfall 6 (inconsistent historical comparison if existing function is not updated), Pitfall 7 (stale cache after ungroup), Pitfall 3 (double-counting verified with automated assertions: sum of individual member percentages equals group aggregate for each stock).

**Research flag:** Skip research-phase — standard SQL aggregation patterns; Next.js cache invalidation via revalidatePath is documented.

### Phase 4: Network Graph Visualization

**Rationale:** Deferred from v1.1 core MVP per FEATURES.md — highest implementation cost, not table stakes. Ships only after the aggregate view validates that entity groupings are useful and the data model is stable. The graph is a differentiator, not a prerequisite for value delivery.

**Delivers:** Filtered network graph (default: single entity + immediate connections, max 50 nodes; expandable to 200 node hard cap); @xyflow/react rendering with lazy loading (no SSR); period-scoped graph API that rejects requests without a periodId; node sizing by ownership percentage; reset-to-default-view control.

**Uses:** @xyflow/react ^12.10.1 (STACK); d3-force if auto-layout insufficient at 100+ nodes (STACK).

**Implements:** GraphService two-query pattern (nodes UNION + edges GROUP BY from ARCHITECTURE.md Pattern 4); `/api/graph` route with hard cap enforcement.

**Avoids:** Pitfall 5 (browser freeze — hard cap enforced at API level, not frontend), Pitfall 11 (bundle bloat — lazy load with `dynamic({ ssr: false })`), Pitfall 12 (edge explosion — graph API requires `periodId`, rejects requests without it).

**Research flag:** Consider research-phase if team is unfamiliar with @xyflow/react — custom layout configuration with d3-force is moderately complex, and subgraph filtering UX patterns for financial data have sparse documentation. If team is already familiar with @xyflow/react, skip.

### Phase Ordering Rationale

- Phase 1 before Phase 2: truncated names in the DB at grouping time create aliases for wrong strings; re-fixing names after grouping is far more expensive than fixing before — every incorrect alias requires manual re-merge.
- Phase 2 before Phase 3: the aggregate query requires persons and person_holders to exist with real data to be meaningful; an empty entity table produces no validation signal.
- Phase 3 before Phase 4: graph nodes represent entity groups; without aggregate data those nodes have no useful weight or label information. The graph is a visual layer on top of the aggregate, not an independent feature.
- Graph deferred from v1.1 core: per FEATURES.md, the aggregate view delivers most analytical value at far lower cost. Validate demand from the aggregate view before investing in the graph.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Network Graph):** @xyflow/react custom layout integration with d3-force, subgraph filtering interaction patterns, and pre-computed server-side layout are moderately complex. If the team has not used @xyflow/react before, a `/gsd:research-phase` focused on layout configuration and the expand/collapse interaction pattern is worthwhile.

Phases with standard patterns (skip research-phase):
- **Phase 1 (PDF Fix):** Code-level analysis already done in PITFALLS.md with specific file locations and truncation mechanism identified. No external research needed.
- **Phase 2 (Schema + Entity Grouping):** Junction table, pg_trgm GIN index, shadcn Command combobox — all well-documented and confirmed via official sources.
- **Phase 3 (Aggregate View):** Standard GROUP BY JOIN SQL + Next.js cache invalidation. Well-documented patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions confirmed via npm registry; pg_trgm confirmed via Neon official docs; @xyflow/react React 19 peer-dep verified via `npm info` |
| Features | MEDIUM-HIGH | Table stakes derived from domain analysis and competitor research; IDX-specific name patterns verified against known real holder data; prioritization is opinionated but defensible against FEATURES.md analysis |
| Architecture | HIGH | Standard SQL patterns (junction table, GIN index, bipartite graph queries); all confirmed via official Drizzle + Neon docs; build order derives directly from FK dependencies |
| Pitfalls | HIGH (v1.1) / MEDIUM (v1) | v1.1 pitfalls backed by GitHub issue benchmarks, code-level analysis of pdf-extractor.ts at specific line numbers, and standard data integrity principles; v1 pitfalls based on general domain knowledge |

**Overall confidence:** HIGH

### Gaps to Address

- **Fuzzy threshold tuning for Indonesian names:** The right pg_trgm similarity threshold for Indonesian corporate names (after PT/Tbk stripping) is stated as 0.85-0.90 institutional / 0.2 for search, but needs empirical validation against the actual holders table. Plan a tuning pass during Phase 2 implementation using real production data from Neon.
- **PDF extractor regression coverage:** PITFALLS.md identifies the truncation mechanism but the full set of truncation patterns in the existing holders table is unknown. A one-time audit (count holder names under 10 characters, check for known truncated values like "PRAJOGO PANGE") should be the first task in Phase 1.
- **Historical re-extraction feasibility:** If original PDF files are no longer stored on disk, the backfill migration in Phase 1 cannot re-extract from source. Confirm whether all historical PDFs are retained before committing to the backfill approach; if not, a manual name correction script is the fallback.
- **@xyflow/react at 100-200 nodes with React 19:** React 19 compatibility is confirmed by peer-dep range but there is no explicit React 19 callout in release notes. If graph performance is problematic at 100+ nodes, the d3-force layout fallback and the potential Sigma.js/WebGL upgrade path should be evaluated in Phase 4.

---

## Sources

### Primary (HIGH confidence)
- `npm info @xyflow/react peerDependencies` — confirmed `react >= 17`, React 19 compatible
- Neon pg_trgm docs (https://neon.com/docs/extensions/pg_trgm) — extension supported, enabled via CREATE EXTENSION
- PostgreSQL pg_trgm official docs — GIN index, similarity threshold 0.3 default
- Drizzle custom migrations docs (https://orm.drizzle.team/docs/kit-custom-migrations) — custom SQL migration pattern
- Drizzle migrations with Neon (https://neon.com/docs/guides/drizzle-migrations) — neon-http driver behavior confirmed
- react-force-graph GitHub Issue #223 — degradation at ~7,000 total graph elements, maintainer-confirmed
- Next.js lazy loading docs — `dynamic({ ssr: false })` pattern for browser-only libraries
- pdf-extractor.ts code analysis (lines 90-114) — truncation bug mechanism confirmed by reading actual codebase

### Secondary (MEDIUM confidence)
- npmtrends: fuse.js vs flexsearch — fuse.js ~3.5M weekly downloads, context for library choice
- Cytoscape.js GitHub Discussion #3088 — ~1,000 nodes before rendering degradation
- Flagright / Splink documentation — fuzzy threshold tuning required per domain
- OpenOwnership: Reconciling Beneficial Ownership Data — entity resolution approaches for financial data
- IDX 1% Shareholding Disclosure Requirement (Caproasia, 2026-03-04) — disclosure threshold and data format context
- Indonesian Conglomerates (Indonesia-Investments) — conglomerate entity cluster patterns for grouping examples

### Tertiary (LOW confidence)
- React Flow 12 release notes — React 19 compatibility inferred from peer-dep range; no explicit callout in release notes

---

*Research completed: 2026-03-15*
*Ready for roadmap: yes*
