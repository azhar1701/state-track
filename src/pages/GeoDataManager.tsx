import React, { useCallback, useEffect, useState, Component, ReactNode } from 'react';
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
import { ArrowUp, ArrowDown } from 'lucide-react';

// Local error boundary to prevent the whole page from crashing when dialog content fails
class LocalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.error('[Popup Configurator] render error:', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-2 text-sm">
          <div className="text-red-600">Gagal merender konfigurator popup.</div>
          <div className="text-muted-foreground">Tutup dialog lalu buka lagi. Jika tetap terjadi, coba bersihkan konfigurasi UI layer.</div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupLayer, setPopupLayer] = useState<GeoLayerRow | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [availableProps, setAvailableProps] = useState<string[]>([]);
  const [popupTitleField, setPopupTitleField] = useState<string | ''>('');
  const [popupFields, setPopupFields] = useState<Array<{ field: string; label?: string }>>([]);
  const [sampleProps, setSampleProps] = useState<Record<string, unknown> | null>(null);
  // Render-time safety: sanitize popup fields and sample props
  const safeAvailableProps = Array.isArray(availableProps) ? availableProps.filter((p): p is string => typeof p === 'string') : [];
  const safeTitleField = (typeof popupTitleField === 'string' && safeAvailableProps.includes(popupTitleField)) ? popupTitleField : '';
  const safePopupFields: Array<{ field: string; label?: string }> = (Array.isArray(popupFields) ? popupFields : [])
    .filter((f) => !!f && typeof f === 'object')
    // coerce into the target shape with runtime checks
    .map((f: unknown) => {
      const obj = f as { field?: unknown; label?: unknown };
      const field = typeof obj.field === 'string' ? obj.field : '';
      const label = obj.label != null ? String(obj.label) : undefined;
      return { field, label } as { field: string; label?: string };
    })
    .filter((f) => f.field && safeAvailableProps.includes(f.field));
  const safeSampleProps: Record<string, unknown> | null = (sampleProps && typeof sampleProps === 'object' && !Array.isArray(sampleProps)) ? sampleProps : null;

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

  // Old handleUpload removed; using UnifiedImporter callbacks instead

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

  const openPopupConfigurator = async (row: GeoLayerRow) => {
    setPopupLayer(row);
    setPopupOpen(true);
    setPopupLoading(true);
    try {
      const res = await supabase
        .from('geo_layers')
        .select('data')
        .eq('id', row.id)
        .maybeSingle();
      const { error } = res;
      let data = res.data;
      if (error) throw error;
      // Fallback: fetch by key if id-based query returned no data
      if (!data || typeof data.data === 'undefined' || data.data === null) {
        const byKey = await supabase
          .from('geo_layers')
          .select('data')
          .eq('key', row.key)
          .limit(1)
          .maybeSingle();
        if (!byKey.error && byKey.data) {
          data = byKey.data as typeof data;
        }
      }
      const dbVal = (data?.data as unknown);
      // Allow JSON stored as string
      let raw: unknown = dbVal;
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch { raw = {}; }
      }
      // Accept wrapper { featureCollection, crs, ui? }
      let fc: { type?: string; features?: Array<{ properties?: Record<string, unknown> }> } | null = null;
      let ui: { titleField?: string; popupFields?: Array<{ field: string; label?: string }> } | null = null;
      if (raw && typeof raw === 'object') {
        if ('featureCollection' in (raw as Record<string, unknown>)) {
          const w = raw as { featureCollection?: unknown; ui?: unknown };
          if (w.featureCollection && (w.featureCollection as { type?: string }).type === 'FeatureCollection') {
            fc = w.featureCollection as { type?: string; features?: Array<{ properties?: Record<string, unknown> }> };
          }
          if (w.ui && typeof w.ui === 'object') {
            ui = w.ui as { titleField?: string; popupFields?: Array<{ field: string; label?: string }> };
          }
        } else if ((raw as { type?: string }).type === 'FeatureCollection') {
          fc = raw as unknown as { type?: string; features?: Array<{ properties?: Record<string, unknown> }> };
        } else {
          const vals = Object.values(raw as Record<string, unknown>);
          const found = vals.find((v) => !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection');
          if (found) fc = found as unknown as { type?: string; features?: Array<{ properties?: Record<string, unknown> }> };
        }
      }
      const names = new Set<string>();
      const feats = Array.isArray(fc?.features) ? fc!.features.slice(0, 20) : [];
      feats.forEach((f) => Object.keys((f?.properties as Record<string, unknown> | undefined) || {}).forEach((k) => names.add(k)));
      // capture one sample feature properties for preview
      const firstProps = (Array.isArray(fc?.features) && fc!.features.length > 0) ? (fc!.features[0].properties || null) : null;
      setSampleProps(firstProps as Record<string, unknown> | null);
      const propsArr = Array.from(names);
      setAvailableProps(propsArr);
      // normalize title to '' if not available in properties
      const initialTitle = ui?.titleField || '';
      let titleField = (initialTitle && propsArr.includes(initialTitle)) ? initialTitle : '';
      const pfRaw = Array.isArray(ui?.popupFields) ? (ui!.popupFields as Array<unknown>) : [];
      let pfParsed = pfRaw
        .map((x) => (x && typeof x === 'object' ? x as { field?: unknown; label?: unknown } : { field: undefined, label: undefined }))
        .filter((x) => typeof x.field === 'string' && (x.field as string).length > 0)
        .map((x) => ({ field: String(x.field), label: x.label != null ? String(x.label) : undefined }));
      // Clamp to available props to avoid Select mismatch errors
      pfParsed = pfParsed.map((f) => ({ field: propsArr.includes(f.field) ? f.field : '', label: f.label }));
      // If no UI config provided, suggest sensible defaults based on layer key
      if ((!ui || pfParsed.length === 0) && row?.key) {
        const pick = (...candidates: string[]) => candidates.find((c) => c && propsArr.includes(c)) || '';
        const keyLower = row.key.toLowerCase();
        if (row.key === 'admin_boundaries') {
          const desa = pick('DESA_1','DESA','name','NAMOBJ');
          const kec = pick('KECAMATAN','Kecamatan');
          titleField = desa || kec || titleField;
          pfParsed = [
            desa ? { field: desa, label: 'Desa' as string } : null,
            kec ? { field: kec, label: 'Kecamatan' as string } : null,
          ].filter(Boolean) as Array<{ field: string; label: string }>;
        } else if (keyLower.includes('sungai') || keyLower.includes('river')) {
          const nama = pick('NAMOBJ','name','NAMA');
          const kec = pick('KECAMATAN','Kecamatan');
          titleField = nama || titleField;
          pfParsed = [
            nama ? { field: nama, label: 'Nama' as string } : null,
            kec ? { field: kec, label: 'Kecamatan' as string } : null,
          ].filter(Boolean) as Array<{ field: string; label: string }>;
        }
      }
      setPopupTitleField(titleField);
      setPopupFields(pfParsed);
    } catch (e) {
      console.warn('Failed to load layer data for popup config', e);
      setAvailableProps([]);
      setPopupTitleField('');
      setPopupFields([]);
      setSampleProps(null);
      toast.error('Gagal memuat data layer untuk konfigurasi');
    } finally {
      setPopupLoading(false);
    }
  };

  const savePopupConfigurator = async () => {
    if (!popupLayer) return;
    try {
      setPopupLoading(true);
      const { data, error } = await supabase
        .from('geo_layers')
        .select('data')
        .eq('id', popupLayer.id)
        .maybeSingle();
      if (error) throw error;
      // Parse stored data which could be an object, a stringified JSON, or a direct FeatureCollection
      let raw: unknown = (data?.data as unknown) || {};
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch { raw = {}; }
      }
      // Normalize saved popup fields: filter empties and clamp to available props
      const propsSet = new Set(availableProps);
      const cleanedFields = (popupFields || [])
        .filter((f) => f && typeof f.field === 'string' && f.field.length > 0)
        .map((f) => ({ field: propsSet.has(f.field) ? f.field : '', label: f.label || undefined }))
        .filter((f) => f.field !== '');
      const newUi = { titleField: (popupTitleField && propsSet.has(popupTitleField)) ? popupTitleField : undefined, popupFields: cleanedFields };

      // Build new data preserving existing featureCollection/crs if present
      let newData: Record<string, unknown> = {};
      if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        // If already in preferred wrapper shape, merge into it
        if ('featureCollection' in obj || 'crs' in obj || 'ui' in obj) {
          newData = { ...obj, ui: newUi };
        } else if ((obj as { type?: string }).type === 'FeatureCollection') {
          // Wrap legacy direct FC
          newData = { featureCollection: obj, crs: 'EPSG:4326', ui: newUi };
        } else {
          // Unknown object shape: keep original keys and just add/overwrite ui
          newData = { ...obj, ui: newUi };
        }
      } else {
        // raw was not an object (null/array/string) → write as wrapper with whatever we can
        newData = { ui: newUi };
      }

      const { error: upErr } = await supabase
        .from('geo_layers')
        .update({ data: newData })
        .eq('id', popupLayer.id);
      if (upErr) throw upErr;
      toast.success('Konfigurasi popup disimpan');
      setPopupOpen(false);
    } catch (e) {
      console.warn('Failed saving popup config', e);
      toast.error('Gagal menyimpan konfigurasi');
    } finally {
      setPopupLoading(false);
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
                            <Button size="sm" variant="outline" onClick={() => void openPopupConfigurator(r)}>Atur Popup</Button>
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

      {/* Popup configurator dialog */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atur Popup Layer {popupLayer?.name ? `“${popupLayer.name}”` : ''}</DialogTitle>
          </DialogHeader>
          <LocalErrorBoundary>
          <div className="space-y-4">
            {popupLoading ? (
              <div className="text-sm text-muted-foreground">Memuat…</div>
            ) : (
              <>
                 <div>
                  <Label>Field Judul (opsional)</Label>
                  <Select value={safeTitleField} onValueChange={(v) => setPopupTitleField(v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih field judul" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">(kosong)</SelectItem>
                      {safeAvailableProps.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Field Popup</Label>
                    <Button size="sm" variant="outline" onClick={() => setPopupFields((f) => [...f, { field: '' }])}>Tambah Field</Button>
                  </div>
                  <div className="space-y-2">
                    {(Array.isArray(popupFields) ? popupFields : []).length === 0 && (
                      <div className="text-sm text-muted-foreground">Belum ada field. Tambahkan untuk menampilkan atribut di popup.</div>
                    )}
                    {(Array.isArray(popupFields) ? popupFields : []).map((pf, idx) => {
                      const fieldVal = pf && typeof pf === 'object' && typeof (pf as { field?: unknown }).field === 'string' ? (pf as { field: string }).field : '';
                      const labelVal = pf && typeof pf === 'object' && typeof (pf as { label?: unknown }).label === 'string' ? (pf as { label: string }).label : '';
                      return (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                        <div className="md:col-span-3">
                          <Select value={fieldVal} onValueChange={(v) => setPopupFields((arr) => {
                            const base = Array.isArray(arr) ? [...arr] : [] as Array<{ field: string; label?: string }>;
                            base[idx] = { field: v, label: labelVal };
                            return base;
                          })}>
                            <SelectTrigger><SelectValue placeholder="Pilih field" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">(pilih)</SelectItem>
                              {safeAvailableProps.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-3">
                          <Input placeholder="Label (opsional)" value={labelVal} onChange={(e) => setPopupFields((arr) => {
                            const base = Array.isArray(arr) ? [...arr] : [] as Array<{ field: string; label?: string }>;
                            base[idx] = { field: fieldVal, label: e.target.value };
                            return base;
                          })} />
                        </div>
                        <div className="md:col-span-1 flex items-center justify-end gap-2">
                          <Button size="icon" variant="outline" disabled={idx === 0} onClick={() => setPopupFields((arr) => {
                            if (!Array.isArray(arr) || idx === 0) return arr as typeof arr;
                            const next = [...arr];
                            const tmp = next[idx - 1];
                            next[idx - 1] = next[idx];
                            next[idx] = tmp;
                            return next;
                          })} aria-label="Pindah ke atas">
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="outline" disabled={idx === (Array.isArray(popupFields) ? popupFields.length - 1 : 0)} onClick={() => setPopupFields((arr) => {
                            if (!Array.isArray(arr) || idx === arr.length - 1) return arr as typeof arr;
                            const next = [...arr];
                            const tmp = next[idx + 1];
                            next[idx + 1] = next[idx];
                            next[idx] = tmp;
                            return next;
                          })} aria-label="Pindah ke bawah">
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setPopupFields((arr) => (Array.isArray(arr) ? arr.filter((_, i) => i !== idx) : []))}>Hapus</Button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
                {/* Live preview */}
                <div className="rounded-md border p-3 bg-muted/30">
                  <div className="text-sm font-medium mb-2">Pratinjau Popup</div>
                  {safeSampleProps ? (
                    <div className="text-sm space-y-1">
                      <div className="font-semibold">{(() => {
                        const t = safeTitleField && safeSampleProps ? (safeSampleProps[safeTitleField] as unknown) : undefined;
                        return (t != null && t !== '') ? String(t) : (String(popupLayer?.name || ''));
                      })()}</div>
                      {safePopupFields.length > 0 ? (
                        <div className="space-y-0.5">
                          {safePopupFields.map((f, i) => {
                            const label = f.label || f.field || `Field ${i+1}`;
                            const val = f.field ? safeSampleProps[f.field] : undefined;
                            return (
                              <div key={i}><strong>{label}:</strong> {val == null || val === '' ? '-' : String(val)}</div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">(Tidak ada atribut yang dipilih)</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Data contoh tidak tersedia untuk pratinjau</div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setPopupTitleField(''); setPopupFields([]); }}>Bersihkan konfigurasi</Button>
                  <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setPopupOpen(false)}>Batal</Button>
                  <Button onClick={() => {
                    // filter out empty fields before saving (local state only)
                    setPopupFields((prev) => prev.filter((f) => f.field && String(f.field).length > 0));
                    void savePopupConfigurator();
                  }} disabled={popupLoading}>Simpan</Button>
                  </div>
                </div>
              </>
            )}
          </div>
          </LocalErrorBoundary>
        </DialogContent>
      </Dialog>
    </div>
  );
}
