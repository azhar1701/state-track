# Pembaruan Dependensi

Dokumen ini menjelaskan cara memantau dan mengelola pembaruan dependensi di repo ini.

## Otomatis via Dependabot

- File konfigurasi: `.github/dependabot.yml`.
- Dependabot akan membuat PR mingguan untuk update npm dan GitHub Actions.
- Paket tertentu dikelompokkan (Vite, ESLint/TypeScript, Tailwind/PostCSS, minor/patch).

## Alternatif: Renovate (opsional)

- File konfigurasi: `renovate.json`.
- Untuk mengaktifkan, install GitHub App “Renovate” di repository/organization Anda.
- Renovate menawarkan grouping, schedule, dan kontrol lebih lanjut.

## Checklist saat review PR update

1. Baca release notes paket utama (React, Vite, Tailwind, Supabase, Leaflet, RHF, Zod).
2. Jalankan pemeriksaan lokal cepat:
   - `npm ci`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
   - `npm run build`
3. Cek UI kritikal (auth, kirim laporan, peta) di preview build.
4. Jika ada breaking change, buat catatan migrasi singkat di PR.

## CI

Workflow GitHub Actions `CI` akan menjalankan typecheck, lint, build, dan test otomatis pada PR dan push ke branch `v.0.1`.
