import {Capacitor} from '@capacitor/core';

/** True inside the iOS app (WKWebView loaded from the bundled static export). */
export const isNative = () => Capacitor.isNativePlatform();
