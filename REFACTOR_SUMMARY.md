# Geospatial Module Refactoring Summary

## Overview
Comprehensive refactor of the GeoDataManager (Admin/Upload) and MapView (Visualization) interaction to resolve toast spamming, ghost layers, encoding issues, and accessibility warnings.

---

## 1. New Hook: `useLayerManager.ts`

**Location:** `src/hooks/useLayerManager.ts`

### Key Features:
- **Centralized Layer Management**: Single source of truth for CRUD operations
- **Toast Deduplication**: Uses `Map<layerId, toastId>` to prevent spam
- **Filename Sanitization**: Removes special characters, replaces spaces with underscores
- **Storage Cleanup**: Deletes files from Supabase Storage bucket when layer is deleted
- **Event Broadcasting**: Dispatches `layer-deleted` and `layer-updated` events for cross-component sync
- **Optimistic UI Updates**: Immediately updates local state before server confirmation

### API:
```typescript
const {
  layers,           // Array<LayerRow>
  loading,          // boolean
  fetchLayers,      // () => Promise<void>
  uploadLayer,      // (params) => Promise<boolean>
  deleteLayer,      // (layer) => Promise<boolean>
  updateLayer,      // (id, updates) => Promise<boolean>
} = useLayerManager();
```

### Error Handling:
- Validates GeoJSON structure before upload
- Fallback to key-based delete if ID-based fails
- Unique toast IDs per layer: `layer-${layerId}`
- Logs errors to console with sanitized output

---

## 2. Refactored `GeoDataManager.tsx`

### Changes:
1. **Hook Integration**: Replaced manual `load()` with `useLayerManager()`
2. **Accessibility**: Added `<AlertDialogDescription>` to delete confirmation
3. **Encoding Fix**: Replaced smart quotes (`"`) with standard quotes (`"`)
   - Fixed: `"Nama (A–Z)"` → `"Nama (A-Z)"`
   - Fixed: `"Hapus layer "X"?"` → `"Hapus layer \"X\"?"`
4. **Simplified State**: Removed redundant `rows` state, uses `layers` from hook
5. **Cleaner Callbacks**: `delById()` → `handleDelete()` with single line

### Before/After:
```typescript
// BEFORE
const delById = async (row: GeoLayerRow) => {
  const { error } = await supabase.from('geo_layers').delete().eq('id', row.id);
  if (error) {
    const byKey = await supabase.from('geo_layers').delete().eq('key', row.key);
    if (byKey.error) {
      toast.error('Gagal menghapus layer');
      return;
    }
  }
  toast.success('Layer dihapus');
  void load();
};

// AFTER
const handleDelete = async (row: typeof layers[0]) => {
  await deleteLayer(row);
};
```

---

## 3. Refactored `MapView.tsx`

### Critical Fixes:

#### A. Toast Spam Prevention
**Problem:** Infinite loops when layer fails to load (404, invalid JSON)

**Solution:**
- Added `processedLayersRef` to track attempted loads
- Added `layerErrorsRef` to mark failed layers
- Unique toast IDs: `layer-error-${key}`
- Auto-remove failed layers from `overlays.dynamic`

```typescript
const processedLayersRef = useRef<Set<string>>(new Set());
const layerErrorsRef = useRef<Set<string>>(new Set());

// In loadToggled effect:
if (processedLayersRef.current.has(key) || layerErrorsRef.current.has(key)) {
  continue; // Skip already processed or errored layers
}
```

#### B. Ghost Layer Cleanup
**Problem:** Deleted layers persist in map state, causing 404 errors

**Solution:**
- Listen to `layer-deleted` custom event from GeoDataManager
- Remove layer from `dynamicData`, `overlays.dynamic`, and refs
- Clear sessionStorage cache on `layer-updated` event

```typescript
useEffect(() => {
  const handleLayerDeleted = (e: Event) => {
    const { layerKey } = (e as CustomEvent).detail;
    
    setDynamicData(prev => {
      const next = { ...prev };
      delete next[layerKey];
      return next;
    });
    
    setOverlays(prev => {
      const nextDynamic = { ...prev.dynamic };
      delete nextDynamic[layerKey];
      return { ...prev, dynamic: nextDynamic };
    });
    
    processedLayersRef.current.delete(layerKey);
    layerErrorsRef.current.delete(layerKey);
  };

  window.addEventListener('layer-deleted', handleLayerDeleted);
  return () => window.removeEventListener('layer-deleted', handleLayerDeleted);
}, []);
```

#### C. Cache Busting
**Problem:** Browser serves cached 404 responses for deleted files

**Solution:**
- Append timestamp to fetch requests (future enhancement)
- Clear sessionStorage on layer updates
- Use `cache: 'no-cache'` for critical fetches

---

## 4. Database Schema Validation

**Table:** `geo_layers`

### Required Columns:
- `id` (uuid, primary key)
- `key` (text, unique)
- `name` (text)
- `geometry_type` (text, nullable)
- `data` (jsonb) - stores `{ featureCollection, crs, storageUrl?, meta?, style? }`
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Storage Bucket:
- **Name:** `geo-layers`
- **Path:** `layers/{timestamp}_{sanitized_filename}`
- **Policies:** Public read, admin write

---

## 5. State Synchronization Flow

```
┌─────────────────┐         ┌──────────────────┐
│ GeoDataManager  │         │     MapView      │
│   (Admin UI)    │         │ (Visualization)  │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ 1. deleteLayer()          │
         ├──────────────────────────>│
         │                           │
         │ 2. Supabase DELETE        │
         │    + Storage cleanup      │
         │                           │
         │ 3. dispatchEvent          │
         │    'layer-deleted'        │
         ├──────────────────────────>│
         │                           │
         │                           │ 4. Remove from state
         │                           │    - dynamicData
         │                           │    - overlays.dynamic
         │                           │    - processedLayersRef
         │                           │
         │ 5. Optimistic UI update   │
         │    (remove from list)     │
         │                           │
```

---

## 6. Testing Checklist

### Upload Flow:
- [ ] Upload GeoJSON with special characters in filename
- [ ] Upload with smart quotes in layer name
- [ ] Verify sanitized filename in storage
- [ ] Verify standard quotes in database

### Delete Flow:
- [ ] Delete layer from GeoDataManager
- [ ] Verify file removed from storage bucket
- [ ] Verify row removed from database
- [ ] Switch to MapView - layer should disappear
- [ ] No 404 errors in console
- [ ] No toast spam

### Error Handling:
- [ ] Toggle non-existent layer in MapView
- [ ] Verify single error toast appears
- [ ] Verify layer auto-removed from toggle list
- [ ] Verify no infinite retry loops

### Accessibility:
- [ ] Screen reader announces delete dialog title
- [ ] Screen reader announces delete dialog description
- [ ] Keyboard navigation works in all modals

---

## 7. Known Limitations

1. **Storage Bucket Creation**: Must be manually created in Supabase dashboard
   - Name: `geo-layers`
   - Public: Yes
   - File size limit: 50MB (configurable)

2. **RLS Policies**: Assumes admin check via `auth.jwt() -> 'user_metadata' ->> 'is_admin'`
   - Alternative: Check `user_roles` table

3. **Cache Invalidation**: SessionStorage cleared on update, but browser HTTP cache may persist
   - Future: Implement versioned URLs or ETags

---

## 8. Migration Notes

### For Existing Deployments:
1. Run `npm install` (no new dependencies)
2. Verify `geo_layers` table schema matches migration
3. Create `geo-layers` storage bucket if not exists
4. Test upload/delete flow in staging
5. Clear browser cache and sessionStorage

### Rollback Plan:
- Revert `GeoDataManager.tsx` and `MapView.tsx`
- Delete `useLayerManager.ts`
- No database changes required

---

## 9. Performance Improvements

- **Reduced Re-renders**: Refs prevent unnecessary effect triggers
- **Optimistic Updates**: UI responds immediately, syncs in background
- **Lazy Loading**: Layers only fetched when toggled on
- **Session Cache**: Available layers list cached in sessionStorage

---

## 10. Future Enhancements

1. **Batch Operations**: Delete multiple layers at once
2. **Layer Versioning**: Track changes with `updated_at` and rollback support
3. **Thumbnail Generation**: Auto-generate preview images for layers
4. **Conflict Resolution**: Handle concurrent edits from multiple admins
5. **WebSocket Sync**: Real-time updates without page refresh
6. **Progressive Loading**: Stream large GeoJSON files in chunks

---

**Refactored by:** Amazon Q Developer  
**Date:** 2025-01-XX  
**Status:** ✅ Ready for Review
