import React, { memo, useMemo } from 'react';
import { GeoJSON, Pane, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { GeoLayer } from '@/hooks/useMapLayers';
import type { FeatureCollection, Geometry, Feature } from 'geojson';

interface MapLayerRendererProps {
  layer: GeoLayer;
  data: FeatureCollection<Geometry>;
  onFeatureClick?: (feature: Feature, layer: L.Layer) => void;
}

const MapLayerRendererComponent = ({ layer, data, onFeatureClick }: MapLayerRendererProps) => {
  const style = useMemo(() => {
    const base = layer.style_config;
    return (feature?: Feature) => ({
      color: base.color || '#3b82f6',
      weight: base.weight || 2,
      opacity: (base.opacity || 0.8) * layer.opacity,
      fillColor: base.fillColor || base.color || '#3b82f6',
      fillOpacity: (base.fillOpacity || 0.3) * layer.opacity,
      dashArray: base.dashArray,
    });
  }, [layer.style_config, layer.opacity]);

  const popupContent = useMemo(() => {
    return (feature: Feature) => {
      const { fields, template } = layer.popup_config;
      if (template) return template;
      if (!fields.length) return null;

      return fields
        .map((field) => {
          const value = feature.properties?.[field];
          return value ? `<strong>${field}:</strong> ${value}` : null;
        })
        .filter(Boolean)
        .join('<br/>');
    };
  }, [layer.popup_config]);

  // Heatmap rendering
  if (layer.layer_type === 'heatmap') {
    const points = useMemo(() => {
      return data.features
        .filter((f) => f.geometry.type === 'Point')
        .map((f) => {
          const coords = (f.geometry as any).coordinates;
          return [coords[1], coords[0], 1] as [number, number, number];
        });
    }, [data]);

    // Note: Heatmap requires custom implementation with useMap hook
    return null; // Implement separately with L.heatLayer
  }

  // Cluster rendering
  if (layer.layer_type === 'cluster') {
    // Note: Clustering requires MarkerClusterGroup
    return null; // Implement separately with react-leaflet-cluster
  }

  // Standard GeoJSON rendering
  return (
    <Pane name={`layer-${layer.key}`} style={{ zIndex: layer.z_index }}>
      <GeoJSON
        key={`${layer.key}-${layer.opacity}-${JSON.stringify(layer.style_config)}`}
        data={data}
        style={style}
        pointToLayer={(feature, latlng) => {
          const radius = layer.style_config.radius || 8;
          return L.circleMarker(latlng, {
            radius,
            ...style(feature),
          });
        }}
        onEachFeature={(feature, leafletLayer) => {
          // Popup
          const content = popupContent(feature);
          if (content) {
            leafletLayer.bindPopup(content);
          }

          // Tooltip on hover
          const name = feature.properties?.name || feature.properties?.NAMOBJ;
          if (name) {
            leafletLayer.bindTooltip(String(name), { sticky: true });
          }

          // Click handler
          if (onFeatureClick) {
            leafletLayer.on('click', () => onFeatureClick(feature, leafletLayer));
          }

          // Hover effects
          leafletLayer.on('mouseover', function () {
            if (this.setStyle) {
              this.setStyle({
                weight: (layer.style_config.weight || 2) + 1,
                fillOpacity: Math.min(((layer.style_config.fillOpacity || 0.3) + 0.2) * layer.opacity, 1),
              });
            }
          });

          leafletLayer.on('mouseout', function () {
            if (this.setStyle) {
              this.setStyle(style(feature));
            }
          });
        }}
      />
    </Pane>
  );
};

export const MapLayerRenderer = memo(
  MapLayerRendererComponent,
  (prev, next) =>
    prev.layer.id === next.layer.id &&
    prev.layer.opacity === next.layer.opacity &&
    prev.layer.z_index === next.layer.z_index &&
    JSON.stringify(prev.layer.style_config) === JSON.stringify(next.layer.style_config) &&
    prev.data === next.data
);
