import pdfParse from 'pdf-parse';
import * as fs from 'fs';

async function main() {
  const pdfPath = 'backups/ownership_one_percent_202603_2026-03-15_082031.pdf';
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);

  const lines = data.text.split('\n');
  console.log(`Total lines: ${lines.length}`);
  console.log('\n=== FIRST 50 LINES ===');
  lines.slice(0, 50).forEach((line, i) => {
    console.log(`${i}: [${line}]`);
  });

  console.log('\n=== LINES WITH NUMBERS (sample 20) ===');
  const dataLines = lines.filter(l => /\d/.test(l) && l.trim().length > 5);
  dataLines.slice(0, 20).forEach((line, i) => {
    console.log(`${i}: [${line}]`);
  });
}

main().catch(console.error);
