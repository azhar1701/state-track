import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Database, Layers, Eye, Settings2, Info, CheckCircle } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

type GeoLayerSettings = {
  enforceCRS: boolean;
  defaultCRS: string;
  autoPublishToMap: boolean;
  maxUploadSizeMb: number;
  requireMetadata: boolean;
  defaultLayerType: 'geojson' | 'wms' | 'cluster' | 'heatmap' | 'tile';
  defaultZIndex: number;
  defaultOpacity: number;
  defaultVisible: boolean;
  enableClustering: boolean;
  clusterRadius: number;
  enableHeatmap: boolean;
  heatmapRadius: number;
  heatmapBlur: number;
  heatmapMaxZoom: number;
};

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
  enableClustering: true,
  clusterRadius: 80,
  enableHeatmap: false,
  heatmapRadius: 25,
  heatmapBlur: 15,
  heatmapMaxZoom: 18,
};

export const GeoLayerSettings = () => {
  const { saveSetting } = useSystemSettings();
  const [settings, setSettings] = useState<GeoLayerSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load geo layer settings', error);
    }
  }, []);

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

      await saveSetting('geo', 'layer_settings', settings);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      }

      toast.success('Pengaturan GeoLayer berhasil disimpan', {
        icon: <CheckCircle className="h-4 w-4" />,
      });
    } catch (error) {
      console.error('Failed to save geo layer settings', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }, [settings, saveSetting]);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Database className="h-5 w-5 text-blue-500" />
                Pengaturan GeoLayer
              </CardTitle>
              <CardDescription className="mt-1.5">
                Kelola validasi, publikasi, dan konfigurasi layer geografis
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <Layers className="h-3 w-3" />
              Advanced
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="general" className="gap-1.5 text-xs sm:text-sm">
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Umum</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1.5 text-xs sm:text-sm">
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lanjutan</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Validasi & Publikasi</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 border">
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

                  <div className="bg-muted/30 rounded-lg p-3 border">
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

                  <div className="bg-muted/30 rounded-lg p-3 border">
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

                  <div className="bg-muted/30 rounded-lg p-3 border">
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
                        <SelectItem value="cluster">Cluster</SelectItem>
                        <SelectItem value="heatmap">Heatmap</SelectItem>
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
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Clustering & Heatmap</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <label className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Enable clustering</div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Kelompokkan marker yang berdekatan
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableClustering}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({ ...prev, enableClustering: checked }))
                        }
                      />
                    </label>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <label className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Enable heatmap</div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Tampilkan peta panas untuk densitas
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableHeatmap}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({ ...prev, enableHeatmap: checked }))
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Radius cluster (px)
                    </label>
                    <Input
                      className="h-9"
                      type="number"
                      min="20"
                      max="200"
                      value={settings.clusterRadius}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          clusterRadius: Number(e.target.value),
                        }))
                      }
                      disabled={!settings.enableClustering}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Radius heatmap (px)
                    </label>
                    <Input
                      className="h-9"
                      type="number"
                      min="10"
                      max="100"
                      value={settings.heatmapRadius}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          heatmapRadius: Number(e.target.value),
                        }))
                      }
                      disabled={!settings.enableHeatmap}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Blur heatmap (px)
                    </label>
                    <Input
                      className="h-9"
                      type="number"
                      min="5"
                      max="50"
                      value={settings.heatmapBlur}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          heatmapBlur: Number(e.target.value),
                        }))
                      }
                      disabled={!settings.enableHeatmap}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Max zoom heatmap
                    </label>
                    <Input
                      className="h-9"
                      type="number"
                      min="10"
                      max="22"
                      value={settings.heatmapMaxZoom}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          heatmapMaxZoom: Number(e.target.value),
                        }))
                      }
                      disabled={!settings.enableHeatmap}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  💡 Pengaturan clustering dan heatmap akan diterapkan pada layer baru yang
                  menggunakan tipe 'cluster' atau 'heatmap'.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Perubahan akan diterapkan pada layer yang diunggah berikutnya
            </p>
            <Button onClick={handleSave} disabled={saving} size="sm" className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
