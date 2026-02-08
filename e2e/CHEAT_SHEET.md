# 📖 Playwright Map Testing - Cheat Sheet

## 🚀 Quick Reference untuk Development

### Installation
```bash
npm install -D @playwright/test
npx playwright install
```

---

## Command Reference

### 🏃 Running Tests
```bash
# All tests (headless, fast)
npm run e2e

# With browser visible
npm run e2e:headed

# Interactive UI Dashboard (RECOMMENDED)
npm run e2e:ui

# Debug mode (step-by-step)
npm run e2e:debug

# Specific test file
npx playwright test e2e/map-interaction.spec.ts

# Pattern matching
npx playwright test --grep "zoom"

# Single browser
npx playwright test --project=chromium
```

### 📸 Snapshot Testing
```bash
# Generate/Update baselines (FIRST TIME)
npx playwright test --update-snapshots

# Shorthand
npx playwright test -u

# View report with visual diffs
npx playwright show-report
```

---

## Test Structure Template

### Basic Test
```typescript
import { test, expect } from '@playwright/test';
import { waitForMapReady } from './map-utils';

test('test name', async ({ page }) => {
  // 1. Navigate
  await page.goto('/');
  
  // 2. Wait for readiness
  await waitForMapReady(page);
  
  // 3. Interact
  await page.click('button');
  
  // 4. Assert
  await expect(page.locator('.element')).toBeVisible();
});
```

### Test with Before/After
```typescript
test.describe('Feature Group', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup if needed
  });

  test('test 1', async ({ page }) => {
    // Test code
  });

  test('test 2', async ({ page }) => {
    // Test code
  });
});
```

---

## Map Utilities Quick Reference

### Waiting Strategies
```typescript
import { 
  waitForMapReady,           // Network idle (⭐ RECOMMENDED)
  waitForMapElement,         // Wait for DOM element
  waitForTileLoading,        // Wait for tile images
  waitForMapStable           // Wait for animation to stop
} from './map-utils';

// Network idle (most reliable for peta)
await waitForMapReady(page);

// After zoom/pan
await waitForTileLoading(page);

// Before screenshot
await waitForMapStable(page);
```

### Map Interactions
```typescript
import {
  dragMapToLocation,         // Pan map
  zoomMap,                   // Zoom in/out
  doubleClickOnMap,          // Double-click zoom
  clickOnMapCoordinate       // Click at lat/lng
} from './map-utils';

// Pan (drag from X1,Y1 to X2,Y2)
await dragMapToLocation(page, 400, 300, 300, 300);

// Zoom
await zoomMap(page, 'in', 3);      // Zoom in 3 steps
await zoomMap(page, 'out', 2);     // Zoom out 2 steps

// Double click (coordinates are pixels)
await doubleClickOnMap(page, 400, 300);

// Click at latitude/longitude
await clickOnMapCoordinate(page, -6.8957, 107.6338);
```

### Get Map State
```typescript
import {
  getMapBounds,              // Get current bounds
  getMapZoomLevel            // Get current zoom
} from './map-utils';

const bounds = await getMapBounds(page);
// { northEast: {lat, lng}, southWest: {lat, lng} }

const zoom = await getMapZoomLevel(page);
// number (e.g., 12)
```

### Visual Regression
```typescript
// Take snapshot (auto-waits + compares with baseline)
await expect(page).toHaveScreenshot('name.png', {
  fullPage: false,
  maxDiffPixels: 100,        // Allow max 100px diff
  threshold: 0.2,            // 0.2% tolerance
  mask: [page.locator('.timestamp')]  // Hide dynamic content
});
```

---

## Common Patterns

### Pattern 1: Wait Before Screenshot
```typescript
test('[SNAPSHOT] map view', async ({ page }) => {
  await page.goto('/');
  await waitForMapReady(page);
  await page.waitForTimeout(1000);  // ← Safety margin
  await expect(page).toHaveScreenshot('map.png');
});
```

### Pattern 2: Zoom + Pan + Screenshot
```typescript
test('zoomed & panned view', async ({ page }) => {
  await page.goto('/');
  await waitForMapReady(page);
  
  // Zoom
  await zoomMap(page, 'in', 3);
  await waitForTileLoading(page);  // ← Wait for new tiles
  
  // Pan
  await dragMapToLocation(page, 400, 300, 200, 200);
  await waitForMapStable(page);    // ← Wait for animation
  
  // Screenshot
  await expect(page).toHaveScreenshot('zoomed-panned.png');
});
```

### Pattern 3: Assertion After Interaction
```typescript
test('zoom changes level', async ({ page }) => {
  await page.goto('/');
  await waitForMapReady(page);
  
  const zoom1 = await getMapZoomLevel(page);
  await zoomMap(page, 'in', 2);
  const zoom2 = await getMapZoomLevel(page);
  
  expect(zoom2).toBeGreaterThan(zoom1);
});
```

### Pattern 4: Network Monitoring
```typescript
test('zoom loads new tiles', async ({ page }) => {
  const tileRequests: string[] = [];
  
  page.on('response', (res) => {
    if (res.url().includes('tile')) {
      tileRequests.push(res.url());
    }
  });

  await zoomMap(page, 'in', 3);
  await waitForTileLoading(page);
  
  expect(tileRequests.length).toBeGreaterThan(0);
});
```

---

## Selectors Reference

### Common Map Selectors
```typescript
'.leaflet-container'              // Map container
'.leaflet-map-pane'               // Map pane
'.leaflet-control-zoom-in'        // Zoom in button
'.leaflet-control-zoom-out'       // Zoom out button
'.leaflet-layer'                  // Layer element
'[data-testid="report-form"]'     // Custom element
```

### Custom HTML Attributes (Best Practice)
```html
<!-- HTML -->
<div data-testid="map-root" class="map"></div>
<button data-testid="zoom-button">Zoom In</button>
```

```typescript
// Test
page.locator('[data-testid="map-root"]')
page.locator('[data-testid="zoom-button"]')
```

---

## Debugging Helpers

### 1. Print Map Info
```typescript
const mapInfo = await page.evaluate(() => {
  const map = (window as any).map;
  return {
    zoom: map?.getZoom(),
    bounds: map?.getBounds(),
    center: map?.getCenter(),
  };
});
console.log(mapInfo);
```

### 2. Check Network Activity
```typescript
page.on('request', (req) => console.log('→', req.url()));
page.on('response', (res) => console.log('←', res.status(), res.url()));
```

### 3. Take Screenshot for Debugging
```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### 4. Pause Execution
```typescript
await page.pause();  // Pauses in browser inspector
```

---

## Assertions Quick Reference

### DOM Assertions
```typescript
// Visibility
await expect(element).toBeVisible();
await expect(element).toBeHidden();

// Text content
await expect(element).toContainText('text');
await expect(element).toHaveText('exact text');

// Attributes
await expect(element).toHaveAttribute('href', 'url');

// Value (input)
await expect(input).toHaveValue('value');

// Count
await expect(page.locator('.item')).toHaveCount(5);
```

### Custom Assertions
```typescript
// Condition-based
expect(value).toEqual(expected);
expect(value).toBeGreaterThan(10);
expect(value).toBeLessThan(20);
expect(array).toContain(item);
expect(object).toHaveProperty('key');
```

### Screenshot Assertion
```typescript
await expect(page).toHaveScreenshot('name.png', {
  maxDiffPixels: 100,
  threshold: 0.2,
});
```

---

## Browser Context Options

### Desktop
```typescript
// Chrome
{ ...devices['Desktop Chrome'] }

// Firefox
{ ...devices['Desktop Firefox'] }

// Safari
{ ...devices['Desktop Safari'] }
```

### Mobile
```typescript
// iPhone 12
{ ...devices['iPhone 12'] }

// Pixel 5
{ ...devices['Pixel 5'] }
```

---

## Environment Variables

### For CI/CD
```bash
# Run in CI environment
CI=true npm run e2e

# Skip slow tests
SKIP_SLOW_TESTS=true npm run e2e

# Custom timeout
PLAYWRIGHT_TEST_TIMEOUT=60000 npm run e2e
```

---

## File Organization Best Practice

```
e2e/
├── smoke.spec.ts              # Basic smoke tests
├── map-interaction.spec.ts    # Map behavior tests
├── advanced-e2e.spec.ts       # Complex scenarios
├── map-utils.ts               # Reusable helpers ← IMPORT THIS
├── selectors.ts               # Centralized selectors
├── MAP_TESTING_GUIDE.md        # Comprehensive docs
├── QUICK_START.md              # Quick reference
├── __screenshots__/            # Baseline images
│   ├── chromium/
│   └── firefox/
└── __video__/                  # Video recordings
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Timeout exceeded` | Element not found/loaded slow | Increase timeout or improve waiting |
| `Element is not visible` | Element hidden or off-screen | Use `waitFor()` or scroll |
| `Screenshot mismatch` | Visual changes detected | Review diff, update baseline if OK |
| `Port already in use` | Dev server already running | Kill process or use different port |
| `Map undefined` | Leaflet not initialized | Add proper wait strategy |

---

## VS Code Tips

### 1. Install Playwright Extension
```
ms-playwright.playwright
```

### 2. Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+F5` | Run all tests |
| `Ctrl+K Ctrl+T` | Run test in file |
| `F5` | Debug test |
| `Ctrl+Shift+D` | Open debugger |

### 3. IntelliSense
```typescript
// Type hints work automatically
import { test, expect } from '@playwright/test';
test('', async ({ page }) => {
  page.  // ← Auto-complete available
});
```

---

## Links & Resources

📖 [Official Docs](https://playwright.dev)
🎬 [Snapshots Guide](https://playwright.dev/docs/test-snapshots)
⏱️  [Waiting Guide](https://playwright.dev/docs/navigations)
🗺️  [Leaflet Docs](https://leafletjs.com)
🐛 [Debugging Guide](https://playwright.dev/docs/debug)

---

## One-Liners

```bash
# Quick test
npm run e2e:ui

# Generate baseline
npx playwright test -u && npx playwright show-report

# Check specific test
npx playwright test --grep "zoom" --headed

# Debug single test
npx playwright test e2e/smoke.spec.ts --debug

# View last report
npx playwright show-report

# Kill all node processes
taskkill /F /IM node.exe
```

---

**Tip:** Bookmark this file for quick reference! 📌

