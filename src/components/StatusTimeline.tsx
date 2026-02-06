import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ReportLogEntry = Database['public']['Tables']['report_logs']['Row'];

export const StatusTimeline = ({ logs }: { logs: ReportLogEntry[] }) => {
  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      status_update: 'Status Diubah',
      assigned: 'Ditugaskan',
      resolved: 'Selesai',
      created: 'Dibuat',
      photo_added: 'Foto Ditambahkan',
      comment_added: 'Komentar Ditambahkan',
    };
    return labels[action] || action;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'status_update':
      case 'assigned':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDateTime = (date: string): string => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Tidak ada catatan aktivitas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, i) => (
        <div key={log.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-background border-2 border-primary p-1.5">
              {getActionIcon(log.action)}
            </div>
            {i < logs.length - 1 && (
              <div className="w-0.5 h-12 bg-border mt-2 mb-2" />
            )}
          </div>
          <div className="flex-1 pb-4 pt-1">
            <p className="font-medium text-sm">{getActionLabel(log.action)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(log.created_at)}
            </p>
            {log.actor_email && (
              <p className="text-xs text-muted-foreground">
                oleh {log.actor_email.split('@')[0]}
              </p>
            )}
            {log.details && (
              <p className="text-xs mt-1 text-foreground">
                {typeof log.details === 'string'
                  ? log.details
                  : JSON.stringify(log.details)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
