'use client';
import {useEffect, useSyncExternalStore} from 'react';
import {readLocal, writeLocal} from './storage';

/**
 * A per-device setting (language, unit, region) stored in localStorage.
 *
 * The value starts as `fallback` so the first client render matches the prerendered HTML; the stored
 * choice is applied after hydration by the first component that calls `use()`. Every component that
 * calls `use()` re-renders when the value changes.
 */
export function createPreference<T extends string>(
  key: string,
  fallback: T,
  values: readonly T[],
  onChange?: (value: T) => void,
) {
  let current = fallback;
  const listeners = new Set<() => void>();
  const apply = (next: T) => {
    current = next;
    onChange?.(next);
    listeners.forEach(listener => listener());
  };
  const get = () => current;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    get,
    set(next: T) {
      writeLocal(key, next);
      apply(next);
    },
    use() {
      useEffect(() => {
        const stored = readLocal(key) as T | null;
        if (stored && stored !== current && values.includes(stored)) apply(stored);
      }, []);
      return useSyncExternalStore(subscribe, get, () => fallback);
    },
  };
}
