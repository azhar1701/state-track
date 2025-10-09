import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import shp from 'shpjs';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';

interface GeoLayerRow {
  id: string;
  key: string;
  name: string;
  geometry_type: string | null;
  created_at: string;
}

type GeoJSONFeature = { type?: string; properties?: Record<string, unknown>; geometry?: { type?: string } };
type GeoJSONFeatureCollection = { type?: string; features?: GeoJSONFeature[] };

const isFeatureCollection = (v: unknown): v is GeoJSONFeatureCollection =>
  !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection';

export default function GeoDataManager() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<GeoLayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyVal, setKeyVal] = useState('admin_boundaries');
  const [name, setName] = useState('Admin Boundaries');
  const [crs, setCrs] = useState<'EPSG:4326' | 'EPSG:3857' | 'EPSG:32749' | 'custom'>('EPSG:4326');
  const [customCrs, setCustomCrs] = useState('');

  // Tabs state synced with URL. When embedded inside Admin (/admin?tab=geo), use 'tab2' to avoid clobbering AdminDashboard's `tab`.
  const tabParamName = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const adminTab = params.get('tab');
    // Prefer tab2 if present, or when parent tab is 'geo'
    return params.has('tab2') || adminTab === 'geo' ? 'tab2' : 'tab';
  }, [location.search]);

  const currentTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get(tabParamName);
    return t === 'assets' ? 'assets' : 'layers';
  }, [location.search, tabParamName]);

  const setTab = (t: 'layers' | 'assets') => {
    const params = new URLSearchParams(location.search);
    params.set(tabParamName, t);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };

  // Assets tab state & logic (ported from Assets.tsx)
  type Asset = {
    id: string;
    code: string;
    name: string;
    category: 'jalan' | 'jembatan' | 'irigasi' | 'drainase' | 'sungai' | 'lainnya';
    latitude: number;
    longitude: number;
    location_name: string | null;
    status: 'aktif' | 'nonaktif' | 'rusak';
    created_at: string;
  };

  type GeoJSONGeometry = { type?: string; coordinates?: unknown } | undefined;
  type AssetGeoJSONFeature = { type?: string; properties?: Record<string, unknown>; geometry?: GeoJSONGeometry };
  type AssetGeoJSONFeatureCollection = { type?: string; features?: AssetGeoJSONFeature[] };
  const isAssetFeatureCollection = (v: unknown): v is AssetGeoJSONFeatureCollection =>
    !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection';

  const getCentroid = (geom: GeoJSONGeometry): [number, number] | null => {
    if (!geom || !geom.type) return null;
    const type = geom.type;
    const c = (geom as { coordinates?: unknown }).coordinates;
    if (!c) return null;
    if (type === 'Point' && Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
      return [c[1] as number, c[0] as number];
    }
    const flatten = (arr: unknown): number[][] => {
      if (!Array.isArray(arr)) return [];
      if (arr.length > 0 && typeof arr[0] === 'number' && typeof arr[1] === 'number') return [arr as unknown as number[]];
      return (arr as unknown[]).flatMap((a) => flatten(a));
    };
    const pts = flatten(c).filter((p) => Array.isArray(p) && p.length >= 2) as number[][];
    if (pts.length === 0) return null;
    const avgLng = pts.reduce((s, p) => s + (p[0] as number), 0) / pts.length;
    const avgLat = pts.reduce((s, p) => s + (p[1] as number), 0) / pts.length;
    return [avgLat, avgLng];
  };

  const [assetRows, setAssetRows] = useState<Asset[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<'all' | Asset['category']>('all');
  const [status, setStatus] = useState<'all' | Asset['status']>('all');
  const [importing, setImporting] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ code: string; name: string; category: Asset['category']; latitude: string; longitude: string; location_name: string }>(
    { code: '', name: '', category: 'lainnya', latitude: '', longitude: '', location_name: '' }
  );

  const loadAssets = useCallback(async () => {
    setAssetLoading(true);
    let query = supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (category !== 'all') query = query.eq('category', category);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    setAssetLoading(false);
    if (error) return toast.error('Gagal memuat aset');
    const list = (data ?? []) as Asset[];
    setAssetRows(q ? list.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.code.toLowerCase().includes(q.toLowerCase())) : list);
  }, [q, category, status]);

  useEffect(() => { if (currentTab === 'assets') void loadAssets(); }, [loadAssets, currentTab]);

  const createAsset = async () => {
    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (!form.code || !form.name || Number.isNaN(lat) || Number.isNaN(lon)) return toast.error('Lengkapi form dengan benar');
    const payload = { code: form.code, name: form.name, category: form.category, latitude: lat, longitude: lon, location_name: form.location_name };
    const { error } = await supabase.from('assets').insert(payload);
    if (error) return toast.error('Gagal menambah aset');
    toast.success('Aset ditambahkan');
    setOpen(false);
    setForm({ code: '', name: '', category: 'lainnya', latitude: '', longitude: '', location_name: '' });
    void loadAssets();
    // Publish/update assets as a GeoJSON FeatureCollection layer so it appears on the map
    try {
      const { data: allAssets } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      const list = (allAssets ?? []) as Asset[];
      const fc = {
        type: 'FeatureCollection',
        features: list.map((a) => ({
          type: 'Feature',
          properties: { id: a.id, code: a.code, name: a.name, category: a.category, status: a.status, location_name: a.location_name },
          geometry: { type: 'Point', coordinates: [a.longitude, a.latitude] },
        })),
      };
      await supabase.from('geo_layers').upsert({ key: 'assets', name: 'Assets', geometry_type: 'Point', data: { featureCollection: fc, crs: 'EPSG:4326' } }, { onConflict: 'key' });
    } catch (e) {
      console.warn('Failed to publish assets layer', e);
    }
  };

  const setCategoryTyped = (v: 'all' | Asset['category']) => setCategory(v);
  const setStatusTyped = (v: 'all' | Asset['status']) => setStatus(v);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('geo_layers')
      .select('id,key,name,geometry_type,created_at')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (!error) setRows((data ?? []) as GeoLayerRow[]);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const handleUpload = async (file: File) => {
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let data: unknown = null;
      if (ext === 'geojson' || ext === 'json') {
        data = JSON.parse(await file.text());
      } else if (ext === 'zip') {
        data = await shp(await file.arrayBuffer());
      } else if (ext === 'shp' || ext === 'dbf' || ext === 'prj') {
        toast.error('Shapefile harus dalam .zip berisi .shp, .dbf, dan .prj');
        return;
      } else {
        toast.error('Format tidak didukung');
        return;
      }
      // Normalize to a single FeatureCollection
      let fc: GeoJSONFeatureCollection | null = null;
      if (isFeatureCollection(data)) fc = data;
      else if (data && typeof data === 'object') {
        const vals = Object.values(data as Record<string, unknown>);
        const first = vals.find((v) => isFeatureCollection(v));
        if (first && isFeatureCollection(first)) fc = first;
        // Support single Feature JSON
        if (!fc && (data as { type?: string }).type === 'Feature') {
          const feat = data as GeoJSONFeature;
          fc = { type: 'FeatureCollection', features: [feat] };
        }
      }
      if (!fc) return toast.error('Tidak ada FeatureCollection');
      if (!fc.features || fc.features.length === 0) return toast.error('Tidak ada fitur pada file');

      const firstGeom = fc.features?.[0]?.geometry?.type as string | undefined;
      // Persist FeatureCollection along with selected CRS metadata so the map can reproject accurately
      const selectedCRS = crs === 'custom' ? (customCrs.trim() || 'EPSG:4326') : crs;
      const wrapped = { featureCollection: fc, crs: selectedCRS } as const;
      const payload = {
        key: keyVal,
        name,
        geometry_type: firstGeom ?? null,
        data: wrapped,
      };

      const { error } = await supabase.from('geo_layers').upsert(payload, { onConflict: 'key' });
      if (error) return toast.error('Gagal menyimpan layer');
      toast.success('Layer disimpan');
      void load();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga';
      toast.error('Gagal memproses file', { description: msg });
    }
  };

  const del = async (id: string) => {
    const { error } = await supabase.from('geo_layers').delete().eq('id', id);
    if (!error) {
      toast.success('Layer dihapus');
      void load();
    }
  };

  if (!user || !isAdmin) return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader><CardTitle>Geo Data Manager</CardTitle></CardHeader>
        <CardContent>Hanya admin yang dapat mengakses halaman ini.</CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Geo Data Manager</h1>
      </div>

      <Tabs value={currentTab} onValueChange={(v) => setTab(v as 'layers' | 'assets')}>
        <TabsList>
          <TabsTrigger value="layers">Layers</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="layers">
          <Card className="mb-4">
            <CardHeader><CardTitle>Unggah / Perbarui Layer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Key</Label>
                  <Input value={keyVal} onChange={(e) => setKeyVal(e.target.value)} placeholder="unique_key" />
                </div>
                <div>
                  <Label>Nama</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama layer" />
                </div>
                <div>
                  <Label>CRS (EPSG)</Label>
                  <Select value={crs} onValueChange={(v) => setCrs(v as typeof crs)}>
                    <SelectTrigger><SelectValue placeholder="Pilih CRS" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EPSG:4326">EPSG:4326 (WGS84 - derajat)</SelectItem>
                      <SelectItem value="EPSG:3857">EPSG:3857 (Web Mercator - meter)</SelectItem>
                      <SelectItem value="EPSG:32749">EPSG:32749 (UTM Zona 49S - meter)</SelectItem>
                      <SelectItem value="custom">Kustom…</SelectItem>
                    </SelectContent>
                  </Select>
                  {crs === 'custom' && (
                    <div className="mt-2">
                      <Input value={customCrs} onChange={(e) => setCustomCrs(e.target.value)} placeholder="cth: EPSG:23839" />
                      <div className="text-xs text-muted-foreground mt-1">Masukkan kode EPSG lengkap. Saat ini hanya 4326/3857/32749 yang didukung saat render.</div>
                    </div>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => document.getElementById('geo-file')?.click()}>Pilih File</Button>
                  <input id="geo-file" type="file" accept=".geojson,.json,.zip" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                    e.currentTarget.value = '';
                  }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Daftar Layer</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe Geometri</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.key}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.geometry_type ?? '-'}</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="destructive" onClick={() => void del(r.id)}>Hapus</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-sm text-muted-foreground">Belum ada layer</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xl font-semibold">Asset Registry</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => document.getElementById('asset-file-input')?.click()} disabled={importing}>
                {importing ? 'Mengimpor…' : 'Impor GeoJSON / SHP'}
              </Button>
              <input id="asset-file-input" type="file" accept=".geojson,.json,.zip" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImporting(true);
                try {
                  const ext = file.name.toLowerCase().split('.').pop();
                  let fcUnknown: unknown = null;
                  if (ext === 'geojson' || ext === 'json') {
                    const text = await file.text();
                    fcUnknown = JSON.parse(text) as unknown;
                  } else if (ext === 'zip') {
                    const arr = await file.arrayBuffer();
                    fcUnknown = await shp(arr as ArrayBuffer);
                  } else if (ext === 'shp' || ext === 'dbf' || ext === 'prj') {
                    toast.error('Shapefile harus dalam .zip berisi .shp, .dbf, dan .prj');
                    setImporting(false);
                    e.currentTarget.value = '';
                    return;
                  } else {
                    toast.error('Format tidak didukung');
                  }
                  if (!fcUnknown) return;
                  const collections: AssetGeoJSONFeatureCollection[] = [];
                  if (isAssetFeatureCollection(fcUnknown)) collections.push(fcUnknown);
                  else if (fcUnknown && typeof fcUnknown === 'object') {
                    for (const v of Object.values(fcUnknown as Record<string, unknown>)) if (isAssetFeatureCollection(v)) collections.push(v);
                  }
                  // Support single Feature JSON
                  if (collections.length === 0 && (fcUnknown as { type?: string })?.type === 'Feature') {
                    const feat = fcUnknown as AssetGeoJSONFeature;
                    collections.push({ type: 'FeatureCollection', features: [feat] });
                  }
                  const toInsert: Array<{ code: string; name: string; category: Asset['category']; latitude: number; longitude: number; location_name: string | null; status: Asset['status'] }> = [];
                  for (const coll of collections) {
                    for (const feat of coll.features ?? []) {
                      const props = feat.properties || {};
                      const code = String(props.code ?? props.kode ?? props.id ?? '').trim();
                      const name = String((props.name ?? props.nama ?? props.title ?? code) || 'Aset').trim();
                      const categoryProp = String(props.category ?? props.kategori ?? '').toLowerCase();
                      const category: Asset['category'] = ['jalan','jembatan','irigasi','drainase','sungai'].includes(categoryProp)
                        ? (categoryProp as Asset['category'])
                        : 'lainnya';
                      const locName = (props.location_name ?? props.alamat ?? props.lokasi ?? null) as string | null;

                      const geom = feat.geometry as GeoJSONGeometry;
                      const latlng = getCentroid(geom);
                      if (!latlng) continue;
                      const [lat, lng] = latlng;

                      toInsert.push({
                        code: code || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        name,
                        category,
                        latitude: lat,
                        longitude: lng,
                        location_name: locName,
                        status: 'aktif',
                      });
                    }
                  }
                  if (toInsert.length === 0) {
                    toast.error('Tidak ada fitur yang dapat diimpor');
                    return;
                  }
                  const { error } = await supabase.from('assets').insert(toInsert);
                  if (error) {
                    toast.error('Gagal mengimpor aset');
                  } else {
                    toast.success(`Berhasil impor ${toInsert.length} aset`);
                    void loadAssets();
                    // After bulk import, republish assets layer
                    try {
                      const { data: allAssets } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
                      const list = (allAssets ?? []) as Asset[];
                      const fc = {
                        type: 'FeatureCollection',
                        features: list.map((a) => ({
                          type: 'Feature',
                          properties: { id: a.id, code: a.code, name: a.name, category: a.category, status: a.status, location_name: a.location_name },
                          geometry: { type: 'Point', coordinates: [a.longitude, a.latitude] },
                        })),
                      };
                      await supabase.from('geo_layers').upsert({ key: 'assets', name: 'Assets', geometry_type: 'Point', data: { featureCollection: fc, crs: 'EPSG:4326' } }, { onConflict: 'key' });
                    } catch (e) {
                      console.warn('Failed to publish assets layer', e);
                    }
                  }
                } catch (err) {
                  console.error(err);
                  const msg = err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga';
                  toast.error('Gagal membaca file', { description: msg });
                } finally {
                  setImporting(false);
                  e.currentTarget.value = '';
                }
              }} />
              <Button onClick={() => setOpen(true)}>Tambah Aset</Button>
            </div>
          </div>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Filter</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Kategori</Label>
                <Select value={category} onValueChange={(v) => setCategoryTyped(v as 'all' | Asset['category'])}>
                  <SelectTrigger><SelectValue placeholder="Semua kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="jalan">Jalan</SelectItem>
                    <SelectItem value="jembatan">Jembatan</SelectItem>
                    <SelectItem value="irigasi">Irigasi</SelectItem>
                    <SelectItem value="drainase">Drainase</SelectItem>
                    <SelectItem value="sungai">Sungai</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatusTyped(v as 'all' | Asset['status'])}>
                  <SelectTrigger><SelectValue placeholder="Semua status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                    <SelectItem value="rusak">Rusak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Cari</Label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau kode..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Aset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Koordinat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.code}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell className="text-right">{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</TableCell>
                      </TableRow>
                    ))}
                    {assetRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-sm text-muted-foreground">{assetLoading ? 'Memuat…' : 'Tidak ada aset'}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Aset</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Kode</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div>
                  <Label>Nama</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Asset['category'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jalan">Jalan</SelectItem>
                      <SelectItem value="jembatan">Jembatan</SelectItem>
                      <SelectItem value="irigasi">Irigasi</SelectItem>
                      <SelectItem value="drainase">Drainase</SelectItem>
                      <SelectItem value="sungai">Sungai</SelectItem>
                      <SelectItem value="lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Latitude</Label>
                    <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Nama Lokasi</Label>
                  <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={createAsset}>Simpan</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
