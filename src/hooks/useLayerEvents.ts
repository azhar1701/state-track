import { useEffect, useCallback } from 'react';

/**
 * Hook untuk mendengarkan layer events dari GeoDataManager
 * Digunakan di komponen peta untuk sinkronisasi real-time
 */
export const useLayerEvents = (callbacks: {
  onLayerVisibilityChanged?: (detail: { key: string; visible: boolean }) => void;
  onLayerUpdated?: (detail: { key?: string; layerId?: string }) => void;
  onLayerDeleted?: (detail: { layerId?: string; layerKey: string }) => void;
}) => {
  const handleVisibilityChange = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ key: string; visible: boolean }>;
    callbacks.onLayerVisibilityChanged?.(customEvent.detail);
  }, [callbacks]);

  const handleLayerUpdate = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ key?: string; layerId?: string }>;
    callbacks.onLayerUpdated?.(customEvent.detail);
  }, [callbacks]);

  const handleLayerDelete = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ layerId?: string; layerKey: string }>;
    callbacks.onLayerDeleted?.(customEvent.detail);
  }, [callbacks]);

  useEffect(() => {
    window.addEventListener('layer-visibility-changed', handleVisibilityChange);
    window.addEventListener('layer-updated', handleLayerUpdate);
    window.addEventListener('layer-deleted', handleLayerDelete);

    return () => {
      window.removeEventListener('layer-visibility-changed', handleVisibilityChange);
      window.removeEventListener('layer-updated', handleLayerUpdate);
      window.removeEventListener('layer-deleted', handleLayerDelete);
    };
  }, [handleVisibilityChange, handleLayerUpdate, handleLayerDelete]);

  // Check for focus layer on mount
  useEffect(() => {
    const focusLayer = localStorage.getItem('focusLayer');
    if (focusLayer) {
      // Trigger callback with focus layer
      callbacks.onLayerUpdated?.({ key: focusLayer });
      // Clear after use
      localStorage.removeItem('focusLayer');
    }
  }, [callbacks]);
};

/**
 * Utility untuk broadcast layer events dari komponen lain
 */
export const layerEventEmitter = {
  visibilityChanged: (key: string, visible: boolean) => {
    window.dispatchEvent(
      new CustomEvent('layer-visibility-changed', { detail: { key, visible } })
    );
  },
  
  updated: (keyOrId: string, isKey = true) => {
    window.dispatchEvent(
      new CustomEvent('layer-updated', { 
        detail: isKey ? { key: keyOrId } : { layerId: keyOrId } 
      })
    );
  },
  
  deleted: (layerId: string, layerKey: string) => {
    window.dispatchEvent(
      new CustomEvent('layer-deleted', { detail: { layerId, layerKey } })
    );
  },
};
