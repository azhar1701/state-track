import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, X } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L, { type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

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

type LatLngTuple = [number, number];

const DEFAULT_CENTER: LatLngTuple = [-6.2088, 106.8456];
const DEFAULT_ZOOM = 12;

const statusColors = {
  baru: "bg-accent text-accent-foreground",
  diproses: "bg-secondary text-secondary-foreground",
  selesai: "bg-green-600 text-white",
};

const statusMarkerColors = {
  baru: "#f59e0b",
  diproses: "#10b981",
  selesai: "#059669",
};

const categoryLabels = {
  jalan: "Jalan",
  jembatan: "Jembatan",
  lampu: "Lampu",
  drainase: "Drainase",
  taman: "Taman",
  lainnya: "Lainnya",
};

const createMarkerIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<span style="display:inline-block;width:30px;height:30px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer;"></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

const MapView = () => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);

  useEffect(() => {
    fetchReports();
    getUserLocation();

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
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation, 15);
    }
  }, [userLocation]);

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
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log("Error getting location:", error);
        }
      );
    }
  };

  const goToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation, 15);
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
          <MapContainer
            center={userLocation || DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            className="absolute inset-0"
            style={{ height: "100%", width: "100%" }}
            whenCreated={(mapInstance) => {
              mapRef.current = mapInstance;
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {reports.map((report) => {
              const markerColor =
                statusMarkerColors[report.status as keyof typeof statusMarkerColors] || "#f59e0b";

              return (
                <Marker
                  key={report.id}
                  position={[report.latitude, report.longitude]}
                  icon={createMarkerIcon(markerColor)}
                  eventHandlers={{
                    click: () => {
                      setSelectedReport(report);
                      mapRef.current?.flyTo([report.latitude, report.longitude], 15);
                    },
                  }}
                />
              );
            })}
          </MapContainer>

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
