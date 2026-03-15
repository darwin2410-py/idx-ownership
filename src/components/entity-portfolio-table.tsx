'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
  type Row,
} from '@tanstack/react-table';
import Link from 'next/link';
import {
  type EntityPortfolioRow,
  type AliasBreakdown,
} from '@/lib/repositories/entity-repository';

// Union type for both parent rows and alias sub-rows
type PortfolioRowData = EntityPortfolioRow | AliasBreakdown;

interface EntityPortfolioTableProps {
  rows: EntityPortfolioRow[];
}

function isParentRow(row: PortfolioRowData): row is EntityPortfolioRow {
  return 'emitenId' in row;
}

function isAliasRow(row: PortfolioRowData): row is AliasBreakdown {
  return 'holderId' in row;
}

export function EntityPortfolioTable({ rows }: EntityPortfolioTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalPercentage', desc: true },
  ]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns: ColumnDef<PortfolioRowData>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }: { row: Row<PortfolioRowData> }) =>
        row.getCanExpand() ? (
          <button
            onClick={row.getToggleExpandedHandler()}
            className="text-gray-500 hover:text-gray-900 w-6 h-6 flex items-center justify-center"
            aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
          >
            {row.getIsExpanded() ? '▾' : '▸'}
          </button>
        ) : null,
      enableSorting: false,
      size: 40,
    },
    {
      id: 'emitenId',
      accessorFn: (row) => (isParentRow(row) ? row.emitenId : null),
      header: 'Kode',
      cell: ({ row }: { row: Row<PortfolioRowData> }) => {
        const original = row.original;
        if (isParentRow(original)) {
          return (
            <Link
              href={`/stocks/${original.emitenId}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {original.emitenId}
            </Link>
          );
        }
        // alias sub-row: no kode
        return null;
      },
      enableSorting: false,
    },
    {
      id: 'name',
      accessorFn: (row) => {
        if (isParentRow(row)) return row.emitenName;
        if (isAliasRow(row)) return row.holderName;
        return '';
      },
      header: 'Nama',
      cell: ({ row }: { row: Row<PortfolioRowData> }) => {
        const original = row.original;
        if (isParentRow(original)) {
          return (
            <span className="font-semibold text-gray-900">
              {original.emitenName}
            </span>
          );
        }
        if (isAliasRow(original)) {
          return (
            <span className="pl-8 text-gray-700 text-sm">
              {original.holderName}
            </span>
          );
        }
        return null;
      },
      enableSorting: false,
    },
    {
      id: 'totalPercentage',
      accessorFn: (row) => {
        if (isParentRow(row)) return parseFloat(row.totalPercentage);
        if (isAliasRow(row)) return parseFloat(row.percentage);
        return 0;
      },
      header: '% Kepemilikan',
      cell: ({ row }: { row: Row<PortfolioRowData> }) => {
        const original = row.original;
        if (isParentRow(original)) {
          return (
            <span className="font-semibold">
              {parseFloat(original.totalPercentage).toFixed(2)}%
            </span>
          );
        }
        if (isAliasRow(original)) {
          return (
            <span className="text-sm text-gray-600">
              {parseFloat(original.percentage).toFixed(2)}%
            </span>
          );
        }
        return null;
      },
    },
    {
      id: 'totalShares',
      accessorFn: (row) => {
        if (isParentRow(row)) return row.totalShares;
        if (isAliasRow(row)) return row.shares;
        return 0;
      },
      header: 'Jumlah Saham',
      cell: ({ row }: { row: Row<PortfolioRowData> }) => {
        const original = row.original;
        if (isParentRow(original)) {
          return (
            <span className="font-semibold">
              {original.totalShares.toLocaleString('id-ID')}
            </span>
          );
        }
        if (isAliasRow(original)) {
          return (
            <span className="text-sm text-gray-600">
              {original.shares.toLocaleString('id-ID')}
            </span>
          );
        }
        return null;
      },
      enableSorting: false,
    },
  ];

  const table = useReactTable<PortfolioRowData>({
    data: rows as PortfolioRowData[],
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) =>
      isParentRow(row) ? (row.aliases as PortfolioRowData[]) : undefined,
  });

  if (rows.length === 0) {
    return (
      <p className="text-gray-500 text-sm mt-4">
        Belum ada kepemilikan saham pada periode terakhir.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto mt-6">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={[
                    'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    header.column.getCanSort()
                      ? 'cursor-pointer hover:bg-gray-100 select-none'
                      : '',
                  ].join(' ')}
                  onClick={
                    header.column.getCanSort()
                      ? header.column.getToggleSortingHandler()
                      : undefined
                  }
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {header.column.getCanSort() &&
                    ({
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? ' ↕')}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => {
            const isParent = isParentRow(row.original);
            return (
              <tr
                key={row.id}
                className={
                  isParent
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : 'bg-white hover:bg-gray-50'
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
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
  );
}
