import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAe2oOJpjHoCkn77h_7vQm34M6uSFpbumI',
  authDomain: 'dictation-star.firebaseapp.com',
  projectId: 'dictation-star',
  storageBucket: 'dictation-star.firebasestorage.app',
  messagingSenderId: '125879753782',
  appId: '1:125879753782:web:945d7a7f5c034ded6f0c97',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  _uidCache = result.user.uid;
  return result.user;
}

export async function signOut(): Promise<void> {
  _uidCache = null;
  await firebaseSignOut(auth);
}

let _uidCache: string | null = null;

/** Returns the current user's UID. Rejects if not logged in. */
export async function ensureAuth(): Promise<string> {
  if (_uidCache) return _uidCache;
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      if (user) {
        _uidCache = user.uid;
        resolve(user.uid);
      } else {
        reject(new Error('Not authenticated'));
      }
    });
  });
}

/** Subscribe to auth state changes. Returns unsubscribe fn. */
export function onAuthChanged(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, user => {
    _uidCache = user?.uid ?? null;
    cb(user);
  });
}
