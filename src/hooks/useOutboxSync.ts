import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { addReportToOutbox, deleteOutboxReport, listOutboxReports, registerBackgroundSync, type OutboxReport, type ReportOutboxPayload } from '@/lib/outbox';

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
  const { error } = await supabase.from('reports').insert({
    user_id: userId,
    title: payload.title,
    description: payload.description,
  category: payload.category,
    status: 'baru',
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    location_name: payload.location.name || null,
    photo_url: photoUrls[0] || null,
    photo_urls: photoUrls.length ? photoUrls : null,
    severity: payload.severity,
    incident_date: payload.incidentDate,
    reporter_name: payload.reporterName,
    phone: payload.phone,
    kecamatan: payload.kecamatan,
    desa: payload.desa,
  });
  if (error) throw error;
}

export function useOutboxSync(userId?: string | null) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    const process = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const all = await listOutboxReports();
        if (all.length === 0) return;
        toast.message('Mengirim laporan tertunda...', { description: `${all.length} item` });
        for (const item of all) {
          try {
            await submitSingle(item, userId);
            await deleteOutboxReport(item.id);
          } catch {
            // stop processing; will retry later
            break;
          }
        }
        toast.success('Semua laporan tertunda berhasil dikirim');
      } catch (e) {
        // keep items in outbox; will retry later
      } finally {
        syncingRef.current = false;
      }
    };

    const onlineHandler = () => { void process(); };
    window.addEventListener('online', onlineHandler);

    // Kick once on mount
    void process();

    // Messages from SW to trigger processing
    const msgHandler = (evt: Event) => {
      const data = (evt as MessageEvent).data;
      if (data === 'sync:submit-reports') {
        void process();
      }
    };
    navigator.serviceWorker?.addEventListener?.('message', msgHandler);

    return () => {
      window.removeEventListener('online', onlineHandler);
  navigator.serviceWorker?.removeEventListener?.('message', msgHandler);
    };
  }, [userId]);
}

// Helper to enqueue from UI
export async function enqueueReportForSync(payload: ReportOutboxPayload, photos: File[]) {
  const serialized = await Promise.all(
    photos.map(async (f) => ({ name: f.name, type: f.type, data: f }))
  );
  await addReportToOutbox({ payload, photos: serialized });
  await registerBackgroundSync();
}
