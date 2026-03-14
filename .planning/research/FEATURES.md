# Feature Landscape: Stock Ownership Data Visualization

**Domain:** Financial Data Visualization - Stock Ownership/Institutional Holdings
**Researched:** 2025-03-14
**Confidence:** MEDIUM (based on platform analysis and industry standards)

## Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Sortable Tables** | Users expect to click column headers to sort (A-Z, Z-A, numerical) | LOW | Standard across all financial platforms; must maintain sort state |
| **Search/Filter** | Users need to find specific stocks or holders instantly | LOW | Must support partial matches, case-insensitive |
| **Historical Data Access** | Financial data without history is useless for trend analysis | MEDIUM | Need month-over-month comparison capability |
| **Export to CSV/Excel** | Users want to analyze data offline or in their own tools | LOW | Must preserve data integrity and formatting |
| **Responsive Design** | Users access from mobile/tablet/desktop | MEDIUM | Financial tables are hard on mobile; need horizontal scroll or card view |
| **Data Freshness Indicator** | Users need to know how current the data is | LOW | Simple "Last updated: [date]" badge |
| **Per-Emiten View** | Primary use case: "Who owns stock X?" | MEDIUM | Top holders list with percentage ownership |
| **Per-Holder View** | Secondary use case: "What does holder Y own?" | MEDIUM | Reverse lookup from holdings to stocks |
| **Basic Charts** | Visual representation of ownership changes | MEDIUM | Line charts for historical trends, pie for distribution |
| **Fast Page Load** | Financial users are time-sensitive | HIGH | Need proper indexing, pagination, or lazy loading |

## Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Accumulation/Disposal Detection** | Automatically flags significant ownership changes (>5%) | HIGH | Requires historical comparison logic; major time-saver for analysts |
| **IDX-Specific PDF Extraction** | No one else parses Indonesian IDX PDFs into structured data | HIGH | This is the core technical differentiator |
| **Historical Trend Charts** | Visual timeline of ownership changes for specific holder/stock | MEDIUM | Shows accumulation patterns over time |
| **Cross-Holder Comparison** | "Compare holdings between two investors" feature | MEDIUM | Useful for seeing smart money alignment |
| **Sector Aggregation** | View ownership by sector (e.g., "Who owns the most banking stocks?") | HIGH | Requires sector classification data |
| **Top Movers Alert** | "Biggest accumulators/disposals this month" dashboard | MEDIUM | Engaging entry point; drives repeat visits |
| **Direct PDF Download Links** | Convenience: link to source PDF for verification | LOW | Trust-building feature; shows transparency |
| **Indonesian Language Support** | Local market advantage over global platforms | MEDIUM | Full Bahasa Indonesia UI increases local adoption |
| **Mobile-Optimized Tables** | Card-based layout for small screens instead of wide tables | MEDIUM | Most competitors fail at mobile data tables |
| **Shareable Views** | URL with filters pre-applied (e.g., "See TLKM ownership") | LOW | Enable sharing analysis via social media/chat |

## Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-Time Updates** | "We want live ownership data!" | IDX data is monthly; real-time is impossible. Creates false expectations. | Be explicit: "Monthly updates from IDX PDFs" + set user expectations |
| **Portfolio Tracking** | "Track my portfolio alongside ownership data" | Adds authentication, database complexity, privacy concerns. Scope creep. | Keep it as a lookup tool; users can track elsewhere |
| **Trading Signals** | "Tell me when to buy/sell based on ownership" | Legal liability; ownership data ≠ trading signal; misleads users. | Provide data only; users interpret |
| **Social Features** | "Comments, discussions, community" | Moderation burden, noise, doesn't align with "quick lookup" value | Link to existing communities (e.g., Stockbit, Discord) |
| **Predictive Analytics** | "Predict future ownership based on trends" | Overpromising; wrong predictions damage credibility; low confidence | Show historical trends only; users make predictions |
| **Multi-Exchange Support** | "Add NYSE, NASDAQ, etc." | Dilutes focus; IDX data is hard enough; competitors already do global | Be the best at IDX ownership data first |
| **Complex Filters (AND/OR logic)** | "Advanced filtering like Bloomberg" | Power user feature; most users want simple search; UI complexity | Start with simple filters; add advanced if requested |
| **User Authentication** | "Save preferences, watchlists" | Adds dev time, reduces accessibility (no login = frictionless) | Use URL parameters for sharing; local storage for preferences |
| **Real-Time Chat Support** | "Help users understand the data" | Scaling nightmare; asynchronous product (monthly data) doesn't need it | Comprehensive FAQs + tooltips; email for issues |
| **PDF Upload by Users** | "Let users upload PDFs to extract" | Quality control, validation, storage costs, abuse potential | Centralized extraction ensures quality |

## Feature Dependencies

```
[Per-Emiten View] ──requires──> [Data Extraction & Storage]
                          └──requires──> [Database Schema]

[Per-Holder View] ──requires──> [Reverse Index on Holder Name]
                          └──requires──> [Historical Data Storage]

[Historical Comparison] ──requires──> [Multiple Periods Stored]
                          └──requires──> [Temporal Data Model]

[Accumulation/Disposal Detection] ──enhances──> [Historical Comparison]
                                       └──requires──> [Change Calculation Logic]

[Export to CSV] ──enhances──> [All Views]

[Search/Filter] ──enhances──> [All Views]

[Charts] ──requires──> [Data Aggregation APIs]
        └──requires──> [Chart Library Integration]
```

### Dependency Notes

- **Per-Emiten View requires Data Extraction & Storage**: Can't show anything without extracting PDFs first
- **Per-Holder View requires Reverse Index**: Need fast lookup by holder name across all stocks
- **Historical Comparison requires Multiple Periods**: Must store at least 2 months of data to compare
- **Accumulation/Disposal Detection enhances Historical Comparison**: It's an advanced view of comparison, showing significant changes
- **Export to CSV enhances All Views**: Adds value to every feature without dependencies
- **Search/Filter enhances All Views**: Makes all data accessible; must be implemented at component level
- **Charts require Data Aggregation APIs**: Backend endpoints to compute chart data (e.g., "get TLKM ownership trend")

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **PDF Extraction Pipeline** — Parse IDX monthly PDFs into structured database
  - Rationale: Without data, nothing works. This is the foundation.
- [ ] **Per-Emiten View with Search** — Show top holders for any stock with search/filter
  - Rationale: Primary use case ("Who owns TLKM?"). Must work for validation.
- [ ] **Sortable Tables** — Click column headers to sort
  - Rationale: Users expect this; missing it feels broken.
- [ ] **Data Freshness Indicator** — Show "Last updated: [date]"
  - Rationale: Sets expectations; builds trust.
- [ ] **Export to CSV** — Download ownership data
  - Rationale: Power users need this; validates data utility.
- [ ] **Responsive Mobile Layout** — Usable on phones
  - Rationale: Indonesian users heavily mobile; if it doesn't work on mobile, they won't return.
- [ ] **Static Landing Page** - Explain what the tool does
  - Rationale: Onboarding; users need to understand the value instantly.

### Add After Validation (v1.x)

Features to add once core is working and users engage.

- [ ] **Per-Holder View** — "What does [Investor X] own?"
  - Trigger: Users request reverse lookup OR analytics show users searching for specific holders
- [ ] **Historical Comparison** — Month-over-month change view
  - Trigger: Data accumulation (3+ months) OR users ask for trends
- [ ] **Basic Charts** — Line charts for ownership trends
  - Trigger: Per-Holder View implemented (needs historical data)
- [ ] **Top Movers Dashboard** — "Biggest accumulators this month"
  - Trigger: Historical Comparison live (needs change calculation)
- [ ] **Direct PDF Links** — Link to source IDX PDF
  - Trigger: User trust concerns OR data verification requests

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Accumulation/Disposal Detection** — Auto-flag significant changes
  - Why defer: Complex logic; needs historical data volume; validates after usage patterns known
- [ ] **Sector Analysis** — Aggregate ownership by sector
  - Why defer: Requires sector classification mapping; nice-to-have, not core
- [ ] **Cross-Holder Comparison** — Compare two investors' portfolios
  - Why defer: Power user feature; unknown demand
- [ ] **Advanced Analytics** — Correlations, concentration metrics
  - Why defer: Unclear value prop; better to wait for user feedback
- [ ] **API Access** — Public API for developers
  - Why defer: Product must succeed first; API is scaling feature
- [ ] **Alert System** — Email notifications for significant changes
  - Why defer: Monthly data cadence makes alerts low urgency; wait for user demand

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| PDF Extraction Pipeline | HIGH | HIGH | P1 |
| Per-Emiten View with Search | HIGH | MEDIUM | P1 |
| Sortable Tables | HIGH | LOW | P1 |
| Data Freshness Indicator | MEDIUM | LOW | P1 |
| Export to CSV | HIGH | LOW | P1 |
| Responsive Mobile Layout | HIGH | MEDIUM | P1 |
| Per-Holder View | HIGH | MEDIUM | P2 |
| Historical Comparison | HIGH | MEDIUM | P2 |
| Basic Charts | MEDIUM | MEDIUM | P2 |
| Top Movers Dashboard | MEDIUM | MEDIUM | P2 |
| Accumulation/Disposal Detection | HIGH | HIGH | P2 |
| Sector Analysis | MEDIUM | HIGH | P3 |
| Cross-Holder Comparison | MEDIUM | MEDIUM | P3 |
| Advanced Analytics | LOW | HIGH | P3 |
| API Access | LOW | HIGH | P3 |
| Alert System | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (MVP)
- P2: Should have, add when possible (post-MVP)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | Bloomberg Terminal | FactSet | WhaleWisdom | Our Approach |
|---------|-------------------|---------|------------|--------------|
| **Data Source** | Real-time SEC filings | Real-time global ownership | 13F filings (US only) | IDX PDFs (Indonesia-only, monthly) |
| **Cost** | $20,000+/year | $10,000+/year | $500-$2,000/year | FREE (public website) |
| **Geographic Focus** | Global | Global | US only | Indonesia only (competitive moat) |
| **Update Frequency** | Real-time | Real-time | Quarterly (13F) | Monthly |
| **Accessibility** | Terminal install required | Web login required | Web login required | Public website, no login |
| **Mobile Support** | Limited | Yes | Yes | First-class mobile focus |
| **Export** | Yes | Yes | Yes | Yes |
| **Historical Trends** | Yes, deep | Yes, deep | Yes, 5+ years | Start with 6-12 months |
| **Alerts** | Yes | Yes | Yes | No (out of scope) |
| **Language** | English | English | English | Bahasa Indonesia + English |

**Key Insight:** Our differentiator is **free, public, Indonesia-specific** ownership data. No competitor focuses on IDX ownership because it requires local PDF extraction. We're not competing with Bloomberg on features; we're competing on **accessibility** (free/public) and **localization** (Indonesia focus).

## Implementation Notes by Feature Category

### Data Display
- **Tables:** Use React Table or TanStack Table for sorting, filtering, pagination
- **Charts:** Chart.js or Recharts for simple line/pie charts
- **Mobile:** Consider card layout instead of wide tables; horizontal scroll with sticky columns
- **Loading States:** Skeleton screens better than spinners for perceived performance

### Search & Filter
- **Search:** Debounced input search (300ms delay) to prevent excessive queries
- **Filters:** Dropdown for stock code, date range picker for historical view
- **URL State:** Encode filters in URL for shareable views (e.g., `?stock=TLKM&period=2025-02`)

### Historical Comparison
- **Data Model:** Store each month as separate dataset; use versioning for schema changes
- **Calculation:** Pre-compute changes on data update (not query-time) for performance
- **Visual:** Use +/- indicators with color coding (green for accumulation, red for disposal)

### Data Import Workflow
- **Automation:** Python script for PDF extraction (PyPDF2, pdfplumber)
- **Validation:** Compare extracted row counts with PDF page counts; flag discrepancies
- **Storage:** Postgres or Supabase for structured data; S3 for archived PDFs
- **Versioning:** Tag each dataset with extraction timestamp and PDF hash

## Sources

**Platform Analysis (based on training data):**
- Bloomberg Terminal features - Institutional ownership tracking, 13F analysis
- FactSet Holdings - Ownership analytics, historical trends, peer comparison
- WhaleWisdom - 13F filing visualization, portfolio overlap, hedge fund tracking
- SEC EDGAR - Raw ownership filing access

**Industry Standards:**
- Financial data visualization best practices (dashboard patterns, table design)
- Mobile-first financial applications (Robinhood, Stockbit patterns)
- Public data website standards (data.gov, government transparency portals)

**Limitations:**
- Web search unavailable due to rate limits (2026-03-14 reset)
- No direct access to current IDX PDFs for validation
- Competitor analysis based on training data (knowledge cutoff: 2024-10)
- Specific Indonesian market knowledge gaps; recommend local user validation

**Confidence Assessment:**
- **HIGH:** Table stakes features (standard across all financial platforms)
- **MEDIUM:** Differentiators (based on general financial platform patterns)
- **LOW:** Indonesia-specific competitive landscape (unable to search current local tools)

**Recommended Next Steps:**
1. Validate feature list with 5-10 Indonesian traders/investors
2. Review actual IDX PDF format to confirm extraction complexity
3. Survey existing Indonesian financial tools (Stockbit, IDN Financials) for feature gaps
4. Prototype Per-Emiten View to test usability assumptions

---
*Feature research for: IDX Ownership Visualizer*
*Researched: 2025-03-14*
