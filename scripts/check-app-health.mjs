import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[health] Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function headCount(table, cols = '*') {
  try {
    const { count, error } = await supabase.from(table).select(cols, { count: 'exact', head: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: typeof count === 'number' ? count : null };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

async function sampleSelect(table, cols, limit = 1) {
  try {
    const { data, error } = await supabase.from(table).select(cols).limit(limit);
    if (error) return { ok: false, error: error.message };
    return { ok: true, sample: data };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

async function run() {
  const results = {};
  // Basic reachability: a cheap call
  results.reports_head = await headCount('reports', 'id');
  results.reports_sample = await sampleSelect('reports', 'id,title,category,status,created_at', 1);

  // Schema presence checks (best-effort; may be denied by RLS)
  results.report_logs_head = await headCount('report_logs', 'id');
  results.geo_layers_head = await headCount('geo_layers', 'key');
  results.filter_presets_head = await headCount('filter_presets', 'id');
  results.kecamatan_head = await headCount('kecamatan', 'id');
  results.desa_head = await headCount('desa', 'id');

  // Column presence probe via select; if column missing, error tells us
  results.reports_columns_probe = await sampleSelect(
    'reports',
    'id,severity,incident_date,reporter_name,phone,kecamatan,desa,photo_url,photo_urls,resolution',
    1
  );

  // Summarize
  const summary = Object.entries(results).reduce((acc, [k, v]) => {
    acc[k] = v;
    return acc;
  }, {});

  // Pretty print
  console.log('=== Supabase App Health ===');
  for (const [k, v] of Object.entries(summary)) {
    if (v && v.ok === true) {
      console.log(`✔ ${k}`, 'count' in v && v.count !== null ? `(count=${v.count})` : '', 'sample' in v && v.sample ? '(sample ok)' : '');
    } else if (v && v.ok === false) {
      console.log(`✖ ${k}`, '-', v.error);
    } else {
      console.log(`? ${k}`);
    }
  }

  // Exit non-zero if critical probes fail
  const critical = ['reports_head'];
  const failed = critical.some((c) => !results[c]?.ok);
  process.exit(failed ? 2 : 0);
}

run().catch((e) => { console.error(e); process.exit(2); });
