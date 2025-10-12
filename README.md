# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/df59a3b0-9f65-4418-a053-973f630a6512

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/df59a3b0-9f65-4418-a053-973f630a6512) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

This project is built with:
# state-track

Important notes for this Vite + React app:

- The `app/` folder contains some Next.js-style examples (pages and `app/api/*`). In this project they are placeholders only and are not executed by Vite. Actual pages are under `src/pages/*` and routing is handled by `react-router-dom`.
- Submissions use Supabase directly from the client (see `src/pages/ReportForm.tsx`). The `app/api/reports/route.ts` file is not used in this setup. If you want a server endpoint under Vite, use a separate server or functions platform.
	- VITE_SUPABASE_PUBLISHABLE_KEY
	- VITE_MAPBOX_TOKEN (optional, for Mapbox-based form in components/report)

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run typecheck` - TypeScript checks only
- `npm run lint` - ESLint

- Install: In supported browsers, use the browser menu “Install app” or the install prompt.
- Offline: Static assets and core pages are cached. Data APIs require connectivity.
## Keyboard shortcuts

- Open Command Menu: Ctrl+K (Windows/Linux) or Cmd+K (macOS)
- Toggle theme: Available in Navbar and Command Menu

## How can I deploy this project?

## Can I connect a custom domain to my Lovable project?
Yes, you can!

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)


Create `.env.local` at project root (copy from `.env.local.example`) and fill:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_ADMIN_EMAILS (optional; fallback allowlist for admin)
- VITE_MAPBOX_TOKEN (optional; only for the example Mapbox form under `components/report`)

Then install dependencies and run the app.

For Node scripts (health checks, seeding), create `.env` (copy from `.env.example`) with:

- SUPABASE_URL
- SUPABASE_ANON_KEY (for health/storage checks)
- SUPABASE_SERVICE_ROLE_KEY (for seed scripts that upsert; keep secret!)
- REPORT_BUCKET (optional, default: `report-photos`)

Notes:

- Do NOT commit real keys. `.gitignore` already ignores `.env*`.
- Client-side app only reads `VITE_*` variables; server-side scripts read from `.env` (via `dotenv`).

Quick setup (Windows PowerShell):

```powershell
./scripts/setup-env.ps1
# then edit .env.local and .env with your values
```

### Env Troubleshooting

Gejala umum dan cara mengatasinya:

1) Pesan: "Supabase belum dikonfigurasi. Set VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di .env.local"
- Penyebab: `.env.local` belum dibuat atau variabel belum terisi.
- Solusi: Salin `.env.local.example` → `.env.local`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`, lalu restart dev server.

2) Auth gagal atau redirect tidak sesuai setelah login
- Penyebab: Role admin tidak terbaca (tabel `user_roles` belum ada/terisi), atau fallback allowlist belum diisi.
- Solusi: Pastikan migrasi Supabase sudah diterapkan (lihat bagian migrasi). Isi `VITE_ADMIN_EMAILS` dengan email admin jika perlu fallback.

3) Upload foto gagal: peringatan policy atau bucket tidak ditemukan
- Penyebab: Bucket Storage `report-photos` belum dibuat atau kebijakan (RLS) tidak mengizinkan.
- Solusi: Buat bucket public `report-photos` sesuai migrasi/policy. Uji dengan skrip:

```powershell
node scripts/check-storage-upload.mjs
```

4) Error saat memuat data: kolom tidak ditemukan (schema mismatch)
- Penyebab: Migrasi belum diterapkan lengkap di Supabase (kolom opsional: `photo_urls`, `incident_date`, `severity`, `resolution`, dll.).
- Solusi: Terapkan migrasi SQL di folder `supabase/migrations`. Aplikasi akan coba fallback select minimal, tetapi sebaiknya sinkronkan skema penuh.

5) Health check gagal dengan pesan missing env
- Penyebab: `.env` untuk skrip Node belum diisi `SUPABASE_URL`/`SUPABASE_ANON_KEY`.
- Solusi: Salin `.env.example` → `.env` dan isi, lalu jalankan:

```powershell
node scripts/check-app-health.mjs
```

6) Mapbox tidak berfungsi (jika pakai form contoh Mapbox)
- Penyebab: `VITE_MAPBOX_TOKEN` belum diisi.
- Solusi: Tambahkan token Mapbox ke `.env.local` (opsional, hanya untuk komponen terkait).

Tips cepat:
- Pastikan kunci client (yang diawali `VITE_`) hanya di `.env.local`. Kunci rahasia (service role) hanya di `.env` untuk skrip server-side; jangan pernah dipakai di kode browser.
- Setelah mengubah `.env.local`, hentikan dan jalankan ulang dev server agar variabel termuat ulang.

## Database migrations checklist (Supabase)

Apply migrations in `supabase/migrations` using Supabase SQL editor or CLI. Ensure the following exist:

- Tables: `reports`, `profiles`, `user_roles`, `report_logs`, `kecamatan`, `desa`
- Enums: `report_status` (baru|diproses|selesai), `report_category` (jalan|jembatan|irigasi|drainase|sungai|lainnya), `report_severity` (ringan|sedang|berat)
- Columns on `reports`: `incident_date`, `photo_urls` (jsonb), `severity`, `reporter_name`, `phone`, `kecamatan`, `desa`, `resolution`
- Storage bucket: `report-photos` (public) with policies from initial migration

Optional seeds for wilayah Ciamis tersedia di folder `supabase/seed/ciamis` dan skrip `scripts/seed-ciamis.mjs`.

## Offline & Outbox

Jika koneksi internet tidak tersedia saat submit laporan, data akan disimpan ke Outbox (IndexedDB) dan dikirim otomatis saat online. Service Worker juga mendaftarkan Background Sync dengan tag `submit-reports` bila browser mendukung.

## Testing

Proyek ini menggunakan Vitest untuk unit test ringan.

- Jalankan semua test: `npm run test`
- Mode watch: `npm run test:watch`

Catatan: Test environment menggunakan `jsdom` dan polyfill IndexedDB via `fake-indexeddb` untuk menguji Outbox.

---

## Stack & Teknologi (Bahasa Indonesia)

Ringkasan teknologi yang digunakan untuk membangun aplikasi ini:

- Frontend: React 18 + TypeScript, dibangun dengan Vite 7 (plugin React SWC)
- UI/Styling: Tailwind CSS 3 + shadcn/ui (berbasis Radix UI) + lucide-react (ikon) + sonner (toast)
- Routing: react-router-dom v6 (lazy routes + Suspense)
- Peta: Leaflet + react-leaflet, plugin leaflet.heat & leaflet.markercluster; caching tile OSM via Service Worker
- Form & Validasi: react-hook-form + zod melalui @hookform/resolvers
- Backend (BaaS): Supabase (Auth, Postgres, Storage). Skema DB dikelola via migrasi di `supabase/migrations/`
- PWA & Offline: vite-plugin-pwa (InjectManifest) + Workbox (precache, runtime caching, background sync trigger)
- Outbox: IndexedDB via `idb` untuk antrean submit laporan saat offline
- Geospasial & Utilitas: @turf/turf, proj4, shpjs, html2canvas, jsPDF + autotable
- Testing & Kualitas: Vitest + jsdom + fake-indexeddb; ESLint 9 + typescript-eslint; TypeScript 5

Detail implementasi:

- Entry app ada di `src/main.tsx`, root komponen `src/App.tsx`. Alias path `@` → `./src`.
- Service Worker `src/sw.ts` melakukan precache, runtime caching (assets, data *.geojson, dan tile OSM) serta fallback tile SVG saat offline.
- Outbox (`src/lib/outbox.ts`) menyimpan laporan di IndexedDB dan mendaftarkan Background Sync (`submit-reports`) bila didukung.
- Hook `useOutboxSync` memproses antrean saat online atau saat menerima pesan `sync:submit-reports` dari Service Worker.
- Integrasi Supabase di `src/integrations/supabase/client.ts` (dengan stub aman jika ENV belum diisi) dan tipe DB di `src/integrations/supabase/types.ts`.
- Halaman admin menggunakan komponen shadcn/ui (Tabs, Select, Dialog, dll) dan mendukung ekspor CSV serta ekspor peta (`html2canvas`).

## Arsitektur Singkat

- UI berbasis komponen React + Tailwind/shadcn. Routing dilakukan di `App.tsx` dengan `react-router-dom` (lazy-loaded).
- Autentikasi via Supabase Auth; role admin dicek di tabel `user_roles` (fallback allowlist email via ENV `VITE_ADMIN_EMAILS`).
- Data laporan (tabel `reports`) diakses langsung dari klien melalui Supabase; foto diunggah ke Storage bucket `report-photos` lalu URL publik disimpan ke DB.
- PWA meng-cache aset dan data peta untuk pengalaman offline; Outbox memastikan laporan tetap tersimpan dan akan dikirim otomatis saat koneksi pulih.

## Cara Setup & Menjalankan (Windows PowerShell)

1) Prasyarat

- Node.js LTS dan npm terpasang.
- Buat file `.env.local` di root project dengan isi minimal:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-publishable-key>
# Opsional
VITE_ADMIN_EMAILS=admin@example.com,another@example.com
```

2) Instalasi dependencies

```powershell
npm install
```

3) Menjalankan development server

```powershell
npm run dev
```

Server Vite default pada project ini menggunakan port 8080 (lihat `vite.config.ts`).

4) Build produksi & preview lokal

```powershell
npm run build
npm run preview
```

5) Perintah tambahan yang berguna

```powershell
# Cek tipe TypeScript (tanpa emit)
npm run typecheck

# Lint kode
npm run lint

# Jalankan test
npm run test
```

Jika Anda ingin menguji PWA offline, gunakan `npm run preview` lalu buka di browser yang mendukung Service Worker, install app, dan coba matikan koneksi untuk melihat caching berjalan (tile OSM juga di-cache dengan batasan umur/kuota).

