import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BUCKET = process.env.REPORT_BUCKET || 'report-photos';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[storage] Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probe() {
  const path = `health/${Date.now()}_probe.txt`;
  try {
    const data = new TextEncoder().encode('health-check');
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, data, { contentType: 'text/plain', upsert: false });
    if (error) throw error;
    // cleanup best-effort (may require delete policy)
    try { await supabase.storage.from(BUCKET).remove([path]); } catch {}
    console.log(`✔ Upload OK to bucket "${BUCKET}" (anon)`);
    process.exit(0);
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    if (/bucket/i.test(msg) && /not/i.test(msg)) {
      console.log(`✖ Bucket "${BUCKET}" tidak ditemukan. Buat bucket public bernama "${BUCKET}" di Supabase Storage.`);
      process.exit(2);
    }
    if (/not allowed|permission|forbidden|policy/i.test(msg)) {
      console.log(`⚠ Upload ditolak (policy). Bucket ada, namun kebijakan tidak mengizinkan anon upload.`);
      process.exit(3);
    }
    console.log(`✖ Upload gagal: ${msg}`);
    process.exit(4);
  }
}

probe();
