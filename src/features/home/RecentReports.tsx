import { logger } from "@/lib/logger";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { isSupabaseConfigured, supabase } from "@/services/client";

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
}

const STATUS_LABELS: Record<string, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
};

const SEVERITY_LABELS: Record<string, string> = {
  ringan: "Ringan",
  sedang: "Sedang",
  berat: "Berat",
};

const CATEGORY_LABELS: Record<string, string> = {
  irigasi: "Irigasi",
  sungai: "Sungai",
  lainnya: "Lainnya",
};

function StatusPill({ s }: { s: RecentItem["status"] }) {
  const label = STATUS_LABELS[s] ?? (s || "Tidak diketahui");
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-700 border border-amber-500/40";
  if (s === "diproses") {
    cls =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/20 text-primary border border-primary/40";
  } else if (s === "selesai") {
    cls =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-700 border border-emerald-500/40";
  }
  return <span className={cls}>{label}</span>;
}

function SevPill({ s }: { s?: RecentItem["severity"] }) {
  if (!s) {
    return <span className="text-xs text-muted-foreground">Belum dinilai</span>;
  }
  const label = SEVERITY_LABELS[s] ?? s;
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-200 text-slate-900 border border-slate-200";
  if (s === "sedang") {
    cls =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-700 border border-orange-500/40";
  } else if (s === "berat") {
    cls =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-500/20 text-red-700 border border-red-500/40";
  }
  return <span className={cls}>{label}</span>;
}

const formatLocation = (item: Pick<RecentItem, "location_name" | "desa" | "kecamatan">) => {
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
      if (!isSupabaseConfigured) {
        setItems([]);
        setError(null);
        return;
      }

      setError(null);
      const selectFields =
        "id,title,status,severity,created_at,category,kecamatan,desa";

      let { data, error } = await supabase
        .from("reports")
        .select(selectFields)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fallback: if 400 error occurs, try minimal select
      if (error) {
        if ((error as unknown as { status: number }).status === 400) {
          console.warn("Got 400 error, trying minimal select", error);
          const minimal = await supabase
            .from("reports")
            .select("id,title,status,created_at")
            .order("created_at", { ascending: false })
            .limit(5);
          data = minimal.data as typeof data;
          error = minimal.error as typeof error;
          if (!error && data) {
            type MinimalRecent = Pick<RecentItem, "id" | "title" | "status" | "created_at">;
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

      setItems((data || []) as RecentItem[]);
    };

    void load();
  }, []);

  return (
    <div className="glass-surface border-white/20 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Laporan Terbaru</h3>
        <Link to="/map" className="text-sm text-primary hover:text-primary-hover font-medium transition-colors">
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
          <div className="bg-white/5 rounded-xl px-4 py-8 text-center text-muted-foreground">
            Belum ada laporan.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const categoryLabel = formatCategory(it.category);
              const locationLabel = formatLocation(it);
              const createdLabel = formatDateTime(it.created_at);

              return (
                <div key={it.id} className="group glass-floating rounded-xl p-4 transition-all duration-300 cursor-pointer hover:border-primary/40 hover:-translate-y-0.5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500/20 to-teal-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <h4 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                            {it.title || "(Tanpa judul)"}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="line-clamp-1">{locationLabel}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <SevPill s={it.severity} />
                          <StatusPill s={it.status} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{createdLabel}</span>
                        </div>
                        {categoryLabel && (
                          <Badge variant="outline" className="bg-white/5 text-xs capitalize border-white/10">
                            {categoryLabel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
