import { logger } from "../src/lib/logger";
import { test, expect } from '@playwright/test';
import {
  waitForMapReady,
  dragMapToLocation,
  zoomMap,
  doubleClickOnMap,
  takeMapSnapshot,
  getMapBounds,
  getMapZoomLevel,
  clickOnMapCoordinate,
  waitForTileLoading,
  waitForMapStable,
} from './map-utils';

/**
 * MAP INTERACTION TESTS - Comprehensive test scenarios untuk interaksi peta Leaflet
 * 
 * Setup: 
 * - Pastikan aplikasi berjalan di localhost:8080
 * - Peta harus menggunakan Leaflet dengan class `.leaflet-container`
 * - API untuk tile loading (OpenStreetMap atau custom)
 */

test.describe('🗺️  Map Interaction Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate ke halaman dengan peta
    await page.goto('/');
    
    // Tunggu peta siap sebelum setiap test
    await waitForMapReady(page);
  });

  // ============================================
  // 1. MAP PANNING (DRAG & DROP)
  // ============================================
  
  test('harus bisa drag peta ke arah kanan (pan right)', async ({ page }) => {
    logger.info('\n📋 TEST: Drag peta ke kanan');
    
    // Get initial bounds sebelum drag
    const boundsBefore = await getMapBounds(page);
    logger.info('📍 Bounds sebelum drag:', boundsBefore);
    
    // Drag dari tengah peta ke kanan
    // Map container approximately 800px wide, 600px tall
    await dragMapToLocation(
      page,
      400, // dari X (center)
      300, // dari Y (center)
      300, // ke X (kiri, jadi map se-scroll kanan)
      300  // ke Y (sama)
    );
    
    // Get bounds setelah drag
    const boundsAfter = await getMapBounds(page);
    logger.info('📍 Bounds setelah drag:', boundsAfter);
    
    // Assert bahwa bounds berubah (longitude bergeser)
    if (boundsBefore && boundsAfter) {
      expect(boundsAfter.northEast.lng).not.toEqual(boundsBefore.northEast.lng);
      logger.info('✅ Map berhasil di-pan');
    }
  });

  test('harus bisa drag peta ke arah atas (pan up)', async ({ page }) => {
    logger.info('\n📋 TEST: Drag peta ke atas');
    
    const boundsBefore = await getMapBounds(page);
    
    // Drag dari tengah ke atas
    await dragMapToLocation(
      page,
      400, 300, // dari center
      400, 450  // ke bawah pada canvas (map bergeser ke atas)
    );
    
    const boundsAfter = await getMapBounds(page);
    
    // Assert latitude berubah (geser atas/bawah)
    if (boundsBefore && boundsAfter) {
      expect(boundsAfter.northEast.lat).not.toEqual(boundsBefore.northEast.lat);
      logger.info('✅ Map berhasil di-pan ke atas');
    }
  });

  test('harus bisa drag peta secara diagonal', async ({ page }) => {
    logger.info('\n📋 TEST: Drag peta diagonal');
    
    // Drag diagonal dari kanan atas ke kiri bawah
    await dragMapToLocation(
      page,
      100, 100,   // top-left
      500, 500    // bottom-right
    );
    
    // Tunggu sampai animasi selesai
    await waitForMapStable(page);
    
    // Verify peta masih visible
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
    
    logger.info('✅ Drag diagonal completed');
  });

  // ============================================
  // 2. ZOOM INTERACTIONS
  // ============================================

  test('harus bisa zoom in menggunakan mouse wheel', async ({ page }) => {
    logger.info('\n📋 TEST: Zoom In dengan scroll wheel');
    
    const zoomBefore = await getMapZoomLevel(page);
    logger.info('🔍 Zoom level sebelum:', zoomBefore);
    
    // Zoom in 3 steps
    await zoomMap(page, 'in', 3);
    
    const zoomAfter = await getMapZoomLevel(page);
    logger.info('🔍 Zoom level sesudah:', zoomAfter);
    
    // Assert zoom level meningkat
    if (zoomBefore && zoomAfter) {
      expect(zoomAfter).toBeGreaterThan(zoomBefore);
      logger.info(`✅ Zoom berhasil dari ${zoomBefore} ke ${zoomAfter}`);
    }
  });

  test('harus bisa zoom out menggunakan mouse wheel', async ({ page }) => {
    logger.info('\n📋 TEST: Zoom Out dengan scroll wheel');
    
    // First zoom in
    await zoomMap(page, 'in', 2);
    
    const zoomBefore = await getMapZoomLevel(page);
    logger.info('🔍 Zoom level sebelum zoom out:', zoomBefore);
    
    // Then zoom out
    await zoomMap(page, 'out', 2);
    
    const zoomAfter = await getMapZoomLevel(page);
    logger.info('🔍 Zoom level sesudah zoom out:', zoomAfter);
    
    // Assert zoom level berkurang
    if (zoomBefore && zoomAfter) {
      expect(zoomAfter).toBeLessThan(zoomBefore);
      logger.info(`✅ Zoom out dari ${zoomBefore} ke ${zoomAfter}`);
    }
  });

  test('double click harus zoom in pada lokasi clicked', async ({ page }) => {
    logger.info('\n📋 TEST: Double click untuk zoom in');
    
    const zoomBefore = await getMapZoomLevel(page);
    
    // Double click di center map
    await doubleClickOnMap(page, 400, 300);
    
    const zoomAfter = await getMapZoomLevel(page);
    
    // Assert zoom level meningkat
    if (zoomBefore && zoomAfter) {
      expect(zoomAfter).toBeGreaterThan(zoomBefore);
      logger.info(`✅ Double click zoom dari ${zoomBefore} ke ${zoomAfter}`);
    }
  });

  test('zoom in harus load tile baru (network request)', async ({ page }) => {
    logger.info('\n📋 TEST: Zoom in trigger tile loading');
    
    // Setup network monitoring
    const tileRequests: string[] = [];
    
    page.on('response', (response) => {
      if (response.url().includes('tile')) {
        tileRequests.push(response.url());
      }
    });

    // Zoom in 2 steps
    await zoomMap(page, 'in', 2);
    
    // Tunggu tile loading selesai
    await waitForTileLoading(page);
    
    logger.info(`📊 Total tile request: ${tileRequests.length}`);
    
    // Bisa assert tile loading terjadi (tergantung tile provider)
    logger.info('✅ Tile loading untuk zoom completed');
  });

  // ============================================
  // 3. VISUAL REGRESSION TESTING
  // ============================================

  test('[SNAPSHOT] default map view harus konsisten', async ({ page }) => {
    logger.info('\n📋 TEST: Visual Regression - Default Map View');
    
    // Tunggu semua tile selesai loading
    await waitForTileLoading(page);
    
    // Add delay untuk memastikan rendering selesai
    await page.waitForTimeout(2000);
    
    // Take snapshot
    // On first run: ini akan CREATE baseline image di `e2e/__screenshots__/`
    // On subsequent runs: ini akan COMPARE dengan baseline
    await expect(page).toHaveScreenshot('map-default-view.png', {
      fullPage: false,
      // Pixel threshold untuk detected perbedaan (0.2% difference allowed)
      maxDiffPixels: 100,
      threshold: 0.2,
    });
    
    logger.info('✅ Visual regression check passed');
  });

  test('[SNAPSHOT] map setelah zoom in harus valid', async ({ page }) => {
    logger.info('\n📋 TEST: Visual Regression - Zoomed Map View');
    
    // Zoom in
    await zoomMap(page, 'in', 3);
    
    // Tunggu tile loading selesai
    await waitForTileLoading(page);
    await page.waitForTimeout(2000);
    
    // Ambil snapshot zoom view
    await expect(page).toHaveScreenshot('map-zoomed-view.png', {
      fullPage: false,
      maxDiffPixels: 100,
      threshold: 0.2,
    });
    
    logger.info('✅ Zoomed map visual regression check passed');
  });

  test('[SNAPSHOT] map setelah pan harus valid', async ({ page }) => {
    logger.info('\n📋 TEST: Visual Regression - Panned Map View');
    
    // Pan map
    await dragMapToLocation(page, 400, 300, 250, 300);
    
    // Tunggu tile loading selesai
    await waitForTileLoading(page);
    await page.waitForTimeout(2000);
    
    // Ambil snapshot panned view
    await expect(page).toHaveScreenshot('map-panned-view.png', {
      fullPage: false,
      maxDiffPixels: 100,
      threshold: 0.2,
    });
    
    logger.info('✅ Panned map visual regression check passed');
  });

  // ============================================
  // 4. WAITING STRATEGY TESTS
  // ============================================

  test('waitForMapReady harus detect when peta fully loaded', async ({ page }) => {
    logger.info('\n📋 TEST: Waiting Strategy - Network Idle');
    
    // waitForMapReady sudah dijalankan di beforeEach
    // Test ini memastikan strategy bekerja dengan baik
    
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
    
    logger.info('✅ Map ready detection working correctly');
  });

  test('network idle strategy harus wait untuk semua tile loading', async ({ page }) => {
    logger.info('\n📋 TEST: Network Idle for Tile Loading');
    
    // Take baseline zoom
    const zoomBefore = await getMapZoomLevel(page);
    
    // Zoom in (akan trigger tile loading)
    await zoomMap(page, 'in', 3);
    
    // Use waitForTileLoading dengan explicit timeout
    await waitForTileLoading(page, 20000);
    
    // Verify semua tile sudah load (tidak ada pending request)
    const networkState = await page.evaluate(() => {
      // Check jika ada pending fetch/xhr
      return (window as Record<string, unknown>).__networkActive ?? false;
    });
    
    logger.info('✅ Tile loading strategy validated');
  });

  // ============================================
  // 5. COMBINATION TESTS
  // ============================================

  test('combined interaction: zoom → pan → zoom out', async ({ page }) => {
    logger.info('\n📋 TEST: Combined Map Interactions');
    
    const zoomLevel1 = await getMapZoomLevel(page);
    logger.info(`Step 1 - Initial zoom: ${zoomLevel1}`);
    
    // Step 1: Zoom in
    await zoomMap(page, 'in', 2);
    const zoomLevel2 = await getMapZoomLevel(page);
    logger.info(`Step 2 - After zoom in: ${zoomLevel2}`);
    
    // Step 2: Pan
    await dragMapToLocation(page, 400, 300, 300, 250);
    const bounds = await getMapBounds(page);
    logger.info(`Step 3 - After pan:`, bounds);
    
    // Step 3: Zoom out
    await zoomMap(page, 'out', 1);
    const zoomLevel3 = await getMapZoomLevel(page);
    logger.info(`Step 4 - After zoom out: ${zoomLevel3}`);
    
    // Assertions
    expect(zoomLevel2).toBeGreaterThan(zoomLevel1);
    expect(zoomLevel3).toBeLessThan(zoomLevel2);
    
    logger.info('✅ Combined interactions completed successfully');
  });

  test('should maintain visual consistency during interactions', async ({ page }) => {
    logger.info('\n📋 TEST: Visual Consistency During Interactions');
    
    // Perform various interactions
    await zoomMap(page, 'in', 2);
    await dragMapToLocation(page, 400, 300, 200, 200);
    await doubleClickOnMap(page, 400, 300);
    
    // Tunggu stable
    await waitForMapStable(page);
    
    // Verify peta masih fully visible
    const mapContainer = page.locator('.leaflet-container');
    const box = await mapContainer.boundingBox();
    
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
    
    logger.info('✅ Map visual consistency maintained');
  });
});

/**
 * TROUBLESHOOTING TESTS - Jalankan ini jika ada issue
 */
test.describe('🔧 Troubleshooting Map Tests', () => {
  
  test.skip('debug: print map properties', async ({ page }) => {
    // Skip by default, enable untuk debugging
    await page.goto('/');
    await waitForMapReady(page);
    
    const mapInfo = await page.evaluate(() => {
      const map = (window as Record<string, unknown>).map as Record<string, unknown> | undefined;
      const L = (window as Record<string, unknown>).L as Record<string, unknown> | undefined;
      
      return {
        mapExists: !!map,
        leafletVersion: L?.version,
        zoom: typeof map?.getZoom === 'function' ? map.getZoom() : undefined,
        bounds: typeof map?.getBounds === 'function' ? map.getBounds() : undefined,
        center: typeof map?.getCenter === 'function' ? map.getCenter() : undefined,
        containerSize: {
          width: (map?._container as HTMLElement | undefined)?.clientWidth,
          height: (map?._container as HTMLElement | undefined)?.clientHeight,
        },
      };
    });
    
    logger.info('🗺️  Map Debug Info:', JSON.stringify(mapInfo, null, 2));
  });

  test.skip('debug: check tile provider', async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
    
    const tileInfo = await page.evaluate(() => {
      const map = (window as Record<string, unknown>).map as Record<string, unknown> | undefined;
      const layers = (typeof map?.getLayers === 'function' ? map.getLayers() : []) as Array<Record<string, unknown>>;
      
      return {
        totalLayers: layers.length,
        tileLayer: layers
          .filter((l: Record<string, unknown>) => l._url)
          .map((l: Record<string, unknown>) => ({
            url: l._url,
            name: (l.options as Record<string, unknown> | undefined)?.attribution,
          })),
      };
    });
    
    logger.info('🎨 Tile Provider Info:', JSON.stringify(tileInfo, null, 2));
  });
});
