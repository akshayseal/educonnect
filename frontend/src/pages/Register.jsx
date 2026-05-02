import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh',
];

export default function Register() {
  const [form, setForm] = useState({
    role: 'teacher', state: '', city: '', password: '',
    email: '', adminSecret: '',
  });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        role: form.role, state: form.state, city: form.city,
        password: form.password, email: form.email,
        ...(form.role === 'admin' && { adminSecret: form.adminSecret }),
      };
      const res = await register(payload);
      loginUser(res.data.token, res.data.user);
      toast.success(`Account created! Your handle: ${res.data.user.handle}`);
      if (res.data.user.role === 'admin') navigate('/admin');
      else navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.logo}>EC</div>
        <h1 style={styles.brandName}>EduConnect</h1>
        <p style={styles.tagline}>Join India's anonymous school community</p>
        <div style={styles.note}>
          <strong>Your identity stays private.</strong>
          <br />You'll get an anonymous handle like <em>Teacher_4A2F</em>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>All fields are required</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>I am a</label>
              <div style={styles.roleRow}>
                {['teacher', 'student', 'admin'].map(r => (
                  <button key={r} type="button"
                    style={{ ...styles.roleBtn, ...(form.role === r ? styles.roleBtnActive : {}) }}
                    onClick={() => set('role', r)}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>State</label>
                <select style={styles.input} value={form.state} onChange={e => set('state', e.target.value)} required>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>City</label>
                <input style={styles.input} placeholder="Mumbai" value={form.city}
                  onChange={e => set('city', e.target.value)} required />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email (private)</label>
              <input style={styles.input} type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input style={styles.input} type="password" placeholder="Min 8 characters"
                value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>

            {form.role === 'admin' && (
              <div style={styles.field}>
                <label style={styles.label}>Admin Secret</label>
                <input style={{ ...styles.input, borderColor: 'var(--accent)' }}
                  type="password" placeholder="Enter admin secret key"
                  value={form.adminSecret} onChange={e => set('adminSecret', e.target.value)} required />
              </div>
            )}

            <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={styles.switch}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh' },
  left: {
    width: '380px', background: 'var(--ink)', color: 'var(--white)',
    padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
  },
  logo: {
    width: '52px', height: '52px', background: 'var(--accent)', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Playfair Display, serif', fontWeight: '700', fontSize: '18px',
    color: 'var(--white)', marginBottom: '20px',
  },
  brandName: { fontSize: '30px', color: 'var(--white)', marginBottom: '12px' },
  tagline: { color: 'rgba(255,255,255,0.6)', fontSize: '15px', marginBottom: '32px' },
  note: {
    background: 'rgba(255,255,255,0.08)', borderRadius: '10px',
    padding: '20px', color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.6',
  },
  right: {
    flex: 1, background: 'var(--paper)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '40px',
  },
  card: { width: '100%', maxWidth: '480px' },
  title: { fontSize: '30px', marginBottom: '8px' },
  subtitle: { color: 'var(--muted)', marginBottom: '28px', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--ink)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input: {
    padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '8px',
    fontSize: '14px', background: 'var(--white)', color: 'var(--ink)', width: '100%',
  },
  row: { display: 'flex', gap: '16px' },
  roleRow: { display: 'flex', gap: '10px' },
  roleBtn: {
    flex: 1, padding: '10px', border: '1.5px solid var(--border)', borderRadius: '8px',
    background: 'var(--white)', color: 'var(--muted)', fontSize: '14px', fontWeight: '500',
  },
  roleBtnActive: { background: 'var(--ink)', color: 'var(--white)', borderColor: 'var(--ink)' },
  btn: {
    padding: '13px', background: 'var(--accent)', color: 'var(--white)',
    border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', marginTop: '4px',
  },
  switch: { textAlign: 'center', marginTop: '20px', color: 'var(--muted)', fontSize: '14px' },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' },
};
