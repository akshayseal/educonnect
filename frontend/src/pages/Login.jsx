import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner } from '../components';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(handle.trim(), password);
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your handle and password.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl font-semibold text-ink-900 mb-1">
            Edu<span className="text-sky-600">Connect</span>
          </div>
          <div className="text-sm text-ink-400">Quiz School Community</div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-0.5">Welcome back</h2>
            <p className="text-sm text-ink-400">Sign in with your anonymous handle</p>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <div>
            <label className="label">Your handle</label>
            <input className="input font-mono" type="text" value={handle}
              onChange={e => setHandle(e.target.value)} required
              placeholder="e.g. Teacher_49A2" autoComplete="username" />
            <p className="text-xs text-ink-400 mt-1">The anonymous ID assigned when you registered</p>
          </div>

          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Spinner size="sm" /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-400 mt-4">
          New here?{' '}
          <Link to="/register" className="text-sky-600 hover:underline">Create an anonymous account</Link>
        </p>

        <div className="mt-6 p-4 bg-ink-100 rounded-xl text-xs text-ink-500 text-center">
          &#128274; Your real identity is never stored or shared with other members.
        </div>
      </div>
    </div>
  );
}
