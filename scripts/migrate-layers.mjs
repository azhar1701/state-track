/**
 * Migration Helper: Validate and Fix Existing Layers
 * 
 * Run this script once after deploying the refactor to:
 * 1. Sanitize existing layer names and keys
 * 2. Validate data structure
 * 3. Clean up orphaned storage files
 * 
 * Usage: node scripts/migrate-layers.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const sanitizeFilename = (name) => 
  name.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').toLowerCase();

const sanitizeText = (text) => 
  text.replace(/[""]/g, '"').replace(/['']/g, "'");

async function migrateLayers() {
  console.log('🔍 Fetching existing layers...');
  
  const { data: layers, error } = await supabase
    .from('geo_layers')
    .select('*');

  if (error) {
    console.error('❌ Failed to fetch layers:', error);
    return;
  }

  console.log(`📊 Found ${layers.length} layers`);

  let fixed = 0;
  let skipped = 0;

  for (const layer of layers) {
    const updates = {};
    let needsUpdate = false;

    // Sanitize key
    const sanitizedKey = sanitizeFilename(layer.key);
    if (sanitizedKey !== layer.key) {
      updates.key = sanitizedKey;
      needsUpdate = true;
      console.log(`  🔧 Fixing key: "${layer.key}" → "${sanitizedKey}"`);
    }

    // Sanitize name
    const sanitizedName = sanitizeText(layer.name);
    if (sanitizedName !== layer.name) {
      updates.name = sanitizedName;
      needsUpdate = true;
      console.log(`  🔧 Fixing name: "${layer.name}" → "${sanitizedName}"`);
    }

    // Validate data structure
    if (layer.data) {
      const hasFC = layer.data.featureCollection || layer.data.type === 'FeatureCollection';
      if (!hasFC) {
        console.warn(`  ⚠️  Invalid data structure for layer ${layer.key}`);
      }
    }

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('geo_layers')
        .update(updates)
        .eq('id', layer.id);

      if (updateError) {
        console.error(`  ❌ Failed to update ${layer.key}:`, updateError);
      } else {
        fixed++;
        console.log(`  ✅ Updated ${layer.key}`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n📈 Summary:`);
  console.log(`  ✅ Fixed: ${fixed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total: ${layers.length}`);
}

async function cleanOrphanedFiles() {
  console.log('\n🧹 Checking for orphaned storage files...');

  const { data: files, error: listError } = await supabase.storage
    .from('geo-layers')
    .list('layers');

  if (listError) {
    console.error('❌ Failed to list storage files:', listError);
    return;
  }

  const { data: layers } = await supabase
    .from('geo_layers')
    .select('data');

  const usedUrls = new Set(
    layers
      ?.map(l => l.data?.storageUrl)
      .filter(Boolean)
      .map(url => url.split('/').pop())
  );

  const orphaned = files.filter(file => !usedUrls.has(file.name));

  if (orphaned.length === 0) {
    console.log('  ✅ No orphaned files found');
    return;
  }

  console.log(`  🗑️  Found ${orphaned.length} orphaned files`);
  
  for (const file of orphaned) {
    console.log(`    - ${file.name}`);
  }

  console.log('\n⚠️  To delete orphaned files, run:');
  console.log('  await supabase.storage.from("geo-layers").remove([...paths])');
}

async function main() {
  console.log('🚀 Starting layer migration...\n');
  
  await migrateLayers();
  await cleanOrphanedFiles();
  
  console.log('\n✅ Migration complete!');
}

main().catch(console.error);
