'use client';

import { useMemo, useEffect } from 'react';
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
    header: 'Kode Saham',
    cell: (info) => (
      <Link
        href={`/stocks/${info.getValue()}`}
        className="text-blue-600 hover:text-blue-800 font-medium"
      >
        {info.getValue()}
      </Link>
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
}

export function StocksTable({ data, initialSort }: StocksTableProps) {
  // Initialize sorting from URL params or props
  const [sorting, setSorting] = useMemo<SortingState>(() => {
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
  }, [initialSort]);

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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {{{
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
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
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
