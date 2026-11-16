import {Capacitor} from '@capacitor/core';

/** True inside the iOS app (WKWebView loaded from the bundled static export). */
export const isNative = () => Capacitor.isNativePlatform();

/** A light tap on the iOS app; a no-op on the web. */
export async function tap() {
  if (!isNative()) return;
  try {
    const {Haptics, ImpactStyle} = await import('@capacitor/haptics');
    await Haptics.impact({style: ImpactStyle.Light});
  } catch {}
}

export class LocationDenied extends Error {}

/**
 * Approximate current position. In the iOS app this goes through the native plugin: WKWebView's own
 * navigator.geolocation may never show a permission prompt and then never calls back.
 */
export async function currentPosition(): Promise<{latitude: number; longitude: number}> {
  if (isNative()) {
    const {Geolocation} = await import('@capacitor/geolocation');
    let perm = await Geolocation.checkPermissions();
    if (perm.location === 'prompt' || perm.location === 'prompt-with-rationale')
      perm = await Geolocation.requestPermissions({permissions: ['coarseLocation']});
    if (perm.location === 'denied' && perm.coarseLocation !== 'granted') throw new LocationDenied();
    const {coords} = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      maximumAge: 3 * 60 * 60 * 1000,
      timeout: 15000,
    });
    return coords;
  }
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({coords}) => resolve(coords),
      e => reject(e.code === e.PERMISSION_DENIED ? new LocationDenied() : e),
      {enableHighAccuracy: false, maximumAge: 3 * 60 * 60 * 1000, timeout: 15000},
    );
  });
}

/** Rejects if the promise hasn't settled in time, so a stuck request can't spin forever. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      v => {
        clearTimeout(timer);
        resolve(v);
      },
      e => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
