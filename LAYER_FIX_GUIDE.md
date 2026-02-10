# QUICK FIX GUIDE - Layer Visibility & Async Errors

## Apply These Changes to MapView.tsx

### 1. Add URL Sanitizer (Top of file)
```typescript
const sanitizeUrl = (url: string): string => 
  url.replace(/['"""]/g, '').trim();
```

### 2. Fix Layer Fetching (Replace existing fetch logic)
```typescript
// BEFORE:
const { data: gl, error } = await supabase
  .from('geo_layers')
  .select('data')
  .eq('key', key)
  .maybeSingle();

// AFTER:
try {
  const { data: gl, error } = await supabase
    .from('geo_layers')
    .select('data')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.debug(`[Layer ${key}] DB error:`, error);
    return null;
  }

  // Sanitize URL if present
  if (gl?.data?.url) {
    gl.data.url = sanitizeUrl(gl.data.url);
  }

  // Rest of logic...
} catch (err) {
  console.debug(`[Layer ${key}] Failed:`, err);
  return null; // Explicit return to prevent hanging promises
}
```

### 3. Add Default Styles (Before rendering)
```typescript
// Add this helper function
const getLayerStyle = (key: string, customStyle?: any) => {
  const defaults: Record<string, any> = {
    sawah: { 
      color: '#16a34a', 
      weight: 1.5, 
      fillColor: '#86efac', 
      fillOpacity: 0.4 
    },
    admin_boundaries: { 
      color: '#6b7280', 
      weight: 1, 
      fillOpacity: 0, 
      dashArray: '4 3' 
    },
  };

  return customStyle || defaults[key] || { 
    color: '#3b82f6', 
    weight: 2, 
    fillColor: '#3b82f6', 
    fillOpacity: 0.3 
  };
};
```

### 4. Fix Pane Z-Index (In JSX rendering)
```typescript
// BEFORE:
{overlays.adminBoundaries && adminGeoJson && (
  <RLGeoJSON data={adminGeoJson} style={...} />
)}

// AFTER:
{overlays.adminBoundaries && adminGeoJson && (
  <Pane name="admin-boundaries" style={{ zIndex: 350 }}>
    <RLGeoJSON 
      key="admin-boundaries"
      data={adminGeoJson} 
      style={() => getLayerStyle('admin_boundaries')}
    />
  </Pane>
)}

// For Sawah layer:
{overlays.dynamic?.sawah && dynamicData.sawah && (
  <Pane name="polygons" style={{ zIndex: 400 }}>
    <RLGeoJSON
      key="sawah"
      data={dynamicData.sawah}
      style={() => getLayerStyle('sawah', dynamicStyle.sawah?.polygon)}
    />
  </Pane>
)}
```

### 5. Use Promise.allSettled (In layer loading effect)
```typescript
// BEFORE:
for (const key of keysToLoad) {
  // fetch logic
}

// AFTER:
const fetchPromises = keysToLoad.map(async (key) => {
  try {
    const data = await fetchLayerData(key);
    return { key, data };
  } catch (err) {
    console.debug(`[Layer ${key}] Error:`, err);
    return { key, data: null };
  }
});

const results = await Promise.allSettled(fetchPromises);

results.forEach((result) => {
  if (result.status === 'fulfilled' && result.value.data) {
    setDynamicData(prev => ({ ...prev, [result.value.key]: result.value.data }));
  }
});
```

### 6. Suppress Extension Errors (Already added to index.html)
✅ Already fixed in previous commit

## Testing Checklist

1. **Sawah Layer Visibility:**
   - [ ] Toggle "Sawah" layer ON
   - [ ] Verify green polygons appear on map
   - [ ] Verify they render ABOVE admin boundaries

2. **Console Cleanliness:**
   - [ ] Open DevTools Console
   - [ ] Toggle layers on/off
   - [ ] Verify NO red "Uncaught (in promise)" errors
   - [ ] Only `console.debug` messages (gray text)

3. **Error Resilience:**
   - [ ] Break one layer URL in database
   - [ ] Verify other layers still load
   - [ ] Verify map doesn't crash

## Quick Debug Commands

```javascript
// In browser console:

// Check layer data
console.log(dynamicData);

// Check pane z-indexes
document.querySelectorAll('.leaflet-pane').forEach(p => 
  console.log(p.className, getComputedStyle(p).zIndex)
);

// Check if Sawah features exist
console.log(dynamicData.sawah?.features?.length);
```

## Expected Z-Index Stack (Bottom to Top)

```
200 - Tile Layer (Base Map)
350 - Admin Boundaries (Pane)
400 - Polygons/Sawah (Pane)
500 - Markers/Points (Pane)
600 - Popups
```

## Common Mistakes to Avoid

❌ **DON'T:**
- Use `console.error` for expected failures (layer not found)
- Forget to return/throw after catch blocks
- Render layers without Panes

✅ **DO:**
- Use `console.debug` for non-critical logs
- Always return explicit values from async functions
- Wrap each layer type in its own Pane
- Provide default styles as fallback
