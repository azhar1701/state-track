# MINIMAL FIX: Apply Database Styles to Map Features

## Problem
The `style` function in the GeoJSON component ignores `dynamicStyle[key]` from the database.

## Solution
Replace the hardcoded style logic with a function that prioritizes database config.

---

## COPY-PASTE FIX for MapView.tsx

### 1. ADD THIS HELPER FUNCTION (after imports, before MapView component)

```typescript
// Dynamic style applier - prioritizes DB config over defaults
const getLayerStyle = (
  key: string,
  geomType: string | undefined,
  dbStyle: LayerStyle | undefined
) => {
  const keyLower = key.toLowerCase();
  
  // Extract DB styles
  const styLine = dbStyle?.line;
  const styPoly = dbStyle?.polygon;
  const styPoint = dbStyle?.point;

  // For Polygons
  if (/Polygon/i.test(geomType || '')) {
    // Sawah - green fill
    if (keyLower.includes('sawah') || keyLower.includes('paddy')) {
      return {
        color: styPoly?.color || '#16a34a',
        weight: styPoly?.weight || 1.5,
        opacity: styPoly?.opacity || 0.9,
        fillColor: styPoly?.fillColor || '#86efac',
        fillOpacity: styPoly?.fillOpacity !== undefined ? styPoly.fillOpacity : 0.4,
      };
    }
    
    // Admin boundaries - transparent fill
    if (keyLower.includes('admin') || keyLower.includes('batas')) {
      return {
        color: styPoly?.color || '#6b7280',
        weight: styPoly?.weight || 1,
        opacity: styPoly?.opacity || 0.8,
        fillOpacity: 0, // Always transparent for boundaries
        dashArray: styPoly?.dashArray || '4 3',
      };
    }

    // Default polygon
    return {
      color: styPoly?.color || '#475569',
      weight: styPoly?.weight || 1.5,
      opacity: styPoly?.opacity || 0.8,
      fillColor: styPoly?.fillColor || '#cbd5e1',
      fillOpacity: styPoly?.fillOpacity !== undefined ? styPoly.fillOpacity : 0.3,
    };
  }

  // For Lines
  if (/LineString/i.test(geomType || '')) {
    if (keyLower.includes('sungai') || keyLower.includes('river')) {
      return {
        color: styLine?.color || '#38bdf8',
        weight: styLine?.weight || 2.5,
        opacity: styLine?.opacity || 0.95,
        dashArray: styLine?.dashArray,
      };
    }

    if (keyLower.includes('irigasi') || keyLower.includes('irrigation')) {
      return {
        color: styLine?.color || '#0ea5e9',
        weight: styLine?.weight || 3,
        opacity: styLine?.opacity || 0.9,
        dashArray: styLine?.dashArray,
      };
    }

    return {
      color: styLine?.color || '#334155',
      weight: styLine?.weight || 2,
      opacity: styLine?.opacity || 0.9,
      dashArray: styLine?.dashArray,
    };
  }

  // For Points
  return {
    color: styPoint?.color || '#16a34a',
    weight: styPoint?.weight || 2,
    opacity: 0.9,
    fillColor: styPoint?.fillColor || styPoint?.color || '#16a34a',
    fillOpacity: styPoint?.fillOpacity !== undefined ? styPoint.fillOpacity : 0.7,
  };
};
```

---

### 2. REPLACE THE DYNAMIC LAYER RENDERING (Find line ~1150)

**FIND THIS:**
```typescript
style={(feat) => {
  const t = feat?.geometry?.type;
  const keyLower = key.toLowerCase();
  const styLine = dynamicStyle[key]?.line;
  const styPoly = dynamicStyle[key]?.polygon;
  
  // Sungai - PRIORITAS PERTAMA (biru langit)
  if (keyLower.includes('sungai') || keyLower.includes('river')) {
```

**REPLACE WITH:**
```typescript
style={(feat) => {
  const geomType = feat?.geometry?.type;
  console.log(`[Style Debug] Layer: ${key}, GeomType: ${geomType}, DBStyle:`, dynamicStyle[key]);
  return getLayerStyle(key, geomType, dynamicStyle[key]);
}}
```

---

### 3. TEST

1. Open browser DevTools Console
2. Toggle "Sawah" layer ON
3. Check console for: `[Style Debug] Layer: sawah, GeomType: Polygon, DBStyle: {...}`
4. Verify the map shows GREEN polygons (not grey)
5. Verify legend shows GREEN (should match map now)

---

## Expected Result

- **Sawah**: Green fill (#86efac) with green border (#16a34a)
- **Admin Boundaries**: Grey border (#6b7280) with NO fill (transparent)
- **Legend**: Matches map colors exactly

---

## If Still Grey

Add this debug to the layer loading effect (line ~700):

```typescript
if (raw) {
  try {
    const maybeStyle = (raw as { style?: unknown })?.style;
    console.log(`[DB Style] Layer ${key}:`, maybeStyle); // ADD THIS
    if (maybeStyle && typeof maybeStyle === 'object') {
      setDynamicStyle((s) => ({ ...s, [key]: maybeStyle as LayerStyle }));
    }
  } catch { /* ignore */ }
}
```

This will show if the database actually contains style config.
