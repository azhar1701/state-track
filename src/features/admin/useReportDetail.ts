import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
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

  // ── Upload evidence photos ──────────────────────────────────────────
  const uploadEvidenceMutation = useMutation({
    mutationFn: async ({
      files,
      userId,
      userEmail,
    }: {
      files: File[];
      userId?: string;
      userEmail?: string | null;
    }) => {
      if (!id || !report) throw new Error("Laporan tidak ditemukan");
      if (!files.length) return [];

      const opts = { maxSizeMB: 1.0, maxWidthOrHeight: 1200, useWebWorker: true };
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let fileToUpload: File | Blob = file;
        try {
          fileToUpload = await imageCompression(file, opts);
        } catch (compErr) {
          logger.warn("Image compression warning, using original:", compErr);
        }

        const fileName = `${userId || "admin"}/evidence_${id}_${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(fileName, fileToUpload, { contentType: "image/jpeg", upsert: true });

        if (uploadError) {
          logger.error("Upload evidence error:", uploadError);
          throw uploadError;
        }

        const { data } = supabase.storage.from("report-photos").getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }

      // Fetch latest photo_urls
      const { data: currentData, error: fetchErr } = await supabase
        .from("reports")
        .select("photo_url, photo_urls")
        .eq("id", id)
        .single();

      if (fetchErr) throw fetchErr;

      const existingUrls: string[] = currentData?.photo_urls || (currentData?.photo_url ? [currentData.photo_url] : []);
      const newUrls = [...existingUrls, ...uploadedUrls];

      const { error: updateErr } = await supabase
        .from("reports")
        .update({
          photo_urls: newUrls,
          photo_url: currentData?.photo_url || uploadedUrls[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      // Audit log
      try {
        await supabase.from("report_logs").insert({
          report_id: id,
          action: "edit",
          before: { photo_urls: existingUrls },
          after: { photo_urls: newUrls, added_evidence: uploadedUrls, edit_type: "evidence_upload" },
          actor_id: userId || null,
          actor_email: userEmail || null,
        });
      } catch (logErr) {
        logger.warn("Evidence log failed:", logErr);
      }

      return uploadedUrls;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", "logs", id] });
      toast.success("Foto bukti penanganan berhasil diunggah");
    },
    onError: (err) => {
      logger.error("Evidence upload failed:", err);
      toast.error("Gagal mengunggah foto bukti penanganan");
    }
  });

  // ── Delete evidence photo ──────────────────────────────────────────
  const deleteEvidenceMutation = useMutation({
    mutationFn: async ({
      photoUrl,
      userId,
      userEmail,
    }: {
      photoUrl: string;
      userId?: string;
      userEmail?: string | null;
    }) => {
      if (!id || !report) return;

      const { data: currentData, error: fetchErr } = await supabase
        .from("reports")
        .select("photo_url, photo_urls")
        .eq("id", id)
        .single();

      if (fetchErr) throw fetchErr;

      const existingUrls: string[] = currentData?.photo_urls || (currentData?.photo_url ? [currentData.photo_url] : []);
      const filteredUrls = existingUrls.filter((u) => u !== photoUrl);

      const { error: updateErr } = await supabase
        .from("reports")
        .update({
          photo_urls: filteredUrls,
          photo_url: filteredUrls[0] || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      // Best effort storage cleanup
      try {
        const parts = photoUrl.split("/report-photos/");
        if (parts[1]) {
          await supabase.storage.from("report-photos").remove([decodeURIComponent(parts[1])]);
        }
      } catch (delErr) {
        logger.warn("Storage deletion warning:", delErr);
      }

      // Audit log
      try {
        await supabase.from("report_logs").insert({
          report_id: id,
          action: "edit",
          before: { photo_urls: existingUrls },
          after: { photo_urls: filteredUrls, deleted_photo: photoUrl, edit_type: "evidence_delete" },
          actor_id: userId || null,
          actor_email: userEmail || null,
        });
      } catch (logErr) {
        logger.warn("Delete evidence log warning:", logErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports", "logs", id] });
      toast.success("Foto bukti penanganan berhasil dihapus");
    },
    onError: (err) => {
      logger.error("Delete evidence failed:", err);
      toast.error("Gagal menghapus foto bukti penanganan");
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
    uploadEvidence: uploadEvidenceMutation.mutateAsync,
    isUploadingEvidence: uploadEvidenceMutation.isPending,
    deleteEvidence: deleteEvidenceMutation.mutateAsync,
    isDeletingEvidence: deleteEvidenceMutation.isPending,
  };
};

