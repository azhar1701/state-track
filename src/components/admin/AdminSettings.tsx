import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, RefreshCcw, DownloadCloud, UploadCloud, ShieldAlert, Users, Settings, Database as DatabaseIcon, Bell, Lock, UserCog, Activity, Mail, FileText, Tags, Wrench, Plug } from "lucide-react";
import { EmailSettings } from "@/components/admin/settings/EmailSettings";
import { ReportSettings } from "@/components/admin/settings/ReportSettings";
import { SystemSettings } from "@/components/admin/settings/SystemSettings";
import { APISettings } from "@/components/admin/settings/APISettings";
import { CategorySettings } from "@/components/admin/settings/CategorySettings";

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
  enableClustering: boolean;
  clusterRadius: number;
  enableHeatmap: boolean;
  heatmapRadius: number;
  maxZoom: number;
  minZoom: number;
  enableGeolocation: boolean;
  defaultOpacity: number;
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
  const { fetchSetting, saveSetting } = useSystemSettings();
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
    enableClustering: true,
    clusterRadius: 80,
    enableHeatmap: false,
    heatmapRadius: 25,
    maxZoom: 18,
    minZoom: 8,
    enableGeolocation: true,
    defaultOpacity: 0.8,
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
      
      console.log('[AdminSettings] Profiles loaded:', profiles?.length, profiles);
      if (profilesError) {
        console.error('[AdminSettings] Profiles error:', profilesError);
        throw profilesError;
      }

      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id,role");
      console.log('[AdminSettings] Roles loaded:', roles?.length, roles);
      if (rolesError) {
        console.error('[AdminSettings] Roles error:', rolesError);
        throw rolesError;
      }

      const adminIds = new Set((roles ?? []).filter((role) => role.role === "admin").map((role) => role.user_id));
      const list: UserManagementRow[] = (profiles ?? []).map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        role: adminIds.has(profile.id) ? "admin" : "user",
      }));
      console.log('[AdminSettings] Final user list:', list);
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
    const loadFromLocalStorage = () => {
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
    };
    loadFromLocalStorage();
  }, [canUseBrowserStorage]);

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
      if (mapPreferences.clusterRadius < 20 || mapPreferences.clusterRadius > 200) {
        toast.error("Radius cluster harus antara 20-200 pixel");
        return;
      }
      if (mapPreferences.heatmapRadius < 10 || mapPreferences.heatmapRadius > 100) {
        toast.error("Radius heatmap harus antara 10-100 pixel");
        return;
      }
      if (mapPreferences.defaultOpacity < 0 || mapPreferences.defaultOpacity > 1) {
        toast.error("Opacity harus antara 0-1");
        return;
      }
      await saveSetting('map', 'preferences', mapPreferences);
      if (canUseBrowserStorage) localStorage.setItem(MAP_PREFS_STORAGE_KEY, JSON.stringify(mapPreferences));
    } catch (error) {
      console.error("Failed to save map preferences", error);
    } finally {
      setMapPrefSaving(false);
    }
  };

  const saveGeoLayerSettings = async () => {
    setGeoLayerSaving(true);
    try {
      if (geoLayerSettings.maxUploadSizeMb <= 0) {
        toast.error("Batas unggah harus lebih dari 0 MB");
        return;
      }
      await saveSetting('geo', 'layer_settings', geoLayerSettings);
      if (canUseBrowserStorage) localStorage.setItem(GEO_LAYER_STORAGE_KEY, JSON.stringify(geoLayerSettings));
    } catch (error) {
      console.error("Failed to save geo layer settings", error);
    } finally {
      setGeoLayerSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setNotificationSaving(true);
    try {
      await saveSetting('notification', 'preferences', notificationSettings);
      if (canUseBrowserStorage) localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationSettings));
    } catch (error) {
      console.error("Failed to save notification settings", error);
    } finally {
      setNotificationSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    setSecuritySaving(true);
    try {
      if (securitySettings.sessionTimeoutMinutes < 5) {
        toast.error("Durasi sesi minimal 5 menit");
        return;
      }
      await saveSetting('security', 'preferences', securitySettings);
      if (canUseBrowserStorage) localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(securitySettings));
    } catch (error) {
      console.error("Failed to save security settings", error);
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
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Pengaturan Sistem</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola konfigurasi aplikasi dan preferensi admin</p>
        </div>
        <Badge variant="outline" className="gap-1.5 w-fit">
          <Activity className="h-3 w-3" />
          Admin Panel
        </Badge>
      </div>

      <Tabs defaultValue="map" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <TabsList className="inline-flex w-auto min-w-full gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Peta</span>
          </TabsTrigger>
          <TabsTrigger value="geo" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <DatabaseIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">GeoLayer</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Laporan</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Kategori</span>
          </TabsTrigger>
          <TabsTrigger value="notification" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Keamanan</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <DownloadCloud className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Pengguna</span>
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="map" className="mt-6 space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Settings className="h-5 w-5 text-primary" />
            Preferensi Peta
          </CardTitle>
          <CardDescription>Atur tampilan default peta dan layer geografis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Latitude pusat</label>
              <Input
                className="h-9"
                value={mapPreferences.centerLat}
                onChange={(event) => setMapPreferences((prev) => ({ ...prev, centerLat: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Longitude pusat</label>
              <Input
                className="h-9"
                value={mapPreferences.centerLng}
                onChange={(event) => setMapPreferences((prev) => ({ ...prev, centerLng: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Level Zoom awal</label>
              <Input
                className="h-9"
                value={mapPreferences.zoom}
                onChange={(event) => setMapPreferences((prev) => ({ ...prev, zoom: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basemap</label>
              <Select
                value={mapPreferences.basemap}
                onValueChange={(value) => setMapPreferences((prev) => ({ ...prev, basemap: value as MapPreferences["basemap"] }))}
              >
                <SelectTrigger className="h-9">
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

          <div className="bg-muted/30 rounded-lg p-3 border">
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Tampilkan batas administrasi</div>
                <p className="text-xs text-muted-foreground mt-0.5">Aktifkan layer batas wilayah saat peta dibuka.</p>
              </div>
              <Switch
                checked={mapPreferences.showAdminBoundaries}
                onCheckedChange={(checked) => setMapPreferences((prev) => ({ ...prev, showAdminBoundaries: checked }))}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Pengaturan Marker & Layer</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Clustering marker</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Kelompokkan marker yang berdekatan.</p>
                  </div>
                  <Switch
                    checked={mapPreferences.enableClustering}
                    onCheckedChange={(checked) => setMapPreferences((prev) => ({ ...prev, enableClustering: checked }))}
                  />
                </label>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 border">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Heatmap</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Tampilkan peta panas untuk densitas laporan.</p>
                  </div>
                  <Switch
                    checked={mapPreferences.enableHeatmap}
                    onCheckedChange={(checked) => setMapPreferences((prev) => ({ ...prev, enableHeatmap: checked }))}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Radius cluster (px)</label>
                <Input
                  className="h-9"
                  type="number"
                  min="20"
                  max="200"
                  value={mapPreferences.clusterRadius}
                  onChange={(e) => setMapPreferences((prev) => ({ ...prev, clusterRadius: Number(e.target.value) }))}
                  disabled={!mapPreferences.enableClustering}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Radius heatmap (px)</label>
                <Input
                  className="h-9"
                  type="number"
                  min="10"
                  max="100"
                  value={mapPreferences.heatmapRadius}
                  onChange={(e) => setMapPreferences((prev) => ({ ...prev, heatmapRadius: Number(e.target.value) }))}
                  disabled={!mapPreferences.enableHeatmap}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Batas Zoom & Tampilan</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Zoom minimal</label>
                <Input
                  className="h-9"
                  type="number"
                  min="1"
                  max="18"
                  value={mapPreferences.minZoom}
                  onChange={(e) => setMapPreferences((prev) => ({ ...prev, minZoom: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Zoom maksimal</label>
                <Input
                  className="h-9"
                  type="number"
                  min="10"
                  max="22"
                  value={mapPreferences.maxZoom}
                  onChange={(e) => setMapPreferences((prev) => ({ ...prev, maxZoom: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opacity layer (0-1)</label>
                <Input
                  className="h-9"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={mapPreferences.defaultOpacity}
                  onChange={(e) => setMapPreferences((prev) => ({ ...prev, defaultOpacity: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 border">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Geolocation otomatis</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Deteksi lokasi pengguna saat membuka peta.</p>
                </div>
                <Switch
                  checked={mapPreferences.enableGeolocation}
                  onCheckedChange={(checked) => setMapPreferences((prev) => ({ ...prev, enableGeolocation: checked }))}
                />
              </label>
            </div>
          </div>

          <Separator />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Perubahan akan diterapkan pada sesi berikutnya</p>
            <Button onClick={saveMapPreferences} disabled={mapPrefSaving} size="sm" className="w-full sm:w-auto">
              {mapPrefSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Preferensi
            </Button>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="geo" className="mt-6 space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <DatabaseIcon className="h-5 w-5 text-blue-500" />
            Pengaturan GeoLayer
          </CardTitle>
          <CardDescription>Kelola validasi dan publikasi layer geografis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 border">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Wajibkan CRS EPSG:4326</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Pastikan data yang diunggah sesuai koordinat standar.</p>
                </div>
                <Switch
                  checked={geoLayerSettings.enforceCRS}
                  onCheckedChange={(checked) => setGeoLayerSettings((prev) => ({ ...prev, enforceCRS: checked }))}
                />
              </label>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Publikasikan otomatis ke peta</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Setiap layer baru langsung tersedia di MapView.</p>
                </div>
                <Switch
                  checked={geoLayerSettings.autoPublishToMap}
                  onCheckedChange={(checked) => setGeoLayerSettings((prev) => ({ ...prev, autoPublishToMap: checked }))}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CRS default</label>
              <Input
                className="h-9"
                value={geoLayerSettings.defaultCRS}
                onChange={(event) => setGeoLayerSettings((prev) => ({ ...prev, defaultCRS: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Batas ukuran unggah (MB)</label>
              <Input
                className="h-9"
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

          <div className="bg-muted/30 rounded-lg p-3 border">
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Wajibkan metadata layer</div>
                <p className="text-xs text-muted-foreground mt-0.5">Pastikan informasi deskriptif terisi saat impor.</p>
              </div>
              <Switch
                checked={geoLayerSettings.requireMetadata}
                onCheckedChange={(checked) => setGeoLayerSettings((prev) => ({ ...prev, requireMetadata: checked }))}
              />
            </label>
          </div>

          <Separator />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Validasi akan diterapkan pada unggahan berikutnya</p>
            <Button onClick={saveGeoLayerSettings} disabled={geoLayerSaving} size="sm" className="w-full sm:w-auto">
              {geoLayerSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="reports" className="mt-6 space-y-4">
        <ReportSettings />
      </TabsContent>

      <TabsContent value="categories" className="mt-6 space-y-4">
        <CategorySettings />
      </TabsContent>

      <TabsContent value="notification" className="mt-6 space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Bell className="h-5 w-5 text-amber-500" />
            Notifikasi
          </CardTitle>
          <CardDescription>Atur preferensi pemberitahuan sistem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 border">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Email</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Kirim pemberitahuan via email untuk laporan penting.</p>
                </div>
                <Switch
                  checked={notificationSettings.email}
                  onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, email: checked }))}
                />
              </label>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Push</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Tampilkan notifikasi push pada dashboard.</p>
                </div>
                <Switch
                  checked={notificationSettings.push}
                  onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, push: checked }))}
                />
              </label>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Ringkasan harian</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Terima rekap aktivitas setiap pagi.</p>
                </div>
                <Switch
                  checked={notificationSettings.dailyDigest}
                  onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, dailyDigest: checked }))}
                />
              </label>
            </div>
          </div>

          <Separator />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Notifikasi akan aktif sesuai preferensi</p>
            <Button onClick={saveNotificationSettings} disabled={notificationSaving} size="sm" className="w-full sm:w-auto">
              {notificationSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Activity className="h-5 w-5 text-primary" />
            Audit Log
          </CardTitle>
          <CardDescription>Riwayat aktivitas sistem terbaru</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="bg-muted/30 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Audit Terbaru</div>
            </div>
            {auditLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat catatan audit...
              </div>
            ) : sortedAuditLogs.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Tidak ada catatan audit.</div>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-auto pr-2 text-xs">
                {sortedAuditLogs.map((log) => (
                  <li key={log.id} className="bg-background rounded p-2 border">
                    <div className="text-muted-foreground mb-1">
                      {formatDateTime(log.created_at)} · {log.actor_email || "-"}
                    </div>
                    <div className="font-medium">{log.action} · {log.report_id}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      </TabsContent>

      <TabsContent value="security" className="mt-6 space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Lock className="h-5 w-5 text-red-500" />
            Keamanan
          </CardTitle>
          <CardDescription>Konfigurasi pengaturan keamanan dan akses sistem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="bg-muted/30 rounded-lg p-3 border">
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Wajibkan MFA</div>
                <p className="text-xs text-muted-foreground mt-0.5">Minta administrator menyalakan multi-factor authentication.</p>
              </div>
              <Switch
                checked={securitySettings.requireMFA}
                onCheckedChange={(checked) => setSecuritySettings((prev) => ({ ...prev, requireMFA: checked }))}
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Durasi sesi (menit)</label>
            <Input
              className="h-9"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Daftar IP yang diizinkan</label>
            <Textarea
              className="text-sm"
              placeholder="Pisahkan dengan koma, contoh: 192.168.0.1, 10.0.0.2"
              value={securitySettings.ipAllowlist}
              onChange={(event) => setSecuritySettings((prev) => ({ ...prev, ipAllowlist: event.target.value }))}
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border-2 border-destructive/40 bg-destructive/10 p-3 text-xs">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span className="text-destructive">
              Pastikan perubahan keamanan dikomunikasikan ke seluruh administrator agar tidak mengganggu operasional.
            </span>
          </div>

          <Separator />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Perubahan keamanan memerlukan restart sesi</p>
            <Button onClick={saveSecuritySettings} disabled={securitySaving} size="sm" className="w-full sm:w-auto">
              {securitySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="backup" className="mt-6 space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <DownloadCloud className="h-5 w-5 text-green-500" />
            Backup &amp; Restore
          </CardTitle>
          <CardDescription>Kelola cadangan dan pemulihan data geo layer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              Buat salinan data geo layer untuk cadangan, atau pulihkan dari file JSON yang telah diekspor sebelumnya.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={handleBackupGeoLayers} disabled={backupInProgress} variant="outline" size="sm" className="h-auto py-3">
              {backupInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
              <div className="text-left">
                <div className="font-semibold">Backup GeoLayer</div>
                <div className="text-xs text-muted-foreground font-normal">Unduh semua layer ke file JSON</div>
              </div>
            </Button>
            <Button onClick={handleTriggerRestore} disabled={restoreInProgress} variant="outline" size="sm" className="h-auto py-3">
              {restoreInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              <div className="text-left">
                <div className="font-semibold">Restore dari File</div>
                <div className="text-xs text-muted-foreground font-normal">Pulihkan layer dari backup</div>
              </div>
            </Button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleRestoreFileChange}
            />
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-900 dark:text-amber-100">
              ⚠️ Saat restore, data layer dengan key yang sama akan digantikan.
            </p>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="users" className="mt-6 space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5 text-primary" />
            Manajemen Pengguna
          </CardTitle>
          <CardDescription>Kelola role dan akses pengguna sistem</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{users.length} Pengguna</Badge>
              <Badge variant="outline">{users.filter(u => u.role === 'admin').length} Admin</Badge>
            </div>
            <Button onClick={loadUsers} disabled={usersLoading} size="sm" variant="outline">
              {usersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
              <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nama</TableHead>
                    <TableHead className="min-w-[120px]">Kontak</TableHead>
                    <TableHead className="min-w-[140px]">Terdaftar</TableHead>
                    <TableHead className="min-w-[80px]">Role</TableHead>
                    <TableHead className="text-right min-w-[120px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                          {u.full_name || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.phone || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(u.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleRoleChange(u.id, value as 'admin' | 'user')}
                          disabled={userRoleUpdating === u.id}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
