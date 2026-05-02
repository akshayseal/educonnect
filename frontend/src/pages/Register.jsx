import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh'];

export default function Register() {
  const [form, setForm] = useState({ role: 'teacher', state: '', city: '', password: '', email: '', whatsapp: '', schoolName: '', adminSecret: '', subject: '', qualification: '', experienceYears: '', classGrade: '', section: '', rollNumber: '' });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register(form);
      loginUser(res.data.token, res.data.user);
      toast.success(`Account created! Your handle: ${res.data.user.handle}`);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/feed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.logo}>EC</div>
        <h1 style={s.brandName}>EduConnect</h1>
        <p style={s.tagline}>Join India's anonymous school community</p>
        <div style={s.note}><strong>Your identity stays private.</strong><br />You'll get an anonymous handle like <em>Teacher_4A2F</em><br /><br />Only admins can see your contact details.</div>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <h2 style={s.title}>Create Account</h2>

          <form onSubmit={handleSubmit} style={s.form}>
            {/* Role */}
            <div style={s.field}>
              <label style={s.label}>I am a</label>
              <div style={s.roleRow}>
                {['teacher', 'student', 'admin'].map(r => (
                  <button key={r} type="button" style={{ ...s.roleBtn, ...(form.role === r ? s.roleBtnActive : {}) }} onClick={() => set('role', r)}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>State *</label>
                <select style={s.input} value={form.state} onChange={e => set('state', e.target.value)} required>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>City *</label>
                <input style={s.input} placeholder="Mumbai" value={form.city} onChange={e => set('city', e.target.value)} required />
              </div>
            </div>

            {/* School */}
            {form.role !== 'admin' && (
              <div style={s.field}>
                <label style={s.label}>School Name *</label>
                <input style={s.input} placeholder="Delhi Public School, Noida" value={form.schoolName} onChange={e => set('schoolName', e.target.value)} required />
              </div>
            )}

            {/* Teacher-specific */}
            {form.role === 'teacher' && (
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Subject</label>
                  <input style={s.input} placeholder="Mathematics" value={form.subject} onChange={e => set('subject', e.target.value)} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Experience (Years)</label>
                  <input style={s.input} type="number" placeholder="5" value={form.experienceYears} onChange={e => set('experienceYears', e.target.value)} />
                </div>
              </div>
            )}

            {/* Student-specific */}
            {form.role === 'student' && (
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Class / Grade</label>
                  <input style={s.input} placeholder="Class 10" value={form.classGrade} onChange={e => set('classGrade', e.target.value)} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Section</label>
                  <input style={s.input} placeholder="A" value={form.section} onChange={e => set('section', e.target.value)} />
                </div>
              </div>
            )}

            {/* Contact */}
            <div style={s.field}>
              <label style={s.label}>Email * <span style={s.private}>(private — for notifications)</span></label>
              <input style={s.input} type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            <div style={s.field}>
              <label style={s.label}>WhatsApp Number <span style={s.private}>(optional — for notifications)</span></label>
              <input style={s.input} type="tel" placeholder="+91 98765 43210" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
            </div>

            {/* Password */}
            <div style={s.field}>
              <label style={s.label}>Password *</label>
              <input style={s.input} type="password" placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>

            {/* Admin secret */}
            {form.role === 'admin' && (
              <div style={s.field}>
                <label style={s.label}>Admin Secret *</label>
                <input style={{ ...s.input, borderColor: 'var(--accent)' }} type="password" placeholder="Enter admin secret key" value={form.adminSecret} onChange={e => set('adminSecret', e.target.value)} required />
              </div>
            )}

            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={s.switch}>Already have an account? <Link to="/login" style={s.link}>Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: 'flex', minHeight: '100vh' },
  left: { width: '340px', background: 'var(--ink)', color: 'var(--white)', padding: '60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  logo: { width: '48px', height: '48px', background: 'var(--accent)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display,serif', fontWeight: '700', fontSize: '17px', color: '#fff', marginBottom: '18px' },
  brandName: { fontSize: '28px', color: '#fff', marginBottom: '10px' },
  tagline: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '28px' },
  note: { background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '18px', color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: '1.7' },
  right: { flex: 1, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', overflowY: 'auto' },
  card: { width: '100%', maxWidth: '500px', paddingTop: '20px' },
  title: { fontSize: '28px', marginBottom: '24px', color: 'var(--ink)' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  label: { fontSize: '11px', fontWeight: '700', color: 'var(--ink)', letterSpacing: '0.07em', textTransform: 'uppercase' },
  private: { fontWeight: '400', color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 },
  input: { padding: '10px 13px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)', color: 'var(--ink)', width: '100%' },
  row: { display: 'flex', gap: '14px' },
  roleRow: { display: 'flex', gap: '10px' },
  roleBtn: { flex: 1, padding: '9px', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'var(--white)', color: 'var(--muted)', fontSize: '13px', fontWeight: '500' },
  roleBtnActive: { background: 'var(--ink)', color: 'var(--white)', borderColor: 'var(--ink)' },
  btn: { padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', marginTop: '4px' },
  switch: { textAlign: 'center', marginTop: '18px', color: 'var(--muted)', fontSize: '14px' },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: '600' },
};
