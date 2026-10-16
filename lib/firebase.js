import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cached;

// Lazily created, browser only. Offline persistence is switched on here:
// Firestore keeps a copy of your data in IndexedDB, serves reads from it when
// there is no internet, and queues writes until the connection returns.
export function fb() {
  if (cached) return cached;
  if (!config.apiKey) {
    throw new Error('Firebase is not configured. Copy .env.local.example to .env.local and fill it in.');
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  let db;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    db = getFirestore(app); // already initialised (hot reload)
  }
  cached = { app, db, auth: getAuth(app) };
  return cached;
}
