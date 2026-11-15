'use client';
import {createPreference} from './preference';

export type Lang = 'zh' | 'en';
export const languages: {value: Lang; label: string}[] = [
  {value: 'zh', label: '简体中文'},
  {value: 'en', label: 'English'},
];
const pref = createPreference<Lang>('app-language', 'en', ['zh', 'en'], next => {
  if (typeof document !== 'undefined') document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
});
export const setLang = pref.set;
export const getLang = pref.get;
export const locale = () => (getLang() === 'en' ? 'en-US' : 'zh-CN');
/** Pick the string for the current language. Call it during render (not at module load) so it follows language changes. */
export function tr(zh: string, en: string) {
  return getLang() === 'en' ? en : zh;
}
/** Re-renders the calling component when the language changes. Use it in every top-level view that calls `tr`. */
export const useLang = pref.use;
