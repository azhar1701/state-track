import { useState, useEffect, useCallback, useRef } from "react";
import { useReportDetail } from "./useReportDetail";
import { toast } from "sonner";
import { ReportListItem, ReportSeverity, ReportStatus, ReportLogEntry } from "./types";
import {
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { formatDateTime, formatReportLocation, getOptimizedImageUrl } from "@/lib/formatters";
import { useAuth } from "@/features/auth/useAuth";
import { StatusBadge, SeverityBadge } from "@/components/common/ReportBadges";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  MapPin,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Pencil,
  BarChart3,
  UploadCloud,
  Trash2,
  Camera,
  FileCheck2,
  Plus,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminDetailProps {
  selectedReport: ReportListItem | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
  onUpdateStatus?: (id: string, status: ReportStatus) => void | Promise<void>;
}

// ── Pending nav state when user has unsaved changes ──────────────────
type PendingNav = "prev" | "next" | null;

// ── Helper: render diff for a single field ───────────────────────────
const DiffField = ({ label, from, to }: { label: string; from?: unknown; to?: unknown }) => {
  const fromStr = from != null && from !== "" ? String(from) : "—";
  const toStr = to != null && to !== "" ? String(to) : "—";
  if (fromStr === toStr) return null;
  return (
    <div className="text-xs">
      <span className="text-muted-foreground font-medium">{label}: </span>
      <span className="line-through text-muted-foreground/70">{fromStr}</span>
      <span className="text-muted-foreground mx-1">→</span>
      <span className="text-foreground font-medium">{toStr}</span>
    </div>
  );
};

// ── Rich log entry renderer ───────────────────────────────────────────
const LogEntry = ({ log }: { log: ReportLogEntry }) => {
  const before = (log.before as Record<string, unknown>) ?? {};
  const after = (log.after as Record<string, unknown>) ?? {};

  const actionLabel: Record<string, string> = {
    status_update: "Perubahan Status",
    edit: "Edit Laporan",
    bulk_status_update: "Update Status Massal",
  };

  const icon: Record<string, React.ReactNode> = {
    status_update: <Clock className="h-3 w-3 text-primary shrink-0 mt-0.5" />,
    edit: <Pencil className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />,
    bulk_status_update: <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />,
  };

  const editType = (after.edit_type as string) || (log.action as string);
  const actionText =
    editType === "evidence_upload"
      ? "Unggah Bukti Penanganan"
      : editType === "evidence_delete"
        ? "Hapus Bukti Penanganan"
        : actionLabel[log.action] ?? log.action;

  const currentIcon =
    editType === "evidence_upload" ? (
      <UploadCloud className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
    ) : editType === "evidence_delete" ? (
      <Trash2 className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
    ) : (
      icon[log.action] ?? <Clock className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
    );

  const addedEvidence = (after.added_evidence as string[]) ?? [];
  const deletedPhoto = after.deleted_photo as string | undefined;

  return (
    <div className="text-xs bg-muted/30 p-3 rounded-md space-y-1.5">
      <div className="flex items-start gap-1.5">
        {currentIcon}
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-foreground">{actionText}</span>
          <span className="text-muted-foreground ml-1.5">
            · {log.actor_email ?? "System"} · {formatDateTime(log.created_at)}
          </span>
        </div>
      </div>
      <div className="pl-4.5 space-y-1">
        <DiffField label="Status" from={before.status} to={after.status} />
        <DiffField label="Judul" from={before.title} to={after.title} />
        <DiffField label="Severity" from={before.severity} to={after.severity} />
        <DiffField label="Resolusi" from={before.resolution} to={after.resolution} />
        {addedEvidence.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Menambahkan {addedEvidence.length} foto bukti penanganan
          </div>
        )}
        {deletedPhoto && (
          <div className="text-xs text-muted-foreground">
            Menghapus 1 foto bukti penanganan
          </div>
        )}
      </div>
    </div>
  );
};

// ── Priority score bar (matching table style) ─────────────────────────
const PriorityBar = ({ score }: { score: number }) => {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 70 ? "bg-red-500" : clamped >= 40 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-muted-foreground">{clamped}</span>
    </div>
  );
};

// ── Copy to clipboard hook ────────────────────────────────────────────
const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    });
  }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { copied, copy };
};

// ── Photo Classification Helper ───────────────────────────────────────
const isEvidencePhoto = (url: string) =>
  url.includes("evidence") || url.includes("penanganan") || url.includes("bukti");

// ─────────────────────────────────────────────────────────────────────
const AdminDetail = ({
  selectedReport,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onUpdateStatus,
}: AdminDetailProps) => {
  const { user } = useAuth();
  const {
    fullReport,
    detailLoading,
    logs,
    logsLoading,
    saveEdits,
    isSaving,
    uploadEvidence,
    isUploadingEvidence,
    deleteEvidence,
    isDeletingEvidence,
  } = useReportDetail(selectedReport);

  // ── Editable fields ──────────────────────────────────────────────
  const [editTitle, setEditTitle] = useState("");
  const [editSeverity, setEditSeverity] = useState<ReportSeverity | "">("");
  const [editResolution, setEditResolution] = useState("");

  // ── Lightbox ─────────────────────────────────────────────────────
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // ── Evidence photo upload & deletion state ────────────────────────
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Dirty state guard ─────────────────────────────────────────────
  const [initialTitle, setInitialTitle] = useState("");
  const [initialSeverity, setInitialSeverity] = useState<ReportSeverity | "">("");
  const [initialResolution, setInitialResolution] = useState("");
  const [pendingNav, setPendingNav] = useState<PendingNav>(null);

  // ── Status updating ───────────────────────────────────────────────
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const { copied: coordsCopied, copy: copyCoords } = useCopyToClipboard();

  const isDirty =
    editTitle !== initialTitle ||
    editSeverity !== initialSeverity ||
    editResolution !== initialResolution;

  // Reset editable state whenever the selected report changes
  useEffect(() => {
    if (selectedReport) {
      const t = selectedReport.title || "";
      const s = selectedReport.severity || "";
      const r = selectedReport.resolution || "";
      setEditTitle(t);
      setEditSeverity(s);
      setEditResolution(r);
      setInitialTitle(t);
      setInitialSeverity(s);
      setInitialResolution(r);
    }
  }, [selectedReport]);

  // ── Photos collection & classification ────────────────────────────
  const allPhotos: string[] = fullReport?.photo_urls?.length
    ? fullReport.photo_urls
    : fullReport?.photo_url
      ? [fullReport.photo_url]
      : [];

  const reporterPhotos = allPhotos.filter((url) => !isEvidencePhoto(url));
  const evidencePhotos = allPhotos.filter((url) => isEvidencePhoto(url));
  const photos = allPhotos;

  // ── Keyboard: lightbox arrow navigation ──────────────────────────
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")
        setActivePhotoIndex((p) => (p - 1 + photos.length) % photos.length);
      else if (e.key === "ArrowRight")
        setActivePhotoIndex((p) => (p + 1) % photos.length);
      else if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, photos.length]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedReport) return;
    try {
      await saveEdits({
        title: editTitle.trim() || selectedReport.title,
        severity: editSeverity,
        resolution: editResolution,
        userId: user?.id,
        userEmail: user?.email,
      });
      // Stay in drawer — mark as clean
      setInitialTitle(editTitle.trim() || selectedReport.title);
      setInitialSeverity(editSeverity);
      setInitialResolution(editResolution);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "type" in err &&
        (err as { type: string }).type === "conflict"
      ) return;
      toast.error("Gagal menyimpan perubahan laporan");
    }
  };

  const handleQuickStatus = async (newStatus: ReportStatus) => {
    if (!selectedReport || !onUpdateStatus) return;
    setIsStatusUpdating(true);
    try {
      await onUpdateStatus(selectedReport.id, newStatus);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // ── Evidence photo file handling ─────────────────────────────────
  const handleFileUpload = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) {
        toast.error(`File "${f.name}" bukan format gambar`);
        continue;
      }
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`File "${f.name}" melebihi batas 15MB`);
        continue;
      }
      validFiles.push(f);
    }
    if (!validFiles.length) return;

    try {
      await uploadEvidence({
        files: validFiles,
        userId: user?.id,
        userEmail: user?.email,
      });
    } catch {
      // toast is already handled in mutation
    }
  };

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      await deleteEvidence({
        photoUrl: photoToDelete,
        userId: user?.id,
        userEmail: user?.email,
      });
      setDeleteConfirmOpen(false);
      setPhotoToDelete(null);
    } catch {
      // toast already in mutation
    }
  };

  // Guard: intercept prev/next when dirty
  const requestNav = (dir: "prev" | "next") => {
    if (isDirty) {
      setPendingNav(dir);
    } else {
      dir === "prev" ? onPrev?.() : onNext?.();
    }
  };

  const confirmNav = () => {
    const dir = pendingNav;
    setPendingNav(null);
    dir === "prev" ? onPrev?.() : onNext?.();
  };

  if (!selectedReport)
    return (
      <div className="p-8 text-center text-muted-foreground">
        <DrawerTitle className="sr-only">Tidak ada laporan dipilih</DrawerTitle>
        <DrawerDescription className="sr-only">Silakan pilih laporan dari tabel untuk melihat detail</DrawerDescription>
        Tidak ada laporan yang dipilih
      </div>
    );

  const coordsText =
    fullReport?.latitude && fullReport?.longitude
      ? `${Number(fullReport.latitude).toFixed(6)}, ${Number(fullReport.longitude).toFixed(6)}`
      : null;

  return (
    <>
      {/* ── Dirty Guard AlertDialog ── */}
      <AlertDialog
        open={pendingNav !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNav(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Perubahan Belum Disimpan</AlertDialogTitle>
            <AlertDialogDescription>
              Anda memiliki perubahan pada laporan ini yang belum disimpan. Pindah ke laporan lain akan membatalkan perubahan tersebut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNav(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmNav}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Abaikan Perubahan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Evidence Photo AlertDialog ── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Foto Bukti Penanganan?</AlertDialogTitle>
            <AlertDialogDescription>
              Foto bukti penanganan ini akan dihapus dari data laporan dan penyimpanan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingEvidence}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePhoto}
              disabled={isDeletingEvidence}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeletingEvidence ? "Menghapus..." : "Hapus Foto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col h-full max-h-[85vh]">
        {/* ── Drawer Header ── */}
        <DrawerHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">
                #{selectedReport.id.slice(0, 8)}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDateTime(selectedReport.created_at)}
              </span>
              {isDirty && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40 bg-amber-500/10 shrink-0">
                    Ada perubahan
                  </Badge>
                </>
              )}
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center gap-1 shrink-0">
              {currentIndex !== undefined && totalCount !== undefined && (
                <span className="text-xs text-muted-foreground mr-1">
                  {currentIndex + 1} / {totalCount}
                </span>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!hasPrev}
                onClick={() => requestNav("prev")}
                title="Laporan sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!hasNext}
                onClick={() => requestNav("next")}
                title="Laporan berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DrawerTitle className="text-left text-lg font-bold mt-1 truncate">
            {selectedReport.title}
          </DrawerTitle>
          <DrawerDescription className="text-left text-xs">
            {formatReportLocation(selectedReport.desa, selectedReport.kecamatan, selectedReport.location_name)}
          </DrawerDescription>
        </DrawerHeader>

        {/* ── Drawer Body ── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-5">
          {/* Metadata row: Badges + Priority Score */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedReport.status} />
              <SeverityBadge severity={selectedReport.severity || "ringan"} />
              <Badge variant="outline" className="text-xs capitalize">
                {selectedReport.category}
              </Badge>
            </div>

            {/* Priority Score Bar */}
            {selectedReport.priority_score != null && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  Prioritas:
                </span>
                <PriorityBar score={selectedReport.priority_score} />
              </div>
            )}
          </div>

          {/* Editable fields section */}
          <div className="space-y-3 pb-4 border-b border-border/50">
            <label className="text-xs font-medium text-muted-foreground">
              Informasi Laporan (Dapat Diedit)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Title input */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Judul Laporan</label>
                <Input
                  className="h-9 text-sm"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Judul laporan"
                />
              </div>

              {/* Severity select — shadcn Select */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tingkat Keparahan</label>
                <Select
                  value={editSeverity}
                  onValueChange={(val) => setEditSeverity(val as ReportSeverity)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Pilih tingkat keparahan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ringan">Ringan</SelectItem>
                    <SelectItem value="sedang">Sedang</SelectItem>
                    <SelectItem value="berat">Berat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Location & Reporter details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-4 border-b border-border/50">
            {/* GPS Coordinates with copy */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Koordinat GPS
              </label>
              {detailLoading ? (
                <Skeleton className="h-5 w-36" />
              ) : coordsText ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded">
                    {coordsText}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => copyCoords(coordsText)}
                    title="Salin koordinat"
                  >
                    {coordsCopied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nama Pelapor</label>
              {detailLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <div className="text-sm font-medium">{fullReport?.reporter_name || "—"}</div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Kontak</label>
              {detailLoading ? (
                <Skeleton className="h-5 w-28" />
              ) : (
                <div className="text-sm font-medium">{fullReport?.phone || "—"}</div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 pb-4 border-b border-border/50">
            <label className="text-xs font-medium text-muted-foreground">Deskripsi Laporan</label>
            {detailLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            ) : (
              <div className="text-sm leading-relaxed bg-muted/30 p-3 rounded-md">
                {fullReport?.description || "—"}
              </div>
            )}
          </div>

          {/* Reporter Photos Documentation */}
          <div className="space-y-2 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                Dokumentasi Foto Pelapor{reporterPhotos.length > 0 ? ` (${reporterPhotos.length})` : ""}
              </label>
              {reporterPhotos.length > 0 && (
                <span className="text-[11px] text-muted-foreground">Klik foto untuk perbesar</span>
              )}
            </div>
            {detailLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-lg" />
                ))}
              </div>
            ) : reporterPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reporterPhotos.map((src, i) => {
                  const globalIdx = allPhotos.indexOf(src);
                  return (
                    <div
                      key={src + i}
                      className="group relative aspect-video rounded-lg overflow-hidden border border-border/60 bg-muted/20"
                    >
                      <img
                        src={getOptimizedImageUrl(src, 400, 75)}
                        alt={`Dokumentasi pelapor ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                        onClick={() => {
                          setActivePhotoIndex(globalIdx >= 0 ? globalIdx : 0);
                          setLightboxOpen(true);
                        }}
                      />
                      <div className="absolute top-1.5 left-1.5 pointer-events-none">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur-sm">
                          Pelapor #{i + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md text-center">
                Tidak ada dokumentasi foto dari pelapor
              </div>
            )}
          </div>

          {/* Section: Bukti Dukung Penanganan Lapangan (Admin Upload) */}
          <div className="space-y-3 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-500" />
                <label className="text-xs font-semibold text-foreground">
                  Bukti Dukung Penanganan Lapangan
                </label>
                {evidencePhotos.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    {evidencePhotos.length} Foto Bukti
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isUploadingEvidence}
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/5"
              >
                {isUploadingEvidence ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    <span>Tambah Bukti Foto</span>
                  </>
                )}
              </Button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleFileUpload(e.target.files);
                  e.target.value = "";
                }
              }}
            />

            {/* Existing Evidence Photos Grid */}
            {evidencePhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {evidencePhotos.map((src, i) => {
                  const globalIdx = allPhotos.indexOf(src);
                  return (
                    <div
                      key={src + i}
                      className="group relative aspect-video rounded-lg overflow-hidden border border-emerald-500/30 bg-muted/20 shadow-sm"
                    >
                      <img
                        src={getOptimizedImageUrl(src, 400, 75)}
                        alt={`Bukti penanganan ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setActivePhotoIndex(globalIdx >= 0 ? globalIdx : 0);
                            setLightboxOpen(true);
                          }}
                          className="h-7 w-7 text-white hover:bg-white/20 rounded-md"
                          title="Perbesar foto"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setPhotoToDelete(src);
                            setDeleteConfirmOpen(true);
                          }}
                          className="h-7 w-7 text-rose-300 hover:text-rose-200 hover:bg-rose-500/30 rounded-md"
                          title="Hapus foto bukti ini"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute top-1.5 left-1.5 pointer-events-none">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm">
                          Bukti #{i + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void handleFileUpload(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                isDragOver
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-border/70 hover:border-primary/60 hover:bg-muted/30 bg-muted/10",
                evidencePhotos.length > 0 && "py-3"
              )}
            >
              {isUploadingEvidence ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs font-medium text-foreground">
                    Sedang mengompresi dan mengunggah foto bukti...
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Mohon tunggu beberapa detik
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-primary hover:underline">
                      Klik untuk unggah foto bukti
                    </span>{" "}
                    <span className="text-muted-foreground">atau seret file ke sini</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Format JPG, PNG, WebP (kompresi otomatis max 1MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resolution textarea — shadcn Textarea */}
          <div className="space-y-2 pb-4 border-b border-border/50">
            <label className="text-xs font-medium text-muted-foreground">
              Catatan Hasil / Respon Penanganan Admin
            </label>
            <Textarea
              className="min-h-[100px] text-sm resize-none"
              value={editResolution}
              onChange={(e) => setEditResolution(e.target.value)}
              placeholder="Tulis ringkasan hasil kerja lapangan, tanggal penanganan, atau catatan respon admin di sini..."
            />
          </div>

          {/* Audit log — rich diff */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Riwayat Perubahan
            </label>
            {logsLoading ? (
              <div className="space-y-2 py-1">
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-14 w-full rounded-md opacity-60" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md text-center">
                Belum ada perubahan
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Drawer Footer with Quick Status Actions ── */}
        <DrawerFooter className="pt-3 border-t border-border/60 bg-muted/10">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Left: Quick status actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium mr-1">
                Status Cepat:
              </span>
              {selectedReport.status !== "diproses" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isStatusUpdating}
                  onClick={() => handleQuickStatus("diproses")}
                  className="text-xs h-7 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                >
                  {isStatusUpdating ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Clock className="w-3 h-3 mr-1" />
                  )}
                  Proses
                </Button>
              )}
              {selectedReport.status !== "selesai" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isStatusUpdating}
                  onClick={() => handleQuickStatus("selesai")}
                  className="text-xs h-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  {isStatusUpdating ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}
                  Selesai
                </Button>
              )}
            </div>

            {/* Right: cancel + save edits */}
            <div className="flex items-center gap-2 justify-end">
              <DrawerClose asChild>
                <Button size="sm" variant="ghost" className="text-xs">
                  Tutup
                </Button>
              </DrawerClose>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !selectedReport || !isDirty}
                className="text-xs min-w-[110px]"
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </div>

      {/* ── Lightbox ── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[92vw] max-h-[92vh] p-0 overflow-hidden bg-black/95 border-none"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root>
            <DialogTitle>Tampilan Foto Layar Penuh</DialogTitle>
          </VisuallyHidden.Root>

          <div className="relative flex items-center justify-center w-full h-full min-h-[50vh]">
            <img
              src={photos[activePhotoIndex]}
              className="max-h-[80vh] max-w-full object-contain"
              alt={`Foto ${activePhotoIndex + 1}`}
            />

            {/* Classification pill at top */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <span
                className={cn(
                  "text-xs px-3 py-1 rounded-full font-medium shadow-md backdrop-blur-md",
                  isEvidencePhoto(photos[activePhotoIndex] || "")
                    ? "bg-emerald-600/90 text-white border border-emerald-400/40"
                    : "bg-black/60 text-white/90 border border-white/20"
                )}
              >
                {isEvidencePhoto(photos[activePhotoIndex] || "")
                  ? "Bukti Dukung Penanganan Lapangan"
                  : "Foto Laporan (Pelapor)"}
              </span>
            </div>

            {/* Side navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  aria-label="Foto sebelumnya"
                  onClick={() =>
                    setActivePhotoIndex((p) => (p - 1 + photos.length) % photos.length)
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  aria-label="Foto berikutnya"
                  onClick={() =>
                    setActivePhotoIndex((p) => (p + 1) % photos.length)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <span className="text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full">
                    {activePhotoIndex + 1} / {photos.length}
                  </span>
                </div>

                {/* Dot indicators */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhotoIndex(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === activePhotoIndex
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/40 hover:bg-white/60"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDetail;
