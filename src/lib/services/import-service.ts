/**
 * Import Service
 * Main import orchestrator for IDX ownership data
 * Handles PDF extraction, validation, and database storage with transaction safety
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PDFExtractionResult } from '../types/pdf-data';
import type { ValidationResult } from '../types/validation';
import { extractFromPDF } from './pdf-extractor';
import { validateExtractionResult } from '../validation/ownership-validator';
import {
  upsertPeriod,
  upsertEmiten,
  upsertHolder,
  upsertOwnershipRecord,
  findPeriodById,
  withTransaction,
} from '../repositories/ownership-repository';

/**
 * Import options for controlling import behavior
 */
export interface ImportOptions {
  /** Skip validation checks (not recommended) */
  skipValidation?: boolean;
  /** Update existing records instead of skipping */
  forceUpdate?: boolean;
  /** Validate and extract but don't actually insert */
  dryRun?: boolean;
}

/**
 * Import result with statistics and metadata
 */
export interface ImportResult {
  /** Whether import completed successfully */
  success: boolean;
  /** Number of records imported */
  recordsImported: number;
  /** Period ID for this import */
  periodId: string;
  /** Warnings during import */
  warnings: string[];
  /** Errors during import */
  errors: string[];
  /** Extraction time in milliseconds */
  extractionTime: number;
  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Backup raw PDF file to backups directory
 * Adds timestamp to filename for audit trail
 */
export async function backupRawPDF(filePath: string): Promise<string> {
  const backupsDir = path.join(process.cwd(), 'backups');

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Generate backup filename with timestamp
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
  const backupFileName = `${fileName.replace('.pdf', '')}_${timestamp}_${time}.pdf`;
  const backupPath = path.join(backupsDir, backupFileName);

  // Copy PDF to backups
  fs.copyFileSync(filePath, backupPath);

  return backupPath;
}

/**
 * Main import workflow from PDF file
 * Orchestrates extraction, validation, and database storage
 */
export async function importFromPDF(
  filePath: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Step 1: Backup raw PDF
    console.log(`✓ Backing up PDF...`);
    const backupPath = await backupRawPDF(filePath);
    warnings.push(`PDF backed up to: ${backupPath}`);

    // Step 2: Extract data from PDF
    console.log(`✓ Extracting data from PDF...`);
    const extractionResult = await extractFromPDF(filePath);
    warnings.push(...extractionResult.warnings);

    console.log(
      `✓ Extracted ${extractionResult.records.length} records from ${extractionResult.metadata.totalPages} pages`
    );
    console.log(`✓ Extraction method: ${extractionResult.metadata.strategy}`);

    // Step 3: Validate extraction result
    if (!options.skipValidation) {
      console.log(`✓ Validating extracted data...`);
      const validationResult = validateExtractionResult(extractionResult);

      if (!validationResult.valid) {
        const criticalErrors = validationResult.errors.filter(
          (e) => e.severity === 'critical'
        );

        if (criticalErrors.length > 0) {
          errors.push(
            `Validation failed with ${criticalErrors.length} critical errors`
          );
          criticalErrors.forEach((err) => {
            errors.push(`  - ${err.field}: ${err.message}`);
          });

          return {
            success: false,
            recordsImported: 0,
            periodId: extractionResult.period.period,
            warnings,
            errors,
            extractionTime: Date.now() - startTime,
            dryRun: options.dryRun || false,
          };
        }
      }

      console.log(
        `✓ Validated ${validationResult.summary.validRecords}/${validationResult.summary.totalRecords} records`
      );
      console.log(
        `⚠ Warnings: ${validationResult.summary.warningCount}, Errors: ${validationResult.summary.errorCount}`
      );

      // Add validation warnings to import warnings
      validationResult.warnings.forEach((warn) => {
        warnings.push(`${warn.field}: ${warn.message}`);
      });
    }

    // Step 4: Check idempotency
    const existingPeriod = await findPeriodById(extractionResult.period.period);
    if (existingPeriod && !options.forceUpdate) {
      warnings.push(
        `Period ${extractionResult.period.period} already exists. Use forceUpdate to replace.`
      );
      return {
        success: true,
        recordsImported: 0,
        periodId: extractionResult.period.period,
        warnings,
        errors,
        extractionTime: Date.now() - startTime,
        dryRun: options.dryRun || false,
      };
    }

    // Step 5: Import to database (within transaction)
    if (options.dryRun) {
      console.log(`⚠ Dry run: skipping database insertion`);
      return {
        success: true,
        recordsImported: extractionResult.records.length,
        periodId: extractionResult.period.period,
        warnings,
        errors,
        extractionTime: Date.now() - startTime,
        dryRun: true,
      };
    }

    console.log(`✓ Importing to database...`);
    let recordsImported = 0;

    await withTransaction(async (tx) => {
      // Upsert period record
      const period = await upsertPeriod(extractionResult.period);
      console.log(`✓ Period record: ${period.id}`);

      // Import each record
      for (const record of extractionResult.records) {
        // Upsert emiten
        const emiten = await upsertEmiten(record.stockCode, record.stockCode);

        // Upsert holder
        const holder = await upsertHolder(record.holderName);

        // Upsert ownership record
        await upsertOwnershipRecord(record, period.id, emiten.id, holder.id);
        recordsImported++;
      }

      console.log(`✓ Imported ${recordsImported} ownership records`);
    });

    const importTime = Date.now() - startTime;
    console.log(`✓ Import complete in ${(importTime / 1000).toFixed(2)}s`);

    return {
      success: true,
      recordsImported,
      periodId: extractionResult.period.period,
      warnings,
      errors,
      extractionTime: importTime,
      dryRun: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Import failed: ${errorMessage}`);
    console.error(`✗ Import failed: ${errorMessage}`);

    return {
      success: false,
      recordsImported: 0,
      periodId: '',
      warnings,
      errors,
      extractionTime: Date.now() - startTime,
      dryRun: options.dryRun || false,
    };
  }
}

/**
 * Import from pre-extracted JSON data
 * Useful for testing or re-processing already extracted data
 */
export async function importFromJSON(
  jsonData: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Parse JSON
    const extractionResult: PDFExtractionResult = JSON.parse(jsonData);

    // Validate extraction result
    if (!options.skipValidation) {
      const validationResult = validateExtractionResult(extractionResult);

      if (!validationResult.valid) {
        const criticalErrors = validationResult.errors.filter(
          (e) => e.severity === 'critical'
        );

        if (criticalErrors.length > 0) {
          errors.push(
            `Validation failed with ${criticalErrors.length} critical errors`
          );
          criticalErrors.forEach((err) => {
            errors.push(`  - ${err.field}: ${err.message}`);
          });

          return {
            success: false,
            recordsImported: 0,
            periodId: extractionResult.period.period,
            warnings,
            errors,
            extractionTime: Date.now() - startTime,
            dryRun: options.dryRun || false,
          };
        }
      }

      validationResult.warnings.forEach((warn) => {
        warnings.push(`${warn.field}: ${warn.message}`);
      });
    }

    // Check idempotency
    const existingPeriod = await findPeriodById(extractionResult.period.period);
    if (existingPeriod && !options.forceUpdate) {
      warnings.push(
        `Period ${extractionResult.period.period} already exists. Use forceUpdate to replace.`
      );
      return {
        success: true,
        recordsImported: 0,
        periodId: extractionResult.period.period,
        warnings,
        errors,
        extractionTime: Date.now() - startTime,
        dryRun: options.dryRun || false,
      };
    }

    // Import to database
    if (options.dryRun) {
      return {
        success: true,
        recordsImported: extractionResult.records.length,
        periodId: extractionResult.period.period,
        warnings,
        errors,
        extractionTime: Date.now() - startTime,
        dryRun: true,
      };
    }

    let recordsImported = 0;

    await withTransaction(async (tx) => {
      const period = await upsertPeriod(extractionResult.period);

      for (const record of extractionResult.records) {
        const emiten = await upsertEmiten(record.stockCode, record.stockCode);
        const holder = await upsertHolder(record.holderName);
        await upsertOwnershipRecord(record, period.id, emiten.id, holder.id);
        recordsImported++;
      }
    });

    return {
      success: true,
      recordsImported,
      periodId: extractionResult.period.period,
      warnings,
      errors,
      extractionTime: Date.now() - startTime,
      dryRun: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Import failed: ${errorMessage}`);

    return {
      success: false,
      recordsImported: 0,
      periodId: '',
      warnings,
      errors,
      extractionTime: Date.now() - startTime,
      dryRun: options.dryRun || false,
    };
  }
}

/**
 * Check if period already exists in database
 * Provides idempotency check for import operations
 */
export async function checkIdempotency(periodId: string): Promise<boolean> {
  const period = await findPeriodById(periodId);
  return period !== null;
}
