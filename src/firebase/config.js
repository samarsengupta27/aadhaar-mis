// src/firebase/config.js
//
// Firebase project initialization.
// Fill these values in from: Firebase Console > Project Settings > General > Your apps > SDK setup.
// Do NOT commit real keys to a public repo. Use a .env file in production (see .env.example).

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * A SECOND, isolated Firebase app instance — used only when a DO creates a
 * new Operator login.
 *
 * Why this exists: there is no Cloud Functions Admin SDK in this project
 * (see README "Why no Cloud Functions" section), so the only way to create
 * a Firebase Auth account for someone else is the client SDK's
 * createUserWithEmailAndPassword — but calling that on the DEFAULT app
 * instance would sign the DO's browser session in as the new operator,
 * kicking the DO out of their own account. Firebase apps initialized with
 * a different name keep entirely separate Auth sessions, so we create the
 * operator's account on this secondary instance, immediately sign that
 * instance back out, and the DO's session on the default `auth` above is
 * never touched. See src/utils/createOperator.js for where this is used.
 */
export function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === 'operator-creation');
  const secondaryApp = existing ?? initializeApp(firebaseConfig, 'operator-creation');
  return getAuth(secondaryApp);
}

export default app;
