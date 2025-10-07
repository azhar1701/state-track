// Fetch and parse the Wikipedia page for Kabupaten Ciamis to generate desa.csv
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const WIKI_URL = 'https://id.wikipedia.org/wiki/Daftar_kecamatan_dan_kelurahan_di_Kabupaten_Ciamis';

function normalizeName(s) {
  return s.replace(/\s+/g, ' ').replace(/\u00B7/g, '·').trim();
}

(async () => {
  const res = await fetch(WIKI_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id,en;q=0.9',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on fetch`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // Heuristic: find the main table listing kecamatan and desa/kelurahan
  const rows = [];
  let lastKecamatan = '';
  $('table.wikitable tbody tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 6) return;
    const kode = normalizeName($(tds[0]).text());
    let kecamatan = normalizeName($(tds[1]).text());
    if (!kecamatan) kecamatan = lastKecamatan;
    const jenis = normalizeName($(tds[5]).text()); // 'Desa' or 'Kelurahan'
    const listSel = $(tds[6]);
    if (!kecamatan || !(jenis === 'Desa' || jenis === 'Kelurahan')) return;
    lastKecamatan = kecamatan || lastKecamatan;

    // Prefer anchor links within the list cell
    let names = listSel
      .find('a')
      .map((i, a) => normalizeName($(a).text()))
      .get()
      .filter((s) => s && !/^Kelurahan$/i.test(s) && !/^Desa$/i.test(s));

    // Fallback: split text by separators if anchors are not present
    if (names.length === 0) {
      const raw = normalizeName(listSel.text());
      names = raw
        .split(/\s*[·,]\s*/)
        .flatMap((chunk) => chunk.split(/\s{2,}|\s-\s|\s/))
        .map((s) => s.trim())
        .filter((s) => s && !/^Kelurahan$/i.test(s) && !/^Desa$/i.test(s));
    }

    // Final filter for garbage CSS snippets
    names = names.filter((s) => !s.includes('mw-parser-output') && !s.includes('hlist'));

    // Deduplicate in-row
    const uniq = Array.from(new Set(names));
    for (const name of uniq) rows.push({ kecamatan, name });
  });

  if (rows.length === 0) {
    console.error('No rows parsed. Wikipedia markup may have changed.');
    process.exit(1);
  }

  // Write to supabase/seed/ciamis/desa.csv
  const outPath = path.join(process.cwd(), 'supabase', 'seed', 'ciamis', 'desa.csv');
  const header = 'kecamatan,name\n';
  const body = rows.map((r) => `${r.kecamatan},${r.name}`).join('\n');
  fs.writeFileSync(outPath, header + body + '\n', 'utf-8');
  console.log(`Wrote ${rows.length} rows to ${outPath}`);
})();
