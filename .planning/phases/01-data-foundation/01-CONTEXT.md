# Phase 1: Data Foundation - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the data pipeline for extracting IDX ownership data (>1% holders) from monthly PDFs and storing it in PostgreSQL with proper schema for historical support. This is infrastructure — nothing users see directly.

**Critical understanding:** IDX PDFs only contain holders with >1% ownership. The sum will NOT equal 100% because smaller holders are excluded. Validation must account for this.

</domain>

<decisions>
## Implementation Decisions

### PDF Extraction Strategy
- **Library:** pdf-parse (simpler API, good for table extraction, Node.js compatible)
- **Validation timing:** Validate after extraction (separate step for cleaner separation)
- **Table structure:** Auto-detect structure from PDF (don't hardcode positions)
- **Fallback method:** Yes, multiple strategies (try next method if one fails)
- **Data source priority:** PDF is primary, IDX API is exploratory (https://www.idx.co.id/StaticData/ISO20022/3.IDXISO20022%20Guideline.pdf)

### Historical Storage
- **Storage method:** Append-only (never delete historical records)
- **Version tracking:** Yes, track which extraction version produced each record (for debugging)
- **Primary key:** Composite key with period (same holder-stock combination can exist across multiple periods)
- **Retention:** Keep all history (no time limit, add later if needed)

### Error Handling
- **Severity levels:** Critical = stop entire import, Warning = log but continue
- **Recovery method:** Rollback on error (all-or-nothing transaction)
- **Validation strictness:** Warnings only — ownership sum will NOT equal 100% because data only includes >1% holders
- **Alerts:** Log only (no active notifications)

### Update Workflow
- **Trigger method:** API endpoint for manual triggering (explore IDX API first, but PDF is primary)
- **Automation:** Manual only (no cron jobs for now)
- **Confirmation:** Direct import (no preview step, validation happens during extraction)
- **Idempotency:** Yes, idempotent (re-running same PDF is safe — skip or update existing)
- **Schedule:** Immediate when available (run as soon as new data is available each month)
- **Raw data backup:** Always backup raw PDFs and API responses (for audit and reprocessing)
- **Testing approach:** Direct to production (no separate test environment)

### Claude's Discretion
- Exact structure of auto-detection for PDF tables
- Specific fallback extraction strategies to implement
- Granularity of severity levels (what constitutes Critical vs Warning)
- Exact version tracking schema design
- API endpoint authentication and rate limiting (if needed)

</decisions>

<specifics>
## Specific Ideas

- **Sample PDF available:** `ownership_one_percent_202603.pdf` for testing extraction
- **IDX API to explore:** https://www.idx.co.id/StaticData/ISO20022/3.IDXISO20022%20Guideline.pdf — check if ownership data is available or if it's only ISO20022 payment messaging
- **Data limitation:** Only holders with >1% ownership are included in IDX reports — this is expected, not an error

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing codebase

### Established Patterns
- None — this is the foundational phase that establishes patterns for subsequent phases

### Integration Points
- **Database:** PostgreSQL (to be set up in this phase)
- **Next.js app:** Will connect to database in Phase 2 (no integration needed yet)
- **Vercel deployment:** Database connection will use Vercel Postgres

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-data-foundation*
*Context gathered: 2026-03-14*
