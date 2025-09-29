import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Upload, Navigation, Loader2 } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { z } from "zod";

const TEMP_MAPBOX_TOKEN = "pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtNXRxdzltbTBoa2cybHB6OTNscnU2Y2UifQ.gHvsKRI71gKBBxacxzj3Ew";

const reportSchema = z.object({
  title: z.string().min(5, { message: "Judul minimal 5 karakter" }).max(100),
  description: z.string().min(10, { message: "Deskripsi minimal 10 karakter" }).max(1000),
  category: z.enum(["jalan", "jembatan", "lampu", "drainase", "taman", "lainnya"]),
});

const ReportForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    getUserLocation();
  }, [user, navigate]);

  useEffect(() => {
    if (!mapContainer.current || !location) return;

    mapboxgl.accessToken = TEMP_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [location.longitude, location.latitude],
      zoom: 15,
    });

    marker.current = new mapboxgl.Marker({ draggable: true, color: "#3b82f6" })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current);

    marker.current.on("dragend", () => {
      const lngLat = marker.current!.getLngLat();
      setLocation({
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      });
      getLocationName(lngLat.lat, lngLat.lng);
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, [location?.latitude, location?.longitude]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ latitude: lat, longitude: lng });
          getLocationName(lat, lng);
        },
        (error) => {
          console.log("Error getting location:", error);
          // Default to Jakarta if location access denied
          setLocation({ latitude: -6.2088, longitude: 106.8456 });
        }
      );
    }
  };

  const getLocationName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TEMP_MAPBOX_TOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        setLocation((prev) => ({
          ...prev!,
          name: data.features[0].place_name,
        }));
      }
    } catch (error) {
      console.error("Error getting location name:", error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran foto maksimal 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      toast.error("Lokasi belum dipilih");
      return;
    }

    setLoading(true);

    try {
      const validation = reportSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      let photoUrl = null;

      // Upload photo if exists
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("report-photos")
          .getPublicUrl(fileName);

        photoUrl = publicUrlData.publicUrl;
      }

      // Insert report
      const { error: insertError } = await supabase.from("reports").insert({
        user_id: user!.id,
        title: formData.title,
        description: formData.description,
        category: formData.category as "jalan" | "jembatan" | "lampu" | "drainase" | "taman" | "lainnya",
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.name || null,
        photo_url: photoUrl,
      });

      if (insertError) throw insertError;

      toast.success("Laporan berhasil dikirim!");
      navigate("/map");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Gagal mengirim laporan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Buat Laporan Baru</CardTitle>
            <CardDescription>
              Laporkan masalah infrastruktur publik dengan lengkap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Judul Laporan *</Label>
                <Input
                  id="title"
                  placeholder="Contoh: Jalan rusak di depan SD Negeri 1"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
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

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi *</Label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan masalah secara detail..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              {/* Photo Upload */}
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
                    <span className="text-sm text-muted-foreground">
                      {photoFile.name}
                    </span>
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

              {/* Location Map */}
              <div className="space-y-2">
                <Label>Lokasi *</Label>
                <div className="space-y-2">
                  <div className="relative h-64 rounded-lg overflow-hidden border">
                    <div ref={mapContainer} className="absolute inset-0" />
                    <Button
                      type="button"
                      onClick={getUserLocation}
                      className="absolute top-2 left-2 z-10"
                      size="sm"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Lokasi Saya
                    </Button>
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
