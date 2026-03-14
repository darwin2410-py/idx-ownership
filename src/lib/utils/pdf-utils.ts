/**
 * Utility functions for PDF data parsing
 * Handles Indonesian number formats and IDX stock codes
 */

import type { TableStructure } from '../types/pdf-data';

/**
 * Analyze raw PDF text to identify table structure
 * Tries multiple patterns: pipe-separated, whitespace, tab-aligned
 */
export function detectTableStructure(text: string): TableStructure {
  const lines = text.split('\n').filter(line => line.trim());

  // Common header patterns in IDX PDFs
  const headerPatterns = [
    /No\s*Kode\s*Emiten\s*Nama\s*Pemegang\s*Saham\s*Jumlah\s*Persentase/i,
    /No\.\s*Kode\s*Nama\s*Pemegang\s*Saham/i,
    /Rank\s*Stock\s*Holder\s*Shares/i,
    /^\s*No\s*\|/,
  ];

  let startLine = 0;
  let delimiter = 'whitespace';
  const headers: string[] = ['No', 'Kode', 'Nama', 'Jumlah', 'Persentase'];

  // Try to find header line
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i];

    // Check for pipe-separated format
    if (line.includes('|')) {
      const potentialHeaders = line.split('|').map(h => h.trim()).filter(h => h);
      if (potentialHeaders.length >= 4) {
        delimiter = 'pipe';
        startLine = i + 1;
        headers.length = 0;
        headers.push(...potentialHeaders);
        break;
      }
    }

    // Check for tab-separated format
    if (line.includes('\t')) {
      const potentialHeaders = line.split('\t').map(h => h.trim()).filter(h => h);
      if (potentialHeaders.length >= 4) {
        delimiter = 'tab';
        startLine = i + 1;
        headers.length = 0;
        headers.push(...potentialHeaders);
        break;
      }
    }

    // Check for whitespace-separated format
    for (const pattern of headerPatterns) {
      if (pattern.test(line)) {
        delimiter = 'whitespace';
        startLine = i + 1;
        break;
      }
    }

    if (startLine > 0) break;
  }

  // If no header found, assume data starts at line 0
  if (startLine === 0 && lines.length > 0) {
    startLine = 0;
  }

  return { headers, startLine, delimiter };
}

/**
 * Validate and parse IDX stock code format
 * Must be exactly 4 uppercase letters
 */
export function parseStockCode(text: string): string | null {
  const cleaned = text.trim().toUpperCase();

  // Check for exactly 4 uppercase letters
  const stockCodePattern = /^[A-Z]{4}$/;

  if (stockCodePattern.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Parse percentage from various formats
 * Handles: "5.23%", "5.23", "5,23" (Indonesian comma decimal)
 */
export function parsePercentage(text: string): number | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleaned = text.trim().replace(/%/g, '').replace(/\s/g, '');

  // Handle Indonesian decimal comma: "5,23" -> "5.23"
  const normalized = cleaned.replace(/,/g, '.');

  const parsed = parseFloat(normalized);

  if (isNaN(parsed)) {
    return null;
  }

  // Validate range (0-100)
  if (parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
}

/**
 * Parse share count from Indonesian format
 * Handles: "1.000.000.000" -> 1000000000 (dots as thousand separators)
 * Also handles: "1,000,000,000" -> 1000000000 (commas as thousand separators)
 */
export function parseShares(text: string): number | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const cleaned = text.trim().replace(/\s/g, '');

  // Remove all thousand separators (both dots and commas)
  // But we need to be careful about Indonesian vs English format
  // Indonesian: 1.000.000.000 (dots are thousand separators)
  // English: 1,000,000,000 (commas are thousand separators)

  // Strategy: if there are both dots and commas, assume Indonesian format
  // (dots = thousands, comma = decimal)
  const hasBoth = cleaned.includes('.') && cleaned.includes(',');

  let normalized = cleaned;

  if (hasBoth) {
    // Indonesian format: remove dots (thousands), replace comma with dot (decimal)
    normalized = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else if (cleaned.includes(',')) {
    // Could be Indonesian (comma = thousand) or European (comma = decimal)
    // Check if followed by exactly 2-3 digits (likely decimal)
    const commaMatch = cleaned.match(/,(\d{2,3})$/);
    if (commaMatch) {
      // European format: comma is decimal
      normalized = cleaned.replace(/,/g, '.');
    } else {
      // Indonesian format: comma is thousand separator
      normalized = cleaned.replace(/,/g, '');
    }
  } else {
    // Dots only: remove them (thousand separators)
    normalized = cleaned.replace(/\./g, '');
  }

  const parsed = parseInt(normalized, 10);

  if (isNaN(parsed)) {
    return null;
  }

  // Validate: must be positive integer
  if (parsed <= 0) {
    return null;
  }

  return parsed;
}

/**
 * Clean and normalize holder name
 * Removes extra spaces, normalizes common variations
 */
export function cleanHolderName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  let cleaned = name.trim();

  // Remove extra spaces between words
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Normalize common variations
  // PT vs Pt, Tbk vs TBK, etc.
  cleaned = cleaned.replace(/\bPT\b/gi, 'PT');
  cleaned = cleaned.replace(/\bTBK\b/gi, 'Tbk');

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;\s]+$/, '');

  return cleaned;
}

/**
 * Check if a line looks like a data row (not header/footer)
 */
export function isDataRow(line: string): boolean {
  const trimmed = line.trim();

  // Skip empty lines
  if (!trimmed) {
    return false;
  }

  // Skip obvious headers/footers
  const skipPatterns = [
    /^No\s|^Rank\s|^Kode\s|^Stock\s/i,
    /^Halaman|^Page|^Laman/i,
    /^Total\s|^Jumlah\s|^SUM/i,
    /^\-+$|^=+$/,  // Separator lines
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract stock code from a line using various patterns
 */
export function extractStockCodeFromLine(line: string): string | null {
  // Pattern 1: 4 consecutive uppercase letters (stock code)
  const stockPattern = /\b[A-Z]{4}\b/;
  const match = line.match(stockPattern);

  if (match) {
    const candidate = match[0];
    // Validate it's a real stock code (not just any 4-letter word)
    if (parseStockCode(candidate)) {
      return candidate;
    }
  }

  return null;
}
