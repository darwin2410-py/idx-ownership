import { notFound } from 'next/navigation';
import Link from 'next/link';
import { findEntityById, findAliasesByEntityId } from '@/lib/repositories/entity-repository';
import { EntityAliasesTable } from '@/components/entity-aliases-table';

export const revalidate = 0;

export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);

  if (isNaN(id)) {
    notFound();
  }

  const entity = await findEntityById(id);

  if (!entity) {
    notFound();
  }

  const aliases = await findAliasesByEntityId(id);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-gray-500">
        <Link href="/entities" className="hover:text-blue-600 transition-colors">
          Daftar Entitas
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{entity.name}</span>
      </div>

      {/* Entity heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{entity.name}</h1>
        {entity.description && (
          <p className="text-gray-600">{entity.description}</p>
        )}
      </div>

      {/* Alias table */}
      <EntityAliasesTable entityId={id} aliases={aliases} />
    </div>
  );
}
