# Integrasi GeoLayer Settings dengan Layer Manager

## Contoh Penggunaan

### 1. Validasi Upload dengan Config

```tsx
import { useLayerManager } from '@/hooks/useLayerManager';
import { useGeoLayerConfig } from '@/hooks/useGeoLayerConfig';

const MyUploadComponent = () => {
  const { uploadLayer } = useLayerManager();
  const { config, shouldEnforceCRS, getMaxUploadSize } = useGeoLayerConfig();

  const handleUpload = async (file: File, data: FeatureCollection) => {
    // Validasi ukuran file
    if (file.size > getMaxUploadSize()) {
      toast.error(`File terlalu besar. Maksimal ${config.maxUploadSizeMb}MB`);
      return;
    }

    // Validasi CRS jika diaktifkan
    if (shouldEnforceCRS() && data.crs?.properties?.name !== 'EPSG:4326') {
      toast.error('CRS harus EPSG:4326 (WGS84)');
      return;
    }

    // Upload dengan config default
    await uploadLayer({
      key: 'my-layer',
      name: 'My Layer',
      geometry_type: 'Polygon',
      data,
      file,
    });
  };

  return (
    <input type="file" onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file, geojsonData);
    }} />
  );
};
```

### 2. Render Layer dengan Style Config

```tsx
import { useGeoLayerConfig } from '@/hooks/useGeoLayerConfig';
import { GeoJSON } from 'react-leaflet';

const MyMapLayer = ({ data }: { data: FeatureCollection }) => {
  const { style, getDefaultLayerConfig } = useGeoLayerConfig();
  const layerConfig = getDefaultLayerConfig();

  return (
    <GeoJSON
      data={data}
      style={{
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        dashArray: style.dashArray || undefined,
      }}
      pane={`layer-${layerConfig.z_index}`}
    />
  );
};
```

### 3. Clustering dengan Config

```tsx
import { useGeoLayerConfig } from '@/hooks/useGeoLayerConfig';
import MarkerClusterGroup from 'react-leaflet-cluster';

const MyClusterLayer = ({ markers }: { markers: Marker[] }) => {
  const { getClusterConfig } = useGeoLayerConfig();
  const clusterConfig = getClusterConfig();

  if (!clusterConfig.enabled) {
    return <>{markers.map(m => <Marker key={m.id} {...m} />)}</>;
  }

  return (
    <MarkerClusterGroup
      maxClusterRadius={clusterConfig.radius}
      spiderfyOnMaxZoom
      showCoverageOnHover
    >
      {markers.map(m => <Marker key={m.id} {...m} />)}
    </MarkerClusterGroup>
  );
};
```

### 4. Heatmap dengan Config

```tsx
import { useGeoLayerConfig } from '@/hooks/useGeoLayerConfig';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const MyHeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
  const map = useMap();
  const { getHeatmapConfig } = useGeoLayerConfig();
  const heatmapConfig = getHeatmapConfig();

  useEffect(() => {
    if (!heatmapConfig.enabled) return;

    const heatLayer = L.heatLayer(points, {
      radius: heatmapConfig.radius,
      blur: heatmapConfig.blur,
      maxZoom: heatmapConfig.maxZoom,
      gradient: {
        0.0: 'blue',
        0.5: 'lime',
        1.0: 'red',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, heatmapConfig]);

  return null;
};
```

### 5. Auto-publish Check

```tsx
import { useGeoLayerConfig } from '@/hooks/useGeoLayerConfig';

const LayerUploadForm = () => {
  const { shouldAutoPublish } = useGeoLayerConfig();

  const handleSubmit = async (data: LayerData) => {
    const result = await uploadLayer(data);
    
    if (result && shouldAutoPublish()) {
      toast.success('Layer berhasil diunggah dan dipublikasikan');
      // Refresh map atau trigger layer reload
      window.dispatchEvent(new CustomEvent('layer-updated'));
    } else if (result) {
      toast.success('Layer berhasil diunggah. Aktifkan manual di pengaturan.');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

### 6. Metadata Validation

```tsx
import { useGeoLayerConfig } from '@/hooks/useGeoLayerConfig';

const LayerMetadataForm = () => {
  const { shouldRequireMetadata } = useGeoLayerConfig();
  const [metadata, setMetadata] = useState({ source: '', license: '' });

  const validate = () => {
    if (shouldRequireMetadata()) {
      if (!metadata.source || !metadata.license) {
        toast.error('Metadata wajib diisi: source dan license');
        return false;
      }
    }
    return true;
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (validate()) {
        // Submit
      }
    }}>
      <input
        placeholder="Source"
        value={metadata.source}
        onChange={(e) => setMetadata(prev => ({ ...prev, source: e.target.value }))}
        required={shouldRequireMetadata()}
      />
      <input
        placeholder="License"
        value={metadata.license}
        onChange={(e) => setMetadata(prev => ({ ...prev, license: e.target.value }))}
        required={shouldRequireMetadata()}
      />
    </form>
  );
};
```

## Best Practices

1. **Selalu gunakan helper functions** seperti `shouldEnforceCRS()` daripada akses langsung `config.enforceCRS`
2. **Cache config di component level** jika digunakan berkali-kali dalam render
3. **Listen untuk storage events** jika perlu real-time sync antar tab
4. **Fallback ke default** jika config belum dimuat (loading state)
5. **Validasi di client dan server** untuk keamanan maksimal

## Performance Tips

- Hook ini menggunakan localStorage yang synchronous, tapi hanya dibaca sekali saat mount
- Storage event listener hanya aktif untuk perubahan dari tab lain
- Helper functions adalah pure functions tanpa side effects
- Config object di-memoize untuk menghindari re-render tidak perlu
