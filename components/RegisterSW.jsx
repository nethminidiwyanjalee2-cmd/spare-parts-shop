'use client';
import { useEffect } from 'react';

// Registers the service worker that lets the app itself (pages, scripts, styles)
// open with no internet. Production builds only.
export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.error('SW registration failed', e));
    }
  }, []);
  return null;
}
