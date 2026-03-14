#!/usr/bin/env tsx
/**
 * Manual Import CLI Script
 * Imports IDX ownership data from PDF file
 *
 * Usage:
 *   npm run import-pdf -- <path-to-pdf> [options]
 *
 * Options:
 *   --dry-run: Validate and extract but don't insert
 *   --force: Update existing records
 *   --skip-validation: Skip validation checks (not recommended)
 *
 * Example:
 *   npm run import-pdf -- ./ownership_one_percent_202603.pdf
 *   npm run import-pdf -- ./data.pdf --dry-run
 *   npm run import-pdf -- ./data.pdf --force
 */

import { importFromPDF } from '../src/lib/services/import-service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI options interface
 */
interface CLIOptions {
  dryRun: boolean;
  force: boolean;
  skipValidation: boolean;
}

/**
 * Parse command line arguments
 */
function parseOptions(args: string[]): { filePath: string; options: CLIOptions } {
  const options: CLIOptions = {
    dryRun: false,
    force: false,
    skipValidation: false,
  };

  let filePath = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--skip-validation':
        options.skipValidation = true;
        break;
      default:
        if (!arg.startsWith('--')) {
          filePath = arg;
        }
        break;
    }
  }

  return { filePath, options };
}

/**
 * Validate file exists
 */
function validateFilePath(filePath: string): void {
  if (!filePath) {
    console.error('✗ Error: No PDF file specified');
    console.error('\nUsage: npm run import-pdf -- <path-to-pdf> [options]');
    console.error('\nOptions:');
    console.error('  --dry-run           Validate and extract but don\'t insert');
    console.error('  --force             Update existing records');
    console.error('  --skip-validation   Skip validation checks (not recommended)');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`✗ Error: File not found: ${filePath}`);
    process.exit(1);
  }

  if (!filePath.toLowerCase().endsWith('.pdf')) {
    console.error(`✗ Error: File must be a PDF: ${filePath}`);
    process.exit(1);
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}.${Math.floor((ms % 1000) / 10)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Main import function
 */
async function main() {
  console.log('\n=== IDX Ownership Data Import ===\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const { filePath, options } = parseOptions(args);

  // Validate file path
  validateFilePath(filePath);

  const absolutePath = path.resolve(filePath);
  const fileName = path.basename(absolutePath);

  // Display import configuration
  console.log(`Import Configuration:`);
  console.log(`  File: ${fileName}`);
  console.log(`  Path: ${absolutePath}`);
  console.log(`  Options:`);
  console.log(`    Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log(`    Force Update: ${options.force ? 'Yes' : 'No'}`);
  console.log(`    Skip Validation: ${options.skipValidation ? 'Yes' : 'No'}`);
  console.log('');

  // Start import
  console.log(`✓ Starting import from ${fileName}`);

  try {
    const result = await importFromPDF(absolutePath, {
      dryRun: options.dryRun,
      forceUpdate: options.force,
      skipValidation: options.skipValidation,
    });

    console.log('');

    // Display results
    if (result.success) {
      console.log(`✓ Import successful!`);
      console.log('');
      console.log(`Results:`);
      console.log(`  Records Imported: ${result.recordsImported}`);
      console.log(`  Period ID: ${result.periodId}`);
      console.log(`  Duration: ${formatDuration(result.extractionTime)}`);
      console.log(`  Dry Run: ${result.dryRun ? 'Yes' : 'No'}`);

      if (result.warnings.length > 0) {
        console.log('');
        console.log(`Warnings (${result.warnings.length}):`);
        result.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      }

      console.log('');
      console.log(`✓ Import complete!`);

      // Exit with success code
      process.exit(0);
    } else {
      console.error(`✗ Import failed!`);
      console.error('');

      if (result.errors.length > 0) {
        console.error(`Errors (${result.errors.length}):`);
        result.errors.forEach((error, index) => {
          console.error(`  ${index + 1}. ${error}`);
        });
      }

      console.error('');

      // Exit with error code
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error(`✗ Fatal error during import:`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof Error && error.stack) {
      console.error('');
      console.error(`Stack trace:`);
      console.error(error.stack);
    }

    console.error('');
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
