import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/constants';
import StatusStamp from '../../components/common/StatusStamp';

export default function EodHistoryPage() {
  const { scope } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scope.centreId) return;
    const q = query(
      collection(db, 'eod'),
      where('centreId', '==', scope.centreId),
      orderBy('date', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [scope.centreId]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 18 }}>My entries</h1>

      {loading && <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>}

      {!loading && entries.length === 0 && (
        <div className="card" style={{ padding: 24, color: 'var(--ink-soft)' }}>
          No entries submitted yet.
        </div>
      )}

      {entries.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-deep)' }}>
                <th style={th('left')}>Date</th>
                <th style={th('right')}>Transactions</th>
                <th style={th('right')}>Revenue</th>
                <th style={th('right')}>Deposited</th>
                <th style={th('left')}>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={td('left')}>{formatDate(e.date)}</td>
                  <td style={td('right')} className="mono">{e.revenue.totalTransactions}</td>
                  <td style={td('right')} className="mono">{formatCurrency(e.revenue.totalExpectedRevenue)}</td>
                  <td style={td('right')} className="mono">
                    {formatCurrency(e.cashDeposit.amountDeposited)}
                    {e.cashDeposit.variance !== 0 && (
                      <span style={{ color: 'var(--flag)', marginLeft: 6, fontSize: 11 }}>
                        Δ{formatCurrency(Math.abs(e.cashDeposit.variance))}
                      </span>
                    )}
                  </td>
                  <td style={td('left')}><StatusStamp status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function th(align) {
  return { textAlign: align, padding: '10px 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' };
}
function td(align) {
  return { textAlign: align, padding: '10px 14px', fontSize: 14 };
}
