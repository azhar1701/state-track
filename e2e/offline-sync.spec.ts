import { test, expect } from '@playwright/test';
import { logger } from '../src/lib/logger';

/**
 * OFFLINE SYNC TEST: Verifikasi fitur offline-first SIPASDA
 * 
 * Scenario:
 * 1. Login ke aplikasi (jika diperlukan)
 * 2. Navigasi ke halaman buat laporan
 * 3. Matikan koneksi internet (setOffline)
 * 4. Isi formulir laporan lengkap
 * 5. Kirim laporan -> Pastikan muncul pesan "Offline" dan masuk antrian
 * 6. Aktifkan kembali koneksi internet
 * 7. Tunggu sinkronisasi otomatis -> Pastikan laporan terkirim ke server
 */
test.describe('SIPASDA Offline Sync', () => {

  test('harus menyimpan laporan saat offline dan sinkronisasi saat online', async ({ page, context }) => {
    // 1. Persiapan: Buka aplikasi
    logger.info('📍 Step 1: Membuka aplikasi...');
    await page.goto('/report', { waitUntil: 'networkidle' });

    // Login if redirected to auth (simplified assumption)
    if (page.url().includes('/auth')) {
      logger.info('📍 Melakukan login test...');
      // Note: adjust these selectors to your actual auth page
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/report');
    }

    // 2. Go Offline
    logger.info('📍 Step 2: Mematikan koneksi internet...');
    await context.setOffline(true);

    // 3. Step 1: Identifikasi
    logger.info('📍 Step 3: Mengisi Identifikasi (Step 1)...');
    await page.fill('#title', 'Laporan Offline Test');
    await page.fill('#description', 'Ini adalah deskripsi laporan yang dibuat saat kondisi offline untuk pengujian sinkronisasi.');
    
    // Select category (refactored uses shadcn Select, might need to click trigger then item)
    await page.click('#category');
    await page.click('text=Irigasi');
    
    await page.click('button:has-text("Lanjut")');

    // 4. Step 2: Dokumentasi (Skip photo upload for E2E speed, or add mock file)
    logger.info('📍 Step 4: Melewati Dokumentasi (Step 2)...');
    await page.click('button:has-text("Lanjut")');

    // 5. Step 3: Lokasi
    logger.info('📍 Step 5: Mengisi Lokasi (Step 3)...');
    // Pilih Kecamatan
    await page.click('button:has-text("Pilih kecamatan")');
    await page.locator('role=option').first().click();
    
    // Pilih Desa
    await page.click('button:has-text("Pilih desa")');
    await page.locator('role=option').first().click();

    await page.click('button:has-text("Lanjut")');

    // 6. Step 4: Review & Submit (Offline)
    logger.info('📍 Step 6: Submit Laporan saat Offline...');
    await page.click('button:has-text("Kirim Laporan")');

    // Verify offline success message
    await expect(page.getByText(/simpan offline|koneksi terputus/i)).toBeVisible();
    logger.info('   ✅ Laporan tersimpan di IndexedDB (Outbox)');

    // 7. Go Online
    logger.info('📍 Step 7: Mengaktifkan kembali koneksi internet...');
    await context.setOffline(false);
    
    // Wait for auto-sync process
    logger.info('📍 Menunggu sinkronisasi otomatis...');
    await page.waitForTimeout(5000); 

    // Verify success toast or redirection to success page
    await expect(page).toHaveURL(/\/report\/success/);
    logger.info('   ✅ Sinkronisasi berhasil! Dialihkan ke halaman sukses.');
  });
});
