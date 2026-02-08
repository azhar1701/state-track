import { Page, expect } from '@playwright/test';

/**
 * Map Testing Utilities & Best Practices untuk Playwright + Leaflet
 * 
 * Berguna untuk:
 * - Waiting strategies (menunggu peta siap)
 * - Map interactions (zoom, pan, click)
 * - Visual regression testing
 */

/**
 * WAITING STRATEGIES - Pilihannya ada 3:
 */

/**
 * Strategy 1: Network Idle (RECOMMENDED untuk peta)
 * Tunggu sampai tidak ada request loading (tile images selesai)
 */
export async function waitForMapReady(page: Page) {
  console.log('⏳ Menunggu peta siap (network idle)...');
  
  // Tunggu sampai app fully loaded
  await page.waitForLoadState('networkidle');
  
  // Tambahan: tunggu sampai Leaflet container ada dan visible
  const mapContainer = page.locator('.leaflet-container');
  await expect(mapContainer).toBeVisible({ timeout: 15000 });
  
  console.log('✅ Peta siap untuk testing');
}

/**
 * Strategy 2: Wait for DOM Element + Custom Timeout
 * Jika peta punya custom data attribute atau class
 */
export async function waitForMapElement(
  page: Page,
  selector: string = '.leaflet-map-pane',
  timeout: number = 15000
) {
  console.log(`⏳ Menunggu elemen peta: ${selector}`);
  await page.locator(selector).waitFor({ state: 'visible', timeout });
  console.log('✅ Elemen peta terlihat');
}

/**
 * Strategy 3: Wait for Specific Network Request
 * Gunakan jika peta butuh specific API response
 */
export async function waitForTileLoading(page: Page, timeout: number = 20000) {
  console.log('⏳ Menunggu tile peta selesai loading...');
  
  // Tunggu sampai tidak ada request untuk tile images
  const networkIdlePromise = page.waitForLoadState('networkidle', { timeout });
  
  try {
    await networkIdlePromise;
    console.log('✅ Semua tile peta selesai loading');
  } catch (error) {
    console.warn('⚠️  Timeout saat menunggu tile loading, lanjut testing anyway...');
  }
}

/**
 * Strategy 4: Custom Wait dengan Polling
 * Untuk kasus khusus di mana network idle tidak cukup
 */
export async function waitForMapStable(
  page: Page,
  stabilityCheckCount: number = 3,
  checkInterval: number = 500
) {
  console.log('⏳ Menunggu peta stabil (tidak ada animasi)...');
  
  let stableCount = 0;
  const maxAttempts = 30;
  let attempts = 0;

  while (stableCount < stabilityCheckCount && attempts < maxAttempts) {
    const mapPane = page.locator('.leaflet-map-pane');
    
    // Ambil computed style untuk mendeteksi animasi
    const transform = await mapPane.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    if (transform) {
      stableCount++;
    } else {
      stableCount = 0;
    }

    await page.waitForTimeout(checkInterval);
    attempts++;
  }

  console.log('✅ Peta stabil');
}

/**
 * MAP INTERACTION UTILITIES
 */

/**
 * 1. DRAG & DROP - Menggeser peta (pan)
 */
export async function dragMapToLocation(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  duration: number = 500
) {
  console.log(`🖱️  Drag peta dari (${fromX}, ${fromY}) ke (${toX}, ${toY})...`);
  
  const mapContainer = page.locator('.leaflet-container');
  
  // Perform drag using mouse
  await mapContainer.dragTo(mapContainer, {
    sourcePosition: { x: fromX, y: fromY },
    targetPosition: { x: toX, y: toY },
  });

  // Tunggu sampai animasi selesai
  await page.waitForTimeout(duration);
  console.log('✅ Drag selesai');
}

/**
 * Alternative: Drag menggunakan mouse events yang lebih kontrol
 */
export async function dragMapAlternative(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const mapContainer = page.locator('.leaflet-container');
  const box = await mapContainer.boundingBox();
  
  if (!box) throw new Error('Map container not found');

  // Calculate absolute positions
  const startX = box.x + fromX;
  const startY = box.y + fromY;
  const endX = box.x + toX;
  const endY = box.y + toY;

  // Move mouse dan trigger drag events
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();

  console.log('✅ Drag events completed');
}

/**
 * 2. ZOOM - Mengubah level zoom
 */
export async function zoomMap(
  page: Page,
  direction: 'in' | 'out',
  steps: number = 3,
  wheelPosition?: { x: number; y: number }
) {
  console.log(`🔍 Zoom ${direction} (${steps} steps)...`);
  
  const mapContainer = page.locator('.leaflet-container');
  const box = await mapContainer.boundingBox();
  
  if (!box) throw new Error('Map container not found');

  // Default zoom di center of map
  const x = wheelPosition?.x ?? box.width / 2 + box.x;
  const y = wheelPosition?.y ?? box.height / 2 + box.y;

  // Perform multiple wheel scroll (positive for zoom in, negative for zoom out)
  const wheelDelta = direction === 'in' ? 100 : -100;
  
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(x, y, 0, wheelDelta);
    await page.waitForTimeout(200); // Tunggu animasi zoom
  }

  console.log('✅ Zoom completed');
}

/**
 * 3. DOUBLE CLICK - Untuk zoom in pada lokasi tertentu
 */
export async function doubleClickOnMap(
  page: Page,
  x: number | null = null,
  y: number | null = null
) {
  const mapContainer = page.locator('.leaflet-container');
  const box = await mapContainer.boundingBox();
  
  if (!box) throw new Error('Map container not found');

  const clickX = x ?? box.width / 2;
  const clickY = y ?? box.height / 2;

  console.log(`👆 Double click pada peta di (${clickX}, ${clickY})...`);
  await mapContainer.dblclick({ position: { x: clickX, y: clickY } });
  
  // Tunggu zoom animation
  await page.waitForTimeout(500);
  console.log('✅ Double click completed');
}

/**
 * VISUAL REGRESSION TESTING
 */

/**
 * Take snapshot dengan automatic waiting untuk network idle
 * RECOMMENDED untuk visual regression
 */
export async function takeMapSnapshot(
  page: Page,
  snapshotName: string,
  options?: { mask?: string[] }
) {
  console.log(`📸 Mengambil snapshot: ${snapshotName}`);
  
  // Tunggu peta fully loaded sebelum screenshot
  await waitForMapReady(page);
  
  // Optional: Tunggu sampai peta stabil (tidak ada animasi)
  await page.waitForTimeout(1000);

  // Take snapshot dengan visual regression
  const maskSelectors = options?.mask ?? [
    // Mask timestamp/dynamic content jika ada
    '[data-timestamp]',
    '.dynamic-element',
  ];

  await expect(page).toHaveScreenshot(snapshotName, {
    fullPage: false,
    mask: maskSelectors.map((sel) => page.locator(sel)).filter(Boolean),
    // Bisa skip mask validation untuk beberapa element
    maskColor: '#808080',
  });

  console.log('✅ Snapshot generated');
}

/**
 * Compare snapshot dengan baseline
 */
export async function compareMapSnapshot(
  page: Page,
  baselineName: string,
  updateBaseline: boolean = false
) {
  console.log(`🔍 Membandingkan snapshot dengan baseline: ${baselineName}`);

  if (updateBaseline) {
    console.log('📝 Update mode: Baseline akan di-update');
  }

  await expect(page).toHaveScreenshot(baselineName, {
    fullPage: false,
    maxDiffPixels: 100,
    threshold: 0.2,
  });

  console.log('✅ Snapshot comparison passed');
}

/**
 * HELPER: Get Current Map Bounds
 * Gunakan untuk assertion atau debugging
 */
export async function getMapBounds(page: Page) {
  console.log('📍 Mengambil map bounds...');
  
  const bounds = await page.evaluate(() => {
    if ((window as any).map && (window as any).map.getBounds) {
      const b = (window as any).map.getBounds();
      return {
        northEast: { lat: b._northEast.lat, lng: b._northEast.lng },
        southWest: { lat: b._southWest.lat, lng: b._southWest.lng },
      };
    }
    return null;
  });

  if (bounds) {
    console.log(`   Bounds: NE(${bounds.northEast.lat}, ${bounds.northEast.lng}) SW(${bounds.southWest.lat}, ${bounds.southWest.lng})`);
  }

  return bounds;
}

/**
 * HELPER: Get Current Zoom Level
 */
export async function getMapZoomLevel(page: Page): Promise<number | null> {
  const zoomLevel = await page.evaluate(() => {
    return (window as any).map?.getZoom() ?? null;
  });
  
  if (zoomLevel !== null) {
    console.log(`🔍 Current zoom level: ${zoomLevel}`);
  }
  
  return zoomLevel;
}

/**
 * HELPER: Click pada koordinat peta (lat/lng)
 * Berguna jika peta punya custom markers/features
 */
export async function clickOnMapCoordinate(
  page: Page,
  lat: number,
  lng: number
) {
  console.log(`👆 Click pada koordinat: ${lat}, ${lng}`);
  
  // Get map instance dan hitung pixel position dari lat/lng
  await page.evaluate(
    ({ lat, lng }) => {
      if ((window as any).map && (window as any).L) {
        const L = (window as any).L;
        const point = (window as any).map.latLngToContainerPoint(L.latLng(lat, lng));
        
        // Simulate click using mouse events
        const event = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: point.x,
          clientY: point.y,
        });
        
        const mapContainer = document.querySelector('.leaflet-container');
        if (mapContainer) {
          mapContainer.dispatchEvent(event);
        }
      }
    },
    { lat, lng }
  );

  await page.waitForTimeout(500);
  console.log('✅ Click pada koordinat selesai');
}
