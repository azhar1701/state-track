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
 * Browser-only implementation (no Node.js path module)
 */
export const sanitizePath = (basePath: string, userPath: string): string => {
  // Remove any path traversal attempts
  const cleaned = userPath.replace(/\.\./g, '').replace(/[\\/]+/g, '/');
  
  // Ensure it doesn't start with /
  const normalized = cleaned.startsWith('/') ? cleaned.slice(1) : cleaned;
  
  // Join with base path
  const joined = `${basePath.replace(/\/$/, '')}/${normalized}`;
  
  return joined;
};
