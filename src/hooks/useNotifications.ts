import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  report_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(limit = 20) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id,user_id,title,body,type,report_id,read_at,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw error;
        if (!cancelled) setItems((data ?? []) as NotificationItem[]);
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : undefined;
        if (!cancelled) setError(msg ?? 'Gagal memuat notifikasi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();

    const channel = supabase
      .channel('notif-user-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const n = payload.new as unknown as NotificationItem;
        setItems((prev) => [n, ...prev].slice(0, limit));
        toast.info(n.title, {
          description: n.body ?? undefined,
          duration: 6000,
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, limit]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
    if (!error) setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null).eq('user_id', user.id);
    if (!error) setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
  };

  return { items, unreadCount, loading, error, markAsRead, markAllAsRead };
}
