'use client';
import {useEffect, useSyncExternalStore} from 'react';

export type Lang = 'zh' | 'en';
export const languages: {value: Lang; label: string}[] = [
  {value: 'zh', label: '简体中文'},
  {value: 'en', label: 'English'},
];
const KEY = 'app-language';
// Starts as English (the default) so the first client render matches the prerendered HTML; the stored choice is applied after hydration.
let lang: Lang = 'en';
const listeners = new Set<() => void>();

function apply(next: Lang) {
  lang = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
  listeners.forEach(listener => listener());
}
export function setLang(next: Lang) {
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  apply(next);
}
export const getLang = () => lang;
export const locale = () => (lang === 'en' ? 'en-US' : 'zh-CN');
/** Pick the string for the current language. Call it during render (not at module load) so it follows language changes. */
export function tr(zh: string, en: string) {
  return lang === 'en' ? en : zh;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
/** Re-renders the calling component when the language changes. Use it in every top-level view that calls `tr`. */
export function useLang() {
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {}
    if (stored === 'zh' && lang !== 'zh') apply('zh');
  }, []);
  return useSyncExternalStore(subscribe, getLang, () => 'en' as Lang);
}
