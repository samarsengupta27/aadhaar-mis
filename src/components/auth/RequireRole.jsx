import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function RequireRole({ roles, children }) {
  const { firebaseUser, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        Loading…
      </div>
    );
  }

  if (!firebaseUser) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(role)) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Not authorized</h2>
        <p style={{ color: 'var(--ink-soft)' }}>Your login does not have access to this page.</p>
      </div>
    );
  }

  return children;
}
