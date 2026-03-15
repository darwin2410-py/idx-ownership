'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';

interface HolderResult {
  id: number;
  name: string;
  type: string;
}

interface AliasSearchComboboxProps {
  entityId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AliasSearchCombobox({
  entityId,
  open,
  onOpenChange,
}: AliasSearchComboboxProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<HolderResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search trigger
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (search.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/holders/search?q=${encodeURIComponent(search)}`
        );
        if (res.ok) {
          const data: HolderResult[] = await res.json();
          setResults(data);
        }
      } catch {
        // silently ignore network errors during search
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      setResults([]);
      setError(null);
      setIsSearching(false);
    }
  }, [open]);

  async function handleSelect(holderId: number) {
    setError(null);
    try {
      const res = await fetch(`/api/entities/${entityId}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderId }),
      });

      if (res.ok) {
        onOpenChange(false);
        router.refresh();
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        setError(data.message ?? 'Holder ini sudah terdaftar di entitas lain');
        return;
      }

      setError('Terjadi kesalahan, coba lagi');
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    }
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Cari holder untuk ditambahkan sebagai alias"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog panel */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Cari nama holder..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-10"
              autoFocus
            />

            {/* Hints / errors below input */}
            {search.length < 2 && search.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Ketik minimal 2 karakter untuk mencari
              </p>
            )}
            {search.length === 0 && (
              <p className="mt-2 text-xs text-gray-400">
                Cari nama holder...
              </p>
            )}
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
          </div>

          <Command.List className="max-h-72 overflow-y-auto">
            {isSearching && (
              <div className="px-4 py-3 text-sm text-gray-500">
                Mencari...
              </div>
            )}

            {!isSearching && search.length >= 2 && results.length === 0 && (
              <Command.Empty className="px-4 py-3 text-sm text-gray-500">
                Tidak ada hasil untuk &quot;{search}&quot;
              </Command.Empty>
            )}

            {results.map((holder) => (
              <Command.Item
                key={holder.id}
                value={`${holder.id}-${holder.name}`}
                onSelect={() => handleSelect(holder.id)}
                className="flex items-center justify-between px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{holder.name}</span>
                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {getHolderTypeLabel(holder.type)}
                </span>
              </Command.Item>
            ))}
          </Command.List>
        </div>
      </div>
    </Command.Dialog>
  );
}
