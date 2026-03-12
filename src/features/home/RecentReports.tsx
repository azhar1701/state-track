import { logger } from "@/lib/logger";
import { cachedQuery } from "@/lib/supabase-cache";
import { getOptimizedImageUrl } from "@/lib/formatters";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/services/client";
import { StatusBadge, SeverityBadge } from "@/components/common/ReportBadges";
import { SystemGuard } from "@/components/common/SystemGuard";

interface RecentItem {
  id: string;
  title: string;
  status: "baru" | "diproses" | "selesai" | string;
  severity?: "ringan" | "sedang" | "berat" | string | null;
  category?: string | null;
  location_name?: string | null;
  kecamatan?: string | null;
  desa?: string | null;
  created_at: string;
  photo_url?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  irigasi: "Irigasi",
  sungai: "Sungai",
  lainnya: "Lainnya",
};


const formatLocation = (
  item: Pick<RecentItem, "location_name" | "desa" | "kecamatan">,
) => {
  if (item.location_name && item.location_name.trim().length > 0) {
    return item.location_name.trim();
  }
  const parts = [item.desa, item.kecamatan]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);
  if (parts.length > 0) {
    return parts.join(", ");
  }
  return "Lokasi belum diisi";
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCategory = (value: RecentItem["category"]) => {
  if (!value) {
    return null;
  }
  return CATEGORY_LABELS[value] ?? value;
};

export default function RecentReports() {
  const [items, setItems] = useState<RecentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      const selectFields =
        "id,title,status,severity,created_at,category,kecamatan,desa";

      let { data, error } = await cachedQuery(
        "home:recent-reports",
        () =>
          supabase
            .from("reports")
            .select(selectFields + ",photo_url")
            .order("created_at", { ascending: false })
            .limit(5),
        { ttlMs: 30_000, staleWhileRevalidate: true },
      );

      // Fallback: if 400 error occurs, try minimal select
      if (error) {
        if ((error as unknown as { status: number }).status === 400) {
          logger.warn("Got 400 error, trying minimal select", error);
          const minimal = await supabase
            .from("reports")
            .select("id,title,status,created_at")
            .order("created_at", { ascending: false })
            .limit(5);
          data = minimal.data as typeof data;
          error = minimal.error as typeof error;
          if (!error && data) {
            type MinimalRecent = Pick<
              RecentItem,
              "id" | "title" | "status" | "created_at"
            >;
            const list = data as unknown as MinimalRecent[];
            const mapped: RecentItem[] = list.map((d) => ({
              ...d,
              severity: null,
              category: null,
              location_name: null,
              kecamatan: undefined,
              desa: undefined,
            }));
            setItems(mapped);
            return;
          }
        }
      }

      if (error) {
        logger.error("Failed to load recent reports:", error);
        setError("Gagal memuat data laporan.");
        setItems([]);
        return;
      }

      setItems((data || []) as unknown as RecentItem[]);
    };

    void load();
  }, []);

  return (
    <SystemGuard mode="overlay">
      <div className="bg-card border-border shadow-sm border-white/20 rounded-2xl p-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold">Laporan Terbaru</h2>
          <Link
            to="/map"
            className="text-sm text-primary hover:text-primary-hover font-medium transition-colors"
          >
            Lihat semua →
          </Link>
        </div>
        <div className="space-y-3">
          {items === null ? (
            <div className="bg-white/5 rounded-xl px-4 py-8 text-center text-muted-foreground">
              Memuat...
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-8 text-center text-red-400">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white/5 rounded-xl px-4 py-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-[bounce_3s_ease-in-out_infinite]">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Semua infrastruktur tampak baik!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Jika Anda melihat kerusakan, jadilah yang pertama melaporkannya.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => {
                const categoryLabel = formatCategory(it.category);
                const locationLabel = formatLocation(it);
                const createdLabel = formatDateTime(it.created_at);

                return (
                  <Link
                    key={it.id}
                    to={`/map?report=${it.id}`}
                    className="group bg-popover/95 backdrop-blur-md border border-border border-l-4 border-l-primary/60 shadow-sm rounded-xl p-4 transition-all duration-300 hover:border-l-primary hover:border-r-primary/40 hover:-translate-y-1 hover:shadow-md active:scale-[0.99] block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500/20 to-teal-500/20 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                        {it.photo_url ? (
                          <img
                            src={getOptimizedImageUrl(it.photo_url, 100, 60)}
                            alt={it.title || "Foto laporan"}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <h4 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                              {it.title || "(Tanpa judul)"}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="line-clamp-1">
                                {locationLabel}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <SeverityBadge severity={it.severity} />
                            <StatusBadge status={it.status} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{createdLabel}</span>
                          </div>
                          {categoryLabel && (
                            <Badge
                              variant="outline"
                              className="bg-white/5 text-xs capitalize border-white/10"
                            >
                              {categoryLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SystemGuard>
  );
}
