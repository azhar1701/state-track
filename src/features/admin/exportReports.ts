import { supabase } from "@/services/client";
import { formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { 
  StatusFilter, 
  SeverityFilter, 
  CategoryFilter, 
  KecamatanFilter, 
  DesaFilter, 
  DateRangeFilter,
  SortOption 
} from "./types";
import { getDateRangeThreshold } from "./useAdminReports";

export interface ExportReportsParams {
  statusFilter: StatusFilter;
  severityFilter: SeverityFilter;
  categoryFilter: CategoryFilter;
  kecamatanFilter?: KecamatanFilter;
  desaFilter?: DesaFilter;
  dateRangeFilter?: DateRangeFilter;
  search: string;
  sortBy: SortOption;
}

/**
 * Builds the base Supabase query with all active filters.
 */
function buildBaseExportQuery(params: ExportReportsParams) {
  const { 
    statusFilter, 
    severityFilter, 
    categoryFilter, 
    kecamatanFilter = "semua", 
    desaFilter = "semua", 
    dateRangeFilter = "semua",
    search, 
    sortBy 
  } = params;

  let query = supabase
    .from("reports")
    .select("id, title, description, category, status, severity, created_at, updated_at, location_name, desa, kecamatan, latitude, longitude, reporter_name, phone, resolution, priority_score");

  if (statusFilter !== "semua") query = query.eq("status", statusFilter);
  if (severityFilter !== "semua") query = query.eq("severity", severityFilter);
  if (categoryFilter !== "semua") query = query.eq("category", categoryFilter);
  if (kecamatanFilter !== "semua") query = query.eq("kecamatan", kecamatanFilter);
  if (desaFilter !== "semua") query = query.eq("desa", desaFilter);

  const threshold = getDateRangeThreshold(dateRangeFilter);
  if (threshold) {
    query = query.gte("created_at", threshold.toISOString());
  }
  
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

  return query;
}

/**
 * Exports filtered reports directly from Supabase to a UTF-8 BOM CSV file for Excel compatibility.
 */
export async function exportReportsToCsv(params: ExportReportsParams): Promise<void> {
  const toastId = toast.loading("Menyiapkan dan mengekspor laporan ke CSV...");
  try {
    const query = buildBaseExportQuery(params);

    // Export up to 2000 filtered rows
    const { data, error } = await query.limit(2000);
    if (error) throw error;

    if (!data || data.length === 0) {
      toast.dismiss(toastId);
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
      let str = String(val);
      // OWASP CWE-1236 mitigation: Prevent CSV/Formula Injection in Excel / Sheets
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
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

    toast.dismiss(toastId);
    toast.success(`Berhasil mengekspor ${data.length} laporan ke CSV`);
  } catch (err) {
    toast.dismiss(toastId);
    logger.error("Failed to export reports to CSV", err);
    toast.error("Gagal mengekspor laporan ke CSV");
  }
}

/**
 * Exports filtered reports to a valid GeoJSON FeatureCollection with Point geometry for QGIS / ArcGIS.
 */
export async function exportReportsToGeoJson(params: ExportReportsParams): Promise<void> {
  const toastId = toast.loading("Mengonversi data spasial dan mengekspor ke GeoJSON...");
  try {
    const query = buildBaseExportQuery(params);

    const { data, error } = await query.limit(2000);
    if (error) throw error;

    if (!data || data.length === 0) {
      toast.dismiss(toastId);
      toast.info("Tidak ada data laporan yang cocok untuk diekspor ke GeoJSON");
      return;
    }

    const features = data
      .filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number" && !isNaN(r.latitude) && !isNaN(r.longitude))
      .map((r) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [r.longitude as number, r.latitude as number],
        },
        properties: {
          id: r.id,
          title: r.title,
          description: r.description,
          category: r.category,
          status: r.status,
          severity: r.severity,
          created_at: r.created_at,
          updated_at: r.updated_at,
          location_name: r.location_name,
          desa: r.desa,
          kecamatan: r.kecamatan,
          priority_score: r.priority_score,
          reporter_name: r.reporter_name,
          phone: r.phone,
          resolution: r.resolution,
        },
      }));

    if (features.length === 0) {
      toast.warning("Laporan yang difilter tidak memiliki koordinat geospasial valid untuk GeoJSON");
      return;
    }

    const geoJsonData = {
      type: "FeatureCollection",
      name: "SIPASDA_Laporan_Geospasial",
      crs: {
        type: "name",
        properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
      },
      features,
    };

    const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: "application/geo+json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `sipasda_laporan_spasial_${dateStamp}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.dismiss(toastId);
    toast.success(`Berhasil mengekspor ${features.length} titik spasial ke GeoJSON`);
  } catch (err) {
    toast.dismiss(toastId);
    logger.error("Failed to export GeoJSON", err);
    toast.error("Gagal mengekspor data ke GeoJSON");
  }
}
