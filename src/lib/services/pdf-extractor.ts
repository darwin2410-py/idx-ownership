// @ts-nocheck
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
 * IDX Concatenated Format Strategy
 * Handles IDX PDFs where all columns are concatenated without delimiters.
 * Format: DD-Mon-YYYY[STOCK4][ISSUER_NAME][INVESTOR_NAME][TYPE][...][SCRIPLESS][SCRIPT][TOTAL][PERCENTAGE,DD]
 * Example: 27-Feb-2026AADIADARO ANDALAN INDONESIA TbkADARO STRATEGIC INVESTMENTSCPDINDONESIA3.200.142.83003.200.142.83041,10
 */
async function tryIDXConcatenatedStrategy(
  pdfData: any
): Promise<ExtractedOwnershipRecord[]> {
  const records: ExtractedOwnershipRecord[] = [];
  const text = pdfData.text;
  const lines = text.split('\n');

  const dateLinePattern = /^(\d{2}-\w{3}-\d{4})([A-Z]{3,5})/;
  // Percentage is always X,XX or XX,XX or XXX,XX at end of line (1-100%, no % symbol)
  // Must start with [1-9] to avoid consuming trailing zeros from the shares number
  const percentageAtEnd = /([1-9]\d{0,2},\d{2})$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const dateMatch = trimmed.match(dateLinePattern);
    if (!dateMatch) continue;

    const stockCode = dateMatch[2].substring(0, 4);
    if (!/^[A-Z]{4}$/.test(stockCode)) continue;

    // Extract percentage from end of line
    let percentage: number | null = null;
    let sharesOwned: number | null = null;

    // Strategy: find the LAST Indonesian dot-grouped number in the line (= total shares)
    // Everything after that number's end position is the percentage text (e.g. "5,83" or "41,10")
    const allLargeNums = [...trimmed.matchAll(/\d{1,3}(?:\.\d{3})+/g)];
    if (allLargeNums.length > 0) {
      const lastNum = allLargeNums[allLargeNums.length - 1];
      const lastNumEnd = lastNum.index! + lastNum[0].length;
      const afterShares = trimmed.slice(lastNumEnd).trim();
      percentage = parsePercentage(afterShares);
      sharesOwned = parseShares(lastNum[0]);
    }

    // Extract investor name using the known IDX investor type codes
    // These are always 3-char codes (2 letters + D/F for domestic/foreign)
    const KNOWN_TYPE_CODES = /CPD|CPF|IDD|IDF|IBF|IBD|ISF|ISD|SCF|SCD|OTF|OTD|ACF|ACD|MIF|MID|YPD|YPF|ICF|ICD|PLF|PLD|ISI|CPI|ACI/g;
    const withoutDate = trimmed.substring(dateMatch[0].length);
    let holderName = '';

    // Find the LAST type code occurrence (actual type code, not one inside a name)
    let lastTypeIdx = -1;
    for (const m of withoutDate.matchAll(KNOWN_TYPE_CODES)) {
      if (m.index !== undefined) lastTypeIdx = m.index;
    }

    if (lastTypeIdx !== -1) {
      const beforeTypeCode = withoutDate.substring(0, lastTypeIdx);
      const tbkIdx = beforeTypeCode.indexOf('Tbk');
      if (tbkIdx !== -1) {
        holderName = beforeTypeCode.substring(tbkIdx + 3).trim();
      } else {
        holderName = beforeTypeCode.substring(Math.floor(beforeTypeCode.length / 2)).trim();
      }
    }

    if (!holderName || holderName.length < 3) {
      // Fallback: everything after Tbk, strip trailing digits
      const tbkIdx = withoutDate.indexOf('Tbk');
      if (tbkIdx !== -1) {
        holderName = withoutDate.substring(tbkIdx + 3).replace(/[\d.,\s]+$/, '').trim();
      }
    }

    // Clean holder name: remove trailing numbers/codes
    holderName = holderName.replace(/[\d.,]+$/, '').replace(/[A-Z]{3}$/, '').trim();
    holderName = cleanHolderName(holderName);

    if (holderName.length >= 3 && percentage !== null) {
      records.push({
        rank: records.length + 1,
        stockCode,
        holderName,
        sharesOwned: sharesOwned || 0,
        ownershipPercentage: percentage,
      });
    }
  }

  return records;
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
 * Fallback Strategy 1: Regex-based extraction
 * Uses regex patterns to find stock codes and associated data
 * Less strict about table structure
 */
async function tryFallbackStrategy1(
  pdfData: any
): Promise<ExtractedOwnershipRecord[]> {
  const records: ExtractedOwnershipRecord[] = [];
  const text = pdfData.text;

  // Pattern: Look for stock code followed by holder name and numbers
  // Format: ABCD Holder Name 1234567890 5.23%
  const lines = text.split('\n');
  let rank = 0;

  for (const line of lines) {
    if (!isDataRow(line)) {
      continue;
    }

    // Try to match pattern with stock code
    const stockMatch = line.match(/\b([A-Z]{4})\b/);
    if (!stockMatch) {
      continue;
    }

    const stockCode = stockMatch[1];

    // Look for percentage in the line
    const percentMatch = line.match(/(\d+[.,]\d+)%/);
    const percentage = percentMatch ? parsePercentage(percentMatch[1]) : null;

    // Look for share count (large number)
    // Match sequences of digits with optional separators
    const shareMatches = line.match(/(\d{1,3}[.,]\d{3}[.,]\d{3}|\d{7,})/g);
    let shares: number | null = null;
    if (shareMatches) {
      for (const match of shareMatches) {
        const parsed = parseShares(match);
        if (parsed !== null && parsed > 1000) {
          shares = parsed;
          break;
        }
      }
    }

    // Extract holder name (everything between stock code and numbers)
    const stockIndex = line.indexOf(stockMatch[0]);
    let holderName = '';

    // Get text after stock code
    const afterStock = line.substring(stockIndex + 4).trim();

    // Remove numbers and percentage from holder name
    holderName = afterStock
      .replace(/(\d+[.,]\d+)%/g, '')
      .replace(/\d{1,3}[.,]\d{3}[.,]\d{3}/g, '')
      .replace(/\d{7,}/g, '')
      .trim();

    if (holderName.length > 2) {
      rank++;
      records.push({
        rank,
        stockCode,
        holderName: cleanHolderName(holderName),
        sharesOwned: shares || 0,
        ownershipPercentage: percentage || 0,
      });
    }
  }

  return records;
}

/**
 * Fallback Strategy 2: Line-by-line scanning
 * Scans all lines for anything looking like a stock code
 * Extracts following words as holder name
 * Useful for malformed table structures
 */
async function tryFallbackStrategy2(
  pdfData: any
): Promise<ExtractedOwnershipRecord[]> {
  const records: ExtractedOwnershipRecord[] = [];
  const text = pdfData.text;
  const lines = text.split('\n');

  // Group lines by stock code
  const stockGroups = new Map<string, string[]>();
  let currentStock: string | null = null;

  for (const line of lines) {
    if (!isDataRow(line)) {
      continue;
    }

    // Check for stock code
    const stockMatch = line.match(/\b([A-Z]{4})\b/);
    if (stockMatch) {
      currentStock = stockMatch[1];
      if (parseStockCode(currentStock)) {
        if (!stockGroups.has(currentStock)) {
          stockGroups.set(currentStock, []);
        }
        stockGroups.get(currentStock)!.push(line);
      }
    } else if (currentStock && stockGroups.has(currentStock)) {
      // Continue adding lines to current stock
      stockGroups.get(currentStock)!.push(line);
    }
  }

  // Parse each stock group
  let rank = 0;
  for (const [stockCode, lines] of stockGroups.entries()) {
    const combinedText = lines.join(' ');

    // Extract holder name (longest text segment that's not numbers)
    const words = combinedText.split(/\s+/).filter(w => w.length > 2);
    const holderWords: string[] = [];

    for (const word of words) {
      // Skip if it's a stock code, number, or percentage
      if (parseStockCode(word)) continue;
      if (parsePercentage(word) !== null) continue;
      if (parseShares(word) !== null) continue;
      if (/^\d+$/.test(word)) continue;

      holderWords.push(word);
    }

    const holderName = holderWords.join(' ');

    // Extract percentage and shares
    const percentMatch = combinedText.match(/(\d+[.,]\d+)%/);
    const percentage = percentMatch ? parsePercentage(percentMatch[1]) : null;

    const shareMatches = combinedText.match(/(\d{1,3}[.,]\d{3}[.,]\d{3}|\d{7,})/g);
    let shares: number | null = null;
    if (shareMatches) {
      for (const match of shareMatches) {
        const parsed = parseShares(match);
        if (parsed !== null && parsed > 1000) {
          shares = parsed;
          break;
        }
      }
    }

    if (holderName.length > 2) {
      rank++;
      records.push({
        rank,
        stockCode,
        holderName: cleanHolderName(holderName),
        sharesOwned: shares || 0,
        ownershipPercentage: percentage || 0,
      });
    }
  }

  return records;
}

/**
 * Try all strategies and return the best result
 */
async function tryAllStrategies(
  pdfData: any,
  structure: TableStructure,
  filePath: string
): Promise<{ records: ExtractedOwnershipRecord[]; strategy: 'primary' | 'fallback1' | 'fallback2'; warnings: string[] }> {
  const warnings: string[] = [];

  // Try IDX concatenated format first (most common format from IDX portal)
  const idxRecords = await tryIDXConcatenatedStrategy(pdfData);
  warnings.push(`IDX concatenated strategy: ${idxRecords.length} records`);
  if (idxRecords.length >= 10) {
    return { records: idxRecords, strategy: 'primary', warnings };
  }

  // Try primary strategy
  let primaryRecords = await tryPrimaryStrategy(pdfData, structure, filePath);
  warnings.push(`Primary strategy: ${primaryRecords.length} records`);

  // If primary got good results, use it
  if (primaryRecords.length >= 10) {
    return { records: primaryRecords, strategy: 'primary', warnings };
  }

  // Try fallback 1
  let fallback1Records = await tryFallbackStrategy1(pdfData);
  warnings.push(`Fallback 1 (regex): ${fallback1Records.length} records`);

  if (fallback1Records.length > primaryRecords.length) {
    primaryRecords = fallback1Records;
  }

  // If still not enough records, try fallback 2
  if (primaryRecords.length < 10) {
    const fallback2Records = await tryFallbackStrategy2(pdfData);
    warnings.push(`Fallback 2 (line scan): ${fallback2Records.length} records`);

    if (fallback2Records.length > primaryRecords.length) {
      primaryRecords = fallback2Records;
    }
  }

  // Determine which strategy produced the final result
  let strategy: 'primary' | 'fallback1' | 'fallback2' = 'primary';
  if (primaryRecords.length === fallback1Records.length && fallback1Records.length >= 10) {
    strategy = 'fallback1';
  } else {
    const fallback2Records = await tryFallbackStrategy2(pdfData);
    if (primaryRecords.length === fallback2Records.length && fallback2Records.length >= 10) {
      strategy = 'fallback2';
    }
  }

  return { records: primaryRecords, strategy, warnings };
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

    // Try all strategies and get best result
    const { records, strategy, warnings: strategyWarnings } = await tryAllStrategies(
      pdfData,
      structure,
      filePath
    );

    warnings.push(...strategyWarnings);

    // Extract period from filename
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown.pdf';
    const period = detectPeriodFromFileName(fileName);

    const extractionTime = Date.now() - startTime;

    return {
      period: {
        period,
        pdfFileName: fileName,
        totalRecords: records.length,
        extractionMethod: strategy,
      },
      records,
      warnings,
      metadata: {
        extractionTime,
        totalPages: pdfData.numpages,
        strategy,
      },
    };
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
