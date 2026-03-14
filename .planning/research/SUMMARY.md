# Project Research Summary

**Project:** IDX Ownership Visualizer
**Domain:** Financial Data Visualization - Stock Ownership/Institutional Holdings
**Researched:** 2025-03-14
**Confidence:** MEDIUM

## Executive Summary

The IDX Ownership Visualizer is a **data-intensive public web application** that extracts structured ownership data from unstructured IDX monthly PDFs and presents it through searchable, sortable visualizations. Expert practitioners build this as a **server-first Next.js application** with Server Components for performance, PostgreSQL for time-series data storage, and server-side PDF processing to ensure data quality and security.

The recommended approach prioritizes **data integrity and user trust**. Build a robust PDF extraction pipeline with comprehensive validation before any visualization features. Use Next.js 15 App Router with Server Components to minimize client-side JavaScript while maintaining interactivity through strategic Client Components. Store historical data in Vercel Postgres with proper indexing for time-series queries, and implement entity resolution for shareholder names to enable accurate historical comparisons.

**Key risks** center on PDF extraction brittleness (IDX format changes will break parsing), shareholder name deduplication (variations prevent accurate historical tracking), and performance degradation as historical data accumulates. Mitigate these through versioned extraction modules with data quality monitoring, canonical shareholder entity tables with fuzzy matching, and database indexing strategy designed from day one for time-series queries.

## Key Findings

### Recommended Stack

**Modern serverless-first stack optimized for Vercel deployment and data-heavy workloads.** Next.js 15 provides Server Components for fast initial loads and SEO, while React 19 enables progressive enhancement with client-side interactivity. TypeScript catches data transformation bugs critical for PDF parsing logic. Vercel Postgres offers auto-scaling PostgreSQL with native integration, while Drizzle ORM provides type-safe queries with smaller bundle size than Prisma—essential for serverless edge functions.

**Core technologies:**
- **Next.js 15 + React 19** — Framework with App Router for Server Components, native Vercel deployment, excellent SEO for public site
- **TypeScript 5.x** — Type safety for complex PDF parsing logic and data transformations
- **Vercel Postgres + Drizzle ORM** — Serverless PostgreSQL with auto-scaling, type-safe queries optimized for edge functions
- **Recharts + TanStack Table 8.x** — SSR-compatible charting and headless table architecture for full styling control
- **pdf-parse + Zod** — Server-side PDF text extraction with schema validation before database insertion
- **shadcn/ui + Tailwind CSS** — Copy-paste components with zero runtime, excellent Vercel integration
- **@tanstack/react-query** — Cache API responses, automatic refetching, optimistic UI if needed later

### Expected Features

**Table stakes are non-negotiable**—users expect sortable tables, search/filter, historical data access, and export to CSV. Missing these makes the product feel incomplete. Data freshness indicators are critical because users must know the monthly update cadence.

**Must have (table stakes):**
- **Sortable tables with search/filter** — users expect click-to-sort columns and instant search
- **Historical data access** — financial data without history is useless for trend analysis
- **Export to CSV/Excel** — power users need offline analysis in their own tools
- **Data freshness indicator** — "Last updated: [date]" prevents wrong assumptions about recency
- **Per-Emiten View** — primary use case: "Who owns stock X?" with top holders list
- **Responsive mobile design** — Indonesian users heavily mobile; unusable mobile = failed product

**Should have (competitive):**
- **Accumulation/Disposal Detection** — automatically flag significant ownership changes (>5%), major time-saver
- **Historical Trend Charts** — visual timeline of ownership changes for specific holder/stock
- **Per-Holder View** — secondary use case: "What does holder Y own?" reverse lookup
- **Top Movers Dashboard** — "Biggest accumulators/disposals this month" drives repeat visits
- **Indonesian Language Support** — Bahasa Indonesia UI increases local adoption

**Defer (v2+):**
- **Real-time updates** — impossible with monthly PDF data, sets false expectations
- **Portfolio tracking** — adds authentication complexity, scope creep from core lookup value
- **Trading signals** — legal liability, ownership data ≠ trading signal
- **Social features** — moderation burden, doesn't align with "quick lookup" value

### Architecture Approach

**Layered architecture with clear separation between data processing, API, and presentation.** PDF Extraction Service parses and validates data before transactional database writes. Historical Analysis Service computes period-over-period changes. Repository pattern abstracts data access for testability. API Route Handlers provide HTTP interface with validation. Server Components fetch data on server for fast initial loads, Client Components handle interactivity (charts, tables, search). React Query caches server state, Zustand manages client-side filters.

**Major components:**
1. **PDF Extraction Service** — parse IDX PDFs, extract ownership data, validate structure with Zod schemas
2. **Historical Analysis Service** — calculate changes between periods, detect accumulation/disposal patterns
3. **Repository Layer** — abstract database operations (Stocks, Holders, Ownership repositories)
4. **API Route Handlers** — standardized Next.js routes with validation, error handling, response formatting
5. **Server Components** — data fetching with Drizzle queries, static layout, SSR for SEO
6. **Client Components** — interactive charts (Recharts), tables (TanStack Table), search/filter UI

### Critical Pitfalls

**Brittle PDF extraction is the single biggest risk**—when IDX changes PDF format, extraction logic tied to coordinates or fixed patterns fails silently, producing corrupt data. Avoid through multiple extraction strategies, data validation rules, review workflow for each import, store raw PDFs for re-processing, and version extraction logic per PDF format.

**Shareholder name dedupellation is make-or-break for historical tracking**—treating names as strings prevents accurate comparison when "PT BANK CENTRAL ASIA" becomes "PT BCA" or spacing varies. Create canonical shareholder entity table, normalization rules, fuzzy matching (Levenshtein distance), manual merge workflow, and track all name variants.

**Missing data must not equal zero**—shareholders dropping below 1% threshold vanish from PDF but still hold shares. Mark as "below_threshold" not "zero", track last known position, show "< 1%" for disappeared holders, and flag reappearance to avoid false disposal signals.

**Performance degradation is inevitable without proactive design**—historical joins on millions of rows will timeout without indexing strategy. Index on (emiten_id, month), partition by year, use materialized views for common queries, implement Redis caching, and monitor slow queries from day one.

**No data freshness indicators mislead users**—without "Data as of [month/year]" prominently displayed, users assume real-time data. Show update history, next expected update countdown, flag stale data, and include completeness percentage.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Data Foundation
**Rationale:** PDF extraction and data storage are foundational—nothing works without data. This phase addresses the most critical risk (brittle PDF extraction) first, when codebase is smallest and fixes are cheapest.

**Delivers:** Working PDF extraction pipeline, validated database schema, initial data import capability
**Addresses:** PDF Extraction Pipeline (P1), Data Freshness Indicator (P1)
**Avoids:** Brittle PDF extraction (Critical Pitfall #1), Shareholder name deduplication issues (Critical Pitfall #2)

### Phase 2: Core Visualizations
**Rationale:** Once data exists, build primary use case (Per-Emiten View) to validate product value. Server-first approach ensures performance even with large datasets.

**Delivers:** Stock list page, stock detail page with ownership table (single period), search/filter/sort capabilities
**Uses:** Next.js Server Components, TanStack Table, Recharts, Drizzle ORM
**Implements:** Server-first data fetching pattern, Repository pattern, API route handlers

### Phase 3: Historical Analysis
**Rationale:** Secondary use case (Per-Holder View) and historical comparison require multiple periods of data and corporate action tracking. Build after core validates user interest.

**Delivers:** Historical comparison APIs, holder portfolio pages, accumulation/disposal detection, trend charts
**Uses:** Historical Analysis Service, React Query caching, materialized views for performance
**Avoids:** Missing data = zero fallacy (Critical Pitfall #3), corporate action tracking issues (Critical Pitfall #4)

### Phase 4: Polish & Scale
**Rationale:** Add differentiators and optimize after core validates. Performance optimization requires real data patterns.

**Delivers:** Top Movers dashboard, Indonesian language support, mobile optimization, query optimization, caching layer
**Uses:** Redis caching, database partitioning, CDN for static assets

### Phase Ordering Rationale

- **Data before UI**—PDF extraction complexity is highest risk; validate early before investing in visualization
- **Per-Emiten before Per-Holder**—primary use case first, reverse lookup is secondary pattern
- **Single-period before historical**—corporate action tracking and period comparison add significant complexity
- **Core features before differentiators**—validate table stakes work before investing in Top Movers, detection algorithms
- **Performance optimization last**—cannot optimize without real data patterns and query loads

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 1 (PDF Extraction):** IDX PDF format unknown, likely needs `/gsd:research-phase` for extraction strategy validation. PDF structure may vary across emiten types.
- **Phase 3 (Historical Analysis):** Corporate action data sources unclear, may need research on IDX split/bonus issue history for back-adjustment logic.

**Phases with standard patterns (skip research-phase):**

- **Phase 2 (Core Visualizations):** Server Components, TanStack Table, Recharts all well-documented with established patterns
- **Phase 4 (Polish & Scale):** Redis caching, database partitioning, CDN optimization are standard scaling practices

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | WebSearch unavailable during research—recommendations based on training data. Verify Next.js 15 App Router patterns, pdf-parse table extraction capabilities, and Vercel Postgres free tier limits before implementation. |
| Features | MEDIUM | Table stakes based on financial platform standards (Bloomberg, FactSet). Differentiators based on general domain knowledge—validate with Indonesian traders. Indonesia-specific competitive landscape unknown due to search limitations. |
| Architecture | MEDIUM | Patterns are well-established for data-intensive Next.js apps. Server-first approach validated by Next.js docs. Repository pattern and service layer standard for this complexity. |
| Pitfalls | MEDIUM | Based on common PDF extraction anti-patterns and time-series database scaling issues. Specific to domain but not to Indonesian market—IDX PDF format changes are unknown risk. |

**Overall confidence:** MEDIUM — Research provides solid foundation for roadmap creation but validation required during implementation, especially for PDF extraction (critical path) and Indonesian market feature preferences.

### Gaps to Address

- **IDX PDF format:** No access to current IDX PDFs for validation. During Phase 1 planning, test pdf-parse on sample PDFs to confirm table extraction works. May need fallback to pdf2json or PDF.js if tables are complex.
- **Corporate action data:** No research on IDX historical split/bonus issue data sources. During Phase 3 planning, investigate IDX corporate action announcements or consider manual data entry for major events.
- **Indonesian user preferences:** Limited knowledge of local trading tools and feature expectations. During MVP validation, survey 5-10 Indonesian traders on feature priorities and UX preferences.
- **Vercel Postgres limits:** Free tier may not support expected data volume (~500 emiten × 12 months × 50 holders = 300K records). Verify limits during Phase 1 setup.
- **Performance benchmarks:** No real data on expected query loads. Add monitoring from day one and optimize based on actual usage patterns in Phase 4.

## Sources

### STACK.md
- Next.js App Router Documentation (verify App Router patterns, Server Components)
- Vercel Postgres Documentation (verify free tier limits, connection patterns)
- TanStack Table Documentation (verify v8 API, pagination examples)
- Recharts Documentation (verify SSR compatibility, latest API)
- Drizzle ORM Documentation (verify serverless best practices)
- pdf-parse npm package (verify API, table extraction capabilities)
- shadcn/ui Documentation (verify installation steps, component list)

### FEATURES.md
- Platform analysis: Bloomberg Terminal, FactSet, WhaleWisdom, SEC EDGAR
- Financial data visualization best practices
- Mobile-first financial applications (Robinhood, Stockbit patterns)
- Public data website standards (data.gov, government transparency portals)

### ARCHITECTURE.md
- Next.js App Router Documentation: https://nextjs.org/docs/app
- Prisma Best Practices: https://www.prisma.io/docs/guides/performance-and-optimization
- React Query Documentation: https://tanstack.com/query/latest
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres

### PITFALLS.md
- Training data patterns from financial data systems
- Common PDF extraction anti-patterns from software engineering literature
- Database scaling best practices for time-series data
- UX research on financial data visualization
- Known issues from similar ownership tracking projects

### Limitations
- **Web search unavailable** during research due to rate limits (2026-03-14 reset)
- **No direct access to IDX PDFs** for extraction validation
- **No Indonesian market competitor analysis**—local tools (Stockbit, IDN Financials) not reviewed
- **Training data cutoff June 2024**—some stack recommendations may be outdated

---
*Research completed: 2025-03-14*
*Ready for roadmap: yes*
