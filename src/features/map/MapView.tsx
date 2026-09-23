import { formatReportLocation } from "@/lib/formatters";
import { logger } from "@/lib/logger";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Marker, useMap, GeoJSON as RLGeoJSON, Pane, Polyline } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Loader as Loader2, ChevronDown } from "lucide-react";
import L from "leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";

import { useAdminBoundaries } from "./hooks/useAdminBoundaries";
import { useMapReports } from "./hooks/useMapReports";
import { useMapPreferences } from "./hooks/useMapPreferences";
import { useDynamicLayers } from "./hooks/useDynamicLayers";
import { useMapLayers } from "./hooks/useMapLayers";
import { MapCanvas } from "./components/MapCanvas";
import { ReportLayer } from "./components/ReportLayer";
import type { BasemapType } from "./basemap-config";
import { type LegendOverlayItem } from "@/features/map/Legend";
import { reverseGeocode } from "@/features/map/geocoding";
import type { MapFilters } from "@/features/map/FilterPanel";
import { MapSearch } from "@/features/map/MapSearch";
import { FilterPanel } from "@/features/map/FilterPanel";
import { OverlayToggle } from "@/features/map/OverlayToggle";
import { ReportDetailDrawer } from "@/features/map/ReportDetailDrawer";
import { ModernMapOverlay } from "@/features/map/ModernMapOverlay";
import { LayerDetailDrawer } from "@/features/map/LayerDetailDrawer";
import { useLayerHighlight } from "@/features/map/useLayerHighlight";
import { exportMapToPNG, generateShareableURL, parseURLParams } from "@/features/map/mapExport";
import { toast } from "sonner";
import * as turf from "@turf/turf";
import { format, isAfter, isBefore, startOfDay, addDays, differenceInCalendarDays } from "date-fns";
import type { FeatureCollection, Geometry, Feature, Polygon, MultiPolygon, LineString, MultiLineString } from "geojson";
import { sanitizeText, sanitizeForLog } from "@/lib/security";
import { MobileMapControls } from "@/features/map/MobileMapControls";
import { SpatialAnalysisPanel } from "@/features/map/SpatialAnalysisPanel";
import { RouteOptimizationPanel } from "@/features/map/RouteOptimizationPanel";
import { MapInteractionLayer } from "@/features/map/MapInteractionLayer";
import { GeomanControls } from "@/features/map/GeomanControls";
import { DrawToolbar } from "@/features/map/DrawToolbar";
import "@/styles/geoman-custom.css";
import { MultiLayerHeatmap } from "@/features/map/MultiLayerHeatmap";
import type { DensityCell } from "@/features/map/spatialAnalysis";
import type { Report } from "@/services/types";
import { createAssetIcon, getColorForKey } from "./mapIcons";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const FlyToLocation = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom); }, [center, zoom, map]);
  return null;
};

// ---------------------------------------------------------------------------
// MapView — orchestration only, logic delegated to hooks
// ---------------------------------------------------------------------------

const MapView = () => {
  const urlParams = parseURLParams();
  const hasUrlCenter = Boolean(urlParams.center);
  const hasUrlZoom = typeof urlParams.zoom === "number";
  const hasUrlBasemap = Boolean(urlParams.basemap);
  const isMobile = useIsMobile();

  // user location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => logger.info("Error getting location:", sanitizeForLog(err)),
      );
    }
  }, []);

  // preferences & storage
  const { mapCenter, setMapCenter, mapZoom, setMapZoom, basemap, overlays, setOverlays } =
    useMapPreferences({
      hasUrlCenter, hasUrlZoom, hasUrlBasemap,
      urlCenter: urlParams.center,
      urlZoom: typeof urlParams.zoom === "number" ? urlParams.zoom : undefined,
      urlBasemap: urlParams.basemap as BasemapType | undefined,
      onEnableGeolocation: getUserLocation,
    });

  // reports
  const { reports, loading } = useMapReports();

  // filters
  const [filters, setFilters] = useState<MapFilters>({
    category: urlParams.category,
    status: urlParams.status,
    dateFrom: urlParams.dateFrom,
    dateTo: urlParams.dateTo,
  });

  // routing
  const [routingPath, setRoutingPath] = useState<[number, number][] | null>(null);

  const [showStatsDetails, setShowStatsDetails] = useState(false);

  // ui panels
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showOverlayPanel, setShowOverlayPanel] = useState(false);

  // selected items
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<{ id: string; feature: Feature<Geometry>; layer: L.Layer } | null>(null);

  // map tools
  const [activeMapTool, setActiveMapTool] = useState<"draw" | "measure" | null>(null);
  const [showGeomanDraw, setShowGeomanDraw] = useState(false);
  const [geomanDrawMode, setGeomanDrawMode] = useState<string | null>(null);
  const [showSpatialAnalysis, setShowSpatialAnalysis] = useState(false);
  const [showRouteOptimization, setShowRouteOptimization] = useState(false);
  const [multiLayerHeatmap] = useState(false);
  const [densityCells, setDensityCells] = useState<DensityCell[]>([]);

  // map instance
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [cursorLatLng, setCursorLatLng] = useState<[number, number] | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<L.Polygon | null>(null);
  // timeline
  const minDate = useMemo(() => {
    if (reports.length === 0) return startOfDay(addDays(new Date(), -30));
    const oldest = reports.reduce((earliest, r) => {
      const t = new Date(r.created_at).getTime();
      return isNaN(t) ? earliest : Math.min(earliest, t);
    }, Date.now());
    return startOfDay(new Date(oldest));
  }, [reports]);

  const maxDate = useMemo(() => {
    if (reports.length === 0) return new Date();
    const dates = reports.map((r) => new Date(r.created_at));
    return startOfDay(new Date(Math.max(...dates.map((d) => d.getTime()))));
  }, [reports]);

  const [timeFilterDate, setTimeFilterDate] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  useEffect(() => {
    if (reports.length > 0) {
      const latest = reports.reduce((max, r) => {
        const d = new Date(r.created_at);
        return d > max ? d : max;
      }, new Date(reports[0].created_at));
      setTimeFilterDate(latest);
    }
  }, [reports]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, dateTo: format(timeFilterDate, "yyyy-MM-dd") }));
  }, [timeFilterDate]);

  useEffect(() => {
    const days = Math.max(0, differenceInCalendarDays(startOfDay(timeFilterDate), minDate));
    setSliderValue(days);
  }, [timeFilterDate, minDate]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSliderValue((prev) => {
        const totalDays = Math.max(0, differenceInCalendarDays(maxDate, minDate));
        if (prev >= totalDays) { setIsPlaying(false); return prev; }
        const next = prev + 1;
        setTimeFilterDate(addDays(minDate, next));
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, minDate, maxDate]);

  // context menu
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPoint, setCtxPoint] = useState<{ x: number; y: number } | null>(null);
  const [ctxLatLng, setCtxLatLng] = useState<[number, number] | null>(null);
  const [ctxAddress, setCtxAddress] = useState<string | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);

  // admin boundaries
  const { data: adminGeoJson, isLoading: adminLoading } = useAdminBoundaries({
    enabled: overlays.adminBoundaries,
    zoom: mapZoom,
  });

  const kecamatanLines = useMemo(() => {
    if (!adminGeoJson) return null;
    try {
      const getKecName = (p?: Record<string, unknown>) =>
        (p?.KECAMATAN as string) || (p?.Kecamatan as string) || undefined;
      const groups = new Map<string, Array<Feature<Polygon | MultiPolygon>>>();
      for (const f of adminGeoJson.features as Array<Feature<Polygon | MultiPolygon>>) {
        const name = getKecName(f.properties as Record<string, unknown> | undefined);
        if (!name) continue;
        const arr = groups.get(name) || [];
        arr.push(f);
        groups.set(name, arr);
      }
      const lineFeatures: Array<Feature<LineString | MultiLineString>> = [];
      groups.forEach((features, name) => {
        for (const poly of features) {
          try {
            const line = turf.polygonToLine(poly as unknown as Feature<Polygon | MultiPolygon>) as Feature<LineString | MultiLineString>;
            line.properties = { ...(line.properties || {}), KECAMATAN: name };
            lineFeatures.push(line);
          } catch (e) { logger.warn(`Failed kecamatan boundary for ${name}`, sanitizeForLog(e)); }
        }
      });
      return { type: "FeatureCollection", features: lineFeatures as unknown as Feature<Geometry>[] } as FeatureCollection<Geometry>;
    } catch (e) { logger.warn("Failed generating kecamatan lines", sanitizeForLog(e)); return null; }
  }, [adminGeoJson]);

  // dynamic layers
  const { availableLayers, dynamicData, dynamicStyle, dynamicLoading } = useDynamicLayers(overlays, setOverlays);

  // filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.category && report.category !== filters.category) return false;
      if (filters.status && report.status !== filters.status) return false;
      const reportDate = startOfDay(new Date(report.created_at));
      if (filters.dateFrom && isBefore(reportDate, startOfDay(new Date(filters.dateFrom)))) return false;
      if (filters.dateTo && isAfter(reportDate, startOfDay(new Date(filters.dateTo)))) return false;
      if (drawnPolygon) {
        const point = turf.point([report.longitude, report.latitude]);
        const latlngs = drawnPolygon.getLatLngs()[0] as L.LatLng[];
        const coords = latlngs.map((ll) => [ll.lng, ll.lat]);
        coords.push(coords[0]);
        if (!turf.booleanPointInPolygon(point, turf.polygon([coords]))) return false;
      }
      return true;
    });
  }, [reports, filters, drawnPolygon]);

  // cluster + heatmap via hook (useRef internally, no extra re-renders)
  useMapLayers({
    mapInstance,
    filteredReports,
    clusteringEnabled: !!overlays.clustering,
    heatmapEnabled: !!overlays.heatmap,
    onReportClick: setSelectedReport,
  });

  // layer highlight
  const { registerLayer, unregisterLayer } = useLayerHighlight({ selectedFeatureId: selectedLayer?.id || null });

  // stats
  const statusCounts = useMemo(() => {
    const counts = { total: reports.length, baru: 0, diproses: 0, selesai: 0 };
    for (const r of reports) {
      if (r.status === "baru") counts.baru += 1;
      else if (r.status === "diproses") counts.diproses += 1;
      else if (r.status === "selesai") counts.selesai += 1;
    }
    return counts;
  }, [reports]);

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of reports) c[r.category] = (c[r.category] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [reports]);

  const locationCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of reports) {
      const loc = formatReportLocation(r.location_name, (r as { desa?: string }).desa, (r as { kecamatan?: string }).kecamatan);
      if (loc && loc !== "Lokasi Lain") c[loc] = (c[loc] || 0) + 1;
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [reports]);

  const recentReports = useMemo(() => reports.slice(0, 3), [reports]);

  

  // map interactions
  useEffect(() => {
    if (!mapInstance) return;
    const onMove = (e: L.LeafletMouseEvent) => setCursorLatLng([e.latlng.lat, e.latlng.lng]);
    const onContext = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      setCtxOpen(true);
      setCtxPoint({ x: e.containerPoint.x, y: e.containerPoint.y });
      setCtxLatLng([e.latlng.lat, e.latlng.lng]);
      setCtxAddress(null);
      setCtxLoading(false);
    };
    mapInstance.on("mousemove", onMove);
    mapInstance.on("contextmenu", onContext);
    return () => { mapInstance.off("mousemove", onMove); mapInstance.off("contextmenu", onContext); };
  }, [mapInstance]);

    // reactive scale state (integrated into bottom-right HUD to prevent overlap with bottom-left legend)
  const [currentScale, setCurrentScale] = useState<string>("1 : 50.000");

  useEffect(() => {
    if (!mapInstance) return;
    const updateScale = () => {
      const zoom = mapInstance.getZoom();
      const scale = (40075017 * Math.cos((mapInstance.getCenter().lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
      setCurrentScale(`1 : ${(Math.round(scale / 100) * 100).toLocaleString("id-ID")}`);
    };
    mapInstance.on("zoomend moveend", updateScale);
    updateScale();
    return () => {
      mapInstance.off("zoomend moveend", updateScale);
    };
  }, [mapInstance]);

  // fit bounds on first admin boundaries load
  useEffect(() => {
    if (!mapInstance || !overlays.adminBoundaries || !adminGeoJson) return;
    try {
      const tmp = L.geoJSON(adminGeoJson);
      const b = tmp.getBounds();
      if (b.isValid()) mapInstance.fitBounds(b.pad(0.05));
      tmp.remove();
    } catch (e) { logger.warn("Failed to fit bounds", sanitizeForLog(e)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, overlays.adminBoundaries, !!adminGeoJson]);

  // auto-open report from URL
  useEffect(() => {
    if (urlParams.selectedReportId) {
      const report = reports.find((r) => r.id === urlParams.selectedReportId);
      if (report) { setSelectedReport(report); setMapCenter([report.latitude, report.longitude]); setMapZoom(16); }
    }
  }, [reports, urlParams.selectedReportId, setMapCenter, setMapZoom]);

  // map actions
  const goToUserLocation = () => { if (userLocation) { setMapCenter(userLocation); setMapZoom(15); } };

  // One-tap extent reset → flyTo Ciamis bounding box
  const resetToCiamisExtent = useCallback(() => {
    if (!mapInstance) return;
    mapInstance.flyTo([-7.325, 108.353], 12, { duration: 1.2, easeLinearity: 0.25 });
    toast.success("Kembali ke wilayah Ciamis", { icon: "🧭", duration: 2000 });
  }, [mapInstance]);

  const handleZoomToLayer = useCallback(() => {
    if (!selectedLayer || !mapInstance) return;
    const layer = selectedLayer.layer;
    if ("getBounds" in layer && typeof layer.getBounds === "function") {
      mapInstance.fitBounds((layer as L.Polyline).getBounds().pad(0.1));
    }
  }, [selectedLayer, mapInstance]);

  const fetchRoute = useCallback(async (targetCoords: [number, number]) => {
    if (!userLocation) { toast.error("Gunakan GPS untuk menentukan lokasi Anda sebelum membuat rute"); return; }
    setRoutingPath(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${targetCoords[1]},${targetCoords[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json() as { routes?: Array<{ geometry: { coordinates: Array<[number, number]> } }> };
      if (data.routes?.[0]) {
        const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]] as [number, number]);
        setRoutingPath(coords);
        if (mapInstance) mapInstance.fitBounds(L.latLngBounds(coords).pad(0.1));
        toast.success("Rute berhasil dibuat");
      } else { toast.error("Rute tidak ditemukan"); }
    } catch (err) { logger.error("Routing error:", err); toast.error("Gagal memuat rute"); }
  }, [userLocation, mapInstance]);

  const handleShare = async () => {
    const url = generateShareableURL({ center: mapCenter, zoom: mapZoom, category: filters.category, status: filters.status, dateFrom: filters.dateFrom, dateTo: filters.dateTo, selectedReportId: selectedReport?.id, basemap });
    try { await navigator.clipboard.writeText(url); toast.success("Link berhasil disalin!", { description: "Link peta telah disalin ke clipboard" }); }
    catch { toast.error("Gagal menyalin link"); }
  };

  const handleExport = async (opts?: { filename?: string; includeControls?: boolean; scale?: number }) => {
    if (!mapInstance) return;
    try {
      toast.loading("Mengekspor peta...");
      const filename = opts?.filename || `map-export-${format(new Date(), "yyyy-MM-dd")}.png`;
      await exportMapToPNG(mapInstance, { filename, includeControls: opts?.includeControls ?? true, scale: opts?.scale ?? 1 });
      toast.dismiss();
      toast.success("Peta berhasil diekspor!");
    } catch { toast.dismiss(); toast.error("Gagal mengekspor peta"); }
  };

  // dynamic legend
  const legendOverlays = useMemo<LegendOverlayItem[]>(() => {
    const items: LegendOverlayItem[] = [];
    if (overlays.adminBoundaries) items.push({ type: "line", label: "Batas Administratif", color: "#6b7280", dashArray: "4 3" });
    for (const [key, on] of Object.entries(overlays.dynamic || {})) {
      if (!on || key.toLowerCase() === "assets") continue;
      const config = dynamicStyle[key] || {};
      const layerColor = getColorForKey(key);
      const gt = availableLayers.find((l) => l.key === key)?.geometry_type || dynamicData[key]?.features?.find((f) => !!f?.geometry)?.geometry?.type || "";
      const name = availableLayers.find((l) => l.key === key)?.name || key;
      if (/LineString/i.test(String(gt))) items.push({ type: "line", label: name, color: config.color || layerColor, dashArray: config.dashArray });
      else if (/Point/i.test(String(gt))) { if (name.toLowerCase() !== "aset") items.push({ type: "point", label: name, color: config.fillColor || layerColor }); }
      else items.push({ type: "fill", label: name, color: config.color || layerColor, fillColor: config.fillColor || layerColor });
    }
    return items;
  }, [overlays.adminBoundaries, overlays.dynamic, availableLayers, dynamicData, dynamicStyle]);

  // rendered dynamic layers
  const renderedLayers = useMemo(() => {
    return Object.entries(overlays.dynamic || {}).map(([key, on]) => {
      if (!on || !dynamicData[key]) return null;
      const config = dynamicStyle[key] || {};
      const geomType = availableLayers.find((l) => l.key === key)?.geometry_type || dynamicData[key]?.features?.find((f) => !!f?.geometry)?.geometry?.type || "";
      return (
        <Pane key={`pane-${key}`} name={`dyn-${key}`} style={{ zIndex: 365 }}>
          <RLGeoJSON
            key={`geojson-${key}-${JSON.stringify(config)}`}
            data={dynamicData[key]!}
            style={() => {
              const c = getColorForKey(key);
              if (/Point/i.test(String(geomType))) return { color: "transparent", weight: 0, opacity: 0, fillColor: config.fillColor || c, fillOpacity: config.fillOpacity ?? 0.75 } as L.PathOptions;
              if (/LineString/i.test(String(geomType))) return { color: config.color || c, weight: config.weight ?? 2, opacity: config.opacity ?? 0.9, fillOpacity: 0, dashArray: config.dashArray } as L.PathOptions;
              return { color: config.color || "#6b7280", weight: config.weight ?? 1, opacity: config.opacity ?? 0.85, fillColor: config.fillColor || c, fillOpacity: config.fillOpacity ?? 0.45, dashArray: config.dashArray } as L.PathOptions;
            }}
            pointToLayer={(feature, latlng) => {
              if (key === "assets") {
                const p = feature.properties as Record<string, unknown> | undefined;
                const st = (p?.status as string) || "aktif";
                return L.marker(latlng, { icon: createAssetIcon((["aktif","nonaktif","rusak"].includes(st) ? st : "aktif") as "aktif"|"nonaktif"|"rusak", (p?.category as string) || "") });
              }
              const c = getColorForKey(key);
              return L.circleMarker(latlng, { radius: config.radius ?? 8, color: "transparent", weight: 0, fillColor: config.fillColor || c, fillOpacity: config.fillOpacity ?? 0.75 });
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties as Record<string, unknown> | undefined;
              const featureId = `${key}-${Math.random().toString(36).substr(2, 9)}`;
              const title = (p?.name as string) || (p?.title as string) || (p?.NAMOBJ as string) || key;
              if (title) layer.bindTooltip(String(title), { sticky: true });
              if (key === "assets") {
                layer.bindPopup(`<div style="min-width:200px"><div style="font-weight:600;margin-bottom:4px">${sanitizeText(title)}</div><div><strong>Kode:</strong> ${sanitizeText((p?.code as string)??"")}</div><div><strong>Kategori:</strong> ${sanitizeText((p?.category as string)??"")}</div><div><strong>Status:</strong> ${sanitizeText((p?.status as string)??"")}</div><div><strong>Keterangan:</strong> ${sanitizeText((p?.keterangan as string)??"")}</div></div>`);
              } else { layer.on("click", () => setSelectedLayer({ id: featureId, feature, layer })); }
              layer.on("remove", () => unregisterLayer(featureId));
            }}
          />
        </Pane>
      );
    });
  }, [overlays.dynamic, dynamicData, dynamicStyle, availableLayers, unregisterLayer]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
    return (
    <div className="relative w-full h-[calc(100dvh-3.5rem)] overflow-hidden bg-background">
      {/* Floating Quick Stats HUD */}
      <div className="absolute top-3 md:top-4 left-3 md:left-4 z-[1000] pointer-events-auto">
        <div className="flex flex-col gap-2">
          <div
            onClick={() => setShowStatsDetails((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-2 bg-background/90 backdrop-blur-md border border-border/80 shadow-float rounded-2xl cursor-pointer hover:bg-background transition-all group"
            role="button"
            tabIndex={0}
            aria-label="Buka ringkasan statistik laporan"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setShowStatsDetails((v) => !v);
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>{loading ? "..." : statusCounts.total} Laporan</span>
            </div>
            <div className="w-px h-4 bg-border/80" />
            <div className="flex items-center gap-1 text-[11px]">
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                {statusCounts.baru} Baru
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">
                {statusCounts.diproses} Proses
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                {statusCounts.selesai} Selesai
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                showStatsDetails ? "rotate-180" : ""
              }`}
            />
          </div>

          {/* Expanded Stats Details Card */}
          {showStatsDetails && (
            <div className="w-80 bg-background/95 backdrop-blur-md border border-border/80 shadow-lifted rounded-2xl p-4 space-y-3 animate-in-fade">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ringkasan Spasial
                </span>
                <button
                  onClick={() => setShowStatsDetails(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Tutup
                </button>
              </div>

              {categoryCounts.length > 0 && (
                <div>
                  <div className="text-2xs font-semibold text-muted-foreground mb-1">
                    Kategori Teratas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryCounts.map(([cat, count]) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                      >
                        {cat}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {locationCounts.length > 0 && (
                <div>
                  <div className="text-2xs font-semibold text-muted-foreground mb-1">
                    Lokasi Terbanyak
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {locationCounts.map(([loc, count]) => (
                      <span
                        key={loc}
                        className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary/80 text-xs font-medium"
                      >
                        {loc}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {recentReports.length > 0 && (
                <div className="pt-2 border-t border-border/50 text-xs">
                  <span className="text-muted-foreground">Laporan Terkini: </span>
                  <span className="font-semibold text-foreground">
                    {(recentReports[0].title || "Tanpa Judul").slice(0, 30)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`relative w-full h-full ${activeMapTool ? "cursor-crosshair" : ""}`}>
        <MapCanvas basemap={basemap} center={mapCenter} zoom={mapZoom} ref={setMapInstance}>
            <FlyToLocation center={mapCenter} zoom={mapZoom} />
            {isMobile && <MobileMapControls onZoomIn={() => mapInstance?.zoomIn()} onZoomOut={() => mapInstance?.zoomOut()} onLocate={goToUserLocation} onResetExtent={resetToCiamisExtent} />}

            {overlays.adminBoundaries && adminGeoJson && (
              <Pane name="admin-boundaries" style={{ zIndex: 350 }}>
                <RLGeoJSON
                  key="admin-boundaries"
                  data={adminGeoJson}
                  style={() => ({ color: "#6b7280", weight: 1, opacity: 0.8, dashArray: "4 3", fillOpacity: 0 })}
                  onEachFeature={(feature, layer) => {
                    const p = feature.properties as Record<string, unknown> | undefined;
                    const featureId = `admin-${Math.random().toString(36).substr(2, 9)}`;
                    registerLayer(featureId, layer, { color: "#6b7280", weight: 1, opacity: 0.8, fillOpacity: 0 });
                    const name = (p?.DESA_1 as string)||(p?.DESA as string)||(p?.KECAMATAN as string)||(p?.Kecamatan as string)||(p?.name as string)||(p?.NAMOBJ as string)||undefined;
                    if (name) layer.bindTooltip(String(name), { sticky: true, direction: "center", className: "bg-black/60 text-white px-1 py-0.5 rounded border text-[11px]" });
                    layer.on("click", () => setSelectedLayer({ id: featureId, feature, layer }));
                    layer.on("mouseover", () => { (layer as unknown as {setStyle?:(o:L.PathOptions)=>void}).setStyle?.({weight:2,color:"#111827"}); });
                    layer.on("mouseout", () => { if (selectedLayer?.id!==featureId) (layer as unknown as {setStyle?:(o:L.PathOptions)=>void}).setStyle?.({weight:1,color:"#6b7280"}); });
                    layer.on("remove", () => unregisterLayer(featureId));
                  }}
                />
              </Pane>
            )}

            {overlays.adminBoundaries && kecamatanLines && (
              <Pane name="kecamatan-boundaries" style={{ zIndex: 360, pointerEvents: "none" }}>
                <RLGeoJSON key="kecamatan-boundaries" data={kecamatanLines} style={() => ({ color: "#111827", weight: 2, opacity: 0.9, dashArray: "6 4" })} />
              </Pane>
            )}

            {renderedLayers}

            <ReportLayer filters={filters} overlays={overlays} onReportClick={(r) => setSelectedReport(r)} />

            {userLocation && (
              <Marker position={userLocation} icon={L.icon({ iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iIzM5ODJmNiIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0iIzM5ODJmNiIvPgo8L3N2Zz4=", iconSize:[24,24], iconAnchor:[12,12] })} />
            )}

            {routingPath && (
              <Polyline
                positions={routingPath}
                pathOptions={{ color: "#3b82f6", weight: 6, opacity: 0.9 }}
                ref={(ref) => {
                  if (ref) {
                    const el = (ref as unknown as { getElement?: () => HTMLElement | null }).getElement?.();
                    if (el) el.classList.add("pulsing-route-polyline");
                    // fitBounds so the full route is visible
                    const bounds = (ref as unknown as { getBounds?: () => L.LatLngBounds }).getBounds?.();
                    if (bounds?.isValid()) mapInstance?.fitBounds(bounds.pad(0.12));
                  }
                }}
              />
            )}

            <MapInteractionLayer
              activeMapTool={activeMapTool}
              onPolygonDrawn={(polygon) => { setDrawnPolygon(polygon); toast.success("Polygon berhasil digambar"); }}
              onMeasurement={(m) => { if (m.distance) toast.success(`Jarak: ${m.distance.toFixed(2)} km`); if (m.area) toast.success(`Luas: ${m.area.toFixed(3)} km\u00B2`); }}
            />
            <GeomanControls enabled={showGeomanDraw} onPolygonDrawn={(p) => setDrawnPolygon(p)} onDrawModeChange={setGeomanDrawMode} />
          </MapCanvas>

          <ModernMapOverlay
            showSearch={showSearchPanel}
            onToggleSearch={() => { setShowSearchPanel((v)=>!v); setShowFilterPanel(false); setShowOverlayPanel(false); }}
            canLocate={!!userLocation} onLocate={goToUserLocation}
            onResetExtent={resetToCiamisExtent}
            onToggleFilters={() => { setShowFilterPanel((v)=>!v); setShowSearchPanel(false); setShowOverlayPanel(false); }}
            onToggleOverlays={() => { setShowOverlayPanel((v)=>!v); setShowSearchPanel(false); setShowFilterPanel(false); }}
            onToggleDrawing={() => { setShowGeomanDraw((p)=>!p); setActiveMapTool(null); setShowSpatialAnalysis(false); setShowRouteOptimization(false); }}
            drawToolbarContent={mapInstance&&showGeomanDraw ? <DrawToolbar visible={showGeomanDraw} activeMode={geomanDrawMode} map={mapInstance} /> : null}
            onShare={handleShare} onExport={() => handleExport()}
            minDate={minDate} maxDate={maxDate} currentDate={timeFilterDate} onDateChange={setTimeFilterDate}
            totalDays={Math.max(0,differenceInCalendarDays(maxDate,minDate))}
            sliderValue={sliderValue}
            onSliderChange={(v) => { const d=v[0]; setSliderValue(d); setTimeFilterDate(addDays(minDate,d)); }}
            isPlaying={isPlaying} onPlayPause={() => setIsPlaying(!isPlaying)}
            onStepPrev={() => { setIsPlaying(false); setSliderValue((p)=>{ const n=Math.max(0,p-1); setTimeFilterDate(addDays(minDate,n)); return n; }); }}
            onStepNext={() => { setIsPlaying(false); setSliderValue((p)=>{ const total=Math.max(0,differenceInCalendarDays(maxDate,minDate)); const n=Math.min(total,p+1); setTimeFilterDate(addDays(minDate,n)); return n; }); }}
            onReset={() => { setIsPlaying(false); setSliderValue(0); setTimeFilterDate(minDate); }}
            legendOverlays={legendOverlays} statusCounts={statusCounts}
          />

          {showSearchPanel && (
            <div className={`absolute z-[1200] top-20 left-1/2 -translate-x-1/2 ${isMobile?"w-[calc(100%-1rem)]":"w-auto"}`}>
              <MapSearch onSelect={(lat,lon,label) => { setMapCenter([lat,lon]); setMapZoom(16); setShowSearchPanel(false); toast.success("Pergi ke lokasi",{description:label}); }} onClose={() => setShowSearchPanel(false)} />
            </div>
          )}

          {routingPath && (
            <div className="absolute z-[1200] top-40 right-4">
              <Button variant="destructive" size="sm" onClick={() => setRoutingPath(null)} className="bg-popover/95 border-border shadow-lg font-bold">Hapus Rute</Button>
            </div>
          )}

          {showFilterPanel && (
            <FilterPanel filters={filters}
              onFilterChange={(f) => { setFilters(f); window.history.replaceState({},"",generateShareableURL({center:mapCenter,zoom:mapZoom,category:f.category,status:f.status,dateFrom:f.dateFrom,dateTo:f.dateTo,selectedReportId:selectedReport?.id,basemap})); setShowFilterPanel(false); }}
              onClose={() => setShowFilterPanel(false)} />
          )}

          {showOverlayPanel && (
            <OverlayToggle overlays={overlays} onOverlayChange={setOverlays}
              availableLayers={availableLayers.map(({key,name})=>({key,name}))} onClose={() => setShowOverlayPanel(false)} />
          )}

          {selectedReport && (
            <ReportDetailDrawer
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
              onRoute={() => fetchRoute([selectedReport.latitude, selectedReport.longitude])}
            />
          )}

          <LayerDetailDrawer isOpen={!!selectedLayer} onClose={() => setSelectedLayer(null)} feature={(selectedLayer?.feature as GeoJSON.Feature<Geometry,Record<string,unknown>>)||null} onZoomToFeature={handleZoomToLayer} />

          {showSpatialAnalysis && (
            <SpatialAnalysisPanel
              reports={filteredReports.map((r)=>({id:r.id,coords:[r.latitude,r.longitude],category:r.category,status:r.status}))}
              onBufferCreated={(buf) => { if (!mapInstance) return; L.geoJSON(buf,{style:{color:"#3b82f6",weight:2,fillOpacity:0.1}}).addTo(mapInstance); toast.success("Buffer zone berhasil dibuat"); }}
              onDensityCalculated={(cells) => { setDensityCells(cells); toast.success(`${cells.length} density cells dihitung`); }}
              onStatsCalculated={(s) => { toast.success("Analisis statistik selesai",{description:`NNI: ${s.nni.toFixed(3)} - ${s.clustered?"Clustered":"Dispersed"}`}); }}
              onClose={() => setShowSpatialAnalysis(false)} />
          )}

          {showRouteOptimization && (
            <RouteOptimizationPanel
              reports={filteredReports.map((r)=>({id:r.id,title:r.title,coords:[r.latitude,r.longitude],category:r.category,status:r.status,severity:r.severity||undefined}))}
              onRouteGenerated={(route) => {
                if (!mapInstance) return;
                const latLngs: [number, number][] = route.points.map((p) => [p.coords[0], p.coords[1]]);
                const polyline = L.polyline(latLngs, { color: "#10b981", weight: 5, opacity: 0.9, className: "pulsing-route-polyline" }).addTo(mapInstance);
                const bounds = polyline.getBounds();
                if (bounds.isValid()) mapInstance.fitBounds(bounds.pad(0.12));
                route.points.forEach((pt, idx) => {
                  L.marker([pt.coords[0], pt.coords[1]], {
                    icon: L.divIcon({
                      html: `<div style="background:#10b981;color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.35)">${idx + 1}</div>`,
                      className: "route-marker",
                      iconSize: [26, 26],
                    }),
                  }).addTo(mapInstance);
                });
              }}
              onClose={() => setShowRouteOptimization(false)} />
          )}

          {multiLayerHeatmap && (
            <MultiLayerHeatmap points={filteredReports.map((r)=>({coords:[r.latitude,r.longitude],category:r.category,severity:r.severity||undefined}))} enabled={multiLayerHeatmap} categories={Array.from(new Set(reports.map((r)=>r.category)))} />
          )}

          {densityCells.length > 0 && (
            <Pane name="density-cells" style={{ zIndex: 370 }}>
              {densityCells.map((cell) => (
                <RLGeoJSON key={cell.id} data={{type:"Feature",properties:{count:cell.count},geometry:cell.geometry} as Feature<Geometry>}
                  style={() => ({fillColor:"#ef4444",fillOpacity:Math.min(cell.count/10,1)*0.6,color:"#dc2626",weight:1})}
                  onEachFeature={(_f,l) => l.bindTooltip(`${cell.count} laporan`,{sticky:true})} />
              ))}
            </Pane>
          )}

          {!selectedReport && (
            <div className="custom-scale-control absolute bottom-4 right-4 z-[800] bg-background/90 backdrop-blur-md border border-border/80 rounded-2xl px-3.5 py-1.5 text-[11px] font-mono shadow-float pointer-events-none hidden sm:flex items-center gap-2.5 text-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Skala</span>
                <span className="font-semibold">{currentScale}</span>
              </div>
              {cursorLatLng && (
                <>
                  <div className="w-px h-3.5 bg-border/80" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Koordinat</span>
                    <span className="font-semibold">
                      {cursorLatLng[0].toFixed(5)}, {cursorLatLng[1].toFixed(5)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {ctxOpen && ctxPoint && ctxLatLng && (
            <div className="absolute z-[1002] bg-background border rounded shadow-lg p-2 text-sm w-64" style={{left:ctxPoint.x,top:ctxPoint.y}} onMouseLeave={() => setCtxOpen(false)}>
              <div className="font-medium mb-1">Koordinat</div>
              <div className="font-mono text-xs mb-2">{ctxLatLng[0].toFixed(6)}, {ctxLatLng[1].toFixed(6)}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async() => { await navigator.clipboard.writeText(`${ctxLatLng[0]}, ${ctxLatLng[1]}`); toast.success("Koordinat disalin"); setCtxOpen(false); }}>Salin koordinat</Button>
                <Button size="sm" variant="outline" onClick={async() => { setCtxLoading(true); const r=await reverseGeocode(ctxLatLng[0],ctxLatLng[1]); setCtxLoading(false); if(r) setCtxAddress(r.display_name); else toast.error("Gagal mendapatkan alamat"); }}>{ctxLoading?"Mencari...":"Lihat alamat"}</Button>
              </div>
              {ctxAddress && <div className="mt-2 text-xs text-muted-foreground">{ctxAddress}</div>}
            </div>
          )}

          {(loading||adminLoading||Object.entries(dynamicLoading).some(([k,v])=>overlays.dynamic?.[k]&&v)) && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1100] flex flex-col gap-2 pointer-events-none">
              {loading && <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-2 shadow-md"><div className="flex items-center gap-2 text-sm text-white"><Loader2 className="w-4 h-4 animate-spin" /><span className="font-medium">Memuat laporan...</span></div></div>}
              {adminLoading&&overlays.adminBoundaries && <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-2 shadow-md"><div className="flex items-center gap-2 text-sm text-white"><Loader2 className="w-4 h-4 animate-spin" /><span className="font-medium">Memuat batas administratif...</span></div></div>}
              {Object.entries(dynamicLoading).some(([k,v])=>overlays.dynamic?.[k]&&v) && <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-2 shadow-md"><div className="flex items-center gap-2 text-sm text-white"><Loader2 className="w-4 h-4 animate-spin" /><span className="font-medium">Memuat layer geospasial...</span></div></div>}
            </div>
          )}
              </div>
    </div>
  );
};

export default MapView;

