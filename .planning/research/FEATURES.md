# Feature Research

**Domain:** Financial ownership data — entity linking and lineage visualization for IDX shareholding platform
**Researched:** 2026-03-15 (v1.1 update; v1 section preserved below)
**Confidence:** MEDIUM-HIGH

---

## Milestone Context

This file covers two milestones:

- **v1 (shipped):** Stock listing, holder search, historical comparison, top movers dashboard, per-holder portfolio view
- **v1.1 (current):** Entity linking — fuzzy search, name parsing fixes, manual entity grouping, aggregate ownership, network graph

The section below focuses on v1.1 new features. The original v1 research is preserved at the bottom.

---

## v1.1: Entity Linking Feature Landscape

### Existing DB Schema: What's Already There

The `holders` table already has `canonicalName` and `originalName` fields, indicating the schema anticipated deduplication. What's missing is a grouping layer — a way to say "these three distinct holder records are the same real person." The `ownershipRecords` table stores `holderId` as a foreign key, so aggregate queries across grouped holders are a join away once the grouping tables exist.

---

### Table Stakes (Users Expect These)

Features users assume exist for this milestone. Missing these = the entity linking feature feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Partial/fuzzy name search across all holders | Users know names but PDF names are truncated or inconsistently spelled; exact match fails silently | LOW | Fuse.js client-side is sufficient for a dataset of hundreds to low-thousands of holder names. Threshold 0.4–0.5 recommended for name matching. |
| Match highlighting in search results | Users can't verify why a result appeared without seeing which characters matched | LOW | Standard in every search UI; omitting it makes fuzzy results untrustworthy |
| Fix truncated holder names at source | "Prajogo Pangestu" appearing as "Prajogo Pange" destroys trust across the whole platform | MEDIUM | Root cause: IDX PDF tables have fixed column widths that cut long names. Fix requires PDF extractor update plus a one-time re-extraction script for historical data. |
| Aggregate combined ownership % per emiten | Core payoff of entity grouping — "this family controls 8.3% of TLKM combined" | MEDIUM | Sum ownershipPercentage across grouped holders for a given emiten + period. Must show which individual holders are contributing. |
| Combined shares count in aggregate view | Users want absolute share numbers, not only percentages, to detect block movements | LOW | Already stored in ownershipRecords.sharesOwned; needs aggregation query only |

### Differentiators (Competitive Advantage)

Features that set this product apart from global platforms for this milestone.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Manual entity grouping (alias tagging) | Bloomberg charges enterprise fees for entity resolution. A free tool letting Indonesian investors manually link "Hartono family" entities is novel in this market. | MEDIUM | Requires new `entity_groups` and `entity_group_members` tables. Must be admin-only in v1.1 — wrong groupings corrupt aggregates for all users. |
| Network graph: holder-emiten relationships | Visually reveals cross-holding patterns (one family controls multiple blue chips) that are invisible in tables | HIGH | Cytoscape.js with react-cytoscapejs is the right library — it has an expand/collapse extension designed for compound graphs. React Flow is simpler but less suited for multi-entity ownership networks. |
| "Also holds" sidebar on holder/group detail | When viewing "Hartono family" group, showing the same entity appears as top-5 holder in BBCA, BMRI, ACES creates instant cross-emiten value | LOW | Query is a straightforward join on holderId across ownershipRecords; no new data required |
| Rank-within-emiten for aggregated group | "If combined, this group would rank #2 among all holders in TLKM" makes the data actionable for accumulation analysis | MEDIUM | Requires computing aggregate rank against all non-grouped holders for the same emiten+period |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic/ML entity resolution | "Just detect duplicates automatically" seems like it saves work | False positives are catastrophic in financial data. Research confirms finance requires 95%+ similarity thresholds vs 80% for marketing data. ML needs labeled training data that doesn't exist for IDX holder names. Incorrectly merging two distinct entities corrupts ownership totals permanently. | Manual grouping with fuzzy search as an assist for finding candidates |
| Public/crowdsourced entity grouping | "Let users submit groupings" | Wrong groupings from any user affect all users. Indonesian conglomerate structures are genuinely contested (which entities "count" as Sinar Mas vs independently managed). No moderation = data integrity problems within weeks. | Admin-only groupings for v1.1. If community adoption warrants it, add a pending/approved workflow later. |
| Force-directed (animated) graph layout | Animated layouts look impressive in demos | For ownership data with 200+ nodes, force-directed layouts produce unreadable hairball graphs. Performance degrades badly in React at scale. Users can't extract meaning from a hairball. | Fixed hierarchical layout with zoom/pan. Filter nodes before rendering (e.g., show only top-10% holders). |
| Threshold tuning slider for fuzzy search | "Let users adjust fuzziness" | Threshold sliders confuse non-technical users. Most don't understand Levenshtein distance. | Pick a sensible default (0.4), expose a simple "include more results" toggle that switches to 0.6 threshold |
| Full UBO (Ultimate Beneficial Owner) lineage | Tracking that PT A is owned by PT B which is owned by Person C | Requires a separate corporate hierarchy database. IDX PDFs only show direct holders. This is what Bloomberg sells for enterprise fees and what OpenCorporates has spent years building. | Out of scope. When users need UBO lookup, link to OpenCorporates. |

---

## Indonesian Market Specifics

### Why This Matters for Entity Grouping

The IDX PDF format creates predictable, recurring name variations that the entity grouping system must accommodate. These are not edge cases — they affect the most prominent holders in the dataset.

### Corporate Entity Name Patterns

**Prefix/suffix variations (common in IDX data):**
- `PT [Name]` vs `PT [Name] Tbk` — same company before and after IPO, or parent vs listed subsidiary
- `PT [Name]` vs `[Name]` — PDFs sometimes drop the PT prefix when the column is narrow
- `PT [Name] Indonesia` vs `PT [Name]` — regional subsidiary vs parent entity

**Individual name variations (extremely common):**
- Indonesian names have no standardized format — many Indonesians use a single name or a two-word name with no family/given distinction ("Prajogo Pangestu" is a complete name, not "Pangestu, Prajogo")
- PDF column truncation cuts names at fixed widths: "Prajogo Pangestu" → "Prajogo Pange", "Sri Prakash Lohia" → "Sri Prakash Lo"
- Chinese-Indonesian names appear in multiple forms: Romanized Chinese ("Anthoni Salim"), Dutch colonial transliteration ("Liem Sioe Liong"), or Indonesian-adopted name — all referring to the same person
- Honorifics and titles vary across PDFs: "H. Prayogo Pangestu", "Ir. Prajogo Pangestu", "Dr. Prajogo Pangestu" are all the same person

### Major Conglomerate Entity Clusters (Illustrative)

These clusters represent the kind of groupings the entity grouping system should support:

| Cluster | Common Entity Names in IDX PDFs |
|---------|--------------------------------|
| Hartono family (Djarum) | Djarum-prefixed entities, Farindo entities, BCA-related entities |
| Widjaja family (Sinar Mas) | PT Sinar Mas [branch], multiple PT with "Sinar Mas" prefix |
| Riady family (Lippo) | Lippo-prefixed entities across banking, property, retail |
| Salim family | PT Indofood, PT Indomaret, various PT Salim entities |
| Government/BUMN | "Pemerintah Republik Indonesia", "PT Taspen", "BPJS Ketenagakerjaan" |

**Critical rule:** Government/BUMN entities must never be auto-suggested or auto-grouped with private entities, even if name similarity is high. "PT Saham Dua Lima" (government) ≠ private PT.

---

## Feature Dependencies

```
Fix PDF Name Truncation
    └──enables──> Fuzzy Search (cleaner source data improves match quality)
    └──enables──> Entity Grouping (truncated names cause false grouping proposals)
    └──requires──> Re-extraction script for historical data already in DB

Fuzzy Search
    └──required by──> Entity Grouping UX (users discover candidates to group via search)

Entity Grouping (new entity_groups + entity_group_members tables)
    └──required by──> Aggregate Ownership View
    └──required by──> Network Graph (groups become single collapsed nodes)

Aggregate Ownership View
    └──enhances──> Rank-within-emiten calculation
    └──enhances──> Historical comparison (existing feature; can now compare grouped totals over time)

Network Graph
    └──depends on──> Entity Grouping (groups needed for meaningful collapsed nodes)
    └──enhances──> Aggregate Ownership View (clicking a graph node opens aggregate view)
```

### Dependency Notes

- **Name truncation fix requires historical re-extraction:** Historical data already in the DB contains truncated names. The fix only helps future imports unless a one-time re-import script is run against stored PDFs. Plan for this script as part of the truncation fix.
- **Entity grouping must be admin-only for v1.1:** Without a review workflow, any incorrect grouping corrupts aggregates. Schema needs `created_by` and `status` (pending/approved) fields even if only admin approval is used in v1.1.
- **Network graph can ship after aggregate view:** The aggregate view delivers most analytical value with far less implementation complexity. Graph is a differentiator, not table stakes for this milestone.

---

## MVP Definition for v1.1

### Launch With (v1.1 core)

Minimum viable for the "entity linking and lineage" milestone.

- [ ] **Fix PDF name truncation** — foundational; all other features build on clean names
- [ ] **Fuzzy search with match highlighting** — unblocks entity discovery; without this, grouping is manual and tedious
- [ ] **Entity grouping — admin CRUD** — new entity_groups + entity_group_members tables; admin UI to create/edit/delete groups
- [ ] **Aggregate ownership view per emiten** — combined %, combined shares, contributing holder list; the payoff for entity grouping

### Add After Validation (v1.1.x)

- [ ] **Rank-within-emiten for aggregated group** — analytical punch; add when users ask "how does this group rank vs others?"
- [ ] **"Also holds" sidebar on holder/group detail** — cross-emiten navigation; add when user navigation patterns show demand
- [ ] **Historical comparison for groups** — combined group ownership trend over time; depends on existing comparison infrastructure being extended

### Future Consideration (v2+)

- [ ] **Network graph visualization** — high implementation cost; valuable but not essential for core use case; defer until aggregate view proves value
- [ ] **Export grouped data to CSV** — useful but not blocking any core flow
- [ ] **Public grouping submissions with admin review** — only if community adoption warrants the moderation overhead

---

## Feature Prioritization Matrix (v1.1)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fix PDF name truncation + re-extraction | HIGH | MEDIUM | P1 |
| Fuzzy search + highlight | HIGH | LOW | P1 |
| Entity grouping schema (entity_groups table) | HIGH | LOW | P1 |
| Entity grouping admin UI | HIGH | MEDIUM | P1 |
| Aggregate ownership view | HIGH | MEDIUM | P1 |
| Rank-within-emiten for group | MEDIUM | LOW | P2 |
| "Also holds" sidebar | MEDIUM | LOW | P2 |
| Historical comparison for groups | MEDIUM | MEDIUM | P2 |
| Network graph visualization | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis (v1.1 scope)

| Feature | Bloomberg/Refinitiv | OpenCorporates | This product |
|---------|---------------------|----------------|--------------|
| Entity resolution | Automated ML-based, enterprise pricing, global | API-based corporate hierarchy lookup, free tier limited | Manual grouping with fuzzy search assist — appropriate for dataset size and trust requirements |
| Aggregate ownership | Full beneficial ownership rollup | Corporate tree rollup only | Combined % per emiten for manually-defined groups |
| Network graph | Corporate hierarchy charts | Entity relationship visualization | Cytoscape.js holder-emiten graph with group nodes (v2) |
| Fuzzy name search | Proprietary NLP matching | Reconciliation API | Fuse.js client-side, threshold ~0.4–0.5 |
| Indonesian market | Generic global coverage; IDX data gaps | Good legal entity data; no IDX PDF parsing | Built specifically for IDX 1% disclosure format |

---

## Sources

- [Bloomberg: Shareholding Disclosure — Making Complexity Manageable](https://www.bloomberg.com/professional/insights/trading/shareholding-disclosure-making-complexity-manageable/)
- [Refinitiv: Verified Legal Entity Data](https://www.refinitiv.com/en/products/verified-entity-data)
- [OpenOwnership: Reconciling Beneficial Ownership Data](https://www.openownership.org/en/blog/reconciling-beneficial-ownership-data/)
- [OpenCorporates: Can You Trust Your Shareholder Data?](https://blog.opencorporates.com/2025/03/28/can-you-trust-your-shareholder-data/)
- [Fuse.js Documentation](https://www.fusejs.io/)
- [Cytoscape.js](https://js.cytoscape.org/)
- [Cytoscape.js Expand/Collapse Extension](https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse)
- [Graph Visualization UX — Cambridge Intelligence](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/)
- [Fuzzy Matching 101 — Data Ladder](https://dataladder.com/fuzzy-matching-101/)
- [NebulaGraph: Visualize Shareholding Networks](https://www.nebula-graph.io/posts/shared-holding)
- [IDX 1% Shareholding Disclosure Requirement — Caproasia](https://www.caproasia.com/2026/03/04/indonesia-stock-exchange-idx-strengthens-listed-company-shareholding-disclosure-requirement-to-1-threshold-from-previous-5-threshold-with-immediate-effect-shareholders-with-minimum-1-shareholding-n/)
- [PT Tbk Indonesia Public Company Guide — InvestinAsia](https://investinasia.id/blog/public-limited-company-in-indonesia-guide/)
- [Indonesian Conglomerates — Indonesia Investments](https://www.indonesia-investments.com/news/todays-headlines/top-listed-indonesian-conglomerates-with-largest-market-capitalization/item2226)

---

## v1 Feature Research (Original — Preserved for Reference)

**Domain:** Financial Data Visualization - Stock Ownership/Institutional Holdings
**Researched:** 2025-03-14
**Confidence:** MEDIUM

### Table Stakes (v1)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Sortable Tables** | Users expect to click column headers to sort | LOW | Standard across all financial platforms |
| **Search/Filter** | Users need to find specific stocks or holders instantly | LOW | Must support partial matches, case-insensitive |
| **Historical Data Access** | Financial data without history is useless for trend analysis | MEDIUM | Need month-over-month comparison capability |
| **Export to CSV/Excel** | Users want to analyze data offline | LOW | Must preserve data integrity and formatting |
| **Responsive Design** | Users access from mobile/tablet/desktop | MEDIUM | Financial tables are hard on mobile |
| **Data Freshness Indicator** | Users need to know how current the data is | LOW | Simple "Last updated: [date]" badge |
| **Per-Emiten View** | Primary use case: "Who owns stock X?" | MEDIUM | Top holders list with percentage ownership |
| **Per-Holder View** | Secondary use case: "What does holder Y own?" | MEDIUM | Reverse lookup from holdings to stocks |
| **Basic Charts** | Visual representation of ownership changes | MEDIUM | Line charts for historical trends |
| **Fast Page Load** | Financial users are time-sensitive | HIGH | Need proper indexing, pagination, or lazy loading |

### Differentiators (v1)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Accumulation/Disposal Detection** | Automatically flags significant ownership changes (>5%) | HIGH | Requires historical comparison logic |
| **IDX-Specific PDF Extraction** | No one else parses Indonesian IDX PDFs into structured data | HIGH | Core technical differentiator |
| **Historical Trend Charts** | Visual timeline of ownership changes | MEDIUM | Shows accumulation patterns |
| **Top Movers Alert** | "Biggest accumulators/disposals this month" dashboard | MEDIUM | Drives repeat visits |
| **Indonesian Language Support** | Local market advantage | MEDIUM | Increases local adoption |
| **Shareable Views** | URL with filters pre-applied | LOW | Enable sharing analysis |

### Anti-Features (v1)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-Time Updates** | "We want live ownership data!" | IDX data is monthly; real-time is impossible | Be explicit: "Monthly updates from IDX PDFs" |
| **Portfolio Tracking** | Track my portfolio alongside ownership | Adds auth, complexity, scope creep | Keep as lookup tool |
| **Trading Signals** | Tell me when to buy/sell | Legal liability; ownership data ≠ trading signal | Provide data only |
| **Social Features** | Comments, discussions | Moderation burden | Link to existing communities |
| **User Authentication** | Save preferences, watchlists | Adds dev time, reduces accessibility | URL parameters for sharing |

---

*Feature research for: IDX Ownership Visualizer*
*v1 researched: 2025-03-14 | v1.1 update: 2026-03-15*
