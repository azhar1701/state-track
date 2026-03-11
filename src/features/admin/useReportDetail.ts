import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { 
  ReportDetail, 
  ReportLogEntry, 
  REPORT_DETAIL_COLUMNS,
  ReportListItem,
  ReportSeverity
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
      userId, 
      userEmail,
      force = false 
    }: { 
      title: string; 
      severity: ReportSeverity | ''; 
      resolution: string; 
      userId?: string; 
      userEmail?: string | null;
      force?: boolean;
    }) => {
      if (!id) return;

      // 1. Check for conflict if not forcing
      if (!force) {
        const { data: latest } = await supabase
          .from("reports")
          .select("updated_at")
          .eq("id", id)
          .single();
        
        if (latest && report.updated_at && new Date(latest.updated_at) > new Date(report.updated_at)) {
          // Fetch full latest data for conflict resolution
          const { data: conflictData } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();
          throw { type: 'conflict', data: conflictData };
        }
      }

      // 2. Perform update
      const { error } = await supabase
        .from("reports")
        .update({
          title,
          severity: severity || null,
          resolution,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;

      // 3. Log changes
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", "logs", id] });
      toast.success("Perubahan berhasil disimpan");
    },
    onError: (err: any) => {
      if (err.type === 'conflict') {
        // Handled by component
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
