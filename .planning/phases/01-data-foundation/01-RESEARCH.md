# Phase 1: Data Foundation - Research

**Researched:** 2026-03-14
**Domain:** PDF Extraction, PostgreSQL Schema Design, Data Validation Pipeline
**Confidence:** MEDIUM (Web search rate-limited; based on training data)

## Summary

Phase 1 establishes the data infrastructure for extracting IDX ownership data from monthly PDFs and storing it in PostgreSQL with full historical support. The primary challenge is reliable PDF extraction with proper fallback strategies, given that IDX only publishes holders with >1% ownership (sum will not equal 100%).

**Primary recommendation:** Use pdf-parse for extraction with multiple fallback strategies, Drizzle ORM for schema management with composite primary keys for historical tracking, and Zod for runtime validation. Implement append-only storage with transaction rollback on critical errors.

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### PDF Extraction Strategy
- **Library:** pdf-parse (simpler API, good for table extraction, Node.js compatible)
- **Validation timing:** Validate after extraction (separate step for cleaner separation)
- **Table structure:** Auto-detect structure from PDF (don't hardcode positions)
- **Fallback method:** Yes, multiple strategies (try next method if one fails)
- **Data source priority:** PDF is primary, IDX API is exploratory

#### Historical Storage
- **Storage method:** Append-only (never delete historical records)
- **Version tracking:** Yes, track which extraction version produced each record (for debugging)
- **Primary key:** Composite key with period (same holder-stock combination can exist across multiple periods)
- **Retention:** Keep all history (no time limit, add later if needed)

#### Error Handling
- **Severity levels:** Critical = stop entire import, Warning = log but continue
- **Recovery method:** Rollback on error (all-or-nothing transaction)
- **Validation strictness:** Warnings only — ownership sum will NOT equal 100% because data only includes >1% holders
- **Alerts:** Log only (no active notifications)

#### Update Workflow
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | PDF Extraction Pipeline - Extract ownership data from IDX monthly PDF files | PDF Extraction Strategy, Fallback Methods, Error Handling |
| DATA-02 | Database Schema Design - Design normalized schema with historical support | Database Schema Design, Composite Keys, Migration Strategy |
| DATA-03 | Data Quality Validation - Implement validation checks for extracted data integrity | Validation Architecture, Zod Schemas, Edge Case Handling |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **pdf-parse** | ^1.1.1 | Extract text content from PDFs | Simple API, Node.js native, no heavy dependencies, good for table extraction |
| **drizzle-orm** | ^0.36.0 | TypeScript ORM for PostgreSQL | Type-safe schema, excellent migrations, minimal runtime overhead, Vercel-native |
| **@vercel/postgres** | ^0.9.0 | Vercel Postgres driver | Zero-config connection pooling, edge-compatible, built for serverless |
| **zod** | ^3.24.0 | Runtime validation schemas | TypeScript-first, great error messages, composable schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **pdf2json** | ^3.0.0 | Alternative PDF parsing (fallback) | When pdf-parse fails on complex table structures |
| **date-fns** | ^4.1.0 | Date manipulation | Parsing period strings (e.g., "2026-03") and formatting |
| **pino** | ^9.6.0 | Structured logging | Production-grade logging with log levels for severity tracking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-parse | pdfjs-dist (Mozilla) | pdfjs-dist more powerful but heavier; pdf-parse simpler for text extraction |
| pdf-parse | pdf-table-extractor | Specialized for tables but less maintained; pdf-parse + custom parsing more flexible |
| Drizzle ORM | Prisma | Prisma has more features but heavier; Drizzle better for serverless/edge |
| Zod | Yup | Zod has better TypeScript inference; Yup more mature but less type-safe |

**Installation:**
```bash
npm install pdf-parse drizzle-orm @vercel/postgres zod date-fns pino
npm install -D drizzle-kit @types/pino
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema definitions
│   │   ├── migrations/        # Migration SQL files
│   │   └── client.ts          # Database client singleton
│   ├── services/
│   │   ├── pdf-extractor.ts   # PDF extraction logic with fallbacks
│   │   ├── data-validator.ts  # Zod validation schemas
│   │   └── import-service.ts  # Orchestrates extraction → validation → storage
│   ├── repositories/
│   │   ├── emiten.repo.ts     # Emiten data access
│   │   ├── holders.repo.ts    # Holder data access
│   │   └── ownership.repo.ts  # Ownership records data access
│   └── utils/
│       ├── logger.ts          # Pino configuration
│       └── errors.ts          # Custom error classes
├── app/
│   └── api/
│       └── import/
│           └── route.ts       # POST endpoint for manual PDF import
└── types/
    └── ownership.ts           # TypeScript types (derived from Zod schemas)
```

### Pattern 1: Repository Pattern for Data Access
**What:** Separate data access logic from business logic
**When to use:** All database operations
**Example:**
```typescript
// src/lib/repositories/ownership.repo.ts
import { db } from '$lib/db/client';
import { ownershipRecords, periods, holders, emiten } from '$lib/db/schema';
import { and, eq } from 'drizzle-orm';

export class OwnershipRepository {
  async findExistingHolder(holderName: string) {
    const [holder] = await db
      .select()
      .from(holders)
      .where(eq(holders.name, holderName))
      .limit(1);
    return holder;
  }

  async findExistingEmiten(code: string) {
    const [emiten] = await db
      .select()
      .from(emiten)
      .where(eq(emiten.code, code))
      .limit(1);
    return emiten;
  }

  async insertOwnershipRecord(data: {
    periodId: number;
    holderId: number;
    emitenId: number;
    sharesOwned: number;
    ownershipPercentage: number;
    rank: number;
  }) {
    const [record] = await db
      .insert(ownershipRecords)
      .values(data)
      .returning();
    return record;
  }

  async findExistingRecord(periodId: number, holderId: number, emitenId: number) {
    const [record] = await db
      .select()
      .from(ownershipRecords)
      .where(
        and(
          eq(ownershipRecords.periodId, periodId),
          eq(ownershipRecords.holderId, holderId),
          eq(ownershipRecords.emitenId, emitenId)
        )
      )
      .limit(1);
    return record;
  }
}
```

### Pattern 2: Fallback Strategy Pattern for PDF Extraction
**What:** Try multiple extraction strategies in sequence until one succeeds
**When to use:** PDF extraction where format may vary
**Example:**
```typescript
// src/lib/services/pdf-extractor.ts
import pdf from 'pdf-parse';
import PDFParser from 'pdf2json';

type ExtractStrategy = (buffer: Buffer) => Promise<ExtractedData[]>;

export class PDFExtractor {
  private strategies: ExtractStrategy[] = [
    this.extractWithPdfParse.bind(this),
    this.extractWithPdf2Json.bind(this),
    this.extractWithRegexFallback.bind(this)
  ];

  async extract(buffer: Buffer): Promise<ExtractedData[]> {
    const lastError = new Error('All extraction strategies failed');

    for (const strategy of this.strategies) {
      try {
        const result = await strategy(buffer);
        if (result.length > 0) {
          return result;
        }
      } catch (error) {
        lastError cause = error;
        logger.warn({ strategy: strategy.name, error }, 'Strategy failed, trying next');
      }
    }

    throw lastError;
  }

  private async extractWithPdfParse(buffer: Buffer): Promise<ExtractedData[]> {
    const data = await pdf(buffer);
    // Parse text content into structured data
    // ...
  }

  private async extractWithPdf2Json(buffer: Buffer): Promise<ExtractedData[]> {
    // Alternative extraction using pdf2json
    // ...
  }

  private async extractWithRegexFallback(buffer: Buffer): Promise<ExtractedData[]> {
    // Last resort: regex pattern matching
    // ...
  }
}
```

### Pattern 3: Transaction Rollback on Error
**What:** Wrap database operations in transaction, rollback on any error
**When to use:** Multi-step operations where all-or-nothing is required
**Example:**
```typescript
// src/lib/services/import-service.ts
import { db } from '$lib/db/client';
import { ExtractionError, ValidationError } from '$lib/utils/errors';

export class ImportService {
  async importPDF(buffer: Buffer): Promise<ImportResult> {
    const transaction = db.transaction(async (tx) => {
      try {
        // Step 1: Extract data from PDF
        const rawData = await this.extractor.extract(buffer);
        logger.info({ rows: rawData.length }, 'Extraction successful');

        // Step 2: Validate extracted data
        const validationResult = this.validator.validate(rawData);
        if (!validationResult.success) {
          throw new ValidationError('Validation failed', validationResult.errors);
        }

        // Step 3: Store in database
        const period = await this.ensurePeriod(tx, rawData.period);
        const records = await this.storeOwnershipData(tx, period.id, validationResult.data);

        return { periodId: period.id, recordsImported: records.length };
      } catch (error) {
        logger.error({ error }, 'Import failed, transaction will rollback');
        throw error; // This triggers automatic rollback
      }
    });

    return transaction();
  }

  private async ensurePeriod(tx: any, periodStr: string) {
    // Check if period exists, create if not
    // Use tx instead of db for transactional consistency
  }
}
```

### Anti-Patterns to Avoid
- **Hardcoding PDF positions:** IDX may change PDF format; use auto-detection
- **Deleting historical data:** Use append-only pattern for audit trail
- **Silent validation failures:** Always log warnings; never skip validation
- **N+1 queries:** Use batch inserts for ownership records
- **Mixing validation with extraction:** Keep separation for cleaner error handling

## Database Schema Design

### Schema Tables

#### 1. `periods` - Time periods for ownership snapshots
```typescript
import { pgTable, serial, text, date, boolean } from 'drizzle-orm/pg-core';

export const periods = pgTable('periods', {
  id: serial('id').primaryKey(),
  period: text('period').notNull().unique(), // e.g., "2026-03"
  displayDate: text('display_date').notNull(), // e.g., "Maret 2026"
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isLatest: boolean('is_latest').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Indexes:**
- Unique index on `period` for lookups
- Index on `isLatest` for quick "current period" queries

#### 2. `emiten` - IDX stock information
```typescript
export const emiten = pgTable('emiten', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g., "TLKM"
  name: text('name').notNull(), // e.g., "Telkom Indonesia (Persero) Tbk"
  sector: text('sector'), // Optional: sector classification
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Indexes:**
- Unique index on `code` for lookups
- Index on `name` for search

#### 3. `holders` - Shareholder entities
```typescript
export const holders = pgTable('holders', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // Normalized holder name
  type: text('type').notNull(), // 'individual', 'institution', 'government', 'foreign'
  canonicalName: text('canonical_name'), // For name variations that map to same entity
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Indexes:**
- Unique index on `name` for deduplication
- Index on `canonicalName` for fuzzy matching
- Index on `type` for filtering

#### 4. `ownership_records` - Historical ownership data (composite primary key)
```typescript
import { pgTable, serial, integer, numeric, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const ownershipRecords = pgTable('ownership_records', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').notNull().references(() => periods.id),
  holderId: integer('holder_id').notNull().references(() => holders.id),
  emitenId: integer('emiten_id').notNull().references(() => emiten.id),
  sharesOwned: numeric('shares_owned', { precision: 18, scale: 0 }).notNull(),
  ownershipPercentage: numeric('ownership_percentage', { precision: 5, scale: 2 }).notNull(),
  rank: integer('rank').notNull(), // Rank by ownership % (1 = highest)
  extractionVersion: text('extraction_version').notNull(), // For debugging
  extractedAt: timestamp('extracted_at').notNull().defaultNow(),
}, (table) => ({
  // Composite key: same holder-emiten can exist across multiple periods
  compositeKey: primaryKey(table.periodId, table.holderId, table.emitenId),
}));
```

**Indexes:**
- Composite index on `(periodId, emitenId)` for "all holders for stock in period" queries
- Composite index on `(periodId, holderId)` for "all stocks for holder in period" queries
- Index on `rank` for "top holders" queries

### Migration Strategy

**Create initial migration:**
```bash
npx drizzle-kit generate:pg --config=drizzle.config.ts
```

**Migration file structure:**
```sql
-- migrations/0001_initial_schema.sql

CREATE TABLE periods (
  id SERIAL PRIMARY KEY,
  period TEXT NOT NULL UNIQUE,
  display_date TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_latest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE emiten (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sector TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE holders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  canonical_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ownership_records (
  id SERIAL PRIMARY KEY,
  period_id INTEGER NOT NULL REFERENCES periods(id),
  holder_id INTEGER NOT NULL REFERENCES holders(id),
  emiten_id INTEGER NOT NULL REFERENCES emiten(id),
  shares_owned NUMERIC(18, 0) NOT NULL,
  ownership_percentage NUMERIC(5, 2) NOT NULL,
  rank INTEGER NOT NULL,
  extraction_version TEXT NOT NULL,
  extracted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (period_id, holder_id, emiten_id)
);

CREATE INDEX idx_ownership_records_period_emiten ON ownership_records(period_id, emiten_id);
CREATE INDEX idx_ownership_records_period_holder ON ownership_records(period_id, holder_id);
CREATE INDEX idx_ownership_records_rank ON ownership_records(rank);
```

**Apply migrations:**
```typescript
// src/lib/db/migrate.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './client';

export async function runMigrations() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
  console.log('Migrations complete!');
}
```

## Validation Architecture

### What Validation Checks Will Be Implemented

#### 1. Schema Validation (Zod)
```typescript
// src/lib/services/data-validator.ts
import { z } from 'zod';

export const RawOwnershipRowSchema = z.object({
  stockCode: z.string().regex(/^[A-Z]{4,6}$/, 'Invalid IDX stock code'),
  holderName: z.string().min(1, 'Holder name required').max(200),
  sharesOwned: z.coerce.number().int().positive('Shares must be positive integer'),
  ownershipPercentage: z.coerce.number().min(0).max(100),
  rank: z.coerce.number().int().positive('Rank must be positive integer')
});

export const ExtractedDataSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
  rows: z.array(RawOwnershipRowSchema).min(1, 'No rows extracted'),
  extractionMetadata: z.object({
    totalPages: z.number().int().positive(),
    extractedAt: z.string().datetime()
  })
});

export class DataValidator {
  validate(rawData: unknown) {
    return ExtractedDataSchema.safeParse(rawData);
  }
}
```

#### 2. Data Quality Checks
- **Row count validation:** Extracted row count matches expected range (based on total pages)
- **Percentage range check:** All ownership percentages between 0-100%
- **Missing data flags:** null or empty values logged as warnings
- **Duplicate detection:** Same holder-emiten combination in same period
- **Format validation:** Stock codes match IDX format (4-6 uppercase letters)

#### 3. Business Logic Validation
- **>1% ownership acknowledgment:** Warning if sum < 100% (expected behavior)
- **Rank consistency:** Ranks are sequential starting from 1
- **Share count sanity check:** Shares owned > 0 and reasonable magnitude

### How Data Quality Will Be Measured

**Quality metrics tracked:**
```typescript
interface DataQualityMetrics {
  totalRows: number;
  validRows: number;
  warningCount: number;
  errorCount: number;
  completeness: number; // (validRows / totalRows) * 100
  extractionSuccess: boolean;
  validationErrors: ValidationError[];
}
```

**Severity levels:**
- **CRITICAL:** Stop entire import (e.g., no rows extracted, database connection failure)
- **ERROR:** Log error, continue with rollback (e.g., malformed data, foreign key constraint violation)
- **WARNING:** Log warning, continue processing (e.g., ownership sum < 100%, missing optional fields)
- **INFO:** Informational log (e.g., skipped duplicate record)

### What Constitutes "Data Ready for Frontend Consumption"

Data is ready when:
1. **Extraction successful:** At least 1 row extracted from PDF
2. **Validation passed:** No CRITICAL or ERROR level issues
3. **Database committed:** All records stored transactionally
4. **Period marked current:** `isLatest = true` set for new period
5. **Quality threshold:** Completeness >= 95% (allowing for minor warnings)

### How to Handle Edge Cases

| Edge Case | Severity | Handling |
|-----------|----------|----------|
| **Empty PDF (0 pages)** | CRITICAL | Stop import, log error, require manual review |
| **No tables detected** | CRITICAL | Try fallback strategies, if all fail: stop import |
| **Ownership sum < 100%** | WARNING | Log warning, continue (expected for >1% data) |
| **Duplicate holder-emiten in same period** | ERROR | Skip duplicate, log error, continue |
| **Invalid stock code format** | ERROR | Skip row, log error, continue |
| **Negative or zero shares** | ERROR | Skip row, log error, continue |
| **Missing holder name** | ERROR | Skip row, log error, continue |
| **Malformed PDF** | CRITICAL | Stop import, store raw PDF for analysis |
| **Database connection timeout** | CRITICAL | Stop import, retry with exponential backoff |
| **Name variations (e.g., "PT XYZ" vs "XYZ PT")** | WARNING | Use canonical name mapping, log warning |

## Error Handling & Recovery

### Severity Levels Implementation

```typescript
// src/lib/utils/errors.ts
export class CriticalError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'CriticalError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public validationErrors: z.ZodIssue[],
    public cause?: Error
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ExtractionError extends Error {
  constructor(message: string, public strategy: string, public cause?: Error) {
    super(message);
    this.name = 'ExtractionError';
  }
}

// Severity levels
export enum Severity {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}
```

### Logging Strategy

```typescript
// src/lib/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { severity: label };
    }
  },
  // In development, use pretty print
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined
});

// Usage in services:
logger.error({ error, strategy: 'pdf-parse' }, 'Extraction failed');
logger.warn({ holderName, reason: 'variation' }, 'Using canonical name');
logger.info({ rowsExtracted: 150, period: '2026-03' }, 'Extraction successful');
```

### Rollback Strategy

**All-or-nothing transaction:**
```typescript
try {
  await db.transaction(async (tx) => {
    // All database operations use 'tx' instead of 'db'
    // If any error is thrown, transaction automatically rolls back
    await insertPeriod(tx, data);
    await insertEmiten(tx, data);
    await insertHolders(tx, data);
    await insertOwnershipRecords(tx, data);
  });
} catch (error) {
  logger.error({ error }, 'Transaction rolled back');
  throw error;
}
```

**Idempotency:**
```typescript
// Check if record exists before inserting
const existing = await repository.findExistingRecord(periodId, holderId, emitenId);
if (existing) {
  logger.info({ existingId: existing.id }, 'Record exists, skipping');
  return existing; // or update if needed
}
```

## Drizzle ORM Setup

### Configuration

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL || '',
  },
} satisfies Config;
```

### Database Client

```typescript
// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL!;

// Singleton pattern
let client: postgres.Sql | null = null;

export function getDbClient() {
  if (!client) {
    client = postgres(connectionString, {
      max: 1, // For serverless/edge
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return client;
}

export const db = drizzle(getDbClient());
```

### Schema Export

```typescript
// src/lib/db/schema.ts
export * from './periods';
export * from './emiten';
export * from './holders';
export * from './ownership-records';
```

### Query Examples

**Get top holders for a stock in current period:**
```typescript
async getTopHolders(stockCode: string, limit = 10) {
  const results = await db
    .select({
      holderName: holders.name,
      sharesOwned: ownershipRecords.sharesOwned,
      percentage: ownershipRecords.ownershipPercentage,
      rank: ownershipRecords.rank
    })
    .from(ownershipRecords)
    .innerJoin(holders, eq(ownershipRecords.holderId, holders.id))
    .innerJoin(emiten, eq(ownershipRecords.emitenId, emiten.id))
    .innerJoin(periods, eq(ownershipRecords.periodId, periods.id))
    .where(and(
      eq(emiten.code, stockCode),
      eq(periods.isLatest, true)
    ))
    .orderBy(asc(ownershipRecords.rank))
    .limit(limit);

  return results;
}
```

## Testing Strategy

### Unit Tests

**Test extraction with sample PDF:**
```typescript
// src/lib/services/__tests__/pdf-extractor.test.ts
import { PDFExtractor } from '../pdf-extractor';
import { readFileSync } from 'fs';

describe('PDFExtractor', () => {
  it('should extract ownership data from sample PDF', async () => {
    const buffer = readFileSync('./ownership_one_percent_202603.pdf');
    const extractor = new PDFExtractor();

    const result = await extractor.extract(buffer);

    expect(result).toHaveLength(100); // Expected row count
    expect(result[0]).toMatchObject({
      stockCode: expect.stringMatching(/^[A-Z]{4,6}$/),
      holderName: expect.any(String),
      sharesOwned: expect.any(Number),
      ownershipPercentage: expect.any(Number),
      rank: expect.any(Number)
    });
  });

  it('should fallback to secondary strategy on primary failure', async () => {
    // Mock primary strategy to fail
    const extractor = new PDFExtractor();
    jest.spyOn(extractor, 'extractWithPdfParse').mockRejectedValue(new Error('Primary failed'));

    const buffer = readFileSync('./ownership_one_percent_202603.pdf');
    const result = await extractor.extract(buffer);

    expect(result).toBeDefined();
  });
});
```

**Test Zod validation:**
```typescript
// src/lib/services/__tests__/data-validator.test.ts
import { DataValidator, RawOwnershipRowSchema } from '../data-validator';

describe('DataValidator', () => {
  const validator = new DataValidator();

  it('should accept valid ownership row', () => {
    const validRow = {
      stockCode: 'TLKM',
      holderName: 'Government of Indonesia',
      sharesOwned: 1000000,
      ownershipPercentage: 51.5,
      rank: 1
    };

    const result = RawOwnershipRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it('should reject invalid stock code', () => {
    const invalidRow = {
      stockCode: 'ABC', // Too short
      holderName: 'Test Holder',
      sharesOwned: 1000000,
      ownershipPercentage: 10.5,
      rank: 1
    };

    const result = RawOwnershipRowSchema.safeParse(invalidRow);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain('Invalid IDX stock code');
    }
  });

  it('should warn when ownership sum < 100%', () => {
    const dataWithLowSum = {
      period: '2026-03',
      rows: [
        { stockCode: 'TLKM', holderName: 'Holder A', sharesOwned: 1000000, ownershipPercentage: 51.5, rank: 1 },
        { stockCode: 'TLKM', holderName: 'Holder B', sharesOwned: 500000, ownershipPercentage: 25.0, rank: 2 }
        // Sum = 76.5% < 100% (expected for >1% data)
      ],
      extractionMetadata: {
        totalPages: 1,
        extractedAt: new Date().toISOString()
      }
    };

    const result = validator.validate(dataWithLowSum);
    expect(result.success).toBe(true);
    // Should have warning in metrics
  });
});
```

### Integration Tests

**Test full import pipeline:**
```typescript
// src/lib/services/__tests__/import-service.integration.test.ts
import { ImportService } from '../import-service';
import { db } from '../../db/client';
import { ownershipRecords, periods } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('ImportService Integration', () => {
  let service: ImportService;

  beforeAll(() => {
    service = new ImportService();
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(ownershipRecords);
    await db.delete(periods);
  });

  it('should import PDF and store records transactionally', async () => {
    const buffer = readFileSync('./ownership_one_percent_202603.pdf');

    const result = await service.importPDF(buffer);

    expect(result.recordsImported).toBeGreaterThan(0);

    // Verify data in database
    const [period] = await db.select().from(periods).where(eq(periods.period, '2026-03'));
    expect(period).toBeDefined();

    const records = await db.select().from(ownershipRecords).where(eq(ownershipRecords.periodId, period.id));
    expect(records.length).toBe(result.recordsImported);
  });

  it('should rollback on validation error', async () => {
    // Mock PDF to return invalid data
    const buffer = Buffer.from('invalid pdf');

    await expect(service.importPDF(buffer)).rejects.toThrow();

    // Verify no data was inserted
    const records = await db.select().from(ownershipRecords);
    expect(records.length).toBe(0);
  });
});
```

### Test Data Requirements

**For testing extraction:**
- Sample PDF: `ownership_one_percent_202603.pdf` (already exists)
- Expected row count: Manually count or estimate from PDF
- Expected data format: Validate a few known records

**For testing validation:**
- Valid row examples: Normal cases
- Invalid row examples: Edge cases (bad codes, negative numbers, etc.)
- Boundary cases: 0%, 100%, empty strings, etc.

## Common Pitfalls

### Pitfall 1: Assuming Ownership Sum Equals 100%
**What goes wrong:** Validation fails because ownership percentages only sum to ~60-80%
**Why it happens:** IDX only publishes holders with >1% ownership; smaller holders are excluded
**How to avoid:** Add specific validation warning for this case; document clearly in code
**Warning signs:** Validation errors about "ownership sum too low"

### Pitfall 2: Hardcoding PDF Table Positions
**What goes wrong:** IDX changes PDF format, extraction breaks completely
**Why it happens:** Making assumptions about fixed positions/sizes
**How to avoid:** Use auto-detection and multiple fallback strategies
**Warning signs:** Extraction works for one PDF but fails on another

### Pitfall 3: Name Variations Creating Duplicate Holders
**What goes wrong:** "PT XYZ" and "XYZ PT" treated as different entities
**Why it happens:** String matching without normalization
**How to avoid:** Use canonical name mapping and fuzzy matching
**Warning signs:** Same holder appears multiple times in holder table

### Pitfall 4: N+1 Query Performance
**What goes wrong:** Importing 10,000 records takes hours
**Why it happens:** Inserting records one-by-one instead of batching
**How to avoid:** Use Drizzle batch insert with `db.insert().values()`
**Warning signs:** Import time > 1 minute for typical PDF

### Pitfall 5: Missing Transaction Rollback
**What goes wrong:** Partial data inserted when error occurs halfway
**Why it happens:** Not wrapping multi-step operations in transaction
**How to avoid:** Always use `db.transaction()` for import operations
**Warning signs:** Database has incomplete data after failed import

### Pitfall 6: Ignoring Extraction Version
**What goes wrong:** Can't debug which extraction logic produced bad data
**Why it happens:** Not tracking extraction version in records
**How to avoid:** Always store `extraction_version` with each record
**Warning signs:** Can't reproduce data quality issues

## Code Examples

### PDF Extraction with Auto-Detection

```typescript
// src/lib/services/pdf-extractor.ts
import pdf from 'pdf-parse';

interface ExtractedRow {
  stockCode: string;
  holderName: string;
  sharesOwned: number;
  ownershipPercentage: number;
  rank: number;
}

interface ExtractedData {
  period: string;
  rows: ExtractedRow[];
  extractionMetadata: {
    totalPages: number;
    extractedAt: string;
  };
}

export class PDFExtractor {
  async extract(buffer: Buffer): Promise<ExtractedData> {
    const data = await pdf(buffer);
    const text = data.text;

    // Detect period from filename or content
    const period = this.detectPeriod(text);

    // Parse table structure
    const rows = this.parseTable(text);

    return {
      period,
      rows,
      extractionMetadata: {
        totalPages: data.numpages,
        extractedAt: new Date().toISOString()
      }
    };
  }

  private detectPeriod(text: string): string {
    // Try to match "March 2026" or "2026-03" pattern
    const monthMatch = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]+ (\d{4})/i);
    if (monthMatch) {
      // Convert to YYYY-MM format
      // ...
    }

    // Fallback to current date
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private parseTable(text: string): ExtractedRow[] {
    const rows: ExtractedRow[] = [];
    const lines = text.split('\n');

    // Auto-detect table structure by looking for patterns
    let currentStockCode: string | null = null;
    let rank = 1;

    for (const line of lines) {
      // Detect stock code (4-6 uppercase letters)
      const stockMatch = line.match(/^([A-Z]{4,6})\s+/);
      if (stockMatch) {
        currentStockCode = stockMatch[1];
        rank = 1;
        continue;
      }

      // Detect holder row
      if (currentStockCode) {
        const holderMatch = line.match(/^(\d+)\.\s+(.+?)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s+(\d+(?:,\d{3})*(?:\.\d+)?)%/);
        if (holderMatch) {
          rows.push({
            stockCode: currentStockCode,
            holderName: holderMatch[2].trim(),
            sharesOwned: this.parseNumber(holderMatch[3]),
            ownershipPercentage: parseFloat(holderMatch[4].replace(',', '.')),
            rank: rank++
          });
        }
      }
    }

    return rows;
  }

  private parseNumber(numStr: string): number {
    // Parse Indonesian number format: "1.000.000,00" -> 1000000.00
    return parseInt(numStr.replace(/\./g, '').replace(',', ''));
  }
}
```

### Zod Validation Schema

```typescript
// src/lib/services/data-validator.ts
import { z } from 'zod';
import { logger } from '$lib/utils/logger';

export const RawOwnershipRowSchema = z.object({
  stockCode: z.string().min(4).max(6).regex(/^[A-Z]+$/, {
    message: 'Stock code must be 4-6 uppercase letters'
  }),
  holderName: z.string().min(1).max(200).trim(),
  sharesOwned: z.number().int().positive({
    message: 'Shares owned must be a positive integer'
  }),
  ownershipPercentage: z.number().min(0).max(100, {
    message: 'Ownership percentage must be between 0-100'
  }),
  rank: z.number().int().positive({
    message: 'Rank must be a positive integer'
  })
});

export const ExtractedDataSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, {
    message: 'Period must be in YYYY-MM format'
  }),
  rows: z.array(RawOwnershipRowSchema).min(1, {
    message: 'At least one ownership row must be extracted'
  }),
  extractionMetadata: z.object({
    totalPages: z.number().int().positive(),
    extractedAt: z.string().datetime()
  })
});

export class DataValidator {
  validate(rawData: unknown) {
    const result = ExtractedDataSchema.safeParse(rawData);

    if (!result.success) {
      logger.error({
        errors: result.error.errors,
        count: result.error.errors.length
      }, 'Validation failed');

      return {
        success: false as const,
        errors: result.error.errors,
        metrics: this.calculateMetrics(null, result.error.errors)
      };
    }

    // Additional business logic validation
    const warnings = this.checkBusinessRules(result.data);

    if (warnings.length > 0) {
      logger.warn({ warnings }, 'Business rule validation warnings');
    }

    return {
      success: true as const,
      data: result.data,
      warnings,
      metrics: this.calculateMetrics(result.data, [])
    };
  }

  private checkBusinessRules(data: z.infer<typeof ExtractedDataSchema): string[] {
    const warnings: string[] = [];

    // Check ownership sum (expected to be < 100% for >1% data)
    const totalPercentage = data.rows.reduce((sum, row) => sum + row.ownershipPercentage, 0);
    if (totalPercentage < 100) {
      warnings.push(`Ownership sum is ${totalPercentage.toFixed(2)}% (< 100% is expected for >1% data)`);
    }

    // Check for duplicates
    const uniqueKeys = new Set(data.rows.map(r => `${r.stockCode}-${r.holderName}`));
    if (uniqueKeys.size < data.rows.length) {
      warnings.push('Duplicate holder-emiten combinations detected');
    }

    return warnings;
  }

  private calculateMetrics(data: z.infer<typeof ExtractedDataSchema> | null, errors: z.ZodIssue[]) {
    return {
      totalRows: data?.rows.length || 0,
      validRows: data?.rows.length || 0,
      warningCount: data ? this.checkBusinessRules(data).length : 0,
      errorCount: errors.length,
      completeness: data ? (data.rows.length / data.rows.length) * 100 : 0,
      extractionSuccess: errors.filter(e => e.code === 'custom').length === 0
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom PDF parsing | pdf-parse with fallback strategies | 2023 | More reliable extraction |
| Direct SQL queries | Drizzle ORM with type safety | 2024 | Compile-time type checking |
| Manual validation | Zod runtime validation | 2022 | Better error messages |
| Single storage table | Normalized schema with composite keys | Ongoing | Historical analysis support |

**Deprecated/outdated:**
- **Sequelize ORM:** Heavier than Drizzle, less type-safe
- **pdfjs-dist for simple extraction:** Overkill for text extraction, use pdf-parse
- **Manual schema migrations:** Use Drizzle Kit for automatic migrations

## Open Questions

1. **IDX PDF format variations**
   - What we know: PDF format may vary across months
   - What's unclear: Exact variation patterns (layout, headers, etc.)
   - Recommendation: Implement multiple extraction strategies, test on sample PDF, collect more PDF samples

2. **Holder name normalization**
   - What we know: Name variations exist (e.g., "PT ABC" vs "ABC PT")
   - What's unclear: Extent of variations in actual IDX data
   - Recommendation: Start with exact matching, add canonical name mapping after seeing real data

3. **Performance at scale**
   - What we know: Vercel Postgres has connection limits
   - What's unclear: How many records per typical PDF, query performance
   - Recommendation: Monitor import times, add indexes proactively, consider partitioning if needed

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (built for Vite/Next.js) |
| Config file | `vitest.config.ts` (to be created in Wave 0) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Extract data from sample PDF | integration | `npm test -- pdf-extractor.test.ts` | ❌ Wave 0 |
| DATA-01 | Handle extraction failures gracefully | unit | `npm test -- pdf-extractor-fallback.test.ts` | ❌ Wave 0 |
| DATA-01 | Validate extracted row counts | unit | `npm test -- data-validator.test.ts` | ❌ Wave 0 |
| DATA-02 | Create database schema via migration | integration | `drizzle-kit push` (manual) | ❌ Wave 0 |
| DATA-02 | Enforce foreign key constraints | integration | `npm test -- schema-constraints.test.ts` | ❌ Wave 0 |
| DATA-02 | Support composite primary keys | unit | `npm test -- schema-composite-pk.test.ts` | ❌ Wave 0 |
| DATA-03 | Validate ownership percentages | unit | `npm test -- validation-percentages.test.ts` | ❌ Wave 0 |
| DATA-03 | Log validation warnings for < 100% sum | unit | `npm test -- validation-warnings.test.ts` | ❌ Wave 0 |
| DATA-03 | Flag missing/malformed data | unit | `npm test -- validation-malformed.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --run` (quick smoke test)
- **Per wave merge:** `npm test -- --coverage` (full suite with coverage)
- **Phase gate:** Full suite green with ≥80% coverage before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` - Test configuration (Vitest + @vitejs/plugin-react)
- [ ] `src/lib/services/__tests__/pdf-extractor.test.ts` - Extraction tests
- [ ] `src/lib/services/__tests__/data-validator.test.ts` - Validation tests
- [ ] `src/lib/db/__tests__/schema.test.ts` - Schema constraint tests
- [ ] `test/setup.ts` - Test setup (database mock, etc.)
- [ ] Framework install: `npm install -D vitest @vitest/ui @vitejs/plugin-react @testing-library/react @testing-library/jest-dom` - if none detected

## Sources

### Primary (HIGH confidence)
- **pdf-parse npm package** - PDF extraction library API and usage patterns (based on training data)
- **Drizzle ORM documentation** - Schema definitions, migrations, composite keys (based on training data)
- **Zod documentation** - Schema validation patterns and error handling (based on training data)
- **PostgreSQL documentation** - Composite primary keys, foreign keys, constraints (based on training data)

### Secondary (MEDIUM confidence)
- None (web search rate-limited, unable to verify with official sources)

### Tertiary (LOW confidence)
- None (web search rate-limited, all findings based on training data only)

**Note:** Research confidence is MEDIUM due to web search rate limiting. All findings are based on training data and should be validated during implementation, especially:
- IDX PDF actual format and structure
- Performance characteristics with real data volumes
- Exact error handling scenarios encountered in production

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Based on training data; web search rate-limited prevented verification
- Architecture: MEDIUM - Patterns based on best practices but not verified against current documentation
- Pitfalls: HIGH - Based on common issues documented in training data
- Database schema: HIGH - Standard PostgreSQL patterns, well-understood

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (30 days - stable libraries, but PDF format changes could invalidate findings)

**Next research steps:**
1. Examine actual IDX PDF format during implementation
2. Test extraction strategies on real PDF
3. Measure performance with actual data volumes
4. Verify Drizzle ORM patterns against current documentation when web search available
