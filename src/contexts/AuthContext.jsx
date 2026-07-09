import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// NOTE on architecture: role and scope (circleId/regionId/divisionId/
// centreId) are read directly from the users/{uid} Firestore profile doc,
// not from Firebase Auth custom claims. Custom claims require a Cloud
// Function (onUserWrite) to set them server-side, which this project
// deliberately does not use — see README "Why no Cloud Functions" for why.
// Firestore Security Rules mirror this: they read the same users/{uid}
// doc via get() rather than checking request.auth.token.role. The
// tradeoff is one extra document read on rule evaluation versus a free
// token claim, which is negligible at this app's scale.

const AuthContext = createContext(null);
const DEV_MODE = true;

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // users/{uid} doc — source of truth for role/scope
  const [loading, setLoading] = useState(true);
  if (DEV_MODE) {
  const value = {
    firebaseUser: { uid: "dev-user" },
    profile: {
      role: "co",
      circleId: "ASM",
      regionId: null,
      divisionId: null,
      centreId: null,
    },
    role: "co",
    scope: {
      uid: "dev-user",
      circleId: "ASM",
      regionId: null,
      divisionId: null,
      centreId: null,
    },
    loading: false,
    login: async () => {},
    logout: async () => {},
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setProfile(null);
        setLoading(false);
      }
      // loading stays true until the profile listener below resolves,
      // for a signed-in user — see next effect.
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const ref = doc(db, 'users', firebaseUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [firebaseUser]);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => fbSignOut(auth);

  const value = {
    firebaseUser,
    profile,
    role: profile?.role ?? null,
    scope: {
      uid: firebaseUser?.uid ?? null,
      circleId: profile?.circleId ?? null,
      regionId: profile?.regionId ?? null,
      divisionId: profile?.divisionId ?? null,
      centreId: profile?.centreId ?? null,
    },
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
