import { findOwnershipByStockWithHolders, findEmitenByCode, getLatestPeriod } from '@/lib/repositories/ownership-repository';
import { HoldersTable } from '@/components/holders-table';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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

function NotFoundState({ code }: { code: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Saham Tidak Ditemukan
      </h3>
      <p className="text-gray-600 mb-4">
        Kode saham "{code}" tidak ditemukan dalam database.
      </p>
      <Link
        href="/stocks"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-12"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Kembali ke Daftar Saham
      </Link>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Kepemilikan Saham di Atas 1%
          </h2>
          <HoldersTable data={sortedData} stockCode={stockCode} />
        </div>
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
          <HoldersTable data={[]} isLoading={true} />
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
