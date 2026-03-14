/**
 * Main validation service for IDX ownership data
 * Validates extracted PDF data using Zod schemas
 */

import type {
  ValidationError,
  ValidationWarning,
  ValidationResult,
  DataQualityMetrics,
} from '../types/validation';
import type {
  ExtractedOwnershipRecord,
  PDFExtractionResult,
} from '../types/pdf-data';
import {
  ownershipRecordSchema,
  stockCodeSchema,
  holderNameSchema,
  sharesSchema,
  percentageSchema,
  rankSchema,
} from './schemas';

/**
 * Validate a single ownership record
 * Checks all fields and returns validation result
 */
export function validateRecord(
  record: ExtractedOwnershipRecord,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate complete record using Zod schema
  const result = ownershipRecordSchema.safeParse(record);

  if (!result.success) {
    // Convert Zod errors to ValidationErrors
    result.error.errors.forEach((err) => {
      errors.push({
        field: err.path.join('.'),
        message: err.message,
        value: err.received,
        severity: 'error',
      });
    });
  }

  // Additional checks for data quality
  if (record.ownershipPercentage > 50) {
    warnings.push({
      field: 'ownershipPercentage',
      message: 'Ownership percentage exceeds 50% - verify accuracy',
      value: record.ownershipPercentage,
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords: 1,
      validRecords: errors.length === 0 ? 1 : 0,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  };
}

/**
 * Validate ownership percentage sum
 * Checks if sum is reasonable (will be < 100% due to >1% holders only)
 */
export function validateOwnershipPercentage(
  records: ExtractedOwnershipRecord[],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Calculate sum of ownership percentages
  const ownershipSum = records.reduce(
    (sum, record) => sum + record.ownershipPercentage,
    0,
  );

  // Check for suspiciously high sum (> 100%)
  if (ownershipSum > 100) {
    warnings.push({
      field: 'ownershipPercentage',
      message: `Ownership percentage sum is ${ownershipSum.toFixed(
        2,
      )}% - exceeds 100%, possible data error`,
      value: ownershipSum,
      severity: 'warning',
    });
  } else if (ownershipSum < 80) {
    // < 80% is expected (only >1% holders shown)
    warnings.push({
      field: 'ownershipPercentage',
      message: `Ownership percentage sum is ${ownershipSum.toFixed(
        2,
      )}% - expected for >1% holders only`,
      value: ownershipSum,
      severity: 'warning',
    });
  }
  // 80% <= sum <= 100% is acceptable, no warning

  return warnings;
}

/**
 * Validate complete extraction result
 * Checks records, percentages, duplicates, and rank sequence
 */
export function validateExtractionResult(
  result: PDFExtractionResult,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let validRecords = 0;

  // Check if records array exists and has items
  if (!result.records || result.records.length === 0) {
    errors.push({
      field: 'records',
      message: 'No records found in extraction result',
      value: result.records,
      severity: 'critical',
    });

    return {
      valid: false,
      errors,
      warnings,
      summary: {
        totalRecords: 0,
        validRecords: 0,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    };
  }

  // Validate each record
  result.records.forEach((record, index) => {
    const recordResult = validateRecord(record);

    if (recordResult.valid) {
      validRecords++;
    } else {
      errors.push(...recordResult.errors);
      warnings.push(...recordResult.warnings);
    }
  });

  // Check ownership percentage sum
  const percentageWarnings = validateOwnershipPercentage(result.records);
  warnings.push(...percentageWarnings);

  // Check for duplicate (stock, holder) combinations
  const combinations = new Map<string, number[]>();
  result.records.forEach((record, index) => {
    const key = `${record.stockCode}-${record.holderName}`;
    if (!combinations.has(key)) {
      combinations.set(key, []);
    }
    combinations.get(key)!.push(index);
  });

  combinations.forEach((indices, key) => {
    if (indices.length > 1) {
      warnings.push({
        field: 'duplicate',
        message: `Duplicate stock-holder combination found: ${key} at rows ${indices.join(
          ', ',
        )}`,
        value: key,
        severity: 'warning',
      });
    }
  });

  // Check rank sequence (should be 1, 2, 3... without gaps)
  const ranks = result.records.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      warnings.push({
        field: 'rank',
        message: `Rank sequence issue: expected ${i + 1}, found ${ranks[i]}`,
        value: ranks[i],
        severity: 'warning',
      });
      break; // Only report first gap
    }
  }

  return {
    valid: errors.filter((e) => e.severity === 'critical').length === 0,
    errors,
    warnings,
    summary: {
      totalRecords: result.records.length,
      validRecords,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  };
}

/**
 * Build validation summary from multiple validation runs
 * Aggregates metrics for monitoring
 */
export function buildValidationSummary(
  results: ValidationResult[],
): DataQualityMetrics {
  const totalRows = results.reduce((sum, r) => sum + r.summary.totalRecords, 0);
  const validRows = results.reduce((sum, r) => sum + r.summary.validRecords, 0);
  const errorRows = results.reduce((sum, r) => sum + r.summary.errorCount, 0);
  const warningCount = results.reduce(
    (sum, r) => sum + r.summary.warningCount,
    0,
  );

  return {
    extractionTime: 0, // Will be set by caller
    totalRows,
    validRows,
    errorRows,
    warningCount,
    ownershipSum: 0, // Will be calculated from actual data
    extractionMethod: 'unknown', // Will be set by caller
  };
}

/**
 * Create a validation error with proper structure
 */
export function createValidationError(
  field: string,
  message: string,
  value: any,
): ValidationError {
  return {
    field,
    message,
    value,
    severity: 'error',
  };
}

/**
 * Create a validation warning with proper structure
 */
export function createValidationWarning(
  field: string,
  message: string,
  value: any,
): ValidationWarning {
  return {
    field,
    message,
    value,
    severity: 'warning',
  };
}

/**
 * Determine if error is critical (should stop import)
 */
export function isCriticalError(error: ValidationError): boolean {
  if (error.severity === 'critical') {
    return true;
  }

  // Stock code format errors are critical
  if (error.field === 'stockCode') {
    return true;
  }

  // Missing required fields are critical
  if (error.message.includes('required')) {
    return true;
  }

  // Invalid data types are critical
  if (error.message.includes('must be a')) {
    return true;
  }

  // Out-of-range values are warnings, not critical
  return false;
}
