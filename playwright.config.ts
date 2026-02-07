import { defineConfig, devices } from '@playwright/test';

/**
 * Konfigurasi Playwright untuk E2E Testing
 * Dokumentasi: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  use: {
    // Base URL untuk aplikasi yang sedang ditest
    baseURL: 'http://localhost:8080',
    
    // Timeout untuk setiap action
    actionTimeout: 10000,
    
    // Screenshot saat test gagal
    screenshot: 'only-on-failure',
    
    // Simpan video saat test gagal
    video: 'retain-on-failure',
    
    // Trace untuk debugging
    trace: 'on-first-retry',

    // VISUAL REGRESSION: Screenshot comparison settings
    // Pixel threshold untuk screenshot comparison (0.2% of pixels dapat berbeda)
    imageMatcherOptions: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  // Web Server configuration - Jalankan dev server sebelum test
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Konfigurasi per browser
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile testing (opsional) */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Timeout global
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
});
