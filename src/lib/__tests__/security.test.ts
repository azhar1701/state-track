import { describe, it, expect } from 'vitest';
import { sanitizePath, sanitizeForLog, sanitizeText, sanitizeHTML } from '@/lib/security';

describe('security utils', () => {
  describe('sanitizePath', () => {
    it('handles normal relative paths', () => {
      expect(sanitizePath('/base', 'uploads/photo.jpg')).toBe('/base/uploads/photo.jpg');
    });

    it('strips simple directory traversal attempts', () => {
      expect(sanitizePath('/base', '../etc/passwd')).toBe('/base/etc/passwd');
    });

    it('strips nested/recursive directory traversal bypasses', () => {
      expect(sanitizePath('/base', '....//....//etc/passwd')).toBe('/base/etc/passwd');
      expect(sanitizePath('/base', '..././..././windows/system32')).toBe('/base/windows/system32');
    });

    it('handles backslashes', () => {
      expect(sanitizePath('C:/base', '..\\..\\secret.txt')).toBe('C:/base/secret.txt');
    });

    it('strips null bytes', () => {
      expect(sanitizePath('/base', 'file.jpg\0.exe')).toBe('/base/file.jpg.exe');
    });
  });

  describe('sanitizeForLog', () => {
    it('strips newline and control characters to prevent log injection', () => {
      const tainted = 'User logged in\nADMIN_OVERRIDE: true\r\n';
      const sanitized = sanitizeForLog(tainted);
      expect(sanitized).not.toContain('\n');
      expect(sanitized).not.toContain('\r');
      expect(sanitized).toContain('User logged in ADMIN_OVERRIDE: true');
    });
  });

  describe('sanitizeText', () => {
    it('strips html tags and script tags', () => {
      const xss = '<script>alert(1)</script>Hello <b>World</b>';
      expect(sanitizeText(xss)).toBe('Hello World');
    });
  });

  describe('sanitizeHTML', () => {
    it('removes unsafe tags but preserves safe formatting tags', () => {
      const dirty = '<script>alert("xss")</script><b>Important</b> <img src=x onerror=alert(1)>';
      expect(sanitizeHTML(dirty)).toBe('<b>Important</b> ');
    });
  });
});
