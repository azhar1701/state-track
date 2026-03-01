/**
 * Shared formatting utilities to ensure consistent UI across Map, Admin, and Reports features.
 */

/**
 * Formats an ISO date string into a localized Indonesian date/time string.
 * @param iso ISO date string
 * @param includeTime Whether to include hours and minutes
 * @returns Formatted string (e.g., "02/03/2026 14:30" or "02/03/2026")
 */
export const formatDateTime = (iso?: string | null, includeTime: boolean = true) => {
  if (!iso) return '-';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: includeTime ? '2-digit' : undefined,
      minute: includeTime ? '2-digit' : undefined,
    });
  } catch (error) {
    console.error('[Formatters] Date format error:', error);
    return '-';
  }
};

/**
 * Generates a concise location string from report data.
 * Consolidates duplicate logic from AdminDashboard and MapView.
 */
export const formatReportLocation = (
  locationName?: string | null,
  desa?: string | null,
  kecamatan?: string | null
): string => {
  if (locationName && locationName.trim().length > 0) return locationName;
  const parts = [desa, kecamatan].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(', ') : 'Lokasi tidak tersedia';
};
