import { logger } from "@/lib/logger";
import {
  createRealtimeBatcher,
  type RealtimePayload,
} from "@/lib/realtime-batcher";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/client";
import { useAuth } from "@/features/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CalendarDays, MapPin, RefreshCw } from "lucide-react";
import { ReportDetailDrawer } from "@/features/map/ReportDetailDrawer";
import EmptyState from "@/components/common/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
// Sync button removed per request

type ReportRow = {
  id: string;
  title: string;
  description: string;
  category:
  | "jalan"
  | "jembatan"
  | "irigasi"
  | "sungai"
  | "drainase"
  | "lainnya";
  status: "baru" | "diproses" | "selesai";
  incident_date: string | null;
  created_at: string;
  user_id: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  severity: "ringan" | "sedang" | "berat" | null;
  resolution: string | null;
  reporter_name: string | null;
  phone: string | null;
  kecamatan: string | null;
  desa: string | null;
};

const categoryLabels: Record<string, string> = {
  irigasi: "Irigasi",
  sungai: "Sungai",
  lainnya: "Lainnya",
};

const statusLabels: Record<string, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
};

const PAGE_SIZE = 10;

export default function MyReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          "id,title,description,category,status,incident_date,created_at,user_id,latitude,longitude,photo_url,severity,kecamatan,desa",
          { count: "exact" },
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (where.status !== "all")
        query = query.eq(
          "status",
          where.status as "baru" | "diproses" | "selesai",
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
          | "lainnya",
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
        // Fallback for missing columns - ensure all ReportRow fields are present
        const {
          data: fallbackData,
          error: fallbackError,
          count: fallbackCount,
        } = await supabase
          .from("reports")
          .select(
            "id,title,description,category,status,incident_date,created_at,user_id,latitude,longitude,photo_url",
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
      { debounceMs: 500, maxWaitMs: 2000, channel: "myreports-changes" },
    );
    const channel = supabase
      .channel("myreports-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter: `user_id = eq.${user.id} `,
        },
        (payload) => batcher.push(payload as RealtimePayload),
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
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold">Laporan Saya</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="text-xs md:text-sm px-2 md:px-4 h-8 md:h-9"
          >
            <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Muat
            Ulang
          </Button>
        </div>
      </div>

      <Card variant="glass" className="mb-3 md:mb-4">
        <CardHeader className="pb-3 md:pb-4 px-3 md:px-6 pt-4 md:pt-6">
          <CardTitle className="text-base md:text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 px-3 md:px-6 pb-3 md:pb-4">
          <div className="space-y-1">
            <Label className="text-xs md:text-sm">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
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
            <Label className="text-xs md:text-sm">Kategori</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {Object.entries(categoryLabels)
                  .filter(([val]) => val !== "drainase")
                  .map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-2 md:col-span-2">
            <Label className="text-xs md:text-sm">Cari Judul</Label>
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Ketik judul..."
              className="h-8 md:h-9 text-xs md:text-sm"
            />
          </div>
          <div className="col-span-2 md:col-span-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={resetFilters}
              size="sm"
              className="h-8 md:h-9 text-xs md:text-sm"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 md:pb-4 px-3 md:px-6 pt-4 md:pt-6">
          <CardTitle className="text-base md:text-lg">Daftar Laporan</CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-xs md:text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Belum ada laporan"
              description="Buat laporan pertama Anda untuk mulai memantau perbaikan."
              illustration="reports"
              action={{
                label: "Buat Laporan",
                onClick: () => navigate("/report"),
              }}
              secondaryAction={{
                label: "Lihat Peta",
                onClick: () => navigate("/map"),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs md:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-[10px] md:text-xs">
                      Foto
                    </TableHead>
                    <TableHead className="text-[10px] md:text-xs">
                      Judul
                    </TableHead>
                    <TableHead className="text-[10px] md:text-xs hidden sm:table-cell">
                      Kategori
                    </TableHead>
                    <TableHead className="text-[10px] md:text-xs">
                      Status
                    </TableHead>
                    <TableHead className="text-[10px] md:text-xs hidden md:table-cell">
                      Tanggal Kejadian
                    </TableHead>
                    <TableHead className="text-[10px] md:text-xs hidden lg:table-cell">
                      Dibuat
                    </TableHead>
                    <TableHead className="text-right text-[10px] md:text-xs">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: ReportRow, index: number) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.05,
                        duration: 0.5,
                        ease: [0.25, 1, 0.5, 1],
                      }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell className="px-2 md:px-4">
                        <div className="w-10 h-10 rounded border border-border/50 overflow-hidden bg-muted/50">
                          {r.photo_url ? (
                            <img
                              src={getOptimizedImageUrl(r.photo_url, 80, 60)}
                              alt={r.title || "Foto laporan"}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[12rem] md:max-w-[20rem] px-2 md:px-4">
                        <div className="font-medium line-clamp-2 text-xs md:text-sm">
                          {r.title ?? "Tanpa judul"}
                        </div>
                        {r.description && (
                          <div className="text-[10px] md:text-xs text-muted-foreground line-clamp-2 mt-1">
                            {r.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-2 md:px-4 text-xs md:text-sm">
                        <Badge variant="secondary" className="text-[10px]">
                          {categoryLabels[r.category ?? ""] ??
                            r.category ??
                            "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>
                          {statusLabels[r.status ?? ""] ?? r.status ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarDays className="w-4 h-4" />
                          {r.incident_date
                            ? new Date(r.incident_date).toLocaleDateString()
                            : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setSelectedReport(r)}>
                          <MapPin className="w-4 h-4 mr-2" /> Detail
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  {Array.from({ length: pageCount }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <PaginationItem key={p}>
                        <button
                          className={`h-9 w-9 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${p === page ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground"}`}
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
        </CardContent>
      </Card>

      {/* Floating detail card, sama seperti MapView */}
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
