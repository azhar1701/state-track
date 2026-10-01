import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useReportDetail } from "./useReportDetail";
import { toast } from "sonner";
import { ReportListItem, ReportSeverity, ReportStatus, ReportLogEntry } from "./types";
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
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
  Maximize2,
  Minimize2,
  ExternalLink,
  X,
  Phone,
  User,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminReportMiniMap } from "./AdminReportMiniMap";
import { PhotoComparisonView } from "./PhotoComparisonView";

interface AdminDetailProps {
  open?: boolean;
  selectedReport: ReportListItem | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
  onUpdateStatus?: (id: string, status: ReportStatus) => void | Promise<void>;
  onUpdateReport?: (updatedFields: Partial<ReportListItem>) => void;
}

type PendingNav = "prev" | "next" | null;

const QUICK_RESOLUTION_TEMPLATES = [
  { label: "Survei Terjadwal", text: "Tim teknis telah menjadwalkan survei lapangan untuk inspeksi dimensi kerusakan dan estimasi kebutuhan penanganan." },
  { label: "Kirim Material", text: "Material darurat (bronjong kawat / karung pasir) telah dikirimkan ke lokasi kejadian." },
  { label: "Koordinasi Pemdes/P3A", text: "Telah dikoordinasikan dengan pihak Pemerintah Desa dan pengurus P3A setempat untuk pengamanan area." },
  { label: "Penanganan Selesai", text: "Pekerjaan perbaikan infrastruktur telah selesai dilaksanakan dan fungsi aliran air telah kembali normal." },
];

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

const LogEntry = ({ log }: { log: ReportLogEntry }) => {
  const before = (log.before as Record<string, unknown>) ?? {};
  const after = (log.after as Record<string, unknown>) ?? {};

  const actionLabel: Record<string, string> = {
    status_update: "Perubahan Status",
    edit: "Edit Laporan",
    bulk_status_update: "Update Status Massal",
  };

  const icon: Record<string, React.ReactNode> = {
    status_update: <Clock className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />,
    edit: <Pencil className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />,
    bulk_status_update: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
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
      <UploadCloud className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
    ) : editType === "evidence_delete" ? (
      <Trash2 className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
    ) : (
      icon[log.action] ?? <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
    );

  const addedEvidence = (after.added_evidence as string[]) ?? [];
  const deletedPhoto = after.deleted_photo as string | undefined;

  return (
    <div className="text-xs bg-muted/40 p-3 rounded-lg border border-border/50 space-y-1.5 transition-colors">
      <div className="flex items-start gap-2">
        {currentIcon}
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-foreground">{actionText}</span>
          <span className="text-muted-foreground ml-1.5">
            · {log.actor_email ?? "System"} · {formatDateTime(log.created_at)}
          </span>
        </div>
      </div>
      <div className="pl-5 space-y-1">
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

const PriorityGauge = ({ score, isPreview = false }: { score: number; isPreview?: boolean }) => {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 70 ? "bg-red-500" : clamped >= 40 ? "bg-amber-500" : "bg-emerald-500";
  const label =
    clamped >= 70 ? "Prioritas Sangat Tinggi" : clamped >= 40 ? "Prioritas Sedang" : "Penanganan Rutin";

  return (
    <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          Kalkulasi Skor Prioritas
          {isPreview && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Pratinjau
            </span>
          )}
        </span>
        <span className="font-mono font-bold text-sm text-foreground">{clamped} / 100</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Kategori Otomatis</span>
        <span className="font-semibold text-foreground">{label}</span>
      </div>
    </div>
  );
};

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

const isEvidencePhoto = (url: string) =>
  url.includes("evidence") || url.includes("penanganan") || url.includes("bukti");

const AdminDetail = ({
  open = true,
  selectedReport,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onUpdateStatus,
  onUpdateReport,
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

  // ── Floating / Fullscreen Mode Toggle ─────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const [pendingClose, setPendingClose] = useState(false);

  // ── Status updating ───────────────────────────────────────────────
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const { copied: coordsCopied, copy: copyCoords } = useCopyToClipboard();

  const isDirty =
    editTitle !== initialTitle ||
    editSeverity !== initialSeverity ||
    editResolution !== initialResolution;

  const calculatedScore = useMemo(() => {
    if (editSeverity && editSeverity !== selectedReport?.severity) {
      return editSeverity === "berat" ? 85 : editSeverity === "sedang" ? 50 : 25;
    }
    return (
      selectedReport?.priority_score ??
      (selectedReport?.severity === "berat"
        ? 85
        : selectedReport?.severity === "sedang"
          ? 50
          : 25)
    );
  }, [editSeverity, selectedReport?.severity, selectedReport?.priority_score]);

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

  // ── Keyboard shortcuts: lightbox arrow navigation & general shortcuts ──
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

  // Guard navigation & close
  const requestNav = useCallback((dir: "prev" | "next") => {
    if (isDirty) {
      setPendingNav(dir);
    } else {
      dir === "prev" ? onPrev?.() : onNext?.();
    }
  }, [isDirty, onPrev, onNext]);

  const confirmNav = () => {
    const dir = pendingNav;
    setPendingNav(null);
    dir === "prev" ? onPrev?.() : onNext?.();
  };

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setPendingClose(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleSave = useCallback(async () => {
    if (!selectedReport) return;
    try {
      const finalTitle = editTitle.trim() || selectedReport.title;
      const finalSeverity = (editSeverity || selectedReport.severity) as ReportSeverity;
      const finalResolution = editResolution;
      const finalPriorityScore =
        finalSeverity === "berat" ? 85 : finalSeverity === "sedang" ? 50 : 25;

      await saveEdits({
        title: finalTitle,
        severity: finalSeverity,
        resolution: finalResolution,
        userId: user?.id,
        userEmail: user?.email,
      });

      onUpdateReport?.({
        title: finalTitle,
        severity: finalSeverity,
        resolution: finalResolution,
        priority_score: finalPriorityScore,
      });

      setInitialTitle(finalTitle);
      setInitialSeverity(finalSeverity);
      setInitialResolution(finalResolution);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "type" in err &&
        (err as { type: string }).type === "conflict"
      ) return;
      toast.error("Gagal menyimpan perubahan laporan");
    }
  }, [selectedReport, saveEdits, editTitle, editSeverity, editResolution, user, onUpdateReport]);

  const handleQuickStatus = async (newStatus: ReportStatus) => {
    if (!selectedReport || !onUpdateStatus || selectedReport.status === newStatus) return;
    setIsStatusUpdating(true);
    try {
      await onUpdateStatus(selectedReport.id, newStatus);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Global hotkeys for detail modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "Escape" && !lightboxOpen && !deleteConfirmOpen && pendingNav === null && !pendingClose) {
        e.preventDefault();
        handleRequestClose();
      } else if (!isEditing) {
        if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setIsFullscreen((prev) => !prev);
        } else if (e.key === "ArrowLeft" && hasPrev) {
          e.preventDefault();
          requestNav("prev");
        } else if (e.key === "ArrowRight" && hasNext) {
          e.preventDefault();
          requestNav("next");
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (isDirty && !isSaving) {
          void handleSave();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, deleteConfirmOpen, pendingNav, pendingClose, hasPrev, hasNext, isDirty, isSaving, handleRequestClose, requestNav, handleSave]);

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
      // handled in mutation
    }
  };

  if (!selectedReport) return null;

  const coordsText =
    fullReport?.latitude && fullReport?.longitude
      ? `${Number(fullReport.latitude).toFixed(6)}, ${Number(fullReport.longitude).toFixed(6)}`
      : null;

  return (
    <>
      {/* ── Dirty Guard AlertDialog on Nav ── */}
      <AlertDialog
        open={pendingNav !== null}
        onOpenChange={(op) => {
          if (!op) setPendingNav(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Perubahan Belum Disimpan
            </AlertDialogTitle>
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

      {/* ── Dirty Guard AlertDialog on Close ── */}
      <AlertDialog
        open={pendingClose}
        onOpenChange={(op) => {
          if (!op) setPendingClose(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Keluar Tanpa Menyimpan?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ada draf formulir yang telah Anda ubah. Jika Anda menutup sekarang, perubahan belum tersimpan akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingClose(false)}>
              Lanjutkan Mengedit
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPendingClose(false);
                onClose();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Tutup & Buang Perubahan
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
              Foto bukti penanganan ini akan dihapus dari data laporan dan penyimpanan cloud. Tindakan ini tidak dapat dibatalkan.
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

      {/* ── Floating Full-Screen Dialog Workspace ── */}
      <DialogPrimitive.Root open={open} onOpenChange={(op) => { if (!op) handleRequestClose(); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />
          <DialogPrimitive.Content
            aria-describedby="admin-detail-description"
            className={cn(
              "fixed z-[9999] bg-background text-foreground shadow-2xl transition-all duration-200 ease-out flex flex-col focus:outline-none",
              isFullscreen
                ? "inset-0 w-screen h-screen rounded-none border-none"
                : "inset-2 sm:inset-3 md:inset-4 lg:inset-6 max-w-[1600px] max-h-[95vh] rounded-2xl border border-border/80 glass-surface mx-auto my-auto overflow-hidden"
            )}
          >
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>{selectedReport.title || "Detail Laporan"}</DialogPrimitive.Title>
              <DialogPrimitive.Description id="admin-detail-description">
                Panel kerja floating fullscreen untuk evaluasi, orientasi spasial, dan pembaruan respon laporan.
              </DialogPrimitive.Description>
            </VisuallyHidden.Root>

            {/* ── Top Header Toolbar ── */}
            <div className="shrink-0 px-4 md:px-6 py-2.5 sm:py-3 border-b border-border/70 bg-card/90 backdrop-blur-md flex items-center justify-between gap-3">
              {/* Left: ID & Metadata Pills */}
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/60">
                  #{selectedReport.id.slice(0, 8)}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground/70" />
                  {formatDateTime(selectedReport.created_at)}
                </span>
                <StatusBadge status={selectedReport.status} />
                <SeverityBadge severity={editSeverity || selectedReport.severity || "ringan"} />
                <Badge variant="outline" className="text-xs capitalize border-border/70">
                  {selectedReport.category}
                </Badge>
              </div>

              {/* Right: Controls & Actions */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Pagination */}
                {currentIndex !== undefined && totalCount !== undefined && (
                  <div className="flex items-center gap-1 bg-muted/70 px-2 py-1 rounded-lg border border-border/60 mr-1 text-xs text-muted-foreground font-medium">
                    <span>{currentIndex + 1}</span>
                    <span className="opacity-50">/</span>
                    <span>{totalCount}</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-border/70"
                  onClick={() => requestNav("prev")}
                  disabled={!hasPrev}
                  title="Laporan Sebelumnya (Shortcut: Panah Kiri)"
                  aria-label="Laporan Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-border/70"
                  onClick={() => requestNav("next")}
                  disabled={!hasNext}
                  title="Laporan Berikutnya (Shortcut: Panah Kanan)"
                  aria-label="Laporan Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

                {/* Direct GIS Map Link */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 hidden sm:inline-flex rounded-lg border-border/70 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                  asChild
                >
                  <a
                    href={`/map?selectedReportId=${selectedReport.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Buka di Peta GIS Utama (Tab Baru)"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Peta GIS</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </Button>

                {/* Maximize / Floating Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  title={isFullscreen ? "Kembalikan Ukuran Jendela (F)" : "Layar Penuh (F)"}
                  aria-label={isFullscreen ? "Kembalikan Ukuran Jendela" : "Layar Penuh"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={handleRequestClose}
                  title="Tutup (Esc)"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Sub-Header: Title & Coordinates Strip ── */}
            <div className="shrink-0 px-4 md:px-6 py-2 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {selectedReport.title || "(Tanpa Judul)"}
                </h2>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {formatReportLocation(
                      selectedReport.desa,
                      selectedReport.kecamatan,
                      selectedReport.location_name
                    ) || "Lokasi tidak tercatat"}
                  </span>
                </p>
              </div>
              {coordsText && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <span className="font-mono text-xs text-foreground bg-background/80 border border-border/60 px-2 py-0.5 rounded shadow-2xs">
                    {coordsText}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded text-muted-foreground hover:text-primary"
                    onClick={() => copyCoords(coordsText)}
                    title="Salin Koordinat GPS"
                  >
                    {coordsCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </div>

            {/* ── Main Workspace Body (2-Column Grid on Desktop lg+) ── */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
              {/* ── Left Pane: Spatial, Visual Intelligence & Citizen Context (col-span-7) ── */}
              <div className="lg:col-span-7 overflow-y-auto p-4 md:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-border/60">
                {/* 1. Spatial Orientation & Mini-Map */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Orientasi & Verifikasi Spasial
                    </label>
                    <a
                      href={`/map?selectedReportId=${selectedReport.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>Buka di Peta GIS Lengkap</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <AdminReportMiniMap
                    reportId={selectedReport.id}
                    latitude={fullReport?.latitude ? Number(fullReport.latitude) : null}
                    longitude={fullReport?.longitude ? Number(fullReport.longitude) : null}
                    title={selectedReport.title}
                    category={selectedReport.category}
                    severity={editSeverity || selectedReport.severity}
                    locationName={selectedReport.location_name}
                  />
                </div>

                {/* 2. Photo Comparison Mode (Before vs After) if both exist */}
                {reporterPhotos.length > 0 && evidencePhotos.length > 0 && (
                  <PhotoComparisonView
                    beforePhotos={reporterPhotos}
                    afterPhotos={evidencePhotos}
                    onOpenLightbox={(photoUrl) => {
                      const idx = allPhotos.indexOf(photoUrl);
                      setActivePhotoIndex(idx >= 0 ? idx : 0);
                      setLightboxOpen(true);
                    }}
                  />
                )}

                {/* 3. Citizen Photo Documentation */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-primary" />
                      Dokumentasi Foto Pelapor
                      {reporterPhotos.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5">
                          {reporterPhotos.length} Foto
                        </Badge>
                      )}
                    </label>
                    {reporterPhotos.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">Klik untuk perbesar</span>
                    )}
                  </div>
                  {detailLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="aspect-video w-full rounded-lg" />
                      ))}
                    </div>
                  ) : reporterPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {reporterPhotos.map((src, i) => {
                        const globalIdx = allPhotos.indexOf(src);
                        return (
                          <div
                            key={src + i}
                            className="group relative aspect-video rounded-xl overflow-hidden border border-border/70 bg-muted/20 shadow-xs"
                          >
                            <img
                              src={getOptimizedImageUrl(src, 500, 75)}
                              alt={`Dokumentasi pelapor ${i + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                              onClick={() => {
                                setActivePhotoIndex(globalIdx >= 0 ? globalIdx : 0);
                                setLightboxOpen(true);
                              }}
                            />
                            <div className="absolute top-2 left-2 pointer-events-none">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/70 text-white shadow-xs backdrop-blur-sm">
                                Pelapor #{i + 1}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActivePhotoIndex(globalIdx >= 0 ? globalIdx : 0);
                                setLightboxOpen(true);
                              }}
                              className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                              aria-label="Perbesar foto"
                            >
                              <ZoomIn className="w-6 h-6 drop-shadow" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/20 p-4 rounded-xl text-center border border-border/40">
                      Tidak ada dokumentasi foto dari pelapor
                    </div>
                  )}
                </div>

                {/* 4. Reporter Profile & Citizen Description */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-muted-foreground block">Nama Pelapor</span>
                        <span className="font-semibold text-foreground truncate block">
                          {fullReport?.reporter_name || "Masyarakat / Anonim"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-muted-foreground block">Kontak Pelapor</span>
                        {fullReport?.phone ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${fullReport.phone}`}
                              className="font-medium text-foreground hover:text-primary transition-colors"
                            >
                              {fullReport.phone}
                            </a>
                            <a
                              href={`https://wa.me/${fullReport.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center gap-1"
                              title="Hubungi via WhatsApp"
                            >
                              <MessageCircle className="w-2.5 h-2.5" /> WA
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Deskripsi Keluhan Warga
                    </label>
                    {detailLoading ? (
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm leading-relaxed text-foreground bg-background/60 p-3 rounded-lg border border-border/50">
                        {fullReport?.description || "Tidak ada deskripsi rinci dari pelapor."}
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. Riwayat Perubahan (Audit Trail Timeline) */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Riwayat Perubahan & Log Audit
                  </label>
                  {logsLoading ? (
                    <div className="space-y-2 py-1">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg opacity-60" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-xs text-muted-foreground bg-muted/20 p-3.5 rounded-lg text-center border border-border/40">
                      Belum ada riwayat perubahan pada laporan ini
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {logs.map((log) => (
                        <LogEntry key={log.id} log={log} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right Pane: Admin Command & Resolution Station (col-span-5) ── */}
              <div className="lg:col-span-5 overflow-y-auto p-4 md:p-6 space-y-5 bg-card/40">
                {/* 1. Priority Calculation Card */}
                {selectedReport && (
                  <PriorityGauge
                    score={calculatedScore}
                    isPreview={Boolean(editSeverity && editSeverity !== selectedReport.severity)}
                  />
                )}

                {/* 2. Quick Status Switcher */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Ubah Status Penanganan Cepat
                    </label>
                    {isStatusUpdating && (
                      <span className="text-[11px] text-primary flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Memperbarui status...
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isStatusUpdating}
                      onClick={() => handleQuickStatus("baru")}
                      className={cn(
                        "py-2 px-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                        selectedReport.status === "baru"
                          ? "bg-blue-500/15 border-blue-500/60 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-blue-500/40"
                          : "bg-background/80 border-border/70 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Baru</span>
                    </button>

                    <button
                      type="button"
                      disabled={isStatusUpdating}
                      onClick={() => handleQuickStatus("diproses")}
                      className={cn(
                        "py-2 px-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                        selectedReport.status === "diproses"
                          ? "bg-amber-500/15 border-amber-500/60 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-amber-500/40"
                          : "bg-background/80 border-border/70 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Loader2 className={cn("w-4 h-4", selectedReport.status === "diproses" && "animate-spin")} />
                      <span>Diproses</span>
                    </button>

                    <button
                      type="button"
                      disabled={isStatusUpdating}
                      onClick={() => handleQuickStatus("selesai")}
                      className={cn(
                        "py-2 px-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all",
                        selectedReport.status === "selesai"
                          ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/40"
                          : "bg-background/80 border-border/70 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Selesai</span>
                    </button>
                  </div>
                </div>

                {/* 3. Editable Report Core Fields */}
                <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                    Penyesuaian Informasi Laporan
                  </label>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Judul Laporan</label>
                      <Input
                        className="h-9 text-xs sm:text-sm bg-background/90"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Judul laporan"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground font-medium">
                          Tingkat Keparahan (Severity)
                        </label>
                        {editSeverity && editSeverity !== selectedReport.severity && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Pratinjau: {editSeverity.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* 1-Click Fast Severity Selector Pills */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditSeverity("ringan")}
                          className={cn(
                            "py-1.5 px-2 rounded-lg border text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5",
                            editSeverity === "ringan"
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold ring-1 ring-emerald-500/30 shadow-xs"
                              : "bg-background/80 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Ringan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditSeverity("sedang")}
                          className={cn(
                            "py-1.5 px-2 rounded-lg border text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5",
                            editSeverity === "sedang"
                              ? "bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-semibold ring-1 ring-amber-500/30 shadow-xs"
                              : "bg-background/80 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <span>Sedang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditSeverity("berat")}
                          className={cn(
                            "py-1.5 px-2 rounded-lg border text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5",
                            editSeverity === "berat"
                              ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 font-semibold ring-1 ring-rose-500/30 shadow-xs"
                              : "bg-background/80 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                          <span>Berat</span>
                        </button>
                      </div>

                      <Select
                        value={editSeverity}
                        onValueChange={(val) => setEditSeverity(val as ReportSeverity)}
                      >
                        <SelectTrigger className="h-9 text-xs sm:text-sm bg-background/90">
                          <SelectValue placeholder="Pilih tingkat keparahan" />
                        </SelectTrigger>
                        <SelectContent className="z-[10005]">
                          <SelectItem value="ringan">🟢 Ringan (Dapat ditangani rutin)</SelectItem>
                          <SelectItem value="sedang">🟡 Sedang (Perlu penjadwalan)</SelectItem>
                          <SelectItem value="berat">🔴 Berat (Penanganan Darurat)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 4. Bukti Dukung Penanganan Lapangan (Admin Field Evidence) */}
                <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4 text-emerald-500" />
                      <label className="text-xs font-semibold text-foreground">
                        Bukti Dukung Penanganan Lapangan
                      </label>
                      {evidencePhotos.length > 0 && (
                        <Badge variant="outline" className="text-[10px] h-4.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          {evidencePhotos.length}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isUploadingEvidence}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/5"
                    >
                      {isUploadingEvidence ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          <span>Tambah Foto</span>
                        </>
                      )}
                    </Button>
                  </div>

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

                  {/* Evidence Gallery */}
                  {evidencePhotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {evidencePhotos.map((src, i) => {
                        const globalIdx = allPhotos.indexOf(src);
                        return (
                          <div
                            key={src + i}
                            className="group relative aspect-video rounded-lg overflow-hidden border border-emerald-500/30 bg-muted/20 shadow-xs"
                          >
                            <img
                              src={getOptimizedImageUrl(src, 400, 75)}
                              alt={`Bukti penanganan ${i + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setActivePhotoIndex(globalIdx >= 0 ? globalIdx : 0);
                                  setLightboxOpen(true);
                                }}
                                className="h-6 w-6 text-white hover:bg-white/20 rounded"
                                title="Perbesar foto"
                              >
                                <ZoomIn className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setPhotoToDelete(src);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="h-6 w-6 text-rose-300 hover:text-rose-200 hover:bg-rose-500/30 rounded"
                                title="Hapus foto bukti"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

                  {/* Drag-drop Upload Dropzone */}
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
                      "border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all",
                      isDragOver
                        ? "border-primary bg-primary/10 scale-[0.99]"
                        : "border-border/70 hover:border-primary/60 hover:bg-muted/30 bg-background/50",
                      evidencePhotos.length > 0 && "py-2.5"
                    )}
                  >
                    {isUploadingEvidence ? (
                      <div className="flex flex-col items-center justify-center py-2 space-y-1">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <p className="text-xs font-medium text-foreground">
                          Sedang mengompresi & mengunggah...
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <UploadCloud className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-primary hover:underline">
                          Unggah Bukti Lapangan
                        </span>
                        <span className="text-muted-foreground text-[11px] hidden sm:inline">
                          (atau seret ke sini)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Catatan Respon Penanganan Admin with Quick Templates */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-foreground">
                      Catatan Hasil / Respon Penanganan Admin
                    </label>
                    <span className="text-[11px] text-muted-foreground">Template cepat:</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_RESOLUTION_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.label}
                        type="button"
                        onClick={() => {
                          setEditResolution((prev) =>
                            prev.trim() ? `${prev}\n${tmpl.text}` : tmpl.text
                          );
                        }}
                        className="text-2xs font-medium px-2 py-1 rounded-md bg-muted/80 hover:bg-primary/10 hover:text-primary border border-border/70 transition-colors"
                      >
                        + {tmpl.label}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    className="min-h-[120px] text-xs sm:text-sm resize-none bg-background/90"
                    value={editResolution}
                    onChange={(e) => setEditResolution(e.target.value)}
                    placeholder="Tulis ringkasan hasil kerja lapangan, tanggal penanganan, atau catatan respon admin di sini..."
                  />
                </div>
              </div>
            </div>

            {/* ── Sticky Command Footer ── */}
            <div className="shrink-0 px-4 md:px-6 py-2.5 sm:py-3 border-t border-border/70 bg-card/90 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Left: Dirty Status & Keyboard Hints */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isDirty ? (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span>Ada perubahan belum disimpan</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Data tersimpan</span>
                  </div>
                )}
                <span className="hidden xl:inline text-muted-foreground/40">•</span>
                <span className="hidden xl:inline text-[11px] text-muted-foreground">
                  Shortcut: <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">Esc</kbd> Tutup · <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">F</kbd> Fullscreen · <kbd className="px-1 py-0.5 bg-muted rounded border text-[10px]">Ctrl+S</kbd> Simpan
                </span>
              </div>

              {/* Right: Close & Save Button */}
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRequestClose}
                  className="text-xs h-8.5 px-3 rounded-lg"
                >
                  Tutup
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !selectedReport || !isDirty}
                  className="text-xs h-8.5 px-4 rounded-lg min-w-[130px] font-semibold shadow-xs"
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
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ── Photo Lightbox Modal ── */}
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
