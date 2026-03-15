// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { HoldersTable } from '@/components/holders-table';

type HolderData = {
  rank: number;
  holderName: string;
  holderType: string;
  sharesOwned: number;
  ownershipPercentage: string;
  periodId: string;
  comparison?: {
    previousRank: number | null;
    previousPercentage: string | null;
    changePercentage: number;
    status: 'new' | 'exited' | 'increased' | 'decreased' | 'unchanged';
  };
};

interface StockDetailComparisonProps {
  stockCode: string;
  currentData: HolderData[];
  currentPeriod: string | null;
  isLoading?: boolean;
}

export function StockDetailComparison({ stockCode, currentData, currentPeriod, isLoading = false }: StockDetailComparisonProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<HolderData['comparison'][]>([]);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Fetch comparison data when toggled
  useEffect(() => {
    if (showComparison && currentPeriod) {
      setLoadingComparison(true);
      fetch(`/api/stocks/${stockCode}/comparison?period=${currentPeriod}`)
        .then(res => res.json())
        .then(data => {
          setComparisonData(data);
          setLoadingComparison(false);
        })
        .catch(err => {
          console.error('Failed to fetch comparison:', err);
          setLoadingComparison(false);
        });
    }
  }, [showComparison, currentPeriod, stockCode]);

  // Merge current data with comparison data
  const tableData = showComparison && comparisonData.length > 0
    ? currentData.map((item) => {
        const comp = comparisonData.find((c) => c.holderName === item.holderName);
        return { ...item, comparison: comp || null };
      })
    : currentData;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Kepemilikan Saham di Atas 1%
          </h2>
        </div>
        {!isLoading && currentPeriod && (
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center justify-center min-h-12 px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showComparison ? 'Sembunyikan Perbandingan' : 'Bandingkan Bulan Lalu'}
          </button>
        )}
      </div>

      {loadingComparison && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat data perbandingan...</p>
        </div>
      )}

      <HoldersTable
        data={tableData}
        stockCode={stockCode}
        showComparison={showComparison}
        isLoading={isLoading}
      />
    </div>
  );
}
