import { Suspense } from 'react';
import Link from 'next/link';
import { HolderSearch } from '@/components/holder-search';
import { findAllHolders, searchHoldersByName, getLatestPeriod } from '@/lib/repositories/ownership-repository';
import { HoldingsTable } from '@/components/holdings-table';
import { ErrorState, EmptyState } from '@/components/stock-states';

// Cache for 1 hour (3600 seconds) - IDX data updates monthly
export const revalidate = 3600;

/**
 * Indonesian month names for data freshness indicator
 */
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function DataFreshnessBadge({ period }: { period: { year: number; month: number } | null }) {
  if (!period) {
    return null;
  }

  const monthName = INDONESIAN_MONTHS[period.month - 1];

  return (
    <div className="mb-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Data per: {monthName} {period.year}
    </div>
  );
}

function formatPeriod(period: { year: number; month: number }): string {
  return `${INDONESIAN_MONTHS[period.month - 1]} ${period.year}`;
}

function getHolderTypeLabel(type: string): string {
  const labels = {
    institution: 'Institusi',
    individual: 'Individu',
    foreign: 'Asing',
    government: 'Pemerintah',
    other: 'Lainnya',
  };
  return labels[type as keyof typeof labels] || type;
}

async function HoldersList({ searchQuery }: { searchQuery?: string }) {
  try {
    const period = await getLatestPeriod();
    const holders = searchQuery
      ? await searchHoldersByName(searchQuery)
      : await findAllHolders();

    if (holders.length === 0) {
      return (
        <div>
          <HolderSearch initialQuery={searchQuery || ''} />
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery
                ? `Tidak ditemukan pemegang saham dengan nama "${searchQuery}"`
                : 'Belum ada data pemegang saham'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div>
        <HolderSearch initialQuery={searchQuery || ''} />

        <DataFreshnessBadge period={period ? { year: period.year, month: period.month } : null} />

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Pemegang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah Saham
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saham Teratas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holders.map((item) => (
                  <tr key={item.holder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/holders/${item.holder.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {item.holder.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getHolderTypeLabel(item.holder.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.stocksCount} saham
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.topStock ? (
                        <div>
                          <Link
                            href={`/stocks/${item.topStock.code}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {item.topStock.code}
                          </Link>
                          <span className="ml-2 text-gray-500">
                            ({parseFloat(item.topStock.percentage).toFixed(2)}%)
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {period && (
          <div className="mt-4 text-sm text-gray-600">
            Data per: {formatPeriod(period)}
          </div>
        )}
      </div>
    );
  } catch (err) {
    return <ErrorState error={err instanceof Error ? err.message : 'Unknown error'} />;
  }
}

export default async function HoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pemegang Saham
        </h1>
        <p className="text-gray-600">
          Cari pemegang saham dan lihat portofolio lengkap mereka
        </p>
      </div>

      <Suspense fallback={<HoldingsTable data={[]} isLoading={true} />}>
        <HoldersList searchQuery={q} />
      </Suspense>
    </div>
  );
}
