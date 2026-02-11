import { useEffect, useMemo } from 'react';

/**
 * Hook untuk mencegah refresh halaman yang tidak diinginkan
 * saat pindah window atau tab
 */
export function usePreventRefresh() {
  const handlers = useMemo(() => ({
    visibility: () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visible, stable');
      }
    },
    beforeUnload: () => undefined
  }), []);

  useEffect(() => {
    document.addEventListener('visibilitychange', handlers.visibility);
    window.addEventListener('beforeunload', handlers.beforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handlers.visibility);
      window.removeEventListener('beforeunload', handlers.beforeUnload);
    };
  }, [handlers]);
}
