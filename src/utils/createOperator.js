// src/utils/createOperator.js
//
// Replaces the old createOperatorLogin Cloud Function. Runs entirely on
// the client, using a secondary Firebase Auth instance (see
// getSecondaryAuth in src/firebase/config.js) so creating the operator's
// account doesn't sign the DO out of their own session.
//
// Security note: this is safe under Firestore Security Rules because the
// rules independently check that whoever WRITES the users/{uid} doc with
// role:"operator" is signed in as a "do" whose divisionId matches the
// centre's divisionId — creating the Auth account alone does nothing
// without a matching, rule-approved Firestore profile doc. See
// firestore.rules for the actual enforcement.

import {
  createUserWithEmailAndPassword,
  signOut as signOutSecondary,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, getSecondaryAuth } from '../firebase/config';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

/**
 * DO calls this to create a new Operator login for a centre in their
 * division. Mirrors the old Cloud Function's behaviour: deactivates any
 * previous operator on that centre first, then creates the new Auth
 * account + Firestore profile + operatorHistory entry.
 *
 * @param {object} params
 * @param {string} params.centreId
 * @param {string} params.name
 * @param {string} params.phone
 * @param {string} params.email
 * @param {string} params.engagementStartDate - "YYYY-MM-DD"
 * @param {object} params.doScope - the calling DO's scope (circleId, regionId, divisionId)
 * @returns {Promise<{uid: string, tempPassword: string}>}
 */
export async function createOperatorLogin({
  centreId,
  name,
  phone,
  email,
  engagementStartDate,
  doScope,
}) {
  if (!centreId || !name || !email || !engagementStartDate) {
    throw new Error('centreId, name, email, and engagementStartDate are required.');
  }

  const centreRef = doc(db, 'centres', centreId);
  const centreSnap = await getDoc(centreRef);
  if (!centreSnap.exists()) throw new Error('Centre not found.');
  const centre = centreSnap.data();

  if (centre.divisionId !== doScope.divisionId) {
    throw new Error('This centre is outside your division.');
  }

  // Deactivate previous operator, if any, before creating the new one.
  if (centre.currentOperatorUid) {
    const prevUid = centre.currentOperatorUid;
    await updateDoc(doc(db, 'users', prevUid), {
      active: false,
      engagementEndDate: engagementStartDate,
    });
    const histQuery = query(
      collection(db, 'centres', centreId, 'operatorHistory'),
      where('uid', '==', prevUid),
      where('endDate', '==', null)
    );
    const histSnap = await getDocs(histQuery);
    for (const h of histSnap.docs) {
      await updateDoc(h.ref, { endDate: engagementStartDate });
    }
  }

  // Create the Auth account on the SECONDARY instance so the DO's own
  // session (on the default `auth` instance) is never touched.
  const tempPassword = generateTempPassword();
  const secondaryAuth = getSecondaryAuth();
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
  const uid = credential.user.uid;

  // Immediately sign the secondary instance back out — we only needed it
  // to mint the account; the DO continues working on the default instance
  // the whole time, undisturbed.
  await signOutSecondary(secondaryAuth);

  await setDoc(doc(db, 'users', uid), {
    uid,
    role: 'operator',
    name,
    phone: phone || '',
    email,
    circleId: centre.circleId,
    regionId: centre.regionId ?? null,
    divisionId: centre.divisionId,
    centreId,
    active: true,
    engagementStartDate,
    engagementEndDate: null,
    createdBy: doScope.uid,
    createdAt: serverTimestamp(),
  });

  await updateDoc(centreRef, { currentOperatorUid: uid, updatedAt: serverTimestamp() });

  await addDoc(collection(db, 'centres', centreId, 'operatorHistory'), {
    uid,
    name,
    startDate: engagementStartDate,
    endDate: null,
  });

  return { uid, tempPassword };
}
