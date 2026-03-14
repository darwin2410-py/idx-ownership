'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
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
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Update Terakhir',
  }),
];

interface StocksTableProps {
  data: StockData[];
}

export function StocksTable({ data }: StocksTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
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
