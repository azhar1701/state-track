import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { 
  ReportDetail, 
  ReportLogEntry, 
  REPORT_DETAIL_COLUMNS,
  ReportListItem,
  ReportSeverity,
  ReportStatus
} from "./types";

export const useReportDetail = (report: ReportListItem | null) => {
  const queryClient = useQueryClient();
  const id = report?.id;

  const detailQuery = useQuery({
    queryKey: ["admin", "reports", "detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("reports")
        .select(REPORT_DETAIL_COLUMNS)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as ReportDetail;
    },
    enabled: !!id,
  });

  const logsQuery = useQuery({
    queryKey: ["admin", "reports", "logs", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("report_logs")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ReportLogEntry[];
    },
    enabled: !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ 
      title, 
      severity, 
      resolution, 
      status,
      userId, 
      userEmail,
      force = false 
    }: { 
      title: string; 
      severity: ReportSeverity | ''; 
      resolution: string; 
      status?: ReportStatus;
      userId?: string; 
      userEmail?: string | null;
      force?: boolean;
    }) => {
      if (!id || !report) return;

      const expectedUpdatedAt = force ? null : (report.updated_at || null);
      const targetStatus = status || report.status || "baru";

      // 1. Try atomic PostgreSQL RPC for conflict detection and update
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "update_report_with_conflict_check",
        {
          p_report_id: id,
          p_expected_updated_at: expectedUpdatedAt,
          p_title: title,
          p_severity: severity || null,
          p_resolution: resolution || "",
          p_status: targetStatus,
        }
      );

      if (rpcError) {
        // Fallback if RPC function does not exist in environment
        if (rpcError.message?.includes("does not exist")) {
          logger.warn("RPC update_report_with_conflict_check not found, falling back to direct table update");
          if (!force && report.updated_at) {
            const { data: latest } = await supabase
              .from("reports")
              .select("*")
              .eq("id", id)
              .single();
            if (latest && new Date(latest.updated_at) > new Date(report.updated_at)) {
              throw { type: 'conflict', data: latest };
            }
          }
          const { error: directErr } = await supabase
            .from("reports")
            .update({
              title,
              severity: severity || null,
              resolution,
              updated_at: new Date().toISOString()
            })
            .eq("id", id);
          if (directErr) throw directErr;
        } else {
          throw rpcError;
        }
      } else {
        const result = rpcResult as { success: boolean; conflict: boolean; current_data?: unknown } | null;
        if (result && !result.success && result.conflict) {
          throw { type: 'conflict', data: result.current_data };
        }
      }

      // 2. Log changes for audit trail
      try {
        await supabase.from("report_logs").insert({
          report_id: id,
          action: "edit",
          before: { 
            title: report.title, 
            severity: report.severity, 
            resolution: report.resolution 
          },
          after: { title, severity, resolution },
          actor_id: userId || null,
          actor_email: userEmail || null,
        });
      } catch (logErr) {
        logger.warn("Audit log creation skipped or failed:", logErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", "logs", id] });
      toast.success("Perubahan berhasil disimpan");
    },
    onError: (err: unknown) => {
      if (typeof err === "object" && err !== null && "type" in err && (err as { type: string }).type === "conflict") {
        toast.warning("Terdeteksi pembaruan data oleh operator lain", {
          description: "Data laporan telah berubah di server. Halaman diperbarui ke versi terkini."
        });
        queryClient.invalidateQueries({ queryKey: ["admin", "reports", "detail", id] });
        return;
      }
      logger.error("Save failed", err);
      toast.error("Gagal menyimpan perubahan");
    }
  });

  return {
    fullReport: detailQuery.data,
    detailLoading: detailQuery.isLoading,
    logs: logsQuery.data || [],
    logsLoading: logsQuery.isLoading,
    saveEdits: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
};
