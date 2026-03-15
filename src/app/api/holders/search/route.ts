import { NextResponse } from 'next/server';
import { searchHoldersByTrigram } from '@/lib/repositories/entity-repository';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';

  // Return empty array immediately for very short queries
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const results = await searchHoldersByTrigram(q, 20);
  return NextResponse.json(results);
}
