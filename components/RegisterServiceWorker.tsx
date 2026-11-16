'use client';
import {useEffect} from 'react';
import {isNative} from '@/lib/native';
export default function RegisterServiceWorker() {
  useEffect(() => {
    // The native app ships its own files; service workers aren't available on the capacitor:// scheme anyway.
    if (isNative()) return;
    if (
      ('serviceWorker' in navigator && location.protocol === 'https:') ||
      ('serviceWorker' in navigator && location.hostname === 'localhost')
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
