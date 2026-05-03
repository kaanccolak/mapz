'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase';

type AuthContextValue = {
  currentUser: User | null;
  loading: boolean;
  firebaseReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    const app = getFirebaseApp();
    if (!app) {
      setCurrentUser(null);
      setFirebaseReady(false);
      setLoading(false);
      return;
    }
    setFirebaseReady(true);
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const app = getFirebaseApp();
    if (!app) throw new Error('Firebase yapılandırılmadı.');
    await signInWithPopup(getAuth(app), new GoogleAuthProvider());
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const app = getFirebaseApp();
    if (!app) throw new Error('Firebase yapılandırılmadı.');
    await signInWithEmailAndPassword(getAuth(app), email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const app = getFirebaseApp();
    if (!app) throw new Error('Firebase yapılandırılmadı.');
    await createUserWithEmailAndPassword(getAuth(app), email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    const app = getFirebaseApp();
    if (!app) return;
    await firebaseSignOut(getAuth(app));
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      firebaseReady,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [currentUser, loading, firebaseReady, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir');
  }
  return ctx;
}
