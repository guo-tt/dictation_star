/**
 * Cloud sync layer — wraps Firestore reads/writes.
 * All functions are fire-and-forget from storage.ts (they catch errors silently).
 *
 * Firestore layout:
 *   users/{uid}/data/settings   → { hiddenListIds: string[] }
 *   users/{uid}/data/custom     → { lists: CustomListMeta[], words: CustomWordEntry[] }
 *   users/{uid}/records/{wordId} → WordRecord
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import { db, ensureAuth } from './firebase';
import { WordRecord, CustomListMeta, CustomWordEntry } from '../types';

const LS_RECORDS = 'dictation_v1';
const LS_CUSTOM = 'dictation_custom_v1';
const LS_CUSTOM_LISTS = 'dictation_custom_lists_v1';
const LS_HIDDEN = 'dictation_hidden_lists_v1';

// ── download ──────────────────────────────────────────────────────────────────

/**
 * Pull all user data from Firestore into localStorage.
 * Called once on app start; cloud data wins over local.
 * Returns true if any data was actually downloaded.
 */
export async function downloadFromCloud(): Promise<boolean> {
  try {
    const uid = await ensureAuth();
    let changed = false;

    const [settingsSnap, customSnap, recordsSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid, 'data', 'settings')),
      getDoc(doc(db, 'users', uid, 'data', 'custom')),
      getDocs(collection(db, 'users', uid, 'records')),
    ]);

    if (settingsSnap.exists()) {
      const d = settingsSnap.data();
      localStorage.setItem(LS_HIDDEN, JSON.stringify(d.hiddenListIds ?? []));
      changed = true;
    }

    if (customSnap.exists()) {
      const d = customSnap.data();
      localStorage.setItem(LS_CUSTOM_LISTS, JSON.stringify(d.lists ?? []));
      localStorage.setItem(LS_CUSTOM, JSON.stringify(d.words ?? []));
      changed = true;
    }

    if (!recordsSnap.empty) {
      const records: Record<string, WordRecord> = {};
      recordsSnap.forEach(snap => {
        records[snap.id] = snap.data() as WordRecord;
      });
      localStorage.setItem(LS_RECORDS, JSON.stringify(records));
      changed = true;
    }

    return changed;
  } catch (e) {
    console.warn('[CloudSync] Download failed, using local data:', e);
    return false;
  }
}

// ── upload helpers ─────────────────────────────────────────────────────────────

export async function syncRecord(wordId: string, record: WordRecord): Promise<void> {
  try {
    const uid = await ensureAuth();
    await setDoc(doc(db, 'users', uid, 'records', wordId), record);
  } catch (e) {
    console.warn('[CloudSync] syncRecord failed:', e);
  }
}

export async function syncSettings(hiddenListIds: string[]): Promise<void> {
  try {
    const uid = await ensureAuth();
    await setDoc(
      doc(db, 'users', uid, 'data', 'settings'),
      { hiddenListIds },
      { merge: true },
    );
  } catch (e) {
    console.warn('[CloudSync] syncSettings failed:', e);
  }
}

export async function syncCustomData(
  lists: CustomListMeta[],
  words: CustomWordEntry[],
): Promise<void> {
  try {
    const uid = await ensureAuth();
    await setDoc(doc(db, 'users', uid, 'data', 'custom'), { lists, words });
  } catch (e) {
    console.warn('[CloudSync] syncCustomData failed:', e);
  }
}
