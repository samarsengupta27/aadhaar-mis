// src/utils/rollups.js
//
// Client-side aggregation helpers for MIS views. Lower-volume queries
// (single centre, single division for a month) are aggregated here on
// the fly from raw `eod` docs. Higher-volume queries (region/circle, full
// year) should prefer the pre-aggregated `dailyRollups` collection written
// nightly by the aggregateDaily Cloud Function — see DATA_MODEL.md.

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const ZERO = {
  newEnrolment: 0,
  mandatoryUpdate: 0,
  demographicUpdate: 0,
  biometricUpdate: 0,
  mbu: 0,
  totalTransactions: 0,
  totalExpectedRevenue: 0,
  cashCollectable: 0,
  centralCollectable: 0,
  amountDeposited: 0,
  varianceTotal: 0,
};

/** Fetch raw eod docs for a scope field + date range. */
async function fetchEodRange(scopeField, scopeId, startDate, endDate) {
  const q = query(
    collection(db, 'eod'),
    where(scopeField, '==', scopeId),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/** Sum a list of eod docs into one totals object. */
export function sumEntries(entries) {
  const totals = { ...ZERO };
  for (const e of entries) {
    totals.newEnrolment += e.counts.newEnrolment;
    totals.mandatoryUpdate += e.counts.mandatoryUpdate;
    totals.demographicUpdate += e.counts.demographicUpdate;
    totals.biometricUpdate += e.counts.biometricUpdate;
    totals.mbu += e.counts.mbu;
    totals.totalTransactions += e.revenue.totalTransactions;
    totals.totalExpectedRevenue += e.revenue.totalExpectedRevenue;
    totals.cashCollectable += e.revenue.cashCollectable;
    totals.centralCollectable += e.revenue.centralCollectable;
    totals.amountDeposited += e.cashDeposit?.amountDeposited ?? 0;
    totals.varianceTotal += e.cashDeposit?.variance ?? 0;
  }
  return totals;
}

function monthRange(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  const start = `${yyyymm}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yyyymm}-${String(lastDay).padStart(2, '0')}`;
  return [start, end];
}

function shiftMonth(yyyymm, delta) {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function quarterMonths(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map((i) => `${year}-${String(startMonth + i).padStart(2, '0')}`);
}

/**
 * Fetch totals for the given month plus the comparison periods needed for
 * MoM (previous month) and YoY (same month, previous year) growth.
 */
export async function getMonthWithGrowth(scopeField, scopeId, yyyymm) {
  const prevMonth = shiftMonth(yyyymm, -1);
  const prevYearSameMonth = shiftMonth(yyyymm, -12);

  const [thisRange, prevRange, prevYearRange] = [
    monthRange(yyyymm),
    monthRange(prevMonth),
    monthRange(prevYearSameMonth),
  ];

  const [current, mom, yoy] = await Promise.all([
    fetchEodRange(scopeField, scopeId, ...thisRange),
    fetchEodRange(scopeField, scopeId, ...prevRange),
    fetchEodRange(scopeField, scopeId, ...prevYearRange),
  ]);

  const currentTotals = sumEntries(current);
  const momTotals = sumEntries(mom);
  const yoyTotals = sumEntries(yoy);

  return {
    yyyymm,
    totals: currentTotals,
    momGrowthPct: growthPct(currentTotals.totalExpectedRevenue, momTotals.totalExpectedRevenue),
    yoyGrowthPct: growthPct(currentTotals.totalExpectedRevenue, yoyTotals.totalExpectedRevenue),
    momTransactionsGrowthPct: growthPct(currentTotals.totalTransactions, momTotals.totalTransactions),
    yoyTransactionsGrowthPct: growthPct(currentTotals.totalTransactions, yoyTotals.totalTransactions),
  };
}

/** Quarter totals + QoQ (previous quarter) and YoY (same quarter, prior year) growth. */
export async function getQuarterWithGrowth(scopeField, scopeId, year, quarter) {
  const months = quarterMonths(year, quarter);
  const [start] = monthRange(months[0]);
  const [, end] = monthRange(months[2]);

  const prevQuarter = quarter === 1 ? 4 : quarter - 1;
  const prevQuarterYear = quarter === 1 ? year - 1 : year;
  const prevMonths = quarterMonths(prevQuarterYear, prevQuarter);
  const [prevStart] = monthRange(prevMonths[0]);
  const [, prevEnd] = monthRange(prevMonths[2]);

  const prevYearMonths = quarterMonths(year - 1, quarter);
  const [prevYearStart] = monthRange(prevYearMonths[0]);
  const [, prevYearEnd] = monthRange(prevYearMonths[2]);

  const [current, qoq, yoy] = await Promise.all([
    fetchEodRange(scopeField, scopeId, start, end),
    fetchEodRange(scopeField, scopeId, prevStart, prevEnd),
    fetchEodRange(scopeField, scopeId, prevYearStart, prevYearEnd),
  ]);

  const currentTotals = sumEntries(current);
  const qoqTotals = sumEntries(qoq);
  const yoyTotals = sumEntries(yoy);

  return {
    year,
    quarter,
    totals: currentTotals,
    qoqGrowthPct: growthPct(currentTotals.totalExpectedRevenue, qoqTotals.totalExpectedRevenue),
    yoyGrowthPct: growthPct(currentTotals.totalExpectedRevenue, yoyTotals.totalExpectedRevenue),
  };
}

function growthPct(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export { monthRange, shiftMonth, quarterMonths };
