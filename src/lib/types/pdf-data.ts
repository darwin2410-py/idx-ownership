/**
 * TypeScript interfaces for PDF extraction results
 * Extracted from IDX ownership PDFs (>1% holders)
 */

/**
 * Single ownership record extracted from PDF
 * Represents one holder's ownership in a stock
 */
export interface ExtractedOwnershipRecord {
  /** Rank position in the PDF table (1-based) */
  rank: number;
  /** 4-letter IDX stock code (e.g., "TLKM", "BBCA") */
  stockCode: string;
  /** Full holder name (individual or institution) */
  holderName: string;
  /** Number of shares owned (integer) */
  sharesOwned: number;
  /** Ownership percentage (float, 0-100) */
  ownershipPercentage: number;
}

/**
 * Metadata about the PDF extraction
 * Provides context about the extraction process
 */
export interface ExtractedPeriod {
  /** Period in "YYYY-MM" format (e.g., "2026-03") */
  period: string;
  /** Original PDF filename */
  pdfFileName: string;
  /** Total number of records extracted */
  totalRecords: number;
  /** Which extraction strategy succeeded */
  extractionMethod: 'primary' | 'fallback1' | 'fallback2';
}

/**
 * Complete PDF extraction result
 * Contains all extracted records with metadata
 */
export interface PDFExtractionResult {
  /** Period metadata */
  period: ExtractedPeriod;
  /** Array of ownership records */
  records: ExtractedOwnershipRecord[];
  /** Any warnings or issues during extraction */
  warnings: string[];
  /** Extraction metadata for monitoring */
  metadata: {
    /** Extraction time in milliseconds */
    extractionTime: number;
    /** Total pages processed */
    totalPages: number;
    /** Which strategy was used */
    strategy: string;
  };
}

/**
 * Table structure detected from PDF
 * Used internally for parsing logic
 */
export interface TableStructure {
  /** Detected column headers */
  headers: string[];
  /** Line number where table data starts */
  startLine: number;
  /** Detected delimiter pattern */
  delimiter: string;
}
