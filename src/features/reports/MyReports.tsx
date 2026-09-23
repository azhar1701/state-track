import { logger } from "@/lib/logger";
import {
  createRealtimeBatcher,
  type RealtimePayload,
} from "@/lib/realtime-batcher";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/client";
import { useAuth } from "@/features/auth/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { getOptimizedImageUrl } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, SeverityBadge } from "@/components/common/ReportBadges";
import {
  CalendarDays,
  MapPin,
  RefreshCw,
  LayoutGrid,
  List,
  Check,
  Loader2,
  FileText,
  Map,
  CheckCircle2,
} from "lucide-react";
import { ReportDetailDrawer } from "@/features/map/ReportDetailDrawer";
import EmptyState from "@/components/common/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import type { Report } from "@/services/types";

type ReportRow = Report;

const categoryLabels: Record<string, string> = {
  jalan: "Jalan",
  jembatan: "Jembatan",
  irigasi: "Irigasi",
  sungai: "Sungai",
  drainase: "Drainase",
  lainnya: "Lainnya",
};

const statusLabels: Record<string, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
};

const PAGE_SIZE = 10;

// Visual Tracking Stepper Component
const ReportTrackingStepper = ({ status }: { status: string }) => {
  const steps = [
    { key: "baru", label: "Terkirim", desc: "Diterima sistem" },
    { key: "diproses", label: "Diproses", desc: "Verifikasi teknis" },
    { key: "selesai", label: "Selesai", desc: "Tuntas ditangani" },
  ];

  const getStepState = (stepKey: string) => {
    if (status === "selesai") return "completed";
    if (status === "diproses") {
      if (stepKey === "baru") return "completed";
      if (stepKey === "diproses") return "active";
      return "upcoming";
    }
    // baru
    if (stepKey === "baru") return "active";
    return "upcoming";
  };

  return (
    <div className="py-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting Progress Line */}
        <div className="absolute top-3.5 left-5 right-5 h-0.5 bg-muted z-0">
          <div
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{
              width:
                status === "selesai"
                  ? "100%"
                  : status === "diproses"
                  ? "50%"
                  : "0%",
            }}
          />
        </div>

        {steps.map((st) => {
          const state = getStepState(st.key);
          return (
            <div
              key={st.key}
              className="flex flex-col items-center text-center z-10"
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2",
                  state === "completed"
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                    : state === "active"
                    ? "bg-primary border-primary text-primary-foreground shadow-sm ring-4 ring-primary/20"
                    : "bg-card border-border text-muted-foreground"
                )}
              >
                {state === "completed" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : state === "active" && st.key === "diproses" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span className="text-[10px]">
                    {st.key === "baru" ? "1" : st.key === "diproses" ? "2" : "3"}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold mt-1",
                  state === "completed"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : state === "active"
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {st.label}
              </span>
              <span className="text-[9px] text-muted-foreground hidden sm:inline">
                {st.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Robust Report Thumbnail with Error Fallback
const ReportThumbnail = ({
  photoUrl,
  title,
  size = "md",
}: {
  photoUrl?: string | null;
  title?: string | null;
  size?: "sm" | "md";
}) => {
  const [hasError, setHasError] = useState(false);
  const isSm = size === "sm";
  const dimClass = isSm ? "w-10 h-10 rounded-lg" : "w-16 h-16 sm:w-20 sm:h-20 rounded-xl";
  const iconSize = isSm ? "w-4 h-4" : "w-6 h-6";

  if (!photoUrl || hasError) {
    return (
      <div
        className={cn(
          dimClass,
          "border border-border/60 bg-muted/60 flex items-center justify-center flex-shrink-0"
        )}
      >
        <MapPin className={cn(iconSize, "text-muted-foreground/40")} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        dimClass,
        "border border-border/60 overflow-hidden bg-muted flex-shrink-0"
      )}
    >
      <img
        src={getOptimizedImageUrl(photoUrl, isSm ? 100 : 200, 75)}
        alt={title || "Foto laporan"}
        loading="lazy"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform hover:scale-105"
      />
    </div>
  );
};

export default function MyReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (isMobile) {
      setViewMode("cards");
    }
  }, [isMobile]);

  const where = useMemo(() => ({ status, category, q }), [status, category, q]);

  const loadData = useCallback(async () => {
    setSelectedReport(null);
    if (!user) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("reports")
        .select(
          "id,title,description,category,status,incident_date,created_at,user_id,latitude,longitude,photo_url,severity,kecamatan,desa,resolution",
          { count: "exact" }
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (where.status !== "all")
        query = query.eq(
          "status",
          where.status as "baru" | "diproses" | "selesai"
        );
      if (where.category !== "all")
        query = query.eq(
          "category",
          where.category as
            | "jalan"
            | "jembatan"
            | "irigasi"
            | "sungai"
            | "drainase"
            | "lainnya"
        );
      if (where.q) query = query.ilike("title", `%${where.q}%`);

      const {
        data: initialData,
        error: initialError,
        count: initialCount,
      } = await query;
      let data = initialData;
      const error = initialError;
      let count = initialCount;

      if (error) {
        const {
          data: fallbackData,
          error: fallbackError,
          count: fallbackCount,
        } = await supabase
          .from("reports")
          .select(
            "id,title,description,category,status,incident_date,created_at,user_id,latitude,longitude,photo_url"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (fallbackError) throw fallbackError;
        data = (fallbackData || []).map((r: Record<string, unknown>) => ({
          ...r,
          severity: null,
          kecamatan: null,
          desa: null,
          resolution: null,
          reporter_name: null,
          phone: null,
          description: "Tidak ada deskripsi",
        })) as unknown as ReportRow[];
        count = fallbackCount;
      }
      const mapped = (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        latitude:
          typeof r.latitude === "string" ? Number(r.latitude) : r.latitude,
        longitude:
          typeof r.longitude === "string" ? Number(r.longitude) : r.longitude,
      })) as ReportRow[];

      setRows(mapped);
      setTotal(count ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal memuat laporan";
      logger.error("Failed to load reports:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, page, where.status, where.category, where.q]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Realtime sync for user's reports
  useEffect(() => {
    if (!user) return;
    const batcher = createRealtimeBatcher(
      () => {
        void loadData();
      },
      { debounceMs: 500, maxWaitMs: 2000, channel: "myreports-changes" }
    );
    const channel = supabase
      .channel("myreports-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => batcher.push(payload as RealtimePayload)
      )
      .subscribe();
    return () => {
      batcher.destroy();
      supabase.removeChannel(channel);
    };
  }, [user, loadData]);

  const resetFilters = () => {
    setStatus("all");
    setCategory("all");
    setQ("");
    setPage(1);
  };

  const refetch = () => {
    void loadData();
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 md:py-6 max-w-6xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Laporan Saya
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Pantau linimasa progres dan tindak lanjut penanganan laporan Anda
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Mode View Toggle */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80">
            <Button
              type="button"
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="h-7 sm:h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-7 sm:h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="text-xs px-3 h-8 sm:h-9 rounded-xl btn-haptic gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Muat Ulang</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="mb-4 bg-card/80 backdrop-blur-sm border-border/80 shadow-sm rounded-2xl">
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 sm:p-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                {Object.entries(statusLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Kategori</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-2 md:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">Cari Judul</Label>
            <div className="flex gap-2">
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari laporan..."
                className="h-9 text-xs rounded-xl flex-1"
              />
              {(status !== "all" || category !== "all" || q) && (
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  size="sm"
                  className="h-9 px-3 text-xs rounded-xl flex-shrink-0"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 rounded-2xl space-y-3">
              <div className="flex gap-3">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-6 text-center text-sm text-destructive rounded-2xl">
          {error}
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada laporan"
          description="Laporan infrastruktur sumber daya air yang Anda kirimkan akan terpantau statusnya di sini."
          illustration="reports"
          action={{
            label: "Buat Laporan Baru",
            onClick: () => navigate("/report"),
          }}
          secondaryAction={{
            label: "Eksplor Peta GIS",
            onClick: () => navigate("/map"),
          }}
        />
      ) : viewMode === "cards" ? (
        /* CARDS TRACKING VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r, index) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.04,
                duration: 0.35,
                ease: "easeOut",
              }}
            >
              <Card className="rounded-2xl border-border/80 bg-card/90 backdrop-blur-md shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                <div className="p-4 space-y-3">
                  {/* Top: Photo Thumbnail + Title & Badges */}
                  <div className="flex gap-3 items-start">
                    <ReportThumbnail
                      photoUrl={r.photo_url}
                      title={r.title}
                      size="md"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={r.status} />
                        {r.severity && <SeverityBadge severity={r.severity} />}
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5"
                        >
                          {categoryLabels[r.category ?? ""] ?? r.category ?? "-"}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-1 leading-snug">
                        {r.title || "Tanpa Judul"}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {(r.desa || r.kecamatan) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                            <span className="truncate">
                              {[r.desa, r.kecamatan].filter(Boolean).join(", ")}
                            </span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {r.incident_date
                              ? new Date(r.incident_date).toLocaleDateString("id-ID")
                              : new Date(r.created_at).toLocaleDateString("id-ID")}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description Excerpt */}
                  {r.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-xl border border-border/40">
                      {r.description}
                    </p>
                  )}

                  {/* Stepper Linimasa */}
                  <div className="pt-1 border-t border-border/40">
                    <ReportTrackingStepper status={r.status} />
                  </div>

                  {/* Resolution Notes if available */}
                  {r.resolution && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
                      <div className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Tanggapan Petugas:
                      </div>
                      <p className="line-clamp-2 leading-relaxed">{r.resolution}</p>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="px-4 py-3 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ID: {r.id.slice(0, 8)}...
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/map?report=${r.id}`)}
                      className="h-8 px-2.5 text-xs rounded-lg btn-haptic gap-1"
                    >
                      <Map className="w-3.5 h-3.5 text-primary" />
                      <span>Peta</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedReport(r)}
                      className="h-8 px-3 text-xs font-semibold rounded-lg btn-haptic gap-1.5 shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW FOR DESKTOP */
        <Card className="bg-card/90 backdrop-blur-md border-border/80 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="text-xs md:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Judul & Lokasi</TableHead>
                  <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, index) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="p-2 sm:p-3">
                      <ReportThumbnail
                        photoUrl={r.photo_url}
                        title={r.title}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="p-2 sm:p-3 max-w-xs">
                      <div className="font-semibold text-foreground line-clamp-1">
                        {r.title || "Tanpa Judul"}
                      </div>
                      {(r.desa || r.kecamatan) && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {[r.desa, r.kecamatan].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell p-2 sm:p-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {categoryLabels[r.category ?? ""] ?? r.category ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 sm:p-3">
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell p-2 sm:p-3 text-xs text-muted-foreground">
                      {r.incident_date
                        ? new Date(r.incident_date).toLocaleDateString("id-ID")
                        : new Date(r.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="p-2 sm:p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReport(r)}
                        className="h-8 px-2.5 text-xs rounded-lg btn-haptic gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination>
            <PaginationContent>
              {Array.from({ length: pageCount }).map((_, i) => {
                const p = i + 1;
                return (
                  <PaginationItem key={p}>
                    <button
                      className={cn(
                        "h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs sm:text-sm font-medium transition-colors btn-haptic",
                        p === page
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                      onClick={() => setPage(p)}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </button>
                  </PaginationItem>
                );
              })}
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailDrawer
            report={selectedReport as ReportRow}
            onClose={() => setSelectedReport(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
