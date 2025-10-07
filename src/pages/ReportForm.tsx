import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MapPin, Upload, Navigation, Loader as Loader2, Search } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { z } from 'zod';
import { BasemapSwitcher } from '@/components/map/BasemapSwitcher';
import { reverseGeocode, geocodeAddress, formatAddress } from '@/lib/geocoding';

const reportSchema = z.object({
  title: z.string().min(5, { message: 'Judul minimal 5 karakter' }).max(100),
  description: z.string().min(10, { message: 'Deskripsi minimal 10 karakter' }).max(1000),
  category: z.enum(['jalan', 'jembatan', 'lampu', 'drainase', 'taman', 'lainnya']),
});

const markerIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAzMiA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTYgNDhDMTYgNDggMzIgMjguNCAzMiAxNkMzMiA3LjE2MzQ0IDI0LjgzNjYgMCAxNiAwQzcuMTYzNDQgMCAwIDcuMTYzNDQgMCAxNkMwIDI4LjQgMTYgNDggMTYgNDhaIiBmaWxsPSIjMzk4MmY2Ii8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [0, -48],
});

const DraggableMarker = ({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) => {
  const [markerPosition, setMarkerPosition] = useState(position);
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        setMarkerPosition([latlng.lat, latlng.lng]);
        onPositionChange(latlng.lat, latlng.lng);
      }
    },
  };

  return <Marker position={markerPosition} draggable={true} eventHandlers={eventHandlers} ref={markerRef} icon={markerIcon} />;
};

const MapClickHandler = ({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const FlyToLocation = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom);
  }, [center, zoom, map]);

  return null;
};

const ReportForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    getUserLocation();
  }, [user, navigate]);

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
          console.log('Error getting location:', error);
          setLocation({ latitude: -6.2088, longitude: 106.8456 });
        }
      );
    }
  };

  const getLocationName = async (lat: number, lng: number) => {
    try {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        setLocation((prev) => ({
          ...prev!,
          name: formatAddress(result),
        }));
      }
    } catch (error) {
      console.error('Error getting location name:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const results = await geocodeAddress(searchQuery);
      if (results.length > 0) {
        const first = results[0];
        setLocation({
          latitude: parseFloat(first.lat.toString()),
          longitude: parseFloat(first.lon.toString()),
          name: formatAddress(first),
        });
        toast.success('Lokasi ditemukan!');
      } else {
        toast.error('Lokasi tidak ditemukan');
      }
    } catch (error) {
      toast.error('Gagal mencari lokasi');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleMarkerDrag = (lat: number, lng: number) => {
    setLocation({ latitude: lat, longitude: lng });
    getLocationName(lat, lng);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setLocation({ latitude: lat, longitude: lng });
    getLocationName(lat, lng);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran foto maksimal 5MB');
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
      toast.error('Lokasi belum dipilih');
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

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('report-photos').upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('report-photos').getPublicUrl(fileName);

        photoUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('reports').insert({
        user_id: user!.id,
        title: formData.title,
        description: formData.description,
        category: formData.category as 'jalan' | 'jembatan' | 'lampu' | 'drainase' | 'taman' | 'lainnya',
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.name || null,
        photo_url: photoUrl,
      });

      if (insertError) throw insertError;

      toast.success('Laporan berhasil dikirim!');
      navigate('/map');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Gagal mengirim laporan. Silakan coba lagi.');
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
            <CardDescription>Laporkan masalah infrastruktur publik dengan lengkap</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Judul Laporan *</Label>
                <Input
                  id="title"
                  placeholder="Contoh: Jalan rusak di depan SD Negeri 1"
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
                  <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {photoFile ? 'Ganti Foto' : 'Upload Foto'}
                  </Button>
                  {photoFile && <span className="text-sm text-muted-foreground">{photoFile.name}</span>}
                </div>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg mt-2" />
                )}
              </div>

              <div className="space-y-2">
                <Label>Lokasi *</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Cari alamat..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                    />
                    <Button type="button" onClick={handleSearch} disabled={searchLoading} variant="outline">
                      {searchLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {location && (
                    <div className="relative h-80 rounded-lg overflow-hidden border">
                      <MapContainer
                        center={[location.latitude, location.longitude]}
                        zoom={15}
                        className="h-full w-full"
                        zoomControl={true}
                      >
                        <BasemapSwitcher />
                        <FlyToLocation center={[location.latitude, location.longitude]} zoom={15} />
                        <MapClickHandler onMapClick={handleMapClick} />
                        <DraggableMarker
                          position={[location.latitude, location.longitude]}
                          onPositionChange={handleMarkerDrag}
                        />
                      </MapContainer>

                      <Button
                        type="button"
                        onClick={getUserLocation}
                        className="absolute top-2 left-2 z-[1000]"
                        size="sm"
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Lokasi Saya
                      </Button>
                    </div>
                  )}

                  {location?.name && (
                    <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                      <MapPin className="w-4 h-4 text-primary mt-0.5" />
                      <span>{location.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Klik pada peta atau geser pin untuk menyesuaikan lokasi
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/map')}
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
                    'Kirim Laporan'
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
