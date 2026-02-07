import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const OfflineState = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 page-transition">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-lifted">
        <div className="w-20 h-20 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
          <CloudOff className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Mode Offline</h3>
          <p className="text-muted-foreground">
            Anda sedang offline. Beberapa fitur mungkin tidak tersedia.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-left">
          <div className="flex items-center gap-2 text-emerald-600">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Peta dan data tersimpan dapat diakses</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Laporan baru akan dikirim otomatis saat online</span>
          </div>
          <div className="flex items-center gap-2 text-amber-600">
            <div className="w-2 h-2 rounded-full bg-amber-600" />
            <span>Sinkronisasi data dinonaktifkan</span>
          </div>
        </div>

        {onRetry && (
          <Button onClick={onRetry} className="w-full btn-haptic">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Sambungkan Lagi
          </Button>
        )}
      </Card>
    </div>
  );
};
