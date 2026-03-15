// @ts-nocheck
'use client';

import { useState, useEffect, useMemo } from 'react';
import { HoldersTable } from '@/components/holders-table';
import type { HolderRowWithEntity } from '@/lib/repositories/ownership-repository';

// Discriminated union types for display rows
export type EntityAggregateRow = {
  kind: 'entity';
  entityId: number;
  entityName: string;
  totalPercentage: string;  // e.g. "10.50"
  totalShares: number;
};

export type HolderDisplayRow = {
  kind: 'holder';
  data: HolderRowWithEntity;
};

export type DisplayRow = EntityAggregateRow | HolderDisplayRow;

/**
 * buildDisplayRows — pure function that injects entity aggregate rows above their aliases.
 * Holders with entityId !== null are grouped; a single EntityAggregateRow is inserted
 * before each group's HolderDisplayRow entries.
 * Entity blocks are sorted by totalPercentage DESC; ungrouped holders are sorted by rank.
 */
export function buildDisplayRows(holders: HolderRowWithEntity[]): DisplayRow[] {
  // Separate grouped holders (entityId !== null) from ungrouped (entityId === null)
  const entityGroups = new Map<number, HolderRowWithEntity[]>();
  const ungrouped: HolderRowWithEntity[] = [];

  for (const h of holders) {
    if (h.entityId !== null) {
      const group = entityGroups.get(h.entityId) ?? [];
      group.push(h);
      entityGroups.set(h.entityId, group);
    } else {
      ungrouped.push(h);
    }
  }

  // Build entity blocks: [EntityAggregateRow, ...HolderDisplayRow[]]
  const entityBlocks: DisplayRow[][] = [];
  for (const [entityId, members] of entityGroups) {
    const totalPct = members.reduce((sum, m) => sum + parseFloat(m.ownershipPercentage), 0);
    const totalShares = members.reduce((sum, m) => sum + m.sharesOwned, 0);
    const entityName = members[0].entityName!;
    const block: DisplayRow[] = [
      { kind: 'entity', entityId, entityName, totalPercentage: totalPct.toFixed(2), totalShares },
      ...members.map((m): DisplayRow => ({ kind: 'holder', data: m })),
    ];
    entityBlocks.push(block);
  }

  // Sort entity blocks by totalPercentage DESC
  entityBlocks.sort((a, b) => {
    const aRow = a[0] as EntityAggregateRow;
    const bRow = b[0] as EntityAggregateRow;
    return parseFloat(bRow.totalPercentage) - parseFloat(aRow.totalPercentage);
  });

  // Sort ungrouped by rank
  ungrouped.sort((a, b) => a.rank - b.rank);

  // Result: all entity blocks first (by totalPct DESC), then ungrouped by rank
  const result: DisplayRow[] = [];
  for (const block of entityBlocks) result.push(...block);
  for (const h of ungrouped) result.push({ kind: 'holder', data: h });

  return result;
}

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
  currentData: HolderRowWithEntity[];
  currentPeriod: string | null;
  isLoading?: boolean;
}

export function StockDetailComparison({ stockCode, currentData, currentPeriod, isLoading = false }: StockDetailComparisonProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<HolderData['comparison'][]>([]);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Compute display rows with entity aggregates
  const displayRows = useMemo(
    () => buildDisplayRows(currentData as HolderRowWithEntity[]),
    [currentData]
  );

  // Separate entity aggregate rows from holder rows
  const entityRows = displayRows.filter((r): r is EntityAggregateRow => r.kind === 'entity');
  const holderRows = displayRows.filter((r): r is HolderDisplayRow => r.kind === 'holder');

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

  // Build mergedHolderData for HoldersTable (add back comparison data if needed)
  const mergedHolderData = holderRows.map(row => {
    const comp = showComparison && comparisonData.length > 0
      ? comparisonData.find(c => c.holderName === row.data.holderName) || null
      : null;
    return { ...row.data, ...(comp ? { comparison: comp } : {}) };
  });

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

      {/* Entity aggregate section — only visible when entity groupings exist */}
      {entityRows.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Kepemilikan Entitas (Gabungan)
          </h3>
          {entityRows.map(row => (
            <div key={row.entityId} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div>
                <span className="font-semibold text-blue-900">{row.entityName}</span>
                <span className="ml-2 text-xs text-blue-600">
                  {holderRows
                    .filter(r => r.data.entityId === row.entityId)
                    .map(r => r.data.holderName)
                    .join(', ')}
                </span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-blue-900">{row.totalPercentage}%</div>
                <div className="text-xs text-gray-500">{row.totalShares.toLocaleString('id-ID')} saham</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HoldersTable
        data={mergedHolderData}
        stockCode={stockCode}
        showComparison={showComparison}
        isLoading={isLoading}
      />
    </div>
  );
}
