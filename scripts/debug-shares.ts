import pdfParse from 'pdf-parse';
import * as fs from 'fs';

async function main() {
  const pdfPath = 'backups/ownership_one_percent_202603_2026-03-15_082031.pdf';
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  const lines = data.text.split('\n');

  // Find FTAG line
  const ftagLine = lines.find(l => l.includes('FTAG'));
  if (!ftagLine) { console.log('FTAG line not found'); return; }

  console.log('FTAG line:', ftagLine);
  console.log('Length:', ftagLine.length);

  // Check char codes at end
  const end = ftagLine.slice(-20);
  console.log('Last 20 chars:', end);
  console.log('Char codes:', [...end].map(c => c.charCodeAt(0)));

  // Test matchAll
  const pctMatch = ftagLine.match(/(\d+,\d{2})$/);
  console.log('pctMatch:', pctMatch);

  if (pctMatch) {
    const withoutPct = ftagLine.slice(0, ftagLine.length - pctMatch[0].length);
    console.log('withoutPct last 30:', withoutPct.slice(-30));
    const allLargeNums = [...withoutPct.matchAll(/\d{1,3}(?:\.\d{3})+/g)];
    console.log('All large num matches:', allLargeNums.map(m => m[0]));
    if (allLargeNums.length > 0) {
      const lastNum = allLargeNums[allLargeNums.length - 1][0];
      console.log('Last num:', lastNum);
      // Manual parseShares
      const normalized = lastNum.replace(/\./g, '');
      console.log('Normalized:', normalized, '=', parseInt(normalized));
    }
  }
}

main().catch(console.error);
