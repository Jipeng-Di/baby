'use client';
import {useEffect, useSyncExternalStore} from 'react';
import {tr} from './i18n';
import type {Region} from './guide';

/** Which country's vaccine and checkup schedule the health guide follows. Per device, like language. */
export const regions: {value: Region; label: () => string; detail: () => string}[] = [
  {
    value: 'us',
    label: () => tr('美国', 'United States'),
    detail: () => tr('AAP 2026 免疫程序与体检时间表', 'AAP 2026 immunization & checkup schedules'),
  },
  {
    value: 'cn',
    label: () => tr('中国', 'China'),
    detail: () =>
      tr('国家免疫规划（2026 年版）与儿童保健', 'National Immunization Program (2026) & child health checks'),
  },
];
const KEY = 'health-region';
// Starts as the default so the first client render matches the prerendered HTML.
let region: Region = 'us';
const listeners = new Set<() => void>();
function apply(next: Region) {
  region = next;
  listeners.forEach(listener => listener());
}
export function setRegion(next: Region) {
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  apply(next);
}
export const getRegion = () => region;
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useRegion() {
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {}
    if (stored === 'cn' && region !== 'cn') apply('cn');
  }, []);
  return useSyncExternalStore(subscribe, getRegion, () => 'us' as Region);
}
