# IDX Ownership Visualizer

## What This Is

Website publik untuk visualisasi data kepemilikan 1% saham IDX (Bursa Efek Indonesia). Data diambil dari PDF yang dirilis IDX bulanan, diekstrak dan disimpan dalam database untuk mendukung analisa historis dan deteksi akumulasi/disposal.

## Core Value

**Menyediakan akses instan dan terstruktur ke data kepemilikan 1% saham IDX untuk mendeteksi accumulation pattern dan quick lookup pemegang saham.**

Tanpa tools ini, user harus download dan scan PDF manual dari website IDX setiap bulan.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **PDF Extraction** — Extract data kepemilikan 1% dari PDF IDX bulanan
- [ ] **Per Emiten View** — Tampilkan list emiten dengan top 5-10 pemegang saham terbesar
- [ ] **Per Pemegang View** — Tampilkan list semua saham yang dihold oleh pemegang tertentu
- [ ] **Historical Comparison** — Tampilkan perubahan kepemilikan (accumulation/disposal) vs periode sebelumnya
- [ ] **Search & Filter** — Searchable, sortable, dan filterable tables
- [ ] **Full History Storage** — Simpan data historis untuk trend analysis
- [ ] **Monthly Update Workflow** — System untuk input/update data bulanan
- [ ] **Public Access** — Website dapat diakses publik tanpa login

### Out of Scope

- [Real-time notification] — Data diupdate bulanan, tidak real-time
- [Portfolio tracking] — Focus pada data kepemilikan, buat portfolio management
- [Trading signals] — Menyediakan data, bukan rekomendasi trading
- [User authentication] — Public website tanpa login
- [Comment/Discussion] — Hanya visualisasi data, tanpa fitur sosial

## Context

### Data Source
- IDX merilis data kepemilikan 1% dalam format PDF bulanan
- PDF berisi list pemegang saham dengan jumlah kepemilikan untuk setiap emiten
- Perlu extraction/parsing untuk mengubah PDF menjadi data terstruktur

### Use Cases
1. **Accumulation Detection** — Melihat siapa yang sedang akumulasi atau disposal saham tertentu
2. **Quick Lookup** — Mencari tahu siapa pemegang besar di saham yang diminati
3. **Historical Analysis** — Melihat trend kepemilikan dari waktu ke waktu
4. **Sector Analysis** — Membandingkan kepemilikan antar emiten atau sektor

### Target Users
- Investor/trader saham Indonesia yang butuh akses cepat ke data kepemilikan
- Analisis yang memantau pattern accumulation/distribution
- Siapa saja yang ingin research kepemilikan saham tanpa download PDF manual

## Constraints

- **Tech Stack**: Next.js untuk frontend — Reputasi Vercel deployment dan SEO-friendly
- **Deployment**: Vercel (user akan provide akses)
- **Database Required**: Full history storage untuk historical comparison
- **Update Frequency**: Bulanan (manual input dari PDF IDX)
- **Data Format**: PDF extraction capability required
- **Access Level**: Public, no authentication

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js Framework | Rekomendasi user + great for Vercel deployment, SEO-friendly untuk public site | — Pending |
| Full History Storage | Enable historical comparison dan trend analysis | — Pending |
| Public Access | Simplify development, maximize reach | — Pending |

## Current Milestone: v1.1 Lineage & Entity Linking

**Goal:** Memungkinkan user menelusuri kepemilikan berdasarkan orang/entitas — bukan hanya nama holder individual, tapi grup entitas yang terhubung ke satu orang nyata.

**Target features:**
- Fix parsing nama holder (nama kepotong di PDF extraction)
- Fuzzy/partial search yang cerdas di seluruh holder
- Entity grouping: manual tagging alias → satu "orang"
- Aggregate view: total kepemilikan gabungan per emiten
- Network visual: grafik hubungan holder ↔ emiten

---
*Last updated: 2026-03-15 after milestone v1.1 start*
