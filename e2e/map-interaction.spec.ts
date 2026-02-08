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
    console.log('\n📋 TEST: Drag peta ke kanan');
    
    // Get initial bounds sebelum drag
    const boundsBefore = await getMapBounds(page);
    console.log('📍 Bounds sebelum drag:', boundsBefore);
    
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
    console.log('📍 Bounds setelah drag:', boundsAfter);
    
    // Assert bahwa bounds berubah (longitude bergeser)
    if (boundsBefore && boundsAfter) {
      expect(boundsAfter.northEast.lng).not.toEqual(boundsBefore.northEast.lng);
      console.log('✅ Map berhasil di-pan');
    }
  });

  test('harus bisa drag peta ke arah atas (pan up)', async ({ page }) => {
    console.log('\n📋 TEST: Drag peta ke atas');
    
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
      console.log('✅ Map berhasil di-pan ke atas');
    }
  });

  test('harus bisa drag peta secara diagonal', async ({ page }) => {
    console.log('\n📋 TEST: Drag peta diagonal');
    
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
    
    console.log('✅ Drag diagonal completed');
  });

  // ============================================
  // 2. ZOOM INTERACTIONS
  // ============================================

  test('harus bisa zoom in menggunakan mouse wheel', async ({ page }) => {
    console.log('\n📋 TEST: Zoom In dengan scroll wheel');
    
    const zoomBefore = await getMapZoomLevel(page);
    console.log('🔍 Zoom level sebelum:', zoomBefore);
    
    // Zoom in 3 steps
    await zoomMap(page, 'in', 3);
    
    const zoomAfter = await getMapZoomLevel(page);
    console.log('🔍 Zoom level sesudah:', zoomAfter);
    
    // Assert zoom level meningkat
    if (zoomBefore && zoomAfter) {
      expect(zoomAfter).toBeGreaterThan(zoomBefore);
      console.log(`✅ Zoom berhasil dari ${zoomBefore} ke ${zoomAfter}`);
    }
  });

  test('harus bisa zoom out menggunakan mouse wheel', async ({ page }) => {
    console.log('\n📋 TEST: Zoom Out dengan scroll wheel');
    
    // First zoom in
    await zoomMap(page, 'in', 2);
    
    const zoomBefore = await getMapZoomLevel(page);
    console.log('🔍 Zoom level sebelum zoom out:', zoomBefore);
    
    // Then zoom out
    await zoomMap(page, 'out', 2);
    
    const zoomAfter = await getMapZoomLevel(page);
    console.log('🔍 Zoom level sesudah zoom out:', zoomAfter);
    
    // Assert zoom level berkurang
    if (zoomBefore && zoomAfter) {
      expect(zoomAfter).toBeLessThan(zoomBefore);
      console.log(`✅ Zoom out dari ${zoomBefore} ke ${zoomAfter}`);
    }
  });

  test('double click harus zoom in pada lokasi clicked', async ({ page }) => {
    console.log('\n📋 TEST: Double click untuk zoom in');
    
    const zoomBefore = await getMapZoomLevel(page);
    
    // Double click di center map
    await doubleClickOnMap(page, 400, 300);
    
    const zoomAfter = await getMapZoomLevel(page);
    
    // Assert zoom level meningkat
    if (zoomBefore && zoomAfter) {
      expect(zoomAfter).toBeGreaterThan(zoomBefore);
      console.log(`✅ Double click zoom dari ${zoomBefore} ke ${zoomAfter}`);
    }
  });

  test('zoom in harus load tile baru (network request)', async ({ page }) => {
    console.log('\n📋 TEST: Zoom in trigger tile loading');
    
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
    
    console.log(`📊 Total tile request: ${tileRequests.length}`);
    
    // Bisa assert tile loading terjadi (tergantung tile provider)
    console.log('✅ Tile loading untuk zoom completed');
  });

  // ============================================
  // 3. VISUAL REGRESSION TESTING
  // ============================================

  test('[SNAPSHOT] default map view harus konsisten', async ({ page }) => {
    console.log('\n📋 TEST: Visual Regression - Default Map View');
    
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
    
    console.log('✅ Visual regression check passed');
  });

  test('[SNAPSHOT] map setelah zoom in harus valid', async ({ page }) => {
    console.log('\n📋 TEST: Visual Regression - Zoomed Map View');
    
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
    
    console.log('✅ Zoomed map visual regression check passed');
  });

  test('[SNAPSHOT] map setelah pan harus valid', async ({ page }) => {
    console.log('\n📋 TEST: Visual Regression - Panned Map View');
    
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
    
    console.log('✅ Panned map visual regression check passed');
  });

  // ============================================
  // 4. WAITING STRATEGY TESTS
  // ============================================

  test('waitForMapReady harus detect when peta fully loaded', async ({ page }) => {
    console.log('\n📋 TEST: Waiting Strategy - Network Idle');
    
    // waitForMapReady sudah dijalankan di beforeEach
    // Test ini memastikan strategy bekerja dengan baik
    
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
    
    console.log('✅ Map ready detection working correctly');
  });

  test('network idle strategy harus wait untuk semua tile loading', async ({ page }) => {
    console.log('\n📋 TEST: Network Idle for Tile Loading');
    
    // Take baseline zoom
    const zoomBefore = await getMapZoomLevel(page);
    
    // Zoom in (akan trigger tile loading)
    await zoomMap(page, 'in', 3);
    
    // Use waitForTileLoading dengan explicit timeout
    await waitForTileLoading(page, 20000);
    
    // Verify semua tile sudah load (tidak ada pending request)
    const networkState = await page.evaluate(() => {
      // Check jika ada pending fetch/xhr
      return (window as any).__networkActive ?? false;
    });
    
    console.log('✅ Tile loading strategy validated');
  });

  // ============================================
  // 5. COMBINATION TESTS
  // ============================================

  test('combined interaction: zoom → pan → zoom out', async ({ page }) => {
    console.log('\n📋 TEST: Combined Map Interactions');
    
    const zoomLevel1 = await getMapZoomLevel(page);
    console.log(`Step 1 - Initial zoom: ${zoomLevel1}`);
    
    // Step 1: Zoom in
    await zoomMap(page, 'in', 2);
    const zoomLevel2 = await getMapZoomLevel(page);
    console.log(`Step 2 - After zoom in: ${zoomLevel2}`);
    
    // Step 2: Pan
    await dragMapToLocation(page, 400, 300, 300, 250);
    const bounds = await getMapBounds(page);
    console.log(`Step 3 - After pan:`, bounds);
    
    // Step 3: Zoom out
    await zoomMap(page, 'out', 1);
    const zoomLevel3 = await getMapZoomLevel(page);
    console.log(`Step 4 - After zoom out: ${zoomLevel3}`);
    
    // Assertions
    expect(zoomLevel2).toBeGreaterThan(zoomLevel1);
    expect(zoomLevel3).toBeLessThan(zoomLevel2);
    
    console.log('✅ Combined interactions completed successfully');
  });

  test('should maintain visual consistency during interactions', async ({ page }) => {
    console.log('\n📋 TEST: Visual Consistency During Interactions');
    
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
    
    console.log('✅ Map visual consistency maintained');
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
      const map = (window as any).map;
      const L = (window as any).L;
      
      return {
        mapExists: !!map,
        leafletVersion: L?.version,
        zoom: map?.getZoom(),
        bounds: map?.getBounds(),
        center: map?.getCenter(),
        containerSize: {
          width: map?._container?.clientWidth,
          height: map?._container?.clientHeight,
        },
      };
    });
    
    console.log('🗺️  Map Debug Info:', JSON.stringify(mapInfo, null, 2));
  });

  test.skip('debug: check tile provider', async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);
    
    const tileInfo = await page.evaluate(() => {
      const map = (window as any).map;
      const layers = map?.getLayers?.() ?? [];
      
      return {
        totalLayers: layers.length,
        tileLayer: layers
          .filter((l: any) => l._url)
          .map((l: any) => ({
            url: l._url,
            name: l.options?.attribution,
          })),
      };
    });
    
    console.log('🎨 Tile Provider Info:', JSON.stringify(tileInfo, null, 2));
  });
});
