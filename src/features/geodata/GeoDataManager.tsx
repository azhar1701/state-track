import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { supabase } from '@/services/client';
import { useAuth } from '@/features/auth/useAuth';
import type { Database } from '@/services/types';
import { useLayerManager, type LayerData } from '@/features/map/useLayerManager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import LayerInspector from '@/features/geodata/LayerInspector';
import LayerUploader from '@/features/geodata/LayerUploader';
import { Loader2, Map as MapIcon, Eye, RefreshCw, Download, Upload, XCircle, ArrowDownUp, GripVertical, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { bbox } from '@turf/turf';

function InlineEditableText({ value, onSave }: { value: string; onSave: (v: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  // Sync local state when prop changes (e.g. after refresh)
  useEffect(() => {
    if (!editing) setVal(value);
  }, [value, editing]);

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

export default function GeoDataManager() {
  const { user, isAdmin } = useAuth();
  const { layers, loading, fetchLayers, deleteLayer, updateLayer, updateLayerOrder } = useLayerManager();
  const navigate = useNavigate();
  const [layerSearch, setLayerSearch] = useState('');
  const [layerSort, setLayerSort] = useState<'sort_order' | 'created_at_desc' | 'name_asc' | 'feature_count'>('sort_order');
  const [geometryFilter, setGeometryFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectKey, setInspectKey] = useState<string | null>(null);
  const [layerValidation, setLayerValidation] = useState(() => new Map<string, { valid: boolean; errorCount: number; featureCount: number }>());
  const [layerStats, setLayerStats] = useState(() => new Map<string, { featureCount: number; bounds?: number[] }>());
  const [isExporting, setIsExporting] = useState(false);

  // Layer order management state
  const [orderedLayers, setOrderedLayers] = useState<LayerData[]>([]);
  const [isDirtyOrder, setIsDirtyOrder] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDirtyOrder) {
      const sorted = [...layers].sort((a, b) => (a.sort_order ?? 500) - (b.sort_order ?? 500));
      setOrderedLayers(sorted);
    }
  }, [layers, isDirtyOrder]);

  const handleMoveLayer = async (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= orderedLayers.length) return;

    const next = [...orderedLayers];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setOrderedLayers(next);

    const BASE = 360;
    const STEP = 10;
    const updates = next.map((l, i) => ({
      id: l.id!,
      sort_order: BASE + i * STEP,
    }));

    setSavingOrder(true);
    try {
      await updateLayerOrder(updates);
      setIsDirtyOrder(false);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    const next = [...orderedLayers];
    const [dragged] = next.splice(dragIndexRef.current, 1);
    next.splice(index, 0, dragged);
    dragIndexRef.current = index;
    setOrderedLayers(next);
    setIsDirtyOrder(true);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
  };

  const handleSaveLayerOrder = async () => {
    setSavingOrder(true);
    try {
      const BASE = 360;
      const STEP = 10;
      const updates = orderedLayers.map((l, i) => ({
        id: l.id!,
        sort_order: BASE + i * STEP,
      }));
      await updateLayerOrder(updates);
      setIsDirtyOrder(false);
    } finally {
      setSavingOrder(false);
    }
  };

  const validateLayerById = useCallback(async (layerId: string, layerKey: string) => {
    try {
      const { data, error } = await supabase
        .from('geo_layers')
        .select('data')
        .eq('id', layerId)
        .limit(1)
        .maybeSingle();

      if (error || !data) return { valid: true, errorCount: 0, featureCount: 0 };

      const layerData = data as { data: { featureCollection?: FeatureCollection } };
      const fc = layerData.data?.featureCollection;
      if (!fc || !Array.isArray(fc.features)) return { valid: true, errorCount: 0, featureCount: 0 };

      let errors = 0;
      const featureCount = fc.features.length;

      fc.features.forEach((f) => {
        if (!f.geometry || !f.geometry.type) errors++;
        else if (f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates)) {
          (f.geometry.coordinates as number[][][]).forEach((ring) => {
            if (ring.length < 4) errors++;
            else {
              const [fx, fy] = ring[0], [lx, ly] = ring[ring.length - 1];
              if (fx !== lx || fy !== ly) errors++;
            }
          });
        }
      });

      try {
        const bounds = bbox(fc);
        setLayerStats(prev => {
          const next = new Map(prev);
          next.set(layerKey, { featureCount, bounds });
          return next;
        });
      } catch {
        setLayerStats(prev => {
          const next = new Map(prev);
          next.set(layerKey, { featureCount });
          return next;
        });
      }

      return { valid: errors === 0, errorCount: errors, featureCount };
    } catch {
      return { valid: true, errorCount: 0, featureCount: 0 };
    }
  }, []);

  useEffect(() => {
    if (layers.length === 0) return;

    const validateLayers = async () => {
      const validation = new Map<string, { valid: boolean; errorCount: number; featureCount: number }>();

      for (const layer of layers.slice(0, 10)) {
        const result = await validateLayerById(layer.id || '', layer.key);
        validation.set(layer.key, result);
      }

      setLayerValidation(validation);
    };

    const timer = setTimeout(validateLayers, 300);
    return () => clearTimeout(timer);
  }, [layers, validateLayerById]);

  useEffect(() => {
    if (user) void fetchLayers();
  }, [user, fetchLayers]);

  const handleUpdateName = async (row: LayerData, newName: string) => {
    if (!newName || newName === row.name) return;
    await updateLayer(row.id || '', { name: newName });
  };

  const handleToggleVisibility = async (row: LayerData) => {
    try {
      const { data: currentData } = await supabase
        .from('geo_layers')
        .select('data')
        .eq('id', row.id || '')
        .single();

      if (!currentData) return;

      const raw = (currentData.data ?? {}) as { meta?: Record<string, unknown> };
      const meta = raw.meta || {};
      const currentVisibility = typeof meta.visibility_default === 'boolean' ? meta.visibility_default : true;

      const nextMeta = { ...meta, visibility_default: !currentVisibility };
      const nextData = { ...raw, meta: nextMeta };

      await supabase
        .from('geo_layers')
        .update({ data: nextData })
        .eq('id', row.id || '');

      toast.success(`Layer ${!currentVisibility ? 'ditampilkan' : 'disembunyikan'} di peta`);
      window.dispatchEvent(new CustomEvent('layer-visibility-changed', { detail: { key: row.key, visible: !currentVisibility } }));
      await fetchLayers();
    } catch (e) {
      toast.error('Gagal mengubah visibilitas layer');
    }
  };

  const handleViewOnMap = (row: LayerData) => {
    localStorage.setItem('focusLayer', row.key);
    navigate('/map');
  };

  const handleBatchExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.from('geo_layers').select('key,name,geometry_type,data,created_at');
      if (error) throw error;
      const payload = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        layers: data || [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-layers-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${(data || []).length} layer berhasil diekspor`);
    } catch (e) {
      toast.error('Gagal mengekspor layer');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredLayers = useMemo(() => {
    let result = layers.filter((r) =>
      r.key.toLowerCase().includes(layerSearch.toLowerCase()) ||
      r.name.toLowerCase().includes(layerSearch.toLowerCase())
    );

    if (geometryFilter !== 'all') {
      result = result.filter(r => r.geometry_type === geometryFilter);
    }

    if (validationFilter !== 'all') {
      result = result.filter(r => {
        const validation = layerValidation.get(r.key);
        if (!validation) return validationFilter === 'valid';
        return validationFilter === 'valid' ? validation.valid : !validation.valid;
      });
    }

    return result.sort((a, b) => {
      if (layerSort === 'sort_order') return (a.sort_order ?? 500) - (b.sort_order ?? 500);
      if (layerSort === 'name_asc') return a.name.localeCompare(b.name);
      if (layerSort === 'feature_count') {
        const aCount = layerStats.get(a.key)?.featureCount || 0;
        const bCount = layerStats.get(b.key)?.featureCount || 0;
        return bCount - aCount;
      }
      return new Date((b.created_at as unknown as string) || 0).getTime() - new Date((a.created_at as unknown as string) || 0).getTime();
    });
  }, [layers, layerSearch, layerSort, geometryFilter, validationFilter, layerValidation, layerStats]);

  if (!user || !isAdmin) return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader><CardTitle>Geo Data Manager</CardTitle></CardHeader>
        <CardContent>Hanya admin yang dapat mengakses halaman ini.</CardContent>
      </Card>
    </div>
  );

  const geometryTypes = Array.from(new Set(layers.map(l => l.geometry_type).filter(Boolean)));

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Geo Data Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola layer geospasial dan validasi data</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fetchLayers()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleBatchExport} disabled={isExporting || layers.length === 0}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export Semua
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Impor Layer Geospasial</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Upload file GeoJSON, Shapefile, atau CSV untuk menambah layer baru
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LayerUploader
            onSave={async ({ key, name, geometry_type, data }) => {
              const payload = { key, name, geometry_type, data } as unknown as Database['public']['Tables']['geo_layers']['Insert'];
              const { error } = await supabase.from('geo_layers').upsert(payload, { onConflict: 'key' });
              if (error) throw error;
              void fetchLayers();
            }}
          />
        </CardContent>
      </Card>

      {/* ===== Card Urutan Layer di Peta ===== */}
      <Card className="mb-6 border-2 border-primary/20 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowDownUp className="h-5 w-5 text-primary" />
                Urutan Layer di Peta (Z-Index Canvas)
              </CardTitle>
              <CardDescription className="mt-1">
                Atur urutan tumpukan layer di peta. Seret (drag-and-drop) baris atau gunakan tombol panah untuk memindahkan posisi.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isDirtyOrder ? (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">
                  Belum Disimpan
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Tersimpan
                </Badge>
              )}
              {isDirtyOrder && (
                <Button
                  size="sm"
                  onClick={handleSaveLayerOrder}
                  disabled={savingOrder}
                  className="gap-1.5"
                >
                  {savingOrder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Terapkan Urutan
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 border border-border/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pb-2 mb-2 border-b border-border/60">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                ↓ Lapisan Paling Bawah (Latar / Dasar Peta)
              </span>
              <span className="font-medium text-sky-600 dark:text-sky-400">
                ↑ Lapisan Paling Atas (Menimpa Layer Lain)
              </span>
            </div>

            {orderedLayers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada layer</p>
            ) : (
              <div className="space-y-2">
                {orderedLayers.map((layer, idx) => (
                  <div
                    key={layer.id || layer.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border bg-card hover:border-primary/40 hover:bg-accent/20 cursor-grab active:cursor-grabbing transition-all select-none"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="w-6 text-xs font-mono font-bold text-muted-foreground text-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center gap-2">
                        {layer.name}
                        <span className="text-[10px] text-muted-foreground font-mono font-normal">({layer.key})</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {layer.geometry_type || 'Geometri tidak diketahui'}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-mono shrink-0">
                      z={layer.sort_order ?? 500}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={savingOrder || idx === 0}
                        onClick={() => void handleMoveLayer(idx, 'up')}
                        title="Geser ke lapisan lebih bawah (nilai z lebih kecil)"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={savingOrder || idx === orderedLayers.length - 1}
                        onClick={() => void handleMoveLayer(idx, 'down')}
                        title="Geser ke lapisan lebih atas (nilai z lebih tinggi)"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground pt-3 px-1">
              💡 <strong>Tips:</strong> Layer di baris atas ditampilkan paling bawah di peta. Urutan layer otomatis disinkronkan ke kanvas peta secara real-time.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Daftar Layer</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary">{filteredLayers.length} / {layers.length}</Badge>
              {Array.from(layerValidation.values()).filter((v): v is { valid: boolean; errorCount: number; featureCount: number } => !v.valid).length > 0 && (
                <Badge variant="destructive">
                  ⚠️ {Array.from(layerValidation.values()).filter((v): v is { valid: boolean; errorCount: number; featureCount: number } => !v.valid).length} error
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                className="w-full sm:w-80"
                placeholder="🔍 Cari layer..."
                value={layerSearch}
                onChange={(e) => setLayerSearch(e.target.value)}
              />
              <Select value={geometryFilter} onValueChange={setGeometryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipe Geometri" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  {geometryTypes.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={validationFilter} onValueChange={(v) => setValidationFilter(v as typeof validationFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="valid">✓ Valid</SelectItem>
                  <SelectItem value="invalid">⚠️ Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={layerSort} onValueChange={(v) => setLayerSort(v as typeof layerSort)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sort_order">🗺️ Urutan Peta (Z-Index)</SelectItem>
                  <SelectItem value="created_at_desc">🕒 Terbaru</SelectItem>
                  <SelectItem value="name_asc">🔤 Nama (A-Z)</SelectItem>
                  <SelectItem value="feature_count">📊 Jumlah Fitur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Nama</TableHead>
                    <TableHead className="font-semibold">Tipe</TableHead>
                    <TableHead className="font-semibold text-center">Urutan di Peta</TableHead>
                    <TableHead className="font-semibold">Fitur</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLayers.map((r) => {
                    const stats = layerStats.get(r.key);
                    const orderIdx = orderedLayers.findIndex((l) => l.id === r.id);
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <InlineEditableText value={r.name} onSave={(val) => handleUpdateName(r, val)} />
                            <span className="text-xs text-muted-foreground font-mono">{r.key}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.geometry_type || '-'}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-md border text-xs">
                            <span className="font-mono font-semibold text-primary">z={r.sort_order ?? 500}</span>
                            <div className="flex flex-col gap-0.5 ml-1">
                              <button
                                type="button"
                                disabled={savingOrder || orderIdx <= 0}
                                onClick={() => {
                                  if (orderIdx > 0) void handleMoveLayer(orderIdx, 'up');
                                }}
                                className="p-0.5 hover:bg-background rounded disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors"
                                title="Geser ke lapisan lebih bawah (z-index lebih kecil)"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={savingOrder || orderIdx < 0 || orderIdx >= orderedLayers.length - 1}
                                onClick={() => {
                                  if (orderIdx >= 0 && orderIdx < orderedLayers.length - 1) void handleMoveLayer(orderIdx, 'down');
                                }}
                                className="p-0.5 hover:bg-background rounded disabled:opacity-20 text-muted-foreground hover:text-foreground transition-colors"
                                title="Geser ke lapisan lebih atas (z-index lebih tinggi)"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{stats?.featureCount || 0}</span>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            if (!layerValidation.has(r.key)) {
                              // Layer beyond the first 10 has not been validated
                              return <Badge variant="outline" className="text-muted-foreground text-xs">— Belum divalidasi</Badge>;
                            }
                            const v = layerValidation.get(r.key)!;
                            return v.valid
                              ? <Badge variant="secondary">✓ Valid</Badge>
                              : <Badge variant="destructive">⚠️ {v.errorCount} error</Badge>;
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleViewOnMap(r)} title="Lihat di Peta">
                              <MapIcon className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleVisibility(r)} title="Toggle Visibilitas">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setInspectKey(r.key); setInspectorOpen(true); }}>
                              Detail
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">Hapus</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus layer "{r.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => void deleteLayer(r)}>Hapus</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredLayers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        {loading ? (
                          // Skeleton shimmer — avoids CLS spinner anti-pattern
                          <div className="space-y-2 px-4">
                            {[...Array(4)].map((_, i) => (
                              <Skeleton key={i} className="h-12 w-full rounded-md" style={{ opacity: 1 - i * 0.2 }} />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <span className="text-4xl">📂</span>
                            <span className="text-sm">
                              {layerSearch || geometryFilter !== 'all' || validationFilter !== 'all'
                                ? 'Tidak ada layer yang sesuai filter'
                                : 'Belum ada layer. Upload layer pertama Anda.'}
                            </span>
                            {(layerSearch || geometryFilter !== 'all' || validationFilter !== 'all') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => {
                                  setLayerSearch('');
                                  setGeometryFilter('all');
                                  setValidationFilter('all');
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reset Filter
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <LayerInspector open={inspectorOpen} onOpenChange={setInspectorOpen} layerKey={inspectKey} />
    </div>
  );
}
