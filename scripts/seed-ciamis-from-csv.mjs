import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus diisi di .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCiamisFromCSV() {
  console.log('📂 Membaca file CSV...');
  
  const csvContent = readFileSync('./docs/diskominfo-od_kode_wilayah_dan_nama_wilayah_desa_kelurahan_data.csv', 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`📊 Total ${records.length} baris data ditemukan`);

  // Filter hanya data Ciamis
  const ciamisData = records.filter(row => {
    const kabupaten = row.kemendagri_kota_nama?.trim().toUpperCase();
    return kabupaten && (kabupaten.includes('CIAMIS') || kabupaten === 'KAB. CIAMIS');
  });

  console.log(`🎯 Ditemukan ${ciamisData.length} data untuk Kabupaten Ciamis`);

  if (ciamisData.length === 0) {
    console.log('⚠️  Tidak ada data Ciamis dalam CSV. Periksa nama kabupaten di file CSV.');
    return;
  }

  // Group by kecamatan -> desa (hanya yang kapital)
  const kecamatanMap = new Map();

  for (const row of ciamisData) {
    const kecamatan = row.kemendagri_kecamatan_nama?.trim();
    const desa = row.kemendagri_kelurahan_nama?.trim();

    if (!kecamatan || !desa) continue;
    
    // Skip jika bukan kapital (ada huruf kecil)
    if (kecamatan !== kecamatan.toUpperCase() || desa !== desa.toUpperCase()) continue;

    if (!kecamatanMap.has(kecamatan)) {
      kecamatanMap.set(kecamatan, new Set());
    }
    
    kecamatanMap.get(kecamatan).add(desa);
  }

  console.log(`\n🏘️  Ditemukan ${kecamatanMap.size} kecamatan di Ciamis`);

  let totalKecamatanInserted = 0;
  let totalDesaInserted = 0;

  for (const [kecamatan, desaSet] of kecamatanMap) {
    // Insert kecamatan
    const { data: kecData, error: kecError } = await supabase
      .from('kecamatan')
      .upsert({ name: kecamatan }, { onConflict: 'name' })
      .select()
      .single();

    if (kecError) {
      console.error(`  ❌ Error insert kecamatan ${kecamatan}:`, kecError.message);
      continue;
    }

    totalKecamatanInserted++;
    console.log(`  ✅ ${kecamatan} (${desaSet.size} desa)`);

    // Insert desa
    const desaData = Array.from(desaSet).map(desa => ({
      kecamatan_id: kecData.id,
      name: desa
    }));

    const { error: desaError } = await supabase
      .from('desa')
      .upsert(desaData, { onConflict: 'kecamatan_id,name', ignoreDuplicates: true });

    if (desaError) {
      console.error(`    ❌ Error insert desa:`, desaError.message);
    } else {
      totalDesaInserted += desaSet.size;
    }
  }

  console.log('\n✅ Seeding Ciamis selesai!');
  console.log(`📊 Total: ${totalKecamatanInserted} kecamatan, ${totalDesaInserted} desa`);
}

seedCiamisFromCSV().catch(console.error);
