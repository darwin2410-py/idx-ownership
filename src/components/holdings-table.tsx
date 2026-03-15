'use client';

import { useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import Link from 'next/link';

type Holding = {
  emiten: {
    id: string;
    name: string;
  };
  rank: number;
  sharesOwned: number;
  ownershipPercentage: string;
};

interface HoldingsTableProps {
  data: Holding[];
  isLoading?: boolean;
}

const columnHelper = createColumnHelper<Holding>();

export function HoldingsTable({ data, isLoading = false }: HoldingsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'rank', desc: false },
  ]);

  const columns = [
    columnHelper.accessor('rank', {
      header: 'Peringkat',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('emiten.id', {
      id: 'code',
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
    columnHelper.accessor('emiten.name', {
      id: 'name',
      header: 'Nama Perusahaan',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('sharesOwned', {
      header: 'Jumlah Saham',
      cell: (info) => info.getValue().toLocaleString('id-ID'),
    }),
    columnHelper.accessor('ownershipPercentage', {
      header: '% Kepemilikan',
      cell: (info) => {
        const pct = parseFloat(info.getValue());
        return `${pct.toFixed(2)}%`;
      },
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Peringkat
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kode Saham
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Perusahaan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jumlah Saham
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                % Kepemilikan
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(10)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {{
                    asc: ' ↑',
                    desc: ' ↓',
                  }[header.column.getIsSorted() as string] ?? ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200">
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
