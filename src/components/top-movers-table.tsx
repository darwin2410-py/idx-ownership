'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Link from 'next/link';

// Type for accumulators table
export type AccumulatorRow = {
  rank: number;
  holderName: string;
  stockCode: string;
  stockName: string;
  currentPercentage: string;
  previousPercentage: string | null;
  changePercentage: number;
};

// Type for disposals table
export type DisposalRow = {
  rank: number;
  holderName: string;
  stockCode: string;
  stockName: string;
  currentPercentage: string;
  previousPercentage: string;
  changePercentage: number;
};

// Type for active stocks table
export type ActiveStockRow = {
  rank: number;
  stockCode: string;
  stockName: string;
  totalChange: number;
  newHolders: number;
  exitedHolders: number;
  churnedHolders: number;
};

interface TopMoversTableProps {
  type: 'accumulators' | 'disposals' | 'active-stocks';
  data: AccumulatorRow[] | DisposalRow[] | ActiveStockRow[];
}

const columnHelper = createColumnHelper<any>();

export function TopMoversTable({ type, data }: TopMoversTableProps) {
  // Define columns based on table type
  const getColumns = () => {
    switch (type) {
      case 'accumulators':
        return [
          columnHelper.accessor('rank', {
            header: '#',
            cell: (info) => info.getValue(),
          }),
          columnHelper.accessor('holderName', {
            header: 'Pemegang Saham',
            cell: (info) => info.getValue(),
          }),
          columnHelper.accessor('stockCode', {
            header: 'Saham',
            cell: (info) => (
              <Link
                href={`/stocks/${info.getValue()}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {info.getValue()}
              </Link>
            ),
          }),
          columnHelper.accessor('currentPercentage', {
            header: 'Sekarang',
            cell: (info) => `${parseFloat(info.getValue()).toFixed(2)}%`,
          }),
          columnHelper.accessor('previousPercentage', {
            header: 'Bulan Lalu',
            cell: (info) => info.getValue() ? `${parseFloat(info.getValue()).toFixed(2)}%` : '-',
          }),
          columnHelper.accessor('changePercentage', {
            header: 'Perubahan',
            cell: (info) => {
              const value = info.getValue();
              return (
                <span className="text-green-600 font-medium">
                  +{value.toFixed(2)}%
                </span>
              );
            },
          }),
        ];

      case 'disposals':
        return [
          columnHelper.accessor('rank', {
            header: '#',
            cell: (info) => info.getValue(),
          }),
          columnHelper.accessor('holderName', {
            header: 'Pemegang Saham',
            cell: (info) => info.getValue(),
          }),
          columnHelper.accessor('stockCode', {
            header: 'Saham',
            cell: (info) => (
              <Link
                href={`/stocks/${info.getValue()}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {info.getValue()}
              </Link>
            ),
          }),
          columnHelper.accessor('currentPercentage', {
            header: 'Sekarang',
            cell: (info) => `${parseFloat(info.getValue()).toFixed(2)}%`,
          }),
          columnHelper.accessor('previousPercentage', {
            header: 'Bulan Lalu',
            cell: (info) => `${parseFloat(info.getValue()).toFixed(2)}%`,
          }),
          columnHelper.accessor('changePercentage', {
            header: 'Perubahan',
            cell: (info) => {
              const value = info.getValue();
              return (
                <span className="text-red-600 font-medium">
                  {value.toFixed(2)}%
                </span>
              );
            },
          }),
        ];

      case 'active-stocks':
        return [
          columnHelper.accessor('rank', {
            header: '#',
            cell: (info) => info.getValue(),
          }),
          columnHelper.accessor('stockCode', {
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
          columnHelper.accessor('stockName', {
            header: 'Nama Perusahaan',
            cell: (info) => info.getValue(),
          }),
          columnHelper.accessor('totalChange', {
            header: 'Total Perubahan',
            cell: (info) => info.getValue(),
          }),
          columnHelper.accessor('newHolders', {
            header: 'Pemegang Baru',
            cell: (info) => (
              <span className="text-blue-600">{info.getValue()}</span>
            ),
          }),
          columnHelper.accessor('exitedHolders', {
            header: 'Keluar',
            cell: (info) => (
              <span className="text-gray-600">{info.getValue()}</span>
            ),
          }),
          columnHelper.accessor('churnedHolders', {
            header: 'Berubah',
            cell: (info) => (
              <span className="text-orange-600">{info.getValue()}</span>
            ),
          }),
        ];

      default:
        return [];
    }
  };

  const table = useReactTable({
    data,
    columns: getColumns(),
    getCoreRowModel: getCoreRowModel(),
  });

  const getTitle = () => {
    switch (type) {
      case 'accumulators': return 'Akumulator Teratas';
      case 'disposals': return 'Penjualan Teratas';
      case 'active-stocks': return 'Saham Paling Aktif';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'accumulators': return 'Pemegang yang meningkatkan kepemilikan paling banyak';
      case 'disposals': return 'Pemegang yang mengurangi kepemilikan paling banyak';
      case 'active-stocks': return 'Saham dengan perubahan kepemilikan terbanyak';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{getTitle()}</h3>
        <p className="text-sm text-gray-500 mt-1">{getDescription()}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {flexRender(
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
    </div>
  );
}
