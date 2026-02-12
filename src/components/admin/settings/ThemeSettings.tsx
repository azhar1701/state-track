import { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Palette } from 'lucide-react';

export const ThemeSettings = () => {
  const { value, loading, saving, saveSetting } = useAppSettings('theme', 'colors');
  const [primary, setPrimary] = useState('#3b82f6');
  const [accent, setAccent] = useState('#8b5cf6');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (value) {
      setPrimary((value.primary as string) || '#3b82f6');
      setAccent((value.accent as string) || '#8b5cf6');
      setDarkMode((value.darkMode as boolean) || false);
    }
  }, [value]);

  const handleSave = async () => {
    await saveSetting({ primary, accent, darkMode });
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-purple-500" />
          Tema & Tampilan
        </CardTitle>
        <CardDescription>Kustomisasi warna dan tema aplikasi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Warna Primer</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 flex-1"
                placeholder="#3b82f6"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Warna Aksen</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 flex-1"
                placeholder="#8b5cf6"
              />
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 border">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium">Mode Gelap Default</div>
              <p className="text-xs text-muted-foreground mt-1">Aktifkan tema gelap saat aplikasi dibuka</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </label>
        </div>

        <Separator />
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Perubahan akan diterapkan setelah refresh</p>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Tema
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
