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
