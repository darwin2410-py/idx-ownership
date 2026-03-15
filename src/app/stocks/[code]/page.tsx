import { findOwnershipByStockWithHolders, findEmitenByCode, getLatestPeriod } from '@/lib/repositories/ownership-repository';
import { StockDetailComparison } from '@/components/stock-detail-comparison';
import { ErrorState, NotFoundState, EmptyState } from '@/components/stock-states';
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

async function StockDetail({
  stockCode,
  sortColumn,
  sortOrder,
}: {
  stockCode: string;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    const [stock, ownershipData, latestPeriod] = await Promise.all([
      findEmitenByCode(stockCode),
      findOwnershipByStockWithHolders(stockCode),
      getLatestPeriod(),
    ]);

    if (!stock) {
      return <NotFoundState code={stockCode} />;
    }

    // Apply server-side sorting if specified
    let sortedData = ownershipData;
    if (sortColumn && sortOrder) {
      sortedData = [...ownershipData].sort((a, b) => {
        let aVal: any = a[sortColumn as keyof typeof a];
        let bVal: any = b[sortColumn as keyof typeof b];

        // Handle percentage conversion
        if (sortColumn === 'ownershipPercentage') {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    if (ownershipData.length === 0) {
      return (
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{stockCode}</h1>
            <p className="text-xl text-gray-600 mt-1">{stock.name}</p>
            {stock.sector && (
              <p className="text-sm text-gray-500 mt-1">Sektor: {stock.sector}</p>
            )}
          </div>
          <EmptyState />
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
          <StockDetailComparison
            stockCode={stockCode}
            currentData={sortedData}
            currentPeriod={latestPeriod?.id || null}
          />
        </div>
      </div>
    );
  } catch (err) {
    return <ErrorState error={err instanceof Error ? err.message : 'Unknown error'} />;
  }
}

export default async function StockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ sort?: string; order?: string }>;
}) {
  const { code } = await params;
  const { sort, order } = await searchParams;

  const stockCode = code.toUpperCase();
  const sortColumn = sort;
  const sortOrder = order === 'asc' || order === 'desc'
    ? order
    : undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
          <StockDetailComparison
            stockCode={stockCode}
            currentData={[]}
            currentPeriod={null}
          />
        </div>
      }>
        <StockDetail
          stockCode={stockCode}
          sortColumn={sortColumn}
          sortOrder={sortOrder}
        />
      </Suspense>
    </div>
  );
}
