import { useState } from 'react';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useRateCard } from '../../hooks/useFirestoreData';
import { todayStr } from '../../utils/constants';

const FIELDS = [
  { key: 'newEnrolment', label: 'New Enrolment' },
  { key: 'mandatoryUpdate', label: 'Mandatory Update' },
  { key: 'demographicUpdate', label: 'Demographic Update' },
  { key: 'biometricUpdate', label: 'Biometric Update' },
  { key: 'mbu', label: 'MBU' },
];

export default function RateCardPage() {
  const { firebaseUser } = useAuth();
  const rateCard = useRateCard();
  const [rates, setRates] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (rateCard && !rates) {
    setRates({ ...rateCard.rates });
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const effectiveFrom = todayStr();

    // Archive current rate card before overwriting.
    if (rateCard) {
      await setDoc(doc(collection(db, 'rateCard', 'current', 'history'), rateCard.effectiveFrom), rateCard);
    }

    await setDoc(doc(db, 'rateCard', 'current'), {
      effectiveFrom,
      rates,
      gstNote: rateCard?.gstNote || 'Rates inclusive of GST.',
      updatedBy: firebaseUser.uid,
      updatedAt: serverTimestamp(),
    });

    setSaving(false);
    setSaved(true);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Rate card</h1>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20 }}>
        Circle-wide rates used to auto-calculate revenue on every EoD entry. Changing a rate only affects
        entries submitted after the change — past entries keep the rate that was in force on that date.
      </p>

      {!rates && <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>}

      {rates && (
        <form onSubmit={handleSave}>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--cream-deep)' }}>
                  <th style={th('left')}>Transaction type</th>
                  <th style={th('right', 160)}>Rate (₹)</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => (
                  <tr key={f.key} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={td('left')}>{f.label}</td>
                    <td style={td('right')}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        style={{ textAlign: 'right', width: 120 }}
                        value={rates[f.key]}
                        onChange={(e) => setRates((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 16 }}>
            Currently effective from: {rateCard?.effectiveFrom}
          </div>

          {saved && <div style={{ color: 'var(--teal)', marginBottom: 14, fontSize: 14 }}>Rate card updated.</div>}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : `Save — effective from ${todayStr()}`}
          </button>
        </form>
      )}
    </div>
  );
}

function th(align, width) {
  return { textAlign: align, width, padding: '10px 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' };
}
function td(align) {
  return { textAlign: align, padding: '10px 14px', fontSize: 14 };
}
