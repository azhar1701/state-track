import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { reverseGeocode, geocodeAddress, formatAddress, type GeocodingResult } from '@/lib/geocoding';

type Severity = 'ringan' | 'sedang' | 'berat';
type Category = 'jalan' | 'jembatan' | 'irigasi' | 'drainase' | 'sungai' | 'lainnya';

type ReportFormData = {
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  reporterName: string;
  phone: string;
  kecamatan: string;
  desa: string;
};

const reportSchema = z.object({
  title: z.string().min(5, { message: 'Judul minimal 5 karakter' }).max(100),
  description: z.string().min(10, { message: 'Deskripsi minimal 10 karakter' }).max(2000),
  category: z.enum(['jalan', 'jembatan', 'irigasi', 'drainase', 'sungai', 'lainnya']),
  severity: z.enum(['ringan', 'sedang', 'berat']),
  reporterName: z.string().min(3, { message: 'Nama minimal 3 karakter' }).max(120),
  phone: z.string().min(8).max(20).regex(/^\+?[0-9\s-]+$/, { message: 'Nomor telepon tidak valid' }),
  kecamatan: z.string().min(2).max(120),
  desa: z.string().min(2).max(120),
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
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  const DRAFT_KEY = 'report_form_draft_v2';
  const savedDraft = useMemo((): ReportFormData | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? (JSON.parse(raw) as ReportFormData) : null;
    } catch {
      return null;
    }
  }, []);

  const [formData, setFormData] = useState<ReportFormData>(
    savedDraft ?? {
      title: '',
      description: '',
      category: 'jalan',
      severity: 'sedang',
      reporterName: '',
      phone: '',
      kecamatan: '',
      desa: '',
    }
  );
  // Autosave draft
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch {
      // ignore quota/serialization errors
    }
  }, [formData]);

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ReportFormData | 'location', string>>>({});
  const [kecamatanList, setKecamatanList] = useState<Array<{ id: string; name: string }>>([]);
  const [desaList, setDesaList] = useState<Array<{ id: string; name: string; kecamatan_id: string }>>([]);
  const [allDesaList, setAllDesaList] = useState<Array<{ id: string; name: string; kecamatan_id: string }>>([]);
  const [selectedKecamatanId, setSelectedKecamatanId] = useState<string | null>(null);
  const [selectedDesaId, setSelectedDesaId] = useState<string | null>(null);


  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const searchTimerRef = useRef<number | null>(null);

  const getLocationName = useCallback(async (lat: number, lng: number) => {
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
  }, []);

  const getUserLocation = useCallback(() => {
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
  }, [getLocationName]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    getUserLocation();
  }, [user, navigate, getUserLocation]);

  // Load kecamatan and all desa on mount
  useEffect(() => {
    const loadKecamatan = async () => {
      if (!isSupabaseConfigured) return;
      const { data, error } = await supabase.from('kecamatan').select('id,name').order('name');
      if (!error && data) {
        setKecamatanList(data as Array<{ id: string; name: string }>);
      }
    };
    const loadAllDesa = async () => {
      if (!isSupabaseConfigured) return;
      const { data, error } = await supabase.from('desa').select('id,name,kecamatan_id').order('name');
      if (!error && data) {
        setAllDesaList(data as Array<{ id: string; name: string; kecamatan_id: string }>);
      }
    };
    void loadKecamatan();
    void loadAllDesa();
  }, []);

  // When kecamatan list is loaded, if draft contains kecamatan name, preselect it
  useEffect(() => {
    if (formData.kecamatan && kecamatanList.length > 0 && !selectedKecamatanId) {
      const match = kecamatanList.find(k => k.name.toLowerCase() === formData.kecamatan.toLowerCase());
      if (match) setSelectedKecamatanId(match.id);
    }
  }, [kecamatanList, formData.kecamatan, selectedKecamatanId]);

  // Load desa when kecamatan changes
  useEffect(() => {
    const loadDesa = async () => {
      if (!isSupabaseConfigured || !selectedKecamatanId) { setDesaList([]); return; }
      const { data, error } = await supabase
        .from('desa')
        .select('id,name,kecamatan_id')
        .eq('kecamatan_id', selectedKecamatanId)
        .order('name');
      if (!error && data) {
        setDesaList(data as Array<{ id: string; name: string; kecamatan_id: string }>);
      }
    };
    void loadDesa();
  }, [selectedKecamatanId]);

  // When allDesaList is available, if draft contains desa name, preselect and sync kecamatan
  useEffect(() => {
    if (formData.desa && allDesaList.length > 0 && !selectedDesaId) {
      const match = allDesaList.find(d => d.name.toLowerCase() === formData.desa.toLowerCase());
      if (match) {
        setSelectedDesaId(match.id);
        if (!selectedKecamatanId) {
          setSelectedKecamatanId(match.kecamatan_id);
          const kec = kecamatanList.find(k => k.id === match.kecamatan_id);
          if (kec) setFormData((prev) => ({ ...prev, kecamatan: kec.name }));
        }
      }
    }
  }, [allDesaList, formData.desa, selectedDesaId, selectedKecamatanId, kecamatanList]);

  // Realtime validation
  useEffect(() => {
    const parsed = reportSchema.safeParse(formData);
    if (parsed.success) {
      setErrors((prev) => ({ ...prev, title: undefined, description: undefined, category: undefined, severity: undefined, damageLevel: undefined, reporterName: undefined, phone: undefined, kecamatan: undefined, desa: undefined }));
    } else {
      const next: Partial<Record<keyof ReportFormData, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ReportFormData;
        if (!next[field]) next[field] = issue.message;
      }
      setErrors((prev) => ({ ...prev, ...next }));
    }
  }, [formData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await geocodeAddress(searchQuery);
      setSearchResults(results);
      if (results.length === 0) toast.error('Lokasi tidak ditemukan');
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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Limit to 10 photos to keep upload reasonable
    const selected = files.slice(0, 10);
    const oversize = selected.find((f) => f.size > 5 * 1024 * 1024);
    if (oversize) {
      toast.error('Ukuran setiap foto maksimal 5MB');
      return;
    }
    setPhotoFiles(selected);
    // build previews
    Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then(setPhotoPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      toast.error('Lokasi belum dipilih');
      setErrors((prev) => ({ ...prev, location: 'Lokasi wajib dipilih' }));
      return;
    }

    if (!isSupabaseConfigured) {
      toast.error('Supabase belum dikonfigurasi. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di .env.local');
      return;
    }

  setLoading(true);
  setUploadPercent(5);

    try {
      const validation = reportSchema.safeParse(formData);
      if (!validation.success) {
        // Hentikan loading jika validasi gagal agar tombol tidak terkunci
        setLoading(false);
        toast.error(validation.error.errors[0].message);
        // surface first error
        const first = validation.error.errors[0];
        if (first && first.path[0]) {
          setErrors((prev) => ({ ...prev, [first.path[0] as keyof ReportFormData]: first.message }));
        }
        return;
      }

  // Prevent duplicates (simple client-side): block similar submissions for 2 minutes based on title+rounded coords
  try {
    const k = `dup_${formData.title}_${Math.round(location.latitude*1000)}_${Math.round(location.longitude*1000)}`;
    const last = sessionStorage.getItem(k);
    if (last && Date.now() - Number(last) < 2 * 60 * 1000) {
      toast.error('Laporan serupa baru saja dikirim. Coba ubah detail atau tunggu sebentar.');
      setLoading(false);
      return;
    }
    sessionStorage.setItem(k, String(Date.now()));
  } catch {
    // ignore sessionStorage failures
  }

  let photoUrl: string | null = null;
  const photoUrls: string[] = [];

      if (photoFiles.length > 0) {
        setUploadPercent(10);
        for (let i = 0; i < photoFiles.length; i++) {
          const file = photoFiles[i];
          const ext = file.name.split('.').pop();
          const fileName = `${user!.id}/${Date.now()}_${i}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('report-photos')
            .upload(fileName, file, { contentType: file.type, upsert: false });
          if (uploadError) {
            const msg = (uploadError as unknown as { message?: string })?.message?.toLowerCase() ?? '';
            if (msg.includes('bucket') && msg.includes('not')) {
              toast.warning('Bucket penyimpanan foto tidak ditemukan. Laporan akan dikirim tanpa foto. Hubungi admin untuk membuat bucket "report-photos".');
              break;
            } else {
              throw uploadError;
            }
          } else {
            const { data: publicUrlData } = supabase.storage.from('report-photos').getPublicUrl(fileName);
            photoUrls.push(publicUrlData.publicUrl);
          }
          const prog = 10 + Math.round(((i + 1) / photoFiles.length) * 50);
          setUploadPercent(Math.min(60, prog));
        }
        photoUrl = photoUrls[0] || null;
      }

      setUploadPercent((p) => (p !== null && p < 80 ? 80 : p));
      const { data: inserted, error: insertError } = await supabase.from('reports').insert({
        user_id: user!.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: 'baru',
        latitude: location.latitude,
        longitude: location.longitude,
        location_name: location.name || null,
        photo_url: photoUrl,
        severity: formData.severity,
        reporter_name: formData.reporterName,
        phone: formData.phone,
        kecamatan: formData.kecamatan,
        desa: formData.desa,
      }).select('id').single();

      if (insertError) throw insertError;

      toast.success('Laporan berhasil dikirim!');
      // Clear draft
      try { localStorage.removeItem(DRAFT_KEY); } catch {
        // ignore removeItem failures
      }
      setUploadPercent(100);
      const id = inserted?.id as string | number | undefined;
      navigate(id ? `/report/success?id=${id}` : '/report/success');
    } catch (error) {
      console.error('Error submitting report:', error);
      // Tampilkan pesan error yang lebih informatif untuk kasus umum Supabase
      let message = 'Gagal mengirim laporan. Silakan coba lagi.';
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        const msg = typeof errObj.message === 'string' ? errObj.message : undefined;
        const details = typeof errObj.details === 'string' ? errObj.details : undefined;
        const hint = typeof errObj.hint === 'string' ? errObj.hint : undefined;
        const combined = [msg, details, hint].filter(Boolean).join(' | ');

        if (combined) {
          message = combined;
        }

        const lower = combined.toLowerCase();
        if (lower.includes('row-level security') || lower.includes('permission denied')) {
          message = 'Izin ditolak saat menyimpan laporan. Pastikan Anda login dan memiliki akses.';
        } else if (lower.includes('report_category')) {
          message = 'Kategori tidak valid. Silakan pilih salah satu kategori yang tersedia.';
        } else if (lower.includes('bucket') && lower.includes('not')) {
          message = 'Bucket foto tidak ditemukan. Laporan dikirim tanpa foto.';
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
      setUploadPercent(null);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-6">
      <div className="container max-w-4xl">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Buat Laporan Baru</CardTitle>
            <CardDescription>Laporkan masalah infrastruktur publik dengan lengkap</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Judul Laporan *</Label>
                <Input
                  id="title"
                  placeholder="Contoh: Jalan rusak di depan SD Negeri 1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as Category })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jalan">Jalan</SelectItem>
                    <SelectItem value="jembatan">Jembatan</SelectItem>
                    <SelectItem value="irigasi">Irigasi</SelectItem>
                    <SelectItem value="drainase">Drainase</SelectItem>
                    <SelectItem value="sungai">Sungai</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-600">{errors.category}</p>}
              </div>

              {/* Reordered: Severity */}
              <div className="space-y-2">
                <Label htmlFor="severity">Tingkat Keparahan *</Label>
                <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v as Severity })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ringan">Ringan</SelectItem>
                    <SelectItem value="sedang">Sedang</SelectItem>
                    <SelectItem value="berat">Berat</SelectItem>
                  </SelectContent>
                </Select>
                {errors.severity && <p className="text-sm text-red-600">{errors.severity}</p>}
              </div>

              {/* Description */}
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
                {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
              </div>

              {/* Kecamatan dropdown (placed before Desa) */}
              <div className="space-y-2">
                <Label htmlFor="kecamatan">Kecamatan *</Label>
                <Select
                  value={selectedKecamatanId ?? ''}
                  onValueChange={(value) => {
                    setSelectedKecamatanId(value);
                    const kec = kecamatanList.find(k => k.id === value);
                    if (kec) {
                      setFormData((prev) => ({ ...prev, kecamatan: kec.name }));
                      // Reset desa if not part of selected kecamatan
                      const currentDesa = (selectedDesaId ? allDesaList.find(d => d.id === selectedDesaId) : undefined);
                      if (!currentDesa || currentDesa.kecamatan_id !== value) {
                        setSelectedDesaId(null);
                        setFormData((prev) => ({ ...prev, desa: '' }));
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kecamatan" />
                  </SelectTrigger>
                  <SelectContent>
                    {kecamatanList.map(k => (
                      <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.kecamatan && <p className="text-sm text-red-600">{errors.kecamatan}</p>}
              </div>

              {/* Desa dropdown (filtered by selected kecamatan) */}
              <div className="space-y-2">
                <Label htmlFor="desa">Desa/Kelurahan *</Label>
                <Select
                  value={selectedDesaId ?? ''}
                  onValueChange={(value) => {
                    const desa = desaList.find(d => d.id === value);
                    setSelectedDesaId(value);
                    if (desa) {
                      setFormData((prev) => ({ ...prev, desa: desa.name }));
                    }
                  }}
                  disabled={!selectedKecamatanId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedKecamatanId ? 'Pilih desa' : 'Pilih kecamatan dulu'} />
                  </SelectTrigger>
                  <SelectContent>
                    {desaList.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.desa && <p className="text-sm text-red-600">{errors.desa}</p>}
              </div>

              {/* Nama Pelapor */}
              <div className="space-y-2">
                <Label htmlFor="reporterName">Nama Pelapor *</Label>
                <Input id="reporterName" value={formData.reporterName}
                       onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })} />
                {errors.reporterName && <p className="text-sm text-red-600">{errors.reporterName}</p>}
              </div>

              {/* Nomor Pelapor */}
              <div className="space-y-2">
                <Label htmlFor="phone">Kontak Pelapor *</Label>
                <Input id="phone" inputMode="tel" value={formData.phone}
                       onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
              </div>

              

              <div className="space-y-2">
                <Label htmlFor="photo">Foto (Opsional)</Label>
                <div className="flex items-center gap-4">
                  <Input id="photo" type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo')?.click()}
                  >
                    <Upload className="icon-sm mr-2" />
                    {photoFiles.length > 0 ? `Ganti Foto (${photoFiles.length})` : 'Upload Foto'}
                  </Button>
                  {photoFiles.length > 0 && <span className="text-sm text-muted-foreground">{photoFiles.slice(0,3).map(f=>f.name).join(', ')}{photoFiles.length>3 ? ` +${photoFiles.length-3} lagi` : ''}</span>}
                </div>
                {photoPreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photoPreviews.map((src, idx) => (
                      <img key={idx} src={src} alt={`Preview ${idx+1}`} className="w-full h-28 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Lokasi *</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative w-full">
                      <Input
                        placeholder="Cari alamat (min 3 huruf)..."
                        value={searchQuery}
                        onChange={(e) => {
                          const q = e.target.value;
                          setSearchQuery(q);
                          if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
                          if (q.trim().length < 3) { setSearchResults([]); return; }
                          searchTimerRef.current = window.setTimeout(async () => {
                            try {
                              const results = await geocodeAddress(q);
                              setSearchResults(results);
                            } catch {
                              setSearchResults([]);
                            }
                          }, 400);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); void handleSearch(); }
                        }}
                      />
                      {searchQuery && searchResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {searchResults.map((r) => (
                            <button
                              type="button"
                              key={`${r.lat}-${r.lon}-${r.display_name}`}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground whitespace-normal"
                              onClick={() => {
                                const lat = Number(r.lat); const lon = Number(r.lon);
                                setLocation({ latitude: lat, longitude: lon, name: formatAddress(r) });
                                setSearchResults([]);
                                toast.success('Lokasi dipilih');
                              }}
                            >
                              {formatAddress(r)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button type="button" onClick={handleSearch} disabled={searchLoading} variant="outline">
                      {searchLoading ? (
                        <Loader2 className="icon-sm animate-spin" />
                      ) : (
                        <Search className="icon-sm" />
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

                      {/* Move 'Lokasi Saya' away from zoom controls (bottom-left) */}
                      <Button
                        type="button"
                        onClick={getUserLocation}
                        className="absolute bottom-2 left-2 z-[1000]"
                        size="sm"
                      >
                        <Navigation className="icon-sm mr-2" />
                        Lokasi Saya
                      </Button>
                    </div>
                  )}

                  {errors.location && (
                    <p className="text-sm text-red-600">{errors.location}</p>
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
                      {uploadPercent !== null ? `Mengirim ${uploadPercent}%` : 'Mengirim...'}
                    </>
                  ) : (
                    'Kirim Laporan'
                  )}
                </Button>
              </div>
              {uploadPercent !== null && (
                <div className="w-full h-2 bg-muted rounded">
                  <div className="h-2 bg-primary rounded" style={{ width: `${uploadPercent}%` }} />
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportForm;
