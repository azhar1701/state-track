import { describe, it, expect } from 'vitest';
import { clamp } from '@/lib/utils';

describe('utils', () => {
  it('clamp works for inside range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });
  it('clamp works for below min', () => {
    expect(clamp(-1, 0, 3)).toBe(0);
  });
  it('clamp works for above max', () => {
    expect(clamp(9, 0, 3)).toBe(3);
  });
});
