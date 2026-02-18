import { useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/services/client';
import { addReportToOutbox, deleteOutboxReport, listOutboxReports, registerBackgroundSync, type OutboxReport, type ReportOutboxPayload } from '@/features/reports/outbox';

async function uploadPhotos(userId: string, photos: OutboxReport['photos']) {
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const ext = (p.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${userId}/${Date.now()}_${i}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('report-photos')
      .upload(fileName, p.data, { contentType: p.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('report-photos').getPublicUrl(fileName);
    urls.push(publicUrlData.publicUrl);
  }
  return urls;
}

async function submitSingle(out: OutboxReport, userId: string) {
  const photoUrls = out.photos.length > 0 ? await uploadPhotos(userId, out.photos) : [];
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
  };
  const fullPayload = { ...basePayload, location_name: payload.location.name || null } as typeof basePayload & { location_name?: string | null };
  let { error } = await supabase.from('reports').insert(fullPayload);
  if (
    error &&
    typeof error.message === 'string' &&
    (
      error.message.toLowerCase().includes('column') && error.message.toLowerCase().includes('does not exist') ||
      error.message.toLowerCase().includes('schema cache') ||
      error.message.toLowerCase().includes('could not find')
    )
  ) {
    const minimal = { ...basePayload };
    const retry = await supabase.from('reports').insert(minimal);
    error = retry.error as typeof error;
  }
  if (error) throw error;
}

export function useOutboxSync(userId?: string | null) {
  const syncingRef = useRef(false);
  const userIdRef = useRef(userId);
  
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
      toast.message('Mengirim laporan tertunda...', { description: `${all.length} item` });
      for (const item of all) {
        try {
          await submitSingle(item, currentUserId);
          await deleteOutboxReport(item.id);
        } catch {
          break;
        }
      }
      toast.success('Semua laporan tertunda berhasil dikirim');
    } catch {
      // keep items in outbox
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
    };
  }, [userId, process]);
}

// Helper to enqueue from UI
export async function enqueueReportForSync(payload: ReportOutboxPayload, photos: File[]) {
  const serialized = await Promise.all(
    photos.map(async (f) => ({ name: f.name, type: f.type, data: f }))
  );
  await addReportToOutbox({ payload, photos: serialized });
  await registerBackgroundSync();
}
