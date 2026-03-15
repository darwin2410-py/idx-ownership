'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function EntityCreateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameError(null);
    setNetworkError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (res.status === 201) {
        setName('');
        setDescription('');
        router.refresh();
        return;
      }

      if (res.status === 409) {
        setNameError('Nama entitas sudah digunakan');
        return;
      }

      // Other error
      setNetworkError('Terjadi kesalahan, coba lagi');
    } catch {
      setNetworkError('Terjadi kesalahan, coba lagi');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-4 mb-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Buat Entitas Baru</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Nama Entitas */}
        <div>
          <label
            htmlFor="entity-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nama Entitas <span className="text-red-500">*</span>
          </label>
          <input
            id="entity-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            placeholder="Contoh: Hartono Family"
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-12 ${
              nameError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {nameError && (
            <p className="mt-1 text-sm text-red-600">{nameError}</p>
          )}
        </div>

        {/* Deskripsi (optional) */}
        <div>
          <label
            htmlFor="entity-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Deskripsi <span className="text-gray-400 text-xs">(opsional)</span>
          </label>
          <textarea
            id="entity-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Deskripsi singkat tentang entitas ini"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {networkError && (
        <p className="mt-2 text-sm text-red-600">{networkError}</p>
      )}

      <div className="mt-4">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-12"
        >
          {isLoading ? 'Menyimpan...' : 'Buat Entitas'}
        </button>
      </div>
    </form>
  );
}
