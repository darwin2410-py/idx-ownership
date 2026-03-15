'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

interface HolderSearchProps {
  initialQuery?: string;
}

export function HolderSearch({ initialQuery = '' }: HolderSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);

  // Debounced update function (300ms delay)
  const debouncedUpdate = useDebounce((searchQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update or remove query parameter
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }

    // Navigate with new params
    router.push(`/holders?${params.toString()}`, { scroll: false });
  }, 300);

  // Update URL when query changes (debounced)
  useEffect(() => {
    debouncedUpdate(query);
  }, [query, debouncedUpdate]);

  // Clear search
  const handleClear = () => {
    setQuery('');
    router.push('/holders', { scroll: false });
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari nama pemegang saham..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-h-12 px-4 py-3 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {query && (
          <button
            onClick={handleClear}
            className="min-h-12 px-6 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Hapus
          </button>
        )}
      </div>
      {query && (
        <p className="mt-2 text-sm text-gray-600">
          Menampilkan hasil pencarian untuk: <strong>{query}</strong>
        </p>
      )}
    </div>
  );
}
