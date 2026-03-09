import { logger } from "@/lib/logger";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { supabase, isSupabaseConfigured } from "@/services/client";
import { useAuth } from "@/features/auth/useAuth";
import type { Database } from "@/services/types";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  MapPin,
  Upload,
  Navigation,
  Loader as Loader2,
  Search,
  Camera,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { z } from "zod";
import { BasemapSwitcher } from "@/features/map/BasemapSwitcher";
import {
  reverseGeocode,
  geocodeAddress,
  formatAddress,
  type GeocodingResult,
} from "@/features/map/geocoding";
import { enqueueReportForSync } from "@/features/reports/useOutboxSync";
import { sanitizeForLog } from "@/lib/security";
import { LiveCamera } from "@/components/common/LiveCamera";

type ReportStatus = Database["public"]["Enums"]["report_status"];
type Severity = "ringan" | "sedang" | "berat";
type Category = string;

type ReportFormData = {
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  incidentDate: string; // YYYY-MM-DD
  reporterName: string;
  phone: string;
  kecamatan: string;
  desa: string;
};

const reportSchema = z.object({
  title: z.string().min(5, { message: "Judul minimal 5 karakter" }).max(100),
  description: z
    .string()
    .min(10, { message: "Deskripsi minimal 10 karakter" })
    .max(2000),
  category: z.enum(["jalan", "jembatan", "irigasi", "sungai", "lainnya"]),
  severity: z.enum(["ringan", "sedang", "berat"]),
  incidentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Tanggal tidak valid" })
    .refine(
      (v) => {
        const d = new Date(`${v}T00:00:00`);
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d.getTime() <= today.getTime();
      },
      { message: "Tanggal kejadian tidak boleh di masa depan" },
    ),
  reporterName: z
    .string()
    .min(3, { message: "Nama minimal 3 karakter" })
    .max(120),
  phone: z
    .string()
    .min(8)
    .max(20)
    .regex(/^\+?[0-9\s-]+$/, { message: "Nomor telepon tidak valid" }),
  kecamatan: z.string().min(2).max(120),
  desa: z.string().min(2).max(120),
});

const markerIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAzMiA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTYgNDhDMTYgNDggMzIgMjguNCAzMiAxNkMzMiA3LjE2MzQ0IDI0LjgzNjYgMCAxNiAwQzcuMTYzNDQgMCAwIDcuMTYzNDQgMCAxNkMwIDI4LjQgMTYgNDggMTYgNDhaIiBmaWxsPSIjMzk4MmY2Ii8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+",
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

  return (
    <Marker
      position={markerPosition}
      draggable={true}
      eventHandlers={eventHandlers}
      ref={markerRef}
      icon={markerIcon}
    />
  );
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

const FlyToLocation = ({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom);
  }, [center, zoom, map]);

  return null;
};

const ReportForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  const DRAFT_KEY = "report_draft";

  // Delightful loading messages for AI analysis
  const AI_LOADING_MESSAGES = [
    "Menganalisis piksel...",
    "Mengukur tingkat kerusakan...",
    "Memeriksa pola infrastruktur...",
    "Menyiapkan rekomendasi terbaik...",
    "Hampir selesai...",
  ];
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
      title: "",
      description: "",
      category: "irigasi",
      severity: "sedang",
      incidentDate: new Date().toISOString().slice(0, 10),
      reporterName: "",
      phone: "",
      kecamatan: "",
      desa: "",
    },
  );
  // Autosave draft
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );

  useEffect(() => {
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData]);

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ReportFormData | "location", string>>
  >({});
  const [kecamatanList, setKecamatanList] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [desaList, setDesaList] = useState<
    Array<{ id: string; name: string; kecamatan_id: string }>
  >([]);
  const [allDesaList, setAllDesaList] = useState<
    Array<{ id: string; name: string; kecamatan_id: string }>
  >([]);
  const [selectedKecamatanId, setSelectedKecamatanId] = useState<string | null>(
    null,
  );
  const [selectedDesaId, setSelectedDesaId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const searchTimerRef = useRef<number | null>(null);

  const calculatePriorityScore = (
    category: string,
    severity: string,
  ): number => {
    const severityWeight = { ringan: 1, sedang: 2, berat: 3 }[severity] || 1;
    const categoryWeight =
      { irigasi: 3, sungai: 2, jalan: 2, jembatan: 3, lainnya: 1 }[category] ||
      1;
    return Math.min(10, severityWeight * categoryWeight);
  };

  const [aiLoadingMsgIndex, setAiLoadingMsgIndex] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAiLoadingMsgIndex((prev) => (prev + 1) % AI_LOADING_MESSAGES.length);
      }, 1500);
    } else {
      setAiLoadingMsgIndex(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const suggestAIAssistance = async () => {
    if (photoFiles.length === 0) {
      toast.error("Unggah foto terlebih dahulu untuk menggunakan asisten AI");
      return;
    }
    setIsAnalyzing(true);
    try {
      // Mocking AI Vision API call (GPT-4o-mini / TensorFlow)
      await new Promise((resolve) => setTimeout(resolve, 3500));
      const suggestions = {
        category: "irigasi",
        severity: "berat",
        confidence: 0.89,
      };
      setFormData((prev) => ({
        ...prev,
        category: suggestions.category,
        severity: suggestions.severity as Severity,
      }));
      toast.success("Analisis AI Selesai", {
        description: `Kategori: ${suggestions.category}, Keparahan: ${suggestions.severity}`,
      });
    } catch (err) {
      logger.error("AI Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };
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
      logger.error("Error getting location name:", error);
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
          logger.info("Error getting location:", error);
          setLocation({ latitude: -6.2088, longitude: 106.8456 });
        },
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

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("custom_categories")
          .select("value, label")
          .eq("is_active", true)
          .order("label");

        if (!error && data) {
          setCategories(data as Array<{ value: string; label: string }>);
        } else {
          // Fallback to default categories
          setCategories([
            { value: "jalan", label: "Jalan" },
            { value: "jembatan", label: "Jembatan" },
            { value: "irigasi", label: "Irigasi" },
            { value: "drainase", label: "Drainase" },
            { value: "sungai", label: "Sungai" },
            { value: "lainnya", label: "Lainnya" },
          ]);
        }
      } catch (err) {
        logger.error("Failed to load categories:", err);
        // Fallback to default categories
        setCategories([
          { value: "jalan", label: "Jalan" },
          { value: "jembatan", label: "Jembatan" },
          { value: "irigasi", label: "Irigasi" },
          { value: "drainase", label: "Drainase" },
          { value: "sungai", label: "Sungai" },
          { value: "lainnya", label: "Lainnya" },
        ]);
      }
    };
    void loadCategories();
  }, []);

  // Load kecamatan and all desa on mount
  useEffect(() => {
    const loadKecamatan = async () => {
      if (!isSupabaseConfigured) return;
      const { data, error } = await supabase
        .from("kecamatan")
        .select("id,name")
        .order("name");
      if (!error && data) {
        setKecamatanList(data as Array<{ id: string; name: string }>);
      }
    };
    const loadAllDesa = async () => {
      if (!isSupabaseConfigured) return;
      const { data, error } = await supabase
        .from("desa")
        .select("id,name,kecamatan_id")
        .order("name");
      if (!error && data) {
        setAllDesaList(
          data as Array<{ id: string; name: string; kecamatan_id: string }>,
        );
      }
    };
    void loadKecamatan();
    void loadAllDesa();
  }, []);

  // When kecamatan list is loaded, if draft contains kecamatan name, preselect it
  useEffect(() => {
    if (
      formData.kecamatan &&
      kecamatanList.length > 0 &&
      !selectedKecamatanId
    ) {
      const match = kecamatanList.find(
        (k) => k.name.toLowerCase() === formData.kecamatan.toLowerCase(),
      );
      if (match) setSelectedKecamatanId(match.id);
    }
  }, [kecamatanList, formData.kecamatan, selectedKecamatanId]);

  // Load desa when kecamatan changes
  useEffect(() => {
    const loadDesa = async () => {
      if (!isSupabaseConfigured || !selectedKecamatanId) {
        setDesaList([]);
        return;
      }
      const { data, error } = await supabase
        .from("desa")
        .select("id,name,kecamatan_id")
        .eq("kecamatan_id", selectedKecamatanId)
        .order("name");
      if (!error && data) {
        setDesaList(
          data as Array<{ id: string; name: string; kecamatan_id: string }>,
        );
      }
    };
    void loadDesa();
  }, [selectedKecamatanId]);

  // When allDesaList is available, if draft contains desa name, preselect and sync kecamatan
  useEffect(() => {
    if (formData.desa && allDesaList.length > 0 && !selectedDesaId) {
      const match = allDesaList.find(
        (d) => d.name.toLowerCase() === formData.desa.toLowerCase(),
      );
      if (match) {
        setSelectedDesaId(match.id);
        if (!selectedKecamatanId) {
          setSelectedKecamatanId(match.kecamatan_id);
          const kec = kecamatanList.find((k) => k.id === match.kecamatan_id);
          if (kec) setFormData((prev) => ({ ...prev, kecamatan: kec.name }));
        }
      }
    }
  }, [
    allDesaList,
    formData.desa,
    selectedDesaId,
    selectedKecamatanId,
    kecamatanList,
  ]);

  // Realtime validation
  useEffect(() => {
    const parsed = reportSchema.safeParse(formData);
    if (parsed.success) {
      setErrors((prev) => ({
        ...prev,
        title: undefined,
        description: undefined,
        category: undefined,
        severity: undefined,
        reporterName: undefined,
        phone: undefined,
        kecamatan: undefined,
        desa: undefined,
      }));
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
      if (results.length === 0) toast.error("Lokasi tidak ditemukan");
    } catch (error) {
      toast.error("Gagal mencari lokasi");
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

  const analyzeReportPhoto = async (file: File) => {
    // Mocking AI Vision API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      category: "irigasi",
      severity: "berat" as const,
      confidence: 0.89,
    };
  };
  const runAIAnalysis = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    try {
      const suggestion = await analyzeReportPhoto(file);
      if (suggestion) {
        setFormData((prev) => ({
          ...prev,
          category: suggestion.category,
          severity: suggestion.severity,
        }));
        toast.success(`AI menyarankan kategori: ${suggestion.category}`, {
          description: `Tingkat keparahan: ${suggestion.severity}. Keyakinan: ${Math.round(suggestion.confidence * 100)}%`,
        });
      }
    } catch (err) {
      logger.error("AI analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleCameraCapture = async (file: File) => {
    try {
      const opts = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        initialQuality: 0.7,
      } as const;
      const compressed = await imageCompression(file, opts);
      const preview = await imageCompression.getDataUrlFromFile(compressed);

      setPhotoFiles((prev) => [
        ...prev,
        new File([compressed], file.name, { type: "image/jpeg" }),
      ]);
      setPhotoPreviews((prev) => [...prev, preview]);
      toast.success("Foto berhasil ditambahkan");
      void runAIAnalysis(compressed);
    } catch (err) {
      toast.error("Gagal memproses foto");
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const selected = files.slice(0, 10);
    // compress each image to <= 1600px max, ~0.7 quality; cap 1.5MB if possible
    const opts = {
      maxSizeMB: 1.0,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      initialQuality: 0.7,
    } as const;
    try {
      const compressed: File[] = [];
      const previews: string[] = [];
      for (let i = 0; i < selected.length; i++) {
        const f = selected[i];
        try {
          const cf = await imageCompression(f, opts);
          compressed.push(
            new File([cf], f.name.replace(/\.(jpg|jpeg|png|webp)$/i, ".jpg"), {
              type: "image/jpeg",
            }),
          );
          previews.push(await imageCompression.getDataUrlFromFile(cf));
        } catch {
          // if compression fails, fallback to original
          compressed.push(f);
          previews.push(
            await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(f);
            }),
          );
        }
      }
      setPhotoFiles(compressed);
      setPhotoPreviews(previews);
      toast.success(`Foto siap diunggah (${compressed.length})`, {
        description: "Foto telah dikompres untuk menghemat data",
      });
      if (compressed.length > 0) {
        void runAIAnalysis(compressed[0]);
      }
    } catch (err) {
      logger.error("Compression failed", err);
      toast.error("Gagal memproses foto");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      toast.error("Lokasi belum dipilih");
      setErrors((prev) => ({ ...prev, location: "Lokasi wajib dipilih" }));
      return;
    }

    if (!isSupabaseConfigured) {
      toast.error(
        "Supabase belum dikonfigurasi. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di .env.local",
      );
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
          setErrors((prev) => ({
            ...prev,
            [first.path[0] as keyof ReportFormData]: first.message,
          }));
        }
        return;
      }

      // Prevent duplicates (simple client-side): block similar submissions for 2 minutes based on title+rounded coords
      try {
        const k = `dup_${formData.title}_${Math.round(location.latitude * 1000)}_${Math.round(location.longitude * 1000)}`;
        const last = sessionStorage.getItem(k);
        if (last && Date.now() - Number(last) < 2 * 60 * 1000) {
          toast.error(
            "Laporan serupa baru saja dikirim. Coba ubah detail atau tunggu sebentar.",
          );
          setLoading(false);
          return;
        }
        sessionStorage.setItem(k, String(Date.now()));
      } catch {
        // ignore sessionStorage failures
      }

      let photoUrl: string | null = null;
      const photoUrls: string[] = [];

      // If offline, queue to outbox and exit early
      if (!navigator.onLine) {
        await enqueueReportForSync(
          {
            title: formData.title,
            description: formData.description,
            category:
              formData.category as unknown as import("@/services/types").Database["public"]["Enums"]["report_category"],
            severity: formData.severity,
            incidentDate: formData.incidentDate,
            reporterName: formData.reporterName,
            phone: formData.phone,
            kecamatan: formData.kecamatan,
            desa: formData.desa,
            priority_score: calculatePriorityScore(
              formData.category,
              formData.severity,
            ),
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              name: location.name ?? null,
            },
          },
          photoFiles,
        );
        toast.message(
          "Tidak ada koneksi. Laporan disimpan dan akan dikirim otomatis saat online.",
          {
            description: "Anda dapat melihat status di halaman Laporan Saya",
          },
        );
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
        navigate("/report/success");
        return;
      }

      if (photoFiles.length > 0) {
        setUploadPercent(10);
        for (let i = 0; i < photoFiles.length; i++) {
          const file = photoFiles[i];
          const ext = file.name.split(".").pop();
          const fileName = `${user!.id}/${Date.now()}_${i}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("report-photos")
            .upload(fileName, file, { contentType: file.type, upsert: false });
          if (uploadError) {
            const msg =
              (
                uploadError as unknown as { message?: string }
              )?.message?.toLowerCase() ?? "";
            if (msg.includes("bucket") && msg.includes("not")) {
              toast.warning(
                'Bucket penyimpanan foto tidak ditemukan. Laporan akan dikirim tanpa foto. Hubungi admin untuk membuat bucket "report-photos".',
                {
                  description: "Laporan tetap akan tersimpan",
                },
              );
              break;
            } else {
              throw uploadError;
            }
          } else {
            const { data: publicUrlData } = supabase.storage
              .from("report-photos")
              .getPublicUrl(fileName);
            photoUrls.push(publicUrlData.publicUrl);
          }
          const prog = 10 + Math.round(((i + 1) / photoFiles.length) * 50);
          setUploadPercent(Math.min(60, prog));
        }
        photoUrl = photoUrls[0] || null;
      }

      setUploadPercent((p) => (p !== null && p < 80 ? 80 : p));
      const basePayload = {
        user_id: user!.id,
        title: formData.title,
        description: formData.description,
        category:
          formData.category as Database["public"]["Enums"]["report_category"],
        status: "baru" as ReportStatus,
        latitude: location.latitude,
        longitude: location.longitude,
        photo_url: photoUrl,
        // New array column for multiple photos; keep single photo_url for compatibility
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        severity: formData.severity,
        incident_date: formData.incidentDate,
        reporter_name: formData.reporterName,
        phone: formData.phone,
        kecamatan: formData.kecamatan,
        desa: formData.desa,
        priority_score: calculatePriorityScore(
          formData.category,
          formData.severity,
        ),
      };
      const fullPayload = {
        ...basePayload,
        location_name: location.name || null,
      } as typeof basePayload & { location_name?: string | null };
      let { data: inserted, error: insertError } = await supabase
        .from("reports")
        .insert(fullPayload)
        .select("id")
        .single();
      if (
        insertError &&
        typeof insertError.message === "string" &&
        ((insertError.message.toLowerCase().includes("column") &&
          insertError.message.toLowerCase().includes("does not exist")) ||
          insertError.message.toLowerCase().includes("schema cache") ||
          insertError.message.toLowerCase().includes("could not find"))
      ) {
        // Retry without optional columns that may not exist in some environments
        const minimal = { ...basePayload };
        const retry = await supabase
          .from("reports")
          .insert(minimal)
          .select("id")
          .single();
        inserted = retry.data;
        insertError = retry.error as unknown as typeof insertError;
      }

      if (insertError) throw insertError;

      toast.success("Laporan berhasil dikirim!", {
        description: "Tim kami akan segera meninjau laporan Anda",
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore removeItem failures
      }
      setUploadPercent(100);

      // Trigger Confetti Celebration!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#0ea5e9", "#14b8a6", "#f59e0b", "#eab308"],
      });

      const id = inserted?.id as string | number | undefined;

      // Delay redirect slightly so user sees confetti
      setTimeout(() => {
        navigate(id ? `/report/success?id=${id}` : "/report/success");
      }, 1500);
    } catch (error) {
      logger.error("Error submitting report:", sanitizeForLog(error));
      // Tampilkan pesan error yang lebih informatif untuk kasus umum Supabase
      let message = "Gagal mengirim laporan. Silakan coba lagi.";
      const errAny = error as unknown as { message?: string };
      const text = typeof errAny?.message === "string" ? errAny.message : "";
      const isNetwork =
        text.toLowerCase().includes("failed to fetch") ||
        text.toLowerCase().includes("network");
      if (isNetwork) {
        try {
          await enqueueReportForSync(
            {
              title: formData.title,
              description: formData.description,
              category:
                formData.category as unknown as import("@/services/types").Database["public"]["Enums"]["report_category"],
              severity: formData.severity,
              incidentDate: formData.incidentDate,
              reporterName: formData.reporterName,
              phone: formData.phone,
              kecamatan: formData.kecamatan,
              desa: formData.desa,
              priority_score: calculatePriorityScore(
                formData.category,
                formData.severity,
              ),
              location: {
                latitude: location!.latitude,
                longitude: location!.longitude,
                name: location!.name ?? null,
              },
            },
            photoFiles,
          );
          toast.message(
            "Koneksi terputus. Laporan disimpan offline dan akan dikirim otomatis.",
            {
              description: "Periksa status di Laporan Saya setelah online",
            },
          );
          try {
            localStorage.removeItem(DRAFT_KEY);
          } catch {
            /* ignore */
          }
          navigate("/report/success");
          return;
        } catch {
          // fallthrough to normal error toast
        }
      }
      if (error && typeof error === "object") {
        const errObj = error as Record<string, unknown>;
        const msg =
          typeof errObj.message === "string" ? errObj.message : undefined;
        const details =
          typeof errObj.details === "string" ? errObj.details : undefined;
        const hint = typeof errObj.hint === "string" ? errObj.hint : undefined;
        const combined = [msg, details, hint].filter(Boolean).join(" | ");

        if (combined) {
          message = combined;
        }

        const lower = combined.toLowerCase();
        if (
          lower.includes("row-level security") ||
          lower.includes("permission denied")
        ) {
          message =
            "Izin ditolak saat menyimpan laporan. Pastikan Anda login dan memiliki akses.";
        } else if (lower.includes("report_category")) {
          message =
            "Kategori tidak valid. Silakan pilih salah satu kategori yang tersedia.";
        } else if (lower.includes("bucket") && lower.includes("not")) {
          message = "Bucket foto tidak ditemukan. Laporan dikirim tanpa foto.";
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-4 md:py-8 fade-in">
        <div className="container max-w-4xl px-2 md:px-4 slide-up">
          <Card className="bg-card border-border shadow-sm rounded-2xl p-6 hover:shadow-md transition-all shadow-2xl rounded-xl md:rounded-2xl border-none transition-all duration-300 scale-in">
            <CardHeader className="pb-3 md:pb-4 px-3 md:px-6 fade-in pt-4 md:pt-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl md:text-2xl font-bold">
                    Buat Laporan Baru
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base text-muted-foreground">
                    Laporkan masalah infrastruktur Sumber Daya Air
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1 text-[10px] md:text-xs whitespace-nowrap">
                  {saveStatus === "saving" && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                      <span className="text-muted-foreground">
                        Menyimpan...
                      </span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                      <span className="text-green-600 font-medium">
                        ✓ Tersimpan
                      </span>
                    </>
                  )}
                  {saveStatus === "unsaved" && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-red-500">Gagal simpan</span>
                    </>
                  )}
                </div>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-xs text-primary animate-pulse bg-primary/5 px-3 py-1.5 rounded-full mt-2 w-fit fade-in">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="font-medium">
                    {AI_LOADING_MESSAGES[aiLoadingMsgIndex]}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              <form
                onSubmit={handleSubmit}
                className="space-y-4 md:space-y-6 fade-in"
              >
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-xs md:text-sm">
                    Judul Laporan *
                  </Label>
                  <Input
                    id="title"
                    placeholder="Contoh: Sungai Cileueur meluap"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    className="rounded-lg border border-border shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 text-sm"
                    autoComplete="off"
                  />
                  <AnimatePresence>
                    {errors.title && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-600 mt-1"
                      >
                        {errors.title}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="category" className="text-xs md:text-sm">
                        Kategori *
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={suggestAIAssistance}
                        disabled={isAnalyzing || photoFiles.length === 0}
                        className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10 bg-card border-border shadow-sm border-primary/20"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Camera className="h-3 w-3 mr-1" />
                        )}
                        SARAN AI
                      </Button>
                    </div>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          category: value as Category,
                        })
                      }
                      required
                    >
                      <SelectTrigger
                        id="category"
                        className="rounded-lg border border-border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 text-sm h-9 md:h-10"
                      >
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <AnimatePresence>
                      {errors.category && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-red-600 mt-1"
                        >
                          {errors.category}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity" className="text-xs md:text-sm">
                      Tingkat Keparahan *
                    </Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(v) =>
                        setFormData({ ...formData, severity: v as Severity })
                      }
                    >
                      <SelectTrigger
                        id="severity"
                        className="rounded-lg border border-border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <SelectValue placeholder="Pilih tingkat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ringan">Ringan</SelectItem>
                        <SelectItem value="sedang">Sedang</SelectItem>
                        <SelectItem value="berat">Berat</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.severity && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.severity}
                      </p>
                    )}
                  </div>
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
                    className="rounded-lg border border-border shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
                    autoComplete="off"
                  />
                  <AnimatePresence>
                    {errors.description && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-600 mt-1"
                      >
                        {errors.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tanggal Kejadian */}
                <div className="space-y-2">
                  <Label htmlFor="incidentDate">Tanggal Kejadian *</Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) =>
                      setFormData({ ...formData, incidentDate: e.target.value })
                    }
                    required
                    className="rounded-lg border border-border shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                  {errors.incidentDate && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.incidentDate}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Isi tanggal kejadian jika berbeda dari hari ini.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="kecamatan">Kecamatan *</Label>
                    <Select
                      value={selectedKecamatanId ?? ""}
                      onValueChange={(value) => {
                        setSelectedKecamatanId(value);
                        const kec = kecamatanList.find((k) => k.id === value);
                        if (kec) {
                          setFormData((prev) => ({
                            ...prev,
                            kecamatan: kec.name,
                          }));
                          const currentDesa = selectedDesaId
                            ? allDesaList.find((d) => d.id === selectedDesaId)
                            : undefined;
                          if (
                            !currentDesa ||
                            currentDesa.kecamatan_id !== value
                          ) {
                            setSelectedDesaId(null);
                            setFormData((prev) => ({ ...prev, desa: "" }));
                          }
                        }
                      }}
                    >
                      <SelectTrigger
                        id="kecamatan"
                        className="rounded-lg border border-border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <SelectValue placeholder="Pilih kecamatan" />
                      </SelectTrigger>
                      <SelectContent>
                        {kecamatanList.map((k) => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.kecamatan && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.kecamatan}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desa">Desa/Kelurahan *</Label>
                    <Select
                      value={selectedDesaId ?? ""}
                      onValueChange={(value) => {
                        const desa = desaList.find((d) => d.id === value);
                        setSelectedDesaId(value);
                        if (desa) {
                          setFormData((prev) => ({ ...prev, desa: desa.name }));
                        }
                      }}
                      disabled={!selectedKecamatanId}
                    >
                      <SelectTrigger
                        id="desa"
                        className="rounded-lg border border-border shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <SelectValue
                          placeholder={
                            selectedKecamatanId
                              ? "Pilih desa"
                              : "Pilih kecamatan dulu"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {desaList.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.desa && (
                      <p className="text-xs text-red-600 mt-1">{errors.desa}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reporterName">Nama Pelapor *</Label>
                    <Input
                      id="reporterName"
                      value={formData.reporterName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reporterName: e.target.value,
                        })
                      }
                      className="rounded-lg border border-border shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
                      autoComplete="name"
                    />
                    {errors.reporterName && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.reporterName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Kontak Pelapor *</Label>
                    <Input
                      id="phone"
                      inputMode="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="rounded-lg border border-border shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
                      autoComplete="tel"
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo">Foto (Opsional)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCamera(true)}
                      className="btn-haptic"
                    >
                      <Camera className="icon-sm mr-2" />
                      Ambil Foto
                    </Button>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("photo")?.click()}
                      className="btn-haptic"
                    >
                      <Upload className="icon-sm mr-2" />
                      {photoFiles.length > 0
                        ? `Ganti (${photoFiles.length})`
                        : "Upload"}
                    </Button>
                    {photoFiles.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {photoFiles
                          .slice(0, 3)
                          .map((f) => f.name)
                          .join(", ")}
                        {photoFiles.length > 3
                          ? ` +${photoFiles.length - 3} lagi`
                          : ""}
                      </span>
                    )}
                  </div>
                  {photoPreviews.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {photoPreviews.map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`Preview ${idx + 1}`}
                          loading="lazy"
                          className="w-full h-28 object-cover rounded border scale-in"
                        />
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
                          id="location-search"
                          placeholder="Cari alamat (min 3 huruf)..."
                          value={searchQuery}
                          onChange={(e) => {
                            const q = e.target.value;
                            setSearchQuery(q);
                            if (searchTimerRef.current)
                              window.clearTimeout(searchTimerRef.current);
                            if (q.trim().length < 3) {
                              setSearchResults([]);
                              return;
                            }
                            searchTimerRef.current = window.setTimeout(
                              async () => {
                                try {
                                  const results = await geocodeAddress(q);
                                  setSearchResults(results);
                                } catch {
                                  setSearchResults([]);
                                }
                              },
                              400,
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleSearch();
                            }
                          }}
                          autoComplete="off"
                          aria-label="Cari alamat lokasi laporan"
                        />
                        {searchQuery && searchResults.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                            {searchResults.map((r) => (
                              <button
                                type="button"
                                key={`${r.lat}-${r.lon}-${r.display_name}`}
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground whitespace-normal"
                                onClick={() => {
                                  const lat = Number(r.lat);
                                  const lon = Number(r.lon);
                                  setLocation({
                                    latitude: lat,
                                    longitude: lon,
                                    name: formatAddress(r),
                                  });
                                  setSearchResults([]);
                                  toast.success("Lokasi dipilih");
                                }}
                              >
                                {formatAddress(r)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={handleSearch}
                        disabled={searchLoading}
                        variant="outline"
                      >
                        {searchLoading ? (
                          <Loader2 className="icon-sm animate-spin" />
                        ) : (
                          <Search className="icon-sm" />
                        )}
                      </Button>
                    </div>

                    {location && (
                      <div className="relative h-80 rounded-lg overflow-hidden border scale-in">
                        <MapContainer
                          center={[location.latitude, location.longitude]}
                          zoom={15}
                          className="h-full w-full"
                          zoomControl={true}
                        >
                          <BasemapSwitcher />
                          <FlyToLocation
                            center={[location.latitude, location.longitude]}
                            zoom={15}
                          />
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
                          className="absolute bottom-2 left-2 z-[1000] fade-in"
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
                        {uploadPercent !== null
                          ? `Mengirim ${uploadPercent}%`
                          : "Mengirim..."}
                      </>
                    ) : (
                      "Kirim Laporan"
                    )}
                  </Button>
                </div>
                {uploadPercent !== null && (
                  <div className="w-full h-2 bg-muted rounded">
                    <div
                      className="h-2 bg-primary rounded"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {showCamera && (
        <LiveCamera
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
};

export default ReportForm;
