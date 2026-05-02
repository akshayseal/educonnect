import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ handle: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.handle}`);
      if (res.data.user.role === 'admin') navigate('/admin');
      else navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.brand}>
          <div style={styles.logo}>EC</div>
          <h1 style={styles.brandName}>EduConnect</h1>
          <p style={styles.tagline}>India's privacy-first school community platform</p>
        </div>
        <div style={styles.features}>
          {['Anonymous profiles', 'City-routed events', 'Multi-channel notifications', 'Role-based access'].map(f => (
            <div key={f} style={styles.feature}>
              <span style={styles.dot} />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <h2 style={styles.title}>Sign In</h2>
          <p style={styles.subtitle}>Enter your handle and password</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Handle</label>
              <input
                style={styles.input}
                placeholder="Teacher_4A2F"
                value={form.handle}
                onChange={e => setForm({ ...form, handle: e.target.value })}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={styles.switch}>
            New here?{' '}
            <Link to="/register" style={styles.link}>Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh' },
  left: {
    flex: 1, background: 'var(--ink)', color: 'var(--white)',
    padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  brand: { marginBottom: '48px' },
  logo: {
    width: '56px', height: '56px', background: 'var(--accent)',
    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Playfair Display, serif', fontWeight: '700', fontSize: '20px',
    color: 'var(--white)', marginBottom: '20px',
  },
  brandName: { fontSize: '36px', color: 'var(--white)', marginBottom: '12px' },
  tagline: { color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: '1.5' },
  features: { display: 'flex', flexDirection: 'column', gap: '16px' },
  feature: { display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.8)', fontSize: '15px' },
  dot: { width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 },
  right: {
    flex: 1, background: 'var(--paper)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '40px',
  },
  card: { width: '100%', maxWidth: '400px' },
  title: { fontSize: '32px', marginBottom: '8px', color: 'var(--ink)' },
  subtitle: { color: 'var(--muted)', marginBottom: '32px', fontSize: '15px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--ink)', letterSpacing: '0.05em', textTransform: 'uppercase' },
  input: {
    padding: '12px 16px', border: '1.5px solid var(--border)',
    borderRadius: '8px', fontSize: '15px', background: 'var(--white)',
    color: 'var(--ink)', transition: 'border-color 0.2s',
  },
  btn: {
    padding: '14px', background: 'var(--accent)', color: 'var(--white)',
    border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600',
    marginTop: '8px', transition: 'background 0.2s',
  },
  switch: { textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: '14px' },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' },
};
