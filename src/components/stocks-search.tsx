'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

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

interface StocksSearchProps {
  initialStockQuery?: string;
  initialHolderQuery?: string;
}

export function StocksSearch({
  initialStockQuery = '',
  initialHolderQuery = '',
}: StocksSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stockQuery, setStockQuery] = useState(initialStockQuery);
  const [holderQuery, setHolderQuery] = useState(initialHolderQuery);

  // Debounced update function (300ms delay)
  const debouncedUpdate = useDebounce((stock: string, holder: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update or remove stock query
    if (stock) {
      params.set('q', stock);
    } else {
      params.delete('q');
    }

    // Update or remove holder query
    if (holder) {
      params.set('holder', holder);
    } else {
      params.delete('holder');
    }

    // Preserve sort parameters if they exist
    const sort = searchParams.get('sort');
    const order = searchParams.get('order');
    if (sort) params.set('sort', sort);
    if (order) params.set('order', order);

    // Navigate with new params
    router.push(`?${params.toString()}`, { scroll: false });
  }, 300);

  // Update URL when queries change (debounced)
  useEffect(() => {
    debouncedUpdate(stockQuery, holderQuery);
  }, [stockQuery, holderQuery, debouncedUpdate]);

  // Clear all filters
  const handleClear = () => {
    setStockQuery('');
    setHolderQuery('');

    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('holder');

    // Preserve sort parameters
    const sort = searchParams.get('sort');
    const order = searchParams.get('order');
    if (sort) params.set('sort', sort);
    if (order) params.set('order', order);

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const hasActiveFilters = stockQuery || holderQuery;

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stock code search */}
        <div>
          <label htmlFor="stock-search" className="block text-sm font-medium text-gray-700 mb-1">
            Cari Kode Saham
          </label>
          <input
            id="stock-search"
            type="text"
            value={stockQuery}
            onChange={(e) => setStockQuery(e.target.value)}
            placeholder="Contoh: TLKM, BBCA"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Holder name search */}
        <div>
          <label htmlFor="holder-search" className="block text-sm font-medium text-gray-700 mb-1">
            Cari Nama Pemegang
          </label>
          <input
            id="holder-search"
            type="text"
            value={holderQuery}
            onChange={(e) => setHolderQuery(e.target.value)}
            placeholder="Contoh: BCA, Pemerintah"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Clear button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={handleClear}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Hapus Filter
          </button>
        </div>
      )}
    </div>
  );
}
