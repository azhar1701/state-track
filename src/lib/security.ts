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
 */
export const sanitizePath = async (basePath: string, userPath: string): Promise<string> => {
  // Browser environment - path traversal not applicable
  if (typeof window !== 'undefined') {
    return userPath;
  }
  
  // Node environment - dynamic import to avoid bundler issues
  try {
    const pathModule = await import('path');
    const joined = pathModule.join(basePath, userPath);
    const normalized = pathModule.normalize(joined);
    const resolvedBase = pathModule.resolve(basePath);
    
    if (!normalized.startsWith(resolvedBase)) {
      throw new Error('Invalid path: directory traversal detected');
    }
    
    return normalized;
  } catch {
    return userPath;
  }
};
