import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export function usePWAUpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  });

  useEffect(() => {
    if (!needRefresh) return;
    const id = toast.info('Versi baru tersedia', {
      description: 'Klik muat ulang untuk memperbarui aplikasi.',
      action: {
        label: 'Muat Ulang',
        onClick: async () => {
          try {
            await updateServiceWorker(true);
          } finally {
            window.location.reload();
          }
        },
      },
      duration: 10000,
      onDismiss: () => setNeedRefresh(false),
    });
    return () => {
      // Ensure cleanup returns void; dismiss returns an id in some typings
      toast.dismiss(id as unknown as string);
    };
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);
}
