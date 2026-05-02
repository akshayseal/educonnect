import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUsers, getAllEvents, createEvent, sendEvent, deleteEvent, exportUsers, bulkCreate } from '../api';
import toast from 'react-hot-toast';

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh'];
const TYPE_COLORS = { urgent:'#c84b31', quiz:'#185FA5', exam:'#854F0B', general:'#1d7a6e', holiday:'#533AB7', other:'#5F5E5A' };

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sending, setSending] = useState(null);
  const [userFilter, setUserFilter] = useState({ role: '', state: '', city: '' });
  const [memberTab, setMemberTab] = useState('all');
  const [eventForm, setEventForm] = useState({ title:'', body:'', event_type:'general', target_scope:'all', target_state:'', target_city:'', target_role:'all' });
  const [creating, setCreating] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPassword, setBulkPassword] = useState('EduConnect@2026');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    loadUsers(); loadEvents();
  }, []);

  const loadUsers = async (filters = {}) => {
    setLoadingUsers(true);
    try { const res = await getUsers(filters); setUsers(res.data.users || []); }
    catch { toast.error('Failed to load members'); }
    finally { setLoadingUsers(false); }
  };

  const loadEvents = async () => {
    setLoadingEvents(true);
    try { const res = await getAllEvents(); setEvents(res.data.events || []); }
    catch { toast.error('Failed to load events'); }
    finally { setLoadingEvents(false); }
  };

  const handleExport = async (role) => {
    try {
      const res = await exportUsers(role);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `educonnect-${role||'all'}-${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed'); }
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    if (!bulkFile) { toast.error('Please select a CSV file'); return; }
    setBulkLoading(true); setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('defaultPassword', bulkPassword);
      const res = await bulkCreate(formData);
      setBulkResult(res.data);
      toast.success(res.data.message);
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Bulk create failed'); }
    finally { setBulkLoading(false); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      await createEvent(eventForm);
      toast.success('Event created!');
      setEventForm({ title:'', body:'', event_type:'general', target_scope:'all', target_state:'', target_city:'', target_role:'all' });
      loadEvents(); setTab('events');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setCreating(false); }
  };

  const handleSend = async (id) => {
    setSending(id);
    try { const res = await sendEvent(id); toast.success(`Sent to ${res.data.recipients_count||0} recipients!`); loadEvents(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to send'); }
    finally { setSending(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try { await deleteEvent(id); toast.success('Deleted'); loadEvents(); }
    catch { toast.error('Failed to delete'); }
  };

  const filtered = users.filter(u => memberTab === 'all' ? u.role !== 'admin' : u.role === memberTab);
  const stats = { total: users.filter(u=>u.role!=='admin').length, teachers: users.filter(u=>u.role==='teacher').length, students: users.filter(u=>u.role==='student').length, events: events.length };

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'members', icon: '👥', label: 'Members' },
    { id: 'bulk', icon: '📤', label: 'Bulk Upload' },
    { id: 'events', icon: '📢', label: 'Events' },
    { id: 'compose', icon: '✉️', label: 'Compose' },
  ];

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.logo}>EC</div>
          <div><div style={s.logoText}>EduConnect</div><div style={s.adminBadge}>Admin Panel</div></div>
        </div>
        <nav style={s.nav}>
          {navItems.map(item => (
            <button key={item.id} style={{ ...s.navBtn, ...(tab===item.id?s.navBtnActive:{}) }} onClick={() => setTab(item.id)}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div style={s.sideBottom}>
          <div style={s.userHandle}>{user?.handle}</div>
          <div style={s.userRole}>Administrator</div>
          <button onClick={() => { logout(); navigate('/login'); }} style={s.logoutBtn}>Sign Out</button>
        </div>
      </aside>

      <main style={s.main}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div style={s.content}>
            <h2 style={s.pageTitle}>Dashboard</h2>
            <div style={s.statsGrid}>
              {[['Total Members', stats.total, 'var(--ink)'], ['Teachers', stats.teachers, 'var(--teal)'], ['Students', stats.students, 'var(--accent)'], ['Events', stats.events, 'var(--gold)']].map(([label, val, color]) => (
                <div key={label} style={s.statCard}><div style={{ ...s.statNum, color }}>{val}</div><div style={s.statLabel}>{label}</div></div>
              ))}
            </div>
            <div style={s.recentBox}>
              <h3 style={s.sectionTitle}>Recent Events</h3>
              {events.slice(0,5).map(ev => (
                <div key={ev.id} style={s.eventRow}>
                  <div style={{ ...s.typeDot, background: TYPE_COLORS[ev.event_type] }} />
                  <div style={{ flex: 1 }}><div style={s.eventTitle}>{ev.title}</div><div style={s.eventMeta}>{ev.target_scope} · {ev.event_type}</div></div>
                  <div style={{ ...s.pill, background: ev.sent_at?'#e8f5e9':'#fff3e0', color: ev.sent_at?'#2e7d32':'#e65100' }}>{ev.sent_at?'✓ Sent':'Draft'}</div>
                </div>
              ))}
              {!events.length && <p style={s.empty}>No events yet.</p>}
            </div>
          </div>
        )}

        {/* ── MEMBERS ── */}
        {tab === 'members' && (
          <div style={s.content}>
            <div style={s.pageHeader}>
              <h2 style={s.pageTitle}>Members</h2>
              <div style={s.exportBtns}>
                <button style={s.exportBtn} onClick={() => handleExport('teacher')}>⬇ Teachers CSV</button>
                <button style={s.exportBtn} onClick={() => handleExport('student')}>⬇ Students CSV</button>
                <button style={{ ...s.exportBtn, background: 'var(--ink)', color: '#fff' }} onClick={() => handleExport('all')}>⬇ All CSV</button>
              </div>
            </div>

            <div style={s.filterRow}>
              <select style={s.filterInput} value={userFilter.state} onChange={e => setUserFilter(f=>({...f,state:e.target.value}))}>
                <option value="">All States</option>
                {STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
              <input style={s.filterInput} placeholder="Filter by city..." value={userFilter.city} onChange={e => setUserFilter(f=>({...f,city:e.target.value}))} />
              <button style={s.filterBtn} onClick={() => loadUsers(userFilter)}>Filter</button>
              <button style={{ ...s.filterBtn, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }} onClick={() => { setUserFilter({role:'',state:'',city:''}); loadUsers(); }}>Clear</button>
            </div>

            <div style={s.memberTabs}>
              {[['all','All'], ['teacher','Teachers'], ['student','Students']].map(([val, label]) => (
                <button key={val} style={{ ...s.memberTab, ...(memberTab===val?s.memberTabActive:{}) }} onClick={() => setMemberTab(val)}>
                  {label} <span style={s.memberCount}>{val==='all'?stats.total:val==='teacher'?stats.teachers:stats.students}</span>
                </button>
              ))}
            </div>

            {loadingUsers ? <p style={s.empty}>Loading...</p> : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Handle','Role','School','Email','WhatsApp','State','City','Class/Subject','Joined'].map(h => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id} style={s.tr}>
                        <td style={s.td}><strong>{u.handle}</strong></td>
                        <td style={s.td}><span style={{ ...s.rolePill, background: u.role==='teacher'?'#d1fae5':'#dbeafe' }}>{u.role}</span></td>
                        <td style={s.td}>{u.school_name || '—'}</td>
                        <td style={s.td}>{u.email || '—'}</td>
                        <td style={s.td}>{u.whatsapp || '—'}</td>
                        <td style={s.td}>{u.state}</td>
                        <td style={s.td}>{u.city}</td>
                        <td style={s.td}>{u.role==='teacher'?(u.subject||'—'):(u.class_grade?(u.class_grade+(u.section?'-'+u.section:'')):'—')}</td>
                        <td style={s.td}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && <p style={{ ...s.empty, padding: '20px' }}>No members found.</p>}
              </div>
            )}
          </div>
        )}

        {/* ── BULK UPLOAD ── */}
        {tab === 'bulk' && (
          <div style={s.content}>
            <h2 style={s.pageTitle}>Bulk Create IDs</h2>
            <p style={s.subtitle}>Upload a CSV to create multiple teacher/student accounts at once. A welcome email with their handle and password will be sent automatically.</p>

            <div style={s.bulkGrid}>
              <div style={s.bulkForm}>
                <h3 style={s.sectionTitle}>Upload CSV</h3>
                <form onSubmit={handleBulkCreate} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
                  <div style={s.field}>
                    <label style={s.label}>CSV File *</label>
                    <div style={{ ...s.dropzone, background: bulkFile ? '#f0fdf4' : 'var(--white)', borderColor: bulkFile ? 'var(--teal)' : 'var(--border)' }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); setBulkFile(e.dataTransfer.files[0]); }}>
                      <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files[0])} style={{ display:'none' }} id="csvFile" />
                      <label htmlFor="csvFile" style={{ cursor:'pointer', display:'block', textAlign:'center' }}>
                        {bulkFile ? <><div style={{ fontSize:'32px' }}>✅</div><div style={{ color:'var(--teal)', fontWeight:'600' }}>{bulkFile.name}</div></> : <><div style={{ fontSize:'32px' }}>📂</div><div style={{ color:'var(--muted)' }}>Click to choose CSV or drag & drop</div></>}
                      </label>
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Default Password</label>
                    <input style={s.input} value={bulkPassword} onChange={e => setBulkPassword(e.target.value)} placeholder="EduConnect@2026" />
                    <span style={{ fontSize:'12px', color:'var(--muted)' }}>Users will receive this via email and should change it after first login</span>
                  </div>
                  <button type="submit" style={{ ...s.primaryBtn, opacity: bulkLoading?0.7:1 }} disabled={bulkLoading}>
                    {bulkLoading ? 'Creating accounts...' : '🚀 Create Accounts'}
                  </button>
                </form>

                {bulkResult && (
                  <div style={{ marginTop:'20px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius:'10px', padding:'20px' }}>
                    <div style={{ color:'var(--teal)', fontWeight:'600', marginBottom:'10px' }}>✅ {bulkResult.created.length} accounts created</div>
                    {bulkResult.failed.length > 0 && <div style={{ color:'var(--accent)', fontWeight:'600', marginBottom:'10px' }}>❌ {bulkResult.failed.length} failed</div>}
                    <div style={{ maxHeight:'200px', overflowY:'auto' }}>
                      {bulkResult.created.slice(0,10).map((c,i) => <div key={i} style={{ fontSize:'13px', color:'var(--muted)', padding:'4px 0' }}>✓ {c.handle} — {c.email}</div>)}
                      {bulkResult.created.length > 10 && <div style={{ fontSize:'13px', color:'var(--muted)' }}>...and {bulkResult.created.length-10} more</div>}
                    </div>
                  </div>
                )}
              </div>

              <div style={s.bulkGuide}>
                <h3 style={s.sectionTitle}>CSV Format</h3>
                <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'16px' }}>Your CSV must have these column headers:</p>
                <div style={s.csvTemplate}>
                  <div style={s.templateTitle}>Required columns</div>
                  {['role (teacher/student)', 'email', 'state', 'city', 'school_name'].map(c => <div key={c} style={s.colItem}><span style={s.colDot}/>{c}</div>)}
                  <div style={{ ...s.templateTitle, marginTop:'14px' }}>Optional for teachers</div>
                  {['subject', 'qualification', 'experience_years'].map(c => <div key={c} style={s.colItem}><span style={{ ...s.colDot, background:'var(--gold)' }}/>{c}</div>)}
                  <div style={{ ...s.templateTitle, marginTop:'14px' }}>Optional for students</div>
                  {['class_grade', 'section', 'roll_number', 'whatsapp'].map(c => <div key={c} style={s.colItem}><span style={{ ...s.colDot, background:'var(--gold)' }}/>{c}</div>)}
                </div>

                <div style={s.csvExample}>
                  <div style={s.templateTitle}>Example rows</div>
                  <code style={s.code}>role,email,state,city,school_name,subject{'\n'}teacher,ram@dps.edu,Maharashtra,Mumbai,DPS Mumbai,Maths{'\n'}student,priya@gmail.com,Delhi,Delhi,DPS RK Puram,,</code>
                </div>

                <button style={{ ...s.exportBtn, marginTop:'16px', width:'100%', textAlign:'center' }}
                  onClick={() => {
                    const template = 'role,email,state,city,school_name,whatsapp,subject,qualification,experience_years,class_grade,section,roll_number\nteacher,teacher@school.edu,Maharashtra,Mumbai,DPS Mumbai,+919876543210,Mathematics,B.Ed,5,,,\nstudent,student@gmail.com,Maharashtra,Mumbai,DPS Mumbai,+919876543211,,,,Class 10,A,42\n';
                    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([template],{type:'text/csv'}));
                    a.download = 'educonnect-bulk-template.csv'; a.click();
                  }}>
                  ⬇ Download Template CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EVENTS ── */}
        {tab === 'events' && (
          <div style={s.content}>
            <div style={s.pageHeader}>
              <h2 style={s.pageTitle}>Events</h2>
              <button style={s.primaryBtn} onClick={() => setTab('compose')}>+ New Event</button>
            </div>
            {loadingEvents ? <p style={s.empty}>Loading...</p> : (
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {events.map(ev => (
                  <div key={ev.id} style={s.eventCard}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                      <div style={{ ...s.typeTag, background: TYPE_COLORS[ev.event_type] }}>{ev.event_type.toUpperCase()}</div>
                      <span style={{ fontSize:'13px', color:'var(--muted)' }}>{ev.target_scope==='city'?`${ev.target_city}, ${ev.target_state}`:ev.target_scope==='state'?ev.target_state:'All India'} · {ev.target_role==='all'?'Everyone':ev.target_role+'s'}</span>
                    </div>
                    <h3 style={{ fontSize:'18px', marginBottom:'8px' }}>{ev.title}</h3>
                    <p style={{ fontSize:'14px', color:'var(--muted)', lineHeight:'1.6', marginBottom:'16px' }}>{ev.body.slice(0,120)}{ev.body.length>120?'...':''}</p>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:'12px', color:'var(--muted)' }}>{new Date(ev.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                      {ev.sent_at ? <span style={{ fontSize:'13px', color:'var(--teal)', fontWeight:'500' }}>✓ Sent to {ev.recipients_count} recipients</span> : (
                        <div style={{ display:'flex', gap:'10px' }}>
                          <button style={s.sendBtn} onClick={() => handleSend(ev.id)} disabled={sending===ev.id}>{sending===ev.id?'Sending...':'📤 Send Now'}</button>
                          <button style={s.deleteBtn} onClick={() => handleDelete(ev.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!events.length && <p style={s.empty}>No events yet.</p>}
              </div>
            )}
          </div>
        )}

        {/* ── COMPOSE ── */}
        {tab === 'compose' && (
          <div style={s.content}>
            <h2 style={s.pageTitle}>Compose Event</h2>
            <p style={s.subtitle}>Broadcast to your community via Email & WhatsApp</p>
            <form onSubmit={handleCreateEvent} style={s.composeGrid}>
              <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                <div style={s.field}><label style={s.label}>Title *</label><input style={s.input} placeholder="e.g. Final Exam Schedule" value={eventForm.title} onChange={e => setEventForm(f=>({...f,title:e.target.value}))} required /></div>
                <div style={s.field}><label style={s.label}>Message *</label><textarea style={{ ...s.input, minHeight:'130px', resize:'vertical' }} placeholder="Write your message..." value={eventForm.body} onChange={e => setEventForm(f=>({...f,body:e.target.value}))} required /></div>
                <div style={s.field}>
                  <label style={s.label}>Event Type</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                    {Object.entries(TYPE_COLORS).map(([type, color]) => (
                      <button key={type} type="button"
                        style={{ padding:'7px 14px', border:'1.5px solid', borderRadius:'6px', fontSize:'12px', fontWeight:'700', letterSpacing:'0.04em', borderColor: eventForm.event_type===type?color:'var(--border)', background: eventForm.event_type===type?color:'var(--white)', color: eventForm.event_type===type?'white':'var(--ink)' }}
                        onClick={() => setEventForm(f=>({...f,event_type:type}))}>
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div style={s.targetBox}>
                  <h4 style={{ fontSize:'15px', fontWeight:'600', marginBottom:'16px' }}>📍 Target Audience</h4>
                  <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                    <div style={s.field}><label style={s.label}>Scope</label>
                      <select style={s.input} value={eventForm.target_scope} onChange={e => setEventForm(f=>({...f,target_scope:e.target.value,target_state:'',target_city:''}))}>
                        <option value="all">All India</option><option value="state">Specific State</option><option value="city">Specific City</option>
                      </select>
                    </div>
                    {(eventForm.target_scope==='state'||eventForm.target_scope==='city') && (
                      <div style={s.field}><label style={s.label}>State</label>
                        <select style={s.input} value={eventForm.target_state} onChange={e => setEventForm(f=>({...f,target_state:e.target.value}))} required>
                          <option value="">Select state</option>{STATES.map(st=><option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                    )}
                    {eventForm.target_scope==='city' && (
                      <div style={s.field}><label style={s.label}>City</label><input style={s.input} placeholder="City name" value={eventForm.target_city} onChange={e => setEventForm(f=>({...f,target_city:e.target.value}))} required /></div>
                    )}
                    <div style={s.field}><label style={s.label}>Send To</label>
                      <select style={s.input} value={eventForm.target_role} onChange={e => setEventForm(f=>({...f,target_role:e.target.value}))}>
                        <option value="all">Everyone</option><option value="teacher">Teachers Only</option><option value="student">Students Only</option>
                      </select>
                    </div>
                    <div style={{ background:'var(--paper)', borderRadius:'8px', padding:'14px', fontSize:'13px', color:'var(--muted)' }}>
                      <div>📧 <strong>Email</strong> — via SendGrid</div>
                      <div style={{ marginTop:'6px' }}>💬 <strong>WhatsApp</strong> — via Twilio</div>
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'10px', marginTop:'16px', justifyContent:'flex-end' }}>
                  <button type="button" style={s.cancelBtn} onClick={() => setTab('events')}>Cancel</button>
                  <button type="submit" style={{ ...s.primaryBtn, opacity:creating?0.7:1 }} disabled={creating}>{creating?'Creating...':'✓ Create Event'}</button>
                </div>
              </div>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}

const s = {
  shell: { display:'flex', minHeight:'100vh', background:'var(--paper)' },
  sidebar: { width:'220px', background:'var(--ink)', display:'flex', flexDirection:'column', padding:'24px 0', flexShrink:0 },
  sideTop: { display:'flex', alignItems:'center', gap:'10px', padding:'0 18px 24px' },
  logo: { width:'38px', height:'38px', background:'var(--accent)', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Playfair Display,serif', fontWeight:'700', fontSize:'15px', color:'#fff', flexShrink:0 },
  logoText: { color:'#fff', fontFamily:'Playfair Display,serif', fontSize:'16px', fontWeight:'600' },
  adminBadge: { color:'rgba(255,255,255,0.45)', fontSize:'11px' },
  nav: { display:'flex', flexDirection:'column', gap:'3px', padding:'0 10px', flex:1 },
  navBtn: { padding:'10px 14px', background:'transparent', border:'none', color:'rgba(255,255,255,0.55)', borderRadius:'8px', textAlign:'left', fontSize:'13px', fontWeight:'500' },
  navBtnActive: { background:'rgba(255,255,255,0.12)', color:'#fff' },
  sideBottom: { padding:'18px', borderTop:'1px solid rgba(255,255,255,0.1)' },
  userHandle: { color:'#fff', fontSize:'13px', fontWeight:'600' },
  userRole: { color:'rgba(255,255,255,0.45)', fontSize:'11px', marginBottom:'10px' },
  logoutBtn: { width:'100%', padding:'8px', background:'rgba(200,75,49,0.2)', border:'1px solid rgba(200,75,49,0.4)', borderRadius:'6px', color:'#e8624a', fontSize:'12px' },
  main: { flex:1, overflow:'auto' },
  content: { padding:'32px 36px', maxWidth:'1100px' },
  pageTitle: { fontSize:'26px', marginBottom:'22px', color:'var(--ink)' },
  pageHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px' },
  subtitle: { color:'var(--muted)', fontSize:'14px', marginBottom:'24px' },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'28px' },
  statCard: { background:'var(--white)', borderRadius:'12px', padding:'22px', border:'1px solid var(--border)' },
  statNum: { fontSize:'38px', fontFamily:'Playfair Display,serif', fontWeight:'700', lineHeight:1 },
  statLabel: { color:'var(--muted)', fontSize:'12px', marginTop:'5px' },
  recentBox: { background:'var(--white)', borderRadius:'12px', padding:'22px', border:'1px solid var(--border)' },
  sectionTitle: { fontSize:'16px', marginBottom:'16px', fontFamily:'Playfair Display,serif' },
  eventRow: { display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:'1px solid var(--paper-dark)' },
  typeDot: { width:'9px', height:'9px', borderRadius:'50%', flexShrink:0 },
  eventTitle: { fontSize:'14px', fontWeight:'600' },
  eventMeta: { fontSize:'12px', color:'var(--muted)' },
  pill: { padding:'3px 9px', borderRadius:'20px', fontSize:'12px', fontWeight:'500' },
  exportBtns: { display:'flex', gap:'8px', flexWrap:'wrap' },
  exportBtn: { padding:'8px 16px', background:'var(--paper)', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', fontWeight:'500', color:'var(--ink)' },
  filterRow: { display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' },
  filterInput: { padding:'8px 12px', border:'1.5px solid var(--border)', borderRadius:'7px', fontSize:'13px', background:'var(--white)' },
  filterBtn: { padding:'8px 18px', background:'var(--ink)', color:'#fff', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:'600' },
  memberTabs: { display:'flex', gap:'0', marginBottom:'16px', border:'1px solid var(--border)', borderRadius:'8px', overflow:'hidden', width:'fit-content' },
  memberTab: { padding:'8px 20px', background:'var(--white)', border:'none', fontSize:'13px', fontWeight:'500', color:'var(--muted)', borderRight:'1px solid var(--border)' },
  memberTabActive: { background:'var(--ink)', color:'#fff' },
  memberCount: { background:'rgba(255,255,255,0.15)', borderRadius:'10px', padding:'1px 6px', fontSize:'11px', marginLeft:'4px' },
  tableWrap: { background:'var(--white)', borderRadius:'12px', border:'1px solid var(--border)', overflow:'auto' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'11px 14px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--border)', background:'var(--paper)', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid var(--paper-dark)' },
  td: { padding:'11px 14px', fontSize:'13px', color:'var(--ink)', whiteSpace:'nowrap' },
  rolePill: { padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:'500' },
  bulkGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'28px' },
  bulkForm: { display:'flex', flexDirection:'column', gap:'0' },
  bulkGuide: {},
  dropzone: { border:'2px dashed var(--border)', borderRadius:'10px', padding:'28px 20px', transition:'all 0.2s' },
  csvTemplate: { background:'var(--paper)', borderRadius:'8px', padding:'16px', marginBottom:'14px' },
  templateTitle: { fontSize:'11px', fontWeight:'700', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' },
  colItem: { display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'var(--ink)', padding:'3px 0' },
  colDot: { width:'7px', height:'7px', borderRadius:'50%', background:'var(--teal)', flexShrink:0 },
  csvExample: { background:'var(--ink)', borderRadius:'8px', padding:'14px' },
  code: { fontSize:'11px', color:'rgba(255,255,255,0.75)', whiteSpace:'pre', display:'block', lineHeight:'1.6', fontFamily:'monospace' },
  eventCard: { background:'var(--white)', border:'1px solid var(--border)', borderRadius:'12px', padding:'20px' },
  typeTag: { padding:'3px 9px', borderRadius:'4px', fontSize:'11px', fontWeight:'700', color:'#fff', letterSpacing:'0.04em' },
  sendBtn: { padding:'7px 16px', background:'var(--teal)', color:'#fff', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:'600' },
  deleteBtn: { padding:'7px 12px', background:'transparent', color:'var(--accent)', border:'1px solid var(--accent)', borderRadius:'7px', fontSize:'13px' },
  primaryBtn: { padding:'10px 22px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'600' },
  composeGrid: { display:'grid', gridTemplateColumns:'1fr 320px', gap:'28px' },
  targetBox: { background:'var(--white)', border:'1px solid var(--border)', borderRadius:'12px', padding:'20px' },
  field: { display:'flex', flexDirection:'column', gap:'6px', flex:1 },
  label: { fontSize:'11px', fontWeight:'700', color:'var(--ink)', letterSpacing:'0.07em', textTransform:'uppercase' },
  input: { padding:'10px 12px', border:'1.5px solid var(--border)', borderRadius:'8px', fontSize:'14px', background:'var(--white)', color:'var(--ink)', width:'100%' },
  cancelBtn: { padding:'10px 22px', background:'transparent', color:'var(--muted)', border:'1.5px solid var(--border)', borderRadius:'8px', fontSize:'14px' },
  empty: { color:'var(--muted)', fontSize:'14px', padding:'16px 0' },
};
