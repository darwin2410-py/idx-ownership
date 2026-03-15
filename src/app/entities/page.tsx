import Link from 'next/link';
import { findAllEntities } from '@/lib/repositories/entity-repository';
import { EntityCreateForm } from '@/components/entity-create-form';

export const revalidate = 0;

export default async function EntitiesPage() {
  const entities = await findAllEntities();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Daftar Entitas
        </h1>
        <p className="text-gray-600">
          Kelola pengelompokan pemegang saham berdasarkan entitas atau orang yang sama
        </p>
      </div>

      <EntityCreateForm />

      {entities.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500 text-lg">
            Belum ada entitas. Buat entitas pertama di atas.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Entitas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah Alias
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entities.map((entity) => (
                  <tr key={entity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/entities/${entity.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {entity.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entity.aliasCount} alias
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/entities/${entity.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
