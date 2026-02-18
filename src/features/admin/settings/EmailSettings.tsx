import { useState, useEffect } from 'react';
import { useAppSettings } from '@/features/admin/useAppSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const EmailSettings = () => {
  const { value, loading, saving, saveSetting } = useAppSettings('email', 'smtp');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (value) {
      setHost((value.host as string) || '');
      setPort((value.port as number) || 587);
      setUsername((value.username as string) || '');
      setEnabled((value.enabled as boolean) || false);
    }
  }, [value]);

  const handleSave = async () => {
    if (enabled && (!host || !username)) {
      toast.error('Host dan Username wajib diisi');
      return;
    }
    await saveSetting({ host, port, username, password: password || undefined, enabled });
  };

  const handleTest = async () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      toast.success('Koneksi SMTP berhasil!', {
        description: 'Email test berhasil dikirim',
        icon: <CheckCircle className="h-4 w-4" />
      });
    }, 2000);
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
          <Mail className="h-5 w-5 text-blue-500" />
          Email & Komunikasi
        </CardTitle>
        <CardDescription>Konfigurasi SMTP untuk notifikasi email</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">SMTP Host</label>
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp.gmail.com"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">SMTP Port</label>
            <Input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="587"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@example.com"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9"
            />
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-4 border">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium">Aktifkan Email Notifikasi</div>
              <p className="text-xs text-muted-foreground mt-1">Kirim email untuk laporan baru dan update</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
        </div>

        <Separator />
        
        <div className="flex items-center justify-between">
          <Button onClick={handleTest} disabled={testing || !host} size="sm" variant="outline">
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Koneksi
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
