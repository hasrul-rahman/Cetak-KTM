import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  onSnapshot,
  getDoc,
  type Unsubscribe 
} from 'firebase/firestore';
import { Student, KtmTemplateConfig, AcademicConfig } from '../types';
import firebaseConfigData from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfigData) : getApp();

// Google Workspace Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// In-memory access token cache (Workspace Integration requirement)
let cachedAccessToken: string | null = null;

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGoogleAccessToken = (token: string | null): void => {
  cachedAccessToken = token;
};

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore (support named database if configured)
const dbId = (firebaseConfigData as any).firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

// Authentication Helpers
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    cachedAccessToken = credential.accessToken;
  }
  return { ...result, accessToken: cachedAccessToken };
}

export async function loginWithEmail(email: string, pass: string) {
  return await signInWithEmailAndPassword(auth, email, pass);
}

export async function registerWithEmail(email: string, pass: string, displayName?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  return cred;
}

export async function logOut() {
  cachedAccessToken = null;
  return await signOut(auth);
}

// Firestore Realtime Collections & Document References
const STUDENTS_COLLECTION = 'students';
const SETTINGS_DOC = 'settings/ktm_template';
const ACADEMIC_DOC = 'settings/academic_meta';

/**
 * Subscribe to students changes in real-time from Firestore.
 */
export function subscribeStudents(
  onUpdate: (students: Student[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const studentsCol = collection(db, STUDENTS_COLLECTION);
  return onSnapshot(
    studentsCol,
    (snapshot) => {
      const list: Student[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Student, 'id'>) });
      });
      // Sort by creation time descending or NIM
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore students sync notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Upsert a single student to Firestore
 */
export async function syncStudentToFirestore(student: Student): Promise<void> {
  const docRef = doc(db, STUDENTS_COLLECTION, student.id);
  await setDoc(docRef, { ...student, updatedAt: Date.now() }, { merge: true });
}

/**
 * Delete a student from Firestore
 */
export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  const docRef = doc(db, STUDENTS_COLLECTION, studentId);
  await deleteDoc(docRef);
}

/**
 * Batch upload/sync multiple students to Firestore (chunked to 400 for safety)
 */
export async function batchSyncStudentsToFirestore(students: Student[]): Promise<void> {
  if (!students.length) return;
  const chunkSize = 400;
  for (let i = 0; i < students.length; i += chunkSize) {
    const chunk = students.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((std) => {
      const docRef = doc(db, STUDENTS_COLLECTION, std.id);
      batch.set(docRef, { ...std, updatedAt: Date.now() }, { merge: true });
    });
    await batch.commit();
  }
}

/**
 * Subscribe to template configuration from Firestore
 */
export function subscribeTemplateConfig(
  onUpdate: (config: KtmTemplateConfig) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const [col, docId] = SETTINGS_DOC.split('/');
  const docRef = doc(db, col, docId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as KtmTemplateConfig);
      }
    },
    (err) => {
      console.warn('Firestore settings sync notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save template configuration to Firestore
 */
export async function saveTemplateConfigToFirestore(config: KtmTemplateConfig): Promise<void> {
  const [col, docId] = SETTINGS_DOC.split('/');
  const docRef = doc(db, col, docId);
  await setDoc(docRef, { ...config, updatedAt: Date.now() }, { merge: true });
}

/**
 * Subscribe to academic configuration (prodi and faculties) from Firestore
 */
export function subscribeAcademicConfig(
  onUpdate: (config: AcademicConfig) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const [col, docId] = ACADEMIC_DOC.split('/');
  const docRef = doc(db, col, docId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as AcademicConfig);
      }
    },
    (err) => {
      console.warn('Firestore academic config sync notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save academic configuration (prodi and faculties) to Firestore
 */
export async function saveAcademicConfigToFirestore(config: AcademicConfig): Promise<void> {
  const [col, docId] = ACADEMIC_DOC.split('/');
  const docRef = doc(db, col, docId);
  await setDoc(docRef, { ...config, updatedAt: Date.now() }, { merge: true });
}

/**
 * Initialize Firestore data if currently empty
 */
export async function seedFirestoreIfEmpty(
  initialStudents: Student[],
  initialConfig: KtmTemplateConfig
): Promise<boolean> {
  try {
    const studentsCol = collection(db, STUDENTS_COLLECTION);
    const snap = await getDocs(studentsCol);
    if (snap.empty && initialStudents.length > 0) {
      const batch = writeBatch(db);
      initialStudents.forEach((std) => {
        const docRef = doc(db, STUDENTS_COLLECTION, std.id);
        batch.set(docRef, { ...std });
      });
      await batch.commit();

      const [col, docId] = SETTINGS_DOC.split('/');
      const settingsRef = doc(db, col, docId);
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, { ...initialConfig, updatedAt: Date.now() });
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Initial seeding bypassed or requires auth:', err);
    return false;
  }
}
