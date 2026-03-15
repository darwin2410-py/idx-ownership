import { Suspense } from 'react';
import { PeriodFilter } from '@/components/period-filter';
import { TopMoversTable } from '@/components/top-movers-table';
import {
  getTopAccumulators,
  getTopDisposals,
  getMostActiveStocks,
  getAllPeriods,
  getLatestPeriod,
} from '@/lib/repositories/ownership-repository';
import { Spinner } from '@/components/stock-states';

interface Props {
  searchParams: { period?: string };
}

// Cache for 1 hour (3600 seconds) - IDX data updates monthly
export const revalidate = 3600;

export default async function DashboardPage({ searchParams }: Props) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dasbor Pergerakan
        </h1>
        <p className="text-gray-600">
          Pantau akumulasi, penjualan, dan saham paling aktif
        </p>
      </div>

      <Suspense fallback={<Spinner />}>
        <DashboardContent selectedPeriod={searchParams.period} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ selectedPeriod }: { selectedPeriod?: string }) {
  // Get all periods and determine target period
  const allPeriods = await getAllPeriods();
  const latestPeriod = await getLatestPeriod();

  if (!latestPeriod || allPeriods.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          Belum ada data yang cukup untuk menampilkan dasbor
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Dasbor memerlukan minimal 2 periode data untuk membandingkan perubahan
        </p>
      </div>
    );
  }

  // Use selected period or default to latest
  const targetPeriod = selectedPeriod || latestPeriod.id;

  // Validate that selected period exists
  const periodExists = allPeriods.some(p => p.id === targetPeriod);
  const actualPeriod = periodExists ? targetPeriod : latestPeriod.id;

  // Fetch dashboard data in parallel
  const [accumulators, disposals, activeStocks] = await Promise.all([
    getTopAccumulators(actualPeriod, 20),
    getTopDisposals(actualPeriod, 20),
    getMostActiveStocks(actualPeriod, 20),
  ]);

  // Add rank to each row
  const accumulatorsWithRank = accumulators.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  const disposalsWithRank = disposals.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  const activeStocksWithRank = activeStocks.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  // Show period filter only if we have multiple periods
  const showPeriodFilter = allPeriods.length > 1;

  return (
    <div>
      {showPeriodFilter && (
        <div className="mb-8 max-w-xs">
          <PeriodFilter
            periods={allPeriods}
            currentPeriod={selectedPeriod}
          />
        </div>
      )}

      {accumulators.length === 0 && disposals.length === 0 && activeStocks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            Tidak ada data perbandingan untuk periode ini
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Pilih periode lain untuk melihat pergerakan kepemilikan
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Accumulators */}
          {accumulators.length > 0 && (
            <TopMoversTable
              type="accumulators"
              data={accumulatorsWithRank}
            />
          )}

          {/* Top Disposals */}
          {disposals.length > 0 && (
            <TopMoversTable
              type="disposals"
              data={disposalsWithRank}
            />
          )}

          {/* Most Active Stocks */}
          {activeStocks.length > 0 && (
            <TopMoversTable
              type="active-stocks"
              data={activeStocksWithRank}
            />
          )}
        </div>
      )}
    </div>
  );
}
