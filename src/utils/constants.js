// src/utils/constants.js
//
// computeRevenuePreview here is now the SOURCE OF TRUTH for revenue
// calculation (not just a "preview") — there is no Cloud Function
// recomputing it server-side in this build. See firestore.rules header
// comment and README "Why no Cloud Functions" for the reasoning.

export const DAILY_TARGET_PER_CENTRE = 40;

export const TRANSACTION_TYPES = [
  { key: 'newEnrolment', label: 'New Enrolment', cashInHand: true },
  { key: 'mandatoryUpdate', label: 'Mandatory Update', cashInHand: false },
  { key: 'demographicUpdate', label: 'Demographic Update', cashInHand: true },
  { key: 'biometricUpdate', label: 'Biometric Update', cashInHand: false },
  { key: 'mbu', label: 'MBU', cashInHand: false },
];

export const ROLES = {
  OPERATOR: 'operator',
  DO: 'do',
  RO: 'ro',
  CO: 'co',
};

export const ROLE_LABELS = {
  operator: 'Operator',
  do: 'Division Office',
  ro: 'Regional Office',
  co: 'Circle Office',
};

export function computeRevenuePreview(counts, rates) {
  const newEnrolment = (counts.newEnrolment || 0) * rates.newEnrolment;
  const mandatoryUpdate = (counts.mandatoryUpdate || 0) * rates.mandatoryUpdate;
  const demographicUpdate = (counts.demographicUpdate || 0) * rates.demographicUpdate;
  const biometricUpdate = (counts.biometricUpdate || 0) * rates.biometricUpdate;
  const mbu = (counts.mbu || 0) * rates.mbu;

  const totalTransactions =
    (counts.newEnrolment || 0) +
    (counts.mandatoryUpdate || 0) +
    (counts.demographicUpdate || 0) +
    (counts.biometricUpdate || 0) +
    (counts.mbu || 0);

  const cashCollectable = newEnrolment + demographicUpdate;
  const centralCollectable = mandatoryUpdate + biometricUpdate + mbu;

  return {
    newEnrolment,
    mandatoryUpdate,
    demographicUpdate,
    biometricUpdate,
    mbu,
    totalTransactions,
    cashCollectable,
    centralCollectable,
    totalExpectedRevenue: cashCollectable + centralCollectable,
  };
}

export function isWorkingDay(dateStr, weeklyOff, holidayDates) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.getDay();
  if (weeklyOff.includes(weekday)) return false;
  if (holidayDates[dateStr]) return false;
  return true;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function yyyymm(dateStr) {
  return dateStr.slice(0, 7);
}
