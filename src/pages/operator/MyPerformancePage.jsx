import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMonthWithGrowth } from '../../utils/rollups';
import { getOrComputeTarget } from '../../utils/targets';
import { formatCurrency, yyyymm, todayStr } from '../../utils/constants';
import GrowthBadge from '../../components/common/GrowthBadge';

export default function MyPerformancePage() {
  const { scope } = useAuth();
  const [month, setMonth] = useState(yyyymm(todayStr()));
  const [data, setData] = useState(null);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scope.centreId) return;
    let active = true;
    setLoading(true);

    const load = async () => {
      const [monthData, targetData] = await Promise.all([
        getMonthWithGrowth('centreId', scope.centreId, month),
        getOrComputeTarget(scope.centreId, month, scope.circleId),
      ]);

      if (!active) return;
      setData(monthData);
      setTarget(targetData);
      setLoading(false);
    };
    load();

    return () => { active = false; };
  }, [scope.centreId, scope.circleId, month]);

  const achievementPct = target && data ? Math.round((data.totals.totalTransactions / target.monthlyTarget) * 1000) / 10 : null;

  return (
    <div>
      <header style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 24 }}>My performance</h1>
        <input type="month" className="input" style={{ maxWidth: 160 }} value={month} max={yyyymm(todayStr())} onChange={(e) => setMonth(e.target.value)} />
      </header>

      {loading && <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>}

      {!loading && data && (
        <>
          <div className="card" style={{ padding: 22, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Achievement
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }} className="mono">
                  {achievementPct !== null ? `${achievementPct}%` : '—'}
                </div>
              </div>
              {target && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Monthly target</div>
                  <div className="mono" style={{ fontWeight: 600 }}>{target.monthlyTarget} transactions</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{target.workingDays} working days × {target.dailyTarget}/day</div>
                </div>
              )}
            </div>
            {target && (
              <div style={{ background: 'var(--cream-deep)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(achievementPct, 100)}%`,
                    background: achievementPct >= 100 ? 'var(--teal)' : 'var(--ochre)',
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            <Stat label="Transactions this month" value={data.totals.totalTransactions} growthLabel="MoM" growth={data.momTransactionsGrowthPct} />
            <Stat label="Revenue this month" value={formatCurrency(data.totals.totalExpectedRevenue)} growthLabel="MoM" growth={data.momGrowthPct} />
            <Stat label="YoY revenue growth" value={<GrowthBadge label="" pct={data.yoyGrowthPct} />} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Breakdown</h3>
            {[
              ['New Enrolment', data.totals.newEnrolment],
              ['Mandatory Update', data.totals.mandatoryUpdate],
              ['Demographic Update', data.totals.demographicUpdate],
              ['Biometric Update', data.totals.biometricUpdate],
              ['MBU', data.totals.mbu],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{label}</span>
                <span className="mono">{value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, growthLabel, growth }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      {growth !== undefined && <div style={{ marginTop: 6 }}><GrowthBadge label={growthLabel} pct={growth} compact /></div>}
    </div>
  );
}
