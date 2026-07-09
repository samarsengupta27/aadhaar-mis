import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError('Login failed. Check your email and password and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cream)',
      }}
    >
      <div className="card" style={{ width: 380, padding: 36 }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '2px solid var(--maroon)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              color: 'var(--maroon)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            DoP
          </div>
          <h1 style={{ fontSize: 21 }}>Aadhaar Business MIS</h1>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
            Department of Posts &middot; Assam Circle
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div style={{ color: 'var(--flag)', fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 20, textAlign: 'center' }}>
          Forgot your password, or need a login? Contact your Division Office.
        </div>
      </div>
    </div>
  );
}
