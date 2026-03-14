import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Tentang
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Visualisasi data kepemilikan 1% saham IDX untuk mendeteksi pola akumulasi dan disposisi investor besar.
            </p>
          </div>

          {/* FAQ Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              FAQ
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-900">Sumber data dari mana?</dt>
                <dd className="text-sm text-gray-600 mt-1">
                  Data diambil dari file PDF bulanan yang dirilis oleh Bursa Efek Indonesia (IDX) berisi daftar pemegang saham di atas 1%.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-900">Seberapa sering data diperbarui?</dt>
                <dd className="text-sm text-gray-600 mt-1">
                  Data diperbarui setiap bulan setelah IDX merilis file PDF kepemilikan saham bulanan, biasanya pada minggu kedua.
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-900">Apakah data ini akurat?</dt>
                <dd className="text-sm text-gray-600 mt-1">
                  Data diekstrak otomatis dari PDF resmi IDX. Kami berupaya menjaga akurasi, namun selalu rujuk ke sumber resmi untuk keputusan investasi.
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Tautan
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/stocks" className="text-sm text-gray-600 hover:text-gray-900">
                  Daftar Saham
                </Link>
              </li>
              <li>
                <a
                  href="https://www.idx.co.id/data-pasar/laporan-statistik/kepemilikan-saham-1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sumber Data IDX
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>Disclaimer:</strong> Informasi yang disajikan dalam website ini hanya untuk tujuan informasi dan tidak merupakan rekomendasi investasi. Data kepemilikan saham adalah salah satu faktor dalam analisis investasi, bukan satu-satunya pertimbangan. Selalu lakukan riset mandiri dan konsultasikan dengan penasihat keuangan profesional sebelum membuat keputusan investasi. Kami tidak bertanggung jawab atas kerugian yang timbul dari penggunaan informasi ini.
          </p>
        </div>

        {/* Credits */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
          <p>
            Dibuat dengan ❤️ untuk komunitas investor Indonesia
          </p>
          <p className="mt-2 sm:mt-0">
            © {currentYear} IDX Ownership Visualizer. Data bersumber dari IDX.
          </p>
        </div>
      </div>
    </footer>
  );
}
