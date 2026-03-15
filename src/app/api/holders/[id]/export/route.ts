import { NextResponse } from 'next/server';
import { findStocksByHolder, findHolderById } from '@/lib/repositories/ownership-repository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const holderId = parseInt(id, 10);

  if (isNaN(holderId)) {
    return NextResponse.json({ error: 'Invalid holder ID' }, { status: 400 });
  }

  const [holder, holdings] = await Promise.all([
    findHolderById(holderId),
    findStocksByHolder(holderId),
  ]);

  if (!holder) {
    return NextResponse.json({ error: 'Holder not found' }, { status: 404 });
  }

  // Generate CSV with UTF-8 BOM for Excel compatibility
  const headers = ['Peringkat', 'Kode Saham', 'Nama Perusahaan', 'Jumlah Saham', '% Kepemilikan'];
  const rows = holdings.map(h => [
    h.rank.toString(),
    h.emiten.id,
    h.emiten.name,
    h.sharesOwned.toLocaleString('id-ID'),
    parseFloat(h.ownershipPercentage).toFixed(2) + '%',
  ]);

  const csvContent = [
    '\uFEFF', // UTF-8 BOM
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="portfolio-${holder.name.replace(/\s+/g, '-')}.csv"`,
    },
  });
}
