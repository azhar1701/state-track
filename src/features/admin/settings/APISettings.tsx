import { useState, useEffect } from 'react';
import { useAppSettings } from '@/features/admin/useAppSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plug, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const APISettings = () => {
  const { value, loading, saving, saveSetting } = useAppSettings('api', 'config');
  const [apiKey] = useState('sk_live_' + '•'.repeat(32));
  const [webhookUrl, setWebhookUrl] = useState('');
  const [rateLimit, setRateLimit] = useState(60);

  useEffect(() => {
    if (value) {
      setWebhookUrl((value.webhookUrl as string) || '');
      setRateLimit((value.rateLimit as number) || 60);
    }
  }, [value]);

  const handleSave = async () => {
    await saveSetting({ webhookUrl, rateLimit });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API Key disalin ke clipboard');
  };

  const handleRotate = () => {
    toast.info('Fitur rotate key akan segera tersedia');
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
          <Plug className="h-5 w-5 text-cyan-500" />
          Integrasi & API
        </CardTitle>
        <CardDescription>Kelola API keys dan webhook untuk integrasi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">API Key</label>
          <div className="flex gap-2">
            <Input value={apiKey} readOnly className="h-9 font-mono text-xs" />
            <Button onClick={handleCopy} size="sm" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={handleRotate} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Gunakan key ini untuk autentikasi API</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL</label>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">Endpoint untuk menerima notifikasi event</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Rate Limit (requests/minute)</label>
          <Input
            type="number"
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            min={10}
            max={1000}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">Batas maksimal request per menit</p>
        </div>

        <Separator />
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Dokumentasi API: /api/docs</p>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
