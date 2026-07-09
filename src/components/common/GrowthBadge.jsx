export default function GrowthBadge({ label, pct, compact }) {
  const positive = pct >= 0;
  const color = positive ? 'var(--teal)' : 'var(--flag)';
  const arrow = positive ? '▲' : '▼';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: compact ? 11 : 13,
        fontWeight: 600,
        color,
      }}
    >
      <span style={{ color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</span>
      <span className="mono">{arrow} {Math.abs(pct)}%</span>
    </span>
  );
}
