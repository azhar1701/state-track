/**
 * Test Selectors & Page Objects
 * Gunakan file ini untuk centralize semua selectors agar mudah di-maintain
 */

export const selectors = {
  // Navigation
  navbar: 'nav',
  homeLink: 'a[href="/"]',
  reportLink: 'a[href="/report"]',

  // Map
  mapContainer: '.leaflet-container',
  mapElement: '#map',
  
  // Report Form (jika ada)
  reportForm: 'form[data-testid="report-form"]',
  reportSubmitBtn: 'button[type="submit"]',
  
  // UI Components
  Toast: '.sonner-toast',
  Loading: '[role="status"]',
  
  // Admin (jika ada)
  adminPanel: '[data-testid="admin-panel"]',
};

/**
 * Helper function untuk membuat selector yang lebih readable
 */
export const createSelector = (attribute: string, value: string) => {
  return `[data-testid="${attribute}"]` || `[${attribute}="${value}"]`;
};
