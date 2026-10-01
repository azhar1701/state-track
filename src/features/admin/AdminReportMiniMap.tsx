import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Layers, Copy, Check, MapPin } from "lucide-react";
import { toast } from "sonner";
import { basemaps } from "@/features/map/basemap-config";

interface AdminReportMiniMapProps {
  reportId: string;
  latitude: number | null;
  longitude: number | null;
  title: string;
  category?: string | null;
  severity?: string | null;
  locationName?: string | null;
}

export const AdminReportMiniMap = ({
  reportId,
  latitude,
  longitude,
  title,
  category,
  severity,
  locationName,
}: AdminReportMiniMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<"osm" | "satellite">("osm");
  const [copied, setCopied] = useState(false);

  const isValidCoords = useMemo(() => {
    if (latitude == null || longitude == null) return false;
    const lat = Number(latitude);
    const lng = Number(longitude);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
  }, [latitude, longitude]);

  const coordsText = isValidCoords ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}` : null;

  // Initialize or update map
  useEffect(() => {
    if (!isValidCoords || !containerRef.current) return;

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!mapInstanceRef.current) {
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Add zoom control top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Initial tile layer
      const layerUrl = basemaps[activeBasemap]?.url || basemaps.osm.url;
      const tile = L.tileLayer(layerUrl, { maxZoom: 19 }).addTo(map);
      tileLayerRef.current = tile;

      // Severity pin color
      const pinColor = severity === "berat" ? "#ef4444" : severity === "sedang" ? "#f59e0b" : "#3b82f6";

      // Pulsing impact/accuracy radius
      L.circle([lat, lng], {
        radius: 35,
        color: pinColor,
        fillColor: pinColor,
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: "4 3",
      }).addTo(map);

      // Custom Pin marker
      const pinIcon = L.divIcon({
        className: "admin-mini-map-pin",
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="width:28px;height:28px;background:${pinColor};border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      marker.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;padding:2px;">
          <div style="font-weight:700;color:#0f172a;">${title || "Lokasi Laporan"}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${locationName || ""}</div>
          <div style="font-size:10px;font-family:monospace;color:#3b82f6;margin-top:4px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>`
      );

      mapInstanceRef.current = map;

      // Invalidate size after animation
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);

      return () => {
        clearTimeout(timer);
        map.remove();
        mapInstanceRef.current = null;
      };
    } else {
      mapInstanceRef.current.setView([lat, lng], 16);
      mapInstanceRef.current.invalidateSize();
    }
  }, [isValidCoords, latitude, longitude, activeBasemap, title, severity, locationName]);

  // Handle basemap toggle
  const toggleBasemap = () => {
    const next = activeBasemap === "osm" ? "satellite" : "osm";
    setActiveBasemap(next);
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(basemaps[next].url, { maxZoom: 19 }).addTo(mapInstanceRef.current);
      tileLayerRef.current = newLayer;
    }
  };

  const handleCopy = async () => {
    if (!coordsText) return;
    try {
      await navigator.clipboard.writeText(coordsText);
      setCopied(true);
      toast.success("Koordinat disalin ke clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin koordinat");
    }
  };

  const handleOpenMainMap = () => {
    const url = `/map?selectedReportId=${encodeURIComponent(reportId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!isValidCoords) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="text-xs font-semibold text-foreground">Koordinat Lokasi Tidak Tersedia</div>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
          Laporan ini belum memiliki koordinat lintang/bujur valid atau dikirimkan tanpa GPS.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/80 bg-card shadow-sm group">
      {/* Map Canvas */}
      <div ref={containerRef} className="w-full h-56 sm:h-64 z-0" />

      {/* Floating Top Header Badges */}
      <div className="absolute top-2.5 left-2.5 z-[500] pointer-events-auto flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className="bg-background/90 backdrop-blur-md border border-border/70 text-[10px] font-mono font-medium shadow-xs gap-1 py-0.5 px-2">
          <MapPin className="w-3 h-3 text-primary shrink-0" />
          <span>{coordsText}</span>
        </Badge>
        {category && (
          <Badge variant="outline" className="bg-background/85 backdrop-blur-md border border-border/60 text-[10px] capitalize shadow-xs hidden sm:inline-flex">
            {category}
          </Badge>
        )}
      </div>

      {/* Floating Bottom Action Toolbar */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[500] pointer-events-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Basemap Switcher Button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleBasemap}
            className="h-7 text-xs px-2.5 gap-1.5 bg-background/90 backdrop-blur-md border-border/80 hover:bg-background shadow-sm rounded-lg"
            title="Ganti Peta Jalan / Citra Satelit"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-[11px]">{activeBasemap === "osm" ? "Satelit" : "Jalan"}</span>
          </Button>

          {/* Copy Coordinates Button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="h-7 text-xs px-2.5 gap-1.5 bg-background/90 backdrop-blur-md border-border/80 hover:bg-background shadow-sm rounded-lg"
            title="Salin Koordinat GPS"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className="font-medium text-[11px] hidden xs:inline">{copied ? "Disalin" : "Salin"}</span>
          </Button>
        </div>

        {/* Open in Main Interactive GIS Map Canvas */}
        <Button
          type="button"
          size="sm"
          onClick={handleOpenMainMap}
          className="h-7 text-xs px-3 gap-1.5 bg-primary/95 text-primary-foreground hover:bg-primary shadow-sm rounded-lg font-semibold"
          title="Buka titik laporan ini di kanvas peta GIS utama"
        >
          <span className="text-[11px]">Buka di Peta Utama</span>
          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
        </Button>
      </div>
    </div>
  );
};
