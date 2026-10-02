import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Loader2,
  Database,
  Layers,
  Settings2,
  Info,
  CheckCircle,
  CheckCircle2,
  RotateCcw,
  GripVertical,
  ArrowDownUp,
} from 'lucide-react';
import { useSystemSettings } from '@/features/admin/useSystemSettings';
import { supabase } from '@/services/client';

type GeoLayerSettings = {
  enforceCRS: boolean;
  defaultCRS: string;
  autoPublishToMap: boolean;
  maxUploadSizeMb: number;
  requireMetadata: boolean;
  defaultLayerType: 'geojson' | 'wms' | 'tile';
  defaultZIndex: number;
  defaultOpacity: number;
  defaultVisible: boolean;
};

interface LayerOrderItem {
  id: string;
  key: string;
  name: string;
  geometry_type: string | null;
  sort_order: number;
}

const STORAGE_KEY = 'admin:geoLayerSettings';

const defaultSettings: GeoLayerSettings = {
  enforceCRS: true,
  defaultCRS: 'EPSG:4326',
  autoPublishToMap: true,
  maxUploadSizeMb: 50,
  requireMetadata: true,
  defaultLayerType: 'geojson',
  defaultZIndex: 400,
  defaultOpacity: 1.0,
  defaultVisible: true,
};

export const GeoLayerSettings = () => {
  const { fetchSetting, saveSetting } = useSystemSettings();
  const [settings, setSettings] = useState<GeoLayerSettings>(defaultSettings);
  const [initialSettings, setInitialSettings] = useState<GeoLayerSettings>(defaultSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Layer Order State ---
  const [layerOrder, setLayerOrder] = useState<LayerOrderItem[]>([]);
  const [layerOrderDirty, setLayerOrderDirty] = useState(false);
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        // 1. Fetch from cloud database
        const remote = await fetchSetting<GeoLayerSettings>('geo', 'layer_settings');
        if (!isMounted) return;

        if (remote && typeof remote === 'object') {
          const merged = { ...defaultSettings, ...remote };
          setSettings(merged);
          setInitialSettings(merged);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return;
        }

        // 2. Fallback to localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            const merged = { ...defaultSettings, ...parsed };
            setSettings(merged);
            setInitialSettings(merged);
            return;
          }
        }
      } catch (error) {
        logger.warn('Failed to load geo layer settings', error);
      } finally {
        if (isMounted) setLoadingSettings(false);
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [fetchSetting]);

  // Load layer list for order management
  const loadLayerOrder = useCallback(async () => {
    setLoadingLayers(true);
    try {
      const { data, error } = await supabase
        .from('geo_layers')
        .select('id,key,name,geometry_type,sort_order')
        .neq('key', 'admin_boundaries')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as LayerOrderItem[];
      setLayerOrder(rows.map((r) => ({ ...r, sort_order: r.sort_order ?? 500 })));
      setLayerOrderDirty(false);
    } catch (e) {
      logger.warn('Failed to load layer order', e);
      toast.error('Gagal memuat daftar layer');
    } finally {
      setLoadingLayers(false);
    }
  }, []);

  useEffect(() => { void loadLayerOrder(); }, [loadLayerOrder]);

  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(initialSettings);
  }, [settings, initialSettings]);

  const handleReset = useCallback(() => {
    setSettings(initialSettings);
    toast.info("Perubahan pengaturan GeoLayer di-reset");
  }, [initialSettings]);

  // --- Drag and Drop handlers (HTML5 native) ---
  const handleDragStart = useCallback((_e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === overIndex) return;
    setLayerOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(overIndex, 0, item);
      dragIndexRef.current = overIndex;
      return next;
    });
    setLayerOrderDirty(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null;
  }, []);

  const handleSaveLayerOrder = useCallback(async () => {
    setSavingOrder(true);
    try {
      // Assign ascending sort_order values (step 10) based on current list order.
      // This preserves relative spacing so future manual edits are easy.
      const BASE = 400;
      const STEP = 10;
      const updates = layerOrder.map((layer, idx) => ({
        id: layer.id,
        sort_order: BASE + idx * STEP,
      }));

      // Upsert each row — Supabase doesn't support bulk update by different ids yet,
      // so we send individual updates in parallel (batch of promises).
      const results = await Promise.allSettled(
        updates.map(({ id, sort_order }) =>
          supabase.from('geo_layers').update({ sort_order }).eq('id', id)
        )
      );

      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      if (failed.length > 0) {
        toast.error(`Gagal menyimpan ${failed.length} layer. Coba lagi.`);
        return;
      }

      // Reflect new sort_order values locally
      setLayerOrder((prev) =>
        prev.map((layer, idx) => ({ ...layer, sort_order: BASE + idx * STEP }))
      );
      setLayerOrderDirty(false);

      // Broadcast to MapView so it can re-fetch layer list
      sessionStorage.removeItem('map:availableLayers');
      window.dispatchEvent(new CustomEvent('layer-updated', { detail: { reorder: true } }));

      toast.success('Urutan layer berhasil disimpan', {
        description: 'Peta akan memuat ulang urutan layer secara otomatis.',
        icon: <CheckCircle className="h-4 w-4" />,
      });
    } catch (e) {
      logger.error('Failed to save layer order', e);
      toast.error('Terjadi kesalahan saat menyimpan urutan layer');
    } finally {
      setSavingOrder(false);
    }
  }, [layerOrder]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (settings.maxUploadSizeMb <= 0) {
        toast.error('Batas unggah harus lebih dari 0 MB');
        return;
      }
      if (settings.defaultOpacity < 0 || settings.defaultOpacity > 1) {
        toast.error('Opacity harus antara 0-1');
        return;
      }
      if (settings.defaultZIndex < 0) {
        toast.error('Z-Index tidak boleh negatif');
        return;
      }

      // Save quietly via hook to prevent dual toast
      await saveSetting('geo', 'layer_settings', settings, { silent: true });

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      }
      setInitialSettings(settings);

      toast.success('Pengaturan GeoLayer berhasil disimpan', {
        icon: <CheckCircle className="h-4 w-4" />,
      });
    } catch (error) {
      logger.error('Failed to save geo layer settings', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }, [settings, saveSetting]);

  if (loadingSettings) {
    return (
      <div className="space-y-4">
        <Card variant="glass" className="border-0">
          <CardHeader className="p-4 sm:p-6 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== Layer Order Panel ===== */}
      <Card variant="glass" className="border-0">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <ArrowDownUp className="h-5 w-5 text-primary" />
                Urutan Layer di Peta
              </CardTitle>
              <CardDescription className="mt-1.5">
                Seret baris untuk mengatur urutan tumpuk layer — layer paling bawah daftar tampil paling atas di peta
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {layerOrderDirty && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">
                  Belum Disimpan
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={loadLayerOrder}
                disabled={loadingLayers || savingOrder}
                className="text-xs gap-1.5"
                title="Muat ulang daftar layer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {loadingLayers ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : layerOrder.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Belum ada layer geospasial yang diunggah
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Header hint */}
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs text-muted-foreground font-medium">← Bawah peta</span>
                <span className="text-xs text-muted-foreground font-medium">Atas peta →</span>
              </div>
              {layerOrder.map((layer, idx) => (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-accent/30 cursor-grab active:cursor-grabbing active:opacity-60 transition-all select-none"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{layer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {layer.geometry_type || 'unknown'} &middot; <code className="text-[10px]">{layer.key}</code>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
                    z={layer.sort_order}
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2 px-1">
                Layer di urutan atas daftar = tampil di bawah peta. Urutan diperbarui saat klik &ldquo;Terapkan Urutan&rdquo;.
              </p>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveLayerOrder}
                  disabled={savingOrder || !layerOrderDirty}
                  size="sm"
                  className="gap-1.5"
                >
                  {savingOrder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Terapkan Urutan
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Pengaturan GeoLayer Form ===== */}
      <Card variant="glass" className="border-0">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Database className="h-5 w-5 text-primary" />
                Pengaturan GeoLayer
              </CardTitle>
              <CardDescription className="mt-1.5">
                Kelola validasi, publikasi, dan konfigurasi layer geografis
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isDirty ? (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">
                  Belum Disimpan
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Tersimpan
                </Badge>
              )}
              <Badge variant="outline" className="gap-1.5 hidden sm:inline-flex">
                <Layers className="h-3 w-3" />
                Advanced
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Validasi & Publikasi</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-card border-border shadow-sm rounded-lg p-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Wajibkan CRS EPSG:4326</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pastikan koordinat sesuai standar WGS84
                      </p>
                    </div>
                    <Switch
                      checked={settings.enforceCRS}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, enforceCRS: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-card border-border shadow-sm rounded-lg p-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Publikasi otomatis</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Layer baru langsung tampil di peta
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoPublishToMap}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, autoPublishToMap: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-card border-border shadow-sm rounded-lg p-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Wajibkan metadata</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Informasi deskriptif harus terisi
                      </p>
                    </div>
                    <Switch
                      checked={settings.requireMetadata}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, requireMetadata: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-card border-border shadow-sm rounded-lg p-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Visible by default</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Layer baru otomatis terlihat
                      </p>
                    </div>
                    <Switch
                      checked={settings.defaultVisible}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, defaultVisible: checked }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Konfigurasi Default</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    CRS Default
                  </label>
                  <Input
                    className="h-9"
                    value={settings.defaultCRS}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, defaultCRS: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Batas ukuran unggah (MB)
                  </label>
                  <Input
                    className="h-9"
                    type="number"
                    min="1"
                    max="500"
                    value={settings.maxUploadSizeMb}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        maxUploadSizeMb: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tipe layer default
                  </label>
                  <Select
                    value={settings.defaultLayerType}
                    onValueChange={(value) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultLayerType: value as GeoLayerSettings['defaultLayerType'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geojson">GeoJSON</SelectItem>
                      <SelectItem value="wms">WMS</SelectItem>
                      <SelectItem value="tile">Tile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Z-Index default
                  </label>
                  <Input
                    className="h-9"
                    type="number"
                    min="0"
                    max="1000"
                    value={settings.defaultZIndex}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultZIndex: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Opacity default: {settings.defaultOpacity.toFixed(2)}
                </label>
                <Slider
                  value={[settings.defaultOpacity]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, defaultOpacity: value }))
                  }
                  min={0}
                  max={1}
                  step={0.05}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Perubahan akan diterapkan pada layer yang diunggah berikutnya
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isDirty && (
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !isDirty}
                size="sm"
                className="w-full sm:w-auto"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Pengaturan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
