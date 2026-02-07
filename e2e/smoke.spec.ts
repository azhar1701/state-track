import { test, expect } from '@playwright/test';

/**
 * SMOKE TEST: Verifikasi aplikasi SIPASDA tidak crash
 * 
 * Scenario:
 * 1. Buka halaman utama (localhost:8080)
 * 2. Pastikan judul halaman mengandung kata "SIPASDA" 
 * 3. Tunggu sampai elemen peta terlihat di layar
 * 4. Ambil screenshot halaman sebagai bukti
 */
test.describe('SIPASDA Smoke Test', () => {
  
  test('aplikasi harus load tanpa crash dan menampilkan peta', async ({ page }) => {
    // Step 1: Buka halaman utama
    console.log('📍 Step 1: Membuka halaman utama...');
    await page.goto('/', { waitUntil: 'networkidle' });

    // Step 2: Verifikasi judul halaman
    console.log('📍 Step 2: Verifikasi judul halaman...');
    const pageTitle = await page.title();
    console.log(`   Title terdeteksi: "${pageTitle}"`);
    expect(pageTitle.toUpperCase()).toContain('SIPASDA');

    // Step 3: Tunggu peta terlihat
    console.log('📍 Step 3: Memastikan peta terlihat...');
    // Cek apakah Leaflet container ada (untuk peta berbasis Leaflet)
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Peta terdeteksi dan visible');

    // Step 4: Ambil screenshot sebagai bukti
    console.log('📍 Step 4: Mengambil screenshot...');
    await page.screenshot({ 
      path: 'test-results/smoke-test-screenshot.png',
      fullPage: true 
    });
    console.log('   ✅ Screenshot disimpan: test-results/smoke-test-screenshot.png');
  });

  test('navbar harus menampilkan elemen utama', async ({ page }) => {
    await page.goto('/');
    
    // Tunggu sampai halaman fully loaded
    await page.waitForLoadState('networkidle');
    
    // Verifikasi navbar ada
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
    
    console.log('✅ Navbar terdeteksi dan visible');
  });

  test('tidak ada console error saat halaman load', async ({ page }) => {
    const errors: string[] = [];
    
    // Tangkap console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Tunggu 2 detik untuk memastikan tidak ada error tertunda

    // Jika ada error, tampilkan di output
    if (errors.length > 0) {
      console.warn('⚠️  Console errors terdeteksi:');
      errors.forEach((error) => console.warn(`   - ${error}`));
    }
    
    // Test berhasil jika tidak ada error atau error yang detected tidak kritis
    expect(errors.length).toBeLessThanOrEqual(0);
  });

  test('aplikasi harus responsive di mobile', async ({ page }) => {
    // Set viewport ke ukuran mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Tunggu sampai peta visible
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible({ timeout: 15000 });
    
    // Ambil screenshot mobile
    await page.screenshot({ 
      path: 'test-results/smoke-test-mobile.png',
      fullPage: true 
    });
    
    console.log('✅ Mobile view OK - Screenshot disimpan: test-results/smoke-test-mobile.png');
  });
});
