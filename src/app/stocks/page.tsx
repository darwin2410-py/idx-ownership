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

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Terjadi Kesalahan
      </h3>
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-12"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Coba Lagi
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Belum Ada Data
      </h3>
      <p className="text-gray-600 max-w-md mx-auto">
        Data kepemilikan saham belum tersedia. Data akan muncul setelah file PDF dari IDX diimpor ke sistem.
      </p>
    </div>
  );
}

function NoResultsState({ query }: { query: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Tidak Ditemukan
      </h3>
      <p className="text-gray-600">
        Tidak ada saham yang cocok dengan pencarian &quot;{query}&quot;
      </p>
      <p className="text-gray-500 text-sm mt-2">
        Coba cari dengan kata kunci lain
      </p>
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
  try {
    // Use search function if filters are active, otherwise get all stocks
    const stocks = (stockQuery || holderQuery)
      ? await searchStocksWithFilters({ stockCode: stockQuery, holderName: holderQuery })
      : await findAllStocksWithTopHolder();

    const latestPeriod = await getLatestPeriod();

    if (stocks.length === 0) {
      // Differentiate between no data at all vs no search results
      if (stockQuery || holderQuery) {
        return <NoResultsState query={stockQuery || holderQuery || ''} />;
      }
      return <EmptyState />;
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
  } catch (err) {
    return (
      <ErrorState
        error={err instanceof Error ? err.message : 'Unknown error'}
        onRetry={() => window.location.reload()}
      />
    );
  }
}

export default async function StocksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; holder?: string; sort?: string; order?: string }>;
}) {
  const { q, holder } = await searchParams;

  const stockQuery = q || '';
  const holderQuery = holder || '';

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

      <Suspense fallback={<StocksTable data={[]} isLoading={true} />}>
        <StocksList
          stockQuery={stockQuery}
          holderQuery={holderQuery}
        />
      </Suspense>
    </div>
  );
}
