import { NextResponse } from 'next/server';
import { removeAlias } from '@/lib/repositories/entity-repository';

export const revalidate = 0;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; holderId: string }> }
) {
  const { id, holderId: holderIdStr } = await params;

  const entityId = parseInt(id, 10);
  const holderId = parseInt(holderIdStr, 10);

  if (isNaN(entityId) || isNaN(holderId)) {
    return NextResponse.json(
      { error: 'Invalid entity ID or holder ID' },
      { status: 400 }
    );
  }

  // Removes from entity_holders only — ownership_records is never touched
  await removeAlias(entityId, holderId);
  return NextResponse.json({ success: true });
}
