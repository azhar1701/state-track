// src/lib/supabase-client.js
// NOTE: File ini tidak digunakan. Gunakan @/services/client sebagai gantinya.
// File ini disimpan untuk referensi saja.

import { createClient } from '@supabase/supabase-js';
 
// Ambil URL dan Anon Key dari environment variables Vite (import.meta.env)
// Vite hanya mengekspos variabel yang dimulai dengan VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 
// Validasi apakah variabel lingkungan sudah diset dengan benar saat aplikasi berjalan
if (!supabaseUrl) {
  console.warn(
    "Supabase URL tidak ditemukan. Pastikan VITE_SUPABASE_URL sudah diset dengan benar di file .env.local Anda."
  );
}
if (!supabaseAnonKey) {
  console.warn(
    "Supabase Anon Key tidak ditemukan. Pastikan VITE_SUPABASE_PUBLISHABLE_KEY sudah diset dengan benar di file .env.local Anda."
  );
}
 
// Buat dan ekspor satu instance Supabase client hanya jika kedua variabel tersedia
// Jika tidak tersedia, return null untuk menghindari error runtime
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
 
// Komentar untuk pengingat jika ingin menggunakan tipe database spesifik:
// Untuk menggunakan client dengan tipe database spesifik dari Supabase (hasil generate `supabase gen types typescript --project-id <ref> --schema public > types/supabase.ts`):
// 1. Pastikan Anda sudah generate file `types/supabase.ts`.
// 2. Ubah dua baris di atas (export const supabase) menjadi:
//    import { Database } from '@/types/supabase'; // Sesuaikan path jika perlu, @/ biasanya ke src/
//    export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
// Ini akan memberikan auto-completion dan type-checking yang lebih baik untuk nama tabel dan kolom Anda.