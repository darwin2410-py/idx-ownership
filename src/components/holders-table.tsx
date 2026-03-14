'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

type HolderData = {
  rank: number;
  holderName: string;
  holderType: string;
  sharesOwned: number;
  ownershipPercentage: string;
};

const columnHelper = createColumnHelper<HolderData>();

const columns = [
  columnHelper.accessor('rank', {
    header: 'Peringkat',
    cell: (info) => `#${info.getValue()}`,
  }),
  columnHelper.accessor('holderName', {
    header: 'Nama Pemegang',
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
  }),
  columnHelper.accessor('sharesOwned', {
    header: 'Jumlah Saham',
    cell: (info) => {
      const num = info.getValue();
      return new Intl.NumberFormat('id-ID').format(num);
    },
  }),
  columnHelper.accessor('ownershipPercentage', {
    header: '% Pemilikan',
    cell: (info) => `${info.getValue()}%`,
  }),
];

interface HoldersTableProps {
  data: HolderData[];
  stockCode: string;
}

export function HoldersTable({ data, stockCode }: HoldersTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
      a.download = `${stockCode}_ownership_${new Date().toISOString().slice(0, 7)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal mengekspor data. Silakan coba lagi.');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Ekspor CSV
        </button>
      </div>

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
    </div>
  );
}
