import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import shp from 'shpjs';
import proj4 from 'proj4';
import * as turf from '@turf/turf';
import type { Geometry, LineString, MultiLineString, Polygon, MultiPolygon, Feature as GJFeature } from 'geojson';

// Types for importer modes
export type ImportMode = 'layer' | 'assets';

// Minimal shapes for preview and mapping
type AnyProps = Record<string, unknown>;
export type GeoJSONGeometry = { type?: string; coordinates?: unknown } | undefined;
export type GeoJSONFeature = { type?: string; properties?: AnyProps; geometry?: GeoJSONGeometry };
export type GeoJSONFeatureCollection = { type?: string; features?: GeoJSONFeature[] };

const isFC = (v: unknown): v is GeoJSONFeatureCollection => !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection';

// Supported CRS for reprojection
const supportedCRS = ['EPSG:4326', 'EPSG:3857', 'EPSG:32749'] as const;
export type SupportedCRS = typeof supportedCRS[number] | string; // allow custom string to future-proof

proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs');
proj4.defs('EPSG:32749', '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs');

// Util to normalize any shpjs or nested json into one FeatureCollection
function normalizeToFC(data: unknown): GeoJSONFeatureCollection | null {
  if (isFC(data)) return data;
  if (data && typeof data === 'object') {
    const vals = Object.values(data as Record<string, unknown>);
    for (const v of vals) if (isFC(v)) return v;
  }
  if ((data as { type?: string })?.type === 'Feature') {
    const f = data as GeoJSONFeature;
    return { type: 'FeatureCollection', features: [f] };
  }
  return null;
}

function collectFieldNames(fc: GeoJSONFeatureCollection): string[] {
  const names = new Set<string>();
  let count = 0;
  for (const f of fc.features ?? []) {
    const p = f.properties || {};
    Object.keys(p).forEach((k) => names.add(k));
    count++;
    if (count >= 50) break; // collect from first 50 features to broaden coverage
  }
  return Array.from(names);
}

function guessCRSFromNumbers(fc: GeoJSONFeatureCollection): SupportedCRS | undefined {
  const sample = (() => {
    const f = fc.features?.find((f) => f.geometry && 'coordinates' in (f.geometry || {}));
    if (!f) return null;
    const g = f.geometry as { coordinates?: unknown };
    const peek = (coords: unknown): [number, number] | null => {
      if (!Array.isArray(coords)) return null;
      if (coords.length > 0 && typeof coords[0] === 'number' && typeof coords[1] === 'number') return [coords[0], coords[1]];
      for (const c of coords as unknown[]) {
        const p = peek(c);
        if (p) return p;
      }
      return null;
    };
    return peek(g.coordinates);
  })();
  if (!sample) return undefined;
  const [x, y] = sample;
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return 'EPSG:4326';
  // rough heuristic: mercator meters magnitude
  if (Math.abs(x) > 1000 && Math.abs(y) > 1000) return 'EPSG:32749';
  return undefined;
}

function reprojectFC(fc: GeoJSONFeatureCollection, from: SupportedCRS, to: SupportedCRS = 'EPSG:4326'): GeoJSONFeatureCollection {
  const transform = (pt: number[]): [number, number] => {
    const [x, y] = pt;
    const [lon, lat] = proj4(String(from), String(to), [x, y]);
    return [lon, lat];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reprojectGeometry = (geom: any): any => {
    if (!geom) return geom;
    const t = geom.type;
    const coords = geom.coordinates;
    const mapCoords = (arr: unknown): unknown => {
      if (!Array.isArray(arr)) return arr;
      if (arr.length > 0 && typeof arr[0] === 'number') return transform(arr as number[]);
      return (arr as unknown[]).map((a) => mapCoords(a));
    };
    if (t === 'GeometryCollection') {
      return { type: 'GeometryCollection', geometries: geom.geometries.map((g: unknown) => reprojectGeometry(g)) };
    }
    return { type: t, coordinates: mapCoords(coords) };
  };
  return {
    type: 'FeatureCollection',
    features: (fc.features ?? []).map((f) => ({
      type: 'Feature',
      properties: f.properties || {},
      geometry: reprojectGeometry(f.geometry),
    })),
  };
}

// Asset centroids
function centroidOf(geom: GeoJSONGeometry): [number, number] | null {
  if (!geom || !geom.type) return null;
  const c = (geom as { coordinates?: unknown }).coordinates;
  if (!c) return null;
  if (geom.type === 'Point' && Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') return [c[1] as number, c[0] as number];
  const flatten = (arr: unknown): number[][] => {
    if (!Array.isArray(arr)) return [];
    if (arr.length > 0 && typeof arr[0] === 'number' && typeof arr[1] === 'number') return [arr as unknown as number[]];
    return (arr as unknown[]).flatMap((a) => flatten(a));
  };
  const pts = flatten(c).filter((p) => Array.isArray(p) && (p as number[]).length >= 2) as number[][];
  if (pts.length === 0) return null;
  const avgLng = pts.reduce((s, p) => s + (p[0] as number), 0) / pts.length;
  const avgLat = pts.reduce((s, p) => s + (p[1] as number), 0) / pts.length;
  return [avgLat, avgLng];
}

export interface UnifiedImporterProps {
  mode: ImportMode;
  // For mode='layer'
  initialKey?: string;
  initialName?: string;
  onSaveLayer?: (args: { key: string; name: string; geometry_type: string | null; data: { featureCollection: GeoJSONFeatureCollection; crs: SupportedCRS } }) => Promise<void> | void;
  // For mode='assets'
  onSaveAssets?: (assets: Array<{ code: string; name: string; category: string; latitude: number; longitude: number; keterangan: string | null; status: string }>) => Promise<void> | void;
}

export default function UnifiedImporter({ mode, initialKey, initialName, onSaveLayer, onSaveAssets }: UnifiedImporterProps) {
  const [fileName, setFileName] = useState('');
  const [fc, setFc] = useState<GeoJSONFeatureCollection | null>(null);
  const [crs, setCrs] = useState<SupportedCRS>('EPSG:4326');
  const [customCrs, setCustomCrs] = useState('');
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [keyVal, setKeyVal] = useState(initialKey || 'layer_key');
  const [name, setName] = useState(initialName || 'Layer');
  const [mapping, setMapping] = useState<{ code?: string; name?: string; category?: string; keterangan?: string }>(() => ({ code: 'code', name: 'name', category: 'category', keterangan: 'keterangan' }));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressText, setProgressText] = useState('');

  const displayCRS = crs === 'custom' ? customCrs : crs;

  useEffect(() => {
    if (fc) setFieldNames(collectFieldNames(fc));
  }, [fc]);

  const normalizedDisplayCRS = useMemo(() => {
    if (!displayCRS) return 'EPSG:4326';
    const s = String(displayCRS).trim();
    // normalize patterns like EPSG::32749 or just 32749
    const m = s.match(/(\d{4,5})$/);
    if (m) return `EPSG:${m[1]}`;
    return s;
  }, [displayCRS]);

  const previewRows = useMemo(() => {
    const rows: Array<{ idx: number; name?: string; category?: string; code?: string; lat?: number; lng?: number } | null> = [];
    if (!fc) return rows;
    if (!Array.isArray(fc.features) || fc.features.length === 0) return rows;
    const from = normalizedDisplayCRS || 'EPSG:4326';
    const needReproject = from && String(from).toUpperCase() !== 'EPSG:4326';
    const fc4326 = needReproject ? reprojectFC(fc, from, 'EPSG:4326') : fc;
    const feats = fc4326.features ?? [];
    for (let i = 0; i < Math.min(5, feats.length); i++) {
      const f = feats[i];
      const c = centroidOf(f.geometry);
      if (!c) { rows.push(null); continue; }
      rows.push({ idx: i + 1, name: String(f.properties?.[mapping.name || 'name'] ?? ''), category: String(f.properties?.[mapping.category || 'category'] ?? ''), code: String(f.properties?.[mapping.code || 'code'] ?? ''), lat: c[0], lng: c[1] });
    }
    return rows.filter(Boolean) as Array<{ idx: number; name?: string; category?: string; code?: string; lat?: number; lng?: number }>;
  }, [fc, mapping, normalizedDisplayCRS]);

  const onChooseFile = async (file: File) => {
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let raw: unknown = null;
      if (ext === 'geojson' || ext === 'json') raw = JSON.parse(await file.text());
      else if (ext === 'zip') raw = await shp(await file.arrayBuffer());
      else if (ext === 'shp' || ext === 'dbf' || ext === 'prj') return toast.error('Shapefile harus dalam .zip berisi .shp, .dbf, dan .prj');
      else return toast.error('Format tidak didukung');
      const collection = normalizeToFC(raw);
      if (!collection) return toast.error('Tidak ada FeatureCollection');
      if (!Array.isArray(collection.features) || collection.features.length === 0) return toast.error('FeatureCollection kosong');
      setFileName(file.name);
      setFc(collection);
      // try guess CRS quickly
      const g = guessCRSFromNumbers(collection);
      if (g) setCrs(g);
    } catch (e) {
      console.error(e);
      toast.error('Gagal membaca file', { description: e instanceof Error ? e.message : 'Unknown error' });
    }
  };

  const saveLayer = async () => {
    if (!onSaveLayer || !fc) return;
    try {
      setSaving(true);
      setProgressOpen(true);
      setProgressValue(10);
      setProgressText('Menyiapkan data…');
  const selectedCRS = crs === 'custom' ? (normalizedDisplayCRS || 'EPSG:4326') : normalizedDisplayCRS;
      setProgressValue(60);
      setProgressText('Menyimpan layer ke database…');
      await onSaveLayer({ key: keyVal, name, geometry_type: fc.features?.[0]?.geometry?.type ?? null, data: { featureCollection: fc, crs: selectedCRS } });
      setProgressValue(100);
      setProgressText('Selesai');
    } catch (e) {
      console.error(e);
      toast.error('Gagal menyimpan layer');
    } finally {
      setSaving(false);
      setTimeout(() => setProgressOpen(false), 500);
    }
  };

  const saveAssets = async () => {
    if (!onSaveAssets || !fc) return;
    try {
      setSaving(true);
      setProgressOpen(true);
      setProgressValue(5);
      setProgressText('Menyiapkan data aset…');
  const from = normalizedDisplayCRS || 'EPSG:4326';
      const needReproject = from && String(from).toUpperCase() !== 'EPSG:4326';
      setProgressValue(15);
      setProgressText(needReproject ? 'Reproyeksi ke WGS84…' : 'Memproses fitur…');
      const fc4326 = needReproject ? reprojectFC(fc, from, 'EPSG:4326') : fc;
      const feats = fc4326.features ?? [];
      const total = feats.length || 1;
  const toInsert: Array<{ code: string; name: string; category: string; latitude: number; longitude: number; keterangan: string | null; status: string }> = [];
      for (let i = 0; i < feats.length; i++) {
        const feat = feats[i];
        const props = feat.properties || {};
        const code = String(props[mapping.code || 'code'] ?? (props as AnyProps)['kode'] ?? (props as AnyProps)['id'] ?? '').trim();
        const nameVal = String((props[mapping.name || 'name'] ?? (props as AnyProps)['nama'] ?? (props as AnyProps)['title'] ?? code) || 'Aset').trim();
        const categoryProp = String(props[mapping.category || 'category'] ?? (props as AnyProps)['kategori'] ?? '').toLowerCase();
        const category = ['jalan','jembatan','irigasi','drainase','sungai'].includes(categoryProp) ? categoryProp : 'lainnya';
        // keterangan logic: prefer mapped text; if geometry is line/polygon, compute length/area and include it
        let ket = (props[mapping.keterangan || 'keterangan'] ?? (props as AnyProps)['alamat'] ?? (props as AnyProps)['lokasi'] ?? null) as string | null;
        const geometry = feat.geometry as Geometry | null | undefined;
        if (geometry && typeof geometry === 'object' && 'type' in geometry && geometry.type) {
          const gtype = geometry.type;
          try {
            if (gtype === 'LineString' || gtype === 'MultiLineString') {
              const feature = { type: 'Feature', properties: {}, geometry } as GJFeature<LineString | MultiLineString>;
              const lenKm = turf.length(feature, { units: 'kilometers' });
              const meters = lenKm * 1000;
              const label = meters >= 1000 ? `${(meters/1000).toFixed(2)} km` : `${meters.toFixed(0)} m`;
              ket = ket ? `${ket} — Panjang: ${label}` : `Panjang: ${label}`;
            } else if (gtype === 'Polygon' || gtype === 'MultiPolygon') {
              const feature = { type: 'Feature', properties: {}, geometry } as GJFeature<Polygon | MultiPolygon>;
              const m2 = turf.area(feature);
              const label = m2 >= 10000 ? `${(m2/10000).toFixed(2)} ha` : `${m2.toFixed(0)} m²`;
              ket = ket ? `${ket} — Luas: ${label}` : `Luas: ${label}`;
            }
          } catch (e) {
            // ignore measurement errors
          }
        }
        const c = centroidOf(feat.geometry);
        if (!c) continue;
        const [lat, lng] = c;
  toInsert.push({ code: code || `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, name: nameVal, category, latitude: lat, longitude: lng, keterangan: ket, status: 'aktif' });
        // update progress every ~5% or 50 features, whichever larger
        if (i % Math.max(1, Math.floor(total / 20)) === 0) {
          const pct = 15 + Math.min(40, Math.round((i / total) * 40));
          setProgressValue(pct);
          setProgressText(`Memproses fitur ${i + 1}/${total}…`);
        }
      }
      if (toInsert.length === 0) {
        setProgressOpen(false);
        setSaving(false);
        return toast.error('Tidak ada fitur yang dapat diimpor');
      }
      setProgressValue(70);
      setProgressText('Mengunggah aset ke database…');
      await onSaveAssets(toInsert);
      setProgressValue(100);
      setProgressText('Selesai');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengimpor aset');
    } finally {
      setSaving(false);
      setTimeout(() => setProgressOpen(false), 600);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'layer' ? 'Impor / Unggah Layer' : 'Impor Aset'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {mode === 'layer' && (
            <>
              <div>
                <Label>Key</Label>
                <Input value={keyVal} onChange={(e) => setKeyVal(e.target.value)} placeholder="unique_key" />
              </div>
              <div>
                <Label>Nama</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama layer" />
              </div>
            </>
          )}
          <div>
            <Label>CRS (EPSG)</Label>
            <Select value={crs as string} onValueChange={(v) => setCrs(v as SupportedCRS)}>
              <SelectTrigger><SelectValue placeholder="Pilih CRS" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EPSG:4326">EPSG:4326 (WGS84 - derajat)</SelectItem>
                <SelectItem value="EPSG:3857">EPSG:3857 (Web Mercator - meter)</SelectItem>
                <SelectItem value="EPSG:32749">EPSG:32749 (UTM Zona 49S - meter)</SelectItem>
                <SelectItem value="custom">Kustom…</SelectItem>
              </SelectContent>
            </Select>
            {(crs as string) === 'custom' && (
              <div className="mt-2">
                <Input value={customCrs} onChange={(e) => setCustomCrs(e.target.value)} placeholder="cth: EPSG:23839" />
                <div className="text-xs text-muted-foreground mt-1">Masukkan kode EPSG lengkap. Saat ini hanya 4326/3857/32749 yang didukung saat render.</div>
              </div>
            )}
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()}>{fileName ? 'Ganti File' : 'Pilih File'}</Button>
            <input ref={inputRef} type="file" accept=".geojson,.json,.zip" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onChooseFile(f);
              e.currentTarget.value = '';
            }} />
          </div>
        </div>

        {mode === 'assets' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Field Kode</Label>
              <Select value={mapping.code || ''} onValueChange={(v) => setMapping((m) => ({ ...m, code: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih field" /></SelectTrigger>
                <SelectContent>
                  {fieldNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Field Nama</Label>
              <Select value={mapping.name || ''} onValueChange={(v) => setMapping((m) => ({ ...m, name: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih field" /></SelectTrigger>
                <SelectContent>
                  {fieldNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Field Kategori</Label>
              <Select value={mapping.category || ''} onValueChange={(v) => setMapping((m) => ({ ...m, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih field" /></SelectTrigger>
                <SelectContent>
                  {fieldNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Field Keterangan</Label>
              <Select value={mapping.keterangan || ''} onValueChange={(v) => setMapping((m) => ({ ...m, keterangan: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih field" /></SelectTrigger>
                <SelectContent>
                  {fieldNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {fc && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Pratinjau (maks 5 fitur tampak setelah reproyeksi bila dipilih)</div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    {mode === 'assets' && <TableHead>Kode</TableHead>}
                    <TableHead>Nama</TableHead>
                    {mode === 'assets' && <TableHead>Kategori</TableHead>}
                    <TableHead>Lat</TableHead>
                    <TableHead>Lng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r) => (
                    <TableRow key={r.idx}>
                      <TableCell>{r.idx}</TableCell>
                      {mode === 'assets' && <TableCell>{r.code}</TableCell>}
                      <TableCell>{r.name}</TableCell>
                      {mode === 'assets' && <TableCell>{r.category}</TableCell>}
                      <TableCell>{r.lat?.toFixed(6)}</TableCell>
                      <TableCell>{r.lng?.toFixed(6)}</TableCell>
                    </TableRow>
                  ))}
                  {previewRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={mode === 'assets' ? 6 : 4} className="text-sm text-muted-foreground">Tidak ada data untuk pratinjau</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Dynamic properties preview: show more fields flexibly */}
            {(() => {
              const feats = fc.features ?? [];
              if (feats.length === 0) return null;
              const sample = feats.slice(0, Math.min(10, feats.length));
              const cols = Array.from(new Set(sample.flatMap((f) => Object.keys(f.properties || {})))).slice(0, 40);
              if (cols.length === 0) return null;
              return (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Semua field (contoh hingga 10 baris)</div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {cols.map((c) => (<TableHead key={c}>{c}</TableHead>))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sample.map((f, idx) => (
                          <TableRow key={idx}>
                            {cols.map((c) => (
                              <TableCell key={c}>{String((f.properties || {})[c] ?? '')}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {mode === 'layer' ? (
            <Button onClick={() => void saveLayer()} disabled={!fc || saving}>Simpan Layer</Button>
          ) : (
            <Button onClick={() => void saveAssets()} disabled={!fc || saving}>Impor Aset</Button>
          )}
        </div>
      </CardContent>

      {/* Progress Modal */}
      <Dialog open={progressOpen} onOpenChange={(open) => { if (!saving) setProgressOpen(open); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Memproses Impor</DialogTitle>
            <DialogDescription>Jangan tutup jendela ini sampai proses selesai.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{progressText || 'Sedang memproses…'}</div>
            <Progress value={progressValue} />
            <div className="text-right text-xs text-muted-foreground">{Math.max(0, Math.min(100, progressValue))}%</div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
