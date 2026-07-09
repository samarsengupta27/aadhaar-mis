import { useEffect, useState } from 'react';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useRateCard() {
  const [rateCard, setRateCard] = useState(null);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'rateCard', 'current'), (snap) => {
      setRateCard(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, []);
  return rateCard;
}

export function useCentre(centreId) {
  const [centre, setCentre] = useState(null);
  useEffect(() => {
    if (!centreId) return;
    const unsub = onSnapshot(doc(db, 'centres', centreId), (snap) => {
      setCentre(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return unsub;
  }, [centreId]);
  return centre;
}

export function useEodEntry(centreId, date) {
  const [entry, setEntry] = useState(undefined); // undefined = loading, null = not found
  useEffect(() => {
    if (!centreId || !date) return;
    const docId = `${centreId}_${date}`;
    const unsub = onSnapshot(doc(db, 'eod', docId), (snap) => {
      setEntry(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return unsub;
  }, [centreId, date]);
  return entry;
}

/**
 * Live "today" centre health check for a Division/Region/Circle scope:
 * total active centres vs. how many have submitted an EoD entry for the
 * given date, plus the actual list of non-functioning centres (DO needs
 * to know *who* to call, not just a count).
 *
 * This deliberately queries `eod` + `centres` directly rather than reading
 * `dailyRollups`, because that rollup is written once nightly and would
 * show stale/zero data for "today" until the job runs.
 */
export function useTodaysCentreStatus(scopeField, scopeId, date) {
  const [centres, setCentres] = useState([]);
  const [reportingIds, setReportingIds] = useState(new Set());
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [loadingEod, setLoadingEod] = useState(true);

  useEffect(() => {
    if (!scopeField || !scopeId) return;
    const q = query(
      collection(db, 'centres'),
      where(scopeField, '==', scopeId),
      where('status', '==', 'active')
    );
    const unsub = onSnapshot(q, (snap) => {
      setCentres(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingCentres(false);
    });
    return unsub;
  }, [scopeField, scopeId]);

  useEffect(() => {
    if (!scopeField || !scopeId || !date) return;
    const q = query(
      collection(db, 'eod'),
      where(scopeField, '==', scopeId),
      where('date', '==', date)
    );
    const unsub = onSnapshot(q, (snap) => {
      setReportingIds(new Set(snap.docs.map((d) => d.data().centreId)));
      setLoadingEod(false);
    });
    return unsub;
  }, [scopeField, scopeId, date]);

  const functioning = centres.filter((c) => reportingIds.has(c.id));
  const notFunctioning = centres.filter((c) => !reportingIds.has(c.id));

  return {
    loading: loadingCentres || loadingEod,
    totalCentres: centres.length,
    functioningCount: functioning.length,
    notFunctioningCount: notFunctioning.length,
    notFunctioningCentres: notFunctioning,
  };
}
