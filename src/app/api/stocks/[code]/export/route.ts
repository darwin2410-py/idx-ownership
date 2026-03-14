import { NextRequest, NextResponse } from 'next/server';
import { findOwnershipByStockWithHolders } from '@/lib/repositories/ownership-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const stockCode = code.toUpperCase();

    // Fetch ownership data from database
    const ownershipData = await findOwnershipByStockWithHolders(stockCode);

    if (ownershipData.length === 0) {
      return NextResponse.json(
        { error: 'No ownership data found for this stock' },
        { status: 404 }
      );
    }

    // Get current date for filename
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Generate CSV content
    const headers = ['Rank', 'Holder Name', 'Holder Type', 'Shares Owned', '% Ownership'];
    const rows = ownershipData.map((record) => [
      record.rank.toString(),
      record.holderName,
      record.holderType,
      record.sharesOwned.toString(),
      record.ownershipPercentage,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create response with CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${stockCode}_ownership_${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV export' },
      { status: 500 }
    );
  }
}
