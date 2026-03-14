# Phase 1: Data Foundation - Validation Strategy

**Created:** 2026-03-14
**Phase:** 1 (Data Foundation)
**Mode:** goal-backward verification

---

## Validation Gates

This phase will be verified through **goal-backward analysis**: checking that the built system delivers what Phase 1 promised, not just that tasks completed.

### Dimension 1: Data Extraction Works (Goal-Derived)

**What must be TRUE:**
- [ ] Sample PDF (`ownership_one_percent_202603.pdf`) can be parsed successfully
- [ ] Extracted data includes: stock code, holder name, shares owned, ownership percentage, rank
- [ ] Extraction handles multi-page PDFs without data loss
- [ ] Fallback strategies activate when primary extraction fails

**Verification Method:**
```bash
# Run extraction on sample PDF
npm run extract-pdf -- ./ownership_one_percent_202603.pdf

# Verify output contains expected data
npm run test-extraction
```

**Acceptance Criteria:**
- JSON output with all required fields
- Row count matches PDF table rows (±5% tolerance)
- No null/undefined values in required fields
- Fallback logged when used

---

### Dimension 2: Database Schema Supports Historical Data (Goal-Derived)

**What must be TRUE:**
- [ ] Schema includes: `periods`, `emiten`, `holders`, `ownership_records` tables
- [ ] Composite primary key on `ownership_records` (periodId + holderId + emitenId)
- [ ] Foreign key constraints enforce referential integrity
- [ ] Migration scripts create schema cleanly

**Verification Method:**
```bash
# Run migrations
drizzle-kit push

# Verify schema
psql $DATABASE_URL -c "\d ownership_records"
```

**Acceptance Criteria:**
- All 4 tables exist with correct columns
- Composite PK constraint exists
- FK constraints prevent orphaned records
- Migration runs without errors

---

### Dimension 3: Data Quality Validation Catches Issues (Goal-Derived)

**What must be TRUE:**
- [ ] Zod schemas validate at runtime (stock codes, percentages, shares)
- [ ] Validation warnings logged for < 100% ownership sum (expected)
- [ ] Missing/malformed data flagged without stopping import
- [ ] Quality metrics tracked (rows extracted, warnings, errors)

**Verification Method:**
```bash
# Run validation tests
npm test -- data-validator.test.ts

# Import data and check logs
npm run import-pdf -- ./ownership_one_percent_202603.pdf
grep "Validation" logs/import.log
```

**Acceptance Criteria:**
- Invalid stock codes rejected (e.g., "ABC1", "1234")
- Percentages outside 0-100 rejected
- < 100% sum logged as WARNING (not ERROR)
- Metrics include: totalRows, warnings, errors, extractionTime

---

### Dimension 4: Error Handling Prevents Data Corruption (Goal-Derived)

**What must be TRUE:**
- [ ] Transaction rollback on critical errors
- [ ] Idempotent operations (re-running same PDF safe)
- [ ] Severity levels: CRITICAL (stop), ERROR (rollback), WARNING (continue)
- [ ] Raw PDF backed up for audit

**Verification Method:**
```bash
# Test rollback behavior
npm test -- error-handling.test.ts

# Test idempotency
npm run import-pdf -- ./test.pdf
npm run import-pdf -- ./test.pdf  # Second run should skip/update
```

**Acceptance Criteria:**
- Critical errors trigger full rollback
- Duplicate imports handled gracefully
- Raw PDFs stored in `backups/` directory
- Logs show severity levels clearly

---

### Dimension 5: Development Workflow is Usable (Goal-Derived)

**What must be TRUE:**
- [ ] Local development environment documented
- [ ] Database migrations run locally
- [ ] Tests can run without external dependencies
- [ ] API endpoint triggers import (manual workflow)

**Verification Method:**
```bash
# Follow local setup docs
cat docs/LOCAL_SETUP.md

# Run tests
npm test

# Trigger import via API
curl -X POST http://localhost:3000/api/import -F "pdf=@test.pdf"
```

**Acceptance Criteria:**
- Setup steps work from fresh clone
- Tests pass without network requests
- API endpoint returns 200 on success
- Documentation covers all workflows

---

## UAT Scenarios

### Scenario 1: First-Time Import
**Given:** Fresh database, sample PDF
**When:** Admin uploads PDF via API endpoint
**Then:**
- Data extracted successfully
- All records stored in database
- Validation shows < 100% sum (warning, not error)
- Raw PDF backed up

### Scenario 2: Re-Import Same Period
**Given:** Period 2026-03 already imported
**When:** Admin uploads same PDF again
**Then:**
- Existing records updated (upsert)
- No duplicates created
- Import completes without errors

### Scenario 3: Malformed PDF
**Given:** PDF with corrupted table data
**When:** Admin attempts import
**Then:**
- Extraction fails gracefully
- Transaction rolled back
- Error logged with details
- No partial data in database

### Scenario 4: Missing Data in PDF
**Given:** PDF with some rows having null values
**When:** Admin uploads PDF
**Then:**
- Validation flags missing fields
- Rows with null values skipped
- Valid rows still imported
- Warning count in metrics

---

## Validation Commands

| Command | Purpose | Expected Result |
|---------|---------|-----------------|
| `npm test` | Run all tests | All tests pass |
| `npm run extract-pdf -- <path>` | Extract PDF data | JSON output to stdout |
| `npm run validate-data -- <json>` | Validate extracted data | Validation report |
| `drizzle-kit push` | Apply migrations | Schema created/updated |
| `npm run import-pdf -- <path>` | Full import workflow | Data in database |

---

## Exit Criteria

Phase 1 is **COMPLETE** when:

1. **Functional:** Sample PDF imports successfully with all data in database
2. **Reliable:** Fallback strategies work when extraction fails
3. **Validated:** Data quality checks catch and report issues
4. **Safe:** Error handling prevents corruption (rollback works)
5. **Usable:** Developer can run setup, tests, and import workflow locally

**Verification Command:**
```bash
# Full verification suite
npm test && \
drizzle-kit push && \
npm run import-pdf -- ./ownership_one_percent_202603.pdf && \
psql $DATABASE_URL -c "SELECT COUNT(*) FROM ownership_records WHERE period_id = '2026-03';"
```

Expected: All commands succeed, record count > 0

---

*Phase: 01-data-foundation*
*Validation strategy: 2026-03-14*
