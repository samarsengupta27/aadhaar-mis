// Shown while submitWithRetry is working through connectivity issues, so
// the operator knows their entry is being held onto rather than lost.

export default function RetryStatusBanner({ status }) {
  if (!status) return null;

  const config = {
    waiting_for_network: {
      color: 'var(--ochre)',
      bg: 'var(--ochre-soft)',
      text: "No connection — your entry is saved and will submit automatically once you're back online.",
    },
    retrying: {
      color: 'var(--ochre)',
      bg: 'var(--ochre-soft)',
      text: `Connection issue — retrying (attempt ${status.attempt} of ${status.maxAttempts})…`,
    },
    failed: {
      color: 'var(--flag)',
      bg: 'var(--flag-soft)',
      text: 'Could not submit after several attempts. Please check your connection and try again.',
    },
  }[status.phase];

  if (!config) return null;

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 6,
        background: config.bg,
        color: config.color,
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {config.text}
    </div>
  );
}
