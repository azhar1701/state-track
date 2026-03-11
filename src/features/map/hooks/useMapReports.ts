import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/client";
import { MapFilters } from "../FilterPanel";
import { isAfter, isBefore, startOfDay, addDays } from "date-fns";

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  photo_urls?: string[] | null;
  created_at: string;
  user_id: string;
  reporter_name?: string | null;
  phone?: string | null;
  kecamatan?: string | null;
  desa?: string | null;
}

export const useMapReports = (filters: MapFilters) => {
  return useQuery({
    queryKey: ["map", "reports", filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*");
      
      if (error) throw error;
      
      let filtered = (data || []) as Report[];

      // Apply Filters
      if (filters.category && filters.category !== 'semua') {
        filtered = filtered.filter(r => r.category === filters.category);
      }
      if (filters.status && filters.status !== 'semua') {
        filtered = filtered.filter(r => r.status === filters.status);
      }
      
      // Date filtering using dateFrom/dateTo
      if (filters.dateFrom) {
        const from = startOfDay(new Date(filters.dateFrom));
        filtered = filtered.filter(r => isAfter(new Date(r.created_at), from));
      }
      if (filters.dateTo) {
        const to = addDays(startOfDay(new Date(filters.dateTo)), 1);
        filtered = filtered.filter(r => isBefore(new Date(r.created_at), to));
      }

      return filtered;
    },
    staleTime: 1000 * 60, // 1 minute
  });
};
