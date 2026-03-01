# Map Module Knowledge Base

## OVERVIEW
The Map module is the core of SIPASDA, handling high-density geospatial rendering using Leaflet and real-time report synchronization.

## STRUCTURE
```text
src/features/map/
├── MapView.tsx             # Main entry point (Large file)
├── BasemapSwitcher.tsx     # Tile layer management
├── FilterPanel.tsx         # Report filtering
├── OverlayToggle.tsx       # Layer visibility management
├── ModernMapOverlay.tsx    # Desktop floating UI
└── MobileMapControls.tsx   # Mobile-optimized Command Hub
```

## CONVENTIONS
- **Markers**: Use `createCustomIcon` for report markers (statis + severity indicators).
- **Layers**: GeoJSON layers must be sanitized before rendering.
- **Coord System**: Default is EPSG:4326. Supports UTM49S reprojection for specific layers.

## ANTI-PATTERNS
- **Prop Drilling**: Use specialized hooks (like `useLayerHighlight`) instead of passing state down 3+ levels.
- **Heavy Re-renders**: Memoize `renderedLayers` and `legendOverlays`.

## WHERE TO LOOK
| Feature | File |
|---------|------|
| Report Markers | `MapView.tsx` -> `createCustomIcon` |
| Real-time Sync | `MapView.tsx` -> `useEffect` (reports-changes) |
| URL Parsing | `mapExport.ts` |
