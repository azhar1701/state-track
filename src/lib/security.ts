import DOMPurify from 'dompurify';

/**
 * Sanitize user input for logging to prevent log injection attacks
 */
export const sanitizeForLog = (input: unknown): string => {
  if (input == null) return 'null';
  
  const str = String(input);
  return str
    .replace(/[\n\r]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .substring(0, 500);
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (dirty: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
}): string => {
  const { allowedTags = ['b', 'i', 'em', 'strong', 'br'], allowedAttributes = [] } = options || {};
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
  });
};

/**
 * Sanitize text content (strip all HTML)
 */
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Validate and sanitize file path to prevent path traversal
 */
export const sanitizePath = (basePath: string, userPath: string): string => {
  const path = require('path');
  const joined = path.join(basePath, userPath);
  const normalized = path.normalize(joined);
  const resolvedBase = path.resolve(basePath);
  
  if (!normalized.startsWith(resolvedBase)) {
    throw new Error('Invalid path: directory traversal detected');
  }
  
  return normalized;
};
