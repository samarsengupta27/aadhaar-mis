import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { decideEodEdit } from '../../utils/eodActions';
import { TRANSACTION_TYPES, formatCurrency, formatDate } from '../../utils/constants';

export default function ApprovalsPage() {
  const { scope, firebaseUser } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!scope.divisionId) return;
    const q = query(
      collection(db, 'eod'),
      where('divisionId', '==', scope.divisionId),
      where('status', '==', 'pending_approval')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [scope.divisionId]);

  const decide = async (entry, decision) => {
    setActing(entry.id);
    try {
      await decideEodEdit({
        centreId: entry.centreId,
        date: entry.date,
        decision,
        note,
        decidedByUid: firebaseUser.uid,
      });
      setNote('');
    } catch (err) {
      alert(err.message || 'Action failed.');
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 18 }}>Pending approvals</h1>

      {loading && <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>}

      {!loading && pending.length === 0 && (
        <div className="card" style={{ padding: 24, color: 'var(--ink-soft)' }}>
          No corrections awaiting approval right now.
        </div>
      )}

      {pending.map((entry) => (
        <div key={entry.id} className="card" style={{ padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{entry.centreId}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{formatDate(entry.date)}</div>
            </div>
            <span className="stamp stamp-pending">Pending</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
            <thead>
              <tr style={{ background: 'var(--cream-deep)' }}>
                <th style={th('left')}>Particulars</th>
                <th style={th('right')}>Original</th>
                <th style={th('right')}>Proposed</th>
              </tr>
            </thead>
            <tbody>
              {TRANSACTION_TYPES.map((t) => {
                const changed = entry.counts[t.key] !== entry.pendingEdit.counts[t.key];
                return (
                  <tr key={t.key} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={td('left')}>{t.label}</td>
                    <td style={td('right')} className="mono">{entry.counts[t.key]}</td>
                    <td
                      style={{ ...td('right'), color: changed ? 'var(--maroon)' : 'inherit', fontWeight: changed ? 700 : 400 }}
                      className="mono"
                    >
                      {entry.pendingEdit.counts[t.key]}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '1px solid var(--line)' }}>
                <td style={td('left')}>Amount deposited</td>
                <td style={td('right')} className="mono">{formatCurrency(entry.cashDeposit.amountDeposited)}</td>
                <td style={td('right')} className="mono">{formatCurrency(entry.pendingEdit.cashDeposit.amountDeposited)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: 13, marginBottom: 14 }}>
            <span style={{ color: 'var(--ink-soft)' }}>Operator's reason: </span>
            {entry.pendingEdit.reason}
          </div>

          <input
            type="text"
            className="input"
            placeholder="Optional note (visible in audit trail)"
            value={acting === entry.id ? note : ''}
            onChange={(e) => setNote(e.target.value)}
            onFocus={() => setActing(entry.id)}
            style={{ marginBottom: 12 }}
          />

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" disabled={acting === entry.id && false} onClick={() => decide(entry, 'approve')}>
              Approve
            </button>
            <button className="btn btn-secondary" onClick={() => decide(entry, 'reject')}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function th(align) {
  return { textAlign: align, padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' };
}
function td(align) {
  return { textAlign: align, padding: '8px 12px', fontSize: 14 };
}
