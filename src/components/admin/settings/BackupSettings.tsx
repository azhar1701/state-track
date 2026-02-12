import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DownloadCloud, UploadCloud, Database, FileJson, Clock, Loader2, CheckCircle2, AlertTriangle, HardDrive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBackupConfig } from "@/hooks/useBackupConfig";

export const BackupSettings = () => {
  const { config, saveConfig, loading } = useBackupConfig();
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: false,
    backupFrequency: "daily" as "daily" | "weekly" | "monthly",
    backupTime: "02:00",
    includeReports: true,
    includeGeoLayers: true,
    includeSettings: true,
    includeUsers: false,
    retentionDays: 30,
  });

  const handleBackupDatabase = async () => {
    setBackupInProgress(true);
    const fileName = `database-backup-${Date.now()}.json`;
    const tablesIncluded: string[] = [];
    let totalRecords = 0;

    try {
      const backup: Record<string, unknown> = {
        exported_at: new Date().toISOString(),
        version: "1.0",
      };

      if (backupSettings.includeReports) {
        const { data, error } = await supabase.from("reports").select("*");
        if (error) throw error;
        backup.reports = data;
        tablesIncluded.push("reports");
        totalRecords += data?.length || 0;
      }

      if (backupSettings.includeGeoLayers) {
        const { data, error } = await supabase.from("geo_layers").select("*");
        if (error) throw error;
        backup.geo_layers = data;
        tablesIncluded.push("geo_layers");
        totalRecords += data?.length || 0;
      }

      if (backupSettings.includeSettings) {
        const { data, error } = await supabase.from("system_settings").select("*");
        if (!error && data) {
          backup.system_settings = data;
          tablesIncluded.push("system_settings");
          totalRecords += data?.length || 0;
        }
      }

      if (backupSettings.includeUsers) {
        const { data: profiles } = await supabase.from("profiles").select("*");
        const { data: roles } = await supabase.from("user_roles").select("*");
        backup.profiles = profiles;
        backup.user_roles = roles;
        tablesIncluded.push("profiles", "user_roles");
        totalRecords += (profiles?.length || 0) + (roles?.length || 0);
      }

      const jsonString = JSON.stringify(backup, null, 2);
      const fileSize = new Blob([jsonString]).size;

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      // Log to database
      try {
        await supabase.rpc("log_backup", {
          p_backup_type: "full",
          p_file_name: fileName,
          p_file_size: fileSize,
          p_tables_included: tablesIncluded,
          p_record_count: totalRecords,
          p_status: "success",
        });
      } catch (logError) {
        console.warn("Failed to log backup to database", logError);
      }

      // Update last backup time
      await saveConfig({ lastBackup: new Date().toISOString() });

      toast.success("Backup database berhasil dibuat");
    } catch (error) {
      console.error("Failed to backup database", error);
      
      // Log failed backup
      try {
        await supabase.rpc("log_backup", {
          p_backup_type: "full",
          p_file_name: fileName,
          p_status: "failed",
          p_error_message: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (logError) {
        console.warn("Failed to log backup error", logError);
      }

      toast.error("Gagal membuat backup database");
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleBackupGeoLayers = async () => {
    setBackupInProgress(true);
    const fileName = `geo-layers-${Date.now()}.json`;

    try {
      const { data, error } = await supabase.from("geo_layers").select("*");
      if (error) throw error;

      const backup = {
        exported_at: new Date().toISOString(),
        type: "geo_layers",
        layers: data,
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const fileSize = new Blob([jsonString]).size;

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      // Log to database
      try {
        await supabase.rpc("log_backup", {
          p_backup_type: "geo_layers",
          p_file_name: fileName,
          p_file_size: fileSize,
          p_tables_included: ["geo_layers"],
          p_record_count: data?.length || 0,
          p_status: "success",
        });
      } catch (logError) {
        console.warn("Failed to log backup", logError);
      }

      await saveConfig({ lastBackup: new Date().toISOString() });

      toast.success("Backup geo layer berhasil");
    } catch (error) {
      console.error("Failed to backup geo layers", error);
      
      try {
        await supabase.rpc("log_backup", {
          p_backup_type: "geo_layers",
          p_file_name: fileName,
          p_status: "failed",
          p_error_message: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (logError) {
        console.warn("Failed to log backup error", logError);
      }

      toast.error("Gagal backup geo layer");
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleBackupReports = async () => {
    setBackupInProgress(true);
    const fileName = `reports-${Date.now()}.json`;

    try {
      const { data, error } = await supabase.from("reports").select("*");
      if (error) throw error;

      const backup = {
        exported_at: new Date().toISOString(),
        type: "reports",
        count: data.length,
        reports: data,
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const fileSize = new Blob([jsonString]).size;

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);

      // Log to database
      try {
        await supabase.rpc("log_backup", {
          p_backup_type: "reports",
          p_file_name: fileName,
          p_file_size: fileSize,
          p_tables_included: ["reports"],
          p_record_count: data.length,
          p_status: "success",
        });
      } catch (logError) {
        console.warn("Failed to log backup", logError);
      }

      await saveConfig({ lastBackup: new Date().toISOString() });

      toast.success(`Backup ${data.length} laporan berhasil`);
    } catch (error) {
      console.error("Failed to backup reports", error);
      
      try {
        await supabase.rpc("log_backup", {
          p_backup_type: "reports",
          p_file_name: fileName,
          p_status: "failed",
          p_error_message: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (logError) {
        console.warn("Failed to log backup error", logError);
      }

      toast.error("Gagal backup laporan");
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleTriggerRestore = () => {
    if (restoreInProgress) return;
    restoreInputRef.current?.click();
  };

  const handleRestoreFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreInProgress(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (backup.type === "geo_layers" && backup.layers) {
        const { error } = await supabase.from("geo_layers").upsert(backup.layers);
        if (error) throw error;
        toast.success("Restore geo layer berhasil");
      } else if (backup.type === "reports" && backup.reports) {
        const { error } = await supabase.from("reports").upsert(backup.reports);
        if (error) throw error;
        toast.success(`Restore ${backup.count} laporan berhasil`);
      } else if (backup.reports || backup.geo_layers) {
        let restored = 0;
        if (backup.reports) {
          const { error } = await supabase.from("reports").upsert(backup.reports);
          if (!error) restored++;
        }
        if (backup.geo_layers) {
          const { error } = await supabase.from("geo_layers").upsert(backup.geo_layers);
          if (!error) restored++;
        }
        if (backup.system_settings) {
          const { error } = await supabase.from("system_settings").upsert(backup.system_settings);
          if (!error) restored++;
        }
        toast.success(`Restore ${restored} tabel berhasil`);
      } else {
        throw new Error("Format backup tidak valid");
      }
    } catch (error) {
      console.error("Failed to restore", error);
      toast.error("Gagal restore data");
    } finally {
      setRestoreInProgress(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleSaveSchedule = async () => {
    try {
      await saveConfig({ schedule: backupSettings });
      toast.success("Jadwal backup berhasil disimpan");
    } catch (error) {
      console.error("Failed to save schedule", error);
      toast.error("Gagal menyimpan jadwal");
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
              <HardDrive className="h-5 w-5 text-green-500" />
              Backup & Restore
            </CardTitle>
            <CardDescription className="mt-1.5">
              Kelola cadangan dan pemulihan data aplikasi
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" />
            Database
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="backup" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="backup" className="gap-1.5 text-xs sm:text-sm py-2">
              <DownloadCloud className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Backup</span>
            </TabsTrigger>
            <TabsTrigger value="restore" className="gap-1.5 text-xs sm:text-sm py-2">
              <UploadCloud className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Restore</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm py-2">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Jadwal</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DownloadCloud className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Backup Manual</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={handleBackupDatabase}
                  disabled={backupInProgress}
                  variant="outline"
                  className="h-auto py-4 justify-start"
                >
                  {backupInProgress ? (
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  ) : (
                    <Database className="mr-3 h-5 w-5 text-blue-500" />
                  )}
                  <div className="text-left">
                    <div className="font-semibold">Full Database</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Semua tabel dan data
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handleBackupGeoLayers}
                  disabled={backupInProgress}
                  variant="outline"
                  className="h-auto py-4 justify-start"
                >
                  {backupInProgress ? (
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  ) : (
                    <FileJson className="mr-3 h-5 w-5 text-green-500" />
                  )}
                  <div className="text-left">
                    <div className="font-semibold">Geo Layers</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Layer geografis saja
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={handleBackupReports}
                  disabled={backupInProgress}
                  variant="outline"
                  className="h-auto py-4 justify-start"
                >
                  {backupInProgress ? (
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  ) : (
                    <FileJson className="mr-3 h-5 w-5 text-orange-500" />
                  )}
                  <div className="text-left">
                    <div className="font-semibold">Laporan</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Data laporan saja
                    </div>
                  </div>
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Info:</strong> Backup akan diunduh sebagai file JSON. Simpan di lokasi aman dan
                    terpisah dari server.
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Restore dari Backup</h4>
              </div>

              <Button
                onClick={handleTriggerRestore}
                disabled={restoreInProgress}
                variant="outline"
                size="lg"
                className="w-full h-auto py-6"
              >
                {restoreInProgress ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ) : (
                  <UploadCloud className="mr-3 h-6 w-6" />
                )}
                <div className="text-left">
                  <div className="font-semibold text-base">Pilih File Backup</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Format JSON dari backup sebelumnya
                  </div>
                </div>
              </Button>

              <input
                ref={restoreInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleRestoreFile}
              />

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-100">
                    <strong>Peringatan:</strong> Restore akan menimpa data yang ada dengan data dari backup.
                    Pastikan backup file valid dan buat backup current data terlebih dahulu.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Langkah Restore
                </Label>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Backup data current terlebih dahulu (opsional tapi direkomendasikan)</li>
                  <li>Pilih file backup JSON yang valid</li>
                  <li>Sistem akan otomatis detect tipe backup dan restore data</li>
                  <li>Data dengan ID sama akan di-update, data baru akan di-insert</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Backup Otomatis</h4>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Aktifkan backup otomatis</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Backup database secara terjadwal
                    </p>
                  </div>
                  <Switch
                    checked={backupSettings.autoBackup}
                    onCheckedChange={(checked) =>
                      setBackupSettings((prev) => ({ ...prev, autoBackup: checked }))
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Frekuensi
                  </Label>
                  <Select
                    value={backupSettings.backupFrequency}
                    onValueChange={(value) =>
                      setBackupSettings((prev) => ({
                        ...prev,
                        backupFrequency: value as "daily" | "weekly" | "monthly",
                      }))
                    }
                    disabled={!backupSettings.autoBackup}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Harian</SelectItem>
                      <SelectItem value="weekly">Mingguan</SelectItem>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Waktu (24 jam)
                  </Label>
                  <Select
                    value={backupSettings.backupTime}
                    onValueChange={(value) =>
                      setBackupSettings((prev) => ({ ...prev, backupTime: value }))
                    }
                    disabled={!backupSettings.autoBackup}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="00:00">00:00 (Tengah malam)</SelectItem>
                      <SelectItem value="02:00">02:00 (Dini hari)</SelectItem>
                      <SelectItem value="04:00">04:00 (Subuh)</SelectItem>
                      <SelectItem value="12:00">12:00 (Siang)</SelectItem>
                      <SelectItem value="18:00">18:00 (Sore)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Data yang di-backup
                </Label>

                <div className="space-y-2">
                  <div className="bg-muted/30 rounded-lg p-2 border flex items-center justify-between">
                    <span className="text-sm">Laporan</span>
                    <Switch
                      checked={backupSettings.includeReports}
                      onCheckedChange={(checked) =>
                        setBackupSettings((prev) => ({ ...prev, includeReports: checked }))
                      }
                      disabled={!backupSettings.autoBackup}
                    />
                  </div>

                  <div className="bg-muted/30 rounded-lg p-2 border flex items-center justify-between">
                    <span className="text-sm">Geo Layers</span>
                    <Switch
                      checked={backupSettings.includeGeoLayers}
                      onCheckedChange={(checked) =>
                        setBackupSettings((prev) => ({ ...prev, includeGeoLayers: checked }))
                      }
                      disabled={!backupSettings.autoBackup}
                    />
                  </div>

                  <div className="bg-muted/30 rounded-lg p-2 border flex items-center justify-between">
                    <span className="text-sm">Pengaturan Sistem</span>
                    <Switch
                      checked={backupSettings.includeSettings}
                      onCheckedChange={(checked) =>
                        setBackupSettings((prev) => ({ ...prev, includeSettings: checked }))
                      }
                      disabled={!backupSettings.autoBackup}
                    />
                  </div>

                  <div className="bg-muted/30 rounded-lg p-2 border flex items-center justify-between">
                    <span className="text-sm">Data Pengguna</span>
                    <Switch
                      checked={backupSettings.includeUsers}
                      onCheckedChange={(checked) =>
                        setBackupSettings((prev) => ({ ...prev, includeUsers: checked }))
                      }
                      disabled={!backupSettings.autoBackup}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Retensi backup (hari)
                </Label>
                <Select
                  value={backupSettings.retentionDays.toString()}
                  onValueChange={(value) =>
                    setBackupSettings((prev) => ({ ...prev, retentionDays: Number(value) }))
                  }
                  disabled={!backupSettings.autoBackup}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 hari</SelectItem>
                    <SelectItem value="14">14 hari</SelectItem>
                    <SelectItem value="30">30 hari</SelectItem>
                    <SelectItem value="60">60 hari</SelectItem>
                    <SelectItem value="90">90 hari</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Backup lebih lama dari ini akan dihapus otomatis
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Catatan:</strong> Backup otomatis memerlukan cron job atau scheduled task di
                    server. Hubungi administrator sistem untuk setup.
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Backup terakhir: {config?.lastBackup ? new Date(config.lastBackup).toLocaleString("id-ID") : "Belum ada"}
          </p>
          <Button onClick={handleSaveSchedule} size="sm" className="w-full sm:w-auto">
            Simpan Jadwal Backup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
