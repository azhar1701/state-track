import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

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
  jalan: "Jalan",
  jembatan: "Jembatan",
  irigasi: "Irigasi",
  drainase: "Drainase",
  sungai: "Sungai",
  lainnya: "Lainnya",
};

function StatusPill({ s }: { s: RecentItem["status"] }) {
  const label = STATUS_LABELS[s] ?? (s || "Tidak diketahui");
  let cls =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-700 border border-amber-500/40";
  if (s === "diproses") {
    cls =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-700 border border-blue-500/40";
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
        "id,title,status,severity,location_name,created_at,category,kecamatan,desa";

      let { data, error } = await supabase
        .from("reports")
        .select(selectFields)
        .order("created_at", { ascending: false })
        .limit(5);

      if (
        error &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("column") &&
        error.message.toLowerCase().includes("does not exist")
      ) {
        const retry = await supabase
          .from("reports")
          .select("id,title,status,severity,created_at,category,kecamatan,desa")
          .order("created_at", { ascending: false })
          .limit(5);
        data = retry.data as typeof data;
        error = retry.error as typeof error;
        if (!error && data) {
          type PartialRecent = Omit<RecentItem, "location_name">;
          const list = data as unknown as PartialRecent[];
          const mapped: RecentItem[] = list.map((d) => ({ ...d, location_name: null }));
          setItems(mapped);
          return;
        }
      }

      if (error) {
        setError("Gagal memuat data laporan.");
        setItems([]);
        return;
      }

      setItems((data || []) as RecentItem[]);
    };

    void load();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Laporan Terbaru</CardTitle>
          <Link to="/map" className="text-sm text-primary hover:underline">
            Lihat semua
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {items === null ? (
          <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
            Memuat...
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border px-4 py-6 text-sm text-muted-foreground">
            Belum ada laporan.
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {items.map((it) => {
              const categoryLabel = formatCategory(it.category);
              const locationLabel = formatLocation(it);
              const createdLabel = formatDateTime(it.created_at);

              return (
                <li key={it.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm leading-tight line-clamp-2">
                          {it.title || "(Tanpa judul)"}
                        </span>
                        {categoryLabel ? (
                          <Badge
                            variant="outline"
                            className="bg-muted text-muted-foreground capitalize"
                          >
                            {categoryLabel}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{locationLabel}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <SevPill s={it.severity} />
                      <StatusPill s={it.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{createdLabel}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
