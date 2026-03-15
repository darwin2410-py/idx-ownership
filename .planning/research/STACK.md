# Technology Stack

**Project:** IDX Ownership Visualizer — v1.1 Lineage & Entity Linking
**Researched:** 2026-03-15
**Confidence:** HIGH (verified via npm registry, official docs, Neon docs)

---

## Context: What Exists vs What's New

The base stack is already validated and deployed:
Next.js 15 + React 19 + TypeScript, Neon PostgreSQL + Drizzle ORM (`^0.36.0`),
TanStack Table `^8.21.3`, Tailwind CSS.

This document covers **only the new additions** for milestone v1.1.

---

## Recommended Stack for v1.1 Features

### Fuzzy Search

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **pg_trgm** (PostgreSQL extension) | Built into Postgres 16 | Server-side trigram fuzzy search on `holders.canonical_name` | Zero extra dependency, GIN index gives ~60-80ms on large tables, lives in same Neon DB already in use — no separate search service |
| **Drizzle `sql` template tag** | (existing `drizzle-orm ^0.36.0`) | Execute raw `similarity()` queries from pg_trgm | Drizzle exposes `sql\`\`` for arbitrary SQL; no additional package needed |

**Why pg_trgm over Fuse.js for this app:**
- 5000+ holder names live in Postgres — loading them all to the client just to run Fuse.js wastes bandwidth and breaks on mobile.
- pg_trgm with a GIN index is indexed fuzzy search: query time stays constant as holder count grows.
- Neon supports pg_trgm natively. Enable with one SQL statement, no extra configuration.
- Fuse.js (7.1.0) is the right choice if data must be client-only (no DB). That is not the case here.

**Enable in Neon:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX holders_canonical_name_trgm_idx
  ON holders USING GIN (canonical_name gin_trgm_ops);
```

**Query pattern with Drizzle:**
```typescript
import { sql } from 'drizzle-orm';

const results = await db.execute(
  sql`SELECT id, canonical_name, original_name
      FROM holders
      WHERE similarity(canonical_name, ${query}) > 0.2
      ORDER BY similarity(canonical_name, ${query}) DESC
      LIMIT 20`
);
```
Default threshold is 0.3. Use 0.2 for partial names (IDX holder names are often truncated in PDFs — this matters).

---

### Network Graph Visualization

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@xyflow/react** | `^12.10.1` | Interactive holder ↔ emiten network graph | React-native (no DOM conflicts), peer dep `react >= 17` confirmed compatible with React 19, viewport culling for performance, pan/zoom built-in, MIT license |

**Why @xyflow/react over alternatives:**

- **vs D3-force:** D3 directly mutates the DOM, which conflicts with React's reconciler. Correct D3+React integration requires `useRef` + `useEffect` and careful synchronization — 200-300 lines of plumbing for what @xyflow/react provides out of the box. Not worth it for a CRUD app.
- **vs Cytoscape.js / react-cytoscapejs:** `react-cytoscapejs` (v2.0.0) wraps a Canvas/WebGL renderer. Excellent for 10,000+ node graphs. For the holder ↔ emiten use case (expected max: ~50-200 nodes per focused view), the overhead is unjustified. Also, the official Plotly React wrapper (`react-cytoscapejs`) shows limited React 19 testing evidence.
- **vs vis-network (v10.0.2):** No maintained React wrapper. The closest wrappers (`vis-react`, `react-vis-network-graph`) are 5-8 years old and unmaintained. Requires raw `useRef`/`useEffect` integration with an imperative API — same DOM-conflict problem as D3.

**@xyflow/react confirmed compatibility:**
- Peer deps: `react >= 17`, `react-dom >= 17` — confirmed via `npm info @xyflow/react peerDependencies`
- Internal deps: `zustand ^4.4.0`, `classcat ^5.0.3` — no conflicts with existing stack
- Next.js App Router: requires `'use client'` directive (expected — graph is interactive)

**Important:** Import CSS in the client component:
```typescript
import '@xyflow/react/dist/style.css';
```

---

### Entity Grouping UI (Manual Alias Tagging)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **cmdk** | `^1.1.1` | Command-palette-style search-and-select for linking holders to entities | Powers shadcn's `<Command>` component, battle-tested fuzzy search, keyboard-navigable, zero external deps |
| **shadcn/ui `<Command>` + `<Combobox>`** | (copy-paste, no npm version) | Multi-select holder search UI for building entity groups | Already the UI pattern in the project; combobox variant supports creatable items ("create new entity") and multi-select tagging |

**Entity grouping is a UI pattern, not a library.** The implementation is:
1. A `entities` table in Postgres: `{ id, display_name, created_at }`
2. A `holder_entity_links` join table: `{ holder_id, entity_id }` (many-to-many)
3. A shadcn `<Command>` combobox that searches existing entities (pg_trgm again) and creates new ones inline
4. Aggregate queries: `GROUP BY entity_id` across `holder_entity_links` → `ownership_records`

No additional npm package is needed beyond what shadcn copy-pastes (which uses cmdk internally).

---

### Aggregate Ownership Calculation

No new library needed. This is a SQL query:

```sql
SELECT
  e.display_name AS entity_name,
  o.emiten_id,
  SUM(o.shares_owned) AS total_shares,
  SUM(o.ownership_percentage) AS total_pct
FROM ownership_records o
JOIN holder_entity_links hel ON hel.holder_id = o.holder_id
JOIN entities e ON e.id = hel.entity_id
WHERE o.period_id = $1
GROUP BY e.id, e.display_name, o.emiten_id
ORDER BY total_pct DESC;
```

Drizzle can express this with its query builder or `sql` template. No additional library.

---

## Installation

```bash
# Fuzzy search — no npm package, only SQL
# Run in Neon SQL Editor or migration:
# CREATE EXTENSION IF NOT EXISTS pg_trgm;

# Network graph
npm install @xyflow/react

# Entity grouping UI — cmdk is a transitive dep if shadcn Command is already present
# If not yet added:
npm install cmdk
# Or use shadcn CLI:
npx shadcn@latest add command combobox
```

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **fuse.js** | `^7.1.0` | Client-side fuzzy search | Only if doing instant-filter on data already loaded in the browser (e.g., filtering a 200-row table already rendered). Do NOT use as the primary holder search — that belongs in pg_trgm. |
| **d3-force** | `^3.0.0` | Force simulation for @xyflow/react custom layouts | Only if the default @xyflow/react auto-layout is insufficient and you need physics-based node positioning. Use as a layout algorithm, not for rendering. |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| pg_trgm (server-side) | fuse.js (client-side) | When all data is already client-side and no DB is available. Not this app. |
| @xyflow/react | cytoscape.js | When node count exceeds 1000+ per view and WebGL rendering is required. Not this use case. |
| @xyflow/react | D3-force (direct) | When you need a fully custom renderer and have a dedicated frontend engineer for React/D3 synchronization. Not justified here. |
| pg_trgm | Meilisearch / Algolia | When full-text search across millions of documents is needed with typo correction, faceting, etc. Massive overkill for 5000 holder names. |
| cmdk + shadcn | react-select | react-select (5.x) is fine but adds ~35KB. cmdk is already present via shadcn and handles the same pattern with better keyboard UX. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Meilisearch / Elasticsearch** | Requires a separate server process, separate deployment, separate maintenance. Completely overkill for 5000 holders. | pg_trgm — same DB, zero additional infrastructure |
| **vis-network** | React wrappers are unmaintained (last updated 5-8 years ago). Direct integration requires imperative DOM manipulation that fights React. | @xyflow/react |
| **cytoscape.js** for this scale | 150KB+ bundle, Canvas rendering doesn't integrate with React's update model, overkill for < 200 node graphs. | @xyflow/react (SVG-based, React-native) |
| **Full D3 (d3 v7)** | 500KB+ bundle, entire library rarely needed. DOM mutation model conflicts with React. | Use only `d3-force` (5KB) if custom layout is needed for @xyflow/react |
| **Fuse.js as primary search** | Requires loading all 5000+ holder names to the client on every page load. Breaks on slow mobile connections. Does not scale. | pg_trgm server-side query |
| **A dedicated "entity resolution" library** | Libraries like `dedupe.js` or `zingg` are ML-based record linkage systems for millions of records. Manual alias tagging with a combobox is the right UX for this domain. | cmdk combobox + join table |

---

## Stack Patterns by Variant

**If holder name quality is poor (many truncated names from PDF):**
- Lower pg_trgm threshold to 0.15 instead of 0.2
- Also add `ILIKE '%' || $query || '%'` as a fallback in the same query (union results)
- Because trigrams need at least 3 characters; very short partial names fall below the trigram threshold

**If the network graph becomes slow (100+ nodes):**
- Add `d3-force ^3.0.0` as a layout plugin for @xyflow/react
- Run force simulation once on data load, then freeze positions (no continuous simulation)
- Because physics simulation on every frame is expensive; precomputing positions is free

**If entity grouping needs audit trail:**
- Add `created_by` and `created_at` columns to `holder_entity_links`
- No extra library — just schema columns
- Because public site without auth still benefits from knowing when links were created

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@xyflow/react ^12.10.1` | `react >= 17`, `react-dom >= 17` | Confirmed via `npm info`. React 19 compatible. |
| `@xyflow/react ^12.10.1` | `zustand ^4.4.0` | Zustand is a transitive dep — will be auto-installed, no conflict with app code unless app also pins zustand at a different major |
| `cmdk ^1.1.1` | React 18+, React 19 compatible | Used internally by shadcn, actively maintained by Paco Coursey |
| `pg_trgm` | Neon Postgres (all tiers) | pg_trgm is a bundled Postgres extension, supported on all Neon tiers per Neon docs |
| `drizzle-orm ^0.36.0` | `sql` template tag for raw pg_trgm queries | No version bump needed — `sql` tag ships with drizzle-orm |

---

## Sources

- `npm info @xyflow/react peerDependencies` — `{ react: '>=17', 'react-dom': '>=17' }` — HIGH confidence
- `npm info @xyflow/react version` → `12.10.1` — HIGH confidence
- `npm info fuse.js version` → `7.1.0` — HIGH confidence
- `npm info cmdk version` → `1.1.1` — HIGH confidence
- `npm info cytoscape version` → `3.33.1` — HIGH confidence
- `npm info vis-network version` → `10.0.2` — HIGH confidence
- [Neon pg_trgm docs](https://neon.com/docs/extensions/pg_trgm) — pg_trgm supported natively, enable with `CREATE EXTENSION` — HIGH confidence
- [PostgreSQL pg_trgm docs](https://www.postgresql.org/docs/current/pgtrgm.html) — GIN index, similarity threshold 0.3 default — HIGH confidence
- [React Flow 12 release](https://xyflow.com/blog/react-flow-12-release) — renamed to @xyflow/react, React 19 compatible — MEDIUM confidence (no explicit React 19 callout but peer dep range confirms)
- [npmtrends: fuse.js vs flexsearch](https://npmtrends.com/fast-fuzzy-vs-flexsearch-vs-fuse.js-vs-fuzzy-vs-lunr-vs-search-index) — fuse.js ~3.5M weekly downloads, flexsearch ~388K — MEDIUM confidence (WebSearch)
- [vis-network npm](https://www.npmjs.com/package/vis-network) — latest 10.0.2, React wrappers last updated 5-8 years ago — MEDIUM confidence

---

*Stack research for: IDX Ownership Visualizer v1.1 — Fuzzy Search, Entity Grouping, Network Graph*
*Researched: 2026-03-15*
