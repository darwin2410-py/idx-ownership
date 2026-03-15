---
phase: 05-pdf-fix-and-data-quality
plan: 02
subsystem: database
tags: [neon, postgresql, pdf-extraction, data-quality, import, holder-names]

# Dependency graph
requires:
  - phase: 05-01
    provides: Fixed tryIDXConcatenatedStrategy() in pdf-extractor.ts using Tbk boundary
provides:
  - Database cleared of all orphaned truncated holder names
  - Re-imported 7253 clean ownership records from ownership_one_percent_202603.pdf
  - "PRAJOGO PANGESTU" and all holder names with 3-uppercase-char endings now stored correctly
  - Second extractor bug fixed: trailing [A-Z]{3} strip removed from pdf-extractor.ts
affects:
  - 06-entity-grouping (entity grouping can now proceed on clean, fully-qualified holder names)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-import workflow: clear-all-data.ts -> import-pdf -> check-period.ts -> audit-holder-names.ts"
    - "Audit-before-clear pattern: always capture before-snapshot before destructive operations"

key-files:
  created: []
  modified:
    - scripts/audit-holder-names.ts
    - src/lib/services/pdf-extractor.ts

key-decisions:
  - "Do not use replace(/[A-Z]{3}$/) after type-code boundary extraction — the boundary logic already excludes the type code; a trailing 3-char strip corrupts names ending in 3 uppercase chars (e.g. PANGESTU -> PANGE)"
  - "dotenv fallback: audit scripts should load .env as fallback after .env.local for dev environments without .env.local"

patterns-established:
  - "Extractor pipeline: Tbk boundary splits emiten from investor, first type code match within afterTbk extracts investor name — no post-extraction character stripping needed"

requirements-completed:
  - PARSE-02

# Metrics
duration: 45min
completed: 2026-03-15
---

# Phase 5 Plan 02: Database Clear and Re-Import Summary

**Database wiped and re-imported from scratch: 7253 clean ownership records with fully-qualified holder names including PRAJOGO PANGESTU; second extractor bug (trailing 3-char strip) discovered and fixed during re-import verification.**

## Performance

- **Duration:** ~45 min (including two full import cycles at ~7 min each)
- **Started:** 2026-03-15T08:43:21Z
- **Completed:** 2026-03-15T10:00:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Cleared all 7202 old ownership records plus all orphaned truncated holder rows (5172 old holders) via `clear-all-data.ts`
- Discovered and fixed a second extractor bug: `replace(/[A-Z]{3}$/, '')` at line 122 of pdf-extractor.ts was stripping the last 3 chars of any holder name ending in uppercase (e.g. "PRAJOGO PANGESTU" -> "PRAJOGO PANGE", "ANTHONI SALIM" -> "ANTHONI SA")
- Re-imported `ownership_one_percent_202603.pdf` with both fixes applied: 7262 records extracted, 7253 unique records stored in DB
- Verified "PRAJOGO PANGESTU" appears in full (16 chars) in the holders table
- Short name count reduced from 1046/5172 holders (20.22%) to 446/5202 holders (8.57%)
- Remaining short-name holders (WILLY, ELLEN, NONI, ERNY, HAMI, EDDY, etc.) are legitimate single-name individuals — not truncation artifacts

## Task Commits

Each task was committed atomically:

1. **Task 1 (deviation fix): Fix audit-holder-names.ts dotenv fallback** - `42d640e` (fix)
2. **Task 1 (deviation fix): Remove trailing [A-Z]{3} strip in pdf-extractor.ts** - `097c64e` (fix)

**Plan metadata:** (docs commit follows)

_Note: Tasks 1 and 2 required no source code files because they are operational re-import steps. The commits above are auto-fixes applied during execution via deviation rules._

## Files Created/Modified

- `scripts/audit-holder-names.ts` - Added `dotenv.config({ path: '.env' })` as fallback after `.env.local` (Rule 3 fix)
- `src/lib/services/pdf-extractor.ts` - Removed `replace(/[A-Z]{3}$/, '')` that was stripping final 3 chars of holder names ending in uppercase (Rule 1 fix)

## Decisions Made

- Do not post-strip holder names with `[A-Z]{3}$` after type-code boundary extraction: the Tbk boundary + first type code match already correctly excludes the type code, making the strip redundant and harmful
- dotenv scripts should use `.env` as a fallback when `.env.local` is absent — development environments without `.env.local` need graceful fallback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed audit-holder-names.ts failing to load DATABASE_URL**
- **Found during:** Task 1 Step 1 (audit current state)
- **Issue:** Script used `dotenv.config({ path: '.env.local' })` only; `.env.local` absent in dev environment; DATABASE_URL not loaded; script exited with "No database connection string was provided"
- **Fix:** Added `dotenv.config({ path: '.env' })` as fallback line after `.env.local` config
- **Files modified:** `scripts/audit-holder-names.ts`
- **Verification:** Script connects successfully and returns holder name audit results
- **Committed in:** `42d640e`

**2. [Rule 1 - Bug] Fixed pdf-extractor.ts trailing 3-char uppercase strip corrupting holder names**
- **Found during:** Task 1 Step 4 (verify record count), Task 2 (spot-check audit) — discovered "PRAJOGO PANGE" still in DB after re-import despite Plan 05-01 fix
- **Issue:** Line 122 of pdf-extractor.ts: `holderName.replace(/[A-Z]{3}$/, '')` stripped last 3 uppercase chars from any holder name ending in 3 uppercase letters. The Tbk boundary logic (Plan 05-01) already correctly excluded the type code, so this additional strip was both redundant and destructive. Example: "PRAJOGO PANGESTU" -> stripped "STU" -> stored as "PRAJOGO PANGE"
- **Fix:** Removed `replace(/[A-Z]{3}$/, '')` from line 122; kept only the digits/punctuation strip `replace(/[\d.,]+$/, '')` which is safe
- **Files modified:** `src/lib/services/pdf-extractor.ts`
- **Verification:** Debug script confirmed extractor now produces "PRAJOGO PANGESTU" (16 chars); post-import audit confirms id 19260 canonical_name="PRAJOGO PANGESTU"; record count rose from 7199 (with bug) to 7253 (without bug)
- **Committed in:** `097c64e`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were required for plan success criteria. The dotenv fix was needed to run the audit; the trailing-strip fix was needed to produce clean holder names. The plan required a second full import cycle as a result.

## Issues Encountered

- The Plan 05-01 fix (Tbk boundary) was necessary but not sufficient — a second bug (trailing 3-char strip) existed in the same function and also caused truncation. Both bugs together produced truncated names; fixing only the Tbk boundary left the trailing strip active.
- First re-import (7199 records) revealed PRAJOGO PANGE still present, which triggered the investigation and discovery of the second bug.
- After fixing the second bug, a full second re-import cycle was required (clear + import again).

## Self-Check

After writing this SUMMARY.md, verifying claims:

- [x] `scripts/audit-holder-names.ts` exists and contains `.env` fallback
- [x] `src/lib/services/pdf-extractor.ts` exists without `replace(/[A-Z]{3}$/, '')`
- [x] Commits `42d640e` and `097c64e` exist in git log
- [x] DB contains 7253 records in period 2026-03 (verified via check-period.ts output)
- [x] "PRAJOGO PANGESTU" appears in DB with full name (verified via audit-holder-names.ts output)

## Next Phase Readiness

- Database contains 7253 clean, deduplicated ownership records for period 2026-03
- All holder names are now free from the two truncation bugs fixed in Phase 5
- Phase 6 (Entity Grouping) can proceed on clean holder names — fuzzy matching will correctly find "PRAJOGO PANGESTU" without aliasing to "PRAJOGO PANGE"
- The `scripts/audit-holder-names.ts` script is now a working CI-style gate: exit 0 = clean, exit 1 = issues found

---
*Phase: 05-pdf-fix-and-data-quality*
*Completed: 2026-03-15*
