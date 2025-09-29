import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, X } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Temporary Mapbox token input - akan diganti dengan secret management
const TEMP_MAPBOX_TOKEN = "pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtNXRxdzltbTBoa2cybHB6OTNscnU2Y2UifQ.gHvsKRI71gKBBxacxzj3Ew";

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  created_at: string;
  user_id: string;
}

const statusColors = {
  baru: "bg-accent text-accent-foreground",
  diproses: "bg-secondary text-secondary-foreground",
  selesai: "bg-green-600 text-white",
};

const categoryLabels = {
  jalan: "Jalan",
  jembatan: "Jembatan",
  lampu: "Lampu",
  drainase: "Drainase",
  taman: "Taman",
  lainnya: "Lainnya",
};

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    fetchReports();
    getUserLocation();

    // Realtime subscription
    const channel = supabase
      .channel("reports-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
        },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = TEMP_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: userLocation || [106.8456, -6.2088], // Default: Jakarta
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, [userLocation]);

  useEffect(() => {
    if (!map.current || reports.length === 0) return;

    // Clear existing markers
    const markers = document.querySelectorAll(".mapboxgl-marker");
    markers.forEach((marker) => marker.remove());

    // Add markers for each report
    reports.forEach((report) => {
      const markerColor =
        report.status === "baru"
          ? "#f59e0b"
          : report.status === "diproses"
          ? "#10b981"
          : "#059669";

      const el = document.createElement("div");
      el.className = "marker";
      el.style.backgroundColor = markerColor;
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.borderRadius = "50%";
      el.style.cursor = "pointer";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      el.addEventListener("click", () => {
        setSelectedReport(report);
        map.current?.flyTo({
          center: [report.longitude, report.latitude],
          zoom: 15,
        });
      });

      new mapboxgl.Marker(el)
        .setLngLat([report.longitude, report.latitude])
        .addTo(map.current!);
    });
  }, [reports]);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReports(data as Report[]);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.log("Error getting location:", error);
        }
      );
    }
  };

  const goToUserLocation = () => {
    if (userLocation && map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: 15,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Peta Laporan Infrastruktur</h1>
          <p className="text-muted-foreground">
            Lihat semua laporan infrastruktur di peta interaktif
          </p>
        </div>

        <div className="relative h-[calc(100vh-220px)] rounded-lg overflow-hidden shadow-lg border">
          <div ref={mapContainer} className="absolute inset-0" />

          {/* User location button */}
          {userLocation && (
            <Button
              onClick={goToUserLocation}
              className="absolute top-4 left-4 z-10 shadow-lg"
              size="sm"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Lokasi Saya
            </Button>
          )}

          {/* Legend */}
          <Card className="absolute bottom-4 left-4 z-10 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status Laporan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-accent border-2 border-white" />
                <span>Baru</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-secondary border-2 border-white" />
                <span>Diproses</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-green-600 border-2 border-white" />
                <span>Selesai</span>
              </div>
            </CardContent>
          </Card>

          {/* Selected report details */}
          {selectedReport && (
            <Card className="absolute top-4 right-4 z-10 w-80 max-h-[calc(100vh-280px)] overflow-auto shadow-xl">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">{selectedReport.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={statusColors[selectedReport.status as keyof typeof statusColors]}>
                      {selectedReport.status}
                    </Badge>
                    <Badge variant="outline">
                      {categoryLabels[selectedReport.category as keyof typeof categoryLabels]}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedReport(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedReport.photo_url && (
                  <img
                    src={selectedReport.photo_url}
                    alt={selectedReport.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <p className="text-sm text-muted-foreground">
                  {selectedReport.description}
                </p>
                {selectedReport.location_name && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">
                      {selectedReport.location_name}
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Dilaporkan pada{" "}
                  {new Date(selectedReport.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Total laporan:</strong> {reports.length} laporan terdata
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapView;
