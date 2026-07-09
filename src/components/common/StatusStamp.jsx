const CONFIG = {
  submitted: { className: 'stamp-submitted', label: 'Submitted' },
  pending_approval: { className: 'stamp-pending', label: 'Pending Approval' },
  approved: { className: 'stamp-approved', label: 'Approved' },
};

export default function StatusStamp({ status }) {
  const c = CONFIG[status] ?? { className: 'stamp-flagged', label: status };
  return <span className={`stamp ${c.className}`}>{c.label}</span>;
}
