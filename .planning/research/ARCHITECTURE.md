# Architecture Research

**Domain:** Next.js data visualization with historical stock ownership data
**Researched:** 2025-03-14
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer (Next.js)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Search     │  │   Charts     │  │    Tables    │          │
│  │  Components  │  │  Components  │  │  Components  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                    │
│                           │                                       │
│  ┌────────────────────────┴────────────────────────┐            │
│  │         Client State (Zustand/React Query)       │            │
│  └─────────────────────────────────────────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                     API Layer (Next.js Route Handlers)           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  /api/stocks │  │/api/holders  │  │  /api/admin  │          │
│  │              │  │              │  │              │          │
│  │  • List      │  │  • Search    │  │  • Upload    │          │
│  │  • Detail    │  │  • Portfolio │  │  • Extract   │          │
│  │  • History   │  │  • History   │  │  • Validate  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
├─────────┴─────────────────┴─────────────────┴────────────────────┤
│                     Service Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    PDF Extraction Service                  │   │
│  │  • Parse PDF structure (pdf-parse/pdf-lib)                │   │
│  │  • Extract ownership data                                 │   │
│  │  • Validate & normalize                                   │   │
│  │  • Detect accumulation/disposal patterns                  │   │
│  └────────────────────────────┬─────────────────────────────┘   │
│                                 │                                │
│  ┌─────────────────────────────┴────────────────────────────┐   │
│  │              Historical Analysis Service                   │   │
│  │  • Compare periods (month-over-month)                     │   │
│  │  • Calculate ownership changes                            │   │
│  │  • Identify top holders & trends                          │   │
│  └────────────────────────────┬─────────────────────────────┘   │
│                                │                                │
├───────────────────────────────┴────────────────────────────────┤
│                     Data Access Layer (Prisma/Drizzle)         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Stocks     │  │   Holders    │  │  Ownership   │          │
│  │   Repository │  │   Repository │  │  Repository  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
├─────────┴─────────────────┴─────────────────┴────────────────────┤
│                     Data Store Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │     S3       │  │    Redis     │          │
│  │              │  │              │  │  (Optional)  │          │
│  │  • stocks    │  │  • PDFs      │  │              │          │
│  │  • holders   │  │  • backups   │  │  • query     │          │
│  │  • ownership │  │              │  │    cache     │          │
│  │  • snapshots │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **PDF Extraction Service** | Parse IDX PDFs, extract ownership data, validate structure | Server Action or API route with pdf-parse/pdf-lib |
| **Historical Analysis Service** | Calculate changes between periods, detect accumulation/disposal | Business logic layer with data aggregation |
| **Stock Repository** | Query stock metadata, list emiten, filter by sector | Prisma/Drizzle ORM with PostgreSQL |
| **Holder Repository** | Search holders, get holder portfolios, track history | Prisma/Drizzle with indexed queries |
| **Ownership Repository** | Query ownership records, period comparisons, top holders | Prisma/Drizzle with complex joins |
| **API Route Handlers** | HTTP interface, request validation, error handling | Next.js App Router route handlers |
| **Client Components** | Interactive charts, search/filter UI, table rendering | React + Recharts/TanStack Table |
| **State Management** | Cache API responses, manage filters/sort, optimistic updates | React Query (SWR) + Zustand |

## Recommended Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Route group for layout
│   │   ├── page.tsx       # Homepage (stock list)
│   │   ├── stock/
│   │   │   ├── [ticker]/
│   │   │   │   └── page.tsx    # Stock detail with ownership
│   │   │   └── page.tsx        # Stock search/list
│   │   └── holder/
│   │       ├── [id]/
│   │       │   └── page.tsx    # Holder detail with portfolio
│   │       └── page.tsx        # Holder search/list
│   ├── admin/              # Admin routes (protected)
│   │   ├── upload/
│   │   │   └── page.tsx        # PDF upload interface
│   │   └── extract/
│   │       └── page.tsx        # Extraction status/results
│   ├── api/                # API routes
│   │   ├── stocks/
│   │   │   ├── route.ts        # GET list, POST filter
│   │   │   └── [ticker]/
│   │   │       └── route.ts    # GET detail with history
│   │   ├── holders/
│   │   │   ├── route.ts        # GET search, POST filter
│   │   │   └── [id]/
│   │   │       └── route.ts    # GET portfolio, history
│   │   └── admin/
│   │       ├── upload/
│   │       │   └── route.ts    # POST PDF upload
│   │       └── extract/
│   │           └── route.ts    # POST trigger extraction
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/             # React components
│   ├── ui/                 # Reusable UI components
│   │   ├── table.tsx       # Data table with sort/filter
│   │   ├── chart.tsx       # Chart wrapper
│   │   └── search.tsx      # Search input
│   ├── stock/              # Stock-specific components
│   │   ├── stock-card.tsx
│   │   ├── ownership-table.tsx
│   │   └── history-chart.tsx
│   └── holder/             # Holder-specific components
│       ├── holder-card.tsx
│       ├── portfolio-table.tsx
│       └── accumulation-badge.tsx
├── lib/                   # Utility functions
│   ├── pdf/              # PDF extraction
│   │   ├── parser.ts     # Parse PDF structure
│   │   ├── extractor.ts  # Extract ownership data
│   │   └── validator.ts  # Validate extracted data
│   ├── db/               # Database
│   │   ├── prisma.ts     # Prisma client
│   │   └── seed.ts       # Seed data
│   ├── services/         # Business logic
│   │   ├── stock.service.ts
│   │   ├── holder.service.ts
│   │   └── analysis.service.ts
│   └── utils/            # Utilities
│       ├── format.ts     # Formatters (number, date)
│       └── validation.ts # Zod schemas
├── hooks/                # React hooks
│   ├── useStockData.ts   # Fetch stock data
│   ├── useHolderData.ts  # Fetch holder data
│   └── useFilters.ts     # Filter/sort state
├── stores/               # State management
│   └── filter.store.ts   # Zustand store for filters
└── types/                # TypeScript types
    ├── stock.ts
    ├── holder.ts
    └── ownership.ts
```

### Structure Rationale

- **app/:** Next.js 15 App Router convention — file-based routing with colocated API routes
- **components/:** Reusable UI components organized by domain (stock/holder) vs generic (ui)
- **lib/pdf/:** Isolated PDF extraction logic — can be swapped for different parsing strategies
- **lib/services/:** Business logic layer separate from API routes — reusable across routes
- **lib/db/:** Database access abstraction — enables easy ORM changes
- **hooks/:** Custom React hooks for data fetching — encapsulates React Query logic
- **stores/:** Client-side state management — minimal usage for filter/sort state
- **types/:** Shared TypeScript types — ensures type safety across layers

## Architectural Patterns

### Pattern 1: Server-First Data Fetching with Progressive Enhancement

**What:** Fetch data on the server using Server Components, stream to client, enhance with Client Components for interactivity.

**When to use:** Public websites with SEO requirements, data-heavy dashboards.

**Trade-offs:**
- Pros: Fast initial load, SEO-friendly, reduced client JS
- Cons: More complex data flow, need to pass server data to client

**Example:**
```typescript
// app/stock/[ticker]/page.tsx (Server Component)
import { StockHeader } from '@/components/stock/stock-header'
import { OwnershipTable } from '@/components/stock/ownership-table'
import { StockService } from '@/lib/services/stock.service'

export default async function StockPage({ params }: { params: { ticker: string } }) {
  const stock = await StockService.getStock(params.ticker)
  const ownership = await StockService.getOwnership(params.ticker)

  return (
    <div>
      <StockHeader stock={stock} /> {/* Server component */}
      <OwnershipTable initialData={ownership} /> {/* Client component with initial data */}
    </div>
  )
}
```

### Pattern 2: Repository Pattern for Data Access

**What:** Abstract database operations behind repository interfaces.

**When to use:** Multiple data sources, complex queries, testability requirements.

**Trade-offs:**
- Pros: Testable, swapable data sources, centralized query logic
- Cons: More boilerplate, potential over-abstraction for simple CRUD

**Example:**
```typescript
// lib/db/repositories/stock.repository.ts
export class StockRepository {
  constructor(private db: PrismaClient) {}

  async findByTicker(ticker: string) {
    return this.db.stock.findUnique({
      where: { ticker },
      include: { sector: true }
    })
  }

  async listTopHolders(ticker: string, period: string, limit = 10) {
    return this.db.ownership.findMany({
      where: {
        stock: { ticker },
        period
      },
      orderBy: { shares: 'desc' },
      take: limit,
      include: { holder: true }
    })
  }
}

// lib/services/stock.service.ts
export class StockService {
  private repo = new StockRepository(prisma)

  async getStock(ticker: string) {
    return this.repo.findByTicker(ticker)
  }

  async getTopHolders(ticker: string, period: string) {
    return this.repo.listTopHolders(ticker, period)
  }
}
```

### Pattern 3: API Route Handler Pattern

**What:** Standardized structure for Next.js API routes with validation, error handling, and response formatting.

**When to use:** All API routes to ensure consistency.

**Trade-offs:**
- Pros: Consistent error handling, DRY validation, easy to test
- Cons: More boilerplate for simple endpoints

**Example:**
```typescript
// app/api/stocks/[ticker]/route.ts
import { z } from 'zod'
import { StockService } from '@/lib/services/stock.service'

const schema = z.object({
  ticker: z.string().regex(/^[A-Z]{4}$/),
  period: z.string().optional().default('latest')
})

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    // Validate input
    const { ticker, period } = schema.parse({
      ticker: params.ticker,
      period: new URL(request.url).searchParams.get('period') || undefined
    })

    // Fetch data
    const service = new StockService()
    const stock = await service.getStockWithHistory(ticker, period)

    if (!stock) {
      return Response.json(
        { error: 'Stock not found' },
        { status: 404 }
      )
    }

    return Response.json(stock)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid input', issues: error.issues },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Pattern 4: React Query for Client State Synchronization

**What:** Use React Query (SWR) to cache server state on client, refetch on focus, optimistic updates.

**When to use:** Interactive dashboards, real-time data, filterable/sortable lists.

**Trade-offs:**
- Pros: Automatic caching, refetching, loading states
- Cons: Additional library, complexity for simple use cases

**Example:**
```typescript
// hooks/useStockData.ts
import { useQuery } from '@tanstack/react-query'

export function useStockData(ticker: string) {
  return useQuery({
    queryKey: ['stock', ticker],
    queryFn: () => fetch(`/api/stocks/${ticker}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useOwnershipHistory(ticker: string) {
  return useQuery({
    queryKey: ['ownership', ticker, 'history'],
    queryFn: () => fetch(`/api/stocks/${ticker}/history`).then(r => r.json()),
    refetchOnWindowFocus: false,
  })
}
```

## Data Flow

### Request Flow (User Viewing Stock)

```
User navigates to /stock/TLKM
    ↓
Next.js Server Component (app/stock/[ticker]/page.tsx)
    ↓
StockService.getStock(ticker)
    ↓
StockRepository.findByTicker(ticker)
    ↓
PostgreSQL Query (SELECT * FROM stocks WHERE ticker = 'TLKM')
    ↓
StockRepository.listTopHolders(ticker, 'latest')
    ↓
PostgreSQL Query with JOIN (ownership + holders)
    ↓
Data returned to Server Component
    ↓
Render HTML with initial data (SSR)
    ↓
Hydration on client
    ↓
Client Components (OwnershipTable) mount
    ↓
React Query fetches fresh data (optional)
    ↓
User interacts (sort/filter)
    ↓
Client-side state updates (Zustand)
    ↓
React Query refetches with new params
```

### PDF Upload Flow (Admin)

```
Admin uploads PDF via /admin/upload
    ↓
POST /api/admin/upload
    ↓
PDF stored in S3 (or local /public/uploads)
    ↓
Trigger extraction job
    ↓
PDFExtractionService.parse(pdfBuffer)
    ↓
pdf-parse extracts text
    ↓
Extract ownership data using regex/patterns
    ↓
Validate extracted data (Zod schema)
    ↓
StockService.batchUpsertOwnership(extractedData)
    ↓
Transaction:
  - Upsert holders
  - Upsert stocks
  - Insert ownership records
  - Create period snapshot
    ↓
Calculate period-over-period changes
    ↓
Store accumulation/disposal flags
    ↓
Return success with summary
```

### State Management

```
Server State (Database)
    ↓ (API routes / Server Actions)
Client State (React Query Cache)
    ↓ (useQuery hooks)
React Components (read-only display)
    ↓ (user actions)
Actions (filters, sort, pagination)
    ↓ (Zustand store)
URL State (search params)
    ↓
React Query refetch with new params
```

### Key Data Flows

1. **PDF → Database:** Admin uploads PDF → S3 → Extraction Service → Parse → Validate → Insert/Update → PostgreSQL
2. **Database → UI:** User request → API Route → Service → Repository → PostgreSQL → Transform → JSON → Client
3. **Client Interaction:** User filter → URL update → React Query refetch → API Route with params → Filtered results → UI update

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single Vercel deployment, PostgreSQL on Vercel (Neon), no caching needed |
| 1k-100k users | Add Redis cache for common queries, CDN for static assets, database connection pooling, consider read replicas |
| 100k+ users | Separate extraction worker (not in API route), background job queue (BullMQ), data preprocessing/aggregation, consider time-series DB for ownership history, CDN caching for API responses |

### Scaling Priorities

1. **First bottleneck:** PDF extraction in API route (timeout risk)
   - Fix: Move to background job, use queue-based processing, return job ID, poll for status

2. **Second bottleneck:** Database queries for historical comparisons (complex joins)
   - Fix: Add indexes on (stock_id, period), materialized views for common queries, Redis cache for热门 stocks

3. **Third bottleneck:** Client-side rendering for large tables (performance)
   - Fix: Virtualization (react-virtual), pagination, server-side pagination

## Anti-Patterns

### Anti-Pattern 1: Client-Side PDF Extraction

**What people do:** Upload PDF to client, extract in browser using pdf.js.

**Why it's wrong:**
- Slow on client devices
- Exposes PDF structure publicly
- Can't reuse extraction logic
- Browser memory limitations

**Do this instead:** Server-side extraction in API route or background job, store structured data in database, serve JSON to client.

### Anti-Pattern 2: Monolithic API Routes

**What people do:** Put all business logic in API route handlers.

**Why it's wrong:**
- Hard to test
- Can't reuse logic
- Violates separation of concerns
- Difficult to mock for testing

**Do this instead:** Extract business logic to service layer, API routes only handle HTTP concerns (validation, error handling, response formatting).

### Anti-Pattern 3: N+1 Queries in Server Components

**What people do:** Fetch stocks, then loop to fetch ownership for each.

**Why it's wrong:**
- Database round-trips = slow
- Doesn't scale with data size
- Unnecessary load on database

**Do this instead:** Use JOIN queries or include in Prisma, batch fetch with `findMany` + `in` clause, consider dataLoader pattern.

### Anti-Pattern 4: Skipping Database Indexes

**What people do:** Create tables without indexes on common query fields.

**Why it's wrong:**
- Full table scans = slow queries
- Performance degrades with data size
- Database becomes bottleneck

**Do this instead:** Add indexes on (ticker), (holder_id, period), (stock_id, period, shares DESC), use EXPLAIN ANALYZE to verify query plans.

### Anti-Pattern 5: No Input Validation

**What people do:** Trust user input, pass directly to database.

**Why it's wrong:**
- Security risk (SQL injection, even with ORM)
- Invalid data causes errors
- Poor error messages

**Do this instead:** Use Zod schemas at API route boundaries, validate before processing, return helpful error messages.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Vercel Postgres (Neon)** | Prisma ORM with connection pooling | Serverless-friendly, auto-scaling |
| **Vercel Blob (S3)** | Upload PDF on admin route, store metadata in DB | Simple, no separate S3 setup needed |
| **Vercel KV (Redis)** | Cache common queries (热门 stocks, top holders) | Optional, add when needed |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Client ↔ API** | HTTP (fetch) via React Query | Standard REST, consider GraphQL if complex queries grow |
| **API ↔ Service** | Direct function calls | In-process, can move to microservices later if needed |
| **Service ↔ Repository** | Direct function calls | Repository pattern enables easy DB swapping |
| **PDF Extraction ↔ Database** | Transactional writes | Ensure data consistency, rollback on validation failure |

## Build Order Recommendations

Based on dependencies and complexity:

1. **Phase 1: Core Data Model**
   - Set up PostgreSQL with Prisma/Drizzle
   - Define schema (stocks, holders, ownership, periods)
   - Create seed data for testing
   - **Rationale:** Everything depends on data structure

2. **Phase 2: PDF Extraction MVP**
   - Build PDF parser for single stock
   - Create extraction service
   - Admin upload interface
   - **Rationale:** Need data before visualization

3. **Phase 3: Basic API**
   - Stock list API
   - Stock detail API (latest period only)
   - Search/filter APIs
   - **Rationale:** Enable frontend development

4. **Phase 4: Frontend - Stock View**
   - Stock list page
   - Stock detail page
   - Ownership table (single period)
   - **Rationale:** Core user value, validates data model

5. **Phase 5: Historical Analysis**
   - Period comparison queries
   - Holder portfolio APIs
   - Accumulation/disposal detection
   - **Rationale:** Advanced features after core works

6. **Phase 6: Frontend - Advanced Views**
   - Historical charts
   - Holder portfolio pages
   - Advanced filters
   - **Rationale:** Polish and advanced features

## Sources

- Next.js App Router Documentation: https://nextjs.org/docs/app
- Prisma Best Practices: https://www.prisma.io/docs/guides/performance-and-optimization
- React Query Documentation: https://tanstack.com/query/latest
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres

---
*Architecture research for: IDX Ownership Visualizer*
*Researched: 2025-03-14*
