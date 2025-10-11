import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import UnifiedImporter from '@/components/import/UnifiedImporter';
import type { ImportMode } from '@/components/import/UnifiedImporter';
// removed ArrowUp/ArrowDown as popup configurator is removed

// Popup configurator removed per request

// Small inline editable helpers
function InlineEditableText({ value, onSave }: { value: string; onSave: (v: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  return editing ? (
    <div className="flex items-center gap-2">
      <input className="h-8 w-full max-w-[240px] rounded border bg-background px-2 text-sm" value={val} onChange={(e) => setVal(e.target.value)} />
      <Button size="sm" onClick={async () => { await onSave(val.trim()); setEditing(false); }}>Simpan</Button>
      <Button size="sm" variant="ghost" onClick={() => { setVal(value); setEditing(false); }}>Batal</Button>
    </div>
  ) : (
    <button type="button" className="text-left hover:underline" onClick={() => setEditing(true)}>{value || '-'}</button>
  );
}

function InlineEditableSelect({ value, options, onSave }: { value: string; options: string[]; onSave: (v: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  return editing ? (
    <div className="flex items-center gap-2">
      <Select value={val} onValueChange={setVal}>
        <SelectTrigger className="h-8 w-[220px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem key="" value="">(kosong)</SelectItem>
          {options.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={async () => { await onSave(val); setEditing(false); }}>Simpan</Button>
      <Button size="sm" variant="ghost" onClick={() => { setVal(value); setEditing(false); }}>Batal</Button>
    </div>
  ) : (
    <button type="button" className="text-left hover:underline" onClick={() => setEditing(true)}>{value || '-'}</button>
  );
}

interface GeoLayerRow {
  id: string;
  key: string;
  name: string;
  geometry_type: string | null;
  created_at: string;
}

// Old inline importers removed in favor of UnifiedImporter

export default function GeoDataManager() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<GeoLayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyVal, setKeyVal] = useState('admin_boundaries');
  const [name, setName] = useState('Admin Boundaries');
  const [importMode, setImportMode] = useState<ImportMode>('layer');
  const [layerSearch, setLayerSearch] = useState('');
  const [layerSort, setLayerSort] = useState<'created_at_desc'|'name_asc'>('created_at_desc');
  const [missingAdminLayer, setMissingAdminLayer] = useState(false);
  // Popup configurator state removed

  // Assets tab state & logic (ported from Assets.tsx)
  type Asset = {
    id: string;
    code: string;
    name: string;
    category: 'jalan' | 'jembatan' | 'irigasi' | 'drainase' | 'sungai' | 'lainnya';
    latitude: number;
    longitude: number;
    keterangan: string | null;
    status: 'aktif' | 'nonaktif' | 'rusak';
    created_at: string;
  };

  // Asset geometry helpers moved into UnifiedImporter

  const [assetRows, setAssetRows] = useState<Asset[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<'all' | Asset['category']>('all');
  const [status, setStatus] = useState<'all' | Asset['status']>('all');
  // unified importer handles importing state internally

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ code: string; name: string; category: Asset['category']; latitude: string; longitude: string; keterangan: string }>(
    { code: '', name: '', category: 'lainnya', latitude: '', longitude: '', keterangan: '' }
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

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  const createAsset = async () => {
    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (!form.code || !form.name || Number.isNaN(lat) || Number.isNaN(lon)) return toast.error('Lengkapi form dengan benar');
  const payload = { code: form.code, name: form.name, category: form.category, latitude: lat, longitude: lon, keterangan: form.keterangan };
    const { error } = await supabase.from('assets').insert(payload);
    if (error) return toast.error('Gagal menambah aset');
    toast.success('Aset ditambahkan');
    setOpen(false);
  setForm({ code: '', name: '', category: 'lainnya', latitude: '', longitude: '', keterangan: '' });
    void loadAssets();
    // Publish/update assets as a GeoJSON FeatureCollection layer so it appears on the map
    try {
      const { data: allAssets } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      const list = (allAssets ?? []) as Asset[];
      const fc = {
        type: 'FeatureCollection',
        features: list.map((a) => ({
          type: 'Feature',
          properties: { id: a.id, code: a.code, name: a.name, category: a.category, status: a.status, keterangan: a.keterangan },
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
    if (!error) {
      let list = (data ?? []) as GeoLayerRow[];
      // If admin boundaries layer is not listed, try fetching it explicitly (key-based fetch)
      const hasAdmin = list.some((r) => r.key === 'admin_boundaries');
      if (!hasAdmin) {
        try {
          const res = await supabase
            .from('geo_layers')
            .select('id,key,name,geometry_type,created_at')
            .eq('key', 'admin_boundaries')
            .maybeSingle();
          if (!res.error && res.data) {
            list = [res.data as GeoLayerRow, ...list];
          } else {
            setMissingAdminLayer(true);
          }
        } catch {
          setMissingAdminLayer(true);
        }
      } else {
        setMissingAdminLayer(false);
      }
      setRows(list);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Using UnifiedImporter callbacks; popup configurator removed

  const delById = async (row: GeoLayerRow) => {
    const { error } = await supabase.from('geo_layers').delete().eq('id', row.id);
    if (error) {
      // fallback by key in case id mismatch occurred
      const byKey = await supabase.from('geo_layers').delete().eq('key', row.key);
      if (byKey.error) {
        return toast.error('Gagal menghapus layer');
      }
    }
    toast.success('Layer dihapus');
    void load();
  };

  // Popup configurator handlers removed

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

      {/* Unified Importer with mode toggle */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Impor Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Mode Impor</Label>
              <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
                <SelectTrigger><SelectValue placeholder="Pilih mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="layer">Layer</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <UnifiedImporter
            key={importMode}
            mode={importMode}
            initialKey={keyVal}
            initialName={name}
            onSaveLayer={async ({ key, name, geometry_type, data }) => {
              // Auto-detect geometry type from data: choose most frequent
              try {
                const fc = (data as { featureCollection?: { features?: Array<{ geometry?: { type?: string } }> } }).featureCollection;
                if (fc && Array.isArray(fc.features) && fc.features.length > 0) {
                  const counter = new Map<string, number>();
                  fc.features.forEach((f) => {
                    const t = f?.geometry?.type;
                    if (t) counter.set(t, (counter.get(t) || 0) + 1);
                  });
                  const best = Array.from(counter.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
                  if (best) geometry_type = best;
                }
              } catch { /* noop */ }
              const { error } = await supabase.from('geo_layers').upsert({ key, name, geometry_type, data }, { onConflict: 'key' });
              if (error) toast.error('Gagal menyimpan layer');
              else {
                toast.success('Layer disimpan');
                setKeyVal(key);
                setName(name);
                void load();
              }
            }}
            onSaveAssets={async (toInsert) => {
              // helpers
              const chunk = <T,>(arr: T[], size: number): T[][] => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
              const dedupBy = <T extends { code: string }>(arr: T[]): T[] => {
                const map = new Map<string, T>();
                for (const item of arr) {
                  const key = String(item.code).trim();
                  if (!key) continue; // skip invalid
                  // prefer last occurrence to override previous
                  map.set(key, item);
                }
                return Array.from(map.values());
              };
              try {
                const deduped = dedupBy(toInsert as Array<{ code: string }>);
                const removed = toInsert.length - deduped.length;
                if (removed > 0) {
                  toast.info(`${removed} duplikat kode aset digabung otomatis`);
                }
                const batches = chunk(deduped as Array<{ code: string; name: string; category: Asset['category']; latitude: number; longitude: number; keterangan: string | null; status: Asset['status'] }>, 500);
                for (const part of batches) {
                  const { error } = await supabase
                    .from('assets')
                    .upsert(part, { onConflict: 'code' });
                  if (error) throw error;
                }
                toast.success(`Berhasil impor ${toInsert.length} aset`);
                void loadAssets();
                try {
                  const { data: allAssets } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
                  const list = (allAssets ?? []) as Asset[];
                  const fc = {
                    type: 'FeatureCollection',
                    features: list.map((a) => ({
                      type: 'Feature',
                      properties: { id: a.id, code: a.code, name: a.name, category: a.category, status: a.status, keterangan: a.keterangan },
                      geometry: { type: 'Point', coordinates: [a.longitude, a.latitude] },
                    })),
                  };
                  await supabase.from('geo_layers').upsert({ key: 'assets', name: 'Assets', geometry_type: 'Point', data: { featureCollection: fc, crs: 'EPSG:4326' } }, { onConflict: 'key' });
                } catch (e) {
                  console.warn('Failed to publish assets layer', e);
                  toast.warning('Aset terimpor, namun publikasi layer gagal. Coba refresh atau ulangi.');
                }
              } catch (err) {
                console.error(err);
                const message = (err as { message?: string })?.message || 'Gagal mengimpor aset';
                toast.error('Gagal mengimpor aset', { description: message });
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Layers section */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Daftar Layer</CardTitle></CardHeader>
        <CardContent>
          {missingAdminLayer && (
            <div className="mb-3 p-3 border rounded bg-muted/40 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>Layer batas administrasi belum terdaftar di database. Anda bisa memulihkannya dari data publik.</div>
              <div>
                <Button size="sm" variant="outline" onClick={async () => {
                  try {
                    // Try common public files
                    const candidates = [
                      '/data/ciamis_kecamatan.geojson',
                      '/data/adm_ciamis.geojson',
                    ];
                    let fc: unknown = null;
                    for (const url of candidates) {
                      try {
                        const r = await fetch(url, { cache: 'no-cache' });
                        if (r.ok) { fc = await r.json(); break; }
                      } catch (e) {
                        // ignore and try next candidate
                      }
                    }
                    if (!fc || (fc as { type?: string }).type !== 'FeatureCollection') {
                      return toast.error('Gagal memuat file batas administrasi dari /public/data');
                    }
                    const { error } = await supabase.from('geo_layers').upsert({
                      key: 'admin_boundaries',
                      name: 'Batas Administrasi',
                      geometry_type: 'Polygon',
                      data: { featureCollection: fc, crs: 'EPSG:4326' },
                    }, { onConflict: 'key' });
                    if (error) return toast.error('Gagal menyimpan layer batas administrasi');
                    toast.success('Layer batas administrasi dipulihkan');
                    setMissingAdminLayer(false);
                    void load();
                  } catch (e) {
                    console.warn(e);
                    toast.error('Gagal memulihkan layer batas administrasi');
                  }
                }}>Pulihkan Batas Administrasi</Button>
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-3 items-center mb-3">
            <div className="w-full md:w-64">
              <Input placeholder="Cari layer…" value={layerSearch} onChange={(e) => setLayerSearch(e.target.value)} />
            </div>
            <div>
              <Select value={layerSort} onValueChange={(v) => setLayerSort(v as typeof layerSort)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Urutkan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at_desc">Terbaru</SelectItem>
                  <SelectItem value="name_asc">Nama (A→Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                {rows
                  .filter((r) => r.key.toLowerCase().includes(layerSearch.toLowerCase()) || r.name.toLowerCase().includes(layerSearch.toLowerCase()))
                  .sort((a, b) => layerSort === 'name_asc' ? a.name.localeCompare(b.name) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.key}</TableCell>
                    <TableCell>
                      <InlineEditableText
                        value={r.name}
                        onSave={async (val) => {
                          if (!val || val === r.name) return;
                          const { error } = await supabase.from('geo_layers').update({ name: val }).eq('id', r.id);
                          if (!error) { toast.success('Nama layer diperbarui'); void load(); }
                          else toast.error('Gagal memperbarui nama layer');
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditableSelect
                        value={r.geometry_type ?? ''}
                        options={['Point','LineString','Polygon','MultiPoint','MultiLineString','MultiPolygon','GeometryCollection']}
                        onSave={async (val) => {
                          if (val === r.geometry_type) return;
                          const { error } = await supabase.from('geo_layers').update({ geometry_type: val || null }).eq('id', r.id);
                          if (!error) { toast.success('Tipe geometri diperbarui'); void load(); }
                          else toast.error('Gagal memperbarui tipe geometri');
                        }}
                      />
                    </TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">Hapus</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus layer “{r.name}”?</AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void delById(r)}>Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">{loading ? 'Memuat…' : 'Belum ada layer'}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assets section */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold">Asset Registry</div>
        <div className="flex gap-2">
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
                        <TableCell>
                          <Select value={r.category} onValueChange={async (v) => {
                            if (v === r.category) return;
                            const { error } = await supabase.from('assets').update({ category: v as Asset['category'] }).eq('id', r.id);
                            if (!error) { toast.success('Kategori aset diperbarui'); void loadAssets(); }
                            else toast.error('Gagal memperbarui kategori aset');
                          }}>
                            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="jalan">Jalan</SelectItem>
                              <SelectItem value="jembatan">Jembatan</SelectItem>
                              <SelectItem value="irigasi">Irigasi</SelectItem>
                              <SelectItem value="drainase">Drainase</SelectItem>
                              <SelectItem value="sungai">Sungai</SelectItem>
                              <SelectItem value="lainnya">Lainnya</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={r.status} onValueChange={async (v) => {
                            if (v === r.status) return;
                            const { error } = await supabase.from('assets').update({ status: v as Asset['status'] }).eq('id', r.id);
                            if (!error) { toast.success('Status aset diperbarui'); void loadAssets(); }
                            else toast.error('Gagal memperbarui status aset');
                          }}>
                            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aktif">Aktif</SelectItem>
                              <SelectItem value="nonaktif">Nonaktif</SelectItem>
                              <SelectItem value="rusak">Rusak</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
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
                  <Label>Keterangan</Label>
              <Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button onClick={createAsset}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup configurator removed */}
    </div>
  );
}
