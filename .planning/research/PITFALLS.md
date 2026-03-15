# Pitfalls Research

**Domain:** Stock Ownership Data Visualization — v1.1 Entity Linking, Fuzzy Search, Network Graph
**Researched:** 2026-03-15
**Confidence:** HIGH (v1.1 pitfalls) / MEDIUM (v1 original pitfalls)

---

## About This File

This document covers two concern areas:

1. **v1.1 Milestone Pitfalls** (sections below) — specific to adding entity resolution, manual alias grouping, fuzzy search, and network visualization to the existing system. This is the primary focus for the current milestone.
2. **v1 Foundation Pitfalls** (appended at end) — original concerns about PDF extraction, historical comparison, and database design. Still valid for ongoing operations.

---

## Critical Pitfalls — v1.1 Entity Linking Milestone

### Pitfall 1: PDF Name Truncation Produces Ghost Holder Records

**What goes wrong:**
The IDX concatenated format extracts holder names as substrings derived from type code position. Names like "Prajogo Pangestu" become "Prajogo Pange" when the type code (`SCD`, `CPD`, etc.) appears mid-name by coincidence, or when `Tbk` boundary detection cuts name extraction early. This creates a ghost holder with a truncated name that never matches the real person across months. Every re-import creates a new truncated record or fails to link to an existing correct record.

**Why it happens:**
The current extractor in `pdf-extractor.ts` (lines 90-107) finds the LAST occurrence of a known investor type code, then uses the position of "Tbk" as a split boundary. When the emiten name contains a substring that looks like a type code (e.g., "INDUSTRI JASA CPD" where "CPD" is part of a company name), `lastTypeIdx` lands in the wrong place. The fallback at line 109-114 uses `replace(/[\d.,]+$/, '')` which does not guard against short remaining strings.

**Concrete risk in current code:**
```
withoutDate: "INDUSTRI SEMEN GRESIK TbkPRAJOGO PANGESTU SCDINDONESIA..."
             ┌──────────────────────────────────────────────────────┐
             After finding last SCD position (which is correct here),
             substring(0, lastTypeIdx) = "INDUSTRI SEMEN GRESIK TbkPRAJOGO PANGESTU "
             tbkIdx + 3 → " PRAJOGO PANGESTU "   ← correct

But if emiten name contains CPD/SCD abbreviation:
             "ASURANSI CPD INDONESIA TbkPRAJOGO PANGESTU SCDINDONESIA..."
             lastTypeIdx lands on the CPD in emiten name
             holderName = wrong substring
```

**How to avoid:**
- Build a regression test suite with known holder names from actual PDFs: include names that are known to have been truncated ("Prajogo Pange" as a red flag).
- Add minimum length check: holder names under 8 characters are suspicious for individual investors — log a warning.
- Verify extracted holder name against a whitelist of known major holders (top 20 recurring institutional holders as ground truth).
- After the fix, run the extractor over all historical PDFs already imported and audit the `holders` table for truncated names.
- Add post-extraction audit: count unique holder names that appear only once across all periods — these are candidates for truncation errors.

**Warning signs:**
- Holder names shorter than 10 characters appearing in individual investor positions.
- Same person appearing with 2–3 similar but differently-truncated names across different stock PDFs in the same month.
- Historical comparison showing "new" holders month-over-month for high-profile investors (Prajogo Pangestu, Anthoni Salim, etc.).
- The `holders` table having entries like "PRAJOGO PANGE", "PRAJOGO PAN", "PRAJOGO PANGEST" as separate rows.

**Phase to address:**
**Phase 1 (PDF Parsing Fix)** — Must be resolved before entity grouping, because if truncated names persist in the DB they will create split entity groups that require manual re-merging later.

---

### Pitfall 2: Entity Group Data Model Prevents Clean Ungroup

**What goes wrong:**
The entity grouping schema is designed one-directional: holder records get assigned a `group_id`. When a user later decides to ungroup (e.g., two "Sinar Mas" entities were incorrectly merged), there is no record of which holders were manually grouped vs. which were in the group from the start. The ungroup operation does not know what the original state was, leaving orphaned group records or requiring full group deletion.

A second failure mode: if `group_id` is stored on the `holders` table as a nullable foreign key, adding a holder to a group is an UPDATE. The system loses the history of when the grouping was created and by whom.

**Why it happens:**
Grouping is often modeled as a simple parent-child: holder has `group_id`, group has a name. This is sufficient for reads but not for reversibility. The join table approach (separate `entity_group_members` table) is slightly more complex upfront but is the only model that supports clean ungroup, audit trail, conflict detection, and partial membership.

**How to avoid:**
Use a many-to-many join table, not a nullable foreign key on `holders`:

```sql
entity_groups (
  id SERIAL PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT  -- manual grouping: log who did it
);

entity_group_members (
  group_id INT REFERENCES entity_groups(id) ON DELETE CASCADE,
  holder_id INT REFERENCES holders(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  note TEXT,        -- reason for linking this alias
  PRIMARY KEY (group_id, holder_id)
);
```

**Never** put `group_id` directly on the `holders` row — a holder can theoretically appear in two candidate groups during conflict resolution, and the join table handles this as a database constraint violation rather than silent overwrite.

**Warning signs:**
- Schema migration adds `group_id` as a nullable column on `holders` instead of a separate join table.
- No `added_at` or `created_by` columns on the grouping relationship.
- Ungroup operation implemented as `UPDATE holders SET group_id = NULL` — this loses audit trail.
- No unique constraint preventing a holder from being added to two groups simultaneously.

**Phase to address:**
**Phase 2 (Entity Grouping Schema)** — Design the join table from the start. Adding audit columns later requires a migration that cannot backfill historical data.

---

### Pitfall 3: Aggregate Double-Counting When One Holder Appears In Two Groups

**What goes wrong:**
A holder record (`holder_id = 42`, "Sinar Mas Group") is added to two entity groups by mistake — "Sinar Mas Group" and "Eka Tjipta Widjaja Family". When the aggregate view for both groups computes total ownership in stock SMGR, it sums holder 42's shares in both groups, effectively counting the same 15% twice. The aggregate view shows "Sinar Mas Group: 32%" and "Eka Tjipta Widjaja Family: 28%" when the actual combined correct number is lower.

**Why it happens:**
The aggregate query JOINs `entity_group_members` to `ownership_records` without checking for holder-group exclusivity. A GROUP BY on `group_id` will naturally re-count a holder that appears in multiple groups.

**How to avoid:**
- Add a database-level unique constraint: `UNIQUE (holder_id)` on `entity_group_members` or enforce via application logic that a holder can only belong to one group at a time.
- Before inserting into `entity_group_members`, check if `holder_id` already belongs to any other group. If yes, surface a conflict error to the user rather than silently adding.
- The aggregate query should use DISTINCT holder_ids within a group to guard against accidental duplicates: `SUM(DISTINCT ownership_records.shares_owned)` is not correct (different holders may own the same count by coincidence) — use a CTE that first deduplicates members, then joins to ownership.
- Automated test: insert a holder into two groups, run aggregate query, assert the shares are counted once.

**Warning signs:**
- Entity group aggregate ownership percentage exceeds 100% for a single stock.
- Two different entity groups show overlapping holder IDs when queried.
- No unique constraint or application-level guard on `holder_id` in the group members table.
- Aggregate total across all groups exceeds total reported ownership in source PDF.

**Phase to address:**
**Phase 2 (Entity Grouping Schema) and Phase 3 (Aggregate View)** — Constraint goes in schema; query correctness is verified when building the aggregate view page.

---

### Pitfall 4: Fuzzy Search Threshold Too Low Merges Unrelated Indonesian Names

**What goes wrong:**
Indonesian corporate names have a high degree of structural similarity: "PT Astra International Tbk", "PT Astra Otoparts Tbk", "PT Astra Agro Lestari Tbk" — these are separate companies, not aliases. A Levenshtein or Jaro-Winkler similarity score at threshold 0.80 will suggest merging "PT Astra International" with "PT Astra Otoparts" because they share a 13-character common prefix. In the manual grouping UI, the fuzzy search for "Astra" as a candidate alias will return all three Astra entities with high similarity scores, and a user who acts too quickly will merge distinct entities.

The same problem applies to individual names: "Anthoni Salim" and "Andres Salim" score 0.87 on Jaro-Winkler. "Sinarmas" and "Sinar Mas" differ only by a space.

**Why it happens:**
Generic similarity algorithms do not know domain rules:
- `PT` and `Tbk` are noise prefixes/suffixes that should be stripped before comparison.
- Company group name (e.g., "Astra") is not sufficient for identity — the suffix after the group name distinguishes entities.
- Indonesian names often share surnames ("Salim", "Widjaja", "Bakrie") — a shared surname alone does not indicate the same person.

**How to avoid:**
- Strip legal form tokens before similarity scoring: remove `PT`, `Tbk`, `CV`, `Yayasan`, `Foundation`, `Ltd`, `Corp` from both strings before computing similarity.
- After stripping, apply a higher threshold (0.90+ for institutional names, 0.85 for individuals).
- The fuzzy search suggestion UI should show similarity score to the user, not pre-select merges. The user confirms or rejects each suggested match.
- Implement a block list: company names that share a group prefix (Astra, Sinar Mas, BCA, Mandiri) should never be auto-suggested for merge — require manual explicit confirmation.
- For the search UI, use `pg_trgm` trigram similarity (PostgreSQL extension) for the search box, not for merge suggestions. Keep merge suggestions as a separate, more conservative operation.

**Warning signs:**
- Fuzzy merge suggestions surface more than 5 candidates for any single search term.
- "PT Astra International Tbk" and "PT Astra Otoparts Tbk" appear as merge candidates.
- The holder count drops dramatically after implementing fuzzy merge (indicates over-merging).
- User reports that a stock's top holder looks wrong after a merge operation.

**Phase to address:**
**Phase 3 (Fuzzy Search Implementation)** — Threshold tuning and the UI confirmation flow must be designed together, not as an afterthought.

---

### Pitfall 5: Network Graph Freezes Browser With Full Dataset

**What goes wrong:**
The full dataset has 955 stocks and 5172 holders. A naive network graph rendering all of these as nodes with edges for each ownership relationship would create approximately 7,209 edges (matching the record count). At this scale, D3 force simulation runs on the main thread and takes 30–60 seconds to stabilize, freezing the browser tab. Even with canvas rendering instead of SVG, the layout computation is the bottleneck.

Published benchmarks from `react-force-graph` GitHub issues show significant degradation beyond 7,000 total elements (nodes + edges combined). The full ownership graph would have 955 + 5172 + 7209 = 13,336 elements — nearly double the threshold.

**Why it happens:**
Developers prototype with a subset (50 nodes, 100 edges) where force simulation is fast, then connect the graph component to production data without testing at scale. The Vercel serverless function returns all graph data in one JSON response, the client renders all of it, and the tab becomes unresponsive.

**How to avoid:**
- Never render the full graph. The graph must always be a filtered subgraph.
- Default view: show a single entity group and its immediate connections (the holders in the group → their top 5 stocks by ownership). Maximum 50 nodes.
- "Expand" interaction: clicking a stock node adds its other top holders (up to 10). The graph grows incrementally, user-driven.
- Set a hard cap: reject rendering requests that would produce more than 200 nodes. Show a warning and suggest filtering.
- Use `react-force-graph` with `warmupTicks={100}` and `cooldownTicks={0}` to pre-compute layout on load, avoiding visible layout animation that blocks interaction.
- Run force simulation in a Web Worker or use a library that does so (Sigma.js with WebGL is the high-performance option for larger graphs, but adds significant bundle size).
- Server-side: compute graph layout (x/y coordinates) using a layout algorithm like Fruchterman-Reingold before sending to client. Client only renders pre-positioned nodes.

**Warning signs:**
- The graph API endpoint returns more than 300 nodes in a single response.
- No filtering or pagination applied to graph data before rendering.
- Browser tab becomes unresponsive during graph load in testing with production data.
- No hard cap on node count in the graph component.

**Phase to address:**
**Phase 4 (Network Graph)** — The filtering and cap must be in the data-fetching layer, not a later optimization. Design the subgraph API endpoint before building the visualization.

---

### Pitfall 6: Adding Entity Groups Breaks Existing Historical Comparison Logic

**What goes wrong:**
The existing `getHistoricalComparison()` function in `ownership-repository.ts` (lines 852-943) builds comparison maps keyed by `holderName` (the canonical name string). When entity groups are introduced, the comparison should ideally show "Sinar Mas Group accumulated 3% in SMGR" rather than listing each alias separately. But the existing comparison code has no knowledge of groups. If groups are added as a UI overlay only (without modifying the comparison query), the historical comparison page will continue showing individual holder movements, and the entity group aggregate page will show a separate (and inconsistent) view of the same data.

The inconsistency misleads users: the stock detail page shows "PT Sinar Mas Agro Resources 5.2%, PT Smart Tbk 3.1%" as separate entries, while the entity group page shows "Sinar Mas Group: 8.3%". Users compare these two views and lose trust.

**Why it happens:**
Entity groups are implemented as a new feature on top of existing code, without updating the existing comparison logic. The existing code is working and passing tests, so developers are reluctant to modify it. The group-aware view is added as a separate page, creating two inconsistent truth sources.

**How to avoid:**
- Define a single query interface that accepts either a `holder_id` OR a `group_id` and returns the correct aggregate. Do not maintain two separate query paths.
- Update `getHistoricalComparison()` to accept an optional `groupId` parameter. When supplied, it aggregates across all holders in the group before computing the delta.
- In the UI, when viewing a stock's detail page, if a holder belongs to a group, show the group name with an expand-to-see-members affordance. Never show the same shares counted twice.
- Regression test: for any stock where a holder belongs to an entity group, assert that `sum(individual_percentages) == group_aggregate_percentage`.

**Warning signs:**
- Stock detail page and entity group aggregate page show different ownership numbers for the same entity.
- `getHistoricalComparison()` is not modified when entity groups are introduced.
- No test that crosses the boundary between individual holder view and group view.

**Phase to address:**
**Phase 2 (Entity Grouping) and Phase 3 (Aggregate View)** — The aggregate query must be built before the UI is built so that both pages use the same underlying data.

---

### Pitfall 7: Ungrouping Leaves Orphaned Group Record and Stale UI Cache

**What goes wrong:**
A user creates a group "Bakrie Family" with 4 holder aliases. Later, they ungroup one member ("PT Bakrie Telecom Tbk") because it was incorrectly included. The ungroup operation deletes the row from `entity_group_members`. However:
1. The group name "Bakrie Family" still exists in `entity_groups` with 3 remaining members.
2. If the aggregate view page is cached (Next.js ISR or React Query cache), it still shows the old 4-member aggregate.
3. If "PT Bakrie Telecom Tbk" was the only holder with data for a particular stock, ungrouping causes that stock to disappear from the group's aggregate — silently, with no explanation to the user.

**Why it happens:**
Cache invalidation is not tied to group membership changes. The ungroup operation is a database write (DELETE from `entity_group_members`) but does not trigger a revalidation of cached pages.

**How to avoid:**
- After any group membership change (add or remove), call `revalidatePath('/groups/[groupId]')` and `revalidatePath('/groups/[groupId]/aggregate')` in Next.js.
- If using React Query, invalidate the `['group', groupId]` query key on mutation success.
- In the aggregate view, show a "last updated at" timestamp derived from the most recent `entity_group_members.added_at` — if this timestamp is more recent than the cached page, the user sees a stale warning.
- Test case: add a holder to a group, verify the group aggregate updates. Remove the same holder, verify the aggregate correctly decreases.

**Warning signs:**
- Group aggregate page does not refresh after a member is added or removed.
- No cache invalidation call in the group membership mutation handler.
- No `updated_at` column on `entity_groups` or `entity_group_members`.

**Phase to address:**
**Phase 2 (Entity Grouping)** — Cache invalidation must be implemented as part of the CRUD operations for group membership, not as a later UI fix.

---

### Pitfall 8: Conflict Detection Not Implemented Before Grouping UI Ships

**What goes wrong:**
User tries to create a group "Salim Family" and add holders: "Anthoni Salim", "PT Indofood Sukses Makmur Tbk", "PT Indoritel Makmur Internasional Tbk". The system allows this. One week later, another user (or the same user in a different session) creates "Indofood Group" and tries to add "PT Indofood Sukses Makmur Tbk" again. The system either silently ignores the duplicate add, or throws a database constraint error with a cryptic message, or (worst case) if there is no unique constraint, adds the holder twice.

**Why it happens:**
The conflict detection UI (checking "is this holder already in another group before allowing add?") is treated as a nice-to-have, not a requirement. The database constraint prevents data corruption, but the user sees a 500 error instead of a clear conflict message.

**How to avoid:**
- Implement the uniqueness constraint at the database level: `UNIQUE (holder_id)` in `entity_group_members`.
- Before any add-to-group mutation, query: "does this holder_id already belong to a group?" If yes, show the user: "PT Indofood Sukses Makmur Tbk is already in group 'Salim Family'. Remove it there first, or add a different holder."
- The conflict check must happen in the same transaction as the insert to avoid race conditions.
- Show the current group membership of each holder in the "search for holder to add" UI, so the user sees conflicts before clicking add.

**Warning signs:**
- No unique constraint on `holder_id` in the group members table.
- The add-to-group API endpoint catches constraint violations and returns a 500 instead of a 409 with a human-readable message.
- The "search for holder" in the grouping UI does not show which group a holder currently belongs to.

**Phase to address:**
**Phase 2 (Entity Grouping)** — Conflict detection must be designed as part of the group CRUD, before the admin UI ships.

---

## Moderate Pitfalls

### Pitfall 9: Historical PDFs Contain Names That Differ From Fixed PDF

After fixing the PDF extractor for current PDFs, re-importing historical PDFs may produce different (potentially worse) holder names than were previously stored in the database. The `upsertHolder()` function uses `canonicalName` as the deduplication key. If the fixed extractor produces "PRAJOGO PANGESTU" but the database already has "PRAJOGO PANGE" from an earlier import, the fix creates a second holder record rather than updating the truncated one. Ownership records from historical periods remain linked to the truncated holder, while new imports link to the correct holder.

**Prevention:** After fixing the extractor, run a migration script that:
1. Re-extracts holder names from all historical PDFs using the new extractor.
2. For each corrected name, check if the old truncated name exists.
3. If yes, update `ownership_records.holder_id` to point to the correct holder, then delete the orphaned truncated holder.

**Phase to address:** Phase 1 (PDF Fix) must include a backfill migration, not just a forward-looking fix.

---

### Pitfall 10: pg_trgm Extension Not Enabled on Neon Database

The fuzzy search feature commonly uses PostgreSQL's `pg_trgm` extension for trigram-based similarity search. Neon (the project's database provider) supports `pg_trgm`, but it must be explicitly enabled via `CREATE EXTENSION IF NOT EXISTS pg_trgm`. If the migration does not include this, the `similarity()` and `%` operators will throw a "function does not exist" error in production, even though they work fine in local development if the extension was previously enabled manually.

**Prevention:** Include `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in the Drizzle migration file. Test the migration against a fresh Neon database before deploying.

**Phase to address:** Phase 3 (Fuzzy Search).

---

### Pitfall 11: Network Graph Library Bundle Size Bloats Initial Page Load

Graph visualization libraries are large: `react-force-graph` pulls in Three.js (~400KB gzipped), D3 force (~50KB), and sprite rendering utilities. If the graph component is imported at the page level rather than lazily loaded, the initial page bundle for the entity group page increases by 500KB+, degrading Lighthouse performance scores and First Contentful Paint.

**Prevention:** Use Next.js `dynamic(() => import('./GraphComponent'), { ssr: false })` to lazy-load the graph. The graph component requires `window` (browser-only), so `ssr: false` is required regardless. Verify with `@next/bundle-analyzer` after integration.

**Phase to address:** Phase 4 (Network Graph).

---

### Pitfall 12: Force Graph Edges Multiply for Multi-Period Data

If the graph query includes ownership records from multiple periods, the same holder-to-stock connection appears as multiple edges (one per period). With 12 months of history and 5172 holders, a "show history" mode could produce 86,604 edges. The graph becomes a hairball with no useful information.

**Prevention:** The graph query must be period-scoped (single period, typically the latest). If multi-period comparison is desired, encode it as edge thickness or color, not as separate edges. Design the graph API endpoint to always require a `periodId` parameter and reject requests without one.

**Phase to address:** Phase 4 (Network Graph).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `group_id` as nullable column on `holders` instead of join table | Simpler schema, one less table | Cannot support audit trail, clean ungroup, or conflict detection | Never — use join table |
| Fuzzy merge auto-applies without user confirmation | Faster entity resolution | Merges unrelated entities with similar names, requires painful manual un-merges | Never — always require confirmation |
| Graph renders all data for selected period without node cap | Simpler API and frontend | Browser freeze with 955+ stocks, 5172+ holders | Never — always apply a hard cap |
| Re-using existing `getHistoricalComparison()` without group awareness | No refactor needed | Two inconsistent views of ownership data | Only if groups are never shown on stock detail page (they should be) |
| Storing shareholder names as strings instead of entities | Simple schema, faster MVP | Cannot do historical tracking, deduplication nightmares | Only for prototype, never for production |
| Hardcoded PDF column positions | Works for first month | Breaks every time format changes | Only for spike exploration, never for production |
| No data validation on PDF import | Faster initial development | Silent data corruption, user mistrust | Never — always validate |

---

## Integration Gotchas

Common mistakes when connecting new v1.1 features to the existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Entity groups + existing search | Search returns individual holders that are members of groups, with no indication of group membership | In search results, show `[Member of: Sinar Mas Group]` badge next to the holder name |
| Entity groups + CSV export | Existing export at `/api/holders/[id]/export` exports individual holder data only | Add `/api/groups/[id]/export` that aggregates across all group members per period |
| Entity groups + historical comparison | `getHistoricalComparison()` compares by `holderName` string — group names don't appear in this map | Pass `groupId` to comparison query, aggregate members before comparing |
| Network graph + Vercel serverless | Graph data API must return within 10s (Hobby) or 30s (Pro) timeout | Pre-compute graph layout server-side, cache result. Never do force simulation in a serverless function. |
| pg_trgm + Drizzle ORM | Drizzle does not have a built-in `similarity()` function wrapper — use `sql` template literal | `sql\`similarity(${holders.canonicalName}, ${query}) > 0.4\`` in WHERE clause |
| react-force-graph + Next.js SSR | Library uses `window` and `document` at module level — breaks SSR | `dynamic(() => import('./ForceGraph'), { ssr: false })` — mandatory, not optional |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Graph renders all nodes for a period | Browser tab freezes on load, 60+ second white screen | Hard cap at 200 nodes, default to 50; require user filtering | Always with 955 stocks + 5172 holders |
| Aggregate query without period scoping | Aggregate query scans entire `ownership_records` table (7209 rows) for every page load | Always filter by `period_id`, use composite index on `(group_id, period_id)` | Noticeable at 12+ months of history |
| Fuzzy search `ilike '%query%'` on `holders.canonical_name` without index | Search takes 500ms+ on 5172 holder names | Add `pg_trgm` GIN index on `canonical_name`; use trigram similarity instead of ilike for fuzzy | At 5000+ holders |
| Aggregate query with N+1 per group member | For each member of a group, fetch ownership records separately | Single JOIN query: `entity_group_members` → `holders` → `ownership_records` | At 10+ members per group |
| Client-side sorting of graph nodes | No render issue, but confusing UX | Sort by ownership percentage server-side before returning graph data | Always — keep sorting in the API |
| Graph layout recomputed on every render | Graph jumps every time React re-renders the page | Store layout positions in component state or useMemo; only recompute on data change | On any re-render |

---

## Security Mistakes

Domain-specific security issues relevant to v1.1 features.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Group CRUD endpoints without any auth/rate-limiting | Malicious users can create thousands of junk groups, polluting the database | Rate-limit group write endpoints (5 creates/hour per IP). Since the site is public with no auth, require a simple admin secret header for write operations |
| Fuzzy search input not sanitized before SQL template | `pg_trgm` similarity with user input passed directly into `sql\`\`` can be exploited | Use Drizzle's parameterized query patterns; never interpolate user input into raw SQL strings |
| Graph API returns all holder details in JSON response | Leaks full holder canonical names, types, and IDs for all entities in the graph | Filter response to only fields needed for rendering: name, type, and edges. Do not include IDs unless needed for click navigation |

---

## UX Pitfalls

Common user experience mistakes specific to entity grouping and graph features.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Group creation UI with no confirmation of what will be merged | User accidentally merges 2 unrelated entities | Show a preview: "This will create a group containing X, Y, Z. Their combined ownership in BBCA is 12.3%." |
| Network graph shows all nodes at same size | Cannot distinguish major vs. minor holders | Scale node radius by total ownership (sqrt of percentage) or by number of connected stocks |
| Fuzzy search shows similarity score as decimal (0.87) | Meaningless to non-technical users | Show as "Strong match" / "Possible match" / "Weak match" with a visual indicator |
| Graph has no "reset to default view" button | User zooms in and cannot navigate back | Always show a "Reset View" button that re-centers the graph to its initial state |
| Entity group page shows raw holder IDs in the group member list | Confusing to non-technical users | Show canonical holder name with a link to the holder detail page |
| No visual distinction between entity group node and individual holder node in graph | Users do not know which nodes are groups vs. individuals | Use different shapes (circle = individual, diamond = group) or different border styles |

---

## "Looks Done But Isn't" Checklist

Things that appear complete in the v1.1 milestone but are missing critical pieces.

- [ ] **PDF Fix:** Extractor produces correct names for Prajogo Pangestu, Anthoni Salim — verify by checking `holders` table for truncated rows after re-import.
- [ ] **PDF Fix:** Backfill migration run against all historical periods — verify no orphaned holders with zero ownership records.
- [ ] **Entity Groups:** Join table has `UNIQUE (holder_id)` constraint — verify with a test that inserts the same holder into two groups and expects a constraint violation.
- [ ] **Entity Groups:** Ungroup operation fires cache invalidation — verify group aggregate page refreshes immediately after member removal.
- [ ] **Aggregate View:** Sum of individual member percentages equals group aggregate for each stock — verify with an automated assertion on test data.
- [ ] **Aggregate View:** A holder in group A does not appear counted in group B — verify with a cross-group consistency query.
- [ ] **Fuzzy Search:** "PT Astra International Tbk" and "PT Astra Otoparts Tbk" are NOT suggested as merge candidates — verify threshold is high enough.
- [ ] **Fuzzy Search:** `pg_trgm` extension enabled in production Neon DB — verify by running `SELECT * FROM pg_extension WHERE extname = 'pg_trgm'` after migration.
- [ ] **Network Graph:** Graph component loaded with `dynamic({ ssr: false })` — verify no SSR hydration errors in Vercel build logs.
- [ ] **Network Graph:** Hard node cap enforced at API level — verify that requesting a graph with 1000+ holders returns 400 or a filtered subset.
- [ ] **Historical Comparison:** Stock detail page and entity group aggregate page show consistent numbers — verify manually for at least one stock where a grouped holder holds shares.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Truncated holder names in existing DB | MEDIUM | 1. Write a deduplicate script that finds holders where `canonical_name` is a prefix of another, 2. Re-run extractor on all PDFs, 3. Remap `ownership_records.holder_id` to correct records, 4. Delete truncated orphan rows |
| Wrong merge (distinct entities grouped) | LOW | 1. Delete from `entity_group_members` for the incorrect holder, 2. Revalidate affected group pages, 3. Verify aggregate numbers correct after removal — join table design makes this O(1) |
| Browser freeze from full graph render | LOW (code fix) | 1. Add hard cap in graph API, 2. Default to filtered view (entity group + immediate connections only), 3. Deploy immediately — no data migration needed |
| Double-counting in aggregate (two groups share a holder) | MEDIUM | 1. Find holders in multiple groups with `SELECT holder_id, COUNT(*) FROM entity_group_members GROUP BY holder_id HAVING COUNT(*) > 1`, 2. Determine correct group assignment manually, 3. Delete incorrect membership rows, 4. Add unique constraint to prevent recurrence |
| pg_trgm missing in production | LOW | 1. `CREATE EXTENSION pg_trgm;` via Neon SQL editor, 2. Redeploy to clear Next.js server cache |
| Cache not invalidated after group change | LOW | 1. Add `revalidatePath()` call to mutation handlers, 2. Manually trigger revalidation via Next.js revalidate API for affected paths |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| PDF name truncation | Phase 1 (PDF Parsing Fix) | Re-import all historical PDFs, audit `holders` table for truncated names |
| Historical backfill after PDF fix | Phase 1 (PDF Parsing Fix) | Zero orphaned holder rows after backfill migration |
| Entity group join table (not foreign key) | Phase 2 (Entity Grouping Schema) | Schema review: no `group_id` column on `holders` table |
| Holder in two groups (conflict detection) | Phase 2 (Entity Grouping Schema) | Test: insert holder into two groups, expect constraint error |
| Ungroup cache invalidation | Phase 2 (Entity Grouping CRUD) | Test: add member, remove member, verify aggregate page updates |
| Aggregate double-counting | Phase 3 (Aggregate View) | Test: grouped holder's shares counted once, not twice |
| Group-aware historical comparison | Phase 3 (Aggregate View) | Stock detail page and group aggregate page show same numbers |
| Fuzzy threshold too low (false merges) | Phase 3 (Fuzzy Search) | Test: "PT Astra International" and "PT Astra Otoparts" not auto-suggested |
| pg_trgm not enabled in production | Phase 3 (Fuzzy Search) | Migration includes extension creation, verified on Neon |
| Graph browser freeze (no cap) | Phase 4 (Network Graph) | Load test: graph API for largest entity group stays under 200 nodes |
| Graph library SSR crash | Phase 4 (Network Graph) | Vercel build log shows no SSR hydration errors |
| Graph bundle bloat | Phase 4 (Network Graph) | Bundle analyzer shows graph library in lazy chunk, not main bundle |
| Multi-period edge explosion | Phase 4 (Network Graph) | Graph API requires `periodId` param, rejects requests without it |

---

## Sources

**v1.1 Pitfalls — source quality:**

- **react-force-graph performance limits** — GitHub Issue #223, confirmed by maintainer: degradation at ~7,000 total elements. HIGH confidence.
  Source: https://github.com/vasturiano/react-force-graph/issues/223

- **Sigma.js large graph** — GitHub Issue #239: rendered 5,000 nodes / 100,000 edges with WebGL. HIGH confidence.
  Source: https://github.com/jacomyal/sigma.js/issues/239

- **Cytoscape.js performance** — GitHub Discussion #3088: ~1,000 nodes begins to degrade. MEDIUM confidence.
  Source: https://github.com/cytoscape/cytoscape.js/discussions/3088

- **Fuzzy name matching false positives** — Flagright (AML screening), Splink documentation: threshold tuning required per domain. MEDIUM confidence.
  Source: https://www.flagright.com/post/jaro-winkler-vs-levenshtein-choosing-the-right-algorithm-for-aml-screening
  Source: https://moj-analytical-services.github.io/splink/topic_guides/comparisons/comparators.html

- **Entity deduplication double-counting in graphs** — OpenAIRE Graph deduplication documentation and Neo4j matching guide. MEDIUM confidence.
  Source: https://graph.openaire.eu/docs/graph-production-workflow/deduplication/
  Source: https://neo4j.com/news/matching-and-de-duplication-in-a-graph-database/

- **Next.js lazy loading for large libraries** — Vercel official documentation on bundle size optimization. HIGH confidence.
  Source: https://vercel.com/kb/guide/how-to-optimize-rsc-payload-size
  Source: https://nextjs.org/docs/app/guides/package-bundling

- **PDF name truncation, pdf-parse limitations** — Known behavior: pdf-parse extracts concatenated text without spatial context; column positions in IDX format require heuristic boundary detection. Analysis based on reading actual `pdf-extractor.ts` code and known IDX format patterns. HIGH confidence (code-based analysis).

- **PostgreSQL pg_trgm** — PostgreSQL official documentation and Neon compatibility docs. HIGH confidence.

---

## Appendix: Original v1 Pitfalls (Still Valid)

The following pitfalls from initial v1 research remain applicable during ongoing operations and monthly PDF imports.

### Pitfall V1-1: Brittle PDF Extraction Based on Layout

**What goes wrong:** PDF extraction breaks when IDX changes their PDF template, font, spacing, or table structure.
**Prevention:** Multiple extraction strategies (already implemented), data validation on every import, store raw PDFs, version extraction logic.
**Phase:** Ongoing — check after each monthly import.

### Pitfall V1-2: Missing Data Treated as Zero

**What goes wrong:** Shareholder drops below 1% threshold, disappears from PDF, system reports "0%" instead of "below threshold".
**Prevention:** Mark as `below_threshold`, track last known position, show "< 1%" when holder existed previously.
**Phase:** Phase 2 (Historical Comparison) — already partially addressed.

### Pitfall V1-3: Database Schema Cannot Handle Historical Splits

**What goes wrong:** Stock splits change share counts; historical comparison becomes meaningless.
**Prevention:** Store ownership as percentage AND shares; track corporate actions in separate table.
**Phase:** Ongoing — corporate action table not yet built.

### Pitfall V1-4: Performance Degradation with Historical Joins

**What goes wrong:** Queries slow down as historical data accumulates across periods.
**Prevention:** Index on `(emiten_id, period_id)`, materialized views for common queries, query result caching.
**Phase:** Monitor as data grows; add caching if queries exceed 2s.

### Pitfall V1-5: IDX Format Change Breaks Extraction Silently

**What goes wrong:** No monitoring detects when extraction produces wrong results after format change.
**Prevention:** Run data quality checks after each import (row counts, ownership sums), alert on anomalies.
**Phase:** Ongoing — add to monthly import checklist.

---

*Pitfalls research for: IDX Ownership Visualizer v1.1 — Entity Linking, Fuzzy Search, Network Graph*
*Researched: 2026-03-15*
*Updated from original v1 research dated: 2025-03-14*
