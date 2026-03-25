import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:        '#0A0F1E',
  bgCard:    '#111827',
  bgMid:     '#0D1526',
  border:    '#1E2D45',
  accent:    '#38BDF8',
  accentDim: '#0EA5E9',
  accentGlow:'rgba(56,189,248,0.18)',
  gold:      '#F59E0B',
  green:     '#10B981',
  red:       '#EF4444',
  textPri:   '#F0F6FF',
  textSec:   '#8BA3C0',
  textMut:   '#4A6080',
  fontHead:  "'Syne', sans-serif",
  fontBody:  "'DM Sans', sans-serif",
  radius:    '12px',
  radiusSm:  '8px',
  shadow:    '0 4px 24px rgba(0,0,0,0.45)',
  shadowGlow:'0 0 30px rgba(56,189,248,0.12)',
}

// ─── GLOBAL RESET ─────────────────────────────────────────────────────────────
const globalStyle = document.createElement('style')
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: ${T.bg}; color: ${T.textPri}; font-family: ${T.fontBody}; }
  ::-webkit-scrollbar { width: 6px; } 
  ::-webkit-scrollbar-track { background: ${T.bg}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
  a { color: inherit; text-decoration: none; }
  button { cursor: pointer; border: none; outline: none; }
  input, textarea { outline: none; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
`
document.head.appendChild(globalStyle)

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `3px solid ${T.border}`,
        borderTopColor: T.accent,
        animation: 'spin 0.8s linear infinite'
      }} />
    </div>
  )
}

function Btn({ children, onClick, variant='primary', disabled=false, style={}, type='button', small=false }) {
  const base = {
    fontFamily: T.fontHead, fontWeight: 600, letterSpacing: '0.03em',
    borderRadius: T.radiusSm, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease', opacity: disabled ? 0.5 : 1,
    padding: small ? '8px 16px' : '12px 24px',
    fontSize: small ? '13px' : '14px',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    ...style
  }
  const variants = {
    primary:  { background: T.accent, color: T.bg, boxShadow: `0 0 20px ${T.accentGlow}` },
    secondary:{ background: 'transparent', color: T.accent, border: `1.5px solid ${T.accent}` },
    ghost:    { background: 'transparent', color: T.textSec, border: `1.5px solid ${T.border}` },
    danger:   { background: T.red, color: '#fff' },
    success:  { background: T.green, color: '#fff' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  )
}

function Input({ label, type='text', value, onChange, placeholder, error }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
      {label && <label style={{ fontFamily: T.fontHead, fontSize: 13, color: T.textSec, letterSpacing:'0.04em' }}>{label}</label>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          background: T.bgCard, border: `1.5px solid ${error ? T.red : T.border}`,
          borderRadius: T.radiusSm, padding: '12px 16px',
          color: T.textPri, fontFamily: T.fontBody, fontSize: 14,
          width: '100%', transition: 'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = T.accent}
        onBlur={e => e.target.style.borderColor = error ? T.red : T.border}
      />
      {error && <span style={{ fontSize: 12, color: T.red }}>{error}</span>}
    </div>
  )
}

function Card({ children, style={}, glow=false }) {
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: 24,
      boxShadow: glow ? T.shadowGlow : T.shadow,
      ...style
    }}>
      {children}
    </div>
  )
}

function Badge({ children, color=T.accent }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 99, fontSize: 11, fontWeight: 600,
      fontFamily: T.fontHead, letterSpacing: '0.05em',
      background: `${color}22`, color, border: `1px solid ${color}44`
    }}>
      {children}
    </span>
  )
}

function Alert({ message, type='error', onClose }) {
  if (!message) return null
  const colors = { error: T.red, success: T.green, info: T.accent }
  const c = colors[type] || T.accent
  return (
    <div style={{
      background: `${c}18`, border: `1px solid ${c}44`,
      borderRadius: T.radiusSm, padding: '12px 16px',
      color: c, fontSize: 13, fontFamily: T.fontBody,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8
    }}>
      <span>{message}</span>
      {onClose && <button onClick={onClose} style={{ background:'none', color: c, fontSize: 16, lineHeight:1 }}>×</button>}
    </div>
  )
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ user, onSignOut }) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = user
    ? [{ to:'/dashboard', label:'Dashboard' }, { to:'/skills', label:'Skills' }, { to:'/admin', label:'Admin' }]
    : [{ to:'/', label:'Home' }, { to:'/login', label:'Sign In' }]

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: `${T.bg}ee`, backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height: 64 }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily: T.fontHead, fontWeight: 800, color: T.bg, fontSize: 18 }}>S</span>
          </div>
          <span style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 18, color: T.textPri, letterSpacing: '-0.02em' }}>
            Skillery<span style={{ color: T.accent }}>Pro</span>
          </span>
        </Link>

        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} style={{
              fontFamily: T.fontHead, fontSize: 13, fontWeight: 500,
              color: location.pathname === l.to ? T.accent : T.textSec,
              padding: '6px 14px', borderRadius: T.radiusSm,
              background: location.pathname === l.to ? T.accentGlow : 'transparent',
              transition: 'all 0.2s', letterSpacing: '0.02em'
            }}>
              {l.label}
            </Link>
          ))}
          {user && (
            <Btn small variant="ghost" onClick={onSignOut}>Sign Out</Btn>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage() {
  const navigate = useNavigate()

  const features = [
    { icon:'🎯', title:'Easy Skill Discovery', desc:'Quickly find skills that match your interests and goals.' },
    { icon:'⚡', title:'Fast Performance', desc:'Optimized for quick loading and smooth interaction.' },
    { icon:'📚', title:'Structured Learning', desc:'Step-by-step learning paths guide your progress.' },
    { icon:'🔒', title:'Secure & Reliable', desc:'Your data is protected with enterprise-grade security.' },
    { icon:'📱', title:'Access Anywhere', desc:'Works seamlessly on desktop, tablet, and mobile.' },
    { icon:'🚀', title:'Admin Control Panel', desc:'Powerful dashboard for managing platform content.' },
    { icon:'🔄', title:'Real-Time Updates', desc:'Content changes reflect instantly across the platform.' },
    { icon:'🌱', title:'Growing Library', desc:'New skills and content added as the platform expands.' },
  ]

  const stats = [
    { value: '200+', label: 'Skills Available' },
    { value: '50K+', label: 'Active Learners' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '24/7', label: 'Platform Uptime' },
  ]

  return (
    <div style={{ fontFamily: T.fontBody }}>
      {/* Hero */}
      <section style={{
        minHeight: '90vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', textAlign:'center',
        padding: '80px 24px', position:'relative', overflow:'hidden'
      }}>
        {/* background glow */}
        <div style={{
          position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width: 600, height: 600, borderRadius:'50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
          pointerEvents:'none'
        }} />

        <div style={{ animation: 'fadeUp 0.7s ease both', maxWidth: 760 }}>
          <Badge color={T.accent}>🚀 Version 1.0 — Now Live</Badge>
          <h1 style={{
            fontFamily: T.fontHead, fontWeight: 800, letterSpacing: '-0.04em',
            fontSize: 'clamp(38px, 7vw, 76px)', lineHeight: 1.05,
            color: T.textPri, marginTop: 24, marginBottom: 20
          }}>
            Learn any skill.<br/>
            <span style={{ color: T.accent }}>Level up faster.</span>
          </h1>
          <p style={{ fontSize: 18, color: T.textSec, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' }}>
            Skillery Pro is a modern platform for discovering, learning, and organizing practical skills — all in one clean, fast interface.
          </p>
          <div style={{ display:'flex', gap: 14, justifyContent:'center', flexWrap:'wrap' }}>
            <Btn onClick={() => navigate('/signup')} style={{ padding:'14px 32px', fontSize:15 }}>
              Get Started Free →
            </Btn>
            <Btn variant="secondary" onClick={() => navigate('/login')} style={{ padding:'14px 32px', fontSize:15 }}>
              Sign In
            </Btn>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '40px 24px', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth: 900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:24, textAlign:'center' }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: 36, color: T.accent }}>{s.value}</div>
              <div style={{ color: T.textSec, fontSize: 14, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom: 56 }}>
            <h2 style={{ fontFamily: T.fontHead, fontSize: 36, fontWeight: 700, letterSpacing:'-0.03em' }}>
              Everything you need to <span style={{ color: T.accent }}>grow</span>
            </h2>
            <p style={{ color: T.textSec, marginTop: 12, fontSize: 16 }}>20 standout features designed around real learners.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {features.map(f => (
              <Card key={f.title} style={{ padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: T.textSec, fontSize: 13, lineHeight: 1.6 }}>{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign:'center' }}>
        <Card style={{ maxWidth: 600, margin:'0 auto', padding:'48px 32px', background:`linear-gradient(135deg, ${T.bgCard}, ${T.bgMid})` }} glow>
          <h2 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 30, letterSpacing:'-0.03em', marginBottom: 16 }}>
            Ready to start learning?
          </h2>
          <p style={{ color: T.textSec, marginBottom: 28, lineHeight: 1.6 }}>
            Join thousands of learners already growing with Skillery Pro.
          </p>
          <Btn onClick={() => navigate('/signup')} style={{ padding:'14px 40px', fontSize: 15 }}>
            Create Free Account
          </Btn>
        </Card>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 24px', borderTop:`1px solid ${T.border}`, textAlign:'center' }}>
        <p style={{ color: T.textMut, fontSize: 13 }}>
          © {new Date().getFullYear()} Skillery Pro. Built with React + Supabase.
        </p>
      </footer>
    </div>
  )
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthLayout({ children, title, subtitle }) {
  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding: 24, background: T.bg
    }}>
      <div style={{ width:'100%', maxWidth: 440, animation:'fadeUp 0.5s ease both' }}>
        <div style={{ textAlign:'center', marginBottom: 32 }}>
          <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:T.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:T.fontHead, fontWeight:800, color:T.bg, fontSize:20 }}>S</span>
            </div>
            <span style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:18 }}>Skillery<span style={{color:T.accent}}>Pro</span></span>
          </Link>
          <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:26, letterSpacing:'-0.03em' }}>{title}</h1>
          <p style={{ color:T.textSec, marginTop:8, fontSize:14 }}>{subtitle}</p>
        </div>
        <Card glow>{children}</Card>
      </div>
    </div>
  )
}

function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) { setError(err.message); return }
    navigate('/dashboard')
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Skillery Pro account">
      <div style={{ display:'flex', flexDirection:'column', gap: 18 }}>
        {error && <Alert message={error} onClose={() => setError('')} />}
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        <Btn onClick={handleSubmit} disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Btn>
        <p style={{ textAlign:'center', fontSize:13, color:T.textSec }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color:T.accent, fontWeight:500 }}>Sign up</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error: err } = await signUp(email, password, name)
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
  }

  if (success) return (
    <AuthLayout title="Check your email" subtitle="We sent you a confirmation link">
      <div style={{ textAlign:'center', padding: '16px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <p style={{ color:T.textSec, lineHeight:1.6, marginBottom:24 }}>
          We've sent a confirmation link to <strong style={{color:T.textPri}}>{email}</strong>. Click it to activate your account.
        </p>
        <Btn onClick={() => navigate('/login')} style={{ width:'100%', justifyContent:'center' }}>Go to Login</Btn>
      </div>
    </AuthLayout>
  )

  return (
    <AuthLayout title="Create your account" subtitle="Start your learning journey today">
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        {error && <Alert message={error} onClose={() => setError('')} />}
        <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" />
        <Btn onClick={handleSubmit} disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
          {loading ? 'Creating account…' : 'Create Account'}
        </Btn>
        <p style={{ textAlign:'center', fontSize:13, color:T.textSec }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:T.accent, fontWeight:500 }}>Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardPage({ user }) {
  const [skills, setSkills] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from('skills').select('*').limit(6).order('created_at', { ascending: false }),
        supabase.from('user_progress').select('*, skills(title)').eq('user_id', user.id).limit(5)
      ])
      setSkills(s || [])
      setProgress(p || [])
      setLoading(false)
    }
    fetchData()
  }, [user.id])

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:28, letterSpacing:'-0.03em' }}>
          {greeting}, <span style={{ color:T.accent }}>{displayName}</span> 👋
        </h1>
        <p style={{ color:T.textSec, marginTop:6, fontSize:15 }}>Here's your learning overview for today.</p>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:16, marginBottom:36 }}>
        {[
          { label:'Skills Enrolled', value: progress.length, icon:'📚', color:T.accent },
          { label:'Completed', value: progress.filter(p => p.completed).length, icon:'✅', color:T.green },
          { label:'In Progress', value: progress.filter(p => !p.completed).length, icon:'⚡', color:T.gold },
          { label:'Available Skills', value: skills.length, icon:'🎯', color:'#A78BFA' },
        ].map(s => (
          <Card key={s.label} style={{ padding:'20px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:28, color:s.color }}>{s.value}</div>
            <div style={{ color:T.textSec, fontSize:12, marginTop:4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* Recent Skills */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16 }}>Recent Skills</h2>
            <Link to="/skills" style={{ fontSize:13, color:T.accent }}>View all →</Link>
          </div>
          {skills.length === 0
            ? <p style={{ color:T.textSec, fontSize:14 }}>No skills yet. Check back soon!</p>
            : skills.map(s => (
              <div key={s.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 0', borderBottom:`1px solid ${T.border}`
              }}>
                <div>
                  <div style={{ fontWeight:500, fontSize:14 }}>{s.title}</div>
                  <div style={{ color:T.textSec, fontSize:12, marginTop:2 }}>{s.category}</div>
                </div>
                <Badge color={s.level === 'Advanced' ? T.red : s.level === 'Intermediate' ? T.gold : T.green}>
                  {s.level || 'Beginner'}
                </Badge>
              </div>
            ))
          }
        </Card>

        {/* My Progress */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16 }}>My Progress</h2>
          </div>
          {progress.length === 0
            ? (
              <div style={{ textAlign:'center', padding:'24px 0' }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🌱</div>
                <p style={{ color:T.textSec, fontSize:14 }}>You haven't started any skills yet.</p>
                <Link to="/skills" style={{ color:T.accent, fontSize:13, marginTop:8, display:'inline-block' }}>Browse Skills →</Link>
              </div>
            )
            : progress.map(p => (
              <div key={p.id} style={{ padding:'12px 0', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:500 }}>{p.skills?.title || 'Skill'}</span>
                  <span style={{ fontSize:12, color:T.textSec }}>{p.progress_pct || 0}%</span>
                </div>
                <div style={{ height:4, background:T.border, borderRadius:2 }}>
                  <div style={{ height:'100%', width:`${p.progress_pct || 0}%`, background:T.accent, borderRadius:2, transition:'width 0.4s' }} />
                </div>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  )
}

// ─── SKILLS BROWSER ───────────────────────────────────────────────────────────
function SkillsPage({ user }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [enrolling, setEnrolling] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('skills').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setSkills(data || []); setLoading(false) })
  }, [])

  const categories = ['All', ...new Set(skills.map(s => s.category).filter(Boolean))]

  const filtered = skills.filter(s => {
    const matchSearch = s.title?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || s.category === category
    return matchSearch && matchCat
  })

  const enroll = async (skillId) => {
    setEnrolling(skillId)
    const { error } = await supabase.from('user_progress').upsert({ user_id: user.id, skill_id: skillId, progress_pct: 0, completed: false })
    setEnrolling(null)
    setMsg(error ? { type:'error', text: error.message } : { type:'success', text:'Enrolled successfully!' })
    setTimeout(() => setMsg(null), 3000)
  }

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px' }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:28, letterSpacing:'-0.03em' }}>Skill Library</h1>
        <p style={{ color:T.textSec, marginTop:6 }}>Explore and enroll in skills to start learning.</p>
      </div>

      {msg && <div style={{ marginBottom:16 }}><Alert message={msg.text} type={msg.type} onClose={() => setMsg(null)} /></div>}

      {/* Filters */}
      <div style={{ display:'flex', gap:12, marginBottom:28, flexWrap:'wrap', alignItems:'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search skills…"
          style={{
            background:T.bgCard, border:`1.5px solid ${T.border}`,
            borderRadius:T.radiusSm, padding:'10px 16px',
            color:T.textPri, fontFamily:T.fontBody, fontSize:14, flex:1, minWidth:200
          }}
        />
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              fontFamily:T.fontHead, fontSize:12, fontWeight:600,
              padding:'7px 14px', borderRadius:99, border:'none', cursor:'pointer',
              background: category === c ? T.accent : T.bgCard,
              color: category === c ? T.bg : T.textSec,
              transition:'all 0.15s'
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0
        ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:T.textSec }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
            <p>No skills found. Try a different search or category.</p>
          </div>
        )
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:20 }}>
            {filtered.map(s => (
              <Card key={s.id} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <Badge color={T.accent}>{s.category || 'General'}</Badge>
                  <Badge color={s.level === 'Advanced' ? T.red : s.level === 'Intermediate' ? T.gold : T.green}>
                    {s.level || 'Beginner'}
                  </Badge>
                </div>
                <h3 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:17 }}>{s.title}</h3>
                <p style={{ color:T.textSec, fontSize:13, lineHeight:1.6, flex:1 }}>{s.description || 'No description available.'}</p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                  <span style={{ fontSize:12, color:T.textMut }}>
                    {s.duration ? `⏱ ${s.duration}` : ''}
                  </span>
                  <Btn small onClick={() => enroll(s.id)} disabled={enrolling === s.id}>
                    {enrolling === s.id ? 'Enrolling…' : 'Enroll'}
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPage() {
  const [tab, setTab] = useState('skills')
  const [skills, setSkills] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title:'', description:'', category:'', level:'Beginner', duration:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchSkills = useCallback(async () => {
    const { data } = await supabase.from('skills').select('*').order('created_at', { ascending:false })
    setSkills(data || [])
  }, [])

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('user_progress').select('user_id, completed, progress_pct, skills(title)')
    setUsers(data || [])
  }, [])

  useEffect(() => {
    Promise.all([fetchSkills(), fetchUsers()]).then(() => setLoading(false))
  }, [fetchSkills, fetchUsers])

  const saveSkill = async () => {
    if (!form.title) { setMsg({ type:'error', text:'Title is required.' }); return }
    setSaving(true)
    const { error } = await supabase.from('skills').insert([form])
    setSaving(false)
    if (error) { setMsg({ type:'error', text: error.message }); return }
    setMsg({ type:'success', text:'Skill added successfully!' })
    setForm({ title:'', description:'', category:'', level:'Beginner', duration:'' })
    fetchSkills()
    setTimeout(() => setMsg(null), 3000)
  }

  const deleteSkill = async (id) => {
    setDeleting(id)
    await supabase.from('skills').delete().eq('id', id)
    setDeleting(null)
    fetchSkills()
  }

  if (loading) return <Spinner />

  const tabs = [
    { id:'skills', label:'📚 Skills' },
    { id:'add', label:'➕ Add Skill' },
    { id:'users', label:'👥 Users' },
  ]

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px' }}>
      <div style={{ marginBottom:32, display:'flex', alignItems:'center', gap:14 }}>
        <div>
          <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:28, letterSpacing:'-0.03em' }}>Admin Panel</h1>
          <p style={{ color:T.textSec, marginTop:4 }}>Manage skills, content, and platform data.</p>
        </div>
        <Badge color={T.gold}>Admin</Badge>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:28, borderBottom:`1px solid ${T.border}`, paddingBottom:0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontFamily:T.fontHead, fontSize:13, fontWeight:600,
            padding:'10px 20px', borderRadius:`${T.radiusSm} ${T.radiusSm} 0 0`,
            background: tab === t.id ? T.bgCard : 'transparent',
            color: tab === t.id ? T.accent : T.textSec,
            border: tab === t.id ? `1px solid ${T.border}` : '1px solid transparent',
            borderBottom: tab === t.id ? `1px solid ${T.bgCard}` : 'none',
            marginBottom: -1, cursor:'pointer', transition:'all 0.15s'
          }}>{t.label}</button>
        ))}
      </div>

      {msg && <div style={{ marginBottom:16 }}><Alert message={msg.text} type={msg.type} onClose={() => setMsg(null)} /></div>}

      {/* Skills list */}
      {tab === 'skills' && (
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16 }}>All Skills ({skills.length})</h2>
          </div>
          {skills.length === 0
            ? <p style={{ color:T.textSec, fontSize:14 }}>No skills yet. Add one using the "Add Skill" tab.</p>
            : (
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {skills.map(s => (
                  <div key={s.id} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'14px 0', borderBottom:`1px solid ${T.border}`
                  }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:500, fontSize:14 }}>{s.title}</div>
                      <div style={{ color:T.textSec, fontSize:12, marginTop:2 }}>{s.category} · {s.level}</div>
                    </div>
                    <Btn small variant="danger" onClick={() => deleteSkill(s.id)} disabled={deleting === s.id}>
                      {deleting === s.id ? '…' : 'Delete'}
                    </Btn>
                  </div>
                ))}
              </div>
            )
          }
        </Card>
      )}

      {/* Add skill form */}
      {tab === 'add' && (
        <Card style={{ maxWidth: 560 }}>
          <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:18, marginBottom:24 }}>Add New Skill</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <Input label="Skill Title *" value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="e.g. JavaScript Fundamentals" />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontFamily:T.fontHead, fontSize:13, color:T.textSec, letterSpacing:'0.04em' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})}
                placeholder="What will learners gain from this skill?"
                rows={3}
                style={{
                  background:T.bgCard, border:`1.5px solid ${T.border}`, borderRadius:T.radiusSm,
                  padding:'12px 16px', color:T.textPri, fontFamily:T.fontBody, fontSize:14,
                  resize:'vertical', width:'100%'
                }}
              />
            </div>
            <Input label="Category" value={form.category} onChange={e => setForm({...form, category:e.target.value})} placeholder="e.g. Programming, Design, Business" />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontFamily:T.fontHead, fontSize:13, color:T.textSec, letterSpacing:'0.04em' }}>Level</label>
              <select value={form.level} onChange={e => setForm({...form, level:e.target.value})}
                style={{
                  background:T.bgCard, border:`1.5px solid ${T.border}`, borderRadius:T.radiusSm,
                  padding:'12px 16px', color:T.textPri, fontFamily:T.fontBody, fontSize:14, width:'100%'
                }}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <Input label="Duration" value={form.duration} onChange={e => setForm({...form, duration:e.target.value})} placeholder="e.g. 4 hours, 2 weeks" />
            <Btn onClick={saveSkill} disabled={saving} style={{ justifyContent:'center' }}>
              {saving ? 'Saving…' : '+ Add Skill'}
            </Btn>
          </div>
        </Card>
      )}

      {/* Users */}
      {tab === 'users' && (
        <Card>
          <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16, marginBottom:20 }}>
            User Progress ({users.length} records)
          </h2>
          {users.length === 0
            ? <p style={{ color:T.textSec, fontSize:14 }}>No user progress data yet.</p>
            : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr>
                      {['User ID', 'Skill', 'Progress', 'Status'].map(h => (
                        <th key={h} style={{
                          fontFamily:T.fontHead, fontWeight:600, color:T.textSec,
                          padding:'10px 12px', textAlign:'left', borderBottom:`1px solid ${T.border}`,
                          fontSize:12, letterSpacing:'0.04em'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={i}>
                        <td style={{ padding:'12px', borderBottom:`1px solid ${T.border}`, color:T.textSec, fontFamily:'monospace', fontSize:11 }}>
                          {u.user_id?.slice(0,8)}…
                        </td>
                        <td style={{ padding:'12px', borderBottom:`1px solid ${T.border}` }}>{u.skills?.title || '—'}</td>
                        <td style={{ padding:'12px', borderBottom:`1px solid ${T.border}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:4, background:T.border, borderRadius:2 }}>
                              <div style={{ height:'100%', width:`${u.progress_pct||0}%`, background:T.accent, borderRadius:2 }} />
                            </div>
                            <span style={{ color:T.textSec, minWidth:30 }}>{u.progress_pct||0}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'12px', borderBottom:`1px solid ${T.border}` }}>
                          <Badge color={u.completed ? T.green : T.gold}>{u.completed ? 'Done' : 'Active'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Card>
      )}
    </div>
  )
}

// ─── PROTECTED ROUTE ──────────────────────────────────────────────────────────
function Protected({ user, loading, children }) {
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight:'100vh', background:T.bg, color:T.textPri, fontFamily:T.fontBody }}>
        <Routes>
          {/* Public – no navbar */}
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Pages with navbar */}
          <Route path="*" element={
            <>
              <Navbar user={user} onSignOut={handleSignOut} />
              <Routes>
                <Route path="/"          element={<LandingPage />} />
                <Route path="/dashboard" element={<Protected user={user} loading={loading}><DashboardPage user={user} /></Protected>} />
                <Route path="/skills"    element={<Protected user={user} loading={loading}><SkillsPage user={user} /></Protected>} />
                <Route path="/admin"     element={<Protected user={user} loading={loading}><AdminPage /></Protected>} />
                <Route path="*"          element={
                  <div style={{ textAlign:'center', padding:'120px 24px' }}>
                    <h1 style={{ fontFamily:T.fontHead, fontSize:64, color:T.accent }}>404</h1>
                    <p style={{ color:T.textSec, margin:'12px 0 24px' }}>Page not found.</p>
                    <Link to="/" style={{ color:T.accent }}>← Go Home</Link>
                  </div>
                } />
              </Routes>
            </>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
