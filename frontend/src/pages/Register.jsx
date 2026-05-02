import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner } from '../components';
import { STATES_CITIES, STATES } from '../utils/locations';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    role: 'teacher',
    state: '',
    city: '',
    school_name: '',
    password: '',
    confirm_password: '',
    email: '',
    whatsapp: '',
    notify_email: true,
    notify_whatsapp: false,
    admin_secret: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cities = form.state ? (STATES_CITIES[form.state] || []) : [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    if (!form.email && !form.whatsapp) { setError('Please provide at least email or WhatsApp'); return; }
    setLoading(true); setError('');
    try {
      const user = await register(form);
      navigate('/feed');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-ink-900 text-white p-12 shrink-0">
        <div>
          <div className="font-display text-2xl font-semibold mb-1">
            Edu<span className="text-sky-400">Connect</span>
          </div>
          <div className="text-ink-400 text-sm">Quiz School Community</div>
        </div>
        <div>
          <div className="space-y-6 mb-10">
            {[
              { icon: '🎭', title: 'Fully anonymous', body: 'You appear only as a random handle. Your name and school are never shared.' },
              { icon: '📍', title: 'City-smart routing', body: 'Only receive events relevant to your city. No noise from other districts.' },
              { icon: '📲', title: 'Email & WhatsApp', body: 'Get notified on the channels you use. Your contact details stay encrypted.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4">
                <span className="text-2xl mt-0.5">{f.icon}</span>
                <div>
                  <div className="font-medium text-sm mb-0.5">{f.title}</div>
                  <div className="text-ink-400 text-sm leading-relaxed">{f.body}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-500">
            Built for educators across India. Anonymous by design.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <div className="font-display text-2xl font-semibold text-ink-900 mb-1">Create your account</div>
            <div className="text-sm text-ink-400">Step {step} of 2 — {step === 1 ? 'Your details' : 'Notification setup'}</div>
            {/* Progress bar */}
            <div className="mt-3 h-1 bg-ink-100 rounded-full">
              <div className="h-full bg-sky-600 rounded-full transition-all duration-300" style={{ width: `${step * 50}%` }} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && <Alert type="error">{error}</Alert>}

            {step === 1 && (
              <>
                <div>
                  <label className="label">I am a</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['teacher', 'student', 'admin'].map(r => (
                      <button type="button" key={r}
                        onClick={() => set('role', r)}
                        className={`py-2 rounded-lg text-sm border transition-all ${
                          form.role === r
                            ? 'border-sky-600 bg-sky-50 text-sky-700 font-medium'
                            : 'border-ink-200 text-ink-600 hover:border-ink-300'
                        }`}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {form.role === 'admin' && (
                  <div>
                    <label className="label">Admin registration code</label>
                    <input className="input" type="password" value={form.admin_secret}
                      onChange={e => set('admin_secret', e.target.value)}
                      placeholder="Enter code provided by your organization" required />
                  </div>
                )}

                <div>
                  <label className="label">State</label>
                  <select className="input" value={form.state} onChange={e => { set('state', e.target.value); set('city', ''); }} required>
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">City</label>
                  <select className="input" value={form.city} onChange={e => set('city', e.target.value)} required disabled={!form.state}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">School name <span className="text-ink-400 normal-case font-normal">(kept private)</span></label>
                  <input className="input" type="text" value={form.school_name}
                    onChange={e => set('school_name', e.target.value)}
                    placeholder="e.g. Delhi Public School, Dadri" />
                </div>

                <div>
                  <label className="label">Password</label>
                  <input className="input" type="password" value={form.password}
                    onChange={e => set('password', e.target.value)} required minLength={8}
                    placeholder="Minimum 8 characters" />
                </div>

                <div>
                  <label className="label">Confirm password</label>
                  <input className="input" type="password" value={form.confirm_password}
                    onChange={e => set('confirm_password', e.target.value)} required />
                </div>

                <button type="button" onClick={() => { if (!form.state || !form.city || !form.password) { setError('Please fill all required fields'); return; } setError(''); setStep(2); }}
                  className="btn-primary w-full">
                  Next: Notifications →
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="bg-ink-50 rounded-lg p-4 text-sm text-ink-600">
                  <div className="font-medium text-ink-800 mb-1">&#128274; Privacy note</div>
                  Your contact details are encrypted and stored securely. They are never shown to other members or admins.
                </div>

                <div>
                  <label className="label">Email address</label>
                  <input className="input" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={form.notify_email}
                      onChange={e => set('notify_email', e.target.checked)}
                      className="rounded" />
                    <span className="text-sm text-ink-600">Receive notifications via email</span>
                  </label>
                </div>

                <div>
                  <label className="label">WhatsApp number <span className="text-ink-400 font-normal normal-case">(optional)</span></label>
                  <input className="input" type="tel" value={form.whatsapp}
                    onChange={e => set('whatsapp', e.target.value)} placeholder="+91 98765 43210" />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={form.notify_whatsapp}
                      onChange={e => set('notify_whatsapp', e.target.checked)}
                      className="rounded" />
                    <span className="text-sm text-ink-600">Receive notifications via WhatsApp</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {loading ? <><Spinner size="sm" /> Creating…</> : 'Create anonymous account'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-ink-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-600 hover:underline">Sign in with your handle</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
