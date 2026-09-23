import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Copy,
  Check,
  Share2,
  MapPin,
  FileText,
  Home,
  ShieldCheck,
  Clock,
} from "lucide-react";

const ReportSuccess = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const id = params.get("id");
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success("ID Laporan berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Gagal menyalin ID laporan");
    }
  };

  const handleShareWhatsApp = () => {
    const text = id
      ? `Halo, saya telah melaporkan infrastruktur SDA di Kabupaten Ciamis melalui SIPASDA dengan No. Tiket: ${id}. Mohon bantuan untuk pemantauan dan tindak lanjut.`
      : "Halo, saya telah mengirimkan laporan infrastruktur sumber daya air melalui aplikasi SIPASDA Ciamis.";
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8 md:py-12 bg-gradient-to-b from-primary/5 via-background to-secondary/10">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-lg bg-card/90 backdrop-blur-xl border border-border/80 rounded-3xl p-6 sm:p-8 shadow-float text-center space-y-6"
      >
        {/* Animated Badge Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 18 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full border border-emerald-500/40 pointer-events-none"
          />
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Laporan Berhasil Dicatat
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Terima Kasih atas Partisipasi Anda!
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Data infrastruktur telah terkirim dan masuk ke antrean verifikasi teknis Bidang Sumber Daya Air Kab. Ciamis.
          </p>
        </div>

        {/* Digital Ticket Card */}
        {id ? (
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                Nomor Tiket / ID Laporan
              </span>
              <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                Resmi SIPASDA
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-background/80 dark:bg-background/50 border border-border/80 rounded-xl p-2.5">
              <span className="font-mono text-sm sm:text-base font-semibold text-foreground truncate select-all">
                {id}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyId}
                className="h-8 px-2.5 text-xs font-medium gap-1.5 btn-haptic flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-muted/40 border border-border/60 rounded-2xl p-3 text-xs text-muted-foreground">
            Laporan Anda tersimpan secara lokal dan akan disinkronkan otomatis saat jaringan tersedia.
          </div>
        )}

        {/* SLA Information Box */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-left text-xs text-muted-foreground">
          <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Estimasi Waktu Verifikasi: 1×24 Jam Kerja</p>
            <p>Petugas akan memeriksa kelayakan lokasi dan tingkat keparahan untuk menjadwalkan penanganan lapangan.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/me/reports")}
              className="w-full h-11 text-xs sm:text-sm font-semibold gap-2 rounded-xl btn-haptic"
            >
              <FileText className="w-4 h-4 text-primary" />
              Lacak Laporan Saya
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/map")}
              className="w-full h-11 text-xs sm:text-sm font-semibold gap-2 rounded-xl btn-haptic"
            >
              <MapPin className="w-4 h-4 text-emerald-500" />
              Lihat di Peta GIS
            </Button>
          </div>

          <Button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full h-11 text-xs sm:text-sm font-semibold gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md btn-haptic"
          >
            <Share2 className="w-4 h-4" />
            Bagikan Bukti Lapor ke WhatsApp
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full text-xs text-muted-foreground hover:text-foreground h-9 gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            Kembali ke Halaman Beranda
          </Button>
        </div>
      </motion.div>
    </main>
  );
};

export default ReportSuccess;
