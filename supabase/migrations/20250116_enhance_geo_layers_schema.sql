-- Enhanced Layers Table Schema for Professional GIS
-- Migration: 20250116_enhance_geo_layers_schema.sql

-- Add new columns to existing geo_layers table
ALTER TABLE public.geo_layers
ADD COLUMN IF NOT EXISTS layer_type TEXT CHECK (layer_type IN ('geojson', 'wms', 'cluster', 'heatmap', 'tile')) DEFAULT 'geojson',
ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT '{"color": "#3b82f6", "weight": 2, "opacity": 0.8, "fillOpacity": 0.3}'::jsonb,
ADD COLUMN IF NOT EXISTS popup_config JSONB DEFAULT '{"fields": [], "template": null}'::jsonb,
ADD COLUMN IF NOT EXISTS legend_config JSONB DEFAULT '{"label": "", "color": "#3b82f6", "visible": true}'::jsonb,
ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 400,
ADD COLUMN IF NOT EXISTS opacity NUMERIC(3,2) DEFAULT 1.0 CHECK (opacity >= 0 AND opacity <= 1),
ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_geo_layers_layer_type ON public.geo_layers(layer_type);
CREATE INDEX IF NOT EXISTS idx_geo_layers_visible ON public.geo_layers(visible);
CREATE INDEX IF NOT EXISTS idx_geo_layers_z_index ON public.geo_layers(z_index);

-- Update existing rows with default values
UPDATE public.geo_layers 
SET 
  layer_type = COALESCE(layer_type, 'geojson'),
  style_config = COALESCE(style_config, '{"color": "#3b82f6", "weight": 2, "opacity": 0.8, "fillOpacity": 0.3}'::jsonb),
  popup_config = COALESCE(popup_config, '{"fields": [], "template": null}'::jsonb),
  legend_config = COALESCE(legend_config, '{"label": "", "color": "#3b82f6", "visible": true}'::jsonb),
  z_index = COALESCE(z_index, 400),
  opacity = COALESCE(opacity, 1.0),
  visible = COALESCE(visible, true),
  metadata = COALESCE(metadata, '{}'::jsonb)
WHERE layer_type IS NULL;

COMMENT ON COLUMN public.geo_layers.layer_type IS 'Type of layer: geojson, wms, cluster, heatmap, tile';
COMMENT ON COLUMN public.geo_layers.style_config IS 'Leaflet path options: color, weight, opacity, fillColor, fillOpacity, dashArray';
COMMENT ON COLUMN public.geo_layers.popup_config IS 'Popup configuration: fields to display, custom template';
COMMENT ON COLUMN public.geo_layers.legend_config IS 'Legend display: label, color, icon, visible';
COMMENT ON COLUMN public.geo_layers.z_index IS 'Layer stacking order (higher = on top)';
COMMENT ON COLUMN public.geo_layers.opacity IS 'Layer opacity 0.0 to 1.0';
COMMENT ON COLUMN public.geo_layers.visible IS 'Layer visibility toggle';
COMMENT ON COLUMN public.geo_layers.metadata IS 'Additional metadata: source, license, attribution, bounds';
