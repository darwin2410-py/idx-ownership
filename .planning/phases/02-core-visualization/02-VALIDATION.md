# Phase 2: Core Visualization - Validation Strategy

**Created:** 2026-03-14
**Phase:** 2 (Core Visualization)
**Mode:** goal-backward verification

---

## Validation Gates

This phase will be verified through **goal-backward analysis**: checking that the built system delivers what Phase 2 promised, not just that tasks completed.

### Dimension 1: Stock Listing Page Works (EMIT-01)

**What must be TRUE:**
- [ ] User can view list of all IDX stocks with top holder information
- [ ] Table columns: Stock Code, Stock Name, Top Holder, Top Holder %, Updated Date
- [ ] Click stock code navigates to detail page
- [ ] Data loads from database using Server Components

**Verification Method:**
```bash
# Start dev server
npm run dev

# Visit listing page
curl http://localhost:3000/stocks

# Check for stock data in HTML
grep -o "TLKM\|BBCA\|BBRI" response.html
```

**Acceptance Criteria:**
- Page loads without errors
- At least 10 stocks displayed (or all available)
- Stock codes are clickable links
- Top holder information shown for each stock

---

### Dimension 2: Stock Detail Page Shows Ownership (EMIT-02)

**What must be TRUE:**
- [ ] Clicking stock code shows detail page with all holders
- [ ] Table columns: Rank, Holder Name, Shares Owned, % Ownership
- [ ] Top 5-10 holders visible (not highlighted, just ordered)
- [ ] Export to CSV button works

**Verification Method:**
```bash
# Visit detail page for specific stock
curl http://localhost:3000/stocks/TLKM

# Check CSV export
curl -O http://localhost:3000/stocks/TLKM/export
file TLKM_ownership_*.csv  # Should be text/CSV
```

**Acceptance Criteria:**
- Detail page loads for any valid stock code
- All holders for that stock displayed
- CSV file downloads with correct headers
- CSV encoded as UTF-8 (Indonesian characters)

---

### Dimension 3: Tables Are Sortable (CORE-01)

**What must be TRUE:**
- [ ] Click column header → sort ascending
- [ ] Click again → sort descending
- [ ] Visual indicator shows current sort direction
- [ ] Sort state persists across page navigation (URL param)

**Verification Method:**
```bash
# Manual test in browser
# 1. Visit /stocks
# 2. Click "Top Holder %" column
# 3. Verify URL has ?sort=topHolderPct&order=asc
# 4. Click again, verify ?order=desc
# 5. Navigate away and back - sort should persist
```

**Acceptance Criteria:**
- All sortable columns have click handlers
- Sort indicators (arrows) visible
- URL updates with sort parameters
- Sorting works on text, number, and percentage columns

---

### Dimension 4: Search and Filter Works (CORE-02)

**What must be TRUE:**
- [ ] Search by stock code works (partial matches, case-insensitive)
- [ ] Search by holder name works (separate filter)
- [ ] Search is debounced (300ms delay)
- [ ] URL state encoding for shareable links
- [ ] Clear search button resets filters

**Verification Method:**
```bash
# Test search endpoint
curl "http://localhost:3000/api/stocks?q=TLKM"

# Test URL encoding
# Visit /stocks?q=BCA&holder=CENTRAL
# Verify results match both filters
```

**Acceptance Criteria:**
- Typing "tlkm" finds "TLKM" (case-insensitive)
- Typing "bca" finds stocks with "BCA" in holder name
- URL updates to ?q=TLKM or ?holder=BCA
- Can share URL and see same filtered results
- Clear button removes all filters

---

### Dimension 5: Data Freshness Indicator Shown (CORE-03)

**What must be TRUE:**
- [ ] Badge showing "Data per: [Month Year]" visible on all pages
- [ ] Date in Indonesian format (e.g., "Maret 2026")
- [ ] Date sourced from latest period in database
- [ ] Badge appears in consistent location

**Verification Method:**
```bash
# Check for date badge in HTML
curl http://localhost:3000/stocks | grep -o "Data per:.*2026"

# Check detail page
curl http://localhost:3000/stocks/TLKM | grep -o "Data per:.*2026"
```

**Acceptance Criteria:**
- Badge visible on listing page
- Badge visible on detail page
- Date matches latest period in database
- Indonesian month names used

---

### Dimension 6: Mobile Usability Works

**What must be TRUE:**
- [ ] Tables usable on 320px width screens
- [ ] Horizontal scroll with sticky first column
- [ ] Touch-friendly tap targets (44px min)
- [ ] No horizontal scroll on page body

**Verification Method:**
```bash
# Use Chrome DevTools mobile emulation
# 1. Open DevTools
# 2. Enable device toolbar (iPhone SE, 375px)
# 3. Test table scrolling
# 4. Measure tap targets
```

**Acceptance Criteria:**
- First column sticks during horizontal scroll
- Page body doesn't scroll horizontally
- Buttons/links are at least 44px tall
- Table remains usable on small screens

---

## UAT Scenarios

### Scenario 1: Browse Stocks
**Given:** User visits stock listing page
**When:** Page loads
**Then:**
- See list of stocks with top holder info
- Stock codes are clickable
- Data freshness badge visible

### Scenario 2: Search for Stock
**Given:** User on stock listing page
**When:** User types "TLKM" in stock code search
**Then:**
- Results filter after 300ms delay
- Only matching stocks shown
- URL updates to ?q=TLKM

### Scenario 3: View Stock Details
**Given:** User clicks "TLKM" stock code
**When:** Detail page loads
**Then:**
- See all holders for TLKM
- Table shows Rank, Holder Name, Shares, %
- Can sort by any column
- Can export to CSV

### Scenario 4: Sort Table
**Given:** User on stock detail page
**When:** User clicks "% Ownership" column header
**Then:**
- Table sorts by percentage descending
- Sort indicator visible
- URL has sort parameter
- Can click again to reverse sort

### Scenario 5: Export CSV
**Given:** User on stock detail page
**When:** User clicks "Export CSV" button
**Then:**
- CSV file downloads
- Filename includes stock code and date
- UTF-8 encoded (Indonesian characters work)
- Headers match table columns

### Scenario 6: Mobile Usage
**Given:** User on mobile device (320px width)
**When:** Viewing stock detail table
**Then:**
- Table overflows horizontally
- First column (Holder Name) sticks
- Can scroll to see other columns
- Tap targets are large enough

---

## Validation Commands

| Command | Purpose | Expected Result |
|---------|---------|-----------------|
| `npm run dev` | Start dev server | Server starts on port 3000 |
| `curl http://localhost:3000/stocks` | Test listing page | HTML with stock data |
| `curl http://localhost:3000/stocks/TLKM` | Test detail page | HTML with holders |
| `curl http://localhost:3000/stocks/TLKM/export` | Test CSV export | CSV file downloads |
| `npm run build` | Test production build | Build succeeds |

---

## Exit Criteria

Phase 2 is **COMPLETE** when:

1. **Functional:** Stock listing and detail pages display data from database
2. **Searchable:** Search by stock code and holder name works
3. **Sortable:** All table columns sortable with visual indicators
4. **Exportable:** CSV export works for ownership data
5. **Freshness:** Data freshness indicator visible on all pages
6. **Mobile:** Tables usable on mobile devices with sticky columns

**Verification Command:**
```bash
# Full verification
npm run build && \
npm run dev & \
sleep 5 && \
curl http://localhost:3000/stocks | grep -q "TLKM" && \
curl http://localhost:3000/stocks/TLKM | grep -q "Holder Name" && \
curl http://localhost:3000/stocks/TLKM/export -o test.csv && \
file test.csv | grep -q "CSV"
```

Expected: All commands succeed, page contains data, CSV downloads

---

*Phase: 02-core-visualization*
*Validation strategy: 2026-03-14*
