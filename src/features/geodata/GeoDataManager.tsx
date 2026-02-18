import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/services/client';
import { useAuth } from '@/features/auth/useAuth';
import { useLayerManager, type LayerData } from '@/features/map/useLayerManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import UnifiedImporter from '@/features/geodata/UnifiedImporter';
import LayerInspector from '@/features/geodata/LayerInspector';
import LayerUploader from '@/features/geodata/LayerUploader';
import { Loader2, Map as MapIcon, Eye, EyeOff, RefreshCw, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as turf from '@turf/turf';

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

export default function GeoDataManager() {
  const { user, isAdmin } = useAuth();
  const { layers, loading, fetchLayers, deleteLayer, updateLayer } = useLayerManager();
  const navigate = useNavigate();
  const [keyVal, setKeyVal] = useState('admin_boundaries');
  const [name, setName] = useState('Admin Boundaries');
  const [layerSearch, setLayerSearch] = useState('');
  const [layerSort, setLayerSort] = useState<'created_at_desc'|'name_asc'|'feature_count'>('created_at_desc');
  const [geometryFilter, setGeometryFilter] = useState<string>('all');
  const [validationFilter, setValidationFilter] = useState<'all'|'valid'|'invalid'>('all');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectKey, setInspectKey] = useState<string | null>(null);
  const [layerValidation, setLayerValidation] = useState(() => new Map<string, { valid: boolean; errorCount: number; featureCount: number }>());
  const [layerStats, setLayerStats] = useState(() => new Map<string, { featureCount: number; bounds?: number[] }>());

  const validateLayerById = useCallback(async (layerId: string, layerKey: string) => {
    try {
      const { data, error } = await supabase
        .from('geo_layers')
        .select('data')
        .eq('id', layerId)
        .limit(1)
        .maybeSingle();
      
      if (error || !data) return { valid: true, errorCount: 0, featureCount: 0 };
      
      const layerData = data as { data: { featureCollection?: { features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }> } } };
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
        const bbox = turf.bbox(fc as GeoJSON.FeatureCollection);
        setLayerStats(prev => {
          const next = new Map(prev);
          next.set(layerKey, { featureCount, bounds: bbox });
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
        .eq('id', row.id)
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
        .eq('id', row.id);
      
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
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${(data || []).length} layer berhasil diekspor`);
    } catch (e) {
      toast.error('Gagal mengekspor layer');
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
      if (layerSort === 'name_asc') return a.name.localeCompare(b.name);
      if (layerSort === 'feature_count') {
        const aCount = layerStats.get(a.key)?.featureCount || 0;
        const bCount = layerStats.get(b.key)?.featureCount || 0;
        return bCount - aCount;
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
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
          <Button size="sm" variant="outline" onClick={handleBatchExport}>
            <Download className="h-4 w-4 mr-2" />
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
              const { error } = await supabase.from('geo_layers').upsert({ key, name, geometry_type, data }, { onConflict: 'key' });
              if (error) throw error;
              void fetchLayers();
            }}
          />
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
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
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
                    <TableHead className="font-semibold">Fitur</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLayers.map((r) => {
                    const stats = layerStats.get(r.key);
                    const validation = layerValidation.get(r.key);
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
                        <TableCell>
                          <span className="font-semibold">{stats?.featureCount || 0}</span>
                        </TableCell>
                        <TableCell>
                          {validation && !validation.valid ? (
                            <Badge variant="destructive">⚠️ {validation.errorCount} error</Badge>
                          ) : (
                            <Badge variant="secondary">✓ Valid</Badge>
                          )}
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
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          {loading ? (
                            <><Loader2 className="h-8 w-8 animate-spin" /><span>Memuat layer...</span></>
                          ) : (
                            <><span className="text-4xl">📂</span><span>Tidak ada layer yang sesuai filter</span></>
                          )}
                        </div>
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
