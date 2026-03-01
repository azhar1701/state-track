import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Lock, Eye, Key, Loader2, AlertTriangle, CheckCircle2, Clock, FileKey } from "lucide-react";
import { useSecurityConfig } from "@/features/admin/useSecurityConfig";

export const SecuritySettings = () => {
  const { config, saveConfig, loading } = useSecurityConfig();
  const [saving, setSaving] = useState(false);

  const [authSettings, setAuthSettings] = useState({
    requireMFA: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 8,
    requireStrongPassword: true,
    allowAnonymous: false,
  });

  const [accessSettings, setAccessSettings] = useState({
    ipWhitelist: "",
    enableRateLimit: true,
    maxRequestsPerMinute: 60,
    enableCORS: true,
    allowedOrigins: "",
    requireEmailVerification: true,
  });

  const [auditSettings, setAuditSettings] = useState({
    enableAuditLog: true,
    logAuthEvents: true,
    logDataChanges: true,
    logAPIAccess: false,
    retentionDays: 90,
    alertOnSuspicious: true,
  });

  const [encryptionSettings, setEncryptionSettings] = useState({
    encryptSensitiveData: true,
    encryptPhotos: false,
    encryptBackups: true,
    keyRotationDays: 90,
  });

  useEffect(() => {
    if (config) {
      setAuthSettings(prev => ({ ...prev, ...config.authentication }));
      setAccessSettings(prev => ({ ...prev, ...config.access }));
      setAuditSettings(prev => ({ ...prev, ...config.audit }));
      setEncryptionSettings(prev => ({ ...prev, ...config.encryption }));
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (authSettings.sessionTimeout < 5) {
        toast.error("Durasi sesi minimal 5 menit");
        return;
      }
      if (authSettings.maxLoginAttempts < 3) {
        toast.error("Maksimal percobaan login minimal 3 kali");
        return;
      }
      if (authSettings.passwordMinLength < 6) {
        toast.error("Panjang password minimal 6 karakter");
        return;
      }
      if (accessSettings.maxRequestsPerMinute < 10) {
        toast.error("Rate limit minimal 10 request per menit");
        return;
      }
      if (auditSettings.retentionDays < 30) {
        toast.error("Retensi audit log minimal 30 hari");
        return;
      }

      await saveConfig({
        authentication: authSettings,
        access: accessSettings,
        audit: auditSettings,
        encryption: encryptionSettings,
      });
      toast.success("Pengaturan keamanan berhasil disimpan");
    } catch (error) {
      logger.error("Failed to save security settings", error);
      toast.error("Gagal menyimpan pengaturan keamanan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shield className="h-5 w-5 text-red-500" />
              Pengaturan Keamanan
            </CardTitle>
            <CardDescription className="mt-1.5">
              Konfigurasi autentikasi, akses, audit, dan enkripsi sistem
            </CardDescription>
          </div>
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Sensitif
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="auth" className="gap-1.5 text-xs sm:text-sm py-2">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Autentikasi</span>
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-1.5 text-xs sm:text-sm py-2">
              <Key className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Akses</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm py-2">
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="encryption" className="gap-1.5 text-xs sm:text-sm py-2">
              <FileKey className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Enkripsi</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auth" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Kebijakan Autentikasi</h4>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Multi-Factor Authentication (MFA)</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Wajibkan admin mengaktifkan autentikasi 2 faktor
                    </p>
                  </div>
                  <Switch
                    checked={authSettings.requireMFA}
                    onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, requireMFA: checked }))}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Password kuat wajib</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Minimal 1 huruf besar, 1 angka, 1 simbol
                    </p>
                  </div>
                  <Switch
                    checked={authSettings.requireStrongPassword}
                    onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, requireStrongPassword: checked }))}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Izinkan laporan anonim</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pengguna dapat melaporkan tanpa login
                    </p>
                  </div>
                  <Switch
                    checked={authSettings.allowAnonymous}
                    onCheckedChange={(checked) => setAuthSettings(prev => ({ ...prev, allowAnonymous: checked }))}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Durasi sesi (menit)
                  </Label>
                  <Input
                    type="number"
                    min="5"
                    max="1440"
                    value={authSettings.sessionTimeout}
                    onChange={(e) => setAuthSettings(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Minimal 5, maksimal 1440 (24 jam)</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Panjang password minimal
                  </Label>
                  <Input
                    type="number"
                    min="6"
                    max="32"
                    value={authSettings.passwordMinLength}
                    onChange={(e) => setAuthSettings(prev => ({ ...prev, passwordMinLength: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Minimal 6, maksimal 32 karakter</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Maks percobaan login
                  </Label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={authSettings.maxLoginAttempts}
                    onChange={(e) => setAuthSettings(prev => ({ ...prev, maxLoginAttempts: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Sebelum akun dikunci sementara</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Durasi lockout (menit)
                  </Label>
                  <Input
                    type="number"
                    min="5"
                    max="120"
                    value={authSettings.lockoutDuration}
                    onChange={(e) => setAuthSettings(prev => ({ ...prev, lockoutDuration: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Waktu tunggu setelah login gagal berulang</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="access" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Kontrol Akses</h4>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Rate limiting</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Batasi jumlah request per menit per IP
                    </p>
                  </div>
                  <Switch
                    checked={accessSettings.enableRateLimit}
                    onCheckedChange={(checked) => setAccessSettings(prev => ({ ...prev, enableRateLimit: checked }))}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">CORS protection</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Batasi akses dari origin tertentu saja
                    </p>
                  </div>
                  <Switch
                    checked={accessSettings.enableCORS}
                    onCheckedChange={(checked) => setAccessSettings(prev => ({ ...prev, enableCORS: checked }))}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Verifikasi email wajib</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pengguna harus verifikasi email sebelum akses penuh
                    </p>
                  </div>
                  <Switch
                    checked={accessSettings.requireEmailVerification}
                    onCheckedChange={(checked) => setAccessSettings(prev => ({ ...prev, requireEmailVerification: checked }))}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Maksimal request per menit
                </Label>
                <Input
                  type="number"
                  min="10"
                  max="1000"
                  value={accessSettings.maxRequestsPerMinute}
                  onChange={(e) => setAccessSettings(prev => ({ ...prev, maxRequestsPerMinute: Number(e.target.value) }))}
                  disabled={!accessSettings.enableRateLimit}
                />
                <p className="text-xs text-muted-foreground">Minimal 10, maksimal 1000 request</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  IP Whitelist
                </Label>
                <Textarea
                  placeholder="Pisahkan dengan koma, contoh: 192.168.1.1, 10.0.0.0/24&#10;Kosongkan untuk izinkan semua IP"
                  value={accessSettings.ipWhitelist}
                  onChange={(e) => setAccessSettings(prev => ({ ...prev, ipWhitelist: e.target.value }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Hanya IP dalam daftar yang dapat mengakses admin panel
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Allowed Origins (CORS)
                </Label>
                <Textarea
                  placeholder="Pisahkan dengan koma, contoh: https://example.com, https://app.example.com&#10;Kosongkan untuk izinkan semua origin"
                  value={accessSettings.allowedOrigins}
                  onChange={(e) => setAccessSettings(prev => ({ ...prev, allowedOrigins: e.target.value }))}
                  rows={3}
                  disabled={!accessSettings.enableCORS}
                />
                <p className="text-xs text-muted-foreground">
                  Domain yang diizinkan mengakses API
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Audit & Monitoring</h4>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Aktifkan audit log</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Catat semua aktivitas penting sistem
                    </p>
                  </div>
                  <Switch
                    checked={auditSettings.enableAuditLog}
                    onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, enableAuditLog: checked }))}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Log event autentikasi</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Login, logout, gagal login, perubahan password
                    </p>
                  </div>
                  <Switch
                    checked={auditSettings.logAuthEvents}
                    onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, logAuthEvents: checked }))}
                    disabled={!auditSettings.enableAuditLog}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Log perubahan data</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create, update, delete pada laporan dan layer
                    </p>
                  </div>
                  <Switch
                    checked={auditSettings.logDataChanges}
                    onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, logDataChanges: checked }))}
                    disabled={!auditSettings.enableAuditLog}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Log akses API</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Semua request ke endpoint API (high volume)
                    </p>
                  </div>
                  <Switch
                    checked={auditSettings.logAPIAccess}
                    onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, logAPIAccess: checked }))}
                    disabled={!auditSettings.enableAuditLog}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Alert aktivitas mencurigakan</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Notifikasi admin jika terdeteksi anomali
                    </p>
                  </div>
                  <Switch
                    checked={auditSettings.alertOnSuspicious}
                    onCheckedChange={(checked) => setAuditSettings(prev => ({ ...prev, alertOnSuspicious: checked }))}
                    disabled={!auditSettings.enableAuditLog}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Retensi audit log (hari)
                </Label>
                <Input
                  type="number"
                  min="30"
                  max="365"
                  value={auditSettings.retentionDays}
                  onChange={(e) => setAuditSettings(prev => ({ ...prev, retentionDays: Number(e.target.value) }))}
                  disabled={!auditSettings.enableAuditLog}
                />
                <p className="text-xs text-muted-foreground">
                  Log lebih lama dari ini akan dihapus otomatis (minimal 30 hari)
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-primary/20 border border-blue-200 dark:border-primary rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-primary dark:text-blue-400 mt-0.5" />
                  <div className="text-xs text-primary dark:text-blue-100">
                    <strong>Info:</strong> Audit log dapat diakses di tab Activity Log pada dashboard admin.
                    Log mencakup timestamp, user, action, dan detail perubahan.
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="encryption" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileKey className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Enkripsi Data</h4>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Enkripsi data sensitif</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enkripsi nama pelapor, nomor telepon, dan alamat
                    </p>
                  </div>
                  <Switch
                    checked={encryptionSettings.encryptSensitiveData}
                    onCheckedChange={(checked) => setEncryptionSettings(prev => ({ ...prev, encryptSensitiveData: checked }))}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Enkripsi foto laporan</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Foto disimpan terenkripsi di storage (performa lebih lambat)
                    </p>
                  </div>
                  <Switch
                    checked={encryptionSettings.encryptPhotos}
                    onCheckedChange={(checked) => setEncryptionSettings(prev => ({ ...prev, encryptPhotos: checked }))}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Enkripsi file backup</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Backup database dan layer dienkripsi sebelum disimpan
                    </p>
                  </div>
                  <Switch
                    checked={encryptionSettings.encryptBackups}
                    onCheckedChange={(checked) => setEncryptionSettings(prev => ({ ...prev, encryptBackups: checked }))}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Rotasi encryption key (hari)
                </Label>
                <Input
                  type="number"
                  min="30"
                  max="365"
                  value={encryptionSettings.keyRotationDays}
                  onChange={(e) => setEncryptionSettings(prev => ({ ...prev, keyRotationDays: Number(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">
                  Key enkripsi akan dirotasi otomatis setiap periode ini (minimal 30 hari)
                </p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-100">
                    <strong>Peringatan:</strong> Mengaktifkan enkripsi foto dapat memperlambat upload dan loading.
                    Pastikan server memiliki resource yang cukup. Enkripsi menggunakan AES-256-GCM.
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="text-xs text-green-900 dark:text-green-100">
                    <strong>Best Practice:</strong> Aktifkan enkripsi data sensitif dan backup untuk keamanan maksimal.
                    Backup key enkripsi secara terpisah di lokasi aman.
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex items-start gap-3 rounded-lg border-2 border-destructive/40 bg-destructive/10 p-3 text-xs mb-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span className="text-destructive">
            Perubahan pengaturan keamanan akan diterapkan segera dan dapat mempengaruhi akses pengguna.
            Pastikan untuk mengkomunikasikan perubahan kepada tim sebelum menyimpan.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Terakhir diperbarui: {config?.updatedAt ? new Date(config.updatedAt).toLocaleString('id-ID') : '-'}
          </p>
          <Button onClick={handleSave} disabled={saving || loading} size="sm" className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengaturan Keamanan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
