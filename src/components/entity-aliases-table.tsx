'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AliasSearchCombobox } from './alias-search-combobox';

interface Alias {
  holderId: number;
  holderName: string;
  holderType: string;
  addedAt: Date;
}

interface EntityAliasesTableProps {
  entityId: number;
  aliases: Alias[];
}

const HOLDER_TYPE_LABELS: Record<string, string> = {
  individual: 'Individu',
  institution: 'Institusi',
  foreign: 'Asing',
  government: 'Pemerintah',
};

function getHolderTypeLabel(type: string): string {
  return HOLDER_TYPE_LABELS[type] ?? type;
}

export function EntityAliasesTable({ entityId, aliases }: EntityAliasesTableProps) {
  const router = useRouter();
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(holderId: number) {
    setDeleteError(null);
    setDeletingId(holderId);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/aliases/${holderId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        router.refresh();
        return;
      }

      setDeleteError('Gagal menghapus alias, coba lagi');
    } catch {
      setDeleteError('Terjadi kesalahan, coba lagi');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {/* Header with add button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Alias Holder</h2>
        <button
          onClick={() => setComboboxOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors min-h-12"
        >
          + Tambah Alias
        </button>
      </div>

      {deleteError && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {deleteError}
        </div>
      )}

      {aliases.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">
            Belum ada alias. Tambah holder dengan tombol di atas.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Holder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aliases.map((alias) => (
                  <tr key={alias.holderId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {alias.holderName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getHolderTypeLabel(alias.holderType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(alias.holderId)}
                        disabled={deletingId === alias.holderId}
                        className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-md border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-12"
                      >
                        {deletingId === alias.holderId ? 'Menghapus...' : 'Hapus'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AliasSearchCombobox
        entityId={entityId}
        open={comboboxOpen}
        onOpenChange={setComboboxOpen}
      />
    </div>
  );
}
