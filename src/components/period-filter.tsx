'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Period {
  id: string; // "YYYY-MM"
  year: number;
  month: number;
}

interface PeriodFilterProps {
  periods: Period[];
  currentPeriod?: string;
}

export function PeriodFilter({ periods, currentPeriod }: PeriodFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePeriodChange = (periodId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (periodId === periods[0].id) {
      // Default period (latest) - remove parameter
      params.delete('period');
    } else {
      params.set('period', periodId);
    }
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  const formatPeriod = (period: Period): string => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[period.month - 1]} ${period.year}`;
  };

  return (
    <div className="mb-6">
      <label htmlFor="period-select" className="block text-sm font-medium text-gray-700 mb-2">
        Periode
      </label>
      <select
        id="period-select"
        value={currentPeriod || periods[0]?.id || ''}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className="block w-full min-h-12 px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {periods.map((period) => (
          <option key={period.id} value={period.id}>
            {formatPeriod(period)}
          </option>
        ))}
      </select>
      <p className="mt-1 text-sm text-gray-500">
        Pilih periode untuk melihat pergerakan kepemilikan
      </p>
    </div>
  );
}
