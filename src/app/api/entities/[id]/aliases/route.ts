import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  addAlias,
  findEntityByHolderId,
} from '@/lib/repositories/entity-repository';

export const revalidate = 0;

const AddAliasSchema = z.object({
  holderId: z.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entityId = parseInt(id, 10);

  if (isNaN(entityId)) {
    return NextResponse.json({ error: 'Invalid entity ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AddAliasSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { holderId } = parsed.data;

  try {
    await addAlias(entityId, holderId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code === '23505') {
      // Holder is already assigned to another entity — look up which one
      const owner = await findEntityByHolderId(holderId);
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: `Holder ini sudah terdaftar di entity "${owner?.name ?? 'unknown'}"`,
          ownerEntityId: owner?.id ?? null,
          ownerEntityName: owner?.name ?? null,
        },
        { status: 409 }
      );
    }
    throw err;
  }
}
