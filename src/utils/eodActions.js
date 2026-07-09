// src/utils/eodActions.js
//
// Replaces the old submitEod / proposeEodEdit / decideEodEdit Cloud
// Functions. Revenue is computed client-side (see computeRevenuePreview in
// constants.js) and written directly to Firestore — Security Rules
// validate shape and ownership, not the arithmetic. See the note at the
// top of firestore.rules for the reasoning behind that tradeoff.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { computeRevenuePreview } from './constants';

/**
 * Operator submits a brand-new EoD entry for today (or a given date).
 * Throws if an entry already exists for that centre+date — callers should
 * use proposeEodEdit instead for corrections.
 */
export async function submitEod({ date, counts, cashDeposit, centre, submittedByUid }) {
  const docId = `${centre.centreId}_${date}`;
  const eodRef = doc(db, 'eod', docId);

  const existing = await getDoc(eodRef);
  if (existing.exists()) {
    throw new Error('An entry for this centre and date already exists. Use the correction flow instead.');
  }

  const rateSnap = await getDoc(doc(db, 'rateCard', 'current'));
  if (!rateSnap.exists()) throw new Error('Rate card not configured.');
  const rates = rateSnap.data().rates;

  const revenue = computeRevenuePreview(counts, rates);
  const amountDeposited = cashDeposit?.amountDeposited ?? 0;
  const variance = Math.round((revenue.cashCollectable - amountDeposited) * 100) / 100;
  const now = serverTimestamp();

  await setDoc(eodRef, {
    centreId: centre.centreId,
    date,
    divisionId: centre.divisionId,
    regionId: centre.regionId ?? null,
    circleId: centre.circleId,
    submittedByUid,
    submittedAt: now,
    counts,
    revenue,
    cashDeposit: {
      amountCollected: revenue.cashCollectable,
      amountDeposited,
      depositDate: date,
      poReceiptNo: cashDeposit?.poReceiptNo || null,
      variance,
    },
    status: 'submitted',
    pendingEdit: null,
    createdAt: now,
    updatedAt: now,
  });

  await addDoc(collection(db, 'eod', docId, 'auditLog'), {
    action: 'edit_submitted',
    byUid: submittedByUid,
    byRole: 'operator',
    at: now,
    before: null,
    after: { counts, cashDeposit: { amountDeposited } },
    note: 'Initial EoD submission',
  });

  return { docId };
}

/**
 * Operator proposes a correction to an existing EoD entry. Does not take
 * effect immediately — sets pendingEdit + status=pending_approval; the
 * live counts/revenue/cashDeposit are untouched until a DO approves
 * (see decideEodEdit below).
 */
export async function proposeEodEdit({ centreId, date, counts, cashDeposit, reason, submittedByUid }) {
  if (!reason || reason.trim().length < 3) {
    throw new Error('A short reason for the correction is required.');
  }

  const docId = `${centreId}_${date}`;
  const eodRef = doc(db, 'eod', docId);
  const snap = await getDoc(eodRef);
  if (!snap.exists()) {
    throw new Error('No existing entry for this date — submit a new EoD instead.');
  }
  const existing = snap.data();

  const rateSnap = await getDoc(doc(db, 'rateCard', 'current'));
  const rates = rateSnap.data().rates;
  const proposedRevenue = computeRevenuePreview(counts, rates);
  const amountDeposited = cashDeposit?.amountDeposited ?? 0;
  const variance = Math.round((proposedRevenue.cashCollectable - amountDeposited) * 100) / 100;
  const now = serverTimestamp();

  await updateDoc(eodRef, {
    status: 'pending_approval',
    pendingEdit: {
      counts,
      revenue: proposedRevenue,
      cashDeposit: {
        amountCollected: proposedRevenue.cashCollectable,
        amountDeposited,
        depositDate: date,
        poReceiptNo: cashDeposit?.poReceiptNo || null,
        variance,
      },
      reason,
      submittedAt: now,
      submittedByUid,
    },
    updatedAt: now,
  });

  await addDoc(collection(db, 'eod', docId, 'auditLog'), {
    action: 'edit_submitted',
    byUid: submittedByUid,
    byRole: 'operator',
    at: now,
    before: { counts: existing.counts, cashDeposit: existing.cashDeposit },
    after: { counts, cashDeposit },
    note: reason,
  });
}

/**
 * DO approves or rejects a pending edit. On approval, pendingEdit becomes
 * the live counts/revenue/cashDeposit. On rejection, pendingEdit is
 * cleared and the original values stand.
 */
export async function decideEodEdit({ centreId, date, decision, note, decidedByUid }) {
  const docId = `${centreId}_${date}`;
  const eodRef = doc(db, 'eod', docId);
  const snap = await getDoc(eodRef);
  if (!snap.exists()) throw new Error('Entry not found.');
  const existing = snap.data();

  if (existing.status !== 'pending_approval' || !existing.pendingEdit) {
    throw new Error('No pending edit awaiting approval for this entry.');
  }

  const now = serverTimestamp();

  if (decision === 'approve') {
    const pe = existing.pendingEdit;
    await updateDoc(eodRef, {
      counts: pe.counts,
      revenue: pe.revenue,
      cashDeposit: pe.cashDeposit,
      status: 'approved',
      pendingEdit: null,
      updatedAt: now,
    });
    await addDoc(collection(db, 'eod', docId, 'auditLog'), {
      action: 'edit_approved',
      byUid: decidedByUid,
      byRole: 'do',
      at: now,
      before: { counts: existing.counts, cashDeposit: existing.cashDeposit },
      after: { counts: pe.counts, cashDeposit: pe.cashDeposit },
      note: note || '',
    });
  } else {
    await updateDoc(eodRef, {
      status: 'submitted',
      pendingEdit: null,
      updatedAt: now,
    });
    await addDoc(collection(db, 'eod', docId, 'auditLog'), {
      action: 'edit_rejected',
      byUid: decidedByUid,
      byRole: 'do',
      at: now,
      before: existing.pendingEdit,
      after: null,
      note: note || '',
    });
  }
}
