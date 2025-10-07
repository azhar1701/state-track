import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(',').map((h) => h.trim());
  return rows.map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] ?? ''));
    return obj;
  });
}

async function upsertKecamatan(csvPath) {
  const rows = readCSV(csvPath);
  if (rows.length === 0) return;
  for (const chunk of chunked(rows, 100)) {
    const { error } = await supabase.from('kecamatan').upsert(chunk, { onConflict: 'name' });
    if (error) throw error;
  }
  console.log(`Upserted ${rows.length} kecamatan`);
}

async function upsertDesa(csvPath) {
  const rows = readCSV(csvPath);
  if (rows.length === 0) return;
  // map kecamatan name -> id
  const { data: kecs, error: kecErr } = await supabase.from('kecamatan').select('id,name');
  if (kecErr) throw kecErr;
  const map = new Map(kecs.map((k) => [k.name.toLowerCase(), k.id]));
  const insertRows = [];
  for (const r of rows) {
    const kid = map.get(String(r.kecamatan || '').toLowerCase());
    if (!kid) {
      console.warn(`Skipping desa without known kecamatan: ${r.name} (kecamatan=${r.kecamatan})`);
      continue;
    }
    insertRows.push({ name: r.name, kecamatan_id: kid });
  }
  for (const chunk of chunked(insertRows, 500)) {
    const { error } = await supabase.from('desa').upsert(chunk, { onConflict: 'kecamatan_id,name' });
    if (error) throw error;
  }
  console.log(`Upserted ${insertRows.length} desa`);
}

function* chunked(arr, size) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

async function main() {
  const root = process.cwd();
  const kecPath = path.join(root, 'supabase', 'seed', 'ciamis', 'kecamatan.csv');
  const desaPath = path.join(root, 'supabase', 'seed', 'ciamis', 'desa.csv');

  if (fs.existsSync(kecPath)) {
    await upsertKecamatan(kecPath);
  } else {
    console.warn('kecamatan.csv not found, skipping kecamatan');
  }

  if (fs.existsSync(desaPath)) {
    await upsertDesa(desaPath);
  } else {
    console.warn('desa.csv not found, skipping desa');
  }

  console.log('Seeding completed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
