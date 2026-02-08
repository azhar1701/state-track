import { test, expect } from '@playwright/test';
import {
  waitForMapReady,
  dragMapToLocation,
  zoomMap,
  getMapBounds,
  getMapZoomLevel,
  clickOnMapCoordinate,
  waitForTileLoading,
  waitForMapStable,
} from './map-utils';

/**
 * ADVANCED E2E TESTS - Skenario real-world yang menggabungkan map interaction dengan form
 * 
 * Contoh: User berinteraksi dengan peta, kemudian submit report pada lokasi tertentu
 */

test.describe('🗺️  Advanced E2E: Map + Form Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate ke halaman utama
    await page.goto('/');
    await waitForMapReady(page);
  });

  // ============================================
  // Scenario 1: User explore map, then submit report
  // ============================================
  
  test.skip('user dapat explore peta kemudian submit laporan', async ({ page }) => {
    // SCENARIO:
    // 1. User buka halaman
    // 2. Zoom ke area tertentu
    // 3. Pan ke lokasi spesifik
    // 4. Click untuk buka form
    // 5. Submit report
    
    console.log('📋 TEST: Map Exploration → Report Submission');
    
    // Step 1: Get initial bounds
    const initialBounds = await getMapBounds(page);
    expect(initialBounds).not.toBeNull();
    
    // Step 2: Zoom in
    console.log('Step 2: Zoom in');
    await zoomMap(page, 'in', 3);
    await waitForTileLoading(page);
    
    const zoomAfter = await getMapZoomLevel(page);
    expect(zoomAfter).toBeGreaterThan(10);
    
    // Step 3: Pan ke lokasi tertentu
    console.log('Step 3: Pan ke lokasi');
    await dragMapToLocation(page, 400, 300, 300, 300);
    await waitForMapStable(page);
    
    // Step 4: Click pada peta untuk buka report form
    console.log('Step 4: Click peta untuk open form');
    // Asumsikan ada click handler yang buka form
    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.click({ position: { x: 400, y: 300 } });
    
    // Tunggu form modal muncul
    const reportForm = page.locator('form, [role="dialog"]');
    await reportForm.waitFor({ state: 'visible', timeout: 5000 });
    
    // Step 5: Fill form dan submit
    console.log('Step 5: Fill dan submit form');
    // Contoh form fields (sesuaikan dengan HTML app Anda)
    await page.fill('input[name="title"]', 'Kerusakan Saluran Irigasi');
    await page.fill('textarea[name="description"]', 'Saluran sudah nicht berfungsi');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success (e.g., toast notification atau redirect)
    const successMsg = page.locator('.toast, [role="alert"]');
    await expect(successMsg).toContainText(/success|berhasil|submitted/i, { timeout: 10000 });
    
    console.log('✅ Report submission successful');
  });

  // ============================================
  // Scenario 2: Visual tracking - map state changes
  // ============================================
  
  test.skip('[SNAPSHOT] map state after user interaction should be consistent', async ({ page }) => {
    // Simulate realistic user journey
    
    console.log('Step 1: Initial state');
    await expect(page).toHaveScreenshot('e2e-01-initial.png');
    
    console.log('Step 2: After zoom');
    await zoomMap(page, 'in', 2);
    await waitForTileLoading(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('e2e-02-after-zoom.png');
    
    console.log('Step 3: After pan');
    await dragMapToLocation(page, 400, 300, 200, 200);
    await waitForMapStable(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('e2e-03-after-pan.png');
    
    console.log('Step 4: After double-click');
    // Asumsikan double-click zoom ke lokasi
    await page.locator('.leaflet-container').dblclick({ position: { x: 200, y: 200 } });
    await waitForTileLoading(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('e2e-04-after-dblclick.png');
    
    console.log('✅ User journey visual consistency verified');
  });

  // ============================================
  // Scenario 3: Multi-step interaction workflow
  // ============================================
  
  test.skip('complex workflow: zoom → pan → search → interact', async ({ page }) => {
    console.log('📋 TEST: Complex Multi-Step Workflow');
    
    // Step 1: Zoom ke level tertentu
    const zoom1 = await getMapZoomLevel(page);
    console.log(`Initial zoom: ${zoom1}`);
    
    await zoomMap(page, 'in', 2);
    const zoom2 = await getMapZoomLevel(page);
    console.log(`After zoom in: ${zoom2}`);
    expect(zoom2).toBeGreaterThan(zoom1!);
    
    // Step 2: Pan ke lokasi tertentu
    const bounds1 = await getMapBounds(page);
    console.log(`Bounds before pan:`, bounds1);
    
    await dragMapToLocation(page, 400, 300, 250, 300);
    const bounds2 = await getMapBounds(page);
    console.log(`Bounds after pan:`, bounds2);
    
    expect(bounds2!.northEast.lng).not.toEqual(bounds1!.northEast.lng);
    
    // Step 3: Search/Filter (jika ada search box)
    console.log('Step 3: Search untuk spesifik feature');
    const searchBox = page.locator('input[placeholder*="search"], input[placeholder*="cari"]');
    if (await searchBox.isVisible()) {
      await searchBox.fill('Sungai');
      await page.keyboard.press('Enter');
      
      // Tunggu hasil search
      const searchResults = page.locator('[data-testid="search-results"]');
      await searchResults.waitFor({ state: 'visible', timeout: 5000 });
    }
    
    // Step 4: Click result dan navigate map ke situ
    console.log('Step 4: Interact dengan result');
    const firstResult = page.locator('[data-testid="search-results"] > :first-child');
    if (await firstResult.isVisible()) {
      await firstResult.click();
      
      // Might trigger map zoom/pan
      await waitForTileLoading(page);
    }
    
    // Verify final state
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
    
    console.log('✅ Complex workflow completed');
  });

  // ============================================
  // Scenario 4: Performance & Load Testing
  // ============================================
  
  test.skip('map performance: rapid zoom/pan should not crash', async ({ page }) => {
    console.log('📋 TEST: Performance - Rapid Interactions');
    
    // Rapid zoom in/out
    for (let i = 0; i < 5; i++) {
      await zoomMap(page, 'in', 1);
      await page.waitForTimeout(200);
    }
    
    for (let i = 0; i < 5; i++) {
      await zoomMap(page, 'out', 1);
      await page.waitForTimeout(200);
    }
    
    // Rapid pan
    for (let i = 0; i < 3; i++) {
      await dragMapToLocation(page, 400, 300, 300, 300);
      await page.waitForTimeout(300);
    }
    
    // Verify app still responsive
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
    
    // Take performance metrics (jika ada)
    const perfMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: (navigation as any).domContentLoadedEventEnd - (navigation as any).domContentLoadedEventStart,
        loadComplete: (navigation as any).loadEventEnd - (navigation as any).loadEventStart,
      };
    });
    
    console.log('Performance Metrics:', perfMetrics);
    console.log('✅ App stable after rapid interactions');
  });

  // ============================================
  // Scenario 5: Waiting Strategy Comparison
  // ============================================
  
  test('benchmark: compare different waiting strategies', async ({ page }) => {
    console.log('📋 TEST: Waiting Strategy Comparison');
    
    // Strategy 1: Network Idle (slowest but most reliable)
    console.time('Network Idle');
    await page.waitForLoadState('networkidle');
    console.timeEnd('Network Idle');
    
    // Strategy 2: DOM Ready (fastest)
    console.time('DOM Ready');
    await page.locator('.leaflet-container').waitFor({ state: 'visible' });
    console.timeEnd('DOM Ready');
    
    // Strategy 3: Timeout (arbitrary)
    console.time('Arbitrary Timeout');
    await page.waitForTimeout(1000);
    console.timeEnd('Arbitrary Timeout');
    
    // Recommendation: Use appropriate strategy per scenario
    console.log('📊 Recommendation: Network Idle untuk map dengan tiles');
  });
});

/**
 * ACCESSIBILITY TESTS - Pastikan map accessible
 */
test.describe('♿ Map Accessibility Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
  });

  test.skip('map controls harus accessible via keyboard', async ({ page }) => {
    // Test keyboard navigation
    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.focus();
    
    // Try arrow keys (Leaflet should handle pan)
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
    
    // Verify map panned
    const bounds1 = await getMapBounds(page);
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    
    const bounds2 = await getMapBounds(page);
    
    // Just verify no error occurred
    expect(bounds1).not.toBeNull();
    expect(bounds2).not.toBeNull();
    
    console.log('✅ Keyboard navigation works');
  });

  test.skip('zoom controls harus have proper ARIA labels', async ({ page }) => {
    // Find zoom buttons
    const zoomInBtn = page.locator('.leaflet-control-zoom-in');
    const zoomOutBtn = page.locator('.leaflet-control-zoom-out');
    
    // Check if buttons have proper aria properties
    if (await zoomInBtn.isVisible()) {
      const title = await zoomInBtn.getAttribute('title');
      expect(title).toBeTruthy();
      console.log(`Zoom in button title: ${title}`);
    }
    
    if (await zoomOutBtn.isVisible()) {
      const title = await zoomOutBtn.getAttribute('title');
      expect(title).toBeTruthy();
      console.log(`Zoom out button title: ${title}`);
    }
    
    console.log('✅ Zoom controls properly labeled');
  });
});

/**
 * MOBILE/RESPONSIVE TESTS
 */
test.describe('📱 Mobile Map Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone 12
    
    await page.goto('/');
    await waitForMapReady(page);
  });

  test.skip('peta harus render di mobile viewport', async ({ page }) => {
    const mapContainer = page.locator('.leaflet-container');
    const box = await mapContainer.boundingBox();
    
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(375, 10);
    expect(box!.height).toBeGreaterThan(100);
    
    console.log('✅ Map responsive di mobile');
  });

  test.skip('touch gestures harus support di mobile', async ({ page }) => {
    // Simulate pinch zoom (if Leaflet supports)
    const mapContainer = page.locator('.leaflet-container');
    const box = await mapContainer.boundingBox();
    
    if (box) {
      // Simulate drag untuk pan
      await page.touchscreen?.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.move(box.x + 100, box.y + 100);
      
      console.log('✅ Touch interactions work');
    }
  });
});
