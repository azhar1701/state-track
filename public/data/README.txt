Place administrative boundary GeoJSON files here.

Expected filename(s) for the overlay toggle (first existing will be used):
- ciamis_kecamatan.geojson — polygon boundaries for Kecamatan in Kabupaten Ciamis
- adm_ciamis.geojson — alternative name supported

You can replace with your own file. Required format: valid GeoJSON FeatureCollection.
Recommended property keys for labels (fallback order): name, NAMOBJ, Kecamatan.

Projection:
- Leaflet expects WGS84 (EPSG:4326).
- If your GeoJSON is in UTM 49S (EPSG:32749) or another projected CRS with meter coordinates, the app will reproject it on-the-fly to EPSG:4326.

If you need to convert SHP to GeoJSON, use ogr2ogr:
- Windows (OSGeo4W / QGIS shell):
  ogr2ogr -f GeoJSON ciamis_kecamatan.geojson path\to\your\shapefile.shp
