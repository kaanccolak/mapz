import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** İstemci tarafında; env eksikse null (SSR / prerender güvenli). */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  const key = firebaseConfig.apiKey;
  if (!key || key === 'undefined') return null;
  if (getApps().length > 0) return getApps()[0]!;
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı. .env.local içinde NEXT_PUBLIC_FIREBASE_* değişkenlerini kontrol edin.');
  return getAuth(app);
}

export function getFirestoreDb(): Firestore {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase yapılandırılmadı. .env.local içinde NEXT_PUBLIC_FIREBASE_* değişkenlerini kontrol edin.');
  return getFirestore(app);
}
