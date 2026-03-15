import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createEntity, findAllEntities } from '@/lib/repositories/entity-repository';

export const revalidate = 0;

const CreateEntitySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const entities = await findAllEntities();
  return NextResponse.json(entities);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreateEntitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { name, description } = parsed.data;

  try {
    const entity = await createEntity(name, description);
    return NextResponse.json(entity, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code === '23505') {
      return NextResponse.json(
        { error: 'CONFLICT', message: 'Entity dengan nama ini sudah ada' },
        { status: 409 }
      );
    }
    throw err;
  }
}
