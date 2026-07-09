import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getMonthWithGrowth, getQuarterWithGrowth } from '../../utils/rollups';
import { useTodaysCentreStatus } from '../../hooks/useFirestoreData';
import { formatCurrency, formatDate, yyyymm, todayStr } from '../../utils/constants';
import GrowthBadge from '../../components/common/GrowthBadge';

const SCOPE_FIELD = { division: 'divisionId', region: 'regionId', circle: 'circleId' };
const SCOPE_LABEL = { division: 'Division', region: 'Region', circle: 'Circle' };

export default function MisReportPage({ scopeType, scopeId, title }) {
  const [month, setMonth] = useState(yyyymm(todayStr()));
  const [monthData, setMonthData] = useState(null);
  const [quarterData, setQuarterData] = useState(null);
  const [centreCount, setCentreCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const scopeField = SCOPE_FIELD[scopeType];
  const today = todayStr();
  const todaysStatus = useTodaysCentreStatus(scopeField, scopeId, today);

  useEffect(() => {
    if (!scopeId) return;
    let active = true;
    setLoading(true);
    const [year, m] = month.split('-').map(Number);
    const quarter = Math.floor((m - 1) / 3) + 1;

    Promise.all([
      getMonthWithGrowth(scopeField, scopeId, month),
      getQuarterWithGrowth(scopeField, scopeId, year, quarter),
    ]).then(([md, qd]) => {
      if (!active) return;
      setMonthData(md);
      setQuarterData(qd);
      setLoading(false);
    });

    return () => { active = false; };
  }, [scopeField, scopeId, month]);

  useEffect(() => {
    if (!scopeId) return;
    const q = query(collection(db, 'centres'), where(scopeField, '==', scopeId), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => setCentreCount(snap.size));
    return unsub;
  }, [scopeField, scopeId]);

  return (
    <div>
      <header style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={{ fontSize: 24 }}>{title}</h1>
          <div style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4 }}>
            {SCOPE_LABEL[scopeType]} &middot; {scopeId} {centreCount !== null && `· ${centreCount} active centres`}
          </div>
        </div>
        <input
          type="month"
          className="input"
          style={{ maxWidth: 160 }}
          value={month}
          max={yyyymm(todayStr())}
          onChange={(e) => setMonth(e.target.value)}
        />
      </header>

      <TodaysCentreStatusCard status={todaysStatus} date={today} />

      {loading && <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>}

      {!loading && monthData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total transactions" value={monthData.totals.totalTransactions} mom={monthData.momTransactionsGrowthPct} yoy={monthData.yoyTransactionsGrowthPct} />
            <StatCard label="Total revenue" value={formatCurrency(monthData.totals.totalExpectedRevenue)} mom={monthData.momGrowthPct} yoy={monthData.yoyGrowthPct} />
            <StatCard label="Cash collected" value={formatCurrency(monthData.totals.cashCollectable)} />
            <StatCard label="Deposit variance" value={formatCurrency(monthData.totals.varianceTotal)} flag={monthData.totals.varianceTotal !== 0} />
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>This quarter</h3>
            <div style={{ display: 'flex', gap: 32, alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }} className="mono">
                  {formatCurrency(quarterData.totals.totalExpectedRevenue)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Q{quarterData.quarter} {quarterData.year} revenue</div>
              </div>
              <GrowthBadge label="QoQ" pct={quarterData.qoqGrowthPct} />
              <GrowthBadge label="YoY" pct={quarterData.yoyGrowthPct} />
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Transaction breakdown — {month}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['New Enrolment', monthData.totals.newEnrolment],
                  ['Mandatory Update', monthData.totals.mandatoryUpdate],
                  ['Demographic Update', monthData.totals.demographicUpdate],
                  ['Biometric Update', monthData.totals.biometricUpdate],
                  ['MBU', monthData.totals.mbu],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 0' }}>{label}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }} className="mono">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function TodaysCentreStatusCard({ status, date }) {
  if (status.loading) {
    return (
      <div className="card" style={{ padding: 16, marginBottom: 20, color: 'var(--ink-soft)' }}>
        Loading today's centre status…
      </div>
    );
  }

  const { totalCentres, functioningCount, notFunctioningCount, notFunctioningCentres } = status;
  const allGood = notFunctioningCount === 0;

  return (
    <div
      className="card"
      style={{
        padding: 20,
        marginBottom: 24,
        borderColor: allGood ? 'var(--line)' : 'var(--flag)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15 }}>Centre status — {formatDate(date)}</h3>
        {!allGood && <span className="stamp stamp-flagged">{notFunctioningCount} not reporting</span>}
        {allGood && totalCentres > 0 && <span className="stamp stamp-approved">All centres reporting</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: notFunctioningCount > 0 ? 16 : 0 }}>
        <MiniStat label="Total centres" value={totalCentres} />
        <MiniStat label="Functioning today" value={functioningCount} color="var(--teal)" />
        <MiniStat label="Not functioning today" value={notFunctioningCount} color={notFunctioningCount > 0 ? 'var(--flag)' : 'var(--ink)'} />
      </div>

      {notFunctioningCount > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Centres yet to report
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {notFunctioningCentres.map((c) => (
              <span
                key={c.id}
                className="mono"
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'var(--flag-soft)',
                  color: 'var(--flag)',
                }}
                title={c.name}
              >
                {c.id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--ink)' }}>
        {value}
      </div>
    </div>
  );
}

function StatCard({ label, value, mom, yoy, flag }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: flag ? 'var(--flag)' : 'var(--ink)' }}>
        {value}
      </div>
      {(mom !== undefined || yoy !== undefined) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {mom !== undefined && <GrowthBadge label="MoM" pct={mom} compact />}
          {yoy !== undefined && <GrowthBadge label="YoY" pct={yoy} compact />}
        </div>
      )}
    </div>
  );
}
