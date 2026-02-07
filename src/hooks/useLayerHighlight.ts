import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface UseLayerHighlightOptions {
  selectedFeatureId: string | null;
  highlightStyle?: L.PathOptions;
  originalStyle?: L.PathOptions;
}

export function useLayerHighlight({
  selectedFeatureId,
  highlightStyle = {
    color: '#00ffff',
    weight: 4,
    opacity: 1,
    fillColor: '#00ffff',
    fillOpacity: 0.3,
  },
  originalStyle = {
    color: '#6b7280',
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0,
  },
}: UseLayerHighlightOptions) {
  const layersRef = useRef<Map<string, { layer: L.Layer; originalStyle: L.PathOptions }>>(new Map());

  const registerLayer = (featureId: string, layer: L.Layer, style: L.PathOptions) => {
    layersRef.current.set(featureId, { layer, originalStyle: style });
  };

  const unregisterLayer = (featureId: string) => {
    layersRef.current.delete(featureId);
  };

  useEffect(() => {
    // Reset all layers to original style
    layersRef.current.forEach(({ layer, originalStyle: stored }) => {
      if ('setStyle' in layer && typeof layer.setStyle === 'function') {
        (layer as L.Path).setStyle(stored);
      }
    });

    // Highlight selected layer
    if (selectedFeatureId) {
      const entry = layersRef.current.get(selectedFeatureId);
      if (entry && 'setStyle' in entry.layer && typeof entry.layer.setStyle === 'function') {
        (entry.layer as L.Path).setStyle(highlightStyle);
        
        // Bring to front
        if ('bringToFront' in entry.layer && typeof entry.layer.bringToFront === 'function') {
          (entry.layer as L.Path).bringToFront();
        }
      }
    }
  }, [selectedFeatureId, highlightStyle]);

  return { registerLayer, unregisterLayer };
}
