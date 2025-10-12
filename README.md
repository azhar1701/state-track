# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/df59a3b0-9f65-4418-a053-973f630a6512

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/df59a3b0-9f65-4418-a053-973f630a6512) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:


# state-track

Important notes for this Vite + React app:

- The `app/` folder contains some Next.js-style examples (pages and `app/api/*`). In this project they are placeholders only and are not executed by Vite. Actual pages are under `src/pages/*` and routing is handled by `react-router-dom`.
- Submissions use Supabase directly from the client (see `src/pages/ReportForm.tsx`). The `app/api/reports/route.ts` file is not used in this setup. If you want a server endpoint under Vite, use a separate server or functions platform.
- Configure environment variables in a `.env.local` file at the project root:
	- VITE_SUPABASE_URL
	- VITE_SUPABASE_PUBLISHABLE_KEY
	- VITE_MAPBOX_TOKEN (optional, for Mapbox-based form in components/report)

Dev scripts:

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run typecheck` - TypeScript checks only
- `npm run lint` - ESLint

This app is installable and works offline for key routes thanks to Vite PWA.

- Install: In supported browsers, use the browser menu “Install app” or the install prompt.
- Offline: Static assets and core pages are cached. Data APIs require connectivity.
- Update: The service worker auto-updates; a reload will activate new versions.

## Keyboard shortcuts

- Open Command Menu: Ctrl+K (Windows/Linux) or Cmd+K (macOS)
- Toggle theme: Available in Navbar and Command Menu

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/df59a3b0-9f65-4418-a053-973f630a6512) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Local setup and environment

Create `.env.local` at project root (copy from `.env.local.example`) and fill:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_ADMIN_EMAILS (optional; fallback allowlist for admin)
- VITE_MAPBOX_TOKEN (optional; only for the example Mapbox form under `components/report`)

Then install dependencies and run the app.

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
