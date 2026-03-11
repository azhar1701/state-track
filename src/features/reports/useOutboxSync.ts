import { useEffect, useRef, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/services/client';
import { 
  addReportToOutbox, 
  deleteOutboxReport, 
  listOutboxReports, 
  registerBackgroundSync, 
  updateOutboxReport,
  type OutboxReport, 
  type ReportOutboxPayload 
} from '@/features/reports/outbox';
import { calculatePriorityScore } from '@/services/ai';
import { logger } from '@/lib/logger';

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;

function calculateBackoff(retryCount: number) {
  return Math.min(30000, BASE_BACKOFF_MS * Math.pow(2, retryCount));
}

async function uploadPhotosRobust(userId: string, out: OutboxReport) {
  const currentUrls = [...out.photoUrls];
  
  // Start from the first photo that hasn't been uploaded yet
  for (let i = currentUrls.length; i < out.photos.length; i++) {
    const p = out.photos[i];
    const ext = (p.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${userId}/${out.id}_${i}_${Date.now()}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(fileName, p.data, { contentType: p.type, upsert: false });
    
    if (uploadError) {
      // Save progress so we don't re-upload previous photos
      out.photoUrls = currentUrls;
      await updateOutboxReport(out);
      throw uploadError;
    }
    
    const { data: publicUrlData } = supabase.storage.from('report-photos').getPublicUrl(fileName);
    currentUrls.push(publicUrlData.publicUrl);
    
    // Incrementally save progress
    out.photoUrls = currentUrls;
    await updateOutboxReport(out);
  }
  
  return currentUrls;
}

async function submitSingleRobust(out: OutboxReport, userId: string) {
  // 1. Upload photos (with partial success recovery)
  const photoUrls = out.photos.length > 0 ? await uploadPhotosRobust(userId, out) : [];
  
  // 2. Prepare payload
  const payload = out.payload as ReportOutboxPayload;
  const basePayload = {
    user_id: userId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    status: 'baru' as const,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    photo_url: photoUrls[0] || null,
    photo_urls: photoUrls.length ? photoUrls : null,
    severity: payload.severity,
    incident_date: payload.incidentDate,
    reporter_name: payload.reporterName,
    phone: payload.phone,
    kecamatan: payload.kecamatan,
    desa: payload.desa,
    priority_score: calculatePriorityScore(payload.category, payload.severity),
  };
  
  const fullPayload = { 
    ...basePayload, 
    location_name: payload.location.name || null 
  } as typeof basePayload & { location_name?: string | null };

  // 3. Submit to database
  let { error } = await supabase.from('reports').insert(fullPayload);
  
  if (error) {
    // Basic schema error retry logic
    if (error.message?.toLowerCase().includes('column') || error.message?.toLowerCase().includes('schema cache')) {
      const { error: retryError } = await supabase.from('reports').insert(basePayload);
      if (retryError) throw retryError;
    } else {
      throw error;
    }
  }
}

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  
  const checkOutbox = async () => {
    const all = await listOutboxReports();
    setPendingCount(all.length);
  };

  useEffect(() => {
    checkOutbox();
    const interval = setInterval(checkOutbox, 10000);
    return () => clearInterval(interval);
  }, []);

  return { pendingCount, refresh: checkOutbox };
}

export function useOutboxSync(userId?: string | null) {
  const syncingRef = useRef(false);
  const userIdRef = useRef(userId);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const process = useMemo(() => async () => {
    const currentUserId = userIdRef.current;
    if (!currentUserId || !isSupabaseConfigured || syncingRef.current) return;
    
    syncingRef.current = true;
    try {
      const all = await listOutboxReports();
      if (all.length === 0) return;

      logger.info(`[Sync] Processing ${all.length} pending reports`);

      for (const item of all) {
        if (item.retryCount >= MAX_RETRIES) {
          logger.warn(`[Sync] Skipping report ${item.id} after ${item.retryCount} failed attempts`);
          continue;
        }

        try {
          await submitSingleRobust(item, currentUserId);
          await deleteOutboxReport(item.id);
          logger.info(`[Sync] Successfully sent report ${item.id}`);
        } catch (err: any) {
          logger.error(`[Sync] Failed to send report ${item.id}`, err);
          
          item.retryCount++;
          item.lastError = err.message || 'Unknown error';
          await updateOutboxReport(item);
          
          // Wait before processing next item in outbox (exponential backoff)
          const backoff = calculateBackoff(item.retryCount);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            syncingRef.current = false;
            void process();
          }, backoff);
          
          return; // Stop processing for now
        }
      }
      
      toast.success('Laporan offline berhasil tersinkronisasi');
    } catch (err) {
      logger.error('[Sync] Fatal sync error', err);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    const onlineHandler = () => { void process(); };
    const msgHandler = (evt: Event) => {
      if ((evt as MessageEvent).data === 'sync:submit-reports') {
        void process();
      }
    };
    
    window.addEventListener('online', onlineHandler);
    navigator.serviceWorker?.addEventListener?.('message', msgHandler);
    void process();

    return () => {
      window.removeEventListener('online', onlineHandler);
      navigator.serviceWorker?.removeEventListener?.('message', msgHandler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [userId, process]);
}

export async function enqueueReportForSync(payload: ReportOutboxPayload, photos: File[]) {
  const serialized = await Promise.all(
    photos.map(async (f) => ({ name: f.name, type: f.type, data: f }))
  );
  await addReportToOutbox({ payload, photos: serialized });
  await registerBackgroundSync();
}
