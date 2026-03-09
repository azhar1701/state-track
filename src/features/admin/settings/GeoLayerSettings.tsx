import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Loader2, Database, Layers, Settings2, Info, CheckCircle } from 'lucide-react';
import { useSystemSettings } from '@/features/admin/useSystemSettings';

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
      logger.warn('Failed to load geo layer settings', error);
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
      logger.error('Failed to save geo layer settings', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }, [settings, saveSetting]);

  return (
    <div className="space-y-4">
      <Card variant="glass" className="border-0">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Database className="h-5 w-5 text-primary" />
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
