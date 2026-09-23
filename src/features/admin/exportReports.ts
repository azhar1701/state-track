import { supabase } from "@/services/client";
import { formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { StatusFilter, SeverityFilter, CategoryFilter, SortOption } from "./types";

interface ExportReportsParams {
  statusFilter: StatusFilter;
  severityFilter: SeverityFilter;
  categoryFilter: CategoryFilter;
  search: string;
  sortBy: SortOption;
}

/**
 * Exports filtered reports directly from Supabase to a UTF-8 BOM CSV file for Excel compatibility.
 */
export async function exportReportsToCsv(params: ExportReportsParams): Promise<void> {
  const { statusFilter, severityFilter, categoryFilter, search, sortBy } = params;

  try {
    let query = supabase
      .from("reports")
      .select("id, title, category, status, severity, created_at, updated_at, location_name, desa, kecamatan, latitude, longitude, reporter_name, phone, resolution, priority_score");

    if (statusFilter !== "semua") query = query.eq("status", statusFilter);
    if (severityFilter !== "semua") query = query.eq("severity", severityFilter);
    if (categoryFilter !== "semua") query = query.eq("category", categoryFilter);
    
    if (search.trim()) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,location_name.ilike.%${term}%,desa.ilike.%${term}%,kecamatan.ilike.%${term}%`);
    }

    if (sortBy === "created_at_desc") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "category_asc") {
      query = query.order("category", { ascending: true }).order("created_at", { ascending: false });
    } else if (sortBy === "severity_desc") {
      query = query.order("priority_score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Export up to 2000 filtered rows
    const { data, error } = await query.limit(2000);
    if (error) throw error;

    if (!data || data.length === 0) {
      toast.info("Tidak ada data laporan yang cocok untuk diekspor");
      return;
    }

    const headers = [
      "No Tiket (ID)",
      "Tanggal Lapor",
      "Judul Laporan",
      "Kategori",
      "Tingkat Keparahan",
      "Status",
      "Skor Prioritas",
      "Lokasi",
      "Desa",
      "Kecamatan",
      "Latitude",
      "Longitude",
      "Pelapor",
      "Kontak",
      "Hasil/Respon Tindak Lanjut"
    ];

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = data.map((r) => [
      escapeCsv(r.id),
      escapeCsv(formatDateTime(r.created_at)),
      escapeCsv(r.title || "-"),
      escapeCsv(r.category || "-"),
      escapeCsv(r.severity || "-"),
      escapeCsv(r.status || "-"),
      escapeCsv(r.priority_score ?? 0),
      escapeCsv(r.location_name || "-"),
      escapeCsv(r.desa || "-"),
      escapeCsv(r.kecamatan || "-"),
      escapeCsv(r.latitude ?? "-"),
      escapeCsv(r.longitude ?? "-"),
      escapeCsv(r.reporter_name || "-"),
      escapeCsv(r.phone || "-"),
      escapeCsv(r.resolution || "-")
    ]);

    // UTF-8 BOM (\uFEFF) ensures Excel opens Indonesian characters with proper encoding
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan_sipasda_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Berhasil mengekspor ${data.length} laporan ke CSV`);
  } catch (err) {
    logger.error("Failed to export reports to CSV", err);
    toast.error("Gagal mengekspor laporan ke CSV");
  }
}
