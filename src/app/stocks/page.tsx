import { findAllStocksWithTopHolder, searchStocksWithFilters, getLatestPeriod } from '@/lib/repositories/ownership-repository';
import { StocksTable } from '@/components/stocks-table';
import { StocksSearch } from '@/components/stocks-search';
import { Suspense } from 'react';

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

async function StocksList({
  stockQuery,
  holderQuery,
}: {
  stockQuery?: string;
  holderQuery?: string;
}) {
  // Use search function if filters are active, otherwise get all stocks
  const stocks = (stockQuery || holderQuery)
    ? await searchStocksWithFilters({ stockCode: stockQuery, holderName: holderQuery })
    : await findAllStocksWithTopHolder();

  const latestPeriod = await getLatestPeriod();

  if (stocks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {stockQuery || holderQuery
            ? 'Tidak ditemukan hasil untuk pencarian ini'
            : 'Belum ada data tersedia'}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          {stockQuery || holderQuery
            ? 'Coba kata kunci lain atau hapus filter'
            : 'Data kepemilikan saham akan muncul di sini setelah diimpor'}
        </p>
      </div>
    );
  }

  // Transform data for table component
  const tableData = stocks.map((stock) => ({
    code: stock.emiten.id,
    name: stock.emiten.name,
    topHolder: stock.topHolder?.name || null,
    topHolderPct: stock.topHolder?.percentage || null,
    updatedAt: stock.updatedAt,
  }));

  return (
    <div>
      <DataFreshnessBadge period={latestPeriod ? { year: latestPeriod.year, month: latestPeriod.month } : null} />
      <StocksTable data={tableData} />
    </div>
  );
}

export default function StocksPage({
  searchParams,
}: {
  searchParams: { q?: string; holder?: string; sort?: string; order?: string };
}) {
  const stockQuery = searchParams.q || '';
  const holderQuery = searchParams.holder || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Daftar Saham IDX
      </h1>
      <p className="text-gray-600 mb-6">
        Kepemilikan saham di atas 1% untuk seluruh emiten Bursa Efek Indonesia
      </p>

      <StocksSearch
        initialStockQuery={stockQuery}
        initialHolderQuery={holderQuery}
      />

      <Suspense fallback={
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        <StocksList
          stockQuery={stockQuery}
          holderQuery={holderQuery}
        />
      </Suspense>
    </div>
  );
}
