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
import { Loader2, FileText, CheckCircle, Settings2, Bell, FileCheck, Workflow } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

type ReportConfig = {
  autoApprove: boolean;
  requirePhotos: boolean;
  minPhotos: number;
  maxPhotos: number;
  requireLocation: boolean;
  allowAnonymous: boolean;
  autoAssign: boolean;
  defaultPriority: 'rendah' | 'sedang' | 'tinggi';
  autoCloseAfterDays: number;
  enablePublicView: boolean;
  requireVerification: boolean;
};

type ExportConfig = {
  schedule: 'none' | 'daily' | 'weekly' | 'monthly';
  format: 'csv' | 'pdf' | 'excel';
  retention: number;
  includePhotos: boolean;
  includeComments: boolean;
  autoEmail: boolean;
};

type NotificationConfig = {
  notifyOnNew: boolean;
  notifyOnUpdate: boolean;
  notifyOnClose: boolean;
  notifyEmail: string;
  notifyThreshold: number;
};

const STORAGE_KEY = 'admin:reportSettings';

const defaultConfig: ReportConfig = {
  autoApprove: false,
  requirePhotos: true,
  minPhotos: 1,
  maxPhotos: 5,
  requireLocation: true,
  allowAnonymous: false,
  autoAssign: false,
  defaultPriority: 'sedang',
  autoCloseAfterDays: 30,
  enablePublicView: true,
  requireVerification: false,
};

const defaultExport: ExportConfig = {
  schedule: 'none',
  format: 'csv',
  retention: 365,
  includePhotos: false,
  includeComments: true,
  autoEmail: false,
};

const defaultNotification: NotificationConfig = {
  notifyOnNew: true,
  notifyOnUpdate: false,
  notifyOnClose: false,
  notifyEmail: '',
  notifyThreshold: 5,
};

export const ReportSettings = () => {
  const { saveSetting } = useSystemSettings();
  const [config, setConfig] = useState<ReportConfig>(defaultConfig);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(defaultExport);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(defaultNotification);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.config) setConfig(prev => ({ ...prev, ...parsed.config }));
        if (parsed.export) setExportConfig(prev => ({ ...prev, ...parsed.export }));
        if (parsed.notification) setNotificationConfig(prev => ({ ...prev, ...parsed.notification }));
      }
    } catch (error) {
      console.warn('Failed to load report settings', error);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (config.minPhotos > config.maxPhotos) {
        toast.error('Minimal foto tidak boleh lebih dari maksimal');
        return;
      }
      if (config.autoCloseAfterDays < 1) {
        toast.error('Auto-close minimal 1 hari');
        return;
      }
      if (exportConfig.retention < 30) {
        toast.error('Retensi data minimal 30 hari');
        return;
      }

      const data = { config, export: exportConfig, notification: notificationConfig };
      await saveSetting('reports', 'config', data);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }

      toast.success('Pengaturan laporan berhasil disimpan', {
        icon: <CheckCircle className="h-4 w-4" />,
      });
    } catch (error) {
      console.error('Failed to save report settings', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }, [config, exportConfig, notificationConfig, saveSetting]);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-5 w-5 text-green-500" />
              Pengaturan Laporan
            </CardTitle>
            <CardDescription className="mt-1.5">
              Kelola workflow, validasi, ekspor, dan notifikasi laporan
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Settings2 className="h-3 w-3" />
            Advanced
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="workflow" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="workflow" className="gap-1.5 text-xs sm:text-sm">
              <Workflow className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Workflow</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-1.5 text-xs sm:text-sm">
              <FileCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Validasi</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ekspor</span>
            </TabsTrigger>
            <TabsTrigger value="notification" className="gap-1.5 text-xs sm:text-sm">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Notifikasi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Workflow className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Alur Kerja Laporan</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Auto-approve laporan</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Laporan baru langsung disetujui
                      </p>
                    </div>
                    <Switch
                      checked={config.autoApprove}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, autoApprove: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Auto-assign ke petugas</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Distribusi otomatis berdasarkan wilayah
                      </p>
                    </div>
                    <Switch
                      checked={config.autoAssign}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, autoAssign: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Izinkan laporan anonim</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pelapor tidak perlu login
                      </p>
                    </div>
                    <Switch
                      checked={config.allowAnonymous}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, allowAnonymous: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Tampilan publik</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Laporan bisa dilihat tanpa login
                      </p>
                    </div>
                    <Switch
                      checked={config.enablePublicView}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, enablePublicView: checked }))
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
                    Prioritas default
                  </label>
                  <Select
                    value={config.defaultPriority}
                    onValueChange={(value) =>
                      setConfig((prev) => ({
                        ...prev,
                        defaultPriority: value as ReportConfig['defaultPriority'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rendah">Rendah</SelectItem>
                      <SelectItem value="sedang">Sedang</SelectItem>
                      <SelectItem value="tinggi">Tinggi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Auto-close setelah (hari)
                  </label>
                  <Input
                    className="h-9"
                    type="number"
                    min="1"
                    max="365"
                    value={config.autoCloseAfterDays}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        autoCloseAfterDays: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Validasi Input</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Wajibkan foto</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Laporan harus menyertakan foto
                      </p>
                    </div>
                    <Switch
                      checked={config.requirePhotos}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, requirePhotos: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Wajibkan lokasi</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Koordinat GPS harus terisi
                      </p>
                    </div>
                    <Switch
                      checked={config.requireLocation}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, requireLocation: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Verifikasi pelapor</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Validasi identitas via email/SMS
                      </p>
                    </div>
                    <Switch
                      checked={config.requireVerification}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, requireVerification: checked }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Minimal foto: {config.minPhotos}
                  </label>
                  <Slider
                    value={[config.minPhotos]}
                    onValueChange={([v]) => setConfig((prev) => ({ ...prev, minPhotos: v }))}
                    min={0}
                    max={5}
                    step={1}
                    disabled={!config.requirePhotos}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Maksimal foto: {config.maxPhotos}
                  </label>
                  <Slider
                    value={[config.maxPhotos]}
                    onValueChange={([v]) => setConfig((prev) => ({ ...prev, maxPhotos: v }))}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Ekspor & Retensi</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Jadwal auto-export
                  </label>
                  <Select
                    value={exportConfig.schedule}
                    onValueChange={(value) =>
                      setExportConfig((prev) => ({
                        ...prev,
                        schedule: value as ExportConfig['schedule'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak Aktif</SelectItem>
                      <SelectItem value="daily">Harian (00:00)</SelectItem>
                      <SelectItem value="weekly">Mingguan (Senin)</SelectItem>
                      <SelectItem value="monthly">Bulanan (Tanggal 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Format ekspor
                  </label>
                  <Select
                    value={exportConfig.format}
                    onValueChange={(value) =>
                      setExportConfig((prev) => ({
                        ...prev,
                        format: value as ExportConfig['format'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel (XLSX)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Retensi data (hari)
                  </label>
                  <Input
                    className="h-9"
                    type="number"
                    min="30"
                    max="3650"
                    value={exportConfig.retention}
                    onChange={(e) =>
                      setExportConfig((prev) => ({
                        ...prev,
                        retention: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Sertakan foto</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ekspor dengan lampiran foto
                      </p>
                    </div>
                    <Switch
                      checked={exportConfig.includePhotos}
                      onCheckedChange={(checked) =>
                        setExportConfig((prev) => ({ ...prev, includePhotos: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Sertakan komentar</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ekspor dengan riwayat komentar
                      </p>
                    </div>
                    <Switch
                      checked={exportConfig.includeComments}
                      onCheckedChange={(checked) =>
                        setExportConfig((prev) => ({ ...prev, includeComments: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Kirim via email</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Otomatis kirim hasil ekspor
                      </p>
                    </div>
                    <Switch
                      checked={exportConfig.autoEmail}
                      onCheckedChange={(checked) =>
                        setExportConfig((prev) => ({ ...prev, autoEmail: checked }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notification" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Notifikasi Admin</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Laporan baru</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notifikasi saat ada laporan masuk
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.notifyOnNew}
                      onCheckedChange={(checked) =>
                        setNotificationConfig((prev) => ({ ...prev, notifyOnNew: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Update laporan</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notifikasi saat status berubah
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.notifyOnUpdate}
                      onCheckedChange={(checked) =>
                        setNotificationConfig((prev) => ({ ...prev, notifyOnUpdate: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Laporan selesai</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notifikasi saat laporan ditutup
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.notifyOnClose}
                      onCheckedChange={(checked) =>
                        setNotificationConfig((prev) => ({ ...prev, notifyOnClose: checked }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email notifikasi
                </label>
                <Input
                  className="h-9"
                  type="email"
                  placeholder="admin@example.com"
                  value={notificationConfig.notifyEmail}
                  onChange={(e) =>
                    setNotificationConfig((prev) => ({ ...prev, notifyEmail: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Threshold notifikasi: {notificationConfig.notifyThreshold} laporan
                </label>
                <Slider
                  value={[notificationConfig.notifyThreshold]}
                  onValueChange={([v]) =>
                    setNotificationConfig((prev) => ({ ...prev, notifyThreshold: v }))
                  }
                  min={1}
                  max={20}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Kirim notifikasi jika ada {notificationConfig.notifyThreshold} laporan baru dalam 1 jam
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Perubahan akan diterapkan pada laporan berikutnya
          </p>
          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengaturan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
