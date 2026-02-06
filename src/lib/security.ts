/**
 * Security utilities for sanitizing user input
 * Prevents XSS and log injection attacks
 */

/**
 * Sanitize string for safe logging
 * Removes newlines and control characters that could break log integrity
 */
export const sanitizeForLog = (input: unknown): string => {
  if (input === null || input === undefined) return '';
  
  const str = String(input);
  
  // Remove newlines, carriage returns, and other control characters
  return str
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
};

/**
 * Sanitize HTML to prevent XSS
 * Escapes HTML special characters
 */
export const sanitizeHTML = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Sanitize for safe innerHTML usage
 * More aggressive than sanitizeHTML
 */
export const sanitizeForInnerHTML = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize file path
 * Prevents path traversal attacks
 */
export const sanitizePath = (input: string, allowedBase: string): string | null => {
  const path = require('path');
  const normalized = path.normalize(input);
  const resolved = path.resolve(allowedBase, normalized);
  
  // Ensure the resolved path is within the allowed base
  if (!resolved.startsWith(path.resolve(allowedBase))) {
    return null;
  }
  
  return resolved;
};

/**
 * Safe JSON stringify with error handling
 */
export const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[Circular or Invalid JSON]';
  }
};

/**
 * Sanitize object for logging (deep sanitization)
 */
export const sanitizeObjectForLog = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeForLog(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectForLog);
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeForLog(key)] = sanitizeObjectForLog(value);
    }
    return sanitized;
  }
  
  return obj;
};
