import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRateCard, useCentre, useEodEntry } from '../../hooks/useFirestoreData';
import { TRANSACTION_TYPES, computeRevenuePreview, formatCurrency, formatDate, todayStr } from '../../utils/constants';
import { submitWithRetry } from '../../utils/submitWithRetry';
import { submitEod } from '../../utils/eodActions';
import StatusStamp from '../../components/common/StatusStamp';
import RetryStatusBanner from '../../components/common/RetryStatusBanner';

const EMPTY_COUNTS = {
  newEnrolment: 0,
  mandatoryUpdate: 0,
  demographicUpdate: 0,
  biometricUpdate: 0,
  mbu: 0,
};

export default function EodEntryPage() {
  const { scope, firebaseUser } = useAuth();
  const centreId = scope.centreId;
  const date = todayStr();

  const centre = useCentre(centreId);
  const rateCard = useRateCard();
  const existingEntry = useEodEntry(centreId, date);

  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [amountDeposited, setAmountDeposited] = useState('');
  const [poReceiptNo, setPoReceiptNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retryStatus, setRetryStatus] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const revenue = useMemo(() => {
    if (!rateCard) return null;
    return computeRevenuePreview(counts, rateCard.rates);
  }, [counts, rateCard]);

  const totalCount = TRANSACTION_TYPES.reduce((sum, t) => sum + (Number(counts[t.key]) || 0), 0);

  const handleCountChange = (key, value) => {
    const n = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setCounts((prev) => ({ ...prev, [key]: n }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRetryStatus(null);
    setSubmitting(true);
    try {
      await submitWithRetry(
        () =>
          submitEod({
            date,
            counts,
            cashDeposit: {
              amountDeposited: Number(amountDeposited) || 0,
              poReceiptNo: poReceiptNo || undefined,
            },
            centre,
            submittedByUid: firebaseUser.uid,
          }),
        { onStatusChange: setRetryStatus }
      );
      setSuccess(true);
    } catch (err) {
      // "already exists" means it actually went through on an earlier
      // attempt (or someone else submitted in the meantime) — treat as success.
      if (err.message?.includes('already exists')) {
        setSuccess(true);
      } else {
        setError(err.message || 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
      setRetryStatus(null);
    }
  };

  // Already submitted today — show the stamped record instead of the form.
  if (existingEntry) {
    return <AlreadySubmittedView entry={existingEntry} centre={centre} />;
  }

  if (existingEntry === undefined || !rateCard || !centre) {
    return <div style={{ color: 'var(--ink-soft)' }}>Loading today's form…</div>;
  }

  const variance = revenue ? Math.round((revenue.cashCollectable - (Number(amountDeposited) || 0)) * 100) / 100 : 0;

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Division Wise Aadhaar Transaction Summary</h1>
        <div style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4 }}>
          {centre.name} &middot; <span className="mono">{centre.centreId}</span> &middot; {formatDate(date)}
        </div>
      </header>

      {success ? (
        <SuccessCard date={date} />
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--cream-deep)' }}>
                  <th style={thStyle('left', 48)}>#</th>
                  <th style={thStyle('left')}>Particulars</th>
                  <th style={thStyle('right', 140)}>Count</th>
                  <th style={thStyle('right', 140)}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {TRANSACTION_TYPES.map((t, i) => (
                  <tr key={t.key} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={tdStyle('left')}>{i + 1}</td>
                    <td style={tdStyle('left')}>
                      {t.label}
                      {t.cashInHand && (
                        <span style={{ fontSize: 11, color: 'var(--teal)', marginLeft: 8 }}>cash-in-hand</span>
                      )}
                    </td>
                    <td style={tdStyle('right')}>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        className="input"
                        style={{ textAlign: 'right', width: 100 }}
                        value={counts[t.key] === 0 ? '' : counts[t.key]}
                        placeholder="0"
                        onChange={(e) => handleCountChange(t.key, e.target.value)}
                      />
                    </td>
                    <td style={tdStyle('right')} className="mono">
                      {revenue ? formatCurrency(revenue[t.key]) : '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--ink)', background: 'var(--cream-deep)' }}>
                  <td colSpan={2} style={{ ...tdStyle('left'), fontWeight: 700 }}>
                    Total transactions done on the day
                  </td>
                  <td style={{ ...tdStyle('right'), fontWeight: 700 }} className="mono">{totalCount}</td>
                  <td style={{ ...tdStyle('right'), fontWeight: 700 }} className="mono">
                    {revenue ? formatCurrency(revenue.totalExpectedRevenue) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Cash deposit at mapped Post Office</h3>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 200 }}>
                <div className="label">Mapped PO</div>
                <div style={{ fontWeight: 600 }}>{centre.mappedPOName || '—'}</div>
              </div>
              <div style={{ minWidth: 200 }}>
                <div className="label">Amount collected (cash-in-hand)</div>
                <div className="mono" style={{ fontWeight: 600, fontSize: 16 }}>
                  {revenue ? formatCurrency(revenue.cashCollectable) : '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>New Enrolment + Demographic Update</div>
              </div>
              <div style={{ minWidth: 180 }}>
                <label className="label" htmlFor="amountDeposited">Amount deposited today</label>
                <input
                  id="amountDeposited"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  className="input"
                  value={amountDeposited}
                  onChange={(e) => setAmountDeposited(e.target.value)}
                  required
                />
              </div>
              <div style={{ minWidth: 180 }}>
                <label className="label" htmlFor="poReceiptNo">PO receipt no. (optional)</label>
                <input
                  id="poReceiptNo"
                  type="text"
                  className="input"
                  value={poReceiptNo}
                  onChange={(e) => setPoReceiptNo(e.target.value)}
                />
              </div>
            </div>
            {amountDeposited !== '' && variance !== 0 && (
              <div style={{ marginTop: 14 }}>
                <span className="stamp stamp-flagged">
                  Variance {formatCurrency(Math.abs(variance))} {variance > 0 ? 'short' : 'excess'}
                </span>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 12 }}>
              Mandatory Update, Biometric Update, and MBU revenue is collected centrally by UIDAI — no cash deposit needed for these.
            </div>
          </div>

          {retryStatus && <RetryStatusBanner status={retryStatus} />}
          {error && <div style={{ color: 'var(--flag)', marginBottom: 16, fontSize: 14 }}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? submitButtonLabel(retryStatus) : "Submit today's EoD entry"}
          </button>
        </form>
      )}
    </div>
  );
}

function AlreadySubmittedView({ entry, centre }) {
  return (
    <div>
      <header style={{ marginBottom: 22, display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <h1 style={{ fontSize: 24 }}>Today's EoD entry</h1>
        <StatusStamp status={entry.status} />
      </header>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ color: 'var(--ink-soft)', marginBottom: 16 }}>
          {centre?.name} &middot; {formatDate(entry.date)}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <tbody>
            {TRANSACTION_TYPES.map((t) => (
              <tr key={t.key} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={tdStyle('left')}>{t.label}</td>
                <td style={tdStyle('right')} className="mono">{entry.counts[t.key]}</td>
                <td style={tdStyle('right')} className="mono">{formatCurrency(entry.revenue[t.key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          Total: {entry.revenue.totalTransactions} transactions &middot; {formatCurrency(entry.revenue.totalExpectedRevenue)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Deposited {formatCurrency(entry.cashDeposit.amountDeposited)} of {formatCurrency(entry.cashDeposit.amountCollected)} collected.
          {entry.cashDeposit.variance !== 0 && (
            <span className="stamp stamp-flagged" style={{ marginLeft: 8 }}>
              Variance {formatCurrency(Math.abs(entry.cashDeposit.variance))}
            </span>
          )}
        </div>
        {entry.status === 'pending_approval' && (
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ochre)' }}>
            A correction is awaiting your Division Office's approval.
          </div>
        )}
        <div style={{ marginTop: 18 }}>
          <a href="/eod/corrections" className="btn btn-secondary">Submit a correction</a>
        </div>
      </div>
    </div>
  );
}

function SuccessCard({ date }) {
  return (
    <div className="card" style={{ padding: 28, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Entry submitted</div>
      <div style={{ color: 'var(--ink-soft)' }}>Your EoD entry for {formatDate(date)} has been recorded.</div>
    </div>
  );
}

function submitButtonLabel(retryStatus) {
  if (!retryStatus) return 'Submitting…';
  if (retryStatus.phase === 'waiting_for_network') return 'Waiting for connection…';
  if (retryStatus.phase === 'retrying') return `Retrying… (${retryStatus.attempt}/${retryStatus.maxAttempts})`;
  return 'Submitting…';
}

function thStyle(align, width) {
  return {
    textAlign: align,
    width,
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--ink-soft)',
  };
}
function tdStyle(align) {
  return { textAlign: align, padding: '10px 14px', fontSize: 14 };
}
