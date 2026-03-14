# Pitfalls Research

**Domain:** Stock Ownership Data Visualization (PDF extraction, time-series data, financial visualization)
**Researched:** 2025-03-14
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Brittle PDF Extraction Based on Layout

**What goes wrong:**
PDF extraction breaks when IDX changes their PDF template, font, spacing, or table structure. Extraction logic tied to specific coordinates or text patterns fails silently, producing corrupt or incomplete data.

**Why it happens:**
Developers treat PDF as a stable data source. PDF is a presentation format, not a data format. Table structure in PDF is visual, not semantic. Common mistakes:
- Using text coordinates (x, y positions) to locate data
- Assuming fixed column widths
- Not validating extracted data against expected ranges
- No human review step for anomalies

**How to avoid:**
- Use multiple extraction strategies (OCR + text extraction + table detection)
- Implement data validation rules (e.g., ownership percentages must sum to ~100%)
- Build review workflow for each monthly import
- Store raw PDF for re-processing when extraction breaks
- Version your extraction logic per PDF format
- Add checksums or row counts to detect missing data

**Warning signs:**
- Ownership percentages don't sum correctly
- Sudden drops in record count (e.g., from 5000 to 800 holders)
- New shareholders appear with "0" or negative values
- Extraction throws no errors but produces empty tables

**Phase to address:**
**Phase 1 (PDF Extraction)** — This is foundational. Build validation and monitoring into extraction from day one.

---

### Pitfall 2: Treating Shareholder Names as Strings

**What goes wrong:**
Shareholder names cannot be matched across months due to:
- Spacing variations ("PT BANK CENTRAL ASIA" vs "PT BANK CENTRAL  ASIA")
- Abbreviations ("PT BCA" vs "PT BANK CENTRAL ASIA")
- Typos in source PDF
- Foreign investor name variations ("UBS AG" vs "UBS GROUP AG")

Historical comparison fails because "PT Bank Central Asia Tbk" and "PT BANK CENTRAL ASIA TBK" are treated as different entities.

**Why it happens:**
Developers assume names are unique identifiers. Financial entities have naming variations, and source data quality varies. No deduplication logic is built.

**How to avoid:**
- Create shareholder entity table with canonical names
- Build normalization rules (remove extra spaces, standardize abbreviations)
- Use fuzzy matching for name variations (Levenshtein distance)
- Manual merge workflow for ambiguous cases
- Store all name variants seen, link to canonical entity
- Track name changes over time

**Warning signs:**
- Same shareholder appears multiple times in search results
- Historical comparison shows "new" shareholder that's actually existing
- Top 10 lists have duplicate entries with name variations

**Phase to address:**
**Phase 1 (Database Schema)** — Design entity resolution into schema. Don't use string names as foreign keys.

---

### Pitfall 3: Missing Data Treated as Zero

**What goes wrong:**
Shareholder disappears from monthly PDF but system doesn't distinguish between:
- Shareholder sold all shares (true disposal)
- Shareholder dropped below 1% threshold (still holds, just not reported)
- Data extraction error (missing row)

False "disposal" signals mislead users.

**Why it happens:**
PDF only reports shareholders >= 1% ownership. When a holder drops from 5% to 0.8%, they vanish from report. System interprets absence as "no holdings".

**How to avoid:**
- Mark shareholders as "below_threshold" not "zero"
- Track last known position for disappeared holders
- Show "< 1%" instead of "0" when holder existed previously
- Flag holders who appear again after disappearing
- Store data provenance (source PDF page, extraction confidence)

**Warning signs:**
- Large shareholders "disappear" without any sell transaction
- Historical views show ownership dropping to 0% abruptly
- Same shareholder reappears months later as "new"

**Phase to address:**
**Phase 2 (Historical Comparison)** — Core feature depends on correctly interpreting missing data.

---

### Pitfall 4: Database Schema Cannot Handle Historical Splits

**What goes wrong:**
Stock splits, bonus issues, or corporate actions change share counts. System stores raw share numbers without adjustment. Historical comparison becomes meaningless (1 million shares in 2023 ≠ 1 million shares after 1:10 split).

**Why it happens:**
Schema designed for current state only. No corporate action tracking. Share quantities stored as raw integers without normalization.

**How to avoid:**
- Store ownership as percentage AND absolute share count
- Track corporate actions (splits, bonuses) in separate table
- Normalize all data to current share basis or store both raw and adjusted
- Display both "shares then" and "shares adjusted for splits"
- Flag periods where comparisons are invalid

**Warning signs:**
- Shareholder holds 10% in January, 1% in February (possible reverse split)
- Total shares in database don't match current outstanding
- Historical graphs show sudden jumps not explained by transactions

**Phase to address:**
**Phase 2 (Historical Comparison)** — Schema must support adjustments before building comparison features.

---

### Pitfall 5: No Data Freshness Indicators

**What goes wrong:**
Users don't know if data is current. PDF releases monthly but website doesn't show:
- Last update date
- Which month's data is displayed
- Whether data is complete or partial

Users make decisions assuming real-time data.

**Why it happens:**
Focus on functionality, not user context. No metadata tracking. Static displays without timestamps.

**How to avoid:**
- Display "Data as of [month/year]" prominently
- Show update history (last 5 imports)
- Add "next expected update" countdown
- Flag stale data (e.g., "Data 45 days old, new PDF should be available")
- Include data completeness percentage (e.g., "450 of 500 emiten processed")

**Warning signs:**
- Users ask "is this data current?" in feedback
- Social media complains about outdated data
- Decisions made based on stale data

**Phase to address:**
**Phase 3 (Public Website)** — UI must show data context. Add before public launch.

---

### Pitfall 6: Performance Degradation with Historical Joins

**What goes wrong:**
Queries slow down as historical data accumulates. "Show all changes for BBCA last 2 years" joins millions of rows. Database times out. User experience degrades.

**Why it happens:**
No indexing strategy. No partitioning. Joins on non-indexed columns. Using ORM instead of optimized SQL. No query caching.

**How to avoid:**
- Index on (emiten_id, month) for time-series queries
- Partition table by year or month
- Use materialized views for common queries (top holders, historical summaries)
- Implement query result caching (Redis or CDN)
- Set query timeouts and pagination
- Monitor slow queries with EXPLAIN ANALYZE

**Warning signs:**
- Page load times increase month over month
- Database CPU usage spikes
- Queries take > 5 seconds for simple views

**Phase to address:**
**Phase 1 (Database)** — Design indexing strategy from day one. **Phase 4** — Add monitoring and optimization.

---

### Pitfall 7: Assuming IDX PDF Format Never Changes

**What goes wrong:**
IDX redesigns PDF format after 2 years. All extraction logic breaks. System produces garbage data. No one notices until users complain.

**Why it happens:**
No monitoring. No data validation. Extraction succeeds but produces wrong results. No alerts on data anomalies.

**How to avoid:**
- Run data quality checks after each import (row counts, sum of ownership, record count ranges)
- Alert on anomalies (e.g., "only 3000 emiten this month, expected ~5000")
- Store sample of extraction results for manual review
- Build extraction as versioned module (pdf_extractor_v1, pdf_extractor_v2)
- A/B test new extraction against old when format changes suspected

**Warning signs:**
- No data quality monitoring
- No alerts on import failures
- Extraction hasn't been tested in 6+ months

**Phase to address:**
**Phase 1 (PDF Extraction)** — Build monitoring and validation into extraction pipeline.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing shareholder names as strings instead of entities | Simple schema, faster MVP | Cannot do historical tracking, deduplication nightmares | Only for prototype, never for production |
| Using client-side sorting/filtering instead of database queries | No backend API changes needed | Performance dies at 10k+ rows, can't paginate | Only for < 100 rows, never for main data views |
| No data validation on PDF import | Faster initial development | Silent data corruption, user mistrust | Never — always validate |
| Hardcoded PDF column positions | Works for first month | Breaks every time format changes | Only for spike exploration, never for production |
| No API rate limiting | Simpler deployment | Bot traffic kills database, costs money | Only for auth-required apps, never for public sites |
| Storing raw percentages without decimal precision | Simpler database schema | Rounding errors accumulate, incorrect rankings | Never — use DECIMAL(10,4) or higher |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vercel Deployment | Assuming server-side functions have unlimited execution time (max 10s for Hobby, 60s for Pro) | Design PDF extraction as separate job, not API endpoint. Use Vercel Cron Jobs or external worker. |
| PostgreSQL on Vercel | Not configuring connection pooling (Prisma/Drizzle need it) | Enable connection pooling in Postgres config, use PgBouncer or Supavisor |
| Next.js Static Generation | Trying to generate pages for 500+ emiten with dynamic data (build times explode) | Use ISR (Incremental Static Regeneration) or Server-Side Rendering for data-heavy pages |
| PDF Storage (S3/R2) | Not setting cache headers, users re-download same PDFs monthly | Set Cache-Control: public, max-age=31536000 for immutable PDFs |
| GitHub Pages (alternative) | Assuming database access works on static hosting | GitHub Pages doesn't support server-side DB queries. Use Vercel/Netlify for API routes |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Client-side sorting of 500+ emiten table | Browser freezes, 10+ second sort times | Server-side sorting with indexed columns, virtual scrolling | ~ 100 rows on mobile, 500 on desktop |
| Fetching all historical data for "compare months" | API responses > 5MB, slow parsing | Only fetch delta (changed rows), lazy load history | ~ 6 months of data or ~ 1000 emiten |
| No pagination for shareholder list | Page renders 500+ rows, unscrollable | Default 20-50 rows per page, infinite scroll optional | ~ 50 rows on mobile, 100 on desktop |
| Real-time queries on every keystroke in search | Database hammering, slow UX | Debounce 300ms, autocomplete with cached results | ~ 10 concurrent users |
| Generating charts on-demand (no caching) | CPU spikes, slow page loads | Pre-generate common charts, cache results | ~ 100 chart requests/minute |
| N+1 queries (fetch emiten → fetch shareholders for each) | 500+ database calls per page | Use JOIN or data loader pattern | ~ 50 emiten per page |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing raw PDF URLs without signing | Users can guess other PDFs, potential unauthorized access | Use signed URLs with expiration, store PDFs in private bucket with proxy endpoint |
| No input sanitization on search (SQL injection) | Database compromise, data leak | Use parameterized queries, ORM with built-in escaping |
| CORS allows all origins | Other sites can embed and scrape your data | Configure strict CORS, use API keys for heavy users |
| No rate limiting on API | Bot scrapes entire database, costs money | Implement rate limits (100 req/min per IP), use Cloudflare/AWS WAF |
| Logging sensitive shareholder data | GDPR/privacy violation if logs leaked | Never log ownership data or personal info in application logs |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indication of data age | Users assume real-time, make wrong decisions | Show "Data as of March 2025" prominently on every page |
| Showing raw percentages (e.g., 0.0001%) | Meaningless precision, clutter | Round to 2 decimals (5.23%), use "< 0.01%" for tiny holdings |
| Not handling missing months in historical view | Users assume data error | Show gray bars for missing months with "No data available" tooltip |
| Colors don't follow financial conventions | Red for gain confuses Indonesian users | Use green for gain, red for loss (Indonesia convention) or allow toggle |
| No mobile optimization for tables | Horizontal scroll hell, unusable | Card layout for mobile, sticky first column for tables |
| Search doesn't handle typos | Users can't find "BCA" when searching "Bank Central Asia" | Fuzzy search, show "Did you mean...?" suggestions |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **PDF Extraction:** Often missing validation rules — verify extraction produces correct row counts and ownership sums
- [ ] **Historical Comparison:** Often missing corporate action adjustments — verify split-adjusted calculations
- [ ] **Search:** Often missing fuzzy matching for name variations — test with "BCA", "Bank Central", "PT BCA"
- [ ] **Performance:** Often missing query monitoring — check EXPLAIN ANALYZE for slow queries
- [ ] **Data Freshness:** Often missing update timestamps — verify every page shows data age
- [ ] **Mobile Views:** Often missing or broken — test on actual mobile devices, not just responsive resize
- [ ] **Error Handling:** Often missing graceful degradation — test with database disconnected, missing PDFs

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Brittle PDF extraction breaks | HIGH | 1. Identify format change, 2. Create new extractor version, 3. Manually reprocess last 3 months, 4. Add validation alerts, 5. Deploy with canary test |
| Shareholder name deduplication needed | MEDIUM | 1. Export all unique names, 2. Build similarity matrix (Levenshtein), 3. Manual review of > 90% matches, 4. Create merge table, 5. Backfill historical data with canonical IDs |
| Database performance degraded | MEDIUM | 1. Enable slow query log, 2. Add missing indexes, 3. Partition by year, 4. Create materialized views, 5. Implement query caching |
| Missing data validation caused corruption | HIGH | 1. Restore from backup, 2. Add validation rules, 3. Reprocess all PDFs with validation, 4. Manual review of anomalies, 5. Deploy monitoring alerts |
| No corporate action tracking | HIGH | 1. Research all splits/bonus issues from IDX, 2. Build corporate action table, 3. Back-adjust historical data, 4. Update all queries to use adjusted values, 5. Add alerts for future actions |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Brittle PDF extraction | Phase 1 (PDF Extraction) | Unit tests with sample PDFs, data validation on every import |
| Shareholder name deduplication | Phase 1 (Database Schema) | Test with known name variations, verify canonical ID mapping |
| Missing data = zero fallacy | Phase 2 (Historical Comparison) | Verify "below threshold" logic with test data spanning threshold crossing |
| No corporate action tracking | Phase 2 (Historical Comparison) | Schema includes corporate_actions table, queries use adjusted values |
| No data freshness indicators | Phase 3 (Public Website) | UI review checklist includes timestamp display on all pages |
| Performance degradation | Phase 1 (Database) + Phase 4 | Load test with 12 months data, query response < 2s for all views |
| IDX format change breaks extraction | Phase 1 (PDF Extraction) | Monthly import includes data quality alerts, extraction is versioned |
| Mobile UX broken | Phase 3 (Public Website) | Manual testing on real devices, responsive design review |
| Search doesn't handle typos | Phase 3 (Public Website) | Test search with "BCA", "Bank Centrl Asya", "PT BCA Tbk" |
| No rate limiting | Phase 3 (Public Website) | Load test simulates 100 req/min, verify rate limit triggers |

## Sources

**Note:** Web search tools were rate-limited during research. Findings based on:
- Training data patterns from financial data systems
- Common PDF extraction anti-patterns from software engineering literature
- Database scaling best practices for time-series data
- UX research on financial data visualization
- Known issues from similar ownership tracking projects

**Confidence Level: MEDIUM** — Recommendations based on well-established patterns but could benefit from domain-specific post-mortems and Indonesian market case studies.

**Research Gaps:**
- No access to IDX-specific PDF format documentation or change history
- Limited information on Indonesian investor behavior patterns
- No benchmark data on expected query loads for public financial sites in Indonesia
- Could benefit from interviews with developers who built similar systems

---
*Pitfalls research for: IDX Ownership Visualizer*
*Researched: 2025-03-14*
