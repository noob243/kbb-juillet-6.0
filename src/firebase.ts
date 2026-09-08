import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const config = (firebaseConfigJson as any) || {};

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || config.projectId || "gen-lang-client-0089224348",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || config.appId || "1:363373404740:web:24a8ef911c68162afb5211",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || config.apiKey || "AIzaSyBXKawxoI-zycH-JmrYmDX64pAobW9-suY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain || "gen-lang-client-0089224348.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket || "gen-lang-client-0089224348.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId || "363373404740",
};

const targetDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || config.firestoreDatabaseId || "ai-studio-kbbappjuin-5d1bdf63-f454-4325-bd12-e80af9246ebc";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, targetDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

let secondaryAuthInstance: ReturnType<typeof getAuth> | null = null;
export function getSecondaryAuth() {
  if (!secondaryAuthInstance) {
    const existing = getApps().find(a => a.name === "SecondaryRegistrationApp");
    const secondaryApp = existing || initializeApp(firebaseConfig, "SecondaryRegistrationApp");
    secondaryAuthInstance = getAuth(secondaryApp);
  }
  return secondaryAuthInstance;
}

export async function createAuthAccountIfPossible(email: string, password?: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !password || password.length < 6) return { success: false, error: 'Mot de passe invalide (6 caractères minimum)' };
  try {
    const secAuth = getSecondaryAuth();
    await createUserWithEmailAndPassword(secAuth, email.trim(), password);
    await signOut(secAuth);
    return { success: true };
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      return { success: true, error: 'email-already-in-use' };
    }
    return { success: false, error: err.message || String(err) };
  }
}

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup };



