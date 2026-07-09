import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEodEntry, useRateCard } from '../../hooks/useFirestoreData';
import { TRANSACTION_TYPES, computeRevenuePreview, formatCurrency, formatDate } from '../../utils/constants';
import { submitWithRetry } from '../../utils/submitWithRetry';
import { proposeEodEdit } from '../../utils/eodActions';
import StatusStamp from '../../components/common/StatusStamp';
import RetryStatusBanner from '../../components/common/RetryStatusBanner';

export default function CorrectionsPage() {
  const { scope, firebaseUser } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const entry = useEodEntry(scope.centreId, date);
  const rateCard = useRateCard();

  const [counts, setCounts] = useState(null);
  const [amountDeposited, setAmountDeposited] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retryStatus, setRetryStatus] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // When an entry loads, seed the edit form with its current values once.
  if (entry && counts === null) {
    setCounts({ ...entry.counts });
    setAmountDeposited(String(entry.cashDeposit.amountDeposited));
  }

  const revenue = counts && rateCard ? computeRevenuePreview(counts, rateCard.rates) : null;

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
          proposeEodEdit({
            centreId: scope.centreId,
            date,
            counts,
            cashDeposit: { amountDeposited: Number(amountDeposited) || 0 },
            reason,
            submittedByUid: firebaseUser.uid,
          }),
        { onStatusChange: setRetryStatus }
      );
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Could not submit correction.');
    } finally {
      setRetryStatus(null);
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Submit a correction</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 20, fontSize: 14 }}>
        Corrections take effect only after your Division Office approves them. Your original entry stays on
        record until then.
      </p>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <label className="label" htmlFor="date">Date to correct</label>
        <input
          id="date"
          type="date"
          className="input"
          style={{ maxWidth: 220 }}
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => { setDate(e.target.value); setCounts(null); setSuccess(false); }}
        />
      </div>

      {entry === null && (
        <div className="card" style={{ padding: 20, color: 'var(--ink-soft)' }}>
          No entry found for {formatDate(date)}. You can only correct a date that was already submitted.
        </div>
      )}

      {entry === undefined && <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>}

      {entry && entry.status === 'pending_approval' && (
        <div className="card" style={{ padding: 20 }}>
          <StatusStamp status="pending_approval" />
          <p style={{ marginTop: 12, color: 'var(--ink-soft)' }}>
            A correction for {formatDate(date)} is already awaiting approval. Please wait for your Division
            Office to decide before submitting another.
          </p>
        </div>
      )}

      {entry && entry.status !== 'pending_approval' && counts && (
        success ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Correction submitted</div>
            <div style={{ color: 'var(--ink-soft)' }}>Awaiting Division Office approval.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream-deep)' }}>
                    <th style={thStyle('left')}>Particulars</th>
                    <th style={thStyle('right', 120)}>Original</th>
                    <th style={thStyle('right', 140)}>Corrected</th>
                  </tr>
                </thead>
                <tbody>
                  {TRANSACTION_TYPES.map((t) => (
                    <tr key={t.key} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={tdStyle('left')}>{t.label}</td>
                      <td style={tdStyle('right')} className="mono">{entry.counts[t.key]}</td>
                      <td style={tdStyle('right')}>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          style={{ textAlign: 'right', width: 100 }}
                          value={counts[t.key] === 0 ? '' : counts[t.key]}
                          placeholder="0"
                          onChange={(e) => handleCountChange(t.key, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <label className="label" htmlFor="amountDeposited">Corrected amount deposited</label>
              <input
                id="amountDeposited"
                type="number"
                min="0"
                className="input"
                style={{ maxWidth: 220, marginBottom: 14 }}
                value={amountDeposited}
                onChange={(e) => setAmountDeposited(e.target.value)}
              />
              {revenue && (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  New cash collectable total: <span className="mono">{formatCurrency(revenue.cashCollectable)}</span>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <label className="label" htmlFor="reason">Reason for correction</label>
              <textarea
                id="reason"
                className="input"
                rows={3}
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Miscounted biometric updates, corrected after reconciling register."
              />
            </div>

            {retryStatus && <RetryStatusBanner status={retryStatus} />}
            {error && <div style={{ color: 'var(--flag)', marginBottom: 16 }}>{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? submitButtonLabel(retryStatus) : 'Submit correction for approval'}
            </button>
          </form>
        )
      )}
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
  return { textAlign: align, width, padding: '10px 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' };
}
function tdStyle(align) {
  return { textAlign: align, padding: '10px 14px', fontSize: 14 };
}
