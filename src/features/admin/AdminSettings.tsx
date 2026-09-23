import { logger } from "@/lib/logger";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { useSystemSettings } from "@/features/admin/useSystemSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Loader2,
  DownloadCloud,
  Settings,
  Bell,
  Lock,
  Activity,
  FileText,
  Tags,
  Users,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { CategorySettings } from "@/features/admin/settings/CategorySettings";
import { ReportSettings } from "@/features/admin/settings/ReportSettings";
import { GeoLayerSettings } from "@/features/admin/settings/GeoLayerSettings";
import { NotificationSettings } from "@/features/admin/settings/NotificationSettings";
import { SecuritySettings } from "@/features/admin/settings/SecuritySettings";
import { BackupSettings } from "@/features/admin/settings/BackupSettings";
import { UserManagementSettings } from "@/features/admin/settings/UserManagementSettings";

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

const MAP_PREFS_STORAGE_KEY = "admin:mapPreferences";

const defaultMapPrefs: MapPreferences = {
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
};

const basemapOptions: Array<{ value: MapPreferences["basemap"]; label: string }> = [
  { value: "osm", label: "OpenStreetMap" },
  { value: "satellite", label: "Satelit" },
  { value: "terrain", label: "Terrain" },
  { value: "dark", label: "Dark Mode" },
];

const AdminSettings = () => {
  const { user, isAdmin } = useAuth();
  const { fetchSetting, saveSetting } = useSystemSettings();

  const [mapPreferences, setMapPreferences] = useState<MapPreferences>(defaultMapPrefs);
  const [initialPrefs, setInitialPrefs] = useState<MapPreferences>(defaultMapPrefs);
  const [loadingMapPrefs, setLoadingMapPrefs] = useState(true);
  const [mapPrefSaving, setMapPrefSaving] = useState(false);

  const canUseBrowserStorage = typeof window !== "undefined" && !!window.localStorage;

  // Load from Supabase system_settings with localStorage fallback
  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      try {
        setLoadingMapPrefs(true);
        // 1. Fetch from cloud database
        const remotePrefs = await fetchSetting<MapPreferences>('map', 'preferences');
        if (!isMounted) return;

        if (remotePrefs && typeof remotePrefs === "object") {
          const merged = { ...defaultMapPrefs, ...remotePrefs };
          setMapPreferences(merged);
          setInitialPrefs(merged);
          if (canUseBrowserStorage) {
            localStorage.setItem(MAP_PREFS_STORAGE_KEY, JSON.stringify(merged));
          }
          return;
        }

        // 2. Fallback to localStorage
        if (canUseBrowserStorage) {
          const stored = localStorage.getItem(MAP_PREFS_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as Partial<MapPreferences>;
            const merged = { ...defaultMapPrefs, ...parsed };
            setMapPreferences(merged);
            setInitialPrefs(merged);
            return;
          }
        }
      } catch (error) {
        logger.warn("Failed to load map preferences", error);
      } finally {
        if (isMounted) setLoadingMapPrefs(false);
      }
    };

    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, [canUseBrowserStorage, fetchSetting]);

  const isMapDirty = useMemo(() => {
    return JSON.stringify(mapPreferences) !== JSON.stringify(initialPrefs);
  }, [mapPreferences, initialPrefs]);

  const handleResetMapPreferences = useCallback(() => {
    setMapPreferences(initialPrefs);
    toast.info("Perubahan preferensi peta di-reset");
  }, [initialPrefs]);

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

      // Save quietly via hook to prevent dual toast
      await saveSetting('map', 'preferences', mapPreferences, { silent: true });
      if (canUseBrowserStorage) {
        localStorage.setItem(MAP_PREFS_STORAGE_KEY, JSON.stringify(mapPreferences));
      }
      setInitialPrefs(mapPreferences);
      toast.success("Preferensi peta berhasil disimpan");
    } catch (error) {
      logger.error("Failed to save map preferences", error);
      toast.error("Gagal menyimpan preferensi");
    } finally {
      setMapPrefSaving(false);
    }
  };

  if (!user || !isAdmin) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Pengaturan Sistem</CardTitle>
        </CardHeader>
        <CardContent>Anda tidak memiliki hak untuk mengakses pengaturan ini.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Pengaturan Sistem</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kelola konfigurasi aplikasi, preferensi geospatial, dan keamanan secara terpusat
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 w-fit border-primary/30 text-primary">
          <Activity className="h-3 w-3" />
          Admin Panel
        </Badge>
      </div>

      <Tabs defaultValue="map" className="w-full">
        <div className="overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex sm:flex w-auto sm:w-full min-w-max gap-1 h-auto p-1.5 bg-card/80 backdrop-blur-md border border-border/60 shadow-sm rounded-xl">
            <TabsTrigger value="map" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-background/90 data-[state=active]:shadow-sm">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Peta & Layer</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-background/90 data-[state=active]:shadow-sm">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Laporan</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-background/90 data-[state=active]:shadow-sm">
              <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Kategori</span>
            </TabsTrigger>
            <TabsTrigger value="notification" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-background/90 data-[state=active]:shadow-sm">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Notifikasi</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-background/90 data-[state=active]:shadow-sm">
              <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Keamanan</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-background/90 data-[state=active]:shadow-sm">
              <DownloadCloud className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Backup</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-background/90 data-[state=active]:shadow-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Pengguna</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="map" className="mt-6 space-y-4">
          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-card/80 backdrop-blur-md border border-border/60 shadow-sm rounded-xl">
              <TabsTrigger value="display">Tampilan Peta</TabsTrigger>
              <TabsTrigger value="layers">Pengaturan Layer</TabsTrigger>
            </TabsList>

            <TabsContent value="display" className="space-y-4">
              {loadingMapPrefs ? (
                <Card variant="glass" className="border-0">
                  <CardHeader className="p-4 sm:p-6 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72" />
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Skeleton className="h-14 w-full rounded-lg" />
                      <Skeleton className="h-14 w-full rounded-lg" />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card variant="glass" className="border-0">
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                          <Settings className="h-5 w-5 text-primary" />
                          Preferensi Peta
                        </CardTitle>
                        <CardDescription>Atur tampilan default peta dan layer geografis</CardDescription>
                      </div>
                      {isMapDirty ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs">
                          Belum Disimpan
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Tersimpan
                        </Badge>
                      )}
                    </div>
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

                    <div className="bg-card/70 border border-border/60 shadow-sm rounded-lg p-3">
                      <label className="flex items-center justify-between cursor-pointer">
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
                        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">Pengaturan Marker & Layer</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-card/70 border border-border/60 shadow-sm rounded-lg p-3">
                          <label className="flex items-center justify-between cursor-pointer">
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

                        <div className="bg-card/70 border border-border/60 shadow-sm rounded-lg p-3">
                          <label className="flex items-center justify-between cursor-pointer">
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

                      <div className="bg-card/70 border border-border/60 shadow-sm rounded-lg p-3">
                        <label className="flex items-center justify-between cursor-pointer">
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-muted-foreground">Perubahan akan langsung diterapkan pada modul Peta</p>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {isMapDirty && (
                          <Button
                            onClick={handleResetMapPreferences}
                            variant="ghost"
                            size="sm"
                            disabled={mapPrefSaving}
                            className="text-xs gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset
                          </Button>
                        )}
                        <Button
                          onClick={saveMapPreferences}
                          disabled={mapPrefSaving || !isMapDirty}
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          {mapPrefSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Simpan Preferensi
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
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
