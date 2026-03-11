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
      if (filters.category !== 'semua') {
        filtered = filtered.filter(r => r.category === filters.category);
      }
      if (filters.status !== 'semua') {
        filtered = filtered.filter(r => r.status === filters.status);
      }
      if (filters.severity !== 'semua') {
        filtered = filtered.filter(r => r.severity === filters.severity);
      }
      
      // Date filtering
      const now = startOfDay(new Date());
      if (filters.dateRange === 'today') {
        filtered = filtered.filter(r => isAfter(new Date(r.created_at), now));
      } else if (filters.dateRange === 'week') {
        const weekAgo = addDays(now, -7);
        filtered = filtered.filter(r => isAfter(new Date(r.created_at), weekAgo));
      } else if (filters.dateRange === 'month') {
        const monthAgo = addDays(now, -30);
        filtered = filtered.filter(r => isAfter(new Date(r.created_at), monthAgo));
      } else if (filters.dateRange === 'custom' && filters.customDateRange?.from) {
        const from = startOfDay(filters.customDateRange.from);
        const to = filters.customDateRange.to ? addDays(startOfDay(filters.customDateRange.to), 1) : addDays(from, 1);
        filtered = filtered.filter(r => {
          const d = new Date(r.created_at);
          return isAfter(d, from) && isBefore(d, to);
        });
      }

      return filtered;
    },
    staleTime: 1000 * 60, // 1 minute
  });
};
