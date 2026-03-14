/**
 * PDF Extraction Service
 * Extracts IDX ownership data from monthly PDF files using pdf-parse
 * Primary strategy with fallback support
 */

import pdfParse from 'pdf-parse';
import type {
  ExtractedOwnershipRecord,
  ExtractedPeriod,
  PDFExtractionResult,
  TableStructure,
} from '../types/pdf-data';
import {
  detectTableStructure,
  parseStockCode,
  parsePercentage,
  parseShares,
  cleanHolderName,
  isDataRow,
} from '../utils/pdf-utils';

/**
 * Extract period from filename format: "ownership_one_percent_YYYYMM.pdf"
 * Returns "YYYY-MM" format
 */
export function detectPeriodFromFileName(fileName: string): string {
  // Try to match pattern: ownership_one_percent_YYYYMM.pdf
  const match = fileName.match(/(\d{4})(\d{2})/);

  if (match && match[1] && match[2]) {
    return `${match[1]}-${match[2]}`;
  }

  // Default to current date if pattern not found
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Primary extraction strategy
 * Parses PDF using detected table structure
 */
async function tryPrimaryStrategy(
  pdfData: any,
  structure: TableStructure,
  fileName: string
): Promise<ExtractedOwnershipRecord[]> {
  const records: ExtractedOwnershipRecord[] = [];
  const text = pdfData.text;

  const lines = text.split('\n');
  let currentStockCode: string | null = null;
  let rank = 0;

  // Start from the detected start line
  for (let i = structure.startLine; i < lines.length; i++) {
    const line = lines[i];

    // Skip non-data rows
    if (!isDataRow(line)) {
      continue;
    }

    // Try to parse the line based on delimiter
    let fields: string[];

    switch (structure.delimiter) {
      case 'pipe':
        fields = line.split('|').map(f => f.trim()).filter(f => f);
        break;
      case 'tab':
        fields = line.split('\t').map(f => f.trim()).filter(f => f);
        break;
      default: // whitespace
        // Split by multiple spaces
        fields = line.split(/\s{2,}/).map(f => f.trim()).filter(f => f);
        break;
    }

    // Need at least 3 fields to be a valid row
    if (fields.length < 3) {
      continue;
    }

    // Try to extract data from fields
    // Common IDX PDF format: Rank | StockCode | HolderName | Shares | Percentage

    let parsedRank: number | null = null;
    let parsedStockCode: string | null = null;
    let parsedHolderName: string | null = null;
    let parsedShares: number | null = null;
    let parsedPercentage: number | null = null;

    // Try to identify each field
    for (let j = 0; j < fields.length; j++) {
      const field = fields[j];

      // Check for stock code
      const stockCode = parseStockCode(field);
      if (stockCode && !parsedStockCode) {
        parsedStockCode = stockCode;
        continue;
      }

      // Check for percentage
      const percentage = parsePercentage(field);
      if (percentage !== null && parsedPercentage === null) {
        parsedPercentage = percentage;
        continue;
      }

      // Check for shares (large numbers)
      const shares = parseShares(field);
      if (shares !== null && parsedShares === null && shares > 1000) {
        parsedShares = shares;
        continue;
      }

      // Check for rank (small number)
      const rankNum = parseInt(field, 10);
      if (!isNaN(rankNum) && rankNum > 0 && rankNum < 10000 && parsedRank === null) {
        parsedRank = rankNum;
        continue;
      }

      // Everything else is likely part of holder name
      if (!parsedHolderName && field.length > 2) {
        parsedHolderName = field;
      }
    }

    // If we couldn't parse properly, try alternative approach
    if (!parsedStockCode || !parsedHolderName) {
      // Stock code might be embedded in text
      const stockMatch = line.match(/\b[A-Z]{4}\b/);
      if (stockMatch) {
        parsedStockCode = stockMatch[0];
      }

      // Holder name is usually the longest text field
      const longFields = fields.filter(f => f.length > 10);
      if (longFields.length > 0) {
        parsedHolderName = longFields[0];
      }
    }

    // Validate we have minimum required data
    if (parsedStockCode && parsedHolderName) {
      rank++;

      records.push({
        rank: parsedRank || rank,
        stockCode: parsedStockCode,
        holderName: cleanHolderName(parsedHolderName),
        sharesOwned: parsedShares || 0,
        ownershipPercentage: parsedPercentage || 0,
      });

      currentStockCode = parsedStockCode;
    }
  }

  return records;
}

/**
 * Main PDF extraction function
 * Orchestrates extraction with fallback strategies
 */
export async function extractFromPDF(filePath: string): Promise<PDFExtractionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  try {
    // Read PDF file
    const buffer = require('fs').readFileSync(filePath);
    const pdfData = await pdfParse(buffer);

    // Detect table structure
    const structure = detectTableStructure(pdfData.text);

    warnings.push(`Detected ${pdfData.numpages} pages`);
    warnings.push(`Table structure: ${structure.delimiter} delimited`);

    // Try primary strategy
    let records = await tryPrimaryStrategy(pdfData, structure, filePath);

    // Check if primary strategy was successful
    if (records.length < 10) {
      warnings.push(`Primary strategy found only ${records.length} records, may need refinement`);
    }

    // Extract period from filename
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown.pdf';
    const period = detectPeriodFromFileName(fileName);

    // Determine which strategy was used
    const extractionMethod: 'primary' | 'fallback1' | 'fallback2' = 'primary';

    const extractionTime = Date.now() - startTime;

    return {
      period: {
        period,
        pdfFileName: fileName,
        totalRecords: records.length,
        extractionMethod,
      },
      records,
      warnings,
      metadata: {
        extractionTime,
        totalPages: pdfData.numpages,
        strategy: extractionMethod,
      },
    };
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
