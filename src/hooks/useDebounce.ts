import { useState, useEffect } from 'react';

/**
 * Reusable hook to debounce a fast-changing value.
 * @param value The value to debounce
 * @param delayMs Delay in milliseconds (default: 350ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delayMs: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
