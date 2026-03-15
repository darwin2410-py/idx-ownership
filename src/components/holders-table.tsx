// @ts-nocheck
'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';

type HolderData = {
  rank: number;
  holderName: string;
  holderType: string;
  sharesOwned: number;
  ownershipPercentage: string;
  comparison?: ComparisonData;
};

type ComparisonData = {
  previousRank: number | null;
  previousPercentage: string | null;
  changePercentage: number;
  status: 'new' | 'exited' | 'increased' | 'decreased' | 'unchanged';
};

const columnHelper = createColumnHelper<HolderData>();

const columns = [
  columnHelper.accessor('rank', {
    header: 'Peringkat',
    cell: (info) => `#${info.getValue()}`,
    enableSorting: true,
  }),
  columnHelper.accessor('holderName', {
    header: () => (
      <div className="left-0 sticky z-10 bg-white min-w-[200px]">
        Nama Pemegang
      </div>
    ),
    cell: (info) => (
      <div className="left-0 sticky z-10 bg-white min-w-[200px]">
        <Link
          href={`/graph/holder/${encodeURIComponent(info.getValue())}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {info.getValue()}
        </Link>
      </div>
    ),
    enableSorting: true,
  }),
  columnHelper.accessor('holderType', {
    header: 'Tipe',
    cell: (info) => {
      const type = info.getValue();
      const typeMap: Record<string, string> = {
        individual: 'Individu',
        institution: 'Institusi',
        foreign: 'Asing',
        government: 'Pemerintah',
        other: 'Lainnya',
      };
      return typeMap[type] || type;
    },
    enableSorting: true,
  }),
  columnHelper.accessor('sharesOwned', {
    header: 'Jumlah Saham',
    cell: (info) => {
      const num = info.getValue();
      return new Intl.NumberFormat('id-ID').format(num);
    },
    enableSorting: true,
  }),
  columnHelper.accessor('ownershipPercentage', {
    header: '% Pemilikan',
    cell: (info) => `${info.getValue()}%`,
    enableSorting: true,
    meta: {
      className: 'text-right min-w-[80px]',
    },
  }),
];

interface HoldersTableProps {
  data: HolderData[];
  stockCode: string;
  isLoading?: boolean;
  showComparison?: boolean;
}

function SkeletonRow({ showComparison = false }: { showComparison?: boolean }) {
  const baseCells = (
    <>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-8"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
    </>
  );

  const comparisonCells = showComparison ? (
    <>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </td>
    </>
  ) : null;

  return (
    <tr className="animate-pulse">
      {baseCells}
      {comparisonCells}
    </tr>
  );
}

function StatusBadge({ status }: { status: ComparisonData['status'] }) {
  const badges = {
    new: { label: 'BARU', className: 'bg-blue-100 text-blue-800' },
    exited: { label: 'KELUAR', className: 'bg-gray-100 text-gray-800' },
    increased: { label: '↑', className: 'text-green-600' },
    decreased: { label: '↓', className: 'text-red-600' },
    unchanged: { label: '→', className: 'text-gray-400' },
  };

  const badge = badges[status];

  if (status === 'new' || status === 'exited') {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  }

  return <span className={`text-lg font-bold ${badge.className}`}>{badge.label}</span>;
}

function ChangeDisplay({ change, status }: { change: number; status: ComparisonData['status'] }) {
  if (status === 'new') return <span className="text-blue-600">+{change.toFixed(2)}%</span>;
  if (status === 'exited') return <span className="text-gray-500">-</span>;

  const isPositive = change > 0;
  const colorClass = isPositive ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400';
  const sign = isPositive ? '+' : '';

  return (
    <span className={`font-medium ${colorClass}`}>
      {sign}{change.toFixed(2)}%
    </span>
  );
}


export function HoldersTable({ data, stockCode, isLoading = false, showComparison = false }: HoldersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize sorting from URL params
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sortId = searchParams.get('sort');
    const sortOrder = searchParams.get('order');

    if (sortId) {
      return [{
        id: sortId,
        desc: sortOrder === 'desc',
      }];
    }

    return []; // Default: no sorting (use rank order from server)
  });

  // Dynamic columns based on comparison mode
  const dynamicColumns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor('rank', {
        header: 'Peringkat',
        cell: (info) => `#${info.getValue()}`,
        enableSorting: true,
      }),
      columnHelper.accessor('holderName', {
        header: () => (
          <div className="left-0 sticky z-10 bg-white min-w-[200px]">
            Nama Pemegang
          </div>
        ),
        cell: (info) => (
          <div className="left-0 sticky z-10 bg-white min-w-[200px]">
            <Link
              href={`/graph/holder/${encodeURIComponent(info.getValue())}`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {info.getValue()}
            </Link>
          </div>
        ),
        enableSorting: true,
      }),
      columnHelper.accessor('holderType', {
        header: 'Tipe',
        cell: (info) => {
          const type = info.getValue();
          const typeMap: Record<string, string> = {
            individual: 'Individu',
            institution: 'Institusi',
            foreign: 'Asing',
            government: 'Pemerintah',
            other: 'Lainnya',
          };
          return typeMap[type] || type;
        },
        enableSorting: true,
      }),
      columnHelper.accessor('sharesOwned', {
        header: 'Jumlah Saham',
        cell: (info) => {
          const num = info.getValue();
          return new Intl.NumberFormat('id-ID').format(num);
        },
        enableSorting: true,
      }),
      columnHelper.accessor('ownershipPercentage', {
        header: '% Pemilikan',
        cell: (info) => `${info.getValue()}%`,
        enableSorting: true,
        meta: {
          className: 'text-right min-w-[80px]',
        },
      }),
    ];

    // Add comparison columns if enabled
    if (showComparison) {
      baseColumns.push(
        columnHelper.accessor('comparison', {
          header: () => <div className="text-center">Bulan Lalu</div>,
          cell: (info) => {
            const comp = info.getValue();
            if (!comp) return <span className="text-gray-400">-</span>;
            if (comp.previousPercentage === null) return <span className="text-gray-400">-</span>;
            return <span className="font-medium">{comp.previousPercentage}%</span>;
          },
        }),
        columnHelper.accessor('comparison', {
          header: () => <div className="text-center">Perubahan</div>,
          cell: (info) => {
            const comp = info.getValue();
            if (!comp) return <span className="text-gray-400">-</span>;
            return <ChangeDisplay change={comp.changePercentage} status={comp.status} />;
          },
        }),
        columnHelper.accessor('comparison', {
          header: () => <div className="text-center">Status</div>,
          cell: (info) => {
            const comp = info.getValue();
            if (!comp) return <span className="text-gray-400">-</span>;
            return <div className="flex justify-center"><StatusBadge status={comp.status} /></div>;
          },
        })
      );
    }

    return baseColumns;
  }, [showComparison]);

  const table = useReactTable({
    data,
    columns: dynamicColumns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      // Update URL with new sort parameters
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      const params = new URLSearchParams(searchParams.toString());

      if (newSorting.length === 0) {
        params.delete('sort');
        params.delete('order');
      } else {
        params.set('sort', newSorting[0].id);
        params.set('order', newSorting[0].desc ? 'desc' : 'asc');
      }

      // Navigate with new URL params (triggers server refetch)
      router.push(`?${params.toString()}`, { scroll: false });
    },
    enableSorting: true,
    manualSorting: true, // Server-side sorting
  });

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/api/stocks/${stockCode}/export`);
      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stockCode}_ownership_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal mengekspor data. Silakan coba lagi.');
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <button
            disabled
            className="inline-flex items-center justify-center w-full sm:w-auto min-h-12 px-4 py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 opacity-50 cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.293V19a2 2 0 01-2 2z" />
            </svg>
            Ekspor CSV
          </button>
        </div>

        <div className="max-w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                        }
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 10 }).map((_, i) => (
                <SkeletonRow key={i} showComparison={showComparison} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center w-full sm:w-auto min-h-12 px-4 py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.293V19a2 2 0 01-2 2z" />
          </svg>
          Ekspor CSV
        </button>
      </div>

      <div className="max-w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                      }
                      {{
                        asc: (
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ),
                        desc: (
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ),
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => {
              const comp = row.original.comparison;
              const rowClassName = comp
                ? comp.status === 'new'
                  ? 'bg-blue-50'
                  : comp.status === 'exited'
                  ? 'bg-gray-50'
                  : 'hover:bg-gray-50'
                : 'hover:bg-gray-50';

              return (
                <tr key={row.id} className={rowClassName}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
