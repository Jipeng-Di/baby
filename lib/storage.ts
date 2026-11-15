/** localStorage access that never throws (private mode, blocked storage, SSR). */
export function readLocal(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}
export function readJson<T>(key: string): T | null {
  const raw = readLocal(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
export const writeJson = (key: string, value: unknown) => writeLocal(key, JSON.stringify(value));
