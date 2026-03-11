import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { 
  ReportListItem, 
  ReportStatus, 
  ReportSeverity, 
  StatusFilter, 
  SeverityFilter, 
  CategoryFilter, 
  SortOption,
  REPORT_LIST_COLUMNS,
  SEVERITY_WEIGHT,
  ReportCategory
} from "./types";
import { useEffect } from "react";
import { createRealtimeBatcher } from "@/lib/realtime-batcher";

interface FetchReportsParams {
  statusFilter: StatusFilter;
  severityFilter: SeverityFilter;
  categoryFilter: CategoryFilter;
  search: string;
  sortBy: SortOption;
  page: number;
  pageSize: number;
}

export const useAdminReports = (params: FetchReportsParams) => {
  const queryClient = useQueryClient();
  const { statusFilter, severityFilter, categoryFilter, search, sortBy, page, pageSize } = params;

  // Realtime subscription
  useEffect(() => {
    const batcher = createRealtimeBatcher(
      () => {
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      },
      { debounceMs: 500, maxWaitMs: 2000, channel: "admin-reports-realtime" }
    );

    const channel = supabase
      .channel("admin-reports-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, 
        (payload) => batcher.push(payload as any)
      )
      .subscribe();

    return () => {
      batcher.destroy();
      channel.unsubscribe();
    };
  }, [queryClient]);

  const reportsQuery = useQuery({
    queryKey: ["admin", "reports", statusFilter, severityFilter, categoryFilter, search, sortBy, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select(REPORT_LIST_COLUMNS, { count: "exact" });

      if (statusFilter !== "semua") query = query.eq("status", statusFilter);
      if (severityFilter !== "semua") query = query.eq("severity", severityFilter);
      if (categoryFilter !== "semua") query = query.eq("category", categoryFilter);
      if (search) query = query.ilike("title", `%${search}%`);

      if (sortBy === "created_at_desc") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "category_asc") {
        query = query.order("category", { ascending: true }).order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      let items = (data || []).map(item => ({
        ...item,
        category: (item.category as ReportCategory) || "lainnya",
        status: (item.status as ReportStatus) || "baru",
        severity: (item.severity as ReportSeverity | null) || null,
      })) as ReportListItem[];

      if (sortBy === "severity_desc") {
        items = [...items].sort((a, b) => {
          const weightB = b.severity ? SEVERITY_WEIGHT[b.severity] : 0;
          const weightA = a.severity ? SEVERITY_WEIGHT[a.severity] : 0;
          if (weightB !== weightA) return weightB - weightA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      return { items, total: count || 0 };
    },
  });

  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [totalRes, baruRes, diprosesRes, selesaiRes] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "baru"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "diproses"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "selesai"),
      ]);
      
      return {
        total: totalRes.count || 0,
        baru: baruRes.count || 0,
        diproses: diprosesRes.count || 0,
        selesai: selesaiRes.count || 0,
      };
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("category");
      if (error) throw error;
      
      const set = new Set<ReportCategory>();
      data.forEach((r) => {
        if (r.category) set.add(r.category as ReportCategory);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, prevStatus, userId, userEmail }: { id: string, status: ReportStatus, prevStatus?: ReportStatus, userId?: string, userEmail?: string | null }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", id);
      if (error) throw error;

      // Log the change
      await supabase.from("report_logs").insert({
        report_id: id,
        action: "status_update",
        before: { status: prevStatus || null },
        after: { status },
        actor_id: userId || null,
        actor_email: userEmail || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Status berhasil diupdate");
    },
    onError: (err) => {
      logger.error("Update status failed:", err);
      toast.error("Gagal update status");
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status, userId, userEmail }: { ids: string[], status: ReportStatus, userId?: string, userEmail?: string | null }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .in("id", ids);
      if (error) throw error;

      // Batch logs
      const logs = ids.map(id => ({
        report_id: id,
        action: "bulk_status_update" as const,
        before: {}, // Simplified for bulk
        after: { status },
        actor_id: userId || null,
        actor_email: userEmail || null,
      }));
      await supabase.from("report_logs").insert(logs);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(`Berhasil mengupdate ${variables.ids.length} laporan`);
    },
    onError: (err) => {
      logger.error("Bulk update failed:", err);
      toast.error("Gagal melakukan bulk update");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Laporan berhasil dihapus");
    },
    onError: (err) => {
      logger.error("Delete report failed:", err);
      toast.error("Gagal menghapus laporan");
    }
  });

  return {
    reports: reportsQuery.data?.items || [],
    totalFiltered: reportsQuery.data?.total || 0,
    isLoadingReports: reportsQuery.isLoading,
    isErrorReports: reportsQuery.isError,
    stats: statsQuery.data || { total: 0, baru: 0, diproses: 0, selesai: 0 },
    categories: categoriesQuery.data || [],
    isLoadingCategories: categoriesQuery.isLoading,
    updateStatus: updateStatusMutation.mutateAsync,
    bulkUpdate: bulkUpdateMutation.mutateAsync,
    deleteReport: deleteMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending || bulkUpdateMutation.isPending || deleteMutation.isPending,
  };
};
