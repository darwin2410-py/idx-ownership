/**
 * TypeScript types for validation results
 * Used for data quality validation of extracted IDX ownership data
 */

/**
 * Critical validation error that should stop import
 * Indicates data integrity issues that would corrupt the database
 */
export interface ValidationError {
  /** Which field failed validation */
  field: string;
  /** Human-readable error message */
  message: string;
  /** The invalid value that failed validation */
  value: any;
  /** Error severity level */
  severity: 'error' | 'critical';
}

/**
 * Non-critical validation warning
 * Issues to log but not stop the import process
 */
export interface ValidationWarning {
  /** Which field has the warning */
  field: string;
  /** Warning message */
  message: string;
  /** The value that triggered the warning */
  value: any;
  /** Warning severity level */
  severity: 'warning';
}

/**
 * Complete validation result for a dataset
 * Contains errors, warnings, and summary statistics
 */
export interface ValidationResult {
  /** True if no critical errors found */
  valid: boolean;
  /** Array of critical errors */
  errors: ValidationError[];
  /** Array of non-critical warnings */
  warnings: ValidationWarning[];
  /** Summary statistics for the validation */
  summary: {
    /** Total number of records validated */
    totalRecords: number;
    /** Number of records that passed validation */
    validRecords: number;
    /** Number of records with errors */
    errorCount: number;
    /** Number of warnings generated */
    warningCount: number;
  };
}

/**
 * Data quality metrics for monitoring
 * Aggregated statistics from validation runs
 */
export interface DataQualityMetrics {
  /** Extraction time in milliseconds */
  extractionTime: number;
  /** Total rows processed */
  totalRows: number;
  /** Number of valid rows */
  validRows: number;
  /** Number of rows with errors */
  errorRows: number;
  /** Total number of warnings */
  warningCount: number;
  /** Sum of ownership percentages (for checking < 100%) */
  ownershipSum: number;
  /** Which extraction method was used */
  extractionMethod: string;
}
