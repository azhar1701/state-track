import { useState, useCallback } from 'react';
import { MapContainer, GeoJSON as RLGeoJSON, Pane } from 'react-leaflet';
import { LayerDetailDrawer } from '@/components/map/LayerDetailDrawer';
import { useLayerHighlight } from '@/hooks/useLayerHighlight';
import L from 'leaflet';
import type { FeatureCollection, Geometry, Feature } from 'geojson';

interface SelectedFeature {
  id: string;
  feature: Feature<Geometry>;
  layer: L.Layer;
}

export default function MapWithLayerDrawer() {
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection<Geometry> | null>(null);

  const { registerLayer, unregisterLayer } = useLayerHighlight({
    selectedFeatureId: selectedFeature?.id || null,
    highlightStyle: {
      color: '#00ffff',
      weight: 4,
      opacity: 1,
      fillColor: '#00ffff',
      fillOpacity: 0.3,
    },
    originalStyle: {
      color: '#6b7280',
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0,
    },
  });

  const handleFeatureClick = useCallback((feature: Feature<Geometry>, layer: L.Layer) => {
    const featureId = 
      (feature.properties?.id as string) ||
      (feature.properties?.objectid as string) ||
      (feature.properties?.fid as string) ||
      `feature-${Math.random().toString(36).substr(2, 9)}`;

    setSelectedFeature({ id: featureId, feature, layer });
  }, []);

  const handleZoomToFeature = useCallback(() => {
    if (!selectedFeature) return;

    const layer = selectedFeature.layer;
    if ('getBounds' in layer && typeof layer.getBounds === 'function') {
      const bounds = (layer as L.Polyline | L.Polygon).getBounds();
      // Trigger map zoom via custom event
      const event = new CustomEvent('zoom-to-bounds', { detail: { bounds } });
      window.dispatchEvent(event);
    }
  }, [selectedFeature]);

  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, layer: L.Layer) => {
      const featureId = 
        (feature.properties?.id as string) ||
        (feature.properties?.objectid as string) ||
        (feature.properties?.fid as string) ||
        `feature-${Math.random().toString(36).substr(2, 9)}`;

      // Register layer for highlighting
      const originalStyle = {
        color: '#6b7280',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0,
      };
      registerLayer(featureId, layer, originalStyle);

      // Add click handler
      layer.on('click', () => {
        handleFeatureClick(feature, layer);
      });

      // Add hover effect
      layer.on('mouseover', () => {
        if ('setStyle' in layer && typeof layer.setStyle === 'function') {
          (layer as L.Path).setStyle({ weight: 2, color: '#111827' });
        }
      });

      layer.on('mouseout', () => {
        if (selectedFeature?.id !== featureId) {
          if ('setStyle' in layer && typeof layer.setStyle === 'function') {
            (layer as L.Path).setStyle(originalStyle);
          }
        }
      });

      // Cleanup on layer remove
      layer.on('remove', () => {
        unregisterLayer(featureId);
      });

      // Add tooltip
      const name = 
        (feature.properties?.NAMOBJ as string) ||
        (feature.properties?.name as string) ||
        (feature.properties?.NAME as string) ||
        'Layer';
      
      layer.bindTooltip(name, { sticky: true, direction: 'center' });
    },
    [handleFeatureClick, registerLayer, unregisterLayer, selectedFeature?.id]
  );

  return (
    <div className="relative h-screen">
      <MapContainer center={[-7.325, 108.353]} zoom={12} className="h-full w-full">
        {geoJsonData && (
          <Pane name="geojson-layers" style={{ zIndex: 350 }}>
            <RLGeoJSON
              key="geojson-layer"
              data={geoJsonData}
              style={() => ({
                color: '#6b7280',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0,
              })}
              onEachFeature={onEachFeature}
            />
          </Pane>
        )}
      </MapContainer>

      <LayerDetailDrawer
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        feature={selectedFeature?.feature || null}
        onZoomToFeature={handleZoomToFeature}
        blockList={['objectid', 'shape_length', 'shape_area', 'fid', 'gid']}
      />
    </div>
  );
}
