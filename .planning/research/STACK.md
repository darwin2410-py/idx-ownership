# Technology Stack

**Project:** IDX Ownership Visualizer
**Researched:** 2025-03-14
**Overall Confidence:** MEDIUM (WebSearch unavailable - based on training data, verify with official docs before implementing)

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Next.js** | 15.x | React framework with App Router | Native Vercel deployment, excellent SEO for public site, Server Components for performance, built-in API routes for PDF processing |
| **React** | 19.x | UI library | Required peer dependency for Next.js 15, latest Server Components support |
| **TypeScript** | 5.x | Type safety | Catches data transformation bugs, essential for complex PDF parsing logic, better DX for large codebase |

### Database & Storage
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vercel Postgres** | Latest (via `@vercel/postgres`) | Serverless PostgreSQL | Native Vercel integration, auto-scaling, no server management, perfect for monthly update pattern, free tier available |
| **Drizzle ORM** | 0.33+ | Database query builder | Type-safe queries, excellent TypeScript support, smaller bundle than Prisma, great for serverless edge functions |

### Data Visualization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Recharts** | 2.x | Charting library | Declarative API, built on D3.js, SSR-compatible (critical for Next.js), excellent TypeScript support, composable components |
| **TanStack Table** | 8.x (React Table v8) | Data tables with pagination/sorting | Headless architecture (full styling control), server-side pagination support, excellent filtering/sorting, framework-agnostic |

### PDF Extraction
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **pdf-parse** | 1.1.x | PDF text extraction | Lightweight, simple API, works in Node.js (API routes), extracts text + metadata, minimal dependencies |
| **zod** | 3.x | Schema validation | Validate extracted PDF data before DB insertion, catch malformed data early, TypeScript inference |

### UI Components
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Tailwind CSS** | 3.x | Utility-first styling | Zero runtime, small bundle, excellent Vercel integration, rapid prototyping |
| **shadcn/ui** | Latest | Component library | Copy-paste components (not npm bloat), built on Radix UI primitives, Tailwind-styled, excellent accessibility |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **date-fns** | 3.x | Date manipulation | Format monthly report dates, calculate historical periods, tree-shakeable (smaller than Moment.js) |
| **clsx** | 2.x | Conditional class names | Combine Tailwind classes conditionally, standard pattern in Next.js apps |
| **@tanstack/react-query** | 5.x | Server state management | Cache historical data queries, automatic refetching, optimistic UI (if needed later) |
| **next-themes** | 0.3+ | Dark mode support | If adding dark mode later, handles theme switching in Next.js App Router |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Charts** | Recharts | Chart.js (react-chartjs-2) | Canvas rendering (not SSR-friendly), larger bundle, less declarative API |
| **Charts** | Recharts | Nivo | Server-side rendering is great but library is less maintained, Recharts has larger community |
| **Tables** | TanStack Table | MUI DataGrid | Not headless (forced Material Design look), heavy bundle size, harder to customize |
| **Tables** | TanStack Table | React-Table v7 | Deprecated, migrate to v8 (TanStack Table) |
| **Database** | Vercel Postgres | Supabase | Overkill for read-heavy public site, adds auth complexity we don't need, Vercel integration simpler |
| **Database** | Vercel Postgres | PlanetScale | MySQL-based, Postgres more standard for analytics, Vercel Postgres has better free tier |
| **ORM** | Drizzle | Prisma | Prisma 5+ has improved but still larger bundle, Drizzle better for serverless edge, more SQL control |
| **PDF** | pdf-parse | pdf.js | Overkill for simple text extraction, larger bundle, more complex API, pdf-parse sufficient for tables |
| **PDF** | pdf-parse | pdf2json | JSON output is over-engineered for our needs, text extraction simpler with pdf-parse |
| **UI** | shadcn/ui | Chakra UI | Full component library (larger bundle), shadcn is copy-paste (tree-shakeable), more flexibility |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Next.js Pages Router** | Legacy, App Router is the future (since Next.js 13), better Server Components support | App Router (`app/` directory) |
| **Material-UI (MUI)** | Heavy bundle size (~300KB gzipped), forced styling system, hard to customize with Tailwind | shadcn/ui + Tailwind |
| **Moment.js** | Deprecated, huge bundle (~70KB), mutable API | date-fns (tree-shakeable) |
| **React-Table v7** | Deprecated in 2022, renamed to TanStack Table v8 | TanStack Table v8 |
| **jQuery** | Completely unnecessary in React ecosystem, DOM manipulation anti-pattern | React state + refs (rarely needed) |
| **Express.js** | Don't need separate server, Next.js API routes handle everything | Next.js Route Handlers (`app/api/*`) |
| **AWS S3 direct** | Overkill for PDF storage, Vercel Blob storage simpler if needed | Vercel Blob (or just store parsed data in Postgres) |
| **Client-side PDF parsing** | Exposes parsing logic, slower on mobile devices | Server-side in Next.js API route |
| **localStorage for history** | Limited to 5-10MB, not shareable across devices, hard to sync | Server-side Postgres storage |

## Installation

```bash
# Initialize Next.js project
npx create-next-app@latest idx-ownership --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Core dependencies
npm install next@latest react@latest react-dom@latest

# Database & ORM
npm install @vercel/postgres drizzle-orm

# PDF extraction & validation
npm install pdf-parse zod

# Data visualization
npm install recharts @tanstack/react-table

# Server state (if needed for caching)
npm install @tanstack/react-query

# Utilities
npm install date-fns clsx tailwind-merge

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom drizzle-kit
```

```bash
# shadcn/ui initialization (after project creation)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button table card input select
```

## Stack Patterns by Variant

**If PDFs have complex tables (multi-line, merged cells):**
- Use **pdf2json** instead of pdf-parse
- Because pdf-parse only extracts text, pdf2json preserves table structure
- Tradeoff: Larger bundle, more complex parsing logic

**If data grows beyond 100K records:**
- Add **server-side pagination** with TanStack Table
- Because client-side pagination will slow down the browser
- Implementation: Pass page/sort params to API route, query with LIMIT/OFFSET

**If adding real-time updates (future):**
- Add **Vercel Postgres Change Data Capture** or **Supabase Realtime**
- Because current design is monthly manual updates, real-time requires different architecture
- Tradeoff: Increased complexity, WebSocket connections

**If hosting outside Vercel:**
- Use **Docker + PostgreSQL** instead of Vercel Postgres
- Because Vercel Postgres is Vercel-specific
- Alternative: Neon (serverless Postgres, works anywhere)

**If PDF extraction fails frequently:**
- Add **PDF.js** as fallback
- Because pdf-parse is simple, PDF.js handles more edge cases
- Tradeoff: Larger bundle, more maintenance

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 15.x | React 19.x | Next.js 15 requires React 19 |
| Next.js 15.x | TypeScript 5.x | Recommended, uses latest TS features |
| Recharts 2.x | React 18+ | Compatible with Server Components (use `'use client'` for charts) |
| TanStack Table 8.x | React 18+ | Works with Server Components (use client directive) |
| Drizzle 0.33+ | Node.js 18+ | Requires Node 18+ (Vercel runtime) |
| pdf-parse 1.1.x | Node.js 14+ | Works in API routes (Node.js environment) |
| @vercel/postgres | Vercel Edge Runtime | Uses Postgres.js wire protocol, not node-postgres |

## Architecture Notes

### Data Flow
```
PDF Upload (admin) → API Route (app/api/parse-pdf) → pdf-parse extraction →
Zod validation → Drizzle ORM → Vercel Postgres
                                              ↓
User Visit → Server Component (app/page.tsx) → Drizzle query →
React render → Recharts charts + TanStack Table
```

### Why Server Components Matter
- **Performance**: Database queries run on server, no client-side JSON payload
- **Security**: PDF parsing logic stays server-side (not exposed in browser bundle)
- **Bundle size**: Recharts/TanStack Table only load in client components where needed

### Client vs Server Component Strategy
- **Server Components**: Data fetching (Drizzle queries), static layout
- **Client Components**: Interactive tables (TanStack Table), charts (Recharts), search/filter UI

## Sources

**Confidence: MEDIUM** - WebSearch tools were rate-limited during research. Recommendations based on training data (cutoff June 2024). **Verify with official docs before implementing:**

- **Next.js**: https://nextjs.org/docs (verify App Router patterns, Server Components)
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres (verify free tier limits, connection patterns)
- **TanStack Table**: https://tanstack.com/table/latest/docs/introduction (verify v8 API, pagination examples)
- **Recharts**: https://recharts.org/en-US/ (verify SSR compatibility, latest API)
- **Drizzle ORM**: https://orm.drizzle.team/docs/overview (verify serverless best practices)
- **pdf-parse**: https://www.npmjs.com/package/pdf-parse (verify API, table extraction capabilities)
- **shadcn/ui**: https://ui.shadcn.com/ (verify installation steps, component list)

**Action required before Phase 1:**
- [ ] Verify Next.js 15 current version and App Router best practices
- [ ] Test pdf-parse on sample IDX PDF to ensure table extraction works
- [ ] Confirm Vercel Postgres free tier supports expected data volume
- [ ] Validate Recharts SSR patterns with Next.js 15 Server Components

---
*Stack research for: IDX Ownership Visualizer*
*Researched: 2025-03-14*
