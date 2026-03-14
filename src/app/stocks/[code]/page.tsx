import { findOwnershipByStockWithHolders, findEmitenByCode, getLatestPeriod } from '@/lib/repositories/ownership-repository';
import { HoldersTable } from '@/components/holders-table';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';

// Cache for 1 hour
export const revalidate = 3600;

/**
 * Indonesian month names
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
    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Data per: {monthName} {period.year}
    </div>
  );
}

async function StockDetail({ stockCode }: { stockCode: string }) {
  const [stock, ownershipData, latestPeriod] = await Promise.all([
    findEmitenByCode(stockCode),
    findOwnershipByStockWithHolders(stockCode),
    getLatestPeriod(),
  ]);

  if (!stock) {
    notFound();
  }

  if (ownershipData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Belum ada data kepemilikan untuk saham ini</p>
        <p className="text-gray-400 text-sm mt-2">Data akan muncul setelah periode berikutnya diimpor</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{stockCode}</h1>
        <p className="text-xl text-gray-600 mt-1">{stock.name}</p>
        {stock.sector && (
          <p className="text-sm text-gray-500 mt-1">Sektor: {stock.sector}</p>
        )}
      </div>

      <DataFreshnessBadge period={latestPeriod ? { year: latestPeriod.year, month: latestPeriod.month } : null} />

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Kepemilikan Saham di Atas 1%
        </h2>
        <HoldersTable data={ownershipData} stockCode={stockCode} />
      </div>
    </div>
  );
}

export default function StockDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const stockCode = params.code.toUpperCase();

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        <StockDetail stockCode={stockCode} />
      </Suspense>
    </div>
  );
}
