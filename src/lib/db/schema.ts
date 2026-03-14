import {
  pgTable,
  text,
  integer,
  serial,
  timestamp,
  decimal,
  pgSchema,
  unique,
  index,
} from 'drizzle-orm/pg-core';

// periods table - time periods for monthly data
export const periods = pgTable('periods', {
  id: text('id').primaryKey(), // Format: "YYYY-MM" e.g., "2026-03"
  month: integer('month').notNull(), // 1-12
  year: integer('year').notNull(),
  pdfFileName: text('pdf_file_name').notNull(), // Original PDF filename
  extractionVersion: text('extraction_version').notNull(), // Version of extraction logic
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  yearMonthIdx: index('periods_year_month_idx').on(table.year, table.month),
}));

// emiten table - IDX stocks
export const emiten = pgTable('emiten', {
  id: text('id').primaryKey(), // Stock code (e.g., "TLKM", "BBCA")
  name: text('name').notNull(), // Company name
  sector: text('sector'), // Sector if available
}, (table) => ({
  nameIdx: index('emiten_name_idx').on(table.name),
}));

// holders table - shareholders
export const holders = pgTable('holders', {
  id: serial('id').primaryKey(),
  canonicalName: text('canonical_name').notNull().unique(), // Normalized name for deduplication
  originalName: text('original_name').notNull(), // Name as it appears in PDF
  type: text('type').notNull(), // 'individual', 'institution', 'foreign', 'government', 'other'
}, (table) => ({
  canonicalNameIdx: index('holders_canonical_name_idx').on(table.canonicalName),
  originalNameIdx: index('holders_original_name_idx').on(table.originalName),
}));

// ownership_records table - historical ownership data
export const ownershipRecords = pgTable('ownership_records', {
  id: serial('id').primaryKey(),
  periodId: text('period_id').notNull().references(() => periods.id, { onDelete: 'restrict' }),
  emitenId: text('emiten_id').notNull().references(() => emiten.id, { onDelete: 'restrict' }),
  holderId: integer('holder_id').notNull().references(() => holders.id, { onDelete: 'restrict' }),
  rank: integer('rank').notNull(), // Position in top holders list
  sharesOwned: integer('shares_owned').notNull(), // Number of shares (using integer as bigint equivalent)
  ownershipPercentage: decimal('ownership_percentage', { precision: 5, scale: 2 }).notNull(), // Percentage with 2 decimals
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint to prevent duplicate records
  uniquePeriodEmitenHolder: unique('unique_period_emiten_holder').on(table.periodId, table.emitenId, table.holderId),
  // Indexes for time-series queries
  periodIdIdx: index('ownership_records_period_id_idx').on(table.periodId),
  emitenIdIdx: index('ownership_records_emiten_id_idx').on(table.emitenId),
  holderIdIdx: index('ownership_records_holder_id_idx').on(table.holderId),
  periodEmitenIdx: index('ownership_records_period_emiten_idx').on(table.periodId, table.emitenId),
}));

// Export the schema for use in queries
export const schema = {
  periods,
  emiten,
  holders,
  ownershipRecords,
};
