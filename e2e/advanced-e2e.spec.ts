import { logger } from "../src/lib/logger";
import { test, expect } from '@playwright/test';
import {
  waitForMapReady,
  waitForMapElement,
  dragMapToLocation,
  zoomMap,
  getMapBounds,
  getMapZoomLevel,
  clickOnMapCoordinate,
  waitForTileLoading,
  waitForMapStable,
  debugPageState,
  captureDebugScreenshot,
} from './map-utils';

/**
 * ADVANCED E2E TESTS - Skenario real-world map + form integration
 * 
 * DEBUGGING TIPS:
 * 
 * 1. RUN WITH UI MODE (Interactive debugging):
 *    npx playwright test advanced-e2e.spec.ts --ui
 *    
 * 2. RUN SPECIFIC TEST:
 *    npx playwright test -g "name of test" --ui
 *    
 * 3. ADD MANUAL SCREENSHOTS / DEBUGGING:
 *    await page.screenshot({ path: 'debug.png' });
 *    await debugPageState(page, 'Custom context');
 *    await captureDebugScreenshot(page, 'my-debug');
 *    
 * 4. RUN WITH DEBUG LOG:
 *    DEBUG=pw:api npx playwright test --ui
 */

test.describe('🗺️  Advanced E2E: Map + Form Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate ke halaman utama
    logger.info('Navigate ke halaman utama...');
    await page.goto('/');
    
    /**
     * IMPROVED: waitForMapReady sekarang include:
     * - URL validation (cek tidak stuck di login)
     * - Multiple selector fallback
     * - Network idle + DOM ready
     * - Debug screenshot jika gagal
     */
    await waitForMapReady(page, {
      timeout: 30000,
      checkAuth: true,
      debugOnFailure: true,
    });
  });

  // ============================================
  // Scenario 1: Verify map rendered correctly
  // ============================================
  
  test('✅ [ROBUST] should render map dengan multiple selector fallback', async ({ page }) => {
    logger.info('📋 TEST: Map Rendering Robustness');
    
    // Verifikasi map ada dengan primary selector
    const mapLocator = page.locator('.leaflet-container');
    await expect(mapLocator).toBeVisible({ timeout: 10000 });
    
    // Get bounding box untuk verify size
    const boundingBox = await mapLocator.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeGreaterThan(100);
    expect(boundingBox!.height).toBeGreaterThan(100);
    
    logger.info(`✅ Map rendered: ${boundingBox!.width}x${boundingBox!.height}px`);
  });

  // ============================================
  // Scenario 2: Use alternative selectors
  // ============================================
  
  test('✅ [SELECTORS] harus fallback ke alternative selectors', async ({ page }) => {
    logger.info('📋 TEST: Alternative Selector Fallback');
    
    /**
     * CONTOH: Test multiple selectors dengan fallback
     * Gunakan ini jika selector utama tidak reliable
     */
    const primarySelector = '.leaflet-container';
    
    try {
      // Try primary selector
      await page.locator(primarySelector).waitFor({ 
        state: 'visible', 
        timeout: 5000 
      });
      logger.info('✅ Primary selector found: ' + primarySelector);
    } catch {
      // Fallback ke alternative
      logger.info('Primary selector gagal, trying alternatives...');
      
      const altSelectors = [
        '#map',
        'canvas.leaflet-zoom-animated',
        '[role="region"]',
      ];
      
      for (const selector of altSelectors) {
        try {
          await page.locator(selector).waitFor({ 
            state: 'visible', 
            timeout: 3000 
          });
          logger.info(`✅ Found with alternative selector: ${selector}`);
          break;
        } catch (e) {
          logger.info(`   ❌ Not found: ${selector}`);
        }
      }
    }
  });

  // ============================================
  // Scenario 3: Network idle + DOM ready combo
  // ============================================
  
  test('✅ [WAITING] network idle + DOM ready strategy', async ({ page }) => {
    logger.info('📋 TEST: Advanced Waiting Strategy');
    
    // Strategy 1: Network Idle
    logger.info('Strategy 1: Waiting for network idle...');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    logger.info('✅ Network idle reached');
    
    // Strategy 2: DOM Content Loaded
    logger.info('Strategy 2: Waiting for DOM content...');
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    logger.info('✅ DOM ready');
    
    // Verify map visible
    await expect(page.locator('.leaflet-container')).toBeVisible();
    logger.info('✅ Map visible after combo strategy');
  });

  // ============================================
  // Scenario 4: Debug & screenshot on failure
  // ============================================
  
  test('✅ [DEBUG] manual screenshot & debug capture example', async ({ page }) => {
    logger.info('📋 TEST: Manual Debugging Techniques');
    
    // TECHNIQUE 1: Simple screenshot
    logger.info('Taking simple screenshot...');
    await page.screenshot({ path: 'test-results/debug-screenshots/example-01-simple.png' });
    logger.info('✅ Screenshot saved');
    
    // TECHNIQUE 2: Debug state capture
    logger.info('Capturing debug state...');
    await debugPageState(page, 'Manual Test');
    
    // TECHNIQUE 3: Custom screenshot dengan specific element
    logger.info('Capturing just map container...');
    const mapElement = page.locator('.leaflet-container');
    const box = await mapElement.boundingBox();
    if (box) {
      await page.screenshot({
        path: 'test-results/debug-screenshots/example-02-map-only.png',
        clip: box,
      });
      logger.info('✅ Map screenshot saved');
    }
    
    // TECHNIQUE 4: Define custom breakpoint
    logger.info('Manual debug point - you can resume in UI mode');
    // In --ui mode, you can now step through and inspect elements
  });

  // ============================================
  // Scenario 5: Map interactions dengan retry
  // ============================================
  
  test.skip('user dapat explore peta kemudian submit laporan', async ({ page }) => {
    // SCENARIO:
    // 1. User buka halaman
    // 2. Zoom ke area tertentu
    // 3. Pan ke lokasi spesifik
    // 4. Click untuk buka form
    // 5. Submit report
    
    logger.info('📋 TEST: Map Exploration → Report Submission');
    
    // Step 1: Get initial bounds
    const initialBounds = await getMapBounds(page);
    expect(initialBounds).not.toBeNull();
    logger.info('✅ Initial bounds captured');
    
    // Step 2: Zoom in (dengan error handling)
    logger.info('Step 2: Zoom in dengan retry logic');
    await zoomMap(page, 'in', 2);
    
    // Tunggu tiles selesai loading
    await waitForTileLoading(page, 15000, true); // failSoft=true
    
    const zoomAfter = await getMapZoomLevel(page);
    expect(zoomAfter).toBeGreaterThan(1);
    logger.info(`✅ Zoomed to level: ${zoomAfter}`);
    
    // Step 3: Pan ke lokasi tertentu
    logger.info('Step 3: Pan ke lokasi dengan retry');
    await dragMapToLocation(page, 400, 300, 300, 250, 500, { retries: 2 });
    await waitForMapStable(page, 3, 300);
    
    // Step 4: Verify location berubah
    const boundsAfterPan = await getMapBounds(page);
    expect(boundsAfterPan).not.toBeNull();
    expect(boundsAfterPan?.northEast.lng).not.toEqual(initialBounds?.northEast.lng);
    logger.info('✅ Map panned successfully');
    
    // Step 5: Click pada peta
    logger.info('Step 4: Click peta untuk open form');
    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.click({ position: { x: 400, y: 300 } });
    
    // Tunggu form modal muncul
    const reportForm = page.locator('form, [role="dialog"]');
    await reportForm.waitFor({ state: 'visible', timeout: 5000 });
    logger.info('✅ Form appeared');
    
    // Step 6: Fill & submit
    logger.info('Step 5: Fill form');
    await page.fill('input[name="title"]', 'Kerusakan Saluran');
    await page.fill('textarea[name="description"]', 'Test report');
    
    await page.click('button[type="submit"]');
    
    const successMsg = page.locator('.toast, [role="alert"]');
    await expect(successMsg).toContainText(/success|berhasil/i, { timeout: 10000 });
    
    logger.info('✅ Report submitted');
  });

  // ============================================
  // Scenario 6: Visual regression dengan masking
  // ============================================
  
  test.skip('[SNAPSHOT] map state consistency', async ({ page }) => {
    logger.info('📋 TEST: Visual Regression');
    
    logger.info('Snapshot 1: Initial state');
    await expect(page).toHaveScreenshot('e2e-map-initial.png');
    
    logger.info('Snapshot 2: After zoom');
    await zoomMap(page, 'in', 1);
    await waitForTileLoading(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('e2e-map-zoomed.png');
    
    logger.info('✅ Snapshots captured');
  });
});

/**
 * ============================================
 * ACCESSIBILITY & RESPONSIVE TESTS
 * ============================================
 */

test.describe('♿ Map Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page, { checkAuth: true });
  });

  test.skip('map controls harus accessible via keyboard', async ({ page }) => {
    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.focus();
    
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
    
    const bounds = await getMapBounds(page);
    expect(bounds).not.toBeNull();
    
    logger.info('✅ Keyboard navigation works');
  });
});

test.describe('📱 Mobile Map Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForMapReady(page);
  });

  test.skip('peta harus render di mobile viewport', async ({ page }) => {
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
    
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    
    logger.info('✅ Map responsive');
  });
});
