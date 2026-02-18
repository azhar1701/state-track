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
import { GeoLayerSettings } from "@/components/admin/settings/GeoLayerSettings";
import { NotificationSettings } from "@/components/admin/settings/NotificationSettings";
import { SecuritySettings } from "@/components/admin/settings/SecuritySettings";
import { BackupSettings } from "@/components/admin/settings/BackupSettings";
import { UserManagementSettings } from "@/components/admin/settings/UserManagementSettings";

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

type ReportLogEntry = Database["public"]["Tables"]["report_logs"]["Row"];

const MAP_PREFS_STORAGE_KEY = "admin:mapPreferences";

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

  const [auditLogs, setAuditLogs] = useState<ReportLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const canUseBrowserStorage = typeof window !== "undefined" && !!window.localStorage;

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
    void loadAuditLogs();
  }, [isAdmin, user, loadAuditLogs]);

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
    };
    loadFromLocalStorage();
  }, [canUseBrowserStorage]);



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
        <TabsList className="flex w-full gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="map" className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Peta & Layer</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Laporan</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Kategori</span>
          </TabsTrigger>
          <TabsTrigger value="notification" className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Keamanan</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <DownloadCloud className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm whitespace-nowrap px-3 py-2">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Pengguna</span>
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="map" className="mt-6 space-y-4">
          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="display">Tampilan Peta</TabsTrigger>
              <TabsTrigger value="layers">Pengaturan Layer</TabsTrigger>
            </TabsList>

            <TabsContent value="display" className="space-y-4">
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

            <TabsContent value="layers" className="space-y-4">
              <GeoLayerSettings />
            </TabsContent>
          </Tabs>
      </TabsContent>

      <TabsContent value="reports" className="mt-6 space-y-4">
        <ReportSettings />
      </TabsContent>

      <TabsContent value="categories" className="mt-6 space-y-4">
        <CategorySettings />
      </TabsContent>

      <TabsContent value="notification" className="mt-6 space-y-4">
        <NotificationSettings />
      </TabsContent>

      <TabsContent value="security" className="mt-6 space-y-4">
        <SecuritySettings />
      </TabsContent>

      <TabsContent value="backup" className="mt-6 space-y-4">
        <BackupSettings />
      </TabsContent>

      <TabsContent value="users" className="mt-6 space-y-4">
        <UserManagementSettings />
      </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
