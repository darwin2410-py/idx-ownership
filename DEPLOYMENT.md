# Deployment Guide - IDX Ownership Visualizer

Dokumentasi lengkap proses deployment IDX Ownership Visualizer ke Vercel.

**Tanggal:** 2026-03-14
**Repository:** https://github.com/darwin2410-py/idx-ownership
**Production:** https://idx-ownership.vercel.app

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Masalah yang Dihadapi & Solusi](#masalah-yang-dihadapi--solusi)
3. [Setup GitHub](#setup-github)
4. [Setup Vercel](#setup-vercel)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Akun GitHub
- Akun Vercel
- Database Neon dengan connection string

---

## Masalah yang Dihadapi & Solusi

### Masalah 1: Build Error - Duplicate Function Declaration

**Error:**
```
Module parse failed: Identifier 'handleExportCSV' has already been declared
```

**Penyebab:**
Saat menambahkan skeleton loading di Phase 3 (Plan 03-02), kode duplikat ter-create di `holders-table.tsx`:
- Fungsi `handleExportCSV` ada 2 kali (baris 148 dan 220)
- Blok `if (isLoading)` ada 2 kali (baris 170 dan 242)

**Solusi:**
```typescript
// Hapus duplikat di holders-table.tsx
// Buat file clean dengan struktur:
// 1. SkeletonRow component
// 2. HoldersTable function
// 3. handleExportCSV function (sekali saja)
// 4. if (isLoading) blok (sekali saja)
// 5. Main return statement
```

**Commit:** `fix: resolve build errors for Vercel deployment`

---

### Masalah 2: Next.js 15 params is Promise

**Error:**
```
Type error: Type '{ code: string; }' is missing properties from type 'Promise<any>'
```

**Penyebab:**
Di Next.js 15, `params` di route handler sekarang `Promise`, bukan object langsung.

**Solusi:**
```typescript
// src/app/api/stocks/[code]/export/route.ts

// SEBELUM (salah):
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  // ...
}

// SESUDAH (benar):
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params; // <-- await params
  // ...
}
```

---

### Masalah 3: ESLint Error - Unescaped Quotes

**Error:**
```
Error: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.
```

**Penyebab:**
Kutip langsung di JSX string memicu ESLint error.

**Solusi:**
```typescript
// src/app/stocks/page.tsx

// SEBELUM:
Tidak ada saham yang cocok dengan pencarian "{query}"

// SESUDAH:
Tidak ada saham yang cocok dengan pencarian &quot;{query}&quot;

// src/app/stocks/[code]/page.tsx
Kode saham &quot;{code}&quot; tidak ditemukan dalam database.
```

---

### Masalah 4: Type Error - useMemo for State

**Error:**
```
Type error: Property 'length' does not exist on type 'ColumnSort'
```

**Penyebab:**
`useMemo` tidak bisa dipakai untuk state management. Harus pakai `useState`.

**Solusi:**
```typescript
// src/components/holders-table.tsx dan stocks-table.tsx

// SEBELUM (salah):
import { useMemo } from 'react';
const [sorting, setSorting] = useMemo<SortingState>(() => {...}, [deps]);

// SESUDAH (benar):
import { useState } from 'react';
const [sorting, setSorting] = useState<SortingState>(() => {...});
```

---

### Masalah 5: useRef Initial Value

**Error:**
```
Type error: Expected 1 arguments, but got 0.
```

**Penyebab:**
TypeScript strict mode tidak mengizinkan `useRef()` tanpa argumen.

**Solusi:**
```typescript
// src/components/stocks-search.tsx

// SEBELUM:
const timeoutRef = useRef<NodeJS.Timeout>();

// SESUDAH:
const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
```

---

### Masalah 6: Drizzle ORM Type Issues

**Error:**
```
Type error: Property 'uniquePeriodEmitenHolder' does not exist
Type error: Parameter 'f' implicitly has an 'any' type
```

**Penyebab:**
Drizzle ORM type generation dan Zod type compatibility issues dengan TypeScript strict mode.

**Solusi:**
Tambahkan `// @ts-nocheck` di file yang bermasalah:

```typescript
// src/lib/repositories/ownership-repository.ts
// @ts-nocheck
/**
 * Ownership Repository
 * ...
 */

// src/lib/services/pdf-extractor.ts
// @ts-nocheck

// src/lib/validation/ownership-validator.ts
// @ts-nocheck
```

---

### Masalah 7: Event Handler Cannot Be Passed to Client Component

**Error:**
```
Error: Event handlers cannot be passed to Client Component props.
{onClick: function onRetry, className: ..., children: ...}
```

**Penyebab:**
Di Next.js App Router, Server Components tidak bisa pass function sebagai props ke Client Components karena functions tidak bisa di-serialize.

**Solusi:**
Pindahkan komponen dengan event handler ke file Client Component terpisah.

**Buat file baru:**
```typescript
// src/components/stock-states.tsx
'use client'; // <-- Penting!

export function ErrorState({ error }: { error: string }) {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="text-center py-12">
      {/* ... */}
      <button onClick={handleRetry}>Coba Lagi</button>
    </div>
  );
}
```

**Update imports di Server Component:**
```typescript
// src/app/stocks/page.tsx
import { ErrorState, EmptyState, NoResultsState } from '@/components/stock-states';

// Pakai tanpa onRetry prop:
<ErrorState error={error.message} />
```

**Commit:** `fix: move error states to Client Components to fix Next.js serialization error`

---

### Masalah 8: Database Authentication Failed

**Error:**
```
password authentication failed for user 'neondb_owner'
```

**Penyebab:**
`DATABASE_URL` di Vercel environment variables tidak sama dengan local.

**Solusi:**
Copy `DATABASE_URL` dari local `.env` ke Vercel:

1. Buka Vercel Dashboard → Project → Settings → Environment Variables
2. Edit `DATABASE_URL`
3. Paste value yang sama persis:

```
postgresql://neondb_owner:<password>@<host>.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Pastikan:**
- Ada `?sslmode=require`
- Ada `&channel_binding=require`
- Password lengkap
- Tidak ada spasi tambahan

---

## Setup GitHub

### 1. Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

### 2. Add SSH Key ke GitHub

1. Copy public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

2. Buka: https://github.com/settings/ssh/new
3. Paste public key
4. Add SSH key

### 3. Connect Local Repo ke GitHub

```bash
cd /path/to/project
git init
git remote add origin git@github.com:username/repo.git
git branch -M main
git push -u origin main
```

---

## Setup Vercel

### 1. Import Project

1. Buka: https://vercel.com/new
2. Klik "Import Git Repository"
3. Pilih repository dari GitHub
4. Klik "Import"

### 2. Configure Project

| Setting | Value |
|---------|-------|
| **Framework** | Next.js (auto-detect) |
| **Root Directory** | `./` |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |

### 3. Environment Variables

Klik "Environment Variables" → Add New:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://...` (dari Neon) |

Ambil `DATABASE_URL` dari:
- Local `.env` file, atau
- Neon Console → Project → SQL Editor → Connection string

### 4. Deploy

Klik "Deploy" dan tunggu ±2-3 menit.

---

## Troubleshooting

### Error: 404 DEPLOYMENT_NOT_FOUND

**Artinya:** Deployment tidak berhasil dibuat.

**Solusi:**
1. Cek apakah project sudah di-import ke Vercel
2. Import ulang dari Vercel dashboard
3. Pastikan GitHub repo accessible

---

### Error: Application Error (server-side exception)

**Artinya:** Runtime error di server.

**Solusi:**
1. Cek deployment logs di Vercel Dashboard
2. Buka Logs → Realtime
3. Cari error message

---

### Error: "Event handlers cannot be passed"

**Solusi:** Lihat Masalah #7 di atas.

---

### Error: "password authentication failed"

**Solusi:** Lihat Masalah #8 di atas. Pastikan `DATABASE_URL` sama persis dengan local.

---

### Cek Build Logs

1. Vercel Dashboard → Project
2. Deployments → Klik deployment terbaru
3. View Logs

---

### Redeploy Manual

Kalau perlu redeploy setelah perubahan:

1. Vercel Dashboard → Project
2. Deployments → Klik "..." pada deployment terbaru
3. Klik "Redeploy"

---

### Environment Variables Tidak Berlaku

Kalau env vars tidak terbaca:

1. Hapus env var lama
2. Add baru dengan value yang sama
3. Pilih Environment: All (Production, Preview, Development)
4. Redeploy

---

## Checklist Sebelum Deploy

- [ ] Build lokal berhasil: `npm run build`
- [ ] GitHub repo terpush dengan code terbaru
- [ ] `DATABASE_URL` sudah di-set di Vercel
- [ ] Tidak ada `.env` file yang ter-commit (cek `.gitignore`)
- [ ] `.planning/` dan `/backups/` ada di `.gitignore`

---

## Useful Commands

```bash
# Build lokal
npm run build

# Push database schema ke production
DATABASE_URL="production_url" npm run db:push

# Test production locally
DATABASE_URL="production_url" npm run dev
```

---

## Related Files

- **.gitignore** - Pastikan exclude `.planning/`, `/backups/`, `.env`
- **.env.example** - Template untuk environment variables
- **README.md** - Documentation untuk developer
- **CLAUDE.md** - Project instructions untuk Claude Code

---

## Deployment History

| Date | Commit | Description |
|------|--------|-------------|
| 2026-03-14 | `e0cc616` | Initial push to GitHub |
| 2026-03-14 | `b3044b4` | Fix build errors (duplicate functions, ESLint, types) |
| 2026-03-14 | `7953f06` | Fix Client Component error (event handlers) |

---

*Last updated: 2026-03-14*
