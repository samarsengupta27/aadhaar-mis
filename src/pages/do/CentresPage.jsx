import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useTodaysCentreStatus } from '../../hooks/useFirestoreData';
import { createOperatorLogin } from '../../utils/createOperator';
import { todayStr, formatDate } from '../../utils/constants';

export default function CentresPage() {
  const { scope } = useAuth();
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(null); // centreId being assigned, or null
  const [credentials, setCredentials] = useState(null); // { email, tempPassword } shown once

  const today = todayStr();
  const todaysStatus = useTodaysCentreStatus('divisionId', scope.divisionId, today);
  const notReportingIds = new Set(todaysStatus.notFunctioningCentres.map((c) => c.id));

  useEffect(() => {
    if (!scope.divisionId) return;
    const q = query(collection(db, 'centres'), where('divisionId', '==', scope.divisionId));
    const unsub = onSnapshot(q, (snap) => {
      setCentres(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [scope.divisionId]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 18 }}>Centres &amp; operators</h1>

      {!todaysStatus.loading && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <SummaryPill label="Total centres" value={todaysStatus.totalCentres} />
          <SummaryPill label={`Functioning ${formatDate(today)}`} value={todaysStatus.functioningCount} color="var(--teal)" />
          <SummaryPill
            label="Not functioning"
            value={todaysStatus.notFunctioningCount}
            color={todaysStatus.notFunctioningCount > 0 ? 'var(--flag)' : 'var(--ink)'}
          />
        </div>
      )}

      {credentials && (
        <div className="card" style={{ padding: 18, marginBottom: 20, borderColor: 'var(--ochre)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Operator login created</div>
          <div style={{ fontSize: 14 }}>
            Email: <span className="mono">{credentials.email}</span><br />
            Temporary password: <span className="mono">{credentials.tempPassword}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
            Share this with the operator securely. They will be required to change it on first sign-in.
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setCredentials(null)}>
            Dismiss
          </button>
        </div>
      )}

      {loading && <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>}

      {!loading && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream-deep)' }}>
                <th style={th('left')}>Centre</th>
                <th style={th('left')}>Mapped PO</th>
                <th style={th('left')}>Current operator</th>
                <th style={th('left')}>Status</th>
                <th style={th('left')}>Today</th>
                <th style={th('right')}></th>
              </tr>
            </thead>
            <tbody>
              {centres.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={td('left')}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.id}</div>
                  </td>
                  <td style={td('left')}>{c.mappedPOName || '—'}</td>
                  <td style={td('left')}>{c.currentOperatorUid ? 'Assigned' : '— Unassigned —'}</td>
                  <td style={td('left')}>{c.status}</td>
                  <td style={td('left')}>
                    {c.status !== 'active' ? (
                      <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>—</span>
                    ) : notReportingIds.has(c.id) ? (
                      <span className="stamp stamp-flagged">Not reporting</span>
                    ) : (
                      <span className="stamp stamp-approved">Reported</span>
                    )}
                  </td>
                  <td style={td('right')}>
                    <button className="btn btn-secondary" onClick={() => setShowForm(c.id)}>
                      {c.currentOperatorUid ? 'Reassign operator' : 'Assign operator'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AssignOperatorModal
          centreId={showForm}
          doScope={scope}
          onClose={() => setShowForm(null)}
          onCreated={(creds) => { setCredentials(creds); setShowForm(null); }}
        />
      )}
    </div>
  );
}

function AssignOperatorModal({ centreId, doScope, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [engagementStartDate, setEngagementStartDate] = useState(todayStr());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await createOperatorLogin({ centreId, name, phone, email, engagementStartDate, doScope });
      onCreated({ email, tempPassword: result.tempPassword });
    } catch (err) {
      setError(err.message || 'Could not create login.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(31,45,36,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 420, padding: 26 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Assign operator</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="label" htmlFor="name">Operator name</label>
            <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label" htmlFor="opemail">Email (used as login)</label>
            <input id="opemail" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="label" htmlFor="startDate">Engagement start date</label>
            <input id="startDate" type="date" className="input" required value={engagementStartDate} onChange={(e) => setEngagementStartDate(e.target.value)} />
          </div>
          {error && <div style={{ color: 'var(--flag)', marginBottom: 14, fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create login'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function th(align) {
  return { textAlign: align, padding: '10px 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' };
}
function td(align) {
  return { textAlign: align, padding: '10px 14px', fontSize: 14 };
}

function SummaryPill({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '12px 18px', flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--ink)' }}>
        {value}
      </div>
    </div>
  );
}
