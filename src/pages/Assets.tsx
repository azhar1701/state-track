import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import shp from 'shpjs';

type GeoJSONGeometry = { type?: string; coordinates?: unknown } | undefined;
type GeoJSONFeature = { type?: string; properties?: Record<string, unknown>; geometry?: GeoJSONGeometry };
type GeoJSONFeatureCollection = { type?: string; features?: GeoJSONFeature[] };
type ShpOutput = GeoJSONFeatureCollection | Record<string, unknown>;

const isFeatureCollection = (v: unknown): v is GeoJSONFeatureCollection =>
  !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection';

const getCentroid = (geom: GeoJSONGeometry): [number, number] | null => {
  if (!geom || !geom.type) return null;
  const type = geom.type;
  const c = (geom as { coordinates?: unknown }).coordinates;
  if (!c) return null;
  if (type === 'Point' && Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
    return [c[1] as number, c[0] as number];
  }
  // Flatten nested arrays of numbers into [lng,lat]
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

interface Asset {
  id: string;
  code: string;
  name: string;
  category: 'jalan' | 'jembatan' | 'irigasi' | 'drainase' | 'sungai' | 'lainnya';
  latitude: number;
  longitude: number;
  location_name: string | null;
  status: 'aktif' | 'nonaktif' | 'rusak';
  created_at: string;
}

export default function Assets() {
  const [rows, setRows] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<'all' | Asset['category']>('all');
  const [status, setStatus] = useState<'all' | Asset['status']>('all');
  const [importing, setImporting] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ code: string; name: string; category: Asset['category']; latitude: string; longitude: string; location_name: string }>(
    { code: '', name: '', category: 'lainnya', latitude: '', longitude: '', location_name: '' }
  );

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (category !== 'all') query = query.eq('category', category);
    if (status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    setLoading(false);
    if (error) return toast.error('Gagal memuat aset');
    const list = (data ?? []) as Asset[];
    setRows(q ? list.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.code.toLowerCase().includes(q.toLowerCase())) : list);
  }, [q, category, status]);

  useEffect(() => { void load(); }, [load]);

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
    void load();
  };

  const setCategoryTyped = (v: 'all' | Asset['category']) => setCategory(v);
  const setStatusTyped = (v: 'all' | Asset['status']) => setStatus(v);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Asset Registry</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => document.getElementById('asset-file-input')?.click()} disabled={importing}>
            {importing ? 'Mengimpor…' : 'Impor GeoJSON / SHP'}
          </Button>
          <input id="asset-file-input" type="file" accept=".geojson,.json,.zip,.shp,.dbf,.prj" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImporting(true);
            try {
              const ext = file.name.toLowerCase().split('.').pop();
              let fcUnknown: unknown = null;
              if (ext === 'geojson' || ext === 'json') {
                const text = await file.text();
                fcUnknown = JSON.parse(text) as unknown;
              } else if (ext === 'zip' || ext === 'shp' || ext === 'dbf') {
                const arr = await file.arrayBuffer();
                fcUnknown = await shp(arr as ArrayBuffer);
              } else {
                toast.error('Format tidak didukung');
              }
              if (!fcUnknown) return;
              // shpjs may return a single FeatureCollection or an object of layer name -> FC
              const collections: GeoJSONFeatureCollection[] = [];
              if (isFeatureCollection(fcUnknown)) collections.push(fcUnknown);
              else if (fcUnknown && typeof fcUnknown === 'object') {
                for (const v of Object.values(fcUnknown as Record<string, unknown>)) if (isFeatureCollection(v)) collections.push(v);
              }
              const toInsert: Array<{ code: string; name: string; category: Asset['category']; latitude: number; longitude: number; location_name: string | null; status: Asset['status'] }> = [];
              for (const coll of collections) {
                for (const feat of coll.features ?? []) {
                  const props = feat.properties || {};
                  // Try common property names
                  const code = String(props.code ?? props.kode ?? props.id ?? '').trim();
                  const name = String((props.name ?? props.nama ?? props.title ?? code) || 'Aset').trim();
                  const categoryProp = String(props.category ?? props.kategori ?? '').toLowerCase();
                  const category: Asset['category'] = ['jalan','jembatan','irigasi','drainase','sungai'].includes(categoryProp)
                    ? (categoryProp as Asset['category'])
                    : 'lainnya';
                  const locName = (props.location_name ?? props.alamat ?? props.lokasi ?? null) as string | null;

                  // Compute point: if Point, use; if Line/Polygon, compute centroid
                  const geom = feat.geometry;
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
                void load();
              }
            } catch (err) {
              console.error(err);
              toast.error('Gagal membaca file');
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
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="text-right">{r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">Tidak ada aset</TableCell>
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
    </div>
  );
}
