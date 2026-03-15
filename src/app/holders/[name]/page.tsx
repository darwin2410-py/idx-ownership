import { notFound } from 'next/navigation';
import { findStocksByHolder, findHolderById, getLatestPeriod } from '@/lib/repositories/ownership-repository';
import { HoldingsTable } from '@/components/holdings-table';
import { ErrorState } from '@/components/stock-states';

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

async function HolderDetail({ holderId }: { holderId: number }) {
  try {
    const [holder, holdings, period] = await Promise.all([
      findHolderById(holderId),
      findStocksByHolder(holderId),
      getLatestPeriod(),
    ]);

    if (!holder) {
      notFound();
    }

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {holder.name}
          </h1>
          <p className="text-gray-600">
            Tipe: {getHolderTypeLabel(holder.type)} • {holdings.length} saham
          </p>
        </div>

        <DataFreshnessBadge period={period ? { year: period.year, month: period.month } : null} />

        {holdings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Tidak ada data kepemilikan untuk pemegang saham ini
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Portofolio Saham
              </h2>
              <ExportButton holderId={holderId} holderName={holder.name} />
            </div>
            <div className="p-6">
              <HoldingsTable data={holdings} />
            </div>
          </div>
        )}
      </div>
    );
  } catch (err) {
    return <ErrorState error={err instanceof Error ? err.message : 'Unknown error'} />;
  }
}

function ExportButton({ holderId, holderName }: { holderId: number; holderName: string }) {
  const handleExport = async () => {
    try {
      const response = await fetch(`/api/holders/${holderId}/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-${holderName.replace(/\s+/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Gagal mengekspor data');
    }
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-12"
    >
      Ekspor CSV
    </button>
  );
}

export default async function HolderDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const holderId = parseInt(name, 10);

  if (isNaN(holderId)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <HolderDetail holderId={holderId} />
    </div>
  );
}
