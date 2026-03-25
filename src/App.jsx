import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom'
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

// ─── GLOBAL STYLES + ANIMATIONS ──────────────────────────────────────────────
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
  @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
  .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.5); }
  .fade-up { animation: fadeUp 0.5s ease both; }
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

function Card({ children, style={}, glow=false, hover=false }) {
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: 24,
      boxShadow: glow ? T.shadowGlow : T.shadow,
      transition: 'transform 0.2s, box-shadow 0.2s',
      ...(hover ? { cursor: 'pointer', ':hover': { transform: 'translateY(-4px)' } } : {}),
      ...style
    }} className={hover ? 'card-hover' : ''}>
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

// ─── RATING STARS ─────────────────────────────────────────────────────────────
function RatingStars({ rating, onRate, readonly = false, size = 18 }) {
  const [hover, setHover] = useState(0)
  const stars = [1,2,3,4,5]
  return (
    <div style={{ display:'flex', gap: 4 }}>
      {stars.map(star => (
        <span
          key={star}
          onClick={() => !readonly && onRate?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            fontSize: size,
            cursor: readonly ? 'default' : 'pointer',
            color: (hover || rating) >= star ? T.gold : T.textMut,
            transition: 'transform 0.1s'
          }}
        >★</span>
      ))}
    </div>
  )
}

// ─── NAVBAR (shows Admin only if user is trainer or superadmin) ─────────────
function Navbar({ user, onSignOut }) {
  const location = useLocation()
  const isTrainer = user?.user_metadata?.role === 'trainer' || user?.email === 'admin@example.com'

  const navLinks = user
    ? [
        { to:'/dashboard', label:'Dashboard' },
        { to:'/skills', label:'Skills' },
        ...(isTrainer ? [{ to:'/admin', label:'Manage Skills' }] : [])
      ]
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

// ─── LANDING PAGE (with top rated skills and latest reviews) ─────────────────
function LandingPage() {
  const navigate = useNavigate()
  const [topSkills, setTopSkills] = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const { data: reviews } = await supabase.from('reviews').select('skill_id, rating')
        const ratingMap = {}
        reviews?.forEach(r => {
          if (!ratingMap[r.skill_id]) ratingMap[r.skill_id] = { sum: 0, count: 0 }
          ratingMap[r.skill_id].sum += r.rating
          ratingMap[r.skill_id].count++
        })

        const { data: skills } = await supabase.from('skills').select('*')
        const skillsWithRating = skills?.map(s => ({
          ...s,
          avgRating: ratingMap[s.id] ? (ratingMap[s.id].sum / ratingMap[s.id].count).toFixed(1) : 0,
          reviewCount: ratingMap[s.id]?.count || 0
        })) || []
        skillsWithRating.sort((a, b) => b.avgRating - a.avgRating)
        setTopSkills(skillsWithRating.slice(0, 6))

        const { data: latestReviews } = await supabase
          .from('reviews')
          .select('*, users(email), skills(title)')
          .order('created_at', { ascending: false })
          .limit(3)
        setRecentReviews(latestReviews || [])
      } catch (err) {
        console.error('Error fetching home data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHomeData()
  }, [])

  const features = [
    { icon:'🎯', title:'Easy Skill Discovery', desc:'Quickly find skills that match your interests and goals.' },
    { icon:'⚡', title:'Fast Performance', desc:'Optimized for quick loading and smooth interaction.' },
    { icon:'📚', title:'Structured Learning', desc:'Step-by-step learning paths guide your progress.' },
    { icon:'🔒', title:'Secure & Reliable', desc:'Your data is protected with enterprise-grade security.' },
    { icon:'📱', title:'Access Anywhere', desc:'Works seamlessly on desktop, tablet, and mobile.' },
    { icon:'🚀', title:'Trainer Dashboard', desc:'Trainers can create and manage skills easily.' },
    { icon:'🔄', title:'Real-Time Updates', desc:'Content changes reflect instantly across the platform.' },
    { icon:'🌱', title:'Growing Library', desc:'New skills added as the platform expands.' },
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
        <div style={{
          position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width: 600, height: 600, borderRadius:'50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
          pointerEvents:'none'
        }} />

        <div style={{ animation: 'fadeUp 0.7s ease both', maxWidth: 760 }}>
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

      {/* Top Rated Skills */}
      <section style={{ padding: '80px 24px', background: T.bgMid }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: T.fontHead, fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>
              Top Rated <span style={{ color: T.accent }}>Courses</span>
            </h2>
            <p style={{ color: T.textSec, marginTop: 12 }}>Our community's favorites — highly recommended by learners.</p>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center' }}><Spinner /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {topSkills.map(skill => (
                <Card key={skill.id} hover style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Badge color={T.accent}>{skill.category || 'General'}</Badge>
                    <RatingStars rating={parseFloat(skill.avgRating)} readonly size={14} />
                  </div>
                  <Link to={`/skill/${skill.id}`} style={{ textDecoration: 'none' }}>
                    <h3 style={{ fontFamily: T.fontHead, fontSize: 18, fontWeight: 600, marginBottom: 8, color: T.textPri }}>
                      {skill.title}
                    </h3>
                  </Link>
                  <p style={{ color: T.textSec, fontSize: 13, marginBottom: 12 }}>{skill.description?.substring(0, 100)}...</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: T.textMut }}>{skill.reviewCount} {skill.reviewCount === 1 ? 'review' : 'reviews'}</span>
                    <Btn small onClick={() => navigate(`/skill/${skill.id}`)}>View Course</Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Reviews */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: T.fontHead, fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>
              What <span style={{ color: T.accent }}>Learners</span> Say
            </h2>
            <p style={{ color: T.textSec, marginTop: 12 }}>Real experiences from our community.</p>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center' }}><Spinner /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {recentReviews.map(review => (
                <Card key={review.id} style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{review.users?.email?.split('@')[0] || 'Anonymous'}</div>
                      <div style={{ fontSize: 12, color: T.textSec }}>reviewed <strong>{review.skills?.title}</strong></div>
                    </div>
                    <RatingStars rating={review.rating} readonly size={14} />
                  </div>
                  <p style={{ color: T.textSec, fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
                    "{review.comment || 'Great course! Really helped me level up.'}"
                  </p>
                  <div style={{ fontSize: 11, color: T.textMut }}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </Card>
              ))}
            </div>
          )}
          {!loading && recentReviews.length === 0 && (
            <div style={{ textAlign: 'center', color: T.textSec }}>
              No reviews yet. Be the first to share your experience!
            </div>
          )}
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
            {features.map((f, i) => (
              <Card key={f.title} style={{ padding: 20, animation: `fadeUp 0.5s ease both ${i * 0.05}s` }}>
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

// ─── AUTH PAGES (with role selection) ────────────────────────────────────────
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
  const [role, setRole] = useState('learner') // 'learner' or 'trainer'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    // Pass role in metadata
    const { error: err } = await signUp(email, password, name, { role })
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
        
        <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
          <label style={{ fontFamily: T.fontHead, fontSize: 13, color: T.textSec, letterSpacing:'0.04em' }}>I want to be a...</label>
          <div style={{ display:'flex', gap: 24 }}>
            <label style={{ display:'flex', alignItems:'center', gap: 8, cursor:'pointer' }}>
              <input
                type="radio"
                name="role"
                value="learner"
                checked={role === 'learner'}
                onChange={() => setRole('learner')}
                style={{ width: 16, height: 16, cursor:'pointer' }}
              />
              <span style={{ fontSize: 14 }}>Learner (enroll in courses)</span>
            </label>
            <label style={{ display:'flex', alignItems:'center', gap: 8, cursor:'pointer' }}>
              <input
                type="radio"
                name="role"
                value="trainer"
                checked={role === 'trainer'}
                onChange={() => setRole('trainer')}
                style={{ width: 16, height: 16, cursor:'pointer' }}
              />
              <span style={{ fontSize: 14 }}>Trainer (create and manage courses)</span>
            </label>
          </div>
        </div>

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

// ─── DASHBOARD (improved) ─────────────────────────────────────────────────────
function DashboardPage({ user }) {
  const [skills, setSkills] = useState([])
  const [progress, setProgress] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: s }, { data: p }, { data: r }] = await Promise.all([
        supabase.from('skills').select('*').limit(8).order('created_at', { ascending: false }),
        supabase.from('user_progress').select('*, skills(title, id)').eq('user_id', user.id),
        supabase.from('reviews').select('*, skills(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
      ])
      setSkills(s || [])
      setProgress(p || [])
      setReviews(r || [])
      setLoading(false)
    }
    fetchData()
  }, [user.id])

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const totalProgress = progress.length
  const completed = progress.filter(p => p.completed).length
  const inProgress = totalProgress - completed
  const avgProgress = totalProgress ? Math.round(progress.reduce((acc, p) => acc + (p.progress_pct || 0), 0) / totalProgress) : 0

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px' }}>
      <div style={{ marginBottom: 36, animation: 'fadeUp 0.4s ease' }}>
        <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:28, letterSpacing:'-0.03em' }}>
          {greeting}, <span style={{ color:T.accent }}>{displayName}</span> 👋
        </h1>
        <p style={{ color:T.textSec, marginTop:6, fontSize:15 }}>Here's your learning overview for today.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:16, marginBottom:36 }}>
        {[
          { label:'Skills Enrolled', value: totalProgress, icon:'📚', color:T.accent },
          { label:'Completed', value: completed, icon:'✅', color:T.green },
          { label:'In Progress', value: inProgress, icon:'⚡', color:T.gold },
          { label:'Avg Progress', value: `${avgProgress}%`, icon:'📊', color:'#A78BFA' },
        ].map(s => (
          <Card key={s.label} style={{ padding:'20px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:28, color:s.color }}>{s.value}</div>
            <div style={{ color:T.textSec, fontSize:12, marginTop:4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16 }}>My Enrolled Skills</h2>
            <Link to="/skills" style={{ fontSize:13, color:T.accent }}>Browse more →</Link>
          </div>
          {progress.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🌱</div>
              <p style={{ color:T.textSec, fontSize:14 }}>You haven't enrolled in any skills yet.</p>
              <Link to="/skills" style={{ color:T.accent, fontSize:13, marginTop:8, display:'inline-block' }}>Start Learning →</Link>
            </div>
          ) : (
            progress.map(p => (
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
          )}
        </Card>

        <Card>
          <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16, marginBottom:20 }}>Your Recent Reviews</h2>
          {reviews.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>✍️</div>
              <p style={{ color:T.textSec, fontSize:14 }}>You haven't written any reviews yet.</p>
              <Link to="/skills" style={{ color:T.accent, fontSize:13, marginTop:8, display:'inline-block' }}>Rate a skill →</Link>
            </div>
          ) : (
            reviews.map(r => (
              <div key={r.id} style={{ padding:'12px 0', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:14, fontWeight:500 }}>{r.skills?.title}</span>
                  <RatingStars rating={r.rating} readonly size={14} />
                </div>
                <p style={{ color:T.textSec, fontSize:12, marginTop:4 }}>{r.comment?.substring(0, 60)}...</p>
              </div>
            ))
          )}
        </Card>
      </div>

      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:18, marginBottom:16 }}>🔥 Recommended for you</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:20 }}>
          {skills.slice(0, 4).map(skill => (
            <Card key={skill.id} hover style={{ padding: 16 }}>
              <h3 style={{ fontSize:16, fontWeight:600 }}>{skill.title}</h3>
              <p style={{ fontSize:12, color:T.textSec, marginTop:4 }}>{skill.category}</p>
              <Link to={`/skill/${skill.id}`} style={{ fontSize:12, color:T.accent, marginTop:12, display:'inline-block' }}>View →</Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── SKILL DETAIL PAGE (with modules) ────────────────────────────────────────
function SkillDetailPage({ user }) {
  const { skillId } = useParams()
  const [skill, setSkill] = useState(null)
  const [modules, setModules] = useState([])
  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(0)
  const [userRating, setUserRating] = useState(null)
  const [userComment, setUserComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [enrolled, setEnrolled] = useState(false)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: skillData } = await supabase.from('skills').select('*').eq('id', skillId).single()
      setSkill(skillData)

      // Fetch modules for this skill
      const { data: modulesData } = await supabase
        .from('skill_modules')
        .select('*')
        .eq('skill_id', skillId)
        .order('order_index', { ascending: true })
      setModules(modulesData || [])

      const { data: reviewsData } = await supabase.from('reviews').select('*, users(email)').eq('skill_id', skillId).order('created_at', { ascending: false })
      setReviews(reviewsData || [])
      const avg = reviewsData?.length ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length).toFixed(1) : 0
      setAvgRating(avg)

      if (user) {
        const { data: prog } = await supabase.from('user_progress').select('*').eq('user_id', user.id).eq('skill_id', skillId).maybeSingle()
        setEnrolled(!!prog)
        setProgress(prog)

        const { data: myReview } = await supabase.from('reviews').select('*').eq('user_id', user.id).eq('skill_id', skillId).maybeSingle()
        if (myReview) {
          setUserRating(myReview.rating)
          setUserComment(myReview.comment || '')
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [skillId, user])

  const enroll = async () => {
    const { error } = await supabase.from('user_progress').upsert({ user_id: user.id, skill_id: skillId, progress_pct: 0, completed: false })
    if (!error) setEnrolled(true)
    else setMessage('Enrollment failed')
  }

  const updateProgress = async (newPct) => {
    const { error } = await supabase.from('user_progress').update({ progress_pct: newPct, completed: newPct >= 100 }).eq('id', progress.id)
    if (!error) setProgress({ ...progress, progress_pct: newPct, completed: newPct >= 100 })
  }

  const submitReview = async () => {
    if (!userRating) { setMessage('Please select a rating'); return }
    setSubmitting(true)
    const { error } = await supabase.from('reviews').upsert({
      user_id: user.id,
      skill_id: skillId,
      rating: userRating,
      comment: userComment,
    }, { onConflict: 'user_id, skill_id' })
    if (!error) {
      setMessage('Review saved!')
      const { data } = await supabase.from('reviews').select('*, users(email)').eq('skill_id', skillId).order('created_at', { ascending: false })
      setReviews(data || [])
    } else setMessage('Error saving review')
    setSubmitting(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const getMediaIcon = (type) => {
    switch(type) {
      case 'video': return '🎥';
      case 'audio': return '🎧';
      default: return '📄';
    }
  }

  if (loading) return <Spinner />
  if (!skill) return <div style={{ padding: 40, textAlign:'center' }}>Skill not found.</div>

  return (
    <div style={{ maxWidth: 1000, margin:'0 auto', padding: '40px 24px' }}>
      <Link to="/skills" style={{ color: T.accent, fontSize: 14, marginBottom: 16, display:'inline-block' }}>← Back to Skills</Link>
      <Card style={{ marginBottom: 32 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', flexWrap:'wrap', gap: 12 }}>
          <div>
            <Badge color={T.accent}>{skill.category || 'General'}</Badge>
            <h1 style={{ fontFamily: T.fontHead, fontSize: 32, marginTop: 12 }}>{skill.title}</h1>
            <p style={{ color: T.textSec, marginTop: 8 }}>{skill.description}</p>
            <div style={{ marginTop: 12, display:'flex', gap: 16, alignItems:'center' }}>
              <Badge color={skill.level === 'Advanced' ? T.red : skill.level === 'Intermediate' ? T.gold : T.green}>
                {skill.level || 'Beginner'}
              </Badge>
              {skill.duration && <span style={{ fontSize:13, color:T.textMut }}>⏱ {skill.duration}</span>}
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <RatingStars rating={avgRating} readonly size={16} />
                <span style={{ fontSize:13, color:T.textSec }}>({reviews.length})</span>
              </div>
            </div>
          </div>
          {user && !enrolled ? (
            <Btn onClick={enroll}>Enroll Now</Btn>
          ) : enrolled && progress && (
            <div style={{ width: 200 }}>
              <div style={{ fontSize:13, marginBottom: 6 }}>Your progress: {progress.progress_pct}%</div>
              <input
                type="range" min="0" max="100" value={progress.progress_pct || 0}
                onChange={e => updateProgress(parseInt(e.target.value))}
                style={{ width:'100%' }}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Modules Section */}
      {modules.length > 0 && (
        <Card style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: T.fontHead, fontSize: 20, marginBottom: 16 }}>📚 Course Modules</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {modules.map((mod, idx) => (
              <div key={mod.id} style={{ padding: '12px', background: T.bgMid, borderRadius: T.radiusSm, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>{getMediaIcon(mod.content_type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{idx+1}. {mod.title}</div>
                  {mod.description && <div style={{ fontSize: 12, color: T.textSec }}>{mod.description}</div>}
                </div>
                <a href={mod.content_url} target="_blank" rel="noopener noreferrer">
                  <Btn small variant="secondary">Open →</Btn>
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reviews Section */}
      <Card>
        <h2 style={{ fontFamily: T.fontHead, fontSize: 20, marginBottom: 16 }}>Reviews</h2>
        {user && (
          <div style={{ marginBottom: 24, padding: 16, background: T.bgMid, borderRadius: T.radiusSm }}>
            <p style={{ marginBottom: 8 }}>Your review</p>
            <RatingStars rating={userRating} onRate={setUserRating} />
            <textarea
              rows={2}
              value={userComment}
              onChange={e => setUserComment(e.target.value)}
              placeholder="Share your experience..."
              style={{ width:'100%', marginTop: 12, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 8, color: T.textPri }}
            />
            <Btn small onClick={submitReview} disabled={submitting} style={{ marginTop: 12 }}>Submit Review</Btn>
            {message && <div style={{ marginTop: 8, fontSize: 12, color: T.green }}>{message}</div>}
          </div>
        )}
        {reviews.length === 0 ? (
          <p style={{ color: T.textSec }}>No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map(rev => (
            <div key={rev.id} style={{ borderBottom: `1px solid ${T.border}`, padding: '12px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight: 600 }}>{rev.users?.email?.split('@')[0] || 'Anonymous'}</span>
                <RatingStars rating={rev.rating} readonly size={14} />
              </div>
              {rev.comment && <p style={{ color: T.textSec, marginTop: 6, fontSize: 13 }}>{rev.comment}</p>}
              <div style={{ fontSize: 11, color: T.textMut, marginTop: 4 }}>{new Date(rev.created_at).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

// ─── SKILLS BROWSER (with ratings and link to detail) ─────────────────────────
function SkillsPage({ user }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [enrolling, setEnrolling] = useState(null)
  const [msg, setMsg] = useState(null)
  const [ratings, setRatings] = useState({})

  useEffect(() => {
    supabase.from('skills').select('*').order('created_at', { ascending: false })
      .then(async ({ data }) => {
        setSkills(data || [])
        const { data: reviews } = await supabase.from('reviews').select('skill_id, rating')
        if (reviews) {
          const avgMap = {}
          reviews.forEach(r => {
            if (!avgMap[r.skill_id]) avgMap[r.skill_id] = { sum: 0, count: 0 }
            avgMap[r.skill_id].sum += r.rating
            avgMap[r.skill_id].count++
          })
          const avgRatings = {}
          Object.entries(avgMap).forEach(([id, { sum, count }]) => {
            avgRatings[id] = (sum / count).toFixed(1)
          })
          setRatings(avgRatings)
        }
        setLoading(false)
      })
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
        <p style={{ color:T.textSec, marginTop:6 }}>Explore 50+ skills across academics and technology.</p>
      </div>

      {msg && <div style={{ marginBottom:16 }}><Alert message={msg.text} type={msg.type} onClose={() => setMsg(null)} /></div>}

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

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:20 }}>
        {filtered.map((s, idx) => (
          <Card key={s.id} hover style={{ display:'flex', flexDirection:'column', gap:12, animation: `fadeUp 0.4s ease both ${idx * 0.02}s` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <Badge color={T.accent}>{s.category || 'General'}</Badge>
              <Badge color={s.level === 'Advanced' ? T.red : s.level === 'Intermediate' ? T.gold : T.green}>
                {s.level || 'Beginner'}
              </Badge>
            </div>
            <Link to={`/skill/${s.id}`} style={{ textDecoration: 'none' }}>
              <h3 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:17, color: T.textPri }}>{s.title}</h3>
            </Link>
            <p style={{ color:T.textSec, fontSize:13, lineHeight:1.6, flex:1 }}>{s.description?.substring(0, 100)}...</p>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <RatingStars rating={ratings[s.id] || 0} readonly size={14} />
                <span style={{ fontSize:12, color:T.textMut }}>({ratings[s.id] ? '★' : 'no ratings'})</span>
              </div>
              <Btn small onClick={() => enroll(s.id)} disabled={enrolling === s.id}>
                {enrolling === s.id ? 'Enrolling…' : 'Enroll'}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── ADMIN PANEL (with skill and module management) ──────────────────────────
function AdminPage({ user }) {
  const [tab, setTab] = useState('skills')
  const [skills, setSkills] = useState([])
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title:'', description:'', category:'', level:'Beginner', duration:'' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [deleting, setDeleting] = useState(null)

  // Module form state
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', content_type: 'video', content_url: '', order_index: 0 })
  const [editingModuleId, setEditingModuleId] = useState(null)
  const [savingModule, setSavingModule] = useState(false)

  const fetchSkills = useCallback(async () => {
    const { data } = await supabase.from('skills').select('*').order('created_at', { ascending:false })
    setSkills(data || [])
  }, [])

  const fetchModules = useCallback(async (skillId) => {
    if (!skillId) return
    const { data } = await supabase.from('skill_modules').select('*').eq('skill_id', skillId).order('order_index', { ascending: true })
    setModules(data || [])
  }, [])

  useEffect(() => {
    fetchSkills().then(() => setLoading(false))
  }, [fetchSkills])

  useEffect(() => {
    if (selectedSkill) {
      fetchModules(selectedSkill.id)
    } else {
      setModules([])
    }
  }, [selectedSkill, fetchModules])

  const saveSkill = async () => {
    if (!form.title) { setMsg({ type:'error', text:'Title is required.' }); return }
    setSaving(true)
    let error
    if (editingId) {
      ({ error } = await supabase.from('skills').update(form).eq('id', editingId))
    } else {
      ({ error } = await supabase.from('skills').insert([form]))
    }
    setSaving(false)
    if (error) { setMsg({ type:'error', text: error.message }); return }
    setMsg({ type:'success', text: editingId ? 'Skill updated!' : 'Skill added!' })
    setForm({ title:'', description:'', category:'', level:'Beginner', duration:'' })
    setEditingId(null)
    fetchSkills()
    setTimeout(() => setMsg(null), 3000)
  }

  const deleteSkill = async (id) => {
    setDeleting(id)
    await supabase.from('skills').delete().eq('id', id)
    setDeleting(null)
    fetchSkills()
    if (selectedSkill?.id === id) setSelectedSkill(null)
  }

  const editSkill = (skill) => {
    setForm({
      title: skill.title,
      description: skill.description || '',
      category: skill.category || '',
      level: skill.level || 'Beginner',
      duration: skill.duration || ''
    })
    setEditingId(skill.id)
    setTab('add')
  }

  // Module CRUD
  const saveModule = async () => {
    if (!moduleForm.title || !moduleForm.content_url) {
      setMsg({ type:'error', text:'Title and URL are required.' }); return
    }
    setSavingModule(true)
    const payload = { ...moduleForm, skill_id: selectedSkill.id }
    let error
    if (editingModuleId) {
      ({ error } = await supabase.from('skill_modules').update(payload).eq('id', editingModuleId))
    } else {
      ({ error } = await supabase.from('skill_modules').insert([payload]))
    }
    setSavingModule(false)
    if (error) { setMsg({ type:'error', text: error.message }); return }
    setMsg({ type:'success', text: editingModuleId ? 'Module updated!' : 'Module added!' })
    setModuleForm({ title: '', description: '', content_type: 'video', content_url: '', order_index: 0 })
    setEditingModuleId(null)
    fetchModules(selectedSkill.id)
    setTimeout(() => setMsg(null), 3000)
  }

  const deleteModule = async (id) => {
    await supabase.from('skill_modules').delete().eq('id', id)
    fetchModules(selectedSkill.id)
  }

  const editModule = (mod) => {
    setModuleForm({
      title: mod.title,
      description: mod.description || '',
      content_type: mod.content_type,
      content_url: mod.content_url,
      order_index: mod.order_index
    })
    setEditingModuleId(mod.id)
  }

  if (loading) return <Spinner />
  if (!user || (user.user_metadata?.role !== 'trainer' && user.email !== 'admin@example.com')) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px' }}>
      <div style={{ marginBottom:32, display:'flex', alignItems:'center', gap:14 }}>
        <div>
          <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:28, letterSpacing:'-0.03em' }}>Manage Skills</h1>
          <p style={{ color:T.textSec, marginTop:4 }}>Create, edit, or remove skills and their modules.</p>
        </div>
        <Badge color={T.gold}>{user.user_metadata?.role === 'trainer' ? 'Trainer' : 'Admin'}</Badge>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:28, borderBottom:`1px solid ${T.border}`, paddingBottom:0 }}>
        {['skills', 'add', 'modules'].map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'add') setEditingId(null); setForm({ title:'', description:'', category:'', level:'Beginner', duration:'' }); }} style={{
            fontFamily:T.fontHead, fontSize:13, fontWeight:600,
            padding:'10px 20px', borderRadius:`${T.radiusSm} ${T.radiusSm} 0 0`,
            background: tab === t ? T.bgCard : 'transparent',
            color: tab === t ? T.accent : T.textSec,
            border: tab === t ? `1px solid ${T.border}` : '1px solid transparent',
            borderBottom: tab === t ? `1px solid ${T.bgCard}` : 'none',
            marginBottom: -1, cursor:'pointer'
          }}>{t === 'skills' ? '📚 Skills' : t === 'add' ? (editingId ? '✏️ Edit Skill' : '➕ Add Skill') : '📦 Modules'}</button>
        ))}
      </div>

      {msg && <div style={{ marginBottom:16 }}><Alert message={msg.text} type={msg.type} onClose={() => setMsg(null)} /></div>}

      {tab === 'skills' && (
        <Card>
          <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16, marginBottom:20 }}>All Skills ({skills.length})</h2>
          {skills.length === 0 ? <p>No skills yet.</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {skills.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:500, fontSize:14 }}>{s.title}</div>
                    <div style={{ color:T.textSec, fontSize:12 }}>{s.category} · {s.level}</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn small variant="secondary" onClick={() => { editSkill(s); setTab('add'); }}>Edit</Btn>
                    <Btn small variant="secondary" onClick={() => { setSelectedSkill(s); setTab('modules'); }}>Modules</Btn>
                    <Btn small variant="danger" onClick={() => deleteSkill(s.id)} disabled={deleting === s.id}>
                      {deleting === s.id ? '…' : 'Delete'}
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'add' && (
        <Card style={{ maxWidth: 560 }}>
          <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:18, marginBottom:24 }}>{editingId ? 'Edit Skill' : 'Add New Skill'}</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <Input label="Skill Title *" value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="e.g. JavaScript Fundamentals" />
            <div>
              <label style={{ fontFamily:T.fontHead, fontSize:13, color:T.textSec }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} rows={3} style={{ width:'100%', background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:'12px', color:T.textPri }} />
            </div>
            <Input label="Category" value={form.category} onChange={e => setForm({...form, category:e.target.value})} placeholder="Programming, Design, etc" />
            <select value={form.level} onChange={e => setForm({...form, level:e.target.value})} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:'12px', color:T.textPri }}>
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
            <Input label="Duration" value={form.duration} onChange={e => setForm({...form, duration:e.target.value})} placeholder="e.g. 4 hours" />
            <Btn onClick={saveSkill} disabled={saving} style={{ justifyContent:'center' }}>
              {saving ? 'Saving…' : (editingId ? 'Update Skill' : '+ Add Skill')}
            </Btn>
          </div>
        </Card>
      )}

      {tab === 'modules' && (
        <div>
          {!selectedSkill ? (
            <Card>
              <p>Select a skill first from the Skills tab, then click "Modules" to manage its modules.</p>
            </Card>
          ) : (
            <>
              <Card style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:18, marginBottom:16 }}>
                  Modules for: {selectedSkill.title}
                </h2>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16, marginBottom:12 }}>
                    {editingModuleId ? 'Edit Module' : 'Add Module'}
                  </h3>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
                    <Input label="Title" value={moduleForm.title} onChange={e => setModuleForm({...moduleForm, title:e.target.value})} placeholder="Introduction" />
                    <select value={moduleForm.content_type} onChange={e => setModuleForm({...moduleForm, content_type:e.target.value})} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:'12px', color:T.textPri }}>
                      <option value="video">🎥 Video</option>
                      <option value="document">📄 Document</option>
                      <option value="audio">🎧 Audio</option>
                    </select>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Input label="URL (YouTube, Google Drive, etc.)" value={moduleForm.content_url} onChange={e => setModuleForm({...moduleForm, content_url:e.target.value})} placeholder="https://..." />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Input label="Description (optional)" value={moduleForm.description} onChange={e => setModuleForm({...moduleForm, description:e.target.value})} placeholder="Brief description" />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Input label="Order Index" type="number" value={moduleForm.order_index} onChange={e => setModuleForm({...moduleForm, order_index: parseInt(e.target.value) || 0})} placeholder="0" />
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Btn onClick={saveModule} disabled={savingModule}>
                      {savingModule ? 'Saving…' : (editingModuleId ? 'Update Module' : '+ Add Module')}
                    </Btn>
                    {editingModuleId && (
                      <Btn variant="ghost" onClick={() => { setEditingModuleId(null); setModuleForm({ title: '', description: '', content_type: 'video', content_url: '', order_index: 0 }); }} style={{ marginLeft: 12 }}>
                        Cancel
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16, marginBottom:20 }}>Existing Modules</h2>
                {modules.length === 0 ? (
                  <p>No modules yet. Add one above.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {modules.map(mod => (
                      <div key={mod.id} style={{ padding:'12px', background: T.bgMid, borderRadius:T.radiusSm, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div><strong>{mod.order_index}. {mod.title}</strong> <span style={{ fontSize:12, color:T.textMut }}>({mod.content_type})</span></div>
                          {mod.description && <div style={{ fontSize:12, color:T.textSec }}>{mod.description}</div>}
                          <a href={mod.content_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:T.accent }}>Open URL →</a>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <Btn small variant="secondary" onClick={() => editModule(mod)}>Edit</Btn>
                          <Btn small variant="danger" onClick={() => deleteModule(mod.id)}>Delete</Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SEED SKILLS (if less than 50) ──────────────────────────────────────────
async function seedSkillsIfNeeded() {
  const { count } = await supabase.from('skills').select('*', { count: 'exact', head: true })
  if (count && count >= 50) return
  const skillList = [
    // Academics
    { title: 'Calculus I', category: 'Mathematics', level: 'Intermediate', description: 'Limits, derivatives, integrals.', duration: '8 weeks' },
    { title: 'Linear Algebra', category: 'Mathematics', level: 'Intermediate', description: 'Vectors, matrices, transformations.', duration: '6 weeks' },
    { title: 'Statistics 101', category: 'Mathematics', level: 'Beginner', description: 'Probability, distributions, hypothesis testing.', duration: '5 weeks' },
    { title: 'Discrete Mathematics', category: 'Mathematics', level: 'Intermediate', description: 'Logic, sets, combinatorics.', duration: '6 weeks' },
    { title: 'Physics: Mechanics', category: 'Physics', level: 'Intermediate', description: 'Newtonian mechanics, energy, momentum.', duration: '7 weeks' },
    { title: 'Physics: Electromagnetism', category: 'Physics', level: 'Advanced', description: 'Electricity, magnetism, Maxwell equations.', duration: '8 weeks' },
    { title: 'Quantum Mechanics', category: 'Physics', level: 'Advanced', description: 'Wave functions, uncertainty principle.', duration: '10 weeks' },
    { title: 'General Chemistry', category: 'Chemistry', level: 'Beginner', description: 'Atoms, molecules, reactions.', duration: '6 weeks' },
    { title: 'Organic Chemistry', category: 'Chemistry', level: 'Advanced', description: 'Carbon compounds, mechanisms.', duration: '8 weeks' },
    { title: 'Molecular Biology', category: 'Biology', level: 'Intermediate', description: 'DNA, RNA, proteins.', duration: '7 weeks' },
    { title: 'Human Anatomy', category: 'Biology', level: 'Intermediate', description: 'Body systems, structure.', duration: '6 weeks' },
    { title: 'World History', category: 'History', level: 'Beginner', description: 'Major events, civilizations.', duration: '8 weeks' },
    { title: 'American Literature', category: 'Literature', level: 'Intermediate', description: 'Classic works, analysis.', duration: '6 weeks' },
    { title: 'Macroeconomics', category: 'Economics', level: 'Intermediate', description: 'GDP, inflation, policy.', duration: '5 weeks' },
    { title: 'Microeconomics', category: 'Economics', level: 'Intermediate', description: 'Supply/demand, markets.', duration: '5 weeks' },
    { title: 'Psychology 101', category: 'Psychology', level: 'Beginner', description: 'Cognitive, behavioral, social.', duration: '6 weeks' },
    { title: 'Art History', category: 'Art', level: 'Beginner', description: 'Renaissance to modern.', duration: '4 weeks' },
    { title: 'Music Theory', category: 'Music', level: 'Beginner', description: 'Scales, chords, harmony.', duration: '4 weeks' },
    // Technology
    { title: 'JavaScript Essentials', category: 'Programming', level: 'Beginner', description: 'ES6, DOM, basics.', duration: '4 weeks' },
    { title: 'React.js Mastery', category: 'Programming', level: 'Intermediate', description: 'Hooks, context, performance.', duration: '6 weeks' },
    { title: 'Python for Data Science', category: 'Data Science', level: 'Intermediate', description: 'Pandas, NumPy, matplotlib.', duration: '5 weeks' },
    { title: 'Machine Learning A-Z', category: 'AI', level: 'Advanced', description: 'Regression, classification, neural nets.', duration: '10 weeks' },
    { title: 'Cloud Computing (AWS)', category: 'Cloud', level: 'Intermediate', description: 'EC2, S3, Lambda.', duration: '6 weeks' },
    { title: 'Cybersecurity Fundamentals', category: 'Security', level: 'Beginner', description: 'Threats, encryption, best practices.', duration: '5 weeks' },
    { title: 'DevOps with Docker', category: 'DevOps', level: 'Intermediate', description: 'Containers, orchestration.', duration: '4 weeks' },
    { title: 'Flutter Mobile Dev', category: 'Mobile', level: 'Intermediate', description: 'Cross-platform apps.', duration: '6 weeks' },
    { title: 'UI/UX Design', category: 'Design', level: 'Beginner', description: 'Figma, prototyping, usability.', duration: '5 weeks' },
    { title: 'SQL Database Design', category: 'Databases', level: 'Intermediate', description: 'PostgreSQL, queries, normalization.', duration: '4 weeks' },
    { title: 'Node.js Backend', category: 'Programming', level: 'Intermediate', description: 'REST APIs, Express, MongoDB.', duration: '5 weeks' },
    { title: 'GraphQL with Apollo', category: 'Programming', level: 'Advanced', description: 'Schema, resolvers, federation.', duration: '4 weeks' },
    { title: 'TypeScript', category: 'Programming', level: 'Intermediate', description: 'Static typing, advanced patterns.', duration: '3 weeks' },
    { title: 'Kubernetes Basics', category: 'DevOps', level: 'Advanced', description: 'Pods, services, deployments.', duration: '5 weeks' },
    { title: 'Blockchain Fundamentals', category: 'Blockchain', level: 'Intermediate', description: 'Ethereum, smart contracts.', duration: '6 weeks' },
    { title: 'Computer Vision', category: 'AI', level: 'Advanced', description: 'OpenCV, CNNs.', duration: '8 weeks' },
    { title: 'Natural Language Processing', category: 'AI', level: 'Advanced', description: 'Transformers, BERT.', duration: '8 weeks' },
    { title: 'Rust Programming', category: 'Programming', level: 'Advanced', description: 'Systems programming, ownership.', duration: '6 weeks' },
    { title: 'Go (Golang) for Backend', category: 'Programming', level: 'Intermediate', description: 'Concurrency, microservices.', duration: '5 weeks' },
    { title: 'Vue.js 3', category: 'Programming', level: 'Intermediate', description: 'Composition API, Vuex.', duration: '5 weeks' },
    { title: 'Angular Deep Dive', category: 'Programming', level: 'Advanced', description: 'RxJS, modules, DI.', duration: '6 weeks' },
    { title: 'Swift iOS Development', category: 'Mobile', level: 'Intermediate', description: 'SwiftUI, UIKit.', duration: '7 weeks' },
    { title: 'Android Kotlin', category: 'Mobile', level: 'Intermediate', description: 'Jetpack Compose, architecture.', duration: '6 weeks' },
    { title: 'Data Visualization', category: 'Data Science', level: 'Intermediate', description: 'Tableau, D3.js.', duration: '4 weeks' },
    { title: 'Big Data Hadoop', category: 'Data', level: 'Advanced', description: 'MapReduce, HDFS.', duration: '6 weeks' },
    { title: 'Serverless Architecture', category: 'Cloud', level: 'Advanced', description: 'AWS Lambda, API Gateway.', duration: '4 weeks' },
    { title: 'Web Accessibility', category: 'Design', level: 'Beginner', description: 'WCAG, a11y best practices.', duration: '3 weeks' },
    { title: 'Ethical Hacking', category: 'Security', level: 'Advanced', description: 'Penetration testing, tools.', duration: '8 weeks' },
    { title: 'Digital Marketing', category: 'Business', level: 'Beginner', description: 'SEO, social media, analytics.', duration: '5 weeks' },
    { title: 'Project Management', category: 'Business', level: 'Intermediate', description: 'Agile, Scrum, Jira.', duration: '4 weeks' },
    { title: 'Communication Skills', category: 'Soft Skills', level: 'Beginner', description: 'Public speaking, writing.', duration: '3 weeks' },
    { title: 'Critical Thinking', category: 'Soft Skills', level: 'Intermediate', description: 'Logic, problem solving.', duration: '3 weeks' },
    { title: 'Leadership & Management', category: 'Business', level: 'Advanced', description: 'Team building, strategy.', duration: '5 weeks' },
    { title: 'Excel for Business', category: 'Business', level: 'Beginner', description: 'Formulas, pivot tables, dashboards.', duration: '4 weeks' },
  ]
  for (const skill of skillList) {
    await supabase.from('skills').insert(skill).select()
  }
  console.log('Seeded 50+ skills')
}

// ─── PROTECTED ROUTE (with optional role check) ──────────────────────────────
function Protected({ user, loading, children }) {
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, signOut } = useAuth()

  useEffect(() => {
    seedSkillsIfNeeded()
  }, [])

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
                <Route path="/skill/:skillId" element={<Protected user={user} loading={loading}><SkillDetailPage user={user} /></Protected>} />
                <Route path="/admin"     element={<Protected user={user} loading={loading}><AdminPage user={user} /></Protected>} />
                <Route path="*" element={
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
