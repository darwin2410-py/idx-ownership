import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalComparison } from '@/lib/repositories/ownership-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      return NextResponse.json(
        { error: 'Period parameter required' },
        { status: 400 }
      );
    }

    const comparison = await getHistoricalComparison(code, period);

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error fetching comparison:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison data' },
      { status: 500 }
    );
  }
}
