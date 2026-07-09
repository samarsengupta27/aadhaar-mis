// src/utils/targets.js
//
// Replaces the old recomputeTargetsForMonth / onHolidayCalendarChange
// Cloud Functions. Monthly target = dailyTarget (40/working-day, per
// centre) x working days in that month, where a working day excludes the
// weekly off (Sunday by default) and any date in the CO's holiday
// calendar. Computed on-demand client-side and cached into
// targets/{centreId}_{yyyymm} so repeat views don't recompute.

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { isWorkingDay } from './constants';

function countWorkingDaysInMonth(yyyymm, weeklyOff, holidayDates) {
  const [year, month] = yyyymm.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isWorkingDay(dateStr, weeklyOff, holidayDates)) count++;
  }
  return count;
}

/**
 * Returns the cached targets/{centreId}_{yyyymm} doc if it exists, or
 * computes it fresh from the holiday calendar + centre's dailyTarget,
 * writes it for next time, and returns it.
 *
 * Any signed-in user can trigger this (it's just a read-mostly cache
 * compute, not a privileged action) — see firestore.rules targets match,
 * which restricts WRITES to co/do but allows reads for everyone, so this
 * function only writes the cache when called by a co/do; an operator
 * calling it will get a correct in-memory result but won't be able to
 * persist the cache (the write will be rejected by rules) — that's fine,
 * it just means the next viewer recomputes too, at negligible cost.
 */
export async function getOrComputeTarget(centreId, yyyymm, circleId) {
  const targetRef = doc(db, 'targets', `${centreId}_${yyyymm}`);
  const cached = await getDoc(targetRef);
  if (cached.exists()) return cached.data();

  const [centreSnap, holidaySnap] = await Promise.all([
    getDoc(doc(db, 'centres', centreId)),
    getDoc(doc(db, 'holidays', circleId)),
  ]);

  const dailyTarget = centreSnap.exists() ? centreSnap.data().dailyTarget ?? 40 : 40;
  const weeklyOff = holidaySnap.exists() ? holidaySnap.data().weeklyOff ?? [0] : [0];
  const holidayDates = holidaySnap.exists() ? holidaySnap.data().dates ?? {} : {};

  const workingDays = countWorkingDaysInMonth(yyyymm, weeklyOff, holidayDates);
  const computed = {
    centreId,
    yyyymm,
    workingDays,
    dailyTarget,
    monthlyTarget: workingDays * dailyTarget,
    computedAt: serverTimestamp(),
  };

  // Best-effort cache write — fine if rules reject this for non-co/do
  // callers (e.g. an operator viewing their own performance page); the
  // computed value above is still returned and used either way.
  try {
    await setDoc(targetRef, computed);
  } catch {
    // Not permitted to write the cache from this role — ignore, the
    // in-memory computed value is still correct and gets returned below.
  }

  return computed;
}
