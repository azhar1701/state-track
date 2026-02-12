/**
 * CONTOH INTEGRASI useLayerEvents di Komponen Peta
 * 
 * File ini adalah contoh bagaimana mengintegrasikan layer events
 * dari GeoDataManager ke komponen peta (MapView, OptimizedMapView, dll)
 */

import { useLayerEvents } from '@/hooks/useLayerEvents';
import { useLayerManager } from '@/hooks/useLayerManager';
import { useEffect, useRef, useState } from 'react';

import type { Map as LeafletMap, LayerGroup } from 'leaflet';

export function ExampleMapIntegration() {
  const mapRef = useRef<LeafletMap | null>(null);
  const layerGroupsRef = useRef<Map<string, LayerGroup>>(new Map());
  const { fetchLayerData, clearCache } = useLayerManager();
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());

  // Listen to layer events from GeoDataManager
  useLayerEvents({
    onLayerVisibilityChanged: async (detail) => {
      console.log('Layer visibility changed:', detail);
      
      if (detail.visible) {
        setVisibleLayers(prev => new Set(prev).add(detail.key));
        const featureCollection = await fetchLayerData(detail.key);
        if (featureCollection && mapRef.current) {
          // Add to map and fit bounds
        }
      } else {
        setVisibleLayers(prev => {
          const next = new Set(prev);
          next.delete(detail.key);
          return next;
        });
      }
    },

    onLayerUpdated: async (detail) => {
      console.log('Layer updated:', detail);
      const key = detail.key;
      if (!key) return;
      clearCache(key);
      if (visibleLayers.has(key)) {
        const featureCollection = await fetchLayerData(key);
        // Reload layer on map
      }
    },

    onLayerDeleted: (detail) => {
      console.log('Layer deleted:', detail);
      setVisibleLayers(prev => {
        const next = new Set(prev);
        next.delete(detail.layerKey);
        return next;
      });
      clearCache(detail.layerKey);
    },
  });

  useEffect(() => {
    const focusLayer = localStorage.getItem('focusLayer');
    if (focusLayer) {
      console.log('Focus layer from GeoDataManager:', focusLayer);
      (async () => {
        const featureCollection = await fetchLayerData(focusLayer);
        if (featureCollection && mapRef.current) {
          // Add layer and fit bounds with animation
        }
      })();
      localStorage.removeItem('focusLayer');
    }
  }, [fetchLayerData]);

  return <div id="map" />;
}
