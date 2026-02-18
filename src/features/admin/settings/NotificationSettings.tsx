import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Bell, CheckCircle, Mail, MessageSquare, Settings2, Zap, FileText } from 'lucide-react';
import { useSystemSettings } from '@/features/admin/useSystemSettings';

type NotificationConfig = {
  channels: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
    push: boolean;
  };
  triggers: {
    reportCreated: boolean;
    reportUpdated: boolean;
    reportClosed: boolean;
    reportAssigned: boolean;
    reportCommented: boolean;
    reportEscalated: boolean;
  };
  preferences: {
    batchNotifications: boolean;
    batchInterval: number;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    notifyAdminsOnly: boolean;
    notifyReporterOnly: boolean;
  };
  templates: {
    reportCreated: string;
    reportUpdated: string;
    reportClosed: string;
  };
  recipients: {
    adminEmails: string;
    ccEmails: string;
  };
};

const STORAGE_KEY = 'admin:notificationSettings';

const defaultConfig: NotificationConfig = {
  channels: {
    email: true,
    inApp: true,
    sms: false,
    push: false,
  },
  triggers: {
    reportCreated: true,
    reportUpdated: false,
    reportClosed: true,
    reportAssigned: true,
    reportCommented: false,
    reportEscalated: true,
  },
  preferences: {
    batchNotifications: false,
    batchInterval: 60,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    notifyAdminsOnly: false,
    notifyReporterOnly: false,
  },
  templates: {
    reportCreated: 'Laporan baru: {title} telah dibuat oleh {reporter}',
    reportUpdated: 'Laporan {title} diperbarui. Status: {status}',
    reportClosed: 'Laporan {title} telah diselesaikan',
  },
  recipients: {
    adminEmails: '',
    ccEmails: '',
  },
};

export const NotificationSettings = () => {
  const { saveSetting } = useSystemSettings();
  const [config, setConfig] = useState<NotificationConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load notification settings', error);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (config.preferences.batchInterval < 5) {
        toast.error('Interval batch minimal 5 menit');
        return;
      }

      await saveSetting('notification', 'config', config);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }

      toast.success('Pengaturan notifikasi berhasil disimpan', {
        icon: <CheckCircle className="h-4 w-4" />,
      });
    } catch (error) {
      console.error('Failed to save notification settings', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }, [config, saveSetting]);

  const activeChannels = Object.values(config.channels).filter(Boolean).length;
  const activeTriggers = Object.values(config.triggers).filter(Boolean).length;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Bell className="h-5 w-5 text-amber-500" />
              Pengaturan Notifikasi
            </CardTitle>
            <CardDescription className="mt-1.5">
              Kelola channel, trigger, template, dan preferensi notifikasi
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Settings2 className="h-3 w-3" />
            {activeChannels} Channel
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="channels" className="gap-1.5 text-xs sm:text-sm">
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Channel</span>
            </TabsTrigger>
            <TabsTrigger value="triggers" className="gap-1.5 text-xs sm:text-sm">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Trigger</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Template</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5 text-xs sm:text-sm">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preferensi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Channel Notifikasi</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <div className="text-sm font-medium">Email</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Kirim notifikasi via email
                      </p>
                    </div>
                    <Switch
                      checked={config.channels.email}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, channels: { ...prev.channels, email: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <div className="text-sm font-medium">In-App</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notifikasi dalam aplikasi
                      </p>
                    </div>
                    <Switch
                      checked={config.channels.inApp}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, channels: { ...prev.channels, inApp: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <div className="text-sm font-medium">SMS</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Kirim via SMS (perlu konfigurasi)
                      </p>
                    </div>
                    <Switch
                      checked={config.channels.sms}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, channels: { ...prev.channels, sms: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <div className="text-sm font-medium">Push</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Push notification (PWA)
                      </p>
                    </div>
                    <Switch
                      checked={config.channels.push}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, channels: { ...prev.channels, push: checked } }))
                      }
                    />
                  </label>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Penerima Email</h4>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Email Admin</label>
                  <Input
                    placeholder="admin@example.com, admin2@example.com"
                    value={config.recipients.adminEmails}
                    onChange={(e) =>
                      setConfig(prev => ({ ...prev, recipients: { ...prev.recipients, adminEmails: e.target.value } }))
                    }
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Pisahkan dengan koma untuk multiple email</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">CC Email (opsional)</label>
                  <Input
                    placeholder="cc@example.com"
                    value={config.recipients.ccEmails}
                    onChange={(e) =>
                      setConfig(prev => ({ ...prev, recipients: { ...prev.recipients, ccEmails: e.target.value } }))
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="triggers" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Event Trigger ({activeTriggers} aktif)</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Laporan dibuat</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notif saat ada laporan baru
                      </p>
                    </div>
                    <Switch
                      checked={config.triggers.reportCreated}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, reportCreated: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Laporan diupdate</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notif saat status berubah
                      </p>
                    </div>
                    <Switch
                      checked={config.triggers.reportUpdated}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, reportUpdated: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Laporan selesai</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notif saat laporan ditutup
                      </p>
                    </div>
                    <Switch
                      checked={config.triggers.reportClosed}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, reportClosed: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Laporan ditugaskan</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notif saat assign ke petugas
                      </p>
                    </div>
                    <Switch
                      checked={config.triggers.reportAssigned}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, reportAssigned: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Komentar baru</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notif saat ada komentar
                      </p>
                    </div>
                    <Switch
                      checked={config.triggers.reportCommented}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, reportCommented: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Eskalasi</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notif saat laporan dieskalasi
                      </p>
                    </div>
                    <Switch
                      checked={config.triggers.reportEscalated}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, reportEscalated: checked } }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Template Notifikasi</h4>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  💡 Gunakan placeholder: {'{title}'}, {'{reporter}'}, {'{status}'}, {'{category}'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Laporan Dibuat</label>
                <Textarea
                  value={config.templates.reportCreated}
                  onChange={(e) =>
                    setConfig(prev => ({ ...prev, templates: { ...prev.templates, reportCreated: e.target.value } }))
                  }
                  className="text-sm"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Laporan Diupdate</label>
                <Textarea
                  value={config.templates.reportUpdated}
                  onChange={(e) =>
                    setConfig(prev => ({ ...prev, templates: { ...prev.templates, reportUpdated: e.target.value } }))
                  }
                  className="text-sm"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Laporan Selesai</label>
                <Textarea
                  value={config.templates.reportClosed}
                  onChange={(e) =>
                    setConfig(prev => ({ ...prev, templates: { ...prev.templates, reportClosed: e.target.value } }))
                  }
                  className="text-sm"
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Preferensi Pengiriman</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Batch notifikasi</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Kumpulkan notifikasi dalam interval
                      </p>
                    </div>
                    <Switch
                      checked={config.preferences.batchNotifications}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, preferences: { ...prev.preferences, batchNotifications: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Quiet hours</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Jeda notifikasi di jam tertentu
                      </p>
                    </div>
                    <Switch
                      checked={config.preferences.quietHoursEnabled}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, preferences: { ...prev.preferences, quietHoursEnabled: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Hanya admin</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notifikasi hanya ke admin
                      </p>
                    </div>
                    <Switch
                      checked={config.preferences.notifyAdminsOnly}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, preferences: { ...prev.preferences, notifyAdminsOnly: checked } }))
                      }
                    />
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 border">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Hanya pelapor</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notifikasi hanya ke pembuat laporan
                      </p>
                    </div>
                    <Switch
                      checked={config.preferences.notifyReporterOnly}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({ ...prev, preferences: { ...prev.preferences, notifyReporterOnly: checked } }))
                      }
                    />
                  </label>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Interval batch (menit)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="1440"
                    value={config.preferences.batchInterval}
                    onChange={(e) =>
                      setConfig(prev => ({ ...prev, preferences: { ...prev.preferences, batchInterval: Number(e.target.value) } }))
                    }
                    disabled={!config.preferences.batchNotifications}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Quiet hours
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={config.preferences.quietHoursStart}
                      onChange={(e) =>
                        setConfig(prev => ({ ...prev, preferences: { ...prev.preferences, quietHoursStart: e.target.value } }))
                      }
                      disabled={!config.preferences.quietHoursEnabled}
                      className="h-9"
                    />
                    <span className="text-muted-foreground self-center">-</span>
                    <Input
                      type="time"
                      value={config.preferences.quietHoursEnd}
                      onChange={(e) =>
                        setConfig(prev => ({ ...prev, preferences: { ...prev.preferences, quietHoursEnd: e.target.value } }))
                      }
                      disabled={!config.preferences.quietHoursEnabled}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Perubahan akan diterapkan pada notifikasi berikutnya
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
