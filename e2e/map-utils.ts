import { Page, expect } from '@playwright/test';

/**
 * Map Testing Utilities & Best Practices untuk Playwright + Leaflet
 * 
 * Berguna untuk:
 * - Waiting strategies (menunggu peta siap)
 * - Map interactions (zoom, pan, click)
 * - Visual regression testing
 * - Debugging & troubleshooting
 */

/**
 * ============================================
 * DEBUGGING & TROUBLESHOOTING UTILITIES
 * ============================================
 */

/**
 * Capture debug information saat map loading gagal
 * GUNAKAN INI UNTUK TROUBLESHOOT ERROR
 */
export async function debugPageState(page: Page, context: string = 'Debug') {
  console.log(`\n❌ [${context}] Capturing debug information...\n`);
  
  try {
    // 1. Get current URL
    const url = page.url();
    console.log(`📍 Current URL: ${url}`);
    
    // 2. Check if on login page
    const isLoginPage = url.includes('/login') || url.includes('/auth');
    if (isLoginPage) {
      console.warn('⚠️  ALERT: Page adalah LOGIN PAGE - test stuck di auth screen!');
      console.warn('   Solusi: Pastikan test sudah authenticated sebelum goto("/")');
    }
    
    // 3. Get page title
    const title = await page.title();
    console.log(`📄 Page Title: ${title}`);
    
    // 4. Check untuk peta elements dengan multiple selectors
    const mapSelectors = [
      { name: '.leaflet-container', desc: 'Leaflet Main Container' },
      { name: '#map', desc: 'Map by ID' },
      { name: 'canvas.leaflet-zoom-animated', desc: 'Leaflet Canvas' },
      { name: '[role="region"][aria-label*="map"], [role="region"][aria-label*="Map"]', desc: 'WAI-ARIA Map Region' },
      { name: '.map-wrapper, [class*="map"]', desc: 'Custom map wrapper' },
    ];
    
    console.log('\n🔍 Map Element Selector Check:');
    for (const selector of mapSelectors) {
      const count = await page.locator(selector.name).count();
      const isVisible = count > 0 ? await page.locator(selector.name).first().isVisible() : false;
      const status = count > 0 ? (isVisible ? '✅ FOUND & VISIBLE' : '⚠️  FOUND but HIDDEN') : '❌ NOT FOUND';
      console.log(`   ${status} | ${selector.desc}`);
    }
    
    // 5. Check page errors/console messages
    const errors: string[] = [];
    page.once('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // 6. Check network activity
    const requests = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      return {
        domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart : 'N/A',
        pageLoadTime: nav ? nav.loadEventEnd - nav.loadEventStart : 'N/A',
        totalTime: nav?.duration || 'N/A',
      };
    });
    console.log('\n⏱️  Performance Metrics:', requests);
    
    // 7. Viewport info
    const viewport = page.viewportSize();
    console.log(`📐 Viewport: ${viewport?.width}x${viewport?.height}`);
    
  } catch (error) {
    console.error('   Error saat mengambil debug info:', error);
  }
}

/**
 * Capture screenshot untuk debugging (simpan dengan timestamp)
 */
export async function captureDebugScreenshot(
  page: Page, 
  name: string = 'debug',
  screenshotPath: string = 'test-results/debug-screenshots'
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${screenshotPath}/${name}-${timestamp}.png`;
  
  try {
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`📸 Screenshot saved: ${filename}`);
  } catch (error) {
    console.warn(`⚠️  Could not save screenshot: ${error}`);
  }
}

/**
 * ============================================
 * WAITING STRATEGIES - ROBUST & DEFENSIVE
 * ============================================
 */

/**
 * IMPROVED: waitForMapReady dengan multiple fallback strategies
 * 
 * Ini adalah FUNGSI UTAMA untuk menunggu peta siap.
 * Mencakup:
 * 1. Pengecekan URL (apakah tidak stuck di login?)
 * 2. Network idle wait
 * 3. Multiple selector fallback
 * 4. Retry logic dengan soft assertions
 * 5. Debug snapshot jika gagal
 */
export async function waitForMapReady(
  page: Page, 
  options?: {
    timeout?: number;
    checkAuth?: boolean;
    debugOnFailure?: boolean;
  }
) {
  const timeout = options?.timeout ?? 30000;
  const checkAuth = options?.checkAuth ?? true;
  const debugOnFailure = options?.debugOnFailure ?? true;
  
  console.log('⏳ [MAP READY] Memulai wait for map dengan robust selectors...');
  
  try {
    // STEP 1: Validasi URL (jangan stuck di halaman login)
    if (checkAuth) {
      console.log('  [1/4] Checking URL untuk memastikan tidak ada auth issue...');
      const url = page.url();
      
      // Soft assertion - jangan crash jika auth check gagal, tapi log warning
      if (url.includes('/login') || url.includes('/auth')) {
        const warning = '⚠️  WARNING: Test stuck di LOGIN/AUTH page! Pastikan user sudah authenticated.';
        console.warn(warning);
        
        if (debugOnFailure) {
          await captureDebugScreenshot(page, 'auth-issue');
        }
        
        // Tunggu sesaat untuk redirect
        await page.waitForTimeout(2000);
      }
      
      // Verify URL berubah dari login
      try {
        await expect(page).not.toHaveURL(/\/(login|auth)/i, { timeout: 5000 });
        console.log('     ✅ URL OK (tidak stuck di login)');
      } catch {
        console.warn('     ⚠️  URL masih berisi login path, cek auth flow');
      }
    }
    
    // STEP 2: Wait for network idle (tile loading selesai)
    console.log('  [2/4] Waiting for network idle (tile images)...');
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('     ✅ Network idle reached');
    } catch {
      console.warn('     ⚠️  Network idle timeout, continuing anyway...');
      // Jangan throw, lanjut ke next strategy
    }
    
    // STEP 3: Try multiple selectors dengan fallback
    console.log('  [3/4] Checking untuk map element (multiple selectors)...');
    
    const mapSelectors = [
      '.leaflet-container',           // Default Leaflet
      '#map',                         // Common ID
      'canvas.leaflet-zoom-animated', // Leaflet canvas
      '[role="region"][aria-label*="map"]', // WAI-ARIA
      '[class*="leaflet-map-pane"]',  // Leaflet pane
    ];
    
    let mapFound = false;
    let mapLocator = null;
    
    for (const selector of mapSelectors) {
      try {
        const locator = page.locator(selector);
        const count = await locator.count({ timeout: 2000 });
        
        if (count > 0) {
          mapFound = true;
          mapLocator = locator.first();
          console.log(`     ✅ Found map: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue ke next selector
      }
    }
    
    if (!mapFound) {
      throw new Error('Map tidak ditemukan dengan semua selectors: ' + mapSelectors.join(', '));
    }
    
    // STEP 4: Wait untuk visibility dengan soft assertion
    console.log('  [4/4] Waiting untuk map visible...');
    try {
      await expect(mapLocator).toBeVisible({ timeout });
      console.log('     ✅ Map visible');
    } catch (error) {
      // Soft assertion - log error tapi coba screenshot untuk debugging
      console.error('     ❌ Map not visible after timeout');
      
      if (debugOnFailure) {
        console.log('     📸 Taking debug screenshot...');
        await captureDebugScreenshot(page, 'map-not-visible');
        await debugPageState(page, 'Map Visibility Failure');
      }
      
      // Re-throw untuk test failure
      throw error;
    }
    
    // Final verification: Tunggu DOM render complete
    console.log('  [FINAL] Waiting untuk DOM rendering...');
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch {
      // OK jika timeout, peta sudah visible
    }
    
    console.log('✅ [MAP READY] Peta siap untuk testing!\n');
    
  } catch (error) {
    console.error('❌ [MAP READY] FAILED:', error);
    
    if (debugOnFailure) {
      await debugPageState(page, 'waitForMapReady');
    }
    
    throw error;
  }
}

/**
 * ALTERNATIVE: Multiple selector strategy dengan fallback
 * Lebih defensif dari waitForMapReady
 */
export async function waitForMapElement(
  page: Page,
  primarySelector?: string,
  timeout: number = 30000
) {
  console.log(`⏳ [MAP ELEMENT] Waiting dengan fallback selectors...'`);
  
  // Default selectors (dari yang paling spesifik ke general)
  const selectors = [
    primarySelector,
    '.leaflet-container',
    '#map',
    'canvas.leaflet-zoom-animated',
    '[role="region"]',
  ].filter(Boolean) as string[];
  
  const startTime = Date.now();
  let lastError: unknown;
  
  for (const selector of selectors) {
    try {
      const elapsedTime = Date.now() - startTime;
      const remainingTimeout = Math.max(1000, timeout - elapsedTime);
      
      console.log(`   Trying selector: ${selector}`);
      await page.locator(selector).waitFor({ 
        state: 'visible', 
        timeout: remainingTimeout 
      });
      
      console.log(`   ✅ Found with selector: ${selector}`);
      return selector;
      
    } catch (error) {
      lastError = error;
      console.log(`   ❌ Not found, trying next...`);
      continue;
    }
  }
  
  // Jika semua gagal
  console.error('❌ No map element found with any selector');
  throw lastError;
}

/**
 * Wait untuk tile loading selesai (dengan soft assertion)
 * Gunakan setelah zoom/pan operations
 */
export async function waitForTileLoading(
  page: Page, 
  timeout: number = 20000,
  failSoft: boolean = true
) {
  console.log('⏳ [TILES] Waiting for tile loading...');
  
  try {
    await page.waitForLoadState('networkidle', { timeout });
    console.log('   ✅ All tiles loaded');
    return true;
  } catch (error) {
    if (failSoft) {
      console.warn('   ⚠️  Tile loading timeout, continuing anyway (failSoft=true)');
      // Wait additional DOM ready
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      } catch {
        // OK if this timeouts
      }
      return false;
    } else {
      throw error;
    }
  }
}

/**
 * Wait untuk map stabil (animasi selesai)
 * Gunakan setelah drag operations
 */
export async function waitForMapStable(
  page: Page,
  stabilityCheckCount: number = 3,
  checkInterval: number = 300,
  maxAttempts: number = 40
) {
  console.log('⏳ [STABILITY] Waiting untuk map stabil (no animations)...');
  
  try {
    // First fallback ke networkidle pakai strategy lain
    await waitForTileLoading(page, 10000, true);
    
    // Kemudian polling untuk stability
    let stableCount = 0;
    let attempts = 0;

    while (stableCount < stabilityCheckCount && attempts < maxAttempts) {
      const mapPane = page.locator('.leaflet-map-pane, [class*="leaflet"], #map');
      const isVisible = await mapPane.isVisible().catch(() => false);
      
      if (!isVisible) {
        console.warn('   ⚠️  Map pane not visible during stability check');
        break;
      }
      
      try {
        // Check untuk transform/animation
        const styles = await mapPane.evaluate((el: Element) => {
          const computed = window.getComputedStyle(el);
          return {
            transform: computed.transform,
            animation: computed.animation,
            opacity: computed.opacity,
          };
        });
        
        // Jika tidak ada perubahan 3 kali berturut-turut, considered stable
        if (!styles.animation || styles.animation === 'none') {
          stableCount++;
        } else {
          stableCount = 0;
        }
      } catch (e) {
        stableCount++;
      }

      if (stableCount < stabilityCheckCount) {
        await page.waitForTimeout(checkInterval);
      }
      attempts++;
    }
    
    console.log(`   ✅ Map stable after ${attempts * checkInterval}ms`);
    
  } catch (error) {
    console.warn('   ⚠️  Stability check error:', error);
    // Dont throw, peta might still be usable
  }
}

/**
 * ============================================
 * MAP INTERACTIONS - IMPROVED ERROR HANDLING
 * ============================================
 */

/**
 * IMPROVED: Drag map dengan fallback strategies
 * Gunakan setelah waitForMapReady
 */
export async function dragMapToLocation(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  duration: number = 500,
  options?: { selector?: string; retries?: number }
) {
  const selector = options?.selector ?? '.leaflet-container';
  const maxRetries = options?.retries ?? 2;
  
  console.log(`🖱️  [DRAG] dari (${fromX}, ${fromY}) → (${toX}, ${toY})...`);
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mapContainer = page.locator(selector);
      
      // Verify container ada
      if (!(await mapContainer.isVisible())) {
        throw new Error(`Map container tidak visible (selector: ${selector})`);
      }
      
      // Perform drag
      await mapContainer.dragTo(mapContainer, {
        sourcePosition: { x: fromX, y: fromY },
        targetPosition: { x: toX, y: toY },
      });

      // Wait untuk drag animation
      await page.waitForTimeout(duration);
      console.log(`   ✅ Drag selesai (attempt ${attempt}/${maxRetries})`);
      return;
      
    } catch (error) {
      lastError = error;
      console.warn(`   ⚠️  Drag attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        console.log(`   Retrying after 500ms...`);
        await page.waitForTimeout(500);
      }
    }
  }
  
  // Jika semua retries gagal
  console.error(`   ❌ Drag failed after ${maxRetries} attempts`);
  throw lastError;
}

/**
 * IMPROVED: Zoom map dengan error handling
 */
export async function zoomMap(
  page: Page,
  direction: 'in' | 'out',
  steps: number = 1,
  wheelPosition?: { x: number; y: number }
) {
  console.log(`🔍 [ZOOM] ${direction.toUpperCase()} (${steps} steps)...`);
  
  try {
    const mapContainer = page.locator('.leaflet-container');
    const box = await mapContainer.boundingBox();
    
    if (!box) {
      throw new Error('Map container bounding box tidak ditemukan');
    }

    // Default zoom di center
    const x = wheelPosition?.x ?? box.width / 2 + box.x;
    const y = wheelPosition?.y ?? box.height / 2 + box.y;

    // Wheel delta: positive = zoom in, negative = zoom out
    const wheelDelta = direction === 'in' ? 100 : -100;
    
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(x, y, 0, wheelDelta);
      await page.waitForTimeout(200);
    }

    console.log(`   ✅ Zoom completed`);
    
  } catch (error) {
    console.error(`   ❌ Zoom failed:`, error);
    throw error;
  }
}

/**
 * IMPROVED: Double click untuk zoom
 */
export async function doubleClickOnMap(
  page: Page,
  x: number | null = null,
  y: number | null = null
) {
  try {
    const mapContainer = page.locator('.leaflet-container');
    const box = await mapContainer.boundingBox();
    
    if (!box) {
      throw new Error('Map container bounding box tidak ditemukan');
    }

    const clickX = x ?? box.width / 2;
    const clickY = y ?? box.height / 2;

    console.log(`👆 [DBLCLICK] pada peta di (${clickX}, ${clickY})...`);
    await mapContainer.dblclick({ position: { x: clickX, y: clickY } });
    
    // Wait untuk zoom animation
    await page.waitForTimeout(500);
    console.log(`   ✅ Double click completed`);
    
  } catch (error) {
    console.error(`   ❌ Double click failed:`, error);
    throw error;
  }
}

/**
 * ============================================
 * VISUAL REGRESSION & SNAPSHOT TESTING
 * ============================================
 */

/**
 * Take map snapshot dengan proper waiting
 */
export async function takeMapSnapshot(
  page: Page,
  snapshotName: string,
  options?: { mask?: string[]; fullPage?: boolean }
) {
  console.log(`📸 [SNAPSHOT] Taking: ${snapshotName}`);
  
  try {
    // Ensure map ready sebelum screenshot
    await waitForMapReady(page, { debugOnFailure: false });
    await page.waitForTimeout(1000);

    const maskSelectors = options?.mask ?? [];
    const fullPage = options?.fullPage ?? false;

    await expect(page).toHaveScreenshot(snapshotName, {
      fullPage,
      mask: maskSelectors.map((sel) => page.locator(sel)),
      maskColor: '#808080',
    });

    console.log(`   ✅ Snapshot saved`);
    
  } catch (error) {
    console.error(`   ❌ Snapshot failed:`, error);
    throw error;
  }
}

/**
 * Compare dengan baseline snapshot
 */
export async function compareMapSnapshot(
  page: Page,
  baselineName: string,
  options?: { maxDiffPixels?: number; threshold?: number }
) {
  console.log(`🔍 [COMPARE] Comparing: ${baselineName}`);

  try {
    await expect(page).toHaveScreenshot(baselineName, {
      fullPage: false,
      maxDiffPixels: options?.maxDiffPixels ?? 100,
      threshold: options?.threshold ?? 0.2,
    });

    console.log(`   ✅ Snapshot matches baseline`);
    
  } catch (error) {
    console.error(`   ❌ Snapshot mismatch:`, error);
    throw error;
  }
}

/**
 * ============================================
 * HELPER FUNCTIONS & DEBUGGING
 * ============================================
 */

/**
 * Get current map bounds (dengan error handling)
 */
export async function getMapBounds(page: Page) {
  console.log('📍 [BOUNDS] Getting map bounds...');
  
  try {
    const bounds = await page.evaluate(() => {
      const map = (window as Record<string, unknown>).map as Record<string, unknown> | undefined;
      if (map && typeof map.getBounds === 'function') {
        const b = map.getBounds() as { _northEast: { lat: number; lng: number }; _southWest: { lat: number; lng: number } };
        return {
          northEast: { lat: b._northEast.lat, lng: b._northEast.lng },
          southWest: { lat: b._southWest.lat, lng: b._southWest.lng },
        };
      }
      return null;
    });

    if (bounds) {
      const ne = bounds.northEast;
      const sw = bounds.southWest;
      console.log(`   NE: (${ne.lat.toFixed(4)}, ${ne.lng.toFixed(4)})`);
      console.log(`   SW: (${sw.lat.toFixed(4)}, ${sw.lng.toFixed(4)})`);
    } else {
      console.warn('   ⚠️  Map instance not found via window.map');
    }

    return bounds;
    
  } catch (error) {
    console.error('   ❌ Error getting bounds:', error);
    return null;
  }
}

/**
 * Get current zoom level
 */
export async function getMapZoomLevel(page: Page): Promise<number | null> {
  try {
    const zoomLevel = await page.evaluate(() => {
      const map = (window as Record<string, unknown>).map as Record<string, unknown> | undefined;
      return (map && typeof map.getZoom === 'function' ? map.getZoom() : null) as number | null;
    });
    
    if (zoomLevel !== null) {
      console.log(`🔍 [ZOOM LEVEL] Current: ${zoomLevel}`);
    } else {
      console.warn('⚠️  Could not get zoom level');
    }
    
    return zoomLevel;
  } catch (error) {
    console.error('❌ Error getting zoom level:', error);
    return null;
  }
}

/**
 * Click pada koordinat map (lat/lng)
 */
export async function clickOnMapCoordinate(
  page: Page,
  lat: number,
  lng: number
) {
  try {
    console.log(`👆 [CLICK] pada koordinat ${lat.toFixed(4)}, ${lng.toFixed(4)}...`);
    
    await page.evaluate(
      ({ lat, lng }) => {
        const L = (window as Record<string, unknown>).L as Record<string, unknown> | undefined;
        const map = (window as Record<string, unknown>).map as Record<string, unknown> | undefined;
        
        if (!map || !L) {
          throw new Error('Map atau Leaflet library tidak ditemukan');
        }
        
        const latLng = (L.latLng as (lat: number, lng: number) => { lat: number; lng: number })(lat, lng);
        const point = (map.latLngToContainerPoint as (latlng: { lat: number; lng: number }) => { x: number; y: number })(latLng);
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
      },
      { lat, lng }
    );

    await page.waitForTimeout(500);
    console.log(`   ✅ Click completed`);
    
  } catch (error) {
    console.error(`   ❌ Click failed:`, error);
    throw error;
  }
}
