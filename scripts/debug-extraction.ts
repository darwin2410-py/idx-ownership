import pdfParse from 'pdf-parse';
import * as fs from 'fs';
import { extractFromPDF } from '../src/lib/services/pdf-extractor';

async function main() {
  const pdfPath = 'backups/ownership_one_percent_202603_2026-03-15_082031.pdf';

  console.log('Testing extraction...\n');
  const result = await extractFromPDF(pdfPath);

  console.log(`Strategy used: ${result.metadata.strategy}`);
  console.log(`Records extracted: ${result.records.length}`);
  console.log(`Warnings: ${result.warnings.join(', ')}`);

  console.log('\n=== FIRST 10 RECORDS ===');
  result.records.slice(0, 10).forEach((r, i) => {
    console.log(`${i+1}. [${r.stockCode}] ${r.holderName.substring(0, 40)} | ${r.sharesOwned} shares | ${r.ownershipPercentage}%`);
  });

  // Check percentage stats
  const zeroPct = result.records.filter(r => r.ownershipPercentage === 0);
  const nonZeroPct = result.records.filter(r => r.ownershipPercentage > 0);
  console.log(`\n=== PERCENTAGE STATS ===`);
  console.log(`Zero percentage: ${zeroPct.length}`);
  console.log(`Non-zero percentage: ${nonZeroPct.length}`);

  if (nonZeroPct.length > 0) {
    console.log('\nSample non-zero percentages:');
    nonZeroPct.slice(0, 5).forEach(r => {
      console.log(`  [${r.stockCode}] ${r.holderName.substring(0, 30)} = ${r.ownershipPercentage}%`);
    });
  }
}

main().catch(console.error);
