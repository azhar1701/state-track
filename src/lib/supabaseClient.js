// src/lib/supabase-client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
 
// Ambil URL dan Anon Key dari environment variables yang sudah di-prefix NEXT_PUBLIC_
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
 
// Validasi apakah variabel lingkungan sudah diset dengan benar saat aplikasi berjalan
// (Pengecekan ini lebih efektif saat runtime di mana process.env sudah terisi)
if (!supabaseUrl) {
  throw new Error(
    "Supabase URL tidak ditemukan. Pastikan NEXT_PUBLIC_SUPABASE_URL sudah diset dengan benar di file .env.local Anda."
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "Supabase Anon Key tidak ditemukan. Pastikan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diset dengan benar di file .env.local Anda."
  );
}
 
// Buat dan ekspor satu instance Supabase client
// Memberikan tipe SupabaseClient secara eksplisit membantu dengan type-safety
// Jika Anda telah men-generate tipe dari skema database Supabase Anda (misalnya, menggunakan `supabase gen types typescript`),
// Anda bisa menggunakannya di sini untuk client yang lebih type-safe lagi:
// import { Database } from '../types/supabase'; // Sesuaikan path ke tipe Database Anda
// export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey);
 
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
 
// Komentar untuk pengingat jika ingin menggunakan tipe database spesifik:
// Untuk menggunakan client dengan tipe database spesifik dari Supabase (hasil generate `supabase gen types typescript --project-id <ref> --schema public > types/supabase.ts`):
// 1. Pastikan Anda sudah generate file `types/supabase.ts`.
// 2. Ubah dua baris di atas (export const supabase) menjadi:
//    import { Database } from '@/types/supabase'; // Sesuaikan path jika perlu, @/ biasanya ke src/
//    export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
// Ini akan memberikan auto-completion dan type-checking yang lebih baik untuk nama tabel dan kolom Anda.