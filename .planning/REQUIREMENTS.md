# Requirements - IDX Ownership Visualizer

**Project:** IDX Ownership Visualizer
**Version:** 1.0 (MVP) + 1.1 (Lineage & Entity Linking)
**Last Updated:** 2026-03-15

---

## v1 Requirements (MVP - Launch)

### DATA Pipeline

#### [DATA-01] PDF Extraction Pipeline
Extract ownership data from IDX monthly PDF files into structured database format.
- **Acceptance Criteria:**
  - Successfully parse sample IDX PDF (ownership_one_percent_202603.pdf)
  - Extract stock code, holder name, ownership percentage, and share count
  - Handle multi-page PDFs with consistent table structure
  - Validate extracted data (row count matches PDF pages)
  - Store in PostgreSQL with proper schema
- **Dependencies:** None (foundational)

#### [DATA-02] Database Schema Design
Design and implement normalized database schema for ownership data with historical support.
- **Acceptance Criteria:**
  - Tables: emiten, holders, ownership_records, periods
  - Proper indexes for query performance
  - Support for historical data (multiple periods)
  - Foreign key constraints for data integrity
  - Migration scripts for schema versioning
- **Dependencies:** None (foundational)

#### [DATA-03] Data Quality Validation
Implement validation checks to ensure extracted data integrity.
- **Acceptance Criteria:**
  - Compare extracted row counts with expected ranges
  - Flag missing or malformed data
  - Validate ownership percentages sum to ~100%
  - Log validation results for monitoring
- **Dependencies:** DATA-01, DATA-02

---

### FRONTEND - Per Emiten View

#### [EMIT-01] Stock Listing Page
Display searchable, filterable list of all IDX stocks with ownership data.
- **Acceptance Criteria:**
  - Table with columns: Stock Code, Stock Name, Top Holder, Top Holder %, Updated Date
  - Search by stock code or company name
  - Sort by all columns
  - Pagination for performance (50 items per page)
  - Click stock code to view detail page
- **Dependencies:** DATA-02

#### [EMIT-02] Stock Detail Page
Show detailed ownership information for a specific stock.
- **Acceptance Criteria:**
  - Stock info header (code, name, sector if available)
  - Table of all holders with: Rank, Holder Name, Shares Owned, % Ownership
  - Sortable by all columns
  - Top 5-10 holders highlighted
  - Export to CSV button
  - "Last updated" date badge
- **Dependencies:** EMIT-01, DATA-02

---

### FRONTEND - Core Features

#### [CORE-01] Sortable Tables
Enable users to sort data by clicking column headers.
- **Acceptance Criteria:**
  - Click column header → sort ascending
  - Click again → sort descending
  - Visual indicator for sort direction
  - Maintain sort state across page navigation
  - Works on all data tables
- **Dependencies:** EMIT-01, EMIT-02

#### [CORE-02] Search & Filter
Enable users to find specific data quickly.
- **Acceptance Criteria:**
  - Search input for stock code and holder name (partial matches, case-insensitive)
  - Debounced search (300ms delay) to prevent excessive queries
  - Clear search button
  - URL state encoding for shareable links
  - Search results highlighting
- **Dependencies:** EMIT-01

#### [CORE-03] Data Freshness Indicator
Display last update date prominently on all pages.
- **Acceptance Criteria:**
  - Badge showing "Data per: [Month Year]"
  - Visible on all data pages
  - Links to source PDF if available
  - Shows date in Indonesian format (e.g., "Maret 2026")
- **Dependencies:** DATA-03

#### [CORE-04] Export to CSV
Enable users to download ownership data for offline analysis.
- **Acceptance Criteria:**
  - Export button on all table views
  - CSV file with UTF-8 encoding (Indonesian characters)
  - Proper headers matching table columns
  - Filename includes stock code and date
  - Client-side generation (no server load)
- **Dependencies:** EMIT-02

---

### FRONTEND - UI/UX

#### [UX-01] Responsive Mobile Layout
Ensure website is fully functional on mobile devices.
- **Acceptance Criteria:**
  - Tables usable on 320px width screens
  - Horizontal scroll with sticky first column for wide tables
  - Touch-friendly tap targets (44px min)
  - No horizontal scroll on page body
  - Test on real mobile devices
- **Dependencies:** EMIT-01, EMIT-02

#### [UX-02] Loading States
Show appropriate loading indicators during data fetch.
- **Acceptance Criteria:**
  - Skeleton screens for tables (better than spinners)
  - Loading spinner for page transitions
  - Error states with retry buttons
  - Empty states when no data available
- **Dependencies:** EMIT-01

#### [UX-03] Landing Page
Create a homepage explaining the tool's purpose.
- **Acceptance Criteria:**
  - Hero section with value proposition
  - How it works explanation (PDF → Database → Visualization)
  - "Browse Stocks" CTA button
  - FAQ section (data source, update frequency)
  - Footer with credits and disclaimer
- **Dependencies:** None

---

## v1.1 Requirements (Milestone: Lineage & Entity Linking)

### PARSE - PDF Extraction Fix

#### [PARSE-01] Fix Holder Name Truncation
Perbaiki bug di PDF extractor yang memotong nama holder di tengah kalimat.
- **Acceptance Criteria:**
  - Holder names diekstrak lengkap (e.g., "Prajogo Pangestu" bukan "Prajogo Pange")
  - Fix berlaku untuk semua variasi nama Indonesia (PT, Tbk, nama keluarga)
  - Extractor tested terhadap contoh kasus truncation yang diketahui
  - Tidak ada regresi pada extraction fields lain (kode saham, persentase, jumlah saham)
- **Dependencies:** None (bug fix)

#### [PARSE-02] Re-import Data dengan Extractor Baru
Setelah fix, hapus dan re-import data periode yang ada agar nama holder bersih.
- **Acceptance Criteria:**
  - Data lama di-clear, import ulang dengan extractor yang sudah difix
  - Jumlah records sama atau lebih banyak dari sebelumnya (7209+)
  - Spot-check manual: "Prajogo Pangestu" dan nama panjang lain tampil lengkap
  - Import script berjalan tanpa error
- **Dependencies:** PARSE-01

---

### ENTITY - Entity Grouping

#### [ENTITY-01] User Dapat Membuat Entity Group
Siapapun dapat membuat entitas bernama yang merepresentasikan satu orang/konglomerat.
- **Acceptance Criteria:**
  - Form untuk buat entity baru (nama required, deskripsi optional)
  - Nama entity harus unik
  - Entity disimpan di tabel baru (terpisah dari holders)
  - Halaman daftar semua entities yang dibuat
- **Dependencies:** PARSE-02

#### [ENTITY-02] User Dapat Tambah Holder Alias ke Entity
Tandai beberapa holder records sebagai bagian dari satu entity.
- **Acceptance Criteria:**
  - Search holder by nama (case-insensitive, partial match)
  - Tambah hasil search sebagai alias dari entity
  - Satu holder hanya bisa masuk satu entity (conflict detection dengan error message)
  - Daftar alias yang sudah ditag tampil di halaman entity
- **Dependencies:** ENTITY-01

#### [ENTITY-03] User Dapat Hapus Alias dari Entity
Kembalikan holder ke status independen (ungroup).
- **Acceptance Criteria:**
  - Tombol hapus di setiap alias dalam daftar entity
  - Setelah dihapus, holder kembali muncul sebagai individual di semua views
  - Tidak ada cascade delete ke ownership_records (data tetap aman)
- **Dependencies:** ENTITY-02

---

### AGGR - Aggregate Ownership View

#### [AGGR-01] Entity Profile Page
Halaman yang menampilkan semua kepemilikan saham dari satu entity (gabungan semua aliases).
- **Acceptance Criteria:**
  - URL: `/entities/[id]`
  - Daftar semua saham yang dipegang oleh entity (melalui semua alias-nya)
  - Per saham: total % gabungan, total saham gabungan, breakdown per alias
  - Sortable by total percentage
  - Link ke halaman detail saham
- **Dependencies:** ENTITY-02

#### [AGGR-02] Stock Detail Page Tampilkan Entity Aggregate
Di halaman `/stocks/[code]`, jika beberapa holders adalah alias dari entity yang sama, tampilkan baris entity dengan total gabungan.
- **Acceptance Criteria:**
  - Baris entity ditampilkan di atas baris alias individualnya
  - Entity row menampilkan: nama entity, total % gabungan, total saham gabungan
  - Alias individual tetap tampil di bawahnya (collapsible atau indent)
  - Stocks tanpa entity grouping tidak berubah tampilannya
- **Dependencies:** AGGR-01

---

## v1.1 Requirements (Post-MVP — sudah shipped)

### [HIST-01] Historical Comparison
Show month-over-month changes in ownership.
- **Acceptance Criteria:**
  - Compare current month vs previous month
  - Highlight new holders (appeared this month)
  - Highlight exited holders (sold position)
  - Show change in % ownership (+/-)
  - Color coding (green for accumulation, red for disposal)
- **Dependencies:** v1 complete, 2+ months of data

### [HOLD-01] Per-Holder View
Enable reverse lookup to see all stocks owned by a specific holder.
- **Acceptance Criteria:**
  - Search by holder name
  - List all stocks held by that holder
  - Show % ownership for each stock
  - Sortable columns
  - Export to CSV
- **Dependencies:** v1 complete, reverse index on holder name

### [DASH-01] Top Movers Dashboard
Show dashboard of biggest accumulators and disposals.
- **Acceptance Criteria:**
  - "Top Accumulators" table (holders who increased most)
  - "Top Disposals" table (holders who decreased most)
  - "Most Active Stocks" table (stocks with most ownership changes)
  - Links to detail pages
  - Filter by time period (when multiple periods available)
- **Dependencies:** HIST-01

---

## v2+ Requirements (Future)

### [GRAPH-01] Network Graph Visualization
Visual graph menampilkan hubungan antara entity/holder dan emiten.
- **Notes:** Defer dari v1.1 — prioritaskan aggregate view dulu. Gunakan @xyflow/react, max 200 nodes per subgraph.

### [ANAL-01] Accumulation/Disposal Detection
Automatically flag significant ownership changes (>5%).
- **Dependencies:** Multiple periods of data

### [SECT-01] Sector Analysis
Aggregate ownership by sector (requires sector classification data).
- **Dependencies:** External sector mapping data

### [COMP-01] Cross-Holder Comparison
Compare holdings between two investors.

### [API-01] Public API
Provide API access for developers.

---

## Out of Scope

The following features are explicitly out of scope for v1 and v1.1:

| Feature | Reason |
|---------|--------|
| Real-time updates | IDX data is monthly; real-time creates false expectations |
| Portfolio tracking | Adds authentication, database complexity; scope creep |
| Trading signals | Legal liability; ownership ≠ trading signal |
| User authentication | Reduces accessibility; frictionless public access is differentiator |
| Social features (comments, discussion) | Moderation burden; doesn't align with "quick lookup" value |
| Predictive analytics | Overpromising; wrong predictions damage credibility |
| Multi-exchange support | Dilutes focus; IDX focus is competitive moat |
| User-uploaded PDFs | Quality control, storage costs, abuse potential |
| Alert system | Monthly cadence makes alerts low urgency |
| Network graph visualization | Deferred to v2; aggregate view delivers most value first |
| Automated ML entity resolution | False positives corrupt financial data; no labeled training data |
| Public/crowdsourced entity grouping | Data integrity risk without moderation |

---

## Traceability

Mapping requirements to roadmap phases:

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| EMIT-01 | Phase 2 | Complete |
| EMIT-02 | Phase 2 | Complete |
| CORE-01 | Phase 2 | Complete |
| CORE-02 | Phase 2 | Complete |
| CORE-03 | Phase 2 | Complete |
| CORE-04 | Phase 2 | Complete |
| ENV-01 | Phase 2.1 | Complete |
| UX-01 | Phase 3 | Complete |
| UX-02 | Phase 3 | Complete |
| UX-03 | Phase 3 | Complete |
| HIST-01 | Phase 4 | Complete |
| HOLD-01 | Phase 4 | Complete |
| DASH-01 | Phase 4 | Complete |
| PARSE-01 | Phase 5 | Complete |
| PARSE-02 | Phase 5 | Pending |
| ENTITY-01 | Phase 6 | Pending |
| ENTITY-02 | Phase 6 | Pending |
| ENTITY-03 | Phase 6 | Pending |
| AGGR-01 | Phase 7 | Pending |
| AGGR-02 | Phase 7 | Pending |

---

**Total v1.0 Requirements:** 17 requirements (including HIST-01, HOLD-01, DASH-01, ENV-01)
**Total v1.1 Requirements:** 7 requirements (PARSE-01, PARSE-02, ENTITY-01, ENTITY-02, ENTITY-03, AGGR-01, AGGR-02)
**Total Requirements Mapped:** 23/23 (100%)
**Estimated Complexity:** HIGH (PDF extraction fix + backfill, entity schema design, aggregate queries)
