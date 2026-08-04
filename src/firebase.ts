import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const config = firebaseConfigJson || {};

const targetDatabaseId = config.firestoreDatabaseId || "ai-studio-kbbappjuin-5d1bdf63-f454-4325-bd12-e80af9246ebc";

const firebaseConfig = {
  projectId: config.projectId || "gen-lang-client-0089224348",
  appId: config.appId || "1:363373404740:web:24a8ef911c68162afb5211",
  apiKey: config.apiKey || "AIzaSyBXKawxoI-zycH-JmrYmDX64pAobW9-suY",
  authDomain: config.authDomain || "gen-lang-client-0089224348.firebaseapp.com",
  storageBucket: config.storageBucket || "gen-lang-client-0089224348.firebasestorage.app",
  messagingSenderId: config.messagingSenderId || "363373404740",
  firestoreDatabaseId: targetDatabaseId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, targetDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup };



