import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/client";
import { useAuth } from "@/features/auth/useAuth";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import confetti from "canvas-confetti";
import { logger } from "@/lib/logger";
import { reverseGeocode, formatAddress } from "@/features/map/geocoding";
import { calculatePriorityScore } from "@/services/ai";
import { enqueueReportForSync } from "@/features/reports/useOutboxSync";
import { ReportFormData, LocationData, reportSchema } from "../types";
import type { Database } from "@/services/types";

const DRAFT_KEY = "report_draft";

export const useReportFormState = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step Management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form Data
  const savedDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [formData, setFormData] = useState<ReportFormData>(savedDraft ?? {
    title: "",
    description: "",
    category: "",
    severity: "sedang",
    incidentDate: new Date().toISOString().slice(0, 10),
    reporterName: user?.user_metadata?.full_name || "",
    phone: "",
    kecamatan: "",
    desa: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ReportFormData, string>>>({});
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Validation Effect
  useEffect(() => {
    const result = reportSchema.safeParse(formData);
    if (result.success) {
      setErrors({});
    } else {
      const next: Partial<Record<keyof ReportFormData, string>> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof ReportFormData;
        if (!next[path]) next[path] = issue.message;
      }
      setErrors(next);
    }
  }, [formData]);

  // Autosave Effect
  useEffect(() => {
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        setSaveStatus("saved");
      } catch { setSaveStatus("unsaved"); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  // Photos
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Location
  const [location, setLocation] = useState<LocationData | null>(null);

  // Master Data
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([]);
  const [kecamatanList, setKecamatanList] = useState<Array<{ id: string; name: string }>>([]);
  const [allDesaList, setAllDesaList] = useState<Array<{ id: string; name: string; kecamatan_id: string }>>([]);
  const [selectedKecamatanId, setSelectedKecamatanId] = useState<string | null>(null);
  const [selectedDesaId, setSelectedDesaId] = useState<string | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [isDeduplicating, setIsDeduplicating] = useState(false);

  // Load Categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase.from("custom_categories").select("value, label").eq("is_active", true);
      if (!error && data) setCategories(data as Array<{ value: string; label: string }>);
      else setCategories([
        { value: "jalan", label: "Jalan" },
        { value: "jembatan", label: "Jembatan" },
        { value: "irigasi", label: "Irigasi" },
        { value: "drainase", label: "Drainase" },
        { value: "sungai", label: "Sungai" },
        { value: "lainnya", label: "Lainnya" },
      ]);
    };
    loadCategories();
  }, []);

  // Load Administrative Data
  useEffect(() => {
    const loadData = async () => {
      const [kecRes, desaRes] = await Promise.all([
        supabase.from("kecamatan").select("id,name").order("name"),
        supabase.from("desa").select("id,name,kecamatan_id").order("name")
      ]);
      if (kecRes.data) setKecamatanList(kecRes.data as Array<{ id: string; name: string }>);
      if (desaRes.data) {
        const mapped = (desaRes.data as any[]).map(d => ({
          id: d.id,
          name: d.name,
          kecamatan_id: d.kecamatan_id || ""
        }));
        setAllDesaList(mapped);
      }
    };
    loadData();
  }, []);

  const handleKecamatanChange = (id: string) => {
    setSelectedKecamatanId(id);
    const kec = kecamatanList.find(k => k.id === id);
    if (kec) setFormData(prev => ({ ...prev, kecamatan: kec.name }));
    setSelectedDesaId(null);
  };

  const handleDesaChange = (id: string) => {
    setSelectedDesaId(id);
    const desa = allDesaList.find(d => d.id === id);
    if (desa) setFormData(prev => ({ ...prev, desa: desa.name }));
  };

  const desaList = useMemo(() =>
    allDesaList.filter(d => d.kecamatan_id === selectedKecamatanId),
    [allDesaList, selectedKecamatanId]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    let files: File[] = [];
    if (e instanceof File) {
      files = [e];
    } else {
      files = Array.from(e.target.files || []).slice(0, 10);
    }

    if (!files.length) return;

    setLoading(true);
    try {
      const opts = { maxSizeMB: 1.0, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressed: File[] = [];
      const previews: string[] = [];

      for (const f of files) {
        const cf = await imageCompression(f, opts);
        compressed.push(new File([cf], f.name, { type: "image/jpeg" }));
        previews.push(await imageCompression.getDataUrlFromFile(cf));
      }

      setPhotoFiles(prev => [...prev, ...compressed]);
      setPhotoPreviews(prev => [...prev, ...previews]);

      // Auto-trigger AI if first photo
      if (compressed.length > 0 && photoFiles.length === 0) void runAIAnalysis(compressed[0]);
    } catch (err) {
      logger.error("Photo processing failed", err);
      toast.error("Gagal memproses foto");
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const runAIAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    try {
      await new Promise(r => setTimeout(r, 2000)); // Mock delay
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setLocation({ latitude: lat, longitude: lng });
    try {
      const res = await reverseGeocode(lat, lng);
      if (res) setLocation(prev => ({ ...prev!, name: formatAddress(res) }));
    } catch { }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser Anda");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapClick(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        logger.warn("Location access denied", err);
        toast.error("Gagal mendapatkan lokasi GPS");
      }
    );
  };

  const handleSubmit = async () => {
    if (!user || !location) return;

    setIsDeduplicating(true);
    await new Promise(r => setTimeout(r, 2500)); // Fake AI checking
    setIsDeduplicating(false);

    setLoading(true);
    setUploadPercent(10);

    try {
      const payload = {
        ...formData,
        location: { ...location, name: location.name || null }
      };

      if (!navigator.onLine) {
        await enqueueReportForSync(payload as any, photoFiles);
        toast.success("Laporan disimpan offline", {
          description: "Akan otomatis terkirim saat koneksi internet pulih"
        });
        localStorage.removeItem(DRAFT_KEY);
        navigate("/report/success");
        return;
      }

      // Online Submission
      const photoUrls: string[] = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const fileName = `${user.id}/${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(fileName, file);

        if (!uploadError) {
          const { data } = supabase.storage.from("report-photos").getPublicUrl(fileName);
          photoUrls.push(data.publicUrl);
        }
        setUploadPercent(10 + Math.round(((i + 1) / photoFiles.length) * 70));
      }

      // Verify location data
      if (!location.latitude || !location.longitude) {
        throw new Error("Data lokasi tidak valid. Silakan pilih lokasi di peta.");
      }

      // Prepare final payload
      const insertPayload = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        severity: formData.severity,
        incident_date: formData.incidentDate,
        latitude: parseFloat(location.latitude.toFixed(8)),
        longitude: parseFloat(location.longitude.toFixed(8)),
        location_name: location.name || null,
        reporter_name: formData.reporterName.trim(),
        phone: formData.phone.trim(),
        kecamatan: formData.kecamatan,
        desa: formData.desa,
        photo_url: photoUrls[0] || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        status: "baru" as const,
        priority_score: calculatePriorityScore(
          formData.category as Database["public"]["Enums"]["report_category"],
          formData.severity as Database["public"]["Enums"]["report_severity"]
        )
      };

      logger.info("🚀 Submitting report to Supabase...");

      // Defensive Submission Strategy:
      // We try to include priority_score, but fallback if the column doesn't exist yet
      let submissionResult;
      try {
        submissionResult = await (supabase.from("reports") as any)
          .insert(insertPayload)
          .select("id");

        if (submissionResult.error && submissionResult.error.message?.includes('priority_score')) {
          logger.warn("⚠️ priority_score column missing, falling back to safe insert");
          const { priority_score, ...safePayload } = insertPayload;
          submissionResult = await (supabase.from("reports") as any)
            .insert(safePayload)
            .select("id");
        }
      } catch (err) {
        logger.error("Submission crash:", err);
        throw err;
      }

      const { data: insertedRows, error } = submissionResult;

      if (error) {
        logger.error("❌ Supabase insert error:", error);

        // Return the actual database error message so the user knows exactly what is wrong
        const dbMessage = error.message || "";

        if (error.code === '23505') throw new Error("Laporan dengan judul ini sudah ada di lokasi tersebut.");
        if (dbMessage.includes('custom_categories')) {
          throw new Error(`Database error: Kategori '${formData.category}' belum diaktifkan di tabel custom_categories.`);
        }

        throw new Error(dbMessage || "Gagal menyimpan data ke database");
      }

      const insertedId = insertedRows?.[0]?.id;

      setUploadPercent(100);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b']
      });

      localStorage.removeItem(DRAFT_KEY);
      // Wait slightly for animation
      setTimeout(() => navigate(`/report/success${insertedId ? `?id=${insertedId}` : ''}`), 1000);
    } catch (err: any) {
      logger.error("Submission failed", err);
      toast.error("Gagal mengirim laporan", {
        description: err.message || "Terjadi kesalahan pada server. Silakan coba lagi."
      });
    } finally {
      setLoading(false);
      setUploadPercent(null);
    }
  };

  return {
    currentStep, setCurrentStep, totalSteps,
    formData, setFormData, errors, saveStatus,
    photoFiles, photoPreviews, handlePhotoChange, removePhoto, isAnalyzing, runAIAnalysis,
    location, setLocation, handleMapClick, getUserLocation,
    categories, kecamatanList, desaList, selectedKecamatanId, handleKecamatanChange, selectedDesaId, handleDesaChange,
    loading, uploadPercent, handleSubmit,
    isDeduplicating, setIsDeduplicating
  };
};
