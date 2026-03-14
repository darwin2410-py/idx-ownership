'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import Link from 'next/link';

type StockData = {
  code: string;
  name: string;
  topHolder: string | null;
  topHolderPct: string | null;
  updatedAt: string;
};

const columnHelper = createColumnHelper<StockData>();

const columns = [
  columnHelper.accessor('code', {
    header: () => (
      <div className="left-0 sticky z-10 bg-white min-w-[100px]">
        Kode Saham
      </div>
    ),
    cell: (info) => (
      <div className="left-0 sticky z-10 bg-white min-w-[100px]">
        <Link
          href={`/stocks/${info.getValue()}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {info.getValue()}
        </Link>
      </div>
    ),
  }),
  columnHelper.accessor('name', {
    header: 'Nama Perusahaan',
  }),
  columnHelper.accessor('topHolder', {
    header: 'Pemegang Teratas',
    cell: (info) => info.getValue() || '-',
  }),
  columnHelper.accessor('topHolderPct', {
    header: '% Pemilikan',
    cell: (info) => {
      const pct = info.getValue();
      return pct ? `${pct}%` : '-';
    },
    sortingFn: (rowA, rowB) => {
      const pctA = parseFloat(rowA.original.topHolderPct || '0');
      const pctB = parseFloat(rowB.original.topHolderPct || '0');
      return pctA - pctB;
    },
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Update Terakhir',
  }),
];

interface StocksTableProps {
  data: StockData[];
  initialSort?: { id: string; desc: boolean };
  isLoading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </td>
      <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
    </tr>
  );
}

export function StocksTable({ data, initialSort, isLoading = false }: StocksTableProps) {
  // Initialize sorting from URL params or props
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (typeof window === 'undefined') return [];

    const params = new URLSearchParams(window.location.search);
    const sortId = params.get('sort');
    const sortOrder = params.get('order');

    if (sortId) {
      return [{
        id: sortId,
        desc: sortOrder === 'desc',
      }];
    }

    return initialSort ? [initialSort] : [];
  });

  // Update URL when sorting changes
  useEffect(() => {
    if (typeof window === 'undefined' || sorting.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const sortId = sorting[0].id;
    const sortOrder = sorting[0].desc ? 'desc' : 'asc';

    params.set('sort', sortId);
    params.set('order', sortOrder);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [sorting]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    enableSorting: true,
  });

  if (isLoading) {
    return (
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
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
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
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
