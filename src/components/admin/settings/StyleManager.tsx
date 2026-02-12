import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Palette, Copy, Trash2, Plus, Eye, Download, Upload, CheckCircle } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

type StylePreset = {
  id: string;
  name: string;
  color: string;
  weight: number;
  opacity: number;
  fillColor: string;
  fillOpacity: number;
  dashArray: string;
};

type GeometryStyle = {
  Point: StylePreset;
  LineString: StylePreset;
  Polygon: StylePreset;
};

const defaultPresets: StylePreset[] = [
  { id: 'blue', name: 'Blue Default', color: '#3b82f6', weight: 2, opacity: 0.8, fillColor: '#3b82f6', fillOpacity: 0.3, dashArray: '' },
  { id: 'red', name: 'Red Alert', color: '#ef4444', weight: 3, opacity: 0.9, fillColor: '#ef4444', fillOpacity: 0.4, dashArray: '' },
  { id: 'green', name: 'Green Safe', color: '#22c55e', weight: 2, opacity: 0.8, fillColor: '#22c55e', fillOpacity: 0.3, dashArray: '' },
  { id: 'yellow', name: 'Yellow Warning', color: '#eab308', weight: 2, opacity: 0.8, fillColor: '#eab308', fillOpacity: 0.4, dashArray: '' },
  { id: 'purple', name: 'Purple Special', color: '#a855f7', weight: 2, opacity: 0.8, fillColor: '#a855f7', fillOpacity: 0.3, dashArray: '' },
  { id: 'dashed', name: 'Dashed Line', color: '#64748b', weight: 2, opacity: 0.8, fillColor: '#64748b', fillOpacity: 0.2, dashArray: '5, 10' },
];

const defaultGeometryStyles: GeometryStyle = {
  Point: { id: 'point', name: 'Point Style', color: '#3b82f6', weight: 2, opacity: 1, fillColor: '#3b82f6', fillOpacity: 0.8, dashArray: '' },
  LineString: { id: 'line', name: 'Line Style', color: '#ef4444', weight: 3, opacity: 0.9, fillColor: '#ef4444', fillOpacity: 0, dashArray: '' },
  Polygon: { id: 'polygon', name: 'Polygon Style', color: '#22c55e', weight: 2, opacity: 0.8, fillColor: '#22c55e', fillOpacity: 0.3, dashArray: '' },
};

export const StyleManager = () => {
  const { saveSetting } = useSystemSettings();
  const [presets, setPresets] = useState<StylePreset[]>(defaultPresets);
  const [geometryStyles, setGeometryStyles] = useState<GeometryStyle>(defaultGeometryStyles);
  const [currentStyle, setCurrentStyle] = useState<StylePreset>(defaultPresets[0]);
  const [customPresets, setCustomPresets] = useState<StylePreset[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('admin:stylePresets');
      if (stored) setCustomPresets(JSON.parse(stored));
      const storedGeo = localStorage.getItem('admin:geometryStyles');
      if (storedGeo) setGeometryStyles(JSON.parse(storedGeo));
    } catch (error) {
      console.warn('Failed to load style presets', error);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSetting('geo', 'style_presets', { presets: [...presets, ...customPresets] });
      await saveSetting('geo', 'geometry_styles', geometryStyles);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin:stylePresets', JSON.stringify(customPresets));
        localStorage.setItem('admin:geometryStyles', JSON.stringify(geometryStyles));
      }

      toast.success('Style berhasil disimpan', { icon: <CheckCircle className="h-4 w-4" /> });
    } catch (error) {
      console.error('Failed to save styles', error);
      toast.error('Gagal menyimpan style');
    } finally {
      setSaving(false);
    }
  };

  const addCustomPreset = () => {
    const newPreset: StylePreset = {
      id: `custom-${Date.now()}`,
      name: `Custom ${customPresets.length + 1}`,
      ...currentStyle,
    };
    setCustomPresets([...customPresets, newPreset]);
    toast.success('Preset ditambahkan');
  };

  const deleteCustomPreset = (id: string) => {
    setCustomPresets(customPresets.filter(p => p.id !== id));
    toast.success('Preset dihapus');
  };

  const exportStyles = () => {
    const data = { presets: [...presets, ...customPresets], geometryStyles };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `style-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Style diekspor');
  };

  const importStyles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.presets) setCustomPresets(data.presets.filter((p: StylePreset) => p.id.startsWith('custom-')));
        if (data.geometryStyles) setGeometryStyles(data.geometryStyles);
        toast.success('Style diimpor');
      } catch (error) {
        toast.error('File tidak valid');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Palette className="h-5 w-5 text-purple-500" />
              Style Manager
            </CardTitle>
            <CardDescription className="mt-1.5">
              Kelola preset style dan konfigurasi per tipe geometri
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Eye className="h-3 w-3" />
            Advanced
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="presets">Preset</TabsTrigger>
            <TabsTrigger value="geometry">Geometri</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setCurrentStyle(preset)}
                  className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                    currentStyle.id === preset.id ? 'border-primary shadow-md' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded border-2"
                      style={{
                        borderColor: preset.color,
                        backgroundColor: preset.fillColor,
                        opacity: preset.opacity,
                      }}
                    />
                    <div className="text-left flex-1">
                      <div className="text-xs font-semibold truncate">{preset.name}</div>
                      <div className="text-[10px] text-muted-foreground">{preset.color}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Edit Preset</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Warna garis</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={currentStyle.color}
                      onChange={(e) => setCurrentStyle({ ...currentStyle, color: e.target.value })}
                      className="h-9 w-16 p-1"
                    />
                    <Input
                      className="h-9 flex-1"
                      value={currentStyle.color}
                      onChange={(e) => setCurrentStyle({ ...currentStyle, color: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Warna isi</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={currentStyle.fillColor}
                      onChange={(e) => setCurrentStyle({ ...currentStyle, fillColor: e.target.value })}
                      className="h-9 w-16 p-1"
                    />
                    <Input
                      className="h-9 flex-1"
                      value={currentStyle.fillColor}
                      onChange={(e) => setCurrentStyle({ ...currentStyle, fillColor: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Ketebalan: {currentStyle.weight}px</label>
                  <Slider
                    value={[currentStyle.weight]}
                    onValueChange={([v]) => setCurrentStyle({ ...currentStyle, weight: v })}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Opacity: {currentStyle.opacity.toFixed(2)}</label>
                  <Slider
                    value={[currentStyle.opacity]}
                    onValueChange={([v]) => setCurrentStyle({ ...currentStyle, opacity: v })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border">
                <div className="text-xs font-semibold mb-2">Preview</div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-20 h-20 rounded border-4"
                    style={{
                      borderColor: currentStyle.color,
                      borderWidth: `${currentStyle.weight}px`,
                      backgroundColor: currentStyle.fillColor,
                      opacity: currentStyle.opacity,
                    }}
                  />
                  <div className="text-xs space-y-1">
                    <div>Garis: {currentStyle.color}</div>
                    <div>Isi: {currentStyle.fillColor}</div>
                    <div>Weight: {currentStyle.weight}px</div>
                    <div>Opacity: {currentStyle.opacity.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="geometry" className="space-y-4 mt-0">
            {(['Point', 'LineString', 'Polygon'] as const).map((type) => (
              <div key={type} className="bg-muted/30 rounded-lg p-4 border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{type}</h4>
                  <div
                    className="w-8 h-8 rounded border-2"
                    style={{
                      borderColor: geometryStyles[type].color,
                      backgroundColor: geometryStyles[type].fillColor,
                      opacity: geometryStyles[type].opacity,
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Warna</label>
                    <Input
                      type="color"
                      value={geometryStyles[type].color}
                      onChange={(e) =>
                        setGeometryStyles({
                          ...geometryStyles,
                          [type]: { ...geometryStyles[type], color: e.target.value, fillColor: e.target.value },
                        })
                      }
                      className="h-8 w-full p-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Weight: {geometryStyles[type].weight}px</label>
                    <Slider
                      value={[geometryStyles[type].weight]}
                      onValueChange={([v]) =>
                        setGeometryStyles({
                          ...geometryStyles,
                          [type]: { ...geometryStyles[type], weight: v },
                        })
                      }
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Custom Presets</h4>
              <Button onClick={addCustomPreset} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Tambah
              </Button>
            </div>

            {customPresets.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Belum ada custom preset. Klik "Tambah" untuk membuat.
              </div>
            ) : (
              <div className="space-y-2">
                {customPresets.map((preset) => (
                  <div key={preset.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <div
                      className="w-10 h-10 rounded border-2 shrink-0"
                      style={{
                        borderColor: preset.color,
                        backgroundColor: preset.fillColor,
                        opacity: preset.opacity,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">{preset.color}</div>
                    </div>
                    <Button
                      onClick={() => setCurrentStyle(preset)}
                      size="sm"
                      variant="ghost"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => deleteCustomPreset(preset.id)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button onClick={exportStyles} size="sm" variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <label className="flex-1">
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-1" />
                    Import
                  </span>
                </Button>
                <input type="file" accept=".json" onChange={importStyles} className="hidden" />
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Style akan diterapkan pada layer baru
          </p>
          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Style
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
