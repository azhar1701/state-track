import { handleApiError } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { supabase } from '@/services/client';
import type { FeatureCollection, Geometry } from 'geojson';
import LayerAttributeTable from './LayerAttributeTable';
import { Loader2 } from 'lucide-react';
import { sanitizeForLog, sanitizeHTML } from '@/lib/security';

type LayerInspectorProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  layerKey: string | null;
};

type LayerRow = {
  id: string;
  key: string;
  name: string;
  geometry_type: string | null;
  data: unknown;
};

const LayerInspector = ({ open, onOpenChange, layerKey }: LayerInspectorProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [row, setRow] = useState<LayerRow | null>(null);
  const [activeTab, setActiveTab] = useState('ringkasan');
  const dataCache = useRef<Map<string, LayerRow>>(new Map());
  const [meta, setMeta] = useState<{ source?: string; license?: string; tags?: string; visibility_default?: boolean; description?: string }>({});
  const [stats, setStats] = useState<{ featureCount: number; fields: Array<{ name: string; type: string }> } | null>(null);
  type Symbology = {
    point?: { color?: string; fillColor?: string; fillOpacity?: number; radius?: number; weight?: number };
    line?: { color?: string; weight?: number; opacity?: number; dashArray?: string };
    polygon?: { color?: string; weight?: number; opacity?: number; fillColor?: string; fillOpacity?: number };
  };
  const [style, setStyle] = useState<Symbology>({});
  const [featureCollection, setFeatureCollection] = useState<FeatureCollection<Geometry> | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!open || !layerKey) return;

      if (dataCache.current.has(layerKey)) {
        const cached = dataCache.current.get(layerKey)!;
        setRow(cached);
        const raw = (cached.data ?? {}) as { meta?: Record<string, unknown>; style?: Record<string, unknown>; featureCollection?: unknown };
        const m = raw?.meta || {};
        setMeta({
          source: typeof m.source === 'string' ? m.source : undefined,
          license: typeof m.license === 'string' ? m.license : undefined,
          tags: Array.isArray(m.tags) ? (m.tags as string[]).join(', ') : (typeof m.tags === 'string' ? m.tags : ''),
          visibility_default: typeof m.visibility_default === 'boolean' ? m.visibility_default : undefined,
          description: typeof m.description === 'string' ? m.description : undefined,
        });
        const s = (raw?.style || {}) as Record<string, unknown>;
        const norm = (obj: unknown) => (obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : undefined);
        setStyle({
          point: norm(s.point) as Symbology['point'],
          line: norm(s.line) as Symbology['line'],
          polygon: norm(s.polygon) as Symbology['polygon'],
        });
        const fc = raw.featureCollection && (raw.featureCollection as { type?: string }).type === 'FeatureCollection' ? raw.featureCollection as FeatureCollection<Geometry> : null;
        setFeatureCollection(fc);
        if (fc && fc.features) {
          const featureCount = fc.features.length;
          const fields: Array<{ name: string; type: string }> = [];
          const props = (fc.features[0]?.properties || {}) as Record<string, unknown>;
          Object.entries(props).slice(0, 20).forEach(([k, v]) => {
            fields.push({ name: k, type: Array.isArray(v) ? 'array' : typeof v });
          });
          setStats({ featureCount, fields });
        }
        return;
      }

      setLoading(true);
      setLoadingData(true);
      setFeatureCollection(null);
      setStats(null);
      setRow(null);
      try {
        const { data, error } = await supabase
          .from('geo_layers')
          .select('id,key,name,geometry_type')
          .eq('key', layerKey)
          .limit(1)
          .maybeSingle();
        if (error || !data) {
          toast.error('Gagal memuat layer');
          return;
        }
        const basicRow = { ...data, data: null } as LayerRow;
        setRow(basicRow);
        setLoading(false);

        const { data: fullData, error: dataError } = await supabase
          .from('geo_layers')
          .select('data')
          .eq('key', layerKey)
          .limit(1)
          .maybeSingle();

        if (dataError || !fullData) {
          setLoadingData(false);
          return;
        }

        const r = { ...basicRow, data: fullData.data } as LayerRow;
        setRow(r);
        dataCache.current.set(layerKey, r);
        const raw = (r.data ?? {}) as { meta?: Record<string, unknown>; style?: Record<string, unknown>; featureCollection?: unknown };
        const m = raw?.meta || {};
        setMeta({
          source: typeof m.source === 'string' ? m.source : undefined,
          license: typeof m.license === 'string' ? m.license : undefined,
          tags: Array.isArray(m.tags) ? (m.tags as string[]).join(', ') : (typeof m.tags === 'string' ? m.tags : ''),
          visibility_default: typeof m.visibility_default === 'boolean' ? m.visibility_default : undefined,
          description: typeof m.description === 'string' ? m.description : undefined,
        });
        const s = (raw?.style || {}) as Record<string, unknown>;
        const norm = (obj: unknown) => (obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : undefined);
        const next: Symbology = {
          point: norm(s.point) as Symbology['point'],
          line: norm(s.line) as Symbology['line'],
          polygon: norm(s.polygon) as Symbology['polygon'],
        };
        setStyle(next);
        const fc = (() => {
          if (raw.featureCollection && (raw.featureCollection as { type?: string }).type === 'FeatureCollection') {
            return raw.featureCollection as FeatureCollection<Geometry>;
          }
          return null;
        })();
        setFeatureCollection(fc);

        if (fc && fc.features) {
          const featureCount = fc.features.length;
          const fields: Array<{ name: string; type: string }> = [];
          const props = (fc.features[0]?.properties || {}) as Record<string, unknown>;
          Object.entries(props).slice(0, 20).forEach(([k, v]) => {
            fields.push({ name: k, type: Array.isArray(v) ? 'array' : typeof v });
          });
          setStats({ featureCount, fields });
        }
      } catch (err) {
        logger.error('[LayerInspector] Load error:', err);
        toast.error('Gagal memuat detail layer');
      } finally {
        setLoading(false);
        setLoadingData(false);
      }
    };
    void load();
  }, [open, layerKey]);

  const saveMeta = async () => {
    if (!row) return;
    setSavingMeta(true);
    try {
      // merge meta into data.meta without altering other fields
      const raw = (row.data ?? {}) as Record<string, unknown>;
      const prevMeta = (raw.meta as Record<string, unknown> | undefined) || {};
      const tagsArray = (meta.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
      const nextMeta = {
        ...prevMeta,
        source: meta.source || null,
        license: meta.license || null,
        tags: tagsArray.length ? tagsArray : null,
        visibility_default: typeof meta.visibility_default === 'boolean' ? meta.visibility_default : null,
        description: meta.description || null,
      } as Record<string, unknown>;
      const nextData = { ...raw, meta: nextMeta } as Record<string, unknown>;
      const updatePayload = { data: nextData } as Record<string, unknown>;
      const { error } = await supabase
        .from('geo_layers')
        .update(updatePayload)
        .eq('id', row.id);
      if (error) {
        logger.warn('[LayerInspector] saveMeta failed by id', sanitizeForLog(error));
        const fallback = await supabase
          .from('geo_layers')
          .update(updatePayload)
          .eq('key', row.key);
        if (fallback.error) {
          logger.error('[LayerInspector] saveMeta fallback failed', sanitizeForLog(fallback.error));
          toast.error(handleApiError(fallback.error, 'Gagal menyimpan metadata'));
          return;
        }
      }
      setRow((prev) => (prev ? { ...prev, data: nextData } : prev));
      toast.success('Metadata disimpan');
    } catch (e) {
      logger.error('[LayerInspector] saveMeta exception', sanitizeForLog(e));
      toast.error('Gagal menyimpan metadata');
    } finally {
      setSavingMeta(false);
    }
  };

  const saveStyle = async () => {
    if (!row) return;
    setSavingStyle(true);
    try {
      const raw = (row.data ?? {}) as Record<string, unknown>;
      const nextData = { ...raw, style } as Record<string, unknown>;
      const updatePayload = { data: nextData } as Record<string, unknown>;
      const updateById = async () => supabase.from('geo_layers').update(updatePayload).eq('id', row.id);
      const updateByKey = async () => supabase.from('geo_layers').update(updatePayload).eq('key', row.key);

      const { error } = await updateById();
      if (error) {
        logger.warn('[LayerInspector] saveStyle failed by id', sanitizeForLog(error));
        const fallback = await updateByKey();
        if (fallback.error) {
          logger.error('[LayerInspector] saveStyle fallback failed', sanitizeForLog(fallback.error));
          const retry = await updateByKey();
          if (retry.error) {
            toast.error(handleApiError(retry.error, 'Gagal menyimpan style'));
            return;
          }
        }
      }
      toast.success('Style disimpan');
      setRow((prev) => (prev ? { ...prev, data: nextData } : prev));
    } catch (e) {
      logger.error('[LayerInspector] saveStyle exception', sanitizeForLog(e));
      toast.error('Gagal menyimpan style');
    } finally {
      setSavingStyle(false);
    }
  };

  const downloadGeoJSON = () => {
    if (!row) return;
    try {
      const blob = new Blob([JSON.stringify(row.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.key}.geojson.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal mengunduh GeoJSON');
    }
  };

  const validateGeometry = () => {
    if (!featureCollection) return { valid: true, errors: [] };
    const errors: string[] = [];
    featureCollection.features.forEach((f, i) => {
      if (!f.geometry) errors.push(`Fitur ${i + 1}: geometri kosong`);
      else if (!f.geometry.type) errors.push(`Fitur ${i + 1}: tipe geometri tidak ada`);
      else if (f.geometry.type === 'Polygon' && f.geometry.coordinates) {
        const coords = f.geometry.coordinates as number[][][];
        coords.forEach((ring, ri) => {
          if (ring.length < 4) errors.push(`Fitur ${i + 1}, ring ${ri}: kurang dari 4 koordinat`);
          const first = ring[0], last = ring[ring.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) errors.push(`Fitur ${i + 1}, ring ${ri}: tidak tertutup`);
        });
      }
    });
    return { valid: errors.length === 0, errors };
  };

  const geoValidation = validateGeometry();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">
            {loading ? 'Memuat...' : row ? row.name : 'Layer Detail'}
            {row && <span className="ml-2 text-xs text-muted-foreground font-normal">({row.key})</span>}
          </DialogTitle>
          <DialogDescription>
            Detail informasi layer geospasial
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-6">
              <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
              <TabsTrigger value="atribut">Atribut</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
            </TabsList>
            <TabsContent value="ringkasan" className="flex-1 overflow-auto space-y-4 mt-4 px-6 pb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Informasi Dasar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted-foreground">Nama</span>
                    <span className="font-medium">{sanitizeHTML(row?.name ?? '-')}</span>
                    <span className="text-muted-foreground">Key</span>
                    <span className="font-mono text-xs">{row?.key ?? '-'}</span>
                    <span className="text-muted-foreground">Tipe Geometri</span>
                    <span>{row?.geometry_type ?? '-'}</span>
                    <span className="text-muted-foreground">Jumlah Fitur</span>
                    {loadingData ? (
                      <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      <span className="font-semibold">{stats?.featureCount ?? 0}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
              {!geoValidation.valid && (
                <Card className="border-destructive">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-destructive">Error Geometri ({geoValidation.errors.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1 max-h-32 overflow-auto">
                      {geoValidation.errors.slice(0, 10).map((err, i) => (
                        <li key={i} className="text-destructive">{err}</li>
                      ))}
                      {geoValidation.errors.length > 10 && (
                        <li className="text-muted-foreground italic">...dan {geoValidation.errors.length - 10} error lainnya</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {stats?.fields && stats.fields.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Atribut ({stats.fields.length} kolom)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-xs max-h-48 overflow-auto">
                      {stats.fields.map((f) => (
                        <div key={f.name} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <span className="truncate font-medium">{f.name}</span>
                          <span className="text-muted-foreground ml-2">{f.type}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {loadingData && !stats && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Atribut</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="atribut" className="flex-1 overflow-auto mt-4 px-6 pb-6">
              {activeTab === 'atribut' && (
                loadingData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <LayerAttributeTable featureCollection={featureCollection} />
                )
              )}
            </TabsContent>
            <TabsContent value="metadata" className="flex-1 overflow-auto mt-4 px-6 pb-6">
              {activeTab === 'metadata' && (
                <div className="space-y-3">
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-sm font-medium">Sumber</Label>
                      <Input className="mt-1" value={meta.source || ''} onChange={(e) => setMeta((m) => ({ ...m, source: e.target.value }))} placeholder="Contoh: BIG, OSM" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Lisensi</Label>
                      <Input className="mt-1" value={meta.license || ''} onChange={(e) => setMeta((m) => ({ ...m, license: e.target.value }))} placeholder="Contoh: CC-BY 4.0" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tag</Label>
                      <Input className="mt-1" value={meta.tags || ''} onChange={(e) => setMeta((m) => ({ ...m, tags: e.target.value }))} placeholder="pisahkan dengan koma" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <Label className="text-sm font-medium cursor-pointer">Tampilkan di peta secara default</Label>
                      <Switch checked={Boolean(meta.visibility_default)} onCheckedChange={(v) => setMeta((m) => ({ ...m, visibility_default: Boolean(v) }))} />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Deskripsi</Label>
                      <Textarea className="mt-1" rows={4} value={meta.description || ''} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} placeholder="Deskripsi layer..." />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={downloadGeoJSON}>Unduh GeoJSON</Button>
                    <Button size="sm" onClick={() => void saveMeta()} disabled={savingMeta || savingStyle}>
                      {savingMeta ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</> : 'Simpan Metadata'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="style" className="flex-1 overflow-auto mt-4 px-6 pb-6">
              {activeTab === 'style' && (
                <div className="space-y-3">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="point">
                      <AccordionTrigger className="text-sm font-medium">Point Style</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-3 p-2">
                          <div>
                            <Label className="text-xs">Warna Stroke</Label>
                            <div className="flex gap-2 mt-1">
                              <Input type="color" className="w-16 h-9 p-1" value={style.point?.color || '#16a34a'} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, color: e.target.value } }))} />
                              <Input className="flex-1 h-9 text-xs" value={style.point?.color || '#16a34a'} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, color: e.target.value } }))} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Warna Fill</Label>
                            <div className="flex gap-2 mt-1">
                              <Input type="color" className="w-16 h-9 p-1" value={style.point?.fillColor || '#16a34a'} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, fillColor: e.target.value } }))} />
                              <Input className="flex-1 h-9 text-xs" value={style.point?.fillColor || '#16a34a'} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, fillColor: e.target.value } }))} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Radius (px)</Label>
                            <Input className="mt-1 h-9" type="number" min={1} max={20} value={String(style.point?.radius ?? 5)} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, radius: Number(e.target.value) || 5 } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Stroke Weight</Label>
                            <Input className="mt-1 h-9" type="number" min={0} max={6} value={String(style.point?.weight ?? 1)} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, weight: Number(e.target.value) || 1 } }))} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Fill Opacity (0-1)</Label>
                            <Input className="mt-1 h-9" type="number" step={0.1} min={0} max={1} value={String(style.point?.fillOpacity ?? 0.7)} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, fillOpacity: Math.max(0, Math.min(1, Number(e.target.value))) } }))} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="line">
                      <AccordionTrigger className="text-sm font-medium">Line Style</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-3 p-2">
                          <div>
                            <Label className="text-xs">Warna</Label>
                            <div className="flex gap-2 mt-1">
                              <Input type="color" className="w-16 h-9 p-1" value={style.line?.color || '#334155'} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, color: e.target.value } }))} />
                              <Input className="flex-1 h-9 text-xs" value={style.line?.color || '#334155'} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, color: e.target.value } }))} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Weight (px)</Label>
                            <Input className="mt-1 h-9" type="number" min={1} max={10} value={String(style.line?.weight ?? 2)} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, weight: Number(e.target.value) || 2 } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Opacity (0-1)</Label>
                            <Input className="mt-1 h-9" type="number" step={0.1} min={0} max={1} value={String(style.line?.opacity ?? 0.9)} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, opacity: Math.max(0, Math.min(1, Number(e.target.value))) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Dash Array</Label>
                            <Input className="mt-1 h-9" placeholder="6 4" value={style.line?.dashArray || ''} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, dashArray: e.target.value } }))} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="polygon">
                      <AccordionTrigger className="text-sm font-medium">Polygon Style</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-3 p-2">
                          <div>
                            <Label className="text-xs">Warna Stroke</Label>
                            <div className="flex gap-2 mt-1">
                              <Input type="color" className="w-16 h-9 p-1" value={style.polygon?.color || '#475569'} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, color: e.target.value } }))} />
                              <Input className="flex-1 h-9 text-xs" value={style.polygon?.color || '#475569'} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, color: e.target.value } }))} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Stroke Weight</Label>
                            <Input className="mt-1 h-9" type="number" min={1} max={10} value={String(style.polygon?.weight ?? 1)} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, weight: Number(e.target.value) || 1 } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Stroke Opacity</Label>
                            <Input className="mt-1 h-9" type="number" step={0.1} min={0} max={1} value={String(style.polygon?.opacity ?? 0.8)} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, opacity: Math.max(0, Math.min(1, Number(e.target.value))) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Warna Fill</Label>
                            <div className="flex gap-2 mt-1">
                              <Input type="color" className="w-16 h-9 p-1" value={style.polygon?.fillColor || '#cbd5e1'} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, fillColor: e.target.value } }))} />
                              <Input className="flex-1 h-9 text-xs" value={style.polygon?.fillColor || '#cbd5e1'} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, fillColor: e.target.value } }))} />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Fill Opacity (0-1)</Label>
                            <Input className="mt-1 h-9" type="number" step={0.1} min={0} max={1} value={String(style.polygon?.fillOpacity ?? 0.2)} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, fillOpacity: Math.max(0, Math.min(1, Number(e.target.value))) } }))} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <div className="flex justify-end pt-3 border-t">
                    <Button size="sm" onClick={() => void saveStyle()} disabled={savingStyle || savingMeta}>
                      {savingStyle ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</> : 'Simpan Style'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LayerInspector;
