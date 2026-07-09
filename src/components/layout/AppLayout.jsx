import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';

const NAV_BY_ROLE = {
  operator: [
    { to: '/eod/new', label: "Today's EoD Entry" },
    { to: '/eod/history', label: 'My Entries' },
    { to: '/eod/corrections', label: 'Corrections' },
    { to: '/reports/mine', label: 'My Performance' },
  ],
  do: [
    { to: '/approvals', label: 'Pending Approvals' },
    { to: '/centres', label: 'Centres & Operators' },
    { to: '/reports/division', label: 'Division MIS' },
    { to: '/targets', label: 'Targets' },
  ],
  ro: [
    { to: '/reports/region', label: 'Region MIS' },
    { to: '/reports/divisions-compare', label: 'Compare Divisions' },
  ],
 co: [
  { to: '/reports/circle', label: 'Circle MIS' },
  { to: '/divisions', label: 'Divisions' },
  { to: '/rate-card', label: 'Rate Card' },
  { to: '/holidays', label: 'Holiday Calendar' },
],
};
export default function AppLayout() {
  const { profile, role, logout } = useAuth();
  const navItems = NAV_BY_ROLE[role] ?? [];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 248,
          background: 'var(--maroon)',
          color: 'var(--white)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
            Aadhaar Business MIS 
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Department of Posts &middot; Assam Circle</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: '10px 12px',
                borderRadius: 6,
                color: 'var(--white)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                background: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.name}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 10 }}>
            {ROLE_LABELS[role]}
            {profile?.centreId ? ` · ${profile.centreId}` : ''}
            {!profile?.centreId && profile?.divisionId ? ` · ${profile.divisionId}` : ''}
          </div>
          <button onClick={logout} className="btn btn-ghost" style={{ color: 'var(--white)', width: '100%', justifyContent: 'center' }}>
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, background: 'var(--cream)', minWidth: 0 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
