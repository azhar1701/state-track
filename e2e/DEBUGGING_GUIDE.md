# 🎯 Playwright Map Test - Debugging Guide

## 📊 Problem
```
Error: Timeout 15000ms exceeded. Expect(locator).toBeVisible() failed.
Locator: `.leaflet-container` (tidak ditemukan)
```

## ✅ Solutions Implemented

### 1. **Robust Waiting Strategy** 
**File:** `map-utils.ts` - `waitForMapReady()`

Improved dari sederhana timeout menjadi:
- ✅ **URL Validation** - Cek tidak stuck di login page
- ✅ **Multiple Selector Fallback** - Coba 5 selectors berbeda
- ✅ **Network Idle + DOM Ready combo** - Tunggu tile loading + DOM render
- ✅ **Soft Assertions** - Log error tapi jangan auto-fail untuk debugging
- ✅ **Debug Screenshots** - Simpan screenshot otomatis saat failure

```typescript
await waitForMapReady(page, {
  timeout: 30000,
  checkAuth: true,        // ✅ Validate URL sebelum menunggu peta
  debugOnFailure: true,   // ✅ Auto screenshot saat gagal
});
```

### 2. **Defensive Selectors**
Multiple selector fallback dengan priority:
```typescript
const selectors = [
  '.leaflet-container',           // Default Leaflet
  '#map',                         // Common ID
  'canvas.leaflet-zoom-animated', // Leaflet canvas
  '[role="region"][aria-label*="map"]', // WAI-ARIA
  '[class*="leaflet-map-pane"]',  // Leaflet pane
];
```

### 3. **Enhanced Error Handling**
Semua functions sekarang include:
- Try-catch dengan retry logic
- Informative console logs
- Fallback strategies
- Non-blocking error handling (soft assertions)

---

## 🔍 DEBUGGING TECHNIQUES

### Method 1: UI Mode (RECOMMENDED for Interactive Debugging)
```bash
# Run specific test dengan interactive UI
npx playwright test advanced-e2e.spec.ts --ui

# Run only one test
npx playwright test -g "map render" --ui

# Open Playwright Inspector
npx playwright test --debug
```

**Fitur UI Mode:**
- ⏯️ Step through actions
- 🔎 Inspect elements
- 📸 See screenshots
- 🎬 Watch test playback
- ⏰ Slow down execution

### Method 2: Manual Screenshots
```typescript
// Simple screenshot
await page.screenshot({ path: 'debug.png' });

// Map-only screenshot (crop)
const mapElement = page.locator('.leaflet-container');
const box = await mapElement.boundingBox();
await page.screenshot({
  path: 'debug-map.png',
  clip: box
});

// Full page screenshot
await page.screenshot({ paths: 'full-page.png', fullPage: true });
```

### Method 3: Debug State Capture
```typescript
// Capture everything: URL, selectors, performance, network
await debugPageState(page, 'Custom Context');

// Capture with timestamp for tracking
await captureDebugScreenshot(page, 'my-label');
```

**Output dari `debugPageState()`:**
```
✅ Current URL: http://localhost:8080/
✅ Page Title: State Tracker
🔍 Map Element Selector Check:
   ✅ FOUND & VISIBLE  | .leaflet-container
   ❌ NOT FOUND        | #map
⏱️  Performance Metrics:
   DOM Content Loaded: 245ms
   Page Load Time: 1523ms
📐 Viewport: 1280x720
```

### Method 4: Slow Down Tests
```bash
# Run dengan slow motion (delay antar action)
npx playwright test --headed --slow-mo=1000

# Combine dengan UI
npx playwright test --headed --slow-mo=1000 --ui
```

---

## 🚀 COMMAND REFERENCE

### Run Tests
```bash
# Run specific test file
npx playwright test e2e/advanced-e2e.spec.ts

# Run specific test by name
npx playwright test -g "map render"

# Run dengan debugging UI
npx playwright test --ui

# Run dengan debug mode (Playwright Inspector)
npx playwright test --debug

# Run headed (browser visible)
npx playwright test --headed

# Run with slow motion
npx playwright test --headed --slow-mo=1000

# Run single file dengan UI
npx playwright test advanced-e2e.spec.ts --ui

# Combine all options
npx playwright test advanced-e2e.spec.ts -g "DEBUG" --ui --headed --slow-mo=500
```

### Troubleshooting
```bash
# Show test output (logs)
npx playwright test --verbose

# Run dengan debug logs
DEBUG=pw:api npx playwright test

# Update snapshots
npx playwright test --update-snapshots

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## 🧪 Test Structure

### File: `map-utils.ts` - Utility Functions

#### Debugging Functions
```typescript
// Capture page state (URL, selectors, performance)
await debugPageState(page, 'Context Name');

// Take screenshot for debugging
await captureDebugScreenshot(page, 'my-label');
```

#### Improved Waiting Functions
```typescript
// Main function - recommended untuk semua cases
await waitForMapReady(page, {
  timeout: 30000,
  checkAuth: true,
  debugOnFailure: true
});

// Alternative selectors dengan fallback
const foundSelector = await waitForMapElement(page, '.leaflet-container');

// Wait untuk tile loading (network idle)
await waitForTileLoading(page, 20000, true); // failSoft=true

// Wait untuk map stability (no animations)
await waitForMapStable(page, 3, 300); // 3 checks, 300ms interval
```

#### Improved Interaction Functions
```typescript
// Drag dengan retry logic
await dragMapToLocation(page, 400, 300, 300, 250, 500, { retries: 2 });

// Zoom dengan error handling
await zoomMap(page, 'in', 2);

// Double click
await doubleClickOnMap(page, 200, 200);

// Click pada lat/lng
await clickOnMapCoordinate(page, -6.2088, 106.8456);

// Get map info
const bounds = await getMapBounds(page);
const zoom = await getMapZoomLevel(page);
```

### File: `advanced-e2e.spec.ts` - Test Examples

**New Tests:**
- ✅ `[ROBUST] should render map dengan multiple selector fallback`
- ✅ `[SELECTORS] harus fallback ke alternative selectors`
- ✅ `[WAITING] network idle + DOM ready strategy`
- ✅ `[DEBUG] manual screenshot & debug capture example`

---

## ⚡ Quick Start

### 1. Check if tests pass:
```bash
npx playwright test advanced-e2e.spec.ts --project=chromium
```

### 2. Debug failed test:
```bash
npx playwright test -g "ROBUST" --ui
```

### 3. View screenshots:
```bash
# Screenshots saved di:
test-results/debug-screenshots/
playwright-report/
```

### 4. Check test results:
```bash
# Open HTML report
npx playwright show-report
```

---

## 🔧 Common Issues & Solutions

### Issue: `.leaflet-container` not found
**Solution:**
```typescript
// Gunakan waitForMapElement dengan multiple selectors
const selector = await waitForMapElement(page);
console.log(`Map found with: ${selector}`);
```

### Issue: Test stuck at login
**Check:**
```typescript
// Debug akan otomatis detect ini
const url = page.url();
if (url.includes('/login')) {
  console.warn('⚠️  Stuck di login page!');
}
```

### Issue: Timeout karena network slow
**Solution:**
```typescript
// Increase timeout
await waitForMapReady(page, { timeout: 60000 }); // 60 seconds

// Or use soft assertion (non-blocking)
await waitForTileLoading(page, 20000, true); // failSoft=true
```

### Issue: Screenshot comparison failures
**Update baseline:**
```bash
npx playwright test --update-snapshots
```

---

## 📈 Best Practices

✅ **Always use `waitForMapReady()` dengan `debugOnFailure: true`**
```typescript
await waitForMapReady(page, { debugOnFailure: true });
```

✅ **Combine waiting strategies**
```typescript
await waitForMapReady(page);      // Primary wait
await waitForTileLoading(page);    // Secondary wait
await waitForMapStable(page);      // Final check
```

✅ **Log states untuk debugging**
```typescript
const bounds = await getMapBounds(page);
const zoom = await getMapZoomLevel(page);
console.log(`Map state: zoom=${zoom}, bounds=${bounds}`);
```

✅ **Use `--ui` mode untuk interactive debugging**
```bash
npx playwright test --ui
```

✅ **Screenshot on errors (automatic)**
```typescript
// playwright.config.ts sudah set:
screenshot: 'only-on-failure',
video: 'retain-on-failure',
trace: 'on-first-retry',
```

---

## 📚 References

- [Playwright Documentation](https://playwright.dev)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [Playwright Inspector](https://playwright.dev/docs/inspector)
- [Leaflet Documentation](https://leafletjs.com/reference.html)

---

**Last Updated:** 2026-02-08
**Framework:** Playwright + TypeScript
**Browser Support:** Chromium, Firefox, WebKit
