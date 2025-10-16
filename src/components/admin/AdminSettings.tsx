import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, RefreshCcw, DownloadCloud, UploadCloud, ShieldAlert } from "lucide-react";

type UserManagementRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  role: "admin" | "user";
};

type MapPreferences = {
  centerLat: string;
  centerLng: string;
  zoom: string;
  basemap: "osm" | "satellite" | "terrain" | "dark";
  showAdminBoundaries: boolean;
  showAssets: boolean;
};

type GeoLayerSettings = {
  enforceCRS: boolean;
  defaultCRS: string;
  autoPublishToMap: boolean;
  maxUploadSizeMb: number;
  requireMetadata: boolean;
};

type NotificationSettings = {
  email: boolean;
  push: boolean;
  dailyDigest: boolean;
};

type SecuritySettings = {
  requireMFA: boolean;
  sessionTimeoutMinutes: number;
  ipAllowlist: string;
};

type ReportLogEntry = Database["public"]["Tables"]["report_logs"]["Row"];

const MAP_PREFS_STORAGE_KEY = "admin:mapPreferences";
const GEO_LAYER_STORAGE_KEY = "admin:geoLayerSettings";
const NOTIFICATION_STORAGE_KEY = "admin:notificationSettings";
const SECURITY_STORAGE_KEY = "admin:securitySettings";

const basemapOptions: Array<{ value: MapPreferences["basemap"]; label: string }> = [
  { value: "osm", label: "OpenStreetMap" },
  { value: "satellite", label: "Satelit" },
  { value: "terrain", label: "Terrain" },
  { value: "dark", label: "Dark Mode" },
];

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID");
  } catch {
    return "-";
  }
};

const AdminSettings = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserManagementRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleUpdating, setUserRoleUpdating] = useState<string | null>(null);

  const [mapPreferences, setMapPreferences] = useState<MapPreferences>({
    centerLat: "-7.325",
    centerLng: "108.353",
    zoom: "12",
    basemap: "osm",
    showAdminBoundaries: true,
    showAssets: true,
  });
  const [mapPrefSaving, setMapPrefSaving] = useState(false);

  const [geoLayerSettings, setGeoLayerSettings] = useState<GeoLayerSettings>({
    enforceCRS: true,
    defaultCRS: "EPSG:4326",
    autoPublishToMap: true,
    maxUploadSizeMb: 50,
    requireMetadata: true,
  });
  const [geoLayerSaving, setGeoLayerSaving] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: true,
    push: false,
    dailyDigest: true,
  });
  const [notificationSaving, setNotificationSaving] = useState(false);

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    requireMFA: false,
    sessionTimeoutMinutes: 30,
    ipAllowlist: "",
  });
  const [securitySaving, setSecuritySaving] = useState(false);

  const [auditLogs, setAuditLogs] = useState<ReportLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const canUseBrowserStorage = typeof window !== "undefined" && !!window.localStorage;

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,full_name,phone,created_at")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id,role");
      if (rolesError) throw rolesError;

      const adminIds = new Set((roles ?? []).filter((role) => role.role === "admin").map((role) => role.user_id));
      const list: UserManagementRow[] = (profiles ?? []).map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        role: adminIds.has(profile.id) ? "admin" : "user",
      }));
      setUsers(list);
    } catch (error) {
      console.error("Failed to load users", error);
      const message =
        error && typeof error === "object" && "message" in error && typeof (error as { message?: string }).message === "string"
          ? (error as { message: string }).message
          : null;
      if (message && /access denied|permission denied/i.test(message)) {
        toast.error("Akses ditolak. Pastikan akun Anda memiliki role admin di tabel user_roles.");
      } else {
        toast.error("Gagal memuat pengguna");
      }
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin]);

  const loadAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from("report_logs")
        .select("id,report_id,action,actor_email,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setAuditLogs(data ?? []);
    } catch (error) {
      console.error("Failed to load audit logs", error);
      toast.error("Gagal memuat catatan audit");
    } finally {
      setAuditLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    void loadUsers();
    void loadAuditLogs();
  }, [isAdmin, user, loadAuditLogs, loadUsers]);

  useEffect(() => {
    if (!canUseBrowserStorage) return;
    try {
      const storedMap = localStorage.getItem(MAP_PREFS_STORAGE_KEY);
      if (storedMap) {
        const parsed = JSON.parse(storedMap) as Partial<MapPreferences>;
        setMapPreferences((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn("Failed to load map preferences", error);
    }
    try {
      const storedLayers = localStorage.getItem(GEO_LAYER_STORAGE_KEY);
      if (storedLayers) {
        const parsed = JSON.parse(storedLayers) as Partial<GeoLayerSettings>;
        setGeoLayerSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn("Failed to load geo layer settings", error);
    }
    try {
      const storedNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications) as Partial<NotificationSettings>;
        setNotificationSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn("Failed to load notification settings", error);
    }
    try {
      const storedSecurity = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (storedSecurity) {
        const parsed = JSON.parse(storedSecurity) as Partial<SecuritySettings>;
        setSecuritySettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn("Failed to load security settings", error);
    }
  }, [canUseBrowserStorage]);

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    if (!isAdmin) return;
    setUserRoleUpdating(userId);
    try {
      if (newRole === "admin") {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
      toast.success("Role pengguna diperbarui");
      void loadUsers();
    } catch (error) {
      console.error("Failed to update user role", error);
      toast.error("Gagal memperbarui role pengguna");
    } finally {
      setUserRoleUpdating(null);
    }
  };

  const saveMapPreferences = async () => {
    if (!canUseBrowserStorage) {
      toast.error("Penyimpanan browser tidak tersedia");
      return;
    }
    setMapPrefSaving(true);
    try {
      const lat = Number(mapPreferences.centerLat);
      const lng = Number(mapPreferences.centerLng);
      const zoom = Number(mapPreferences.zoom);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        toast.error("Koordinat pusat tidak valid");
        return;
      }
      if (Number.isNaN(zoom) || zoom < 1 || zoom > 22) {
        toast.error("Nilai zoom harus antara 1 sampai 22");
        return;
      }
      localStorage.setItem(MAP_PREFS_STORAGE_KEY, JSON.stringify(mapPreferences));
      toast.success("Preferensi peta disimpan");
    } catch (error) {
      console.error("Failed to save map preferences", error);
      toast.error("Gagal menyimpan preferensi peta");
    } finally {
      setMapPrefSaving(false);
    }
  };

  const saveGeoLayerSettings = async () => {
    if (!canUseBrowserStorage) {
      toast.error("Penyimpanan browser tidak tersedia");
      return;
    }
    setGeoLayerSaving(true);
    try {
      if (geoLayerSettings.maxUploadSizeMb <= 0) {
        toast.error("Batas unggah harus lebih dari 0 MB");
        return;
      }
      localStorage.setItem(GEO_LAYER_STORAGE_KEY, JSON.stringify(geoLayerSettings));
      toast.success("Pengaturan geo layer disimpan");
    } catch (error) {
      console.error("Failed to save geo layer settings", error);
      toast.error("Gagal menyimpan pengaturan geo layer");
    } finally {
      setGeoLayerSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    if (!canUseBrowserStorage) {
      toast.error("Penyimpanan browser tidak tersedia");
      return;
    }
    setNotificationSaving(true);
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationSettings));
      toast.success("Pengaturan notifikasi disimpan");
    } catch (error) {
      console.error("Failed to save notification settings", error);
      toast.error("Gagal menyimpan pengaturan notifikasi");
    } finally {
      setNotificationSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    if (!canUseBrowserStorage) {
      toast.error("Penyimpanan browser tidak tersedia");
      return;
    }
    setSecuritySaving(true);
    try {
      if (securitySettings.sessionTimeoutMinutes < 5) {
        toast.error("Durasi sesi minimal 5 menit");
        return;
      }
      localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(securitySettings));
      toast.success("Pengaturan keamanan disimpan");
    } catch (error) {
      console.error("Failed to save security settings", error);
      toast.error("Gagal menyimpan pengaturan keamanan");
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleBackupGeoLayers = async () => {
    if (!isAdmin) return;
    setBackupInProgress(true);
    try {
      const { data, error } = await supabase
        .from("geo_layers")
        .select("key,name,geometry_type,data,created_at");
      if (error) throw error;
      const payload = {
        exported_at: new Date().toISOString(),
        layers: (data ?? []).map((layer) => ({
          key: layer.key,
          name: layer.name,
          geometry_type: layer.geometry_type,
          data: layer.data,
          created_at: layer.created_at,
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `geo-layers-backup-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Backup geo layer berhasil dibuat");
    } catch (error) {
      console.error("Failed to backup geo layers", error);
      toast.error("Gagal membuat backup geo layer");
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleTriggerRestore = () => {
    if (restoreInProgress) return;
    restoreInputRef.current?.click();
  };

  const handleRestoreFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRestoreInProgress(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { layers?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
      const layersArray = Array.isArray(parsed) ? parsed : parsed.layers;
      if (!Array.isArray(layersArray)) throw new Error("Format file backup tidak valid");
      const sanitized = layersArray
        .map((layer) => {
          const item = layer as { key?: string; name?: string; geometry_type?: string | null; data?: unknown };
          if (!item.key || !item.name) return null;
          return {
            key: item.key,
            name: item.name,
            geometry_type: item.geometry_type ?? null,
            data: item.data ?? null,
          };
        })
        .filter(Boolean) as Array<{ key: string; name: string; geometry_type: string | null; data: unknown }>;
      if (sanitized.length === 0) throw new Error("Tidak ada layer yang valid untuk dipulihkan");
      const chunkSize = 20;
      for (let i = 0; i < sanitized.length; i += chunkSize) {
        const slice = sanitized.slice(i, i + chunkSize);
        const { error } = await supabase.from("geo_layers").upsert(slice, { onConflict: "key" });
        if (error) throw error;
      }
      toast.success("Pemulihan geo layer selesai");
    } catch (error) {
      console.error("Failed to restore geo layers", error);
      const description = error instanceof Error ? error.message : undefined;
      toast.error("Gagal memulihkan geo layer", { description });
    } finally {
      setRestoreInProgress(false);
      if (event.target) event.target.value = "";
    }
  };

  const sortedAuditLogs = useMemo(
    () =>
      auditLogs
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [auditLogs],
  );

  if (!user || !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Sistem</CardTitle>
        </CardHeader>
        <CardContent>Anda tidak memiliki hak untuk mengakses pengaturan ini.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User management hidden */}
      {/* ...existing code... */}

      <Card>
        <CardHeader>
          <CardTitle>Preferensi Peta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Latitude pusat</label>
              <Input
                value={mapPreferences.centerLat}
                onChange={(event) => setMapPreferences((prev) => ({ ...prev, centerLat: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Longitude pusat</label>
              <Input
                value={mapPreferences.centerLng}
                onChange={(event) => setMapPreferences((prev) => ({ ...prev, centerLng: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Level Zoom awal</label>
              <Input
                value={mapPreferences.zoom}
                onChange={(event) => setMapPreferences((prev) => ({ ...prev, zoom: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Basemap</label>
              <Select
                value={mapPreferences.basemap}
                onValueChange={(value) => setMapPreferences((prev) => ({ ...prev, basemap: value as MapPreferences["basemap"] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih basemap" />
                </SelectTrigger>
                <SelectContent>
                  {basemapOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Tampilkan batas administrasi</div>
                <p className="text-sm text-muted-foreground">Aktifkan layer batas wilayah saat peta dibuka.</p>
              </div>
              <Switch
                checked={mapPreferences.showAdminBoundaries}
                onCheckedChange={(checked) => setMapPreferences((prev) => ({ ...prev, showAdminBoundaries: checked }))}
              />
            </label>
          </div>

          <Button onClick={saveMapPreferences} disabled={mapPrefSaving}>
            {mapPrefSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Preferensi
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan GeoLayer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Wajibkan CRS EPSG:4326</div>
                <p className="text-sm text-muted-foreground">Pastikan data yang diunggah sesuai koordinat standar.</p>
              </div>
              <Switch
                checked={geoLayerSettings.enforceCRS}
                onCheckedChange={(checked) => setGeoLayerSettings((prev) => ({ ...prev, enforceCRS: checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Publikasikan otomatis ke peta</div>
                <p className="text-sm text-muted-foreground">Setiap layer baru langsung tersedia di MapView.</p>
              </div>
              <Switch
                checked={geoLayerSettings.autoPublishToMap}
                onCheckedChange={(checked) => setGeoLayerSettings((prev) => ({ ...prev, autoPublishToMap: checked }))}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">CRS default</label>
              <Input
                value={geoLayerSettings.defaultCRS}
                onChange={(event) => setGeoLayerSettings((prev) => ({ ...prev, defaultCRS: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Batas ukuran unggah (MB)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={geoLayerSettings.maxUploadSizeMb}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setGeoLayerSettings((prev) => ({
                    ...prev,
                    maxUploadSizeMb: Number.isNaN(value) ? prev.maxUploadSizeMb : value,
                  }));
                }}
              />
            </div>
          </div>

          <label className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">Wajibkan metadata layer</div>
              <p className="text-sm text-muted-foreground">Pastikan informasi deskriptif terisi saat impor.</p>
            </div>
            <Switch
              checked={geoLayerSettings.requireMetadata}
              onCheckedChange={(checked) => setGeoLayerSettings((prev) => ({ ...prev, requireMetadata: checked }))}
            />
          </label>

          <Button onClick={saveGeoLayerSettings} disabled={geoLayerSaving}>
            {geoLayerSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengaturan GeoLayer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifikasi &amp; Audit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Email</div>
                <p className="text-sm text-muted-foreground">Kirim pemberitahuan via email untuk laporan penting.</p>
              </div>
              <Switch
                checked={notificationSettings.email}
                onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, email: checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Push</div>
                <p className="text-sm text-muted-foreground">Tampilkan notifikasi push pada dashboard.</p>
              </div>
              <Switch
                checked={notificationSettings.push}
                onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, push: checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Ringkasan harian</div>
                <p className="text-sm text-muted-foreground">Terima rekap aktivitas setiap pagi.</p>
              </div>
              <Switch
                checked={notificationSettings.dailyDigest}
                onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, dailyDigest: checked }))}
              />
            </label>
          </div>

          <Button onClick={saveNotificationSettings} disabled={notificationSaving}>
            {notificationSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengaturan Notifikasi
          </Button>

          <div className="rounded border p-4">
            <div className="mb-2 font-medium">Audit Terbaru</div>
            {auditLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat catatan audit...
              </div>
            ) : sortedAuditLogs.length === 0 ? (
              <div className="text-sm text-muted-foreground">Tidak ada catatan audit.</div>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-auto pr-2 text-sm">
                {sortedAuditLogs.map((log) => (
                  <li key={log.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                    <div className="text-muted-foreground">
                      {formatDateTime(log.created_at)} · {log.actor_email || "-"}
                    </div>
                    <div>{log.action} · {log.report_id}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup &amp; Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Buat salinan data geo layer untuk cadangan, atau pulihkan dari file JSON yang telah diekspor sebelumnya.
          </p>
          <div className="flex flex-col gap-3 md:flex-row">
            <Button onClick={handleBackupGeoLayers} disabled={backupInProgress} className="md:w-auto">
              {backupInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
              Backup GeoLayer
            </Button>
            <Button onClick={handleTriggerRestore} disabled={restoreInProgress} variant="outline" className="md:w-auto">
              {restoreInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Restore dari File
            </Button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleRestoreFileChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Saat restore, data layer dengan key yang sama akan digantikan.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keamanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">Wajibkan MFA</div>
              <p className="text-sm text-muted-foreground">Minta administrator menyalakan multi-factor authentication.</p>
            </div>
            <Switch
              checked={securitySettings.requireMFA}
              onCheckedChange={(checked) => setSecuritySettings((prev) => ({ ...prev, requireMFA: checked }))}
            />
          </label>

          <div>
            <label className="text-sm font-medium">Durasi sesi (menit)</label>
            <Input
              type="number"
              inputMode="numeric"
              value={securitySettings.sessionTimeoutMinutes}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSecuritySettings((prev) => ({
                  ...prev,
                  sessionTimeoutMinutes: Number.isNaN(value) ? prev.sessionTimeoutMinutes : value,
                }));
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Daftar IP yang diizinkan</label>
            <Textarea
              placeholder="Pisahkan dengan koma, contoh: 192.168.0.1, 10.0.0.2"
              value={securitySettings.ipAllowlist}
              onChange={(event) => setSecuritySettings((prev) => ({ ...prev, ipAllowlist: event.target.value }))}
            />
          </div>

          <div className="flex items-start gap-3 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
            Pastikan perubahan keamanan dikomunikasikan ke seluruh administrator agar tidak mengganggu operasional.
          </div>

          <Button onClick={saveSecuritySettings} disabled={securitySaving}>
            {securitySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengaturan Keamanan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
