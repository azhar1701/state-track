import DOMPurify from 'dompurify';

/**
 * Sanitize user input for logging to prevent log injection attacks
 */
export const sanitizeForLog = (input: unknown): string => {
  if (input == null) return 'null';
  
  const str = String(input);
  // Remove newlines and control characters using character codes
  return str
    .replace(/[\n\r]/g, ' ')
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
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
 * Sanitize text content (strip all HTML and fix encoding issues)
 */
export const sanitizeText = (dirty: string): string => {
  if (!dirty) return '';
  
  // Fix smart quotes and encoding issues first
  const fixed = dirty
    .replace(/[""]/g, '"')  // Curly double quotes → straight
    .replace(/['']/g, "'")  // Curly single quotes → straight
    .replace(/…/g, '...')   // Ellipsis
    .replace(/—/g, '-')     // Em dash
    .replace(/–/g, '-');    // En dash
  
  return DOMPurify.sanitize(fixed, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Validate and sanitize file path to prevent path traversal
 * Browser-only implementation (no Node.js path module)
 */
export const sanitizePath = (basePath: string, userPath: string): string => {
  if (!userPath) return basePath.replace(/\/+$/, '');
  
  // Remove null bytes and control chars
  const sanitized = userPath.replace(/\0/g, '').replace(/\\+/g, '/').replace(/\/+/g, '/');
  
  // Segment-based whitelist to strictly prevent directory traversal (e.g. '....//', '../', '.../')
  const safeSegments = sanitized
    .split('/')
    .filter(segment => segment.length > 0 && segment.replace(/\./g, '').length > 0);
  
  const base = basePath.replace(/\/+$/, '');
  return safeSegments.length > 0 ? `${base}/${safeSegments.join('/')}` : base;
};
