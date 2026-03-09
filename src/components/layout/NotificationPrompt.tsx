import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';

const NotificationPrompt = () => {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        const dismissed = localStorage.getItem('notification-prompt-dismissed');
        if (!dismissed) {
          setTimeout(() => setShow(true), 60000); // Show after 1 minute
        }
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShow(false);
      
      if (result === 'granted') {
        new Notification('Notifikasi Aktif', {
          body: 'Anda akan menerima update tentang laporan Anda',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!show || permission !== 'default') return null;

  return (
    <Card className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card border-border shadow-sm p-4 shadow-lifted animate-in slide-in-from-bottom-4">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <Bell className="w-6 h-6 text-primary" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="font-semibold text-sm">Aktifkan Notifikasi</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Dapatkan update real-time tentang status laporan Anda
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={requestPermission} size="sm" className="flex-1 btn-haptic">
              Aktifkan
            </Button>
            <Button onClick={dismiss} size="sm" variant="ghost" className="btn-haptic">
              Nanti
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export { NotificationPrompt };
