import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HolidaysPage() {
  const { firebaseUser, scope } = useAuth();
  const [weeklyOff, setWeeklyOff] = useState([0]);
  const [dates, setDates] = useState({});
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const circleId = scope.circleId;

  useEffect(() => {
    if (!circleId) return;
    getDoc(doc(db, 'holidays', circleId)).then((snap) => {
      if (snap.exists()) {
        setWeeklyOff(snap.data().weeklyOff ?? [0]);
        setDates(snap.data().dates ?? {});
      }
      setLoading(false);
    });
  }, [circleId]);

  const save = async (nextWeeklyOff, nextDates) => {
    setSaving(true);
    await setDoc(doc(db, 'holidays', circleId), {
      circleId,
      weeklyOff: nextWeeklyOff,
      dates: nextDates,
      updatedBy: firebaseUser.uid,
      updatedAt: serverTimestamp(),
    });
    setSaving(false);
  };

  const toggleWeeklyOff = (day) => {
    const next = weeklyOff.includes(day) ? weeklyOff.filter((d) => d !== day) : [...weeklyOff, day];
    setWeeklyOff(next);
    save(next, dates);
  };

  const addHoliday = (e) => {
    e.preventDefault();
    if (!newDate || !newLabel) return;
    const next = { ...dates, [newDate]: newLabel };
    setDates(next);
    save(weeklyOff, next);
    setNewDate('');
    setNewLabel('');
  };

  const removeHoliday = (dateStr) => {
    const next = { ...dates };
    delete next[dateStr];
    setDates(next);
    save(weeklyOff, next);
  };

  const sortedDates = Object.entries(dates).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Holiday calendar</h1>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 20 }}>
        Applies uniformly across all divisions. Used to compute working days for monthly targets.
      </p>

      {loading ? (
        <div style={{ color: 'var(--ink-soft)' }}>Loading…</div>
      ) : (
        <>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Weekly off</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {WEEKDAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWeeklyOff(i)}
                  className="btn"
                  style={{
                    background: weeklyOff.includes(i) ? 'var(--maroon)' : 'transparent',
                    color: weeklyOff.includes(i) ? 'var(--white)' : 'var(--ink)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Holidays</h3>
            <form onSubmit={addHoliday} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input type="date" className="input" style={{ maxWidth: 180 }} value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
              <input type="text" className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Holiday name" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} required />
              <button type="submit" className="btn btn-primary" disabled={saving}>Add</button>
            </form>

            {sortedDates.length === 0 && <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>No holidays added yet.</div>}

            {sortedDates.map(([dateStr, label]) => (
              <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span><span className="mono">{dateStr}</span> &middot; {label}</span>
                <button type="button" className="btn btn-ghost" onClick={() => removeHoliday(dateStr)}>Remove</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
