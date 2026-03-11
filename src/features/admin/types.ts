import type { Database } from "@/services/types";

export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
export type ReportStatus = Database["public"]["Enums"]["report_status"];
export type ReportSeverity = Database["public"]["Enums"]["report_severity"];
export type ReportCategory = Database["public"]["Enums"]["report_category"];

export type ReportListItem = Pick<
  ReportRow,
  "id" | "title" | "category" | "status" | "created_at" | "updated_at" | "location_name" | "severity" | "kecamatan" | "desa" | "resolution"
>;

export type ReportDetail = Pick<
  ReportRow,
  "description" | "reporter_name" | "phone" | "latitude" | "longitude" | "photo_url" | "photo_urls"
>;

export type ReportLogEntry = Database["public"]["Tables"]["report_logs"]["Row"];

export type StatusFilter = "semua" | ReportStatus;
export type SeverityFilter = "semua" | ReportSeverity;
export type CategoryFilter = "semua" | ReportCategory;
export type SortOption = "created_at_desc" | "severity_desc" | "category_asc";

export const REPORT_LIST_COLUMNS = "id,title,category,status,created_at,updated_at,severity,kecamatan,desa,resolution";
export const REPORT_DETAIL_COLUMNS = "description,reporter_name,phone,latitude,longitude,photo_url,photo_urls";
export const SEVERITY_WEIGHT: Record<ReportSeverity, number> = {
  ringan: 1,
  sedang: 2,
  berat: 3,
};

export const REPORT_STATUSES: readonly ReportStatus[] = ['baru', 'diproses', 'selesai'];
export const REPORT_SEVERITIES: readonly ReportSeverity[] = ['ringan', 'sedang', 'berat'];
export const SORT_OPTIONS: readonly SortOption[] = ['created_at_desc', 'severity_desc', 'category_asc'];
export const ADMIN_TABS = ['reports', 'insights', 'geo', 'help', 'settings'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];
