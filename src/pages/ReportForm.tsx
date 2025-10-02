import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Upload, Navigation, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L, { type LeafletEventHandlerFnMap, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { z } from "zod";

type LocationState = {
  latitude: number;
  longitude: number;
  name?: string;
};

type LatLngTuple = [number, number];

const DEFAULT_CENTER: LatLngTuple = [-6.2088, 106.8456];

const reportSchema = z.object({
  title: z.string().min(5, { message: "Judul minimal 5 karakter" }).max(100),
  description: z.string().min(10, { message: "Deskripsi minimal 10 karakter" }).max(1000),
  category: z.enum(["jalan", "jembatan", "lampu", "drainase", "taman", "lainnya"]),
});

const createLocationMarkerIcon = () =>
  L.divIcon({
    className: "",
    html: `<span style="display:inline-block;width:32px;height:32px;border-radius:50%;background:#2563eb;border:4px solid white;box-shadow:0 4px 8px rgba(0,0,0,0.25);cursor:grab;"></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

const buildReverseGeocodeUrl = (lat: number, lng: number) =>
  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=id&email=support@state-track.local`;

const ReportForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
  });

  const markerIcon = useMemo(() => createLocationMarkerIcon(), []);

  const getLocationName = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(buildReverseGeocodeUrl(lat, lng));
      if (!response.ok) {
        throw new Error(`Reverse geocode failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data?.display_name) {
        setLocation({
          latitude: lat,
          longitude: lng,
          name: data.display_name,
        });
      }
    } catch (error) {
      console.error("Error getting location name:", error);
    }
  }, []);

  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ latitude: lat, longitude: lng });
          getLocationName(lat, lng);
          if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 15);
          }
        },
        (error) => {
          console.log("Error getting location:", error);
          const [defaultLat, defaultLng] = DEFAULT_CENTER;
          setLocation({ latitude: defaultLat, longitude: defaultLng });
          getLocationName(defaultLat, defaultLng);
        }
      );
    }
  }, [getLocationName]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    getUserLocation();
  }, [user, navigate, getUserLocation]);

  useEffect(() => {
    if (location && mapRef.current) {
      mapRef.current.flyTo(
        [location.latitude, location.longitude],
        mapRef.current.getZoom() ?? 15
      );
    }
  }, [location]);

  const markerEventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      dragend() {
        const currentMarker = markerRef.current;
        if (currentMarker) {
          const { lat, lng } = currentMarker.getLatLng();
          setLocation((prev) => ({
            latitude: lat,
            longitude: lng,
            name: prev?.name,
          }));
          getLocationName(lat, lng);
        }
      },
    }),
    [getLocationName]
  );

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran foto maksimal 5MB");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", category: "" });
    setPhotoFile(null);
    setPhotoPreview(null);
    setLocation(null);
  };

  const uploadPhoto = async () => {
    if (!photoFile || !user) return null;

    const fileExt = photoFile.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `reports/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(filePath, photoFile);

    if (uploadError) {
      toast.error("Gagal mengunggah foto");
      return null;
    }

    const { data } = supabase.storage.from("reports").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      navigate("/auth");
      return;
    }

    const validation = reportSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!location) {
      toast.error("Silakan pilih lokasi laporan");
      return;
    }

    try {
      setLoading(true);
      let photoUrl = null;

      if (photoFile) {
        photoUrl = await uploadPhoto();
        if (!photoUrl) {
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("reports").insert([
        {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: "baru",
          latitude: location.latitude,
          longitude: location.longitude,
          location_name: location.name || null,
          photo_url: photoUrl,
          user_id: user.id,
        },
      ]);

      if (error) {
        throw error;
      }

      toast.success("Laporan berhasil dikirim!");
      resetForm();
      navigate("/map");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Terjadi kesalahan saat mengirim laporan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Buat Laporan Infrastruktur</CardTitle>
            <CardDescription>
              Lengkapi informasi berikut untuk melaporkan masalah infrastruktur di lingkungan Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Laporan *</Label>
                  <Input
                    id="title"
                    placeholder="Contoh: Lampu jalan mati"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jalan">Jalan</SelectItem>
                      <SelectItem value="jembatan">Jembatan</SelectItem>
                      <SelectItem value="lampu">Lampu</SelectItem>
                      <SelectItem value="drainase">Drainase</SelectItem>
                      <SelectItem value="taman">Taman</SelectItem>
                      <SelectItem value="lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi *</Label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan masalah secara detail..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Foto (Opsional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("photo")?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {photoFile ? "Ganti Foto" : "Upload Foto"}
                  </Button>
                  {photoFile && (
                    <span className="text-sm text-muted-foreground">{photoFile.name}</span>
                  )}
                </div>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Lokasi *</Label>
                <div className="space-y-2">
                  <div className="relative h-64 rounded-lg overflow-hidden border">
                    <MapContainer
                      center={location ? [location.latitude, location.longitude] : DEFAULT_CENTER}
                      zoom={15}
                      scrollWheelZoom
                      className="absolute inset-0"
                      style={{ height: "100%", width: "100%" }}
                      whenCreated={(mapInstance) => {
                        mapRef.current = mapInstance;
                        if (location) {
                          mapInstance.setView([location.latitude, location.longitude], 15);
                        }
                      }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {location && (
                        <Marker
                          position={[location.latitude, location.longitude]}
                          draggable
                          icon={markerIcon}
                          ref={markerRef}
                          eventHandlers={markerEventHandlers}
                        />
                      )}
                    </MapContainer>

                    <Button
                      type="button"
                      onClick={getUserLocation}
                      className="absolute top-2 left-2 z-10"
                      size="sm"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Lokasi Saya
                    </Button>

                    {!location && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/70 backdrop-blur-sm">
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Memuat peta...
                        </span>
                      </div>
                    )}
                  </div>
                  {location?.name && (
                    <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                      <MapPin className="w-4 h-4 text-primary mt-0.5" />
                      <span>{location.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Geser pin untuk menyesuaikan lokasi
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/map")}
                  className="flex-1"
                  disabled={loading}
                >
                  Batal
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    "Kirim Laporan"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportForm;

