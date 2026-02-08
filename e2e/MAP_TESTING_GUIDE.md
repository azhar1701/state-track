# 🗺️ Playwright Map Testing - Comprehensive Guide

## 📚 Table of Contents
1. [Visual Regression Testing](#visual-regression-testing)
2. [Waiting Strategies](#waiting-strategies)
3. [Map Interaction Patterns](#map-interaction-patterns)
4. [Troubleshooting](#troubleshooting)
5. [Best Practices](#best-practices)

---

## Visual Regression Testing

### Apa itu Visual Regression Testing?

Visual Regression Testing adalah teknik untuk **memastikan UI/styling tidak rusak** setelah changes. Caranya:

1. **Generate Baseline** (first run): Capture screenshot "golden image" 
2. **Compare** (subsequent runs): Compare screenshot baru dengan baseline
3. **Report Diff**: Tampilkan pixel differences jika ada

### Setup dalam Project

✅ **Sudah dikonfigurasi di `playwright.config.ts`:**
```typescript
imageMatcherOptions: {
  maxDiffPixels: 100,      // Allow max 100 pixels berbeda
  threshold: 0.2,          // 0.2% tolerance
}
```

### Cara Menggunakan Visual Regression Testing

#### 1️⃣ Generate Baseline Image (FIRST TIME ONLY)

Run test dengan `--update-snapshots` flag:

```bash
npx playwright test --update-snapshots
```

Atau gunakan shorthand:
```bash
npx playwright test -u
```

**Output:**
- Baseline images akan disimpan di: `e2e/__screenshots__/[test-name]/[browser]/`
- Example: `e2e/__screenshots__/map-interaction/map-default-view.png`

#### 2️⃣ Compare dengan Baseline (REGULAR TEST RUNS)

```bash
npm run e2e
# atau
npx playwright test
```

Jika ada **pixel differences**, test akan FAIL dan Playwright akan:
- Generate `actual` screenshot
- Generate `expected` screenshot  
- Generate `diff` image (marked areas yang berbeda)
- Semua disimpan di `test-results/` folder

#### 3️⃣ View Diff Report

```bash
npx playwright show-report
```

Buka HTML report, pilih failed test, lihat:
- Expected (baseline)
- Actual (current run)
- Diff (perbedaan ditandai merah)

---

## Waiting Strategies

### Masalah: Peta Leaflet Sulit Ditest

**Mengapa?**
- Peta render dalam `<canvas>` (bukan text/DOM)
- Tile images di-load dari network
- Animasi zoom/pan tidak instant
- Tidak ada standard "ready" event

### Solusi: 4 Waiting Strategies

#### Strategy 1: Network Idle (⭐ RECOMMENDED)

**Gunakan untuk:**
- Initial peta load
- Setelah zoom yang significantly berbeda
- Setelah pan yang jauh

**Code:**
```typescript
await waitForMapReady(page);
// atau manual:
await page.waitForLoadState('networkidle');
```

**Penjelasan:**
- Tunggu sampai semua network requests selesai (fetch, xhr, image)
- Semua tiles sudah terload
- Paling reliable untuk testing peta

**Timeout:** 30 detik (configurable)

#### Strategy 2: Wait for DOM Element

**Gunakan untuk:**
- Memastikan map container visible
- Check specific map component

**Code:**
```typescript
await waitForMapElement(page, '.leaflet-container', 15000);
```

**Penjelasan:**
- Cepat (hanya tunggu 1 element)
- Kurang reliable (element bisa ada tapi belum fully loaded)
- Gunakan kombinasi dengan strategy lain

#### Strategy 3: Wait for Tile Loading

**Gunakan untuk:**
- Setelah zoom/pan
- Memastikan tidak ada pending tile requests

**Code:**
```typescript
await waitForTileLoading(page, 20000);
```

**Penjelasan:**
- Monitor network requests
- Tunggu sampai tidak ada request untuk tile images
- Lebih spesifik dari network idle

#### Strategy 4: Wait for Map Stable

**Gunakan untuk:**
- Memastikan tidak ada animation running
- Sebelum ambil screenshot untuk visual regression

**Code:**
```typescript
await waitForMapStable(page);
```

**Penjelasan:**
- Polling untuk detect transform changes
- Tunggu sampai map stabil (tidak ada pan/zoom animation)
- Paling strict waiting strategy

### Decision Tree: Mana Strategy Digunakan?

```
┌─ Situation: Zoom/Pan action baru saja dilakukan?
│  ├─ YES: Gunakan waitForMapStable() + waitForTileLoading()
│  └─ NO: Lanjut...
└─ Situation: Akan ambil screenshot visual regression?
   ├─ YES: waitForTileLoading() → page.waitForTimeout(1000)
   └─ NO: waitForMapReady() sudah cukup
```

### Contoh Kombinasi Waiting Strategies

```typescript
test('complex map interaction dengan proper waiting', async ({ page }) => {
  // Initial load
  await page.goto('/');
  await waitForMapReady(page);  // ← Strategy 1: Network Idle
  
  // Zoom in
  await zoomMap(page, 'in', 3);
  await waitForTileLoading(page);  // ← Strategy 3: Tile Loading
  
  // Pan
  await dragMapToLocation(page, 400, 300, 200, 200);
  await waitForMapStable(page);  // ← Strategy 4: Stable
  
  // Take screenshot (untuk visual regression)
  await page.waitForTimeout(1000);  // ← Extra safety
  await expect(page).toHaveScreenshot('final-state.png');
});
```

---

## Map Interaction Patterns

### 1. Drag & Drop (Pan)

```typescript
// Drag dari (400, 300) ke (300, 300) = geser ke kanan
await dragMapToLocation(page, 400, 300, 300, 300);

// Alternative: Menggunakan mouse events (lebih kontrol)
await dragMapAlternative(page, 400, 300, 200, 200);
```

**Coordinate System:**
- `(0, 0)` = top-left from map container
- `(400, 300)` = center (if map is ~800x600)
- Geser ke `(300, 300)` = geser ke kanan

### 2. Zoom

```typescript
// Zoom in 3 steps
await zoomMap(page, 'in', 3);

// Zoom out 2 steps
await zoomMap(page, 'out', 2);

// Zoom dengan specific position (instead of center)
await zoomMap(page, 'in', 3, { x: 200, y: 150 });
```

### 3. Double Click (Zoom In)

```typescript
// Double click di center
await doubleClickOnMap(page);

// Double click pada koordinat specific (pixel-based)
await doubleClickOnMap(page, 400, 300);
```

### 4. Click pada Specific Coordinate (Lat/Lng)

```typescript
// Click pada latitude/longitude (bukan pixel)
await clickOnMapCoordinate(page, -6.8957, 107.6338); // Bandung coords
```

### 5. Get Map State (untuk Assertion)

```typescript
// Get current zoom level
const zoom = await getMapZoomLevel(page);  // returns number
expect(zoom).toBeGreaterThan(10);

// Get map bounds
const bounds = await getMapBounds(page);  // returns {northEast, southWest}
expect(bounds.northEast.lat).toBeGreaterThan(bounds.southWest.lat);
```

---

## Best Practices

### ✅ DO's

1. **Selalu tunggu sebelum assertion:**
   ```typescript
   await waitForMapReady(page);
   await expect(mapContainer).toBeVisible();
   ```

2. **Gunakan explicit waits untuk async operations:**
   ```typescript
   await zoomMap(page, 'in', 3);
   await waitForTileLoading(page);  // ← jangan skip ini
   ```

3. **Mask dynamic elements dalam snapshots:**
   ```typescript
   await expect(page).toHaveScreenshot('map.png', {
     mask: [page.locator('[data-timestamp]')],
   });
   ```

4. **Organize tests dengan `test.describe()` blocks:**
   ```typescript
   test.describe('Map Pan Tests', () => {
     test('pan right', async ({ page }) => { ... });
     test('pan left', async ({ page }) => { ... });
   });
   ```

5. **Use meaningful test names:**
   ```typescript
   // ✅ GOOD
   test('[SNAPSHOT] map default view consistent', async ({...}) => {...});
   
   // ❌ BAD
   test('test 1', async ({...}) => {...});
   ```

### ❌ DON'Ts

1. **Jangan hardcode timeouts tanpa reason:**
   ```typescript
   // ❌ BAD
   await page.waitForTimeout(5000);  // why 5 seconds???
   
   // ✅ GOOD
   await waitForTileLoading(page);   // explicit strategy
   ```

2. **Jangan trust DOM untuk detect canvas rendering:**
   ```typescript
   // ❌ BAD
   await page.locator('.leaflet-container').waitFor();
   // Element bisa ada tapi tiles belum loaded
   
   // ✅ GOOD
   await waitForMapReady(page);  // network idle
   ```

3. **Jangan mix multiple waiting strategies:**
   ```typescript
   // ❌ BAD
   await waitForMapReady(page);
   await waitForTileLoading(page);
   await waitForMapStable(page);
   // Overkill dan slow
   
   // ✅ GOOD
   await waitForTileLoading(page);  // pilih 1 yang paling sesuai
   ```

4. **Jangan update snapshots tanpa review:**
   ```bash
   # ❌ JANGAN
   npm run e2e -- --update-snapshots  # automated!
   
   # ✅ LAKUKAN
   npx playwright test --update-snapshots  # then review diff
   npx playwright show-report
   ```

5. **Jangan ignore visual diffs:**
   ```typescript
   // ❌ BAD
   await expect(page).toHaveScreenshot('map.png', {
     maxDiffPixels: 50000,  // allow terlalu banyak diff
   });
   
   // ✅ GOOD
   await expect(page).toHaveScreenshot('map.png', {
     maxDiffPixels: 100,    // strict tolerance
   });
   ```

---

## Troubleshooting

### Problem 1: Test Timeout saat Load Peta

**Gejala:**
```
Timeout exceeded (30000ms)
```

**Solusi:**
1. Check `baseURL` di `playwright.config.ts` → sesuaikan dengan dev server port
2. Verify dev server running: `npm run dev`
3. Increase timeout:
   ```typescript
   await page.goto('/', { timeout: 60000 });  // 60 detik
   ```
4. Check network tab di DevTools → ada request yang stuck?

### Problem 2: Screenshot Assertion Gagal Padahal Map Sama

**Gejala:**
```
Expected image to match or be close to the saved one
```

**Solusi:**
1. Anti-aliasing / rendering differences di browsers → adjust `threshold`:
   ```typescript
   threshold: 0.5  // lebih toleran
   ```

2. Dynamic content (timestamp dll) → gunakan `mask`:
   ```typescript
   mask: [page.locator('.timestamp')]
   ```

3. Font rendering berbeda di browsers → test hanya di 1 browser:
   ```typescript
   // Update playwright.config.ts
   projects: [
     { name: 'chromium', use: {...} },  // keep only this
   ]
   ```

### Problem 3: Map Elements tidak "Clickable"

**Gejala:**
```
Element is not visible
```

**Solusi:**
1. Ensure map fully loaded:
   ```typescript
   await waitForMapReady(page);
   ```

2. Get proper bounding box:
   ```typescript
   const box = await page.locator('.leaflet-container').boundingBox();
   if (box) {
     // coordinates are valid
   }
   ```

3. Verify Leaflet initialized:
   ```typescript
   const leafletReady = await page.evaluate(() => {
     return !!(window as any).L && !!(window as any).map;
   });
   expect(leafletReady).toBeTruthy();
   ```

### Problem 4: Tile Loading Never Completes

**Gejala:**
```
waitForTileLoading timeout
```

**Solusi:**
1. Check tile provider URL → accessible?
2. Monitor network:
   ```typescript
   page.on('response', (res) => {
     if (res.url().includes('tile')) {
       console.log('Tile:', res.status(), res.url());
     }
   });
   ```

3. Allow longer timeout:
   ```typescript
   await waitForTileLoading(page, 30000);  // 30 detik
   ```

4. Use fallback strategy (network idle):
   ```typescript
   // Instead of waitForTileLoading
   await page.waitForLoadState('networkidle');
   ```

---

## Command Reference

### Running Tests

```bash
# Headless mode (fast, no browser)
npm run e2e

# Headed mode (browser visible)
npm run e2e:headed

# UI Mode (interactive, recommended)
npm run e2e:ui

# Debug mode (step-by-step)
npm run e2e:debug

# Specific test file
npx playwright test e2e/map-interaction.spec.ts

# Specific test (pattern matching)
npx playwright test --grep "zoom in"

# Single browser
npx playwright test --project=chromium
```

### Snapshot Management

```bash
# Generate/Update baseline snapshots
npx playwright test --update-snapshots

# Generate & review
npx playwright test -u && npx playwright show-report

# View report
npx playwright show-report
```

### Debugging

```bash
# Step-by-step debug
npm run e2e:debug

# Show test report
npx playwright show-report

# Open UI dashboard
npm run e2e:ui
```

---

## Next Steps

1. **Run existing smoke test:**
   ```bash
   npm run e2e:ui
   ```

2. **Generate baseline snapshots:**
   ```bash
   npx playwright test e2e/map-interaction.spec.ts -u
   ```

3. **Review snapshots:**
   ```bash
   npx playwright show-report
   ```

4. **Modify your code, re-run:**
   ```bash
   npm run e2e
   # Should compare dengan baseline
   ```

5. **If visual regression detected:**
   ```bash
   npx playwright show-report
   # Review diff, decide: accept or fix
   ```

---

## Resources

- 📖 [Playwright Official Docs](https://playwright.dev)
- 🎬 [Visual Regression Testing](https://playwright.dev/docs/test-snapshots)
- ⏱️ [Waiting & Timeouts](https://playwright.dev/docs/navigations)
- 🗺️ [Leaflet Map Library](https://leafletjs.com)
- 🐛 [Debugging Guide](https://playwright.dev/docs/debug)

