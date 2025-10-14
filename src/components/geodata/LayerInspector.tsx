import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LayerPreview } from '@/components/map/LayerPreview';
import type { FeatureCollection, Geometry } from 'geojson';

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

export const LayerInspector = ({ open, onOpenChange, layerKey }: LayerInspectorProps) => {
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<LayerRow | null>(null);
  const [meta, setMeta] = useState<{ source?: string; license?: string; tags?: string; visibility_default?: boolean; description?: string }>({});
  const [stats, setStats] = useState<{ featureCount: number; fields: Array<{ name: string; type: string }> } | null>(null);
  type Symbology = {
    point?: { color?: string; fillColor?: string; fillOpacity?: number; radius?: number; weight?: number };
    line?: { color?: string; weight?: number; opacity?: number; dashArray?: string };
    polygon?: { color?: string; weight?: number; opacity?: number; fillColor?: string; fillOpacity?: number };
  };
  const [style, setStyle] = useState<Symbology>({});

  useEffect(() => {
    const load = async () => {
      if (!open || !layerKey) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('geo_layers')
          .select('id,key,name,geometry_type,data')
          .eq('key', layerKey)
          .limit(1)
          .maybeSingle();
        if (error || !data) {
          toast.error('Gagal memuat layer');
          return;
        }
        const r = data as LayerRow;
        setRow(r);
        // read meta nested inside data.meta if exists
        const raw = (r.data ?? {}) as { meta?: Record<string, unknown>; style?: Record<string, unknown> };
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

        // Build simple stats
        const fc = (() => {
          const d = r.data as unknown as Record<string, unknown>;
          if (d && typeof d === 'object' && 'featureCollection' in d) {
            const w = d as { featureCollection?: unknown };
            if (w.featureCollection && (w.featureCollection as { type?: string }).type === 'FeatureCollection') return w.featureCollection as FeatureCollection<Geometry>;
          }
          if ((d as { type?: string })?.type === 'FeatureCollection') return d as unknown as FeatureCollection<Geometry>;
          if (d && typeof d === 'object') {
            const vals = Object.values(d);
            const found = vals.find((v) => !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection');
            if (found) return found as FeatureCollection<Geometry>;
          }
          return null;
        })();

        if (fc) {
          const featureCount = fc.features?.length || 0;
          // Infer fields from first feature's properties
          const fields: Array<{ name: string; type: string }> = [];
          const props = (fc.features[0]?.properties || {}) as Record<string, unknown>;
          Object.entries(props).slice(0, 20).forEach(([k, v]) => {
            fields.push({ name: k, type: Array.isArray(v) ? 'array' : typeof v });
          });
          setStats({ featureCount, fields });
        } else {
          setStats(null);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [open, layerKey]);

  const saveMeta = async () => {
    if (!row) return;
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
      const { error } = await supabase
        .from('geo_layers')
        .update({ data: nextData })
        .eq('id', row.id);
      if (error) return toast.error('Gagal menyimpan metadata');
      toast.success('Metadata disimpan');
    } catch (e) {
      toast.error('Gagal menyimpan metadata');
    }
  };

  const saveStyle = async () => {
    if (!row) return;
    try {
      const raw = (row.data ?? {}) as Record<string, unknown>;
      const nextData = { ...raw, style } as Record<string, unknown>;
      const { error } = await supabase
        .from('geo_layers')
        .update({ data: nextData })
        .eq('id', row.id);
      if (error) return toast.error('Gagal menyimpan style');
      toast.success('Style disimpan');
    } catch (e) {
      toast.error('Gagal menyimpan style');
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

  const fcWrapper = useMemo(() => row?.data ?? null, [row]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-3 sm:p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            {row ? row.name : 'Layer Detail'}
            {row && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">[{row.key}]</span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Preview */}
          <div className="md:col-span-3 rounded border bg-muted/20">
            <LayerPreview data={fcWrapper} height={300} />
          </div>
          {/* Right: Tabs */}
          <div className="md:col-span-2">
            <Tabs defaultValue="ringkasan" className="w-full">
              <TabsList className="w-full justify-start h-9">
                <TabsTrigger value="ringkasan" className="text-xs">Ringkasan</TabsTrigger>
                <TabsTrigger value="metadata" className="text-xs">Metadata</TabsTrigger>
                <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
              </TabsList>
              <TabsContent value="ringkasan" className="mt-2">
                <div className="text-sm space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-muted-foreground">Nama</div>
                    <div className="truncate">{row?.name ?? '-'}</div>
                    <div className="text-muted-foreground">Key</div>
                    <div className="truncate">{row?.key ?? '-'}</div>
                    <div className="text-muted-foreground">Tipe</div>
                    <div>{row?.geometry_type ?? '-'}</div>
                    <div className="text-muted-foreground">Fitur</div>
                    <div>{stats?.featureCount ?? '-'}</div>
                  </div>
                  {stats?.fields && stats.fields.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-medium mb-1">Kolom (sample)</div>
                      <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-auto pr-1">
                        {stats.fields.map((f) => (
                          <li key={f.name} className="flex items-center justify-between">
                            <span className="truncate mr-2">{f.name}</span>
                            <span className="opacity-70">{f.type}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="metadata" className="mt-2">
                <div className="space-y-2 text-sm">
                  <div>
                    <Label className="text-xs">Sumber</Label>
                    <Input className="h-8 text-sm" value={meta.source || ''} onChange={(e) => setMeta((m) => ({ ...m, source: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Lisensi</Label>
                    <Input className="h-8 text-sm" value={meta.license || ''} onChange={(e) => setMeta((m) => ({ ...m, license: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Tag (pisahkan koma)</Label>
                    <Input className="h-8 text-sm" value={meta.tags || ''} onChange={(e) => setMeta((m) => ({ ...m, tags: e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <Label className="text-xs">Aktif secara default di peta</Label>
                    <Switch checked={Boolean(meta.visibility_default)} onCheckedChange={(v) => setMeta((m) => ({ ...m, visibility_default: Boolean(v) }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Deskripsi</Label>
                    <Textarea className="text-sm" rows={3} value={meta.description || ''} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Button size="sm" variant="outline" onClick={downloadGeoJSON}>Unduh GeoJSON</Button>
                    <Button size="sm" onClick={saveMeta}>Simpan Metadata</Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="style" className="mt-2">
                <div className="text-sm">
                  <Accordion type="multiple" className="w-full">
                    {/* Point */}
                    <AccordionItem value="point" className="border-muted">
                      <AccordionTrigger className="py-2 text-sm">Point</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Color</Label>
                            <Input className="h-8" type="color" value={style.point?.color || '#16a34a'} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, color: e.target.value } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Fill</Label>
                            <Input className="h-8" type="color" value={style.point?.fillColor || '#16a34a'} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, fillColor: e.target.value } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Radius</Label>
                            <Input className="h-8" type="number" min={1} max={20} value={String(style.point?.radius ?? 5)} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, radius: Number(e.target.value) || 5 } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Stroke</Label>
                            <Input className="h-8" type="number" min={0} max={6} value={String(style.point?.weight ?? 1)} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, weight: Number(e.target.value) || 1 } }))} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Fill Opacity</Label>
                            <Input className="h-8" type="number" step={0.05} min={0} max={1} value={String(style.point?.fillOpacity ?? 0.7)} onChange={(e) => setStyle((s) => ({ ...s, point: { ...s.point, fillOpacity: Math.max(0, Math.min(1, Number(e.target.value))) } }))} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    {/* Line */}
                    <AccordionItem value="line" className="border-muted">
                      <AccordionTrigger className="py-2 text-sm">Line</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Color</Label>
                            <Input className="h-8" type="color" value={style.line?.color || '#334155'} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, color: e.target.value } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Weight</Label>
                            <Input className="h-8" type="number" min={1} max={10} value={String(style.line?.weight ?? 2)} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, weight: Number(e.target.value) || 2 } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Opacity</Label>
                            <Input className="h-8" type="number" step={0.05} min={0} max={1} value={String(style.line?.opacity ?? 0.9)} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, opacity: Math.max(0, Math.min(1, Number(e.target.value))) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Dash</Label>
                            <Input className="h-8" placeholder="6 4" value={style.line?.dashArray || ''} onChange={(e) => setStyle((s) => ({ ...s, line: { ...s.line, dashArray: e.target.value } }))} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    {/* Polygon */}
                    <AccordionItem value="polygon" className="border-muted">
                      <AccordionTrigger className="py-2 text-sm">Polygon</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Stroke</Label>
                            <Input className="h-8" type="color" value={style.polygon?.color || '#475569'} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, color: e.target.value } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Weight</Label>
                            <Input className="h-8" type="number" min={1} max={10} value={String(style.polygon?.weight ?? 1)} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, weight: Number(e.target.value) || 1 } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Opacity</Label>
                            <Input className="h-8" type="number" step={0.05} min={0} max={1} value={String(style.polygon?.opacity ?? 0.8)} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, opacity: Math.max(0, Math.min(1, Number(e.target.value))) } }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Fill</Label>
                            <Input className="h-8" type="color" value={style.polygon?.fillColor || '#cbd5e1'} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, fillColor: e.target.value } }))} />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Fill Opacity</Label>
                            <Input className="h-8" type="number" step={0.05} min={0} max={1} value={String(style.polygon?.fillOpacity ?? 0.2)} onChange={(e) => setStyle((s) => ({ ...s, polygon: { ...s.polygon, fillOpacity: Math.max(0, Math.min(1, Number(e.target.value))) } }))} />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={saveStyle}>Simpan Style</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LayerInspector;
