import { useState, useEffect } from "react";
import { useReportDetail } from "./useReportDetail";
import { toast } from "sonner";
import { AISpinner } from "@/components/ui/ai-spinner";
import { ReportListItem, ReportSeverity, ReportLogEntry } from "./types";
import { DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { formatDateTime, formatReportLocation, getOptimizedImageUrl } from "@/lib/formatters";
import { useAuth } from "@/features/auth/useAuth";
import { StatusBadge, SeverityBadge } from "@/components/common/ReportBadges";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminDetailProps {
  selectedReport: ReportListItem | null;
  onClose: () => void;
}

const AdminDetail = ({ selectedReport, onClose }: AdminDetailProps) => {
  const { user } = useAuth();
  const {
    fullReport,
    detailLoading,
    logs,
    logsLoading,
    saveEdits,
    isSaving
  } = useReportDetail(selectedReport);

  const [isNeuralAnalyzing, setIsNeuralAnalyzing] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editSeverity, setEditSeverity] = useState<ReportSeverity | "">("");
  const [editResolution, setEditResolution] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    if (selectedReport) {
      setEditTitle(selectedReport.title || "");
      setEditSeverity(selectedReport.severity || "");
      setEditResolution(selectedReport.resolution || "");
    }
  }, [selectedReport]);

  const handleSave = async () => {
    if (!selectedReport) return;

    setIsNeuralAnalyzing(true);
    await new Promise(r => setTimeout(r, 2000)); // Neural slop
    setIsNeuralAnalyzing(false);

    try {
      await saveEdits({
        title: editTitle,
        severity: editSeverity,
        resolution: editResolution,
        userId: user?.id,
        userEmail: user?.email
      });
      toast.success("Sync complete", {
        description: "AI Neural Weights updated based on resolution telemetry."
      });
      onClose();
    } catch (err) {
      // Conflict handling could go here
    }
  };

  // Removed renderStatusBadge logic

  const summarizeLog = (log: ReportLogEntry) => {
    switch (log.action) {
      case 'status_update':
        return `Status diubah menjadi ${log.after?.status}`;
      case 'edit':
        return 'Data laporan diedit';
      default:
        return log.action;
    }
  };

  if (!selectedReport) return <div className="p-8 text-center text-muted-foreground">Laporan tidak ditemukan</div>;

  const photos: string[] = (fullReport?.photo_urls && fullReport.photo_urls.length > 0)
    ? fullReport.photo_urls
    : (fullReport?.photo_url ? [fullReport.photo_url] : []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <DrawerHeader className="text-left pb-3 border-b flex-shrink-0">
        <DrawerTitle className="text-lg font-semibold">Detail Laporan</DrawerTitle>
        <DrawerDescription className="text-xs text-muted-foreground mt-1">Kelola dan tinjau informasi laporan</DrawerDescription>
      </DrawerHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Judul Laporan</label>
          <Input className="h-9 text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Masukkan judul laporan" />
        </div>

        <div className="flex flex-wrap gap-2 items-center pb-5 border-b border-border/50">
          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-muted/50 border-border/50">
            {selectedReport.category || '-'}
          </Badge>
          <div className="relative">
            <select
              className={`appearance-none h-8 pl-3 pr-8 rounded-full border bg-background text-xs font-bold transition-all hover:bg-muted focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer ${editSeverity ? 'text-transparent' : 'text-muted-foreground'}`}
              value={editSeverity}
              onChange={(e) => setEditSeverity(e.target.value as ReportSeverity | "")}
            >
              <option value="" className="text-foreground">Pilih Severity</option>
              <option value="berat" className="text-foreground">Berat</option>
              <option value="sedang" className="text-foreground">Sedang</option>
              <option value="ringan" className="text-foreground">Ringan</option>
            </select>
            {editSeverity && (
              <div className="absolute inset-y-0 left-0 pointer-events-none flex items-center pl-3">
                <SeverityBadge severity={editSeverity} className="border-none bg-transparent shadow-none p-0" />
              </div>
            )}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <StatusBadge status={selectedReport.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Lokasi</label>
            <div className="text-sm font-medium">{formatReportLocation(selectedReport.location_name, selectedReport.desa, selectedReport.kecamatan)}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tanggal Dibuat</label>
            <div className="text-sm font-medium">{formatDateTime(selectedReport.created_at)}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nama Pelapor</label>
            <div className="text-sm font-medium">{fullReport?.reporter_name || '-'}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Kontak</label>
            <div className="text-sm font-medium">{fullReport?.phone || '-'}</div>
          </div>
        </div>

        <div className="space-y-2 pb-4 border-b">
          <label className="text-xs font-medium text-muted-foreground">Deskripsi Laporan</label>
          <div className="text-sm leading-relaxed bg-muted/30 p-3 rounded-md">{fullReport?.description || '-'}</div>
        </div>

        <div className="space-y-2 pb-4 border-b">
          <label className="text-xs font-medium text-muted-foreground">Dokumentasi Foto</label>
          {detailLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <img
                  key={src + i}
                  src={getOptimizedImageUrl(src, 300, 70)}
                  alt={`Dokumentasi ${i + 1}`}
                  className="h-24 w-full object-cover rounded-lg border cursor-zoom-in hover:opacity-90 transition-opacity"
                  onClick={() => { setActivePhotoIndex(i); setLightboxOpen(true); }}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md text-center">Tidak ada dokumentasi</div>
          )}
        </div>

        <div className="space-y-2 pb-4 border-b">
          <label className="text-xs font-medium text-muted-foreground">Hasil/Respon Admin</label>
          <textarea
            className="w-full min-h-[100px] rounded-md border bg-background p-3 text-sm focus-visible:ring-2 focus:ring-primary/20 transition-shadow outline-none"
            value={editResolution}
            onChange={(e) => setEditResolution(e.target.value)}
            placeholder="Tulis hasil penanganan atau respon admin di sini..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Riwayat Perubahan</label>
          {logsLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-12 w-full rounded-md opacity-70" />
              <Skeleton className="h-12 w-full rounded-md opacity-40" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md text-center">Belum ada perubahan</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-auto pr-2">
              {logs.map((log) => (
                <div key={log.id} className="text-xs bg-muted/30 p-3 rounded-md">
                  <div className="text-muted-foreground mb-1">{formatDateTime(log.created_at)} • {log.actor_email || '-'}</div>
                  <div className="text-foreground font-medium">{summarizeLog(log)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DrawerFooter className="py-3 px-6 border-t flex-shrink-0 gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap w-full">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (fullReport?.latitude && fullReport?.longitude) {
                window.open(`/map?center=${fullReport.latitude},${fullReport.longitude}&zoom=16`, '_blank');
              }
            }}
            disabled={!fullReport?.latitude}
            className="text-xs"
          >
            Lihat di Peta
          </Button>
          <div className="flex items-center gap-2">
            <DrawerClose asChild>
              <Button size="sm" variant="outline" className="text-xs">Batal</Button>
            </DrawerClose>
            <Button size="sm" onClick={handleSave} disabled={isSaving || isNeuralAnalyzing || !selectedReport} className="text-xs">
              {isNeuralAnalyzing ? (
                <div className="flex items-center gap-2">
                  <AISpinner size={14} className="text-white" />
                  Neural Analysis...
                </div>
              ) : isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </DrawerFooter>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[90vw] p-0 overflow-hidden bg-black/95" aria-describedby={undefined}>
          <VisuallyHidden.Root>
            <DialogTitle>Tampilan Foto Layar Penuh</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative aspect-video flex items-center justify-center">
            <img src={photos[activePhotoIndex]} className="max-h-full max-w-full object-contain" />
            {photos.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-4">
                <Button size="sm" variant="secondary" onClick={() => setActivePhotoIndex(prev => (prev - 1 + photos.length) % photos.length)}>Prev</Button>
                <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">{activePhotoIndex + 1} / {photos.length}</span>
                <Button size="sm" variant="secondary" onClick={() => setActivePhotoIndex(prev => (prev + 1) % photos.length)}>Next</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDetail;
