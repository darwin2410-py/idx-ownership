/**
 * Zod schemas for runtime validation of extracted IDX ownership data
 * Ensures data quality before database insertion
 */

import { z } from 'zod';

/**
 * Stock code schema
 * Validates IDX stock code format (exactly 4 uppercase letters)
 */
export const stockCodeSchema = z
  .string({
    required_error: 'Stock code is required',
    invalid_type_error: 'Stock code must be a string',
  })
  .length(4, 'Stock code must be exactly 4 characters')
  .regex(/^[A-Z]{4}$/, 'Invalid stock code format (must be 4 uppercase letters)')
  .transform((val) => val.toUpperCase());

/**
 * Holder name schema
 * Validates holder name is not empty and meets minimum length
 */
export const holderNameSchema = z
  .string({
    required_error: 'Holder name is required',
    invalid_type_error: 'Holder name must be a string',
  })
  .trim()
  .min(2, 'Holder name must be at least 2 characters')
  .transform((val) => val.replace(/\s+/g, ' ').trim()); // Normalize whitespace

/**
 * Shares schema
 * Validates shares owned is a positive integer
 */
export const sharesSchema = z
  .number({
    required_error: 'Shares are required',
    invalid_type_error: 'Shares must be a number',
  })
  .positive('Shares must be a positive number')
  .int('Shares must be an integer (no decimals)')
  .transform((val) => Math.floor(val)); // Ensure integer

/**
 * Percentage schema
 * Validates ownership percentage is between 0 and 100
 */
export const percentageSchema = z
  .number({
    required_error: 'Ownership percentage is required',
    invalid_type_error: 'Ownership percentage must be a number',
  })
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage must be at most 100')
  .transform((val) => Math.round(val * 100) / 100); // Round to 2 decimal places

/**
 * Rank schema
 * Validates rank is a positive integer
 */
export const rankSchema = z
  .number({
    required_error: 'Rank is required',
    invalid_type_error: 'Rank must be a number',
  })
  .positive('Rank must be a positive number')
  .int('Rank must be an integer')
  .transform((val) => Math.floor(val)); // Ensure integer

/**
 * Single ownership record schema
 * Combines all field schemas for complete validation
 */
export const ownershipRecordSchema = z.object({
  rank: rankSchema,
  stockCode: stockCodeSchema,
  holderName: holderNameSchema,
  sharesOwned: sharesSchema,
  ownershipPercentage: percentageSchema,
});

/**
 * Period schema
 * Validates period format (YYYY-MM)
 */
export const periodSchema = z
  .string({
    required_error: 'Period is required',
    invalid_type_error: 'Period must be a string',
  })
  .regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format');

/**
 * Extraction result schema
 * Validates complete PDF extraction result
 */
export const extractionResultSchema = z.object({
  period: z.object({
    period: periodSchema,
    pdfFileName: z.string().min(1, 'PDF filename is required'),
    totalRecords: z.number().int().nonnegative(),
    extractionMethod: z.enum(['primary', 'fallback1', 'fallback2']),
  }),
  records: z.array(ownershipRecordSchema).min(1, 'At least one record is required'),
  warnings: z.array(z.string()),
  metadata: z.object({
    extractionTime: z.number().nonnegative(),
    totalPages: z.number().int().positive(),
    strategy: z.string(),
  }),
});

/**
 * Type exports inferred from schemas
 */
export type StockCode = z.infer<typeof stockCodeSchema>;
export type HolderName = z.infer<typeof holderNameSchema>;
export type Shares = z.infer<typeof sharesSchema>;
export type Percentage = z.infer<typeof percentageSchema>;
export type Rank = z.infer<typeof rankSchema>;
export type OwnershipRecord = z.infer<typeof ownershipRecordSchema>;
export type Period = z.infer<typeof periodSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
