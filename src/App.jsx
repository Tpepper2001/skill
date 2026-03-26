import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

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
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const globalStyle = document.createElement('style');
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
  @keyframes checkPop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
  .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.5); }
  .fade-up { animation: fadeUp 0.5s ease both; }
  .check-pop { animation: checkPop 0.35s ease both; }

  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
    .mobile-col { flex-direction: column !important; }
    .mobile-full { width: 100% !important; min-width: unset !important; }
    .mobile-pad { padding: 20px 16px !important; }
    .mobile-stack { grid-template-columns: 1fr !important; }
    .mobile-text-sm { font-size: 14px !important; }
    .mobile-wrap { flex-wrap: wrap !important; }
    .mobile-gap-sm { gap: 8px !important; }
    .nav-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .nav-scroll::-webkit-scrollbar { display: none; }
  }
  @media (max-width: 480px) {
    .xs-stack { grid-template-columns: 1fr !important; }
    .xs-text-xs { font-size: 12px !important; }
  }
  
  @keyframes progressFill {
    from { width: 0%; }
    to { width: var(--target-width); }
  }
  .auto-progress-bar {
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .module-item { transition: all 0.25s ease; }
  .module-item:hover { background: rgba(56,189,248,0.06) !important; }
  .module-item.completed { border-left: 3px solid ${T.green}; }
  .module-item.active { border-left: 3px solid ${T.accent}; }
`;
document.head.appendChild(globalStyle);

// ─── MOBILE HELPERS ───────────────────────────────────────────────────────────
const useWindowSize = () => {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
};

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
  );
}

function Btn({ children, onClick, variant='primary', disabled=false, style={}, type='button', small=false }) {
  const base = {
    fontFamily: T.fontHead, fontWeight: 600, letterSpacing: '0.03em',
    borderRadius: T.radiusSm, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease', opacity: disabled ? 0.5 : 1,
    padding: small ? '8px 16px' : '12px 24px',
    fontSize: small ? '13px' : '14px',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    whiteSpace: 'nowrap',
    ...style
  };
  const variants = {
    primary:  { background: T.accent, color: T.bg, boxShadow: `0 0 20px ${T.accentGlow}` },
    secondary:{ background: 'transparent', color: T.accent, border: `1.5px solid ${T.accent}` },
    ghost:    { background: 'transparent', color: T.textSec, border: `1.5px solid ${T.border}` },
    danger:   { background: T.red, color: '#fff' },
    success:  { background: T.green, color: '#fff' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
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
  );
}

function Card({ children, style={}, glow=false, hover=false }) {
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: 24,
      boxShadow: glow ? T.shadowGlow : T.shadow,
      transition: 'transform 0.2s, box-shadow 0.2s',
      ...style
    }} className={hover ? 'card-hover' : ''}>
      {children}
    </div>
  );
}

function Badge({ children, color=T.accent }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 99, fontSize: 11, fontWeight: 600,
      fontFamily: T.fontHead, letterSpacing: '0.05em',
      background: `${color}22`, color, border: `1px solid ${color}44`,
      whiteSpace: 'nowrap'
    }}>
      {children}
    </span>
  );
}

function Alert({ message, type='error', onClose }) {
  if (!message) return null;
  const colors = { error: T.red, success: T.green, info: T.accent };
  const c = colors[type] || T.accent;
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
  );
}

function RatingStars({ rating, onRate, readonly = false, size = 18 }) {
  const [hover, setHover] = useState(0);
  const stars = [1,2,3,4,5];
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
  );
}

// ─── AUTO PROGRESS TRACKER ──────────────────────────────────────────────────────
function useAutoProgress(enrollmentId, modules, initialPct) {
  const [completedModules, setCompletedModules] = useState(new Set());
  const [progressPct, setProgressPct] = useState(initialPct || 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enrollmentId) return;
    const saved = localStorage.getItem(`progress_${enrollmentId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const set = new Set(parsed);
        setCompletedModules(set);
        if (modules.length > 0) {
          const pct = Math.round((set.size / modules.length) * 100);
          setProgressPct(pct);
        }
      } catch {}
    }
  }, [enrollmentId, modules.length]);

  const markModuleComplete = useCallback(async (moduleId) => {
    if (!enrollmentId || completedModules.has(moduleId)) return;
    const newCompleted = new Set([...completedModules, moduleId]);
    setCompletedModules(newCompleted);

    const newPct = modules.length > 0 ? Math.round((newCompleted.size / modules.length) * 100) : 0;
    setProgressPct(newPct);

    localStorage.setItem(`progress_${enrollmentId}`, JSON.stringify([...newCompleted]));

    setSaving(true);
    try {
      await supabase
        .from('user_progress')
        .update({ progress_pct: newPct, completed: newPct >= 100 })
        .eq('id', enrollmentId);
    } catch (e) {
      console.error('Progress sync error:', e);
    } finally {
      setSaving(false);
    }
  }, [enrollmentId, completedModules, modules.length]);

  const isModuleCompleted = (moduleId) => completedModules.has(moduleId);

  return { progressPct, completedModules, markModuleComplete, isModuleCompleted, saving };
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ user, role, onSignOut }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const navLinks = user
    ? [
        { to:'/dashboard', label:'Dashboard' },
        { to:'/workshop', label:'Workshop' },
        { to:'/skills', label:'Skills' },
        ...(role === 'admin' ? [{ to:'/admin', label:'Admin' }] : [])
      ]
    : [{ to:'/', label:'Home' }, { to:'/login', label:'Sign In' }];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: `${T.bg}ee`, backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between', height: 60
      }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
            <span style={{ fontFamily: T.fontHead, fontWeight: 800, color: T.bg, fontSize: 17 }}>S</span>
          </div>
          <span style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 17, color: T.textPri, letterSpacing: '-0.02em' }}>
            Skillery<span style={{ color: T.accent }}>Pro</span>
          </span>
        </Link>

        {!isMobile && (
          <div style={{ display:'flex', alignItems:'center', gap: 4 }}>
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} style={{
                fontFamily: T.fontHead, fontSize: 13, fontWeight: 500,
                color: location.pathname === l.to ? T.accent : T.textSec,
                padding: '6px 12px', borderRadius: T.radiusSm,
                background: location.pathname === l.to ? T.accentGlow : 'transparent',
                transition: 'all 0.2s', letterSpacing: '0.02em'
              }}>
                {l.label}
              </Link>
            ))}
            {user && (
              <Btn small variant="ghost" onClick={onSignOut} style={{ marginLeft: 4 }}>Sign Out</Btn>
            )}
          </div>
        )}

        {isMobile && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', color: T.textPri, fontSize: 22, padding: 4, lineHeight: 1 }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        )}
      </div>

      {isMobile && menuOpen && (
        <div style={{
          background: T.bgCard, borderTop: `1px solid ${T.border}`,
          padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} style={{
              fontFamily: T.fontHead, fontSize: 14, fontWeight: 500,
              color: location.pathname === l.to ? T.accent : T.textSec,
              padding: '10px 12px', borderRadius: T.radiusSm,
              background: location.pathname === l.to ? T.accentGlow : 'transparent',
              display: 'block'
            }}>
              {l.label}
            </Link>
          ))}
          {user && (
            <button onClick={() => { setMenuOpen(false); onSignOut(); }} style={{
              fontFamily: T.fontHead, fontSize: 14, fontWeight: 500,
              color: T.textSec, padding: '10px 12px', borderRadius: T.radiusSm,
              background: 'transparent', textAlign: 'left',
              border: `1px solid ${T.border}`, marginTop: 4
            }}>
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

// ─── SEED DATA: SKILLS WITH YOUTUBE MODULES (full array) ────────────────────
const SKILLS_WITH_MODULES = [
  {
    title: 'Calculus I',
    category: 'Mathematics',
    level: 'Intermediate',
    description: 'Limits, derivatives, integrals and their applications.',
    duration: '8 weeks',
    modules: [
      { title: 'Introduction to Limits', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=riXcZT2ICjA', description: 'Understand what a limit is and why it matters.' },
      { title: 'Limit Laws & Techniques', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=tKoGnSlMt90', description: 'Applying limit laws to evaluate expressions.' },
      { title: 'Derivatives: The Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=WUvTyaaNkzM', description: 'Definition of the derivative and differentiation rules.' },
      { title: 'Chain Rule & Implicit Differentiation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=H-ybCx8gt-8', description: 'Advanced differentiation strategies.' },
      { title: 'Introduction to Integration', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=rfG8ce4nNh0', description: 'Antiderivatives and the fundamental theorem of calculus.' },
      { title: 'Integration Techniques', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=5Y-m1l-DkEU', description: 'U-substitution, integration by parts.' },
    ]
  },
  {
    title: 'Linear Algebra',
    category: 'Mathematics',
    level: 'Intermediate',
    description: 'Vectors, matrices, transformations and their applications.',
    duration: '6 weeks',
    modules: [
      { title: 'Vectors & Vector Spaces', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs', description: 'What are vectors and how do we operate on them?' },
      { title: 'Linear Transformations', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=kYB8IZa5AuE', description: 'Transforming space with matrices.' },
      { title: 'Matrix Multiplication', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=XkY2DOUCWMU', description: 'Understanding matrix composition.' },
      { title: 'Determinants', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Ip3X9LOh2dk', description: 'Computing and interpreting determinants.' },
      { title: 'Eigenvalues & Eigenvectors', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=PFDu9oVAE-g', description: 'The cornerstone of linear algebra applications.' },
      { title: 'Dot Products & Duality', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=LyGKycYT2v0', description: 'Understanding projections and inner products.' },
    ]
  },
  {
    title: 'Statistics 101',
    category: 'Mathematics',
    level: 'Beginner',
    description: 'Probability, distributions, and hypothesis testing.',
    duration: '5 weeks',
    modules: [
      { title: 'What is Statistics?', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=sxQaBpKfDRk', description: 'Overview and why statistics matters.' },
      { title: 'Descriptive Statistics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=mk8tOD0t8M0', description: 'Mean, median, mode, standard deviation.' },
      { title: 'Probability Fundamentals', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=uzkc-qNVoOk', description: 'Basic probability rules and counting.' },
      { title: 'Normal Distribution', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=rzFX5NWojp0', description: 'The bell curve and Z-scores.' },
      { title: 'Hypothesis Testing', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=0oc49DyA3hU', description: 'P-values, t-tests, and statistical significance.' },
    ]
  },
  {
    title: 'Physics: Mechanics',
    category: 'Physics',
    level: 'Intermediate',
    description: 'Newtonian mechanics, energy, and momentum.',
    duration: '7 weeks',
    modules: [
      { title: "Newton's Laws of Motion", content_type: 'video', content_url: 'https://www.youtube.com/watch?v=kKKM8Y-u7ds', description: 'The three laws that govern classical motion.' },
      { title: 'Kinematics: Motion in 1D', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=ZM8ECpBuQYE', description: 'Displacement, velocity, acceleration.' },
      { title: 'Work, Energy & Power', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=2WS1sG9fhOk', description: 'Conservation of energy principles.' },
      { title: 'Momentum & Collisions', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=XFhntPxow0U', description: 'Impulse-momentum theorem, elastic/inelastic.' },
      { title: 'Circular Motion & Gravitation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=I-eHFMEHB2U', description: "Centripetal force and Newton's law of gravity." },
    ]
  },
  {
    title: 'General Chemistry',
    category: 'Chemistry',
    level: 'Beginner',
    description: 'Atoms, molecules, and chemical reactions.',
    duration: '6 weeks',
    modules: [
      { title: 'Atomic Structure', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=W-7XmgJHfh4', description: 'Protons, neutrons, electrons, and electron configuration.' },
      { title: 'The Periodic Table', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=0RRVV4Diomg', description: 'How elements are organized and trends.' },
      { title: 'Chemical Bonding', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=CGA8sRwqb1s', description: 'Ionic, covalent, and metallic bonds.' },
      { title: 'Balancing Chemical Equations', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=RnGe3IQKD_Y', description: 'Stoichiometry basics and balancing.' },
      { title: 'Acids, Bases & pH', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Q3TEFDzysVU', description: 'pH scale, strong vs weak acids/bases.' },
    ]
  },
  {
    title: 'Molecular Biology',
    category: 'Biology',
    level: 'Intermediate',
    description: 'DNA, RNA, protein synthesis, and cell function.',
    duration: '7 weeks',
    modules: [
      { title: 'DNA Structure & Replication', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=8kK2zwjRV0M', description: 'Double helix, base pairing, and copying DNA.' },
      { title: 'Transcription: DNA to RNA', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=DA2t5N72mgw', description: 'How genes are expressed as RNA.' },
      { title: 'Translation: RNA to Protein', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=TfYf_rPWUdY', description: 'Ribosomes and the genetic code.' },
      { title: 'Gene Regulation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=ihqfHMrb8Ek', description: 'Turning genes on and off.' },
      { title: 'CRISPR & Genetic Engineering', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=jAhjPd4uNFY', description: 'Modern tools for editing genomes.' },
    ]
  },
  {
    title: 'World History',
    category: 'History',
    level: 'Beginner',
    description: 'Major events, civilizations, and turning points in history.',
    duration: '8 weeks',
    modules: [
      { title: 'Ancient Civilizations', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=HXI_FE03JbI', description: 'Egypt, Mesopotamia, Greece, Rome.' },
      { title: 'The Middle Ages', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=frBpLQtMkYc', description: 'Feudalism, the Church, and medieval Europe.' },
      { title: 'The Renaissance & Reformation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=G-Ii9oVFTSM', description: 'Art, science, and religious upheaval.' },
      { title: 'Industrial Revolution', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=zjU3_SF7BZk', description: 'How industrialization changed the world.' },
      { title: 'The World Wars', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=RowMsLt77jw', description: 'Causes, events, and aftermath of WWI & WWII.' },
    ]
  },
  {
    title: 'Macroeconomics',
    category: 'Economics',
    level: 'Intermediate',
    description: 'GDP, inflation, monetary policy, and economic systems.',
    duration: '5 weeks',
    modules: [
      { title: 'GDP & Economic Growth', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=s0TpFnEQ0sk', description: 'Measuring economic output.' },
      { title: 'Inflation & Unemployment', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=beqsVNLsNqk', description: 'Phillips curve and trade-offs.' },
      { title: 'Monetary Policy & the Fed', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=wOfQPn9Jwpo', description: 'How central banks manage money supply.' },
      { title: 'Fiscal Policy', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=HMCbgALBflE', description: 'Government spending, taxes, and debt.' },
      { title: 'International Trade', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=owTodLGDCMI', description: 'Comparative advantage and globalization.' },
    ]
  },
  {
    title: 'Psychology 101',
    category: 'Psychology',
    level: 'Beginner',
    description: 'Cognitive, behavioral, and social psychology fundamentals.',
    duration: '6 weeks',
    modules: [
      { title: 'Introduction to Psychology', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=vo4pMVb0R6M', description: 'History and major schools of thought.' },
      { title: 'The Brain & Neuroscience', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=1ytNF9iNJFY', description: 'How the brain shapes behavior.' },
      { title: 'Memory & Learning', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=bSycdIx-C48', description: 'How we store and retrieve information.' },
      { title: 'Personality Theories', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=YBZsP28yjRU', description: 'Big Five, Freud, and modern models.' },
      { title: 'Social Influence & Behavior', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=UGxGDdQnC1Y', description: 'Conformity, obedience, and group dynamics.' },
    ]
  },
  {
    title: 'Music Theory',
    category: 'Music',
    level: 'Beginner',
    description: 'Scales, chords, rhythm, and harmony.',
    duration: '4 weeks',
    modules: [
      { title: 'Reading Music: Notes & Rhythm', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=ZN41d7Txcq0', description: 'Staff notation, time signatures, note values.' },
      { title: 'Scales & Keys', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=kvGYl8SQBJ0', description: 'Major, minor, modes.' },
      { title: 'Building Chords', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=NBqxzDjMiXI', description: 'Triads, seventh chords, inversions.' },
      { title: 'Chord Progressions', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=QdNNFZYSEhA', description: 'I-IV-V and popular harmonic patterns.' },
      { title: 'Melody & Counterpoint', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=1URfpADnVRY', description: 'Writing memorable melodies.' },
    ]
  },
  {
    title: 'JavaScript Essentials',
    category: 'Programming',
    level: 'Beginner',
    description: 'ES6+, DOM manipulation, async patterns.',
    duration: '4 weeks',
    modules: [
      { title: 'JS Variables & Data Types', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk', description: 'let, const, var, primitives, and objects.' },
      { title: 'Functions & Scope', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=iLhhZniGPQs', description: 'Arrow functions, closures, hoisting.' },
      { title: 'DOM Manipulation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=y17RuWkWdn8', description: 'Querying and updating web pages dynamically.' },
      { title: 'Arrays & Higher-Order Functions', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=R8rmfD9Y5-c', description: 'map, filter, reduce, and more.' },
      { title: 'Promises & Async/Await', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=PoRJizFvM7s', description: 'Handling asynchronous operations.' },
      { title: 'Fetch API & REST', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=cuEtnrL9-H0', description: 'Making HTTP requests in the browser.' },
    ]
  },
  {
    title: 'React.js Mastery',
    category: 'Programming',
    level: 'Intermediate',
    description: 'Hooks, context, performance patterns.',
    duration: '6 weeks',
    modules: [
      { title: 'React Fundamentals & JSX', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM', description: 'Components, props, and JSX syntax.' },
      { title: 'State & useState Hook', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=O6P86uwfdR0', description: 'Managing component state.' },
      { title: 'useEffect & Side Effects', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=0ZJgIjIuY7U', description: 'Fetching data and running side effects.' },
      { title: 'Context API & Global State', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=5LrDIWkK_Bc', description: 'Sharing state across the component tree.' },
      { title: 'React Router', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Ul3y1LXxzdU', description: 'Client-side routing and navigation.' },
      { title: 'Performance Optimization', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=7sgBhmLjVws', description: 'memo, useCallback, useMemo, lazy loading.' },
    ]
  },
  {
    title: 'Python for Data Science',
    category: 'Data Science',
    level: 'Intermediate',
    description: 'Pandas, NumPy, Matplotlib, and data analysis.',
    duration: '5 weeks',
    modules: [
      { title: 'Python Basics for Data', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8', description: 'Lists, dicts, comprehensions for data work.' },
      { title: 'NumPy Arrays', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=GB9ByFAIAH4', description: 'Vectorized operations and array math.' },
      { title: 'Pandas DataFrames', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=vmEHCJofslg', description: 'Loading, cleaning, and transforming data.' },
      { title: 'Data Visualization with Matplotlib', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=OZOOLe2imFo', description: 'Line charts, bar charts, scatter plots.' },
      { title: 'Exploratory Data Analysis', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=-o3AxdVcUtQ', description: 'EDA techniques and statistical summaries.' },
    ]
  },
  {
    title: 'Machine Learning A-Z',
    category: 'AI',
    level: 'Advanced',
    description: 'Regression, classification, clustering, and neural networks.',
    duration: '10 weeks',
    modules: [
      { title: 'Introduction to ML', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=GwIo3gDZCVQ', description: 'Supervised, unsupervised, reinforcement.' },
      { title: 'Linear & Logistic Regression', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=zM4VZR0px8E', description: 'Prediction and classification basics.' },
      { title: 'Decision Trees & Random Forests', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=J4Wdy0Wc_xQ', description: 'Tree-based ensemble methods.' },
      { title: 'Neural Networks', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=aircAruvnKk', description: 'Layers, activations, backprop explained.' },
      { title: 'Model Evaluation & Tuning', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=85dtiMz9tSo', description: 'Cross-validation, precision/recall, grid search.' },
      { title: 'Unsupervised Learning', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=yR7k19YBqiw', description: 'K-Means, PCA, dimensionality reduction.' },
    ]
  },
  {
    title: 'Cloud Computing (AWS)',
    category: 'Cloud',
    level: 'Intermediate',
    description: 'EC2, S3, Lambda, and core AWS services.',
    duration: '6 weeks',
    modules: [
      { title: 'AWS Overview & Core Services', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=a9__D53WsUs', description: 'Introduction to the AWS ecosystem.' },
      { title: 'EC2 & Compute', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=iHX-jtKIVNA', description: 'Launching and managing virtual machines.' },
      { title: 'S3 Storage', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=mDRoyPFJvlU', description: 'Object storage buckets and policies.' },
      { title: 'IAM & Security', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=SXSqhTn2DuE', description: 'Users, roles, and permission policies.' },
      { title: 'Lambda & Serverless', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=eOBq__h4OJ4', description: 'Event-driven functions without servers.' },
    ]
  },
  {
    title: 'Cybersecurity Fundamentals',
    category: 'Security',
    level: 'Beginner',
    description: 'Threats, encryption, authentication, and best practices.',
    duration: '5 weeks',
    modules: [
      { title: 'Intro to Cybersecurity', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=inWWhr5tnEA', description: 'Threat landscape, CIA triad.' },
      { title: 'Networking Fundamentals', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=qiQR5rTSshw', description: 'TCP/IP, firewalls, and protocols.' },
      { title: 'Cryptography Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=AQDCe585Lnc', description: 'Symmetric, asymmetric, hashing.' },
      { title: 'Common Attacks & Defenses', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=wW_6AOzJBts', description: 'Phishing, SQL injection, XSS.' },
      { title: 'Security Best Practices', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=l24_QHfS54U', description: 'Password hygiene, 2FA, HTTPS.' },
    ]
  },
  {
    title: 'DevOps with Docker',
    category: 'DevOps',
    level: 'Intermediate',
    description: 'Containers, images, Docker Compose, and CI basics.',
    duration: '4 weeks',
    modules: [
      { title: 'What is Docker?', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Gjnup-PuquQ', description: 'Containers vs VMs, installation.' },
      { title: 'Docker Images & Containers', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=pg19Z8LL06w', description: 'Building and running containers.' },
      { title: 'Dockerfile', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=LQjaJINkQXY', description: 'Writing Dockerfiles for your app.' },
      { title: 'Docker Compose', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=DM65_JyGxCo', description: 'Multi-container apps with Compose.' },
      { title: 'Docker Networking & Volumes', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=OU6xOM0SE4o', description: 'Connecting containers and persisting data.' },
    ]
  },
  {
    title: 'UI/UX Design',
    category: 'Design',
    level: 'Beginner',
    description: 'Figma, prototyping, user research, and usability.',
    duration: '5 weeks',
    modules: [
      { title: 'Design Thinking Process', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=a7sEoEvT8l8', description: 'Empathize, define, ideate, prototype, test.' },
      { title: 'Figma Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8', description: 'Frames, components, auto-layout.' },
      { title: 'Color Theory & Typography', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=_2LLXnUdUIc', description: 'Building visual hierarchy.' },
      { title: 'Wireframing & Prototyping', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=qpH7-KFWZRI', description: 'Low-fi to high-fi prototypes.' },
      { title: 'Usability Testing', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=oMS2Q7bVzB0', description: 'Testing with real users.' },
    ]
  },
  {
    title: 'SQL Database Design',
    category: 'Databases',
    level: 'Intermediate',
    description: 'PostgreSQL, querying, normalization, and indexing.',
    duration: '4 weeks',
    modules: [
      { title: 'SQL Basics: SELECT & WHERE', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', description: 'Querying tables with basic SQL.' },
      { title: 'JOINs & Relationships', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw', description: 'INNER, LEFT, RIGHT JOINs explained.' },
      { title: 'Database Design & Normalization', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=GFQaEYEc8_8', description: '1NF, 2NF, 3NF principles.' },
      { title: 'Indexes & Query Optimization', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=fsG1XaZEa78', description: 'Making queries fast.' },
      { title: 'Transactions & ACID', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=5ZjhNTM8XU8', description: 'Atomicity, consistency, isolation, durability.' },
    ]
  },
  {
    title: 'Node.js Backend',
    category: 'Programming',
    level: 'Intermediate',
    description: 'REST APIs, Express, MongoDB, and authentication.',
    duration: '5 weeks',
    modules: [
      { title: 'Node.js & the Event Loop', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=ENrzD9HAZK4', description: 'How Node.js works under the hood.' },
      { title: 'Express.js Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=L72fhGm1tfE', description: 'Routing, middleware, request/response.' },
      { title: 'REST API Design', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=lsMQRaeKNDk', description: 'CRUD endpoints and HTTP methods.' },
      { title: 'MongoDB & Mongoose', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=DZBGEVgL2eE', description: 'NoSQL databases and schemas.' },
      { title: 'JWT Authentication', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=mbsmsi7l3r4', description: 'Token-based auth with JWT.' },
    ]
  },
  {
    title: 'TypeScript',
    category: 'Programming',
    level: 'Intermediate',
    description: 'Static typing, interfaces, generics, and advanced patterns.',
    duration: '3 weeks',
    modules: [
      { title: 'TypeScript Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=d56mG7DezGs', description: 'Types, annotations, and compilation.' },
      { title: 'Interfaces & Type Aliases', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=LKVHFHp_mXI', description: 'Structuring complex data types.' },
      { title: 'Generics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=EcCTIExsqmI', description: 'Writing reusable typed functions and classes.' },
      { title: 'Utility Types & Advanced TS', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=zM9K1qfnUFM', description: 'Partial, Pick, Record, and more.' },
      { title: 'TypeScript with React', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=ydkQlJhodio', description: 'Typing props, state, and hooks.' },
    ]
  },
  {
    title: 'Natural Language Processing',
    category: 'AI',
    level: 'Advanced',
    description: 'Text processing, transformers, BERT, and NLP pipelines.',
    duration: '8 weeks',
    modules: [
      { title: 'Introduction to NLP', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=CMrHM8a3hqw', description: 'Tokenization, stemming, bag-of-words.' },
      { title: 'Word Embeddings & Word2Vec', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=viZrOnJclY0', description: 'Representing words as vectors.' },
      { title: 'Recurrent Neural Networks', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=WCUNPb-5EYI', description: 'LSTMs and sequence modeling.' },
      { title: 'Attention & Transformers', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=iDulhoQ2pro', description: 'The architecture behind GPT and BERT.' },
      { title: 'BERT & Fine-Tuning', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=xI0HHN5XKDo', description: 'Pre-trained models and transfer learning.' },
    ]
  },
  {
    title: 'Digital Marketing',
    category: 'Business',
    level: 'Beginner',
    description: 'SEO, social media, email marketing, and analytics.',
    duration: '5 weeks',
    modules: [
      { title: 'Digital Marketing Overview', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=bixR-KIJKYM', description: 'Channels, funnels, and KPIs.' },
      { title: 'SEO Fundamentals', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=DvwS7cV9GmQ', description: 'On-page, off-page, and technical SEO.' },
      { title: 'Social Media Marketing', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=hJjcJWLe2kY', description: 'Platform strategies and content creation.' },
      { title: 'Email Marketing', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=q3vv6ITKRHY', description: 'List building, automation, and campaigns.' },
      { title: 'Google Analytics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=gBeMELnxdIg', description: 'Tracking and interpreting website data.' },
    ]
  },
  {
    title: 'Project Management',
    category: 'Business',
    level: 'Intermediate',
    description: 'Agile, Scrum, Kanban, and project planning.',
    duration: '4 weeks',
    modules: [
      { title: 'Project Management Fundamentals', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=PPLop4L2eGk', description: 'Scope, time, cost, quality.' },
      { title: 'Agile Methodology', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Z9QbYZh1YXY', description: 'Values, principles, and practices.' },
      { title: 'Scrum Framework', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=2Vt7Ik8Ublw', description: 'Sprints, standups, retrospectives.' },
      { title: 'Kanban', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=iVaFVa7HYj4', description: 'Visual workflow management.' },
      { title: 'Risk Management', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=QuzNHGP6ZxM', description: 'Identifying and mitigating project risks.' },
    ]
  },
  {
    title: 'Communication Skills',
    category: 'Soft Skills',
    level: 'Beginner',
    description: 'Public speaking, persuasion, and professional writing.',
    duration: '3 weeks',
    modules: [
      { title: 'Foundations of Communication', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=HAnw168huqA', description: 'Verbal, non-verbal, and written.' },
      { title: 'Public Speaking Confidence', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=tShavGuo0_E', description: 'Overcoming fear and structuring talks.' },
      { title: 'Active Listening', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Nj4bApHl9c8', description: 'Skills for understanding others.' },
      { title: 'Professional Writing', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=pD5rnOe_WJE', description: 'Emails, reports, and clarity.' },
      { title: 'Persuasion & Influence', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=cFdCzN7RYbw', description: "Cialdini's principles of persuasion." },
    ]
  },
  {
    title: 'Excel for Business',
    category: 'Business',
    level: 'Beginner',
    description: 'Formulas, pivot tables, charts, and dashboards.',
    duration: '4 weeks',
    modules: [
      { title: 'Excel Basics & Navigation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=rwbho0CgEAI', description: 'Cells, ranges, formatting, data entry.' },
      { title: 'Essential Formulas', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=DCFQSd3Y6MQ', description: 'SUM, IF, VLOOKUP, INDEX/MATCH.' },
      { title: 'Charts & Data Visualization', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=pTpItm-jFcA', description: 'Creating and formatting charts.' },
      { title: 'Pivot Tables', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=m0wI61ahfLc', description: 'Summarizing large data sets quickly.' },
      { title: 'Excel Dashboards', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=K74_FNnlIF8', description: 'Building dynamic business dashboards.' },
    ]
  },
  {
    title: 'Discrete Mathematics',
    category: 'Mathematics',
    level: 'Intermediate',
    description: 'Logic, sets, combinatorics, and graph theory.',
    duration: '6 weeks',
    modules: [
      { title: 'Propositional Logic', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=q2eyZZK-OIk', description: 'Truth tables and logical connectives.' },
      { title: 'Sets & Set Theory', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=tyDKR4FG3Yw', description: 'Union, intersection, complement.' },
      { title: 'Counting & Combinatorics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=WkbTkPNAMjw', description: 'Permutations, combinations, pigeonhole.' },
      { title: 'Graph Theory', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=LFKZLXVO-Dg', description: 'Vertices, edges, paths, trees.' },
      { title: 'Proof Techniques', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=3czgfHULZCs', description: 'Direct, contrapositive, induction.' },
    ]
  },
  {
    title: 'Organic Chemistry',
    category: 'Chemistry',
    level: 'Advanced',
    description: 'Carbon compounds, reaction mechanisms, and synthesis.',
    duration: '8 weeks',
    modules: [
      { title: 'Organic Chemistry Introduction', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=O2bMBnFVD6I', description: 'Hybridization, bonding, molecular shapes.' },
      { title: 'Functional Groups', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=p_wD2iBEHEU', description: 'Alcohols, ketones, aldehydes, acids.' },
      { title: 'Stereochemistry', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=IQjfqrUMeBw', description: 'Chirality, enantiomers, diastereomers.' },
      { title: 'Nucleophilic Substitution', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=FRaLAbVEG9Q', description: 'SN1 and SN2 mechanisms.' },
      { title: 'Elimination & Addition Reactions', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=mPCsKMkxQ7s', description: 'E1, E2, and addition to alkenes.' },
    ]
  },
  {
    title: 'Quantum Mechanics',
    category: 'Physics',
    level: 'Advanced',
    description: 'Wave functions, Schrödinger equation, and quantum states.',
    duration: '10 weeks',
    modules: [
      { title: 'Wave-Particle Duality', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Q_h4IoPJXZw', description: 'Double-slit experiment and de Broglie.' },
      { title: 'Schrödinger Equation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Qt3TnBg7RKw', description: 'Time-dependent wave equations.' },
      { title: 'Quantum States & Superposition', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=7B1llCxVdkE', description: 'What it means to be in superposition.' },
      { title: 'Uncertainty Principle', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=TQKELOE9eY4', description: "Heisenberg's principle explained." },
      { title: 'Quantum Entanglement', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=ZuvK-od647c', description: 'Spooky action at a distance.' },
    ]
  },
  {
    title: 'Human Anatomy',
    category: 'Biology',
    level: 'Intermediate',
    description: 'Body systems, organs, and physiological structure.',
    duration: '6 weeks',
    modules: [
      { title: 'Introduction to Anatomy', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Ae4MadKPJC0', description: 'Body planes, regions, and systems overview.' },
      { title: 'Skeletal System', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=g1ofNTYyNNg', description: 'Bones, joints, and connective tissue.' },
      { title: 'Muscular System', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=VVL-8zr2hk4', description: 'Muscle types, contraction mechanisms.' },
      { title: 'Cardiovascular System', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=CWFyxn0qDEU', description: 'Heart, blood vessels, circulation.' },
      { title: 'Nervous System', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=44B0ms3XPKU', description: 'Brain, spinal cord, and neurons.' },
    ]
  },
  {
    title: 'American Literature',
    category: 'Literature',
    level: 'Intermediate',
    description: 'Classic American works, literary movements, and analysis.',
    duration: '6 weeks',
    modules: [
      { title: 'Transcendentalism', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=6aBDMKSFTCE', description: 'Emerson, Thoreau, and American idealism.' },
      { title: 'The Harlem Renaissance', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=B0MiMt5nxyg', description: 'Hughes, Hurston, and cultural awakening.' },
      { title: 'The Great American Novel', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=6L28ZYD-mz4', description: 'Fitzgerald, Steinbeck, Hemingway.' },
      { title: 'Postmodern American Literature', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=_yGfFnWXIuc', description: 'Pynchon, DeLillo, and meta-fiction.' },
      { title: 'Literary Analysis Techniques', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=MSYw502dJNY', description: 'Close reading, themes, and symbolism.' },
    ]
  },
  {
    title: 'Microeconomics',
    category: 'Economics',
    level: 'Intermediate',
    description: 'Supply, demand, market structures, and consumer theory.',
    duration: '5 weeks',
    modules: [
      { title: 'Supply & Demand', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=g9aDizJpd_s', description: 'Curves, shifts, and market equilibrium.' },
      { title: 'Elasticity', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=uuz0EHMNHfo', description: 'Price elasticity of demand and supply.' },
      { title: 'Consumer Theory', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=6bFMjMk-AoE', description: 'Utility, indifference curves, budget lines.' },
      { title: 'Market Structures', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=_pMFJRMlJ0s', description: 'Perfect competition vs monopoly.' },
      { title: 'Game Theory Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=M3oWYHYoBvk', description: "Prisoner's dilemma and Nash equilibrium." },
    ]
  },
  {
    title: 'Art History',
    category: 'Art',
    level: 'Beginner',
    description: 'From the Renaissance to modern art movements.',
    duration: '4 weeks',
    modules: [
      { title: 'The Renaissance', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=C7YqXAb7cR0', description: 'Leonardo, Michelangelo, and perspective.' },
      { title: 'Baroque & Rococo', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=jNMOWkwkVMA', description: 'Drama, light, and ornamentation.' },
      { title: 'Impressionism & Post-Impressionism', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=xT-UwI3pjSY', description: 'Monet, Van Gogh, Cézanne.' },
      { title: 'Modern Art Movements', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=j0m-3QQgP0U', description: 'Cubism, Surrealism, Abstract Expressionism.' },
      { title: 'Contemporary Art', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=_G6AQdKVPBo', description: 'Conceptual art, street art, and new media.' },
    ]
  },
  {
    title: 'Flutter Mobile Dev',
    category: 'Mobile',
    level: 'Intermediate',
    description: 'Cross-platform mobile apps with Flutter and Dart.',
    duration: '6 weeks',
    modules: [
      { title: 'Dart Language Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=veMhOYRib9o', description: 'Syntax, types, and OOP in Dart.' },
      { title: 'Flutter Widgets', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=1ukSR1GRtMU', description: 'Stateless and stateful widgets.' },
      { title: 'Navigation & Routing', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=nyvwx7o277U', description: 'Navigator 2.0 and routes.' },
      { title: 'State Management with Provider', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=d_m5csmrf7I', description: 'Managing app state cleanly.' },
      { title: 'Flutter & Firebase', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=sfA3NWDBPZ4', description: 'Auth, Firestore, and cloud functions.' },
    ]
  },
  {
    title: 'Rust Programming',
    category: 'Programming',
    level: 'Advanced',
    description: 'Systems programming, ownership, and safe concurrency.',
    duration: '6 weeks',
    modules: [
      { title: 'Rust Basics & Setup', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=zF34dRivLOw', description: 'Installation, cargo, and hello world.' },
      { title: 'Ownership & Borrowing', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=VFIOSWy93H0', description: "Rust's memory model without GC." },
      { title: 'Structs & Enums', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Ck1LjSbV3KQ', description: 'Custom types and pattern matching.' },
      { title: 'Error Handling', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=y3wUCb-uS7g', description: 'Result, Option, and the ? operator.' },
      { title: 'Concurrency in Rust', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=06WcsNPVD1g', description: 'Threads and the fearless concurrency model.' },
    ]
  },
  {
    title: 'Kubernetes Basics',
    category: 'DevOps',
    level: 'Advanced',
    description: 'Pods, services, deployments, and orchestration.',
    duration: '5 weeks',
    modules: [
      { title: 'Introduction to Kubernetes', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=X48VuDVv0do', description: 'Architecture: nodes, pods, clusters.' },
      { title: 'Pods & Deployments', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=EQNO_kM96Mo', description: 'Running and managing workloads.' },
      { title: 'Services & Networking', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=T4Z7visMM4E', description: 'ClusterIP, NodePort, LoadBalancer.' },
      { title: 'ConfigMaps & Secrets', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=FAnQTgr04mU', description: 'Managing configuration and credentials.' },
      { title: 'Helm Charts', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=fy8SHvNZGeE', description: 'Packaging Kubernetes apps.' },
    ]
  },
  {
    title: 'Blockchain Fundamentals',
    category: 'Blockchain',
    level: 'Intermediate',
    description: 'Ethereum, smart contracts, and DeFi principles.',
    duration: '6 weeks',
    modules: [
      { title: 'How Blockchain Works', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=SSo_EIwHSd4', description: 'Distributed ledgers, consensus, and hashing.' },
      { title: 'Bitcoin & Crypto Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=bBC-nXj3Ng4', description: 'Wallets, keys, and transactions.' },
      { title: 'Ethereum & EVM', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=IsXvoYeJxKA', description: 'Smart contract platform overview.' },
      { title: 'Solidity Smart Contracts', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=M576WGiDBdQ', description: 'Writing your first smart contract.' },
      { title: 'DeFi & Web3', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=17QRFlml4pA', description: 'Decentralized finance protocols.' },
    ]
  },
  {
    title: 'Computer Vision',
    category: 'AI',
    level: 'Advanced',
    description: 'OpenCV, CNNs, object detection, and image processing.',
    duration: '8 weeks',
    modules: [
      { title: 'Image Processing Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=kSqxn6zGE0c', description: 'Pixels, convolutions, and filters.' },
      { title: 'OpenCV with Python', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=oXlwWbU8l2o', description: 'Reading, manipulating, and displaying images.' },
      { title: 'Convolutional Neural Networks', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=YRhxdVk_sIs', description: 'Architecture of CNNs explained.' },
      { title: 'Object Detection with YOLO', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Grir6TZbc1M', description: 'Real-time object recognition.' },
      { title: 'Image Segmentation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=nDPWywWRIRo', description: 'Semantic and instance segmentation.' },
    ]
  },
  {
    title: 'GraphQL with Apollo',
    category: 'Programming',
    level: 'Advanced',
    description: 'Schema design, resolvers, subscriptions, and federation.',
    duration: '4 weeks',
    modules: [
      { title: 'GraphQL Fundamentals', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=ed8SzALpx1Q', description: 'Queries, mutations, and types.' },
      { title: 'Apollo Server', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=I6ypD7qv3Z8', description: 'Building a GraphQL API.' },
      { title: 'Apollo Client & React', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=YyUWW04HwKY', description: 'Fetching GraphQL data in React.' },
      { title: 'GraphQL Subscriptions', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=bn8qsi8jVew', description: 'Real-time data with WebSockets.' },
      { title: 'Schema Federation', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=v_1bn2sHdk4', description: 'Composing distributed GraphQL services.' },
    ]
  },
  {
    title: 'Go (Golang) for Backend',
    category: 'Programming',
    level: 'Intermediate',
    description: 'Concurrency, HTTP servers, and microservices in Go.',
    duration: '5 weeks',
    modules: [
      { title: 'Go Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=un6ZyFkqFKo', description: 'Variables, types, functions, structs.' },
      { title: 'Goroutines & Channels', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=f6kdp27TYZs', description: "Go's concurrency model." },
      { title: 'HTTP Servers with Go', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=5BIylxkudaE', description: 'net/http, mux, and middleware.' },
      { title: 'Working with Databases', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=prh0hTyI1sU', description: 'database/sql and GORM.' },
      { title: 'REST APIs in Go', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=bj77B59nkTQ', description: 'Building a production-grade API.' },
    ]
  },
  {
    title: 'Vue.js 3',
    category: 'Programming',
    level: 'Intermediate',
    description: 'Composition API, Pinia, and modern Vue development.',
    duration: '5 weeks',
    modules: [
      { title: 'Vue 3 Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=YrxBCBibVo0', description: 'Templates, directives, and component basics.' },
      { title: 'Composition API', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=bwItFdPt-6M', description: 'Reactive state with ref and reactive.' },
      { title: 'Vue Router', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=LLnEfiHPdlI', description: 'Routing and navigation guards.' },
      { title: 'Pinia State Management', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=JGC7aAC-3y8', description: 'Modern Vue state management.' },
      { title: 'Vue 3 with TypeScript', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=2otcqgrMWg8', description: 'Typed Vue components.' },
    ]
  },
  {
    title: 'Swift iOS Development',
    category: 'Mobile',
    level: 'Intermediate',
    description: 'SwiftUI, UIKit, Core Data, and App Store publishing.',
    duration: '7 weeks',
    modules: [
      { title: 'Swift Language Fundamentals', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=comQ1-x2a1Q', description: 'Optionals, closures, and Swift syntax.' },
      { title: 'SwiftUI Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=F2ojC6TNwws', description: 'Views, modifiers, and state.' },
      { title: 'Navigation & Data Flow', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=0D_Z0Mb4VYM', description: 'NavigationStack, @Binding, @EnvironmentObject.' },
      { title: 'Networking in iOS', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=zvfViYmETuc', description: 'URLSession and Codable.' },
      { title: 'Core Data Persistence', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=O7u9nYWjvKk', description: 'Saving and fetching local data.' },
    ]
  },
  {
    title: 'Android Kotlin',
    category: 'Mobile',
    level: 'Intermediate',
    description: 'Jetpack Compose, ViewModel, and Android architecture.',
    duration: '6 weeks',
    modules: [
      { title: 'Kotlin Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=F9UC9DY-vIU', description: 'Kotlin syntax for Android devs.' },
      { title: 'Jetpack Compose', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=cDabx3SjuOY', description: 'Composable functions and UI.' },
      { title: 'ViewModel & LiveData', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=TPawkXiKBMQ', description: 'Handling data with architecture components.' },
      { title: 'Room Database', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=lwAvI3WDXBY', description: 'Local SQLite storage in Android.' },
      { title: 'Retrofit & REST APIs', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=t6Sql3WMAnk', description: 'Network calls in Android apps.' },
    ]
  },
  {
    title: 'Ethical Hacking',
    category: 'Security',
    level: 'Advanced',
    description: 'Penetration testing, reconnaissance, and exploitation techniques.',
    duration: '8 weeks',
    modules: [
      { title: 'Ethical Hacking Overview', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=3Kq1MIfTWCE', description: 'Legal basics, phases, and mindset.' },
      { title: 'Reconnaissance Techniques', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=cOxOHCpz3a4', description: 'OSINT and passive recon.' },
      { title: 'Scanning & Enumeration', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=4t4kBkMsDbQ', description: 'Nmap and network analysis.' },
      { title: 'Exploitation Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=2DqdPcbYcy8', description: 'Metasploit framework fundamentals.' },
      { title: 'Web Application Testing', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=X4eRbHgRQ6Y', description: 'OWASP Top 10 vulnerabilities.' },
    ]
  },
  {
    title: 'Data Visualization',
    category: 'Data Science',
    level: 'Intermediate',
    description: 'Tableau, D3.js, and principles of effective visualization.',
    duration: '4 weeks',
    modules: [
      { title: 'Visualization Principles', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=5Zg-C8AAIGg', description: 'What makes a good chart?' },
      { title: 'Tableau Fundamentals', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=aHaOIvR00So', description: 'Connecting data and building views.' },
      { title: 'D3.js Introduction', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=_8V5o2UHG0E', description: 'Data-driven SVG in the browser.' },
      { title: 'Storytelling with Data', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=r5_34YnCmMY', description: 'Presenting insights clearly.' },
      { title: 'Interactive Dashboards', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=SnqR-d5U0SE', description: 'Filters, sliders, and drill-downs.' },
    ]
  },
  {
    title: 'Critical Thinking',
    category: 'Soft Skills',
    level: 'Intermediate',
    description: 'Logic, argumentation, bias detection, and problem solving.',
    duration: '3 weeks',
    modules: [
      { title: 'What is Critical Thinking?', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=6OLPL5p0fMg', description: 'Definition and why it matters.' },
      { title: 'Logical Fallacies', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=GEmuU5_apNA', description: 'Common errors in reasoning.' },
      { title: 'Cognitive Biases', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=wEwGBIr_RIw', description: 'How our minds mislead us.' },
      { title: 'Argument Analysis', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=tCXTvFMIzMw', description: 'Breaking down and evaluating arguments.' },
      { title: 'Problem-Solving Frameworks', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=z4R71fHK4ms', description: 'Structured approaches to complex problems.' },
    ]
  },
  {
    title: 'Leadership & Management',
    category: 'Business',
    level: 'Advanced',
    description: 'Team building, motivation, strategy, and leadership styles.',
    duration: '5 weeks',
    modules: [
      { title: 'Leadership Styles', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=v2PaZ8Nl2vs', description: 'Transformational, servant, and situational leadership.' },
      { title: 'Emotional Intelligence', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Y7m9eNoB3NU', description: 'Self-awareness, empathy, and social skills.' },
      { title: 'Building High-Performance Teams', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=LOPczXKUK3w', description: 'Hiring, motivation, and team dynamics.' },
      { title: 'Strategic Thinking', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=iuYlGRnC7J8', description: 'Long-term planning and decision making.' },
      { title: 'Conflict Resolution', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=KY5TWVz5ZDU', description: 'Managing disagreements productively.' },
    ]
  },
  {
    title: 'Serverless Architecture',
    category: 'Cloud',
    level: 'Advanced',
    description: 'AWS Lambda, API Gateway, event-driven design patterns.',
    duration: '4 weeks',
    modules: [
      { title: 'Serverless Concepts', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=W_VV2Fx32_Y', description: 'FaaS, BaaS, and when to go serverless.' },
      { title: 'AWS Lambda Deep Dive', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=97q30JjEq9Y', description: 'Functions, triggers, and execution models.' },
      { title: 'API Gateway', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=1A8A1vsfNkc', description: 'REST and HTTP APIs with Lambda.' },
      { title: 'DynamoDB & Serverless Data', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=2k2GINpO308', description: 'NoSQL at serverless scale.' },
      { title: 'Serverless Framework & IaC', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=HhgXwKFUzT8', description: 'Deploying with Serverless Framework.' },
    ]
  },
  {
    title: 'Angular Deep Dive',
    category: 'Programming',
    level: 'Advanced',
    description: 'RxJS, dependency injection, modules, and performance.',
    duration: '6 weeks',
    modules: [
      { title: 'Angular Architecture', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=3qBXWUpoPHo', description: 'Modules, components, and the Angular CLI.' },
      { title: 'Data Binding & Directives', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Edf_oGg2IhE', description: 'Two-way binding, ngIf, ngFor.' },
      { title: 'Services & Dependency Injection', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=OFPIGlxiunI', description: 'Singleton services and DI patterns.' },
      { title: 'RxJS & Observables', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=T9wOu11uU6U', description: 'Reactive programming in Angular.' },
      { title: 'Angular Forms', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=6XYBgCHNBvQ', description: 'Template-driven and reactive forms.' },
    ]
  },
  {
    title: 'Big Data Hadoop',
    category: 'Data',
    level: 'Advanced',
    description: 'MapReduce, HDFS, Spark, and big data architecture.',
    duration: '6 weeks',
    modules: [
      { title: 'Big Data Introduction', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=jKCj4BxGTi8', description: 'The 3 Vs, Hadoop ecosystem overview.' },
      { title: 'HDFS Architecture', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=GJYEsEEfjvk', description: 'Distributed file storage.' },
      { title: 'MapReduce', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=SqvAaB3vK8U', description: 'Parallel data processing.' },
      { title: 'Apache Spark', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=F8pyaR4uQ2g', description: 'In-memory processing with Spark.' },
      { title: 'Data Pipelines & ETL', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=VtzvF17ysbc', description: 'Building production data pipelines.' },
    ]
  },
  {
    title: 'Web Accessibility',
    category: 'Design',
    level: 'Beginner',
    description: 'WCAG standards, ARIA, and inclusive design patterns.',
    duration: '3 weeks',
    modules: [
      { title: 'Why Accessibility Matters', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=20SHvU2PKsM', description: 'Legal requirements and ethical foundations.' },
      { title: 'WCAG Guidelines', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=x4PXBokK8SQ', description: 'Perceivable, operable, understandable, robust.' },
      { title: 'Semantic HTML', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=bOUhq46fd5g', description: 'Using proper HTML elements.' },
      { title: 'ARIA & Screen Readers', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=0hqhAIjE_8I', description: 'Accessible rich internet applications.' },
      { title: 'Keyboard Navigation & Focus', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=Pe0Ce1WtnUM', description: 'Ensuring full keyboard accessibility.' },
    ]
  },
  {
    title: 'Physics: Electromagnetism',
    category: 'Physics',
    level: 'Advanced',
    description: 'Electricity, magnetism, circuits, and Maxwell equations.',
    duration: '8 weeks',
    modules: [
      { title: "Coulomb's Law & Electric Fields", content_type: 'video', content_url: 'https://www.youtube.com/watch?v=ZqFrrM8DFOU', description: 'Electric force and field lines.' },
      { title: 'Circuits: Current & Resistance', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=mc979OhitAg', description: "Ohm's law, series/parallel circuits." },
      { title: 'Magnetic Fields & Forces', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=qLW_A4wExH4', description: 'Sources of magnetic fields, Lorentz force.' },
      { title: 'Electromagnetic Induction', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=LqRHpNjTBtA', description: "Faraday's and Lenz's laws." },
      { title: "Maxwell's Equations", content_type: 'video', content_url: 'https://www.youtube.com/watch?v=-aVeZbpxVgw', description: 'Unifying electricity and magnetism.' },
    ]
  },
];

const FEATURED_VIDEOS = [
  {
    id: 'fv1',
    title: 'How Neural Networks Work',
    channel: '3Blue1Brown',
    thumbnail: 'https://img.youtube.com/vi/aircAruvnKk/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=aircAruvnKk',
    category: 'AI',
    views: '14M views',
    duration: '19:13'
  },
  {
    id: 'fv2',
    title: 'Linear Algebra: The Essence',
    channel: '3Blue1Brown',
    thumbnail: 'https://img.youtube.com/vi/fNk_zzaMoSs/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
    category: 'Mathematics',
    views: '9.2M views',
    duration: '15:45'
  },
  {
    id: 'fv3',
    title: 'JavaScript Tutorial for Beginners',
    channel: 'Programming with Mosh',
    thumbnail: 'https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
    category: 'Programming',
    views: '25M views',
    duration: '48:17'
  },
  {
    id: 'fv4',
    title: 'React Tutorial for Beginners',
    channel: 'Programming with Mosh',
    thumbnail: 'https://img.youtube.com/vi/Tn6-PIqc4UM/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM',
    category: 'Programming',
    views: '11M views',
    duration: '1:20:22'
  },
  {
    id: 'fv5',
    title: 'Machine Learning Crash Course',
    channel: 'StatQuest',
    thumbnail: 'https://img.youtube.com/vi/GwIo3gDZCVQ/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=GwIo3gDZCVQ',
    category: 'AI',
    views: '2.1M views',
    duration: '5:56'
  },
  {
    id: 'fv6',
    title: 'Docker Tutorial for Beginners',
    channel: 'TechWorld with Nana',
    thumbnail: 'https://img.youtube.com/vi/3c-iBn73dDE/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=3c-iBn73dDE',
    category: 'DevOps',
    views: '5.4M views',
    duration: '55:28'
  },
  {
    id: 'fv7',
    title: 'Python for Data Science (Full)',
    channel: 'freeCodeCamp',
    thumbnail: 'https://img.youtube.com/vi/r-uOLxNrNk8/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8',
    category: 'Data Science',
    views: '5.8M views',
    duration: '4:51:43'
  },
  {
    id: 'fv8',
    title: 'SQL Tutorial - Full Course',
    channel: 'freeCodeCamp',
    thumbnail: 'https://img.youtube.com/vi/HXV3zeQKqGY/maxresdefault.jpg',
    url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
    category: 'Databases',
    views: '10M views',
    duration: '4:20:37'
  },
];

// ─── SEED FUNCTIONS ───────────────────────────────────────────────────────────
async function seedSkillsIfNeeded() {
  const { count } = await supabase.from('skills').select('*', { count: 'exact', head: true });
  if (count && count >= 40) return;

  for (const skillData of SKILLS_WITH_MODULES) {
    const { modules, ...skillFields } = skillData;

    const { data: newSkill, error: skillError } = await supabase
      .from('skills')
      .insert(skillFields)
      .select()
      .single();

    if (skillError || !newSkill) {
      console.error('Failed to seed skill:', skillFields.title, skillError);
      continue;
    }

    const modulesWithOrder = modules.map((m, idx) => ({
      ...m,
      skill_id: newSkill.id,
      order_index: idx + 1,
    }));

    const { error: modError } = await supabase
      .from('skill_modules')
      .insert(modulesWithOrder);

    if (modError) {
      console.error('Failed to seed modules for:', skillFields.title, modError);
    }
  }
  console.log(`Seeded ${SKILLS_WITH_MODULES.length} skills with modules`);
}

async function seedAdminUser() {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'admin@example.com')
    .maybeSingle();

  if (!existing) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@example.com',
      password: 'Admin123!',
      options: { data: { full_name: 'Admin' } }
    });
    if (!authError && authData.user) {
      await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', authData.user.id);
      console.log('Admin user created');
    }
  }
}

// ─── FEATURED VIDEOS COMPONENT ───────────────────────────────────────────────
function FeaturedVideos({ isMobile }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [loadErrors, setLoadErrors] = useState({});

  const CATEGORY_COLORS = {
    'AI': '#A78BFA',
    'Mathematics': '#38BDF8',
    'Programming': '#10B981',
    'Data Science': '#F59E0B',
    'DevOps': '#EF4444',
    'Databases': '#FB923C',
    'Security': '#F43F5E',
    'Business': '#34D399',
    'Design': '#E879F9',
  };

  const handleImgError = (id) => {
    setLoadErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <section style={{ padding: isMobile ? '48px 16px' : '80px 24px', background: T.bgMid }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 4, height: 28, borderRadius: 2,
                background: `linear-gradient(180deg, ${T.accent}, #818CF8)`,
              }} />
              <h2 style={{
                fontFamily: T.fontHead, fontSize: isMobile ? 24 : 32,
                fontWeight: 700, letterSpacing: '-0.03em', color: T.textPri
              }}>
                Featured <span style={{ color: T.accent }}>Video Lessons</span>
              </h2>
            </div>
            <p style={{ color: T.textSec, fontSize: 14, marginLeft: 14 }}>
              Handpicked from the best educators on YouTube
            </p>
          </div>
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: T.fontHead, fontSize: 12, fontWeight: 600,
              color: T.accent, letterSpacing: '0.05em',
              padding: '6px 14px', borderRadius: 99,
              border: `1px solid ${T.accent}44`,
              background: `${T.accent}11`,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            View on YouTube →
          </a>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {FEATURED_VIDEOS.map((video, idx) => {
            const isHovered = hoveredId === video.id;
            const catColor = CATEGORY_COLORS[video.category] || T.accent;
            const imgFailed = loadErrors[video.id];

            return (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setHoveredId(video.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  borderRadius: T.radius,
                  overflow: 'hidden',
                  background: T.bgCard,
                  border: `1px solid ${isHovered ? catColor + '60' : T.border}`,
                  boxShadow: isHovered ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${catColor}30` : '0 2px 12px rgba(0,0,0,0.3)',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                  animation: `fadeUp 0.4s ease both ${idx * 0.06}s`,
                }}
              >
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden', background: '#0D1526' }}>
                  {!imgFailed ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      onError={() => handleImgError(video.id)}
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        filter: isHovered ? 'brightness(1.1)' : 'brightness(0.85)',
                        transition: 'filter 0.25s',
                      }}
                    />
                  ) : (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(135deg, #0D1526, #111827)`,
                    }}>
                      <span style={{ fontSize: 40 }}>🎬</span>
                    </div>
                  )}

                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isHovered ? 'rgba(0,0,0,0.2)' : 'transparent',
                    transition: 'background 0.25s',
                  }}>
                    {isHovered && (
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeUp 0.15s ease',
                      }}>
                        <span style={{ fontSize: 20, marginLeft: 3 }}>▶</span>
                      </div>
                    )}
                  </div>

                  <div style={{
                    position: 'absolute', bottom: 8, right: 8,
                    background: 'rgba(0,0,0,0.85)',
                    padding: '2px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 600, color: '#fff',
                    fontFamily: T.fontHead, letterSpacing: '0.02em',
                  }}>
                    {video.duration}
                  </div>

                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    background: `${catColor}22`,
                    border: `1px solid ${catColor}55`,
                    padding: '2px 10px', borderRadius: 99,
                    fontSize: 10, fontWeight: 700, color: catColor,
                    fontFamily: T.fontHead, letterSpacing: '0.06em',
                    backdropFilter: 'blur(6px)',
                  }}>
                    {video.category.toUpperCase()}
                  </div>
                </div>

                <div style={{ padding: '14px 16px 16px' }}>
                  <div style={{
                    fontFamily: T.fontHead, fontWeight: 600,
                    fontSize: 14, color: isHovered ? T.textPri : T.textPri,
                    lineHeight: 1.4, marginBottom: 8,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {video.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: `${catColor}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10,
                      }}>
                        🎓
                      </div>
                      <span style={{ fontSize: 12, color: T.textSec, fontFamily: T.fontBody }}>{video.channel}</span>
                    </div>
                    <span style={{ fontSize: 11, color: T.textMut }}>{video.views}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        <div style={{
          marginTop: 32, textAlign: 'center',
          padding: '20px', borderRadius: T.radius,
          background: `${T.accent}08`,
          border: `1px solid ${T.accent}20`,
        }}>
          <p style={{ color: T.textSec, fontSize: 13, marginBottom: 0 }}>
            💡 All video content is sourced from reputable educators on YouTube.
            Enroll in a course above to track your progress automatically.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── LANDING PAGE (includes FeaturedVideos) ──────────────────────────────────
function LandingPage() {
  const navigate = useNavigate();
  const [topSkills, setTopSkills] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const { data: reviews } = await supabase.from('reviews').select('skill_id, rating');
        const ratingMap = {};
        reviews?.forEach(r => {
          if (!ratingMap[r.skill_id]) ratingMap[r.skill_id] = { sum: 0, count: 0 };
          ratingMap[r.skill_id].sum += r.rating;
          ratingMap[r.skill_id].count++;
        });
        const { data: skills } = await supabase.from('skills').select('*');
        const skillsWithRating = skills?.map(s => ({
          ...s,
          avgRating: ratingMap[s.id] ? (ratingMap[s.id].sum / ratingMap[s.id].count).toFixed(1) : 0,
          reviewCount: ratingMap[s.id]?.count || 0
        })) || [];
        skillsWithRating.sort((a, b) => b.avgRating - a.avgRating);
        setTopSkills(skillsWithRating.slice(0, isMobile ? 3 : 6));
        const { data: latestReviews } = await supabase
          .from('reviews')
          .select('*, users(email), skills(title)')
          .order('created_at', { ascending: false })
          .limit(3);
        setRecentReviews(latestReviews || []);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, [isMobile]);

  const features = [
    { icon:'🎯', title:'Easy Skill Discovery', desc:'Quickly find skills that match your interests and goals.' },
    { icon:'⚡', title:'Auto Progress Tracking', desc:'Progress updates automatically as you open modules.' },
    { icon:'📚', title:'Structured Learning', desc:'Step-by-step learning paths guide your progress.' },
    { icon:'🔒', title:'Secure & Reliable', desc:'Your data is protected with enterprise-grade security.' },
    { icon:'📱', title:'Access Anywhere', desc:'Works seamlessly on desktop, tablet, and mobile.' },
    { icon:'🚀', title:'Admin Dashboard', desc:'Create and manage your own skills with ease.' },
    { icon:'🔄', title:'Real-Time Updates', desc:'Content changes reflect instantly across the platform.' },
    { icon:'🌱', title:'Growing Library', desc:'New skills added as the platform expands.' },
  ];

  const stats = [
    { value: '200+', label: 'Skills Available' },
    { value: '50K+', label: 'Active Learners' },
    { value: '98%', label: 'Satisfaction Rate' },
    { value: '24/7', label: 'Platform Uptime' },
  ];

  return (
    <div style={{ fontFamily: T.fontBody }}>
      <section style={{
        minHeight: isMobile ? '80vh' : '90vh',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', textAlign:'center',
        padding: isMobile ? '60px 20px' : '80px 24px',
        position:'relative', overflow:'hidden'
      }}>
        <div style={{
          position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
          width: isMobile ? 300 : 600, height: isMobile ? 300 : 600, borderRadius:'50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
          pointerEvents:'none'
        }} />
        <div style={{ animation: 'fadeUp 0.7s ease both', maxWidth: 760, width: '100%' }}>
          <h1 style={{
            fontFamily: T.fontHead, fontWeight: 800, letterSpacing: '-0.04em',
            fontSize: isMobile ? '36px' : 'clamp(38px, 7vw, 76px)', lineHeight: 1.05,
            color: T.textPri, marginTop: 24, marginBottom: 20
          }}>
            Learn any skill.<br/>
            <span style={{ color: T.accent }}>Level up faster.</span>
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 18, color: T.textSec, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' }}>
            Skillery Pro is a modern platform for discovering, learning, and organizing practical skills — all in one clean, fast interface.
          </p>
          <div style={{ display:'flex', gap: 12, justifyContent:'center', flexWrap:'wrap' }}>
            <Btn onClick={() => navigate('/signup')} style={{ padding: isMobile ? '12px 24px' : '14px 32px', fontSize: isMobile ? 14 : 15 }}>
              Get Started Free →
            </Btn>
            <Btn variant="secondary" onClick={() => navigate('/login')} style={{ padding: isMobile ? '12px 24px' : '14px 32px', fontSize: isMobile ? 14 : 15 }}>
              Sign In
            </Btn>
          </div>
        </div>
      </section>

      <section style={{ padding: '32px 16px', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
        <div style={{
          maxWidth: 900, margin:'0 auto',
          display:'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? 16 : 24,
          textAlign:'center'
        }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: T.fontHead, fontWeight: 800, fontSize: isMobile ? 28 : 36, color: T.accent }}>{s.value}</div>
              <div style={{ color: T.textSec, fontSize: 13, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: isMobile ? '48px 16px' : '80px 24px', background: T.bgMid }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontFamily: T.fontHead, fontSize: isMobile ? 26 : 36, fontWeight: 700, letterSpacing: '-0.03em' }}>
              Top Rated <span style={{ color: T.accent }}>Courses</span>
            </h2>
            <p style={{ color: T.textSec, marginTop: 12, fontSize: 14 }}>Our community's favorites — highly recommended by learners.</p>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center' }}><Spinner /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {topSkills.map(skill => (
                <Card key={skill.id} hover style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Badge color={T.accent}>{skill.category || 'General'}</Badge>
                    <RatingStars rating={parseFloat(skill.avgRating)} readonly size={14} />
                  </div>
                  <Link to={`/skill/${skill.id}`}>
                    <h3 style={{ fontFamily: T.fontHead, fontSize: 17, fontWeight: 600, marginBottom: 8, color: T.textPri }}>{skill.title}</h3>
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

      <FeaturedVideos isMobile={isMobile} />

      <section style={{ padding: isMobile ? '48px 16px' : '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: T.fontHead, fontSize: isMobile ? 26 : 36, fontWeight: 700, letterSpacing:'-0.03em' }}>
              Everything you need to <span style={{ color: T.accent }}>grow</span>
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {features.map((f, i) => (
              <Card key={f.title} style={{ padding: isMobile ? 16 : 20, animation: `fadeUp 0.5s ease both ${i * 0.05}s` }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: isMobile ? 13 : 15, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ color: T.textSec, fontSize: 12, lineHeight: 1.6 }}>{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? '48px 16px' : '80px 24px', textAlign:'center' }}>
        <Card style={{ maxWidth: 600, margin:'0 auto', padding: isMobile ? '32px 20px' : '48px 32px', background:`linear-gradient(135deg, ${T.bgCard}, ${T.bgMid})` }} glow>
          <h2 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: isMobile ? 24 : 30, letterSpacing:'-0.03em', marginBottom: 16 }}>
            Ready to start learning?
          </h2>
          <p style={{ color: T.textSec, marginBottom: 28, lineHeight: 1.6, fontSize: 14 }}>
            Join thousands of learners already growing with Skillery Pro.
          </p>
          <Btn onClick={() => navigate('/signup')} style={{ padding:'14px 40px', fontSize: 15 }}>
            Create Free Account
          </Btn>
        </Card>
      </section>

      <footer style={{ padding: '24px 16px', borderTop:`1px solid ${T.border}`, textAlign:'center' }}>
        <p style={{ color: T.textMut, fontSize: 13 }}>
          © {new Date().getFullYear()} Skillery Pro. Built with React + Supabase.
        </p>
      </footer>
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthLayout({ children, title, subtitle }) {
  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding: 16, background: T.bg
    }}>
      <div style={{ width:'100%', maxWidth: 440, animation:'fadeUp 0.5s ease both' }}>
        <div style={{ textAlign:'center', marginBottom: 28 }}>
          <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:T.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:T.fontHead, fontWeight:800, color:T.bg, fontSize:20 }}>S</span>
            </div>
            <span style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:18 }}>Skillery<span style={{color:T.accent}}>Pro</span></span>
          </Link>
          <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize:24, letterSpacing:'-0.03em' }}>{title}</h1>
          <p style={{ color:T.textSec, marginTop:8, fontSize:14 }}>{subtitle}</p>
        </div>
        <Card glow>{children}</Card>
      </div>
    </div>
  );
}

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate('/dashboard');
  };

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
  );
}

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const { error: err } = await signUp(email, password, name);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
  };

  if (success) return (
    <AuthLayout title="Check your email" subtitle="We sent you a confirmation link">
      <div style={{ textAlign:'center', padding: '16px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
        <p style={{ color:T.textSec, lineHeight:1.6, marginBottom:24, fontSize: 14 }}>
          We've sent a confirmation link to <strong style={{color:T.textPri}}>{email}</strong>. Click it to activate your account.
        </p>
        <Btn onClick={() => navigate('/login')} style={{ width:'100%', justifyContent:'center' }}>Go to Login</Btn>
      </div>
    </AuthLayout>
  );

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
  );
}

// ─── DASHBOARD (USER) ────────────────────────────────────────────────────────
function DashboardPage({ user }) {
  const [skills, setSkills] = useState([]);
  const [progress, setProgress] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: s }, { data: p }, { data: r }] = await Promise.all([
        supabase.from('skills').select('*').limit(8).order('created_at', { ascending: false }),
        supabase.from('user_progress').select('*, skills(title, id)').eq('user_id', user.id),
        supabase.from('reviews').select('*, skills(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
      ]);
      setSkills(s || []);
      setProgress(p || []);
      setReviews(r || []);
      setLoading(false);
    };
    fetchData();
  }, [user.id]);

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const totalProgress = progress.length;
  const completed = progress.filter(p => p.completed).length;
  const inProgress = totalProgress - completed;
  const avgProgress = totalProgress ? Math.round(progress.reduce((acc, p) => acc + (p.progress_pct || 0), 0) / totalProgress) : 0;

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding: isMobile ? '24px 16px' : '40px 24px' }}>
      <div style={{ marginBottom: 28, animation: 'fadeUp 0.4s ease' }}>
        <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize: isMobile ? 22 : 28, letterSpacing:'-0.03em' }}>
          {greeting}, <span style={{ color:T.accent }}>{displayName}</span> 👋
        </h1>
        <p style={{ color:T.textSec, marginTop:6, fontSize:14 }}>Here's your learning overview for today.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label:'Enrolled', value: totalProgress, icon:'📚', color:T.accent },
          { label:'Completed', value: completed, icon:'✅', color:T.green },
          { label:'In Progress', value: inProgress, icon:'⚡', color:T.gold },
          { label:'Avg Progress', value: `${avgProgress}%`, icon:'📊', color:'#A78BFA' },
        ].map(s => (
          <Card key={s.label} style={{ padding:'16px', textAlign:'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily:T.fontHead, fontWeight:700, fontSize: 24, color:s.color }}>{s.value}</div>
            <div style={{ color:T.textSec, fontSize:12, marginTop:2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:15 }}>My Enrolled Skills</h2>
            <Link to="/skills" style={{ fontSize:12, color:T.accent }}>Browse →</Link>
          </div>
          {progress.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🌱</div>
              <p style={{ color:T.textSec, fontSize:13 }}>No skills enrolled yet.</p>
              <Link to="/skills" style={{ color:T.accent, fontSize:13, marginTop:8, display:'inline-block' }}>Start Learning →</Link>
            </div>
          ) : (
            progress.map(p => (
              <div key={p.id} style={{ padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:500 }}>{p.skills?.title || 'Skill'}</span>
                  <span style={{ fontSize:12, color: p.completed ? T.green : T.textSec }}>{p.completed ? '✓ Done' : `${p.progress_pct || 0}%`}</span>
                </div>
                <div style={{ height:4, background:T.border, borderRadius:2 }}>
                  <div style={{ height:'100%', width:`${p.progress_pct || 0}%`, background: p.completed ? T.green : T.accent, borderRadius:2, transition:'width 0.4s' }} />
                </div>
              </div>
            ))
          )}
        </Card>

        <Card>
          <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:15, marginBottom:16 }}>Your Recent Reviews</h2>
          {reviews.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>✍️</div>
              <p style={{ color:T.textSec, fontSize:13 }}>No reviews written yet.</p>
              <Link to="/skills" style={{ color:T.accent, fontSize:13, marginTop:8, display:'inline-block' }}>Rate a skill →</Link>
            </div>
          ) : (
            reviews.map(r => (
              <div key={r.id} style={{ padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:500 }}>{r.skills?.title}</span>
                  <RatingStars rating={r.rating} readonly size={13} />
                </div>
                <p style={{ color:T.textSec, fontSize:12, marginTop:3 }}>{r.comment?.substring(0, 60)}...</p>
              </div>
            ))
          )}
        </Card>
      </div>

      <div>
        <h2 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:17, marginBottom:14 }}>🔥 Recommended for you</h2>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {skills.slice(0, isMobile ? 2 : 4).map(skill => (
            <Card key={skill.id} hover style={{ padding: 14 }}>
              <h3 style={{ fontSize:14, fontWeight:600, marginBottom: 4 }}>{skill.title}</h3>
              <p style={{ fontSize:12, color:T.textSec }}>{skill.category}</p>
              <Link to={`/skill/${skill.id}`} style={{ fontSize:12, color:T.accent, marginTop:10, display:'inline-block' }}>View →</Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SKILL DETAIL PAGE (auto progress on module open) ────────────────────────
function SkillDetailPage({ user }) {
  const { skillId } = useParams();
  const [skill, setSkill] = useState(null);
  const [modules, setModules] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [userRating, setUserRating] = useState(null);
  const [userComment, setUserComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState(null);
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const { progressPct, markModuleComplete, isModuleCompleted } = useAutoProgress(
    enrollmentId,
    modules,
    0
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: skillData } = await supabase.from('skills').select('*').eq('id', skillId).single();
      setSkill(skillData);

      const { data: modulesData } = await supabase
        .from('skill_modules')
        .select('*')
        .eq('skill_id', skillId)
        .order('order_index', { ascending: true });
      setModules(modulesData || []);

      const { data: reviewsData } = await supabase.from('reviews').select('*, users(email)').eq('skill_id', skillId).order('created_at', { ascending: false });
      setReviews(reviewsData || []);
      const avg = reviewsData?.length ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length).toFixed(1) : 0;
      setAvgRating(avg);

      if (user) {
        const { data: prog } = await supabase.from('user_progress').select('*').eq('user_id', user.id).eq('skill_id', skillId).maybeSingle();
        setEnrolled(!!prog);
        if (prog) setEnrollmentId(prog.id);

        const { data: myReview } = await supabase.from('reviews').select('*').eq('user_id', user.id).eq('skill_id', skillId).maybeSingle();
        if (myReview) {
          setUserRating(myReview.rating);
          setUserComment(myReview.comment || '');
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [skillId, user]);

  const enroll = async () => {
    const { data, error } = await supabase
      .from('user_progress')
      .upsert({ user_id: user.id, skill_id: skillId, progress_pct: 0, completed: false })
      .select()
      .single();
    if (!error && data) {
      setEnrolled(true);
      setEnrollmentId(data.id);
    } else {
      setMessage('Enrollment failed');
    }
  };

  const handleModuleOpen = async (module) => {
    window.open(module.content_url, '_blank', 'noopener,noreferrer');
    if (enrolled && enrollmentId) {
      await markModuleComplete(module.id);
    }
  };

  const submitReview = async () => {
    if (!userRating) { setMessage('Please select a rating'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('reviews').upsert({
      user_id: user.id,
      skill_id: skillId,
      rating: userRating,
      comment: userComment,
    }, { onConflict: 'user_id, skill_id' });
    if (!error) {
      setMessage('Review saved!');
      const { data } = await supabase.from('reviews').select('*, users(email)').eq('skill_id', skillId).order('created_at', { ascending: false });
      setReviews(data || []);
    } else setMessage('Error saving review');
    setSubmitting(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const getMediaIcon = (type) => {
    switch(type) {
      case 'video': return '🎥';
      case 'audio': return '🎧';
      default: return '📄';
    }
  };

  if (loading) return <Spinner />;
  if (!skill) return <div style={{ padding: 40, textAlign:'center' }}>Skill not found.</div>;

  return (
    <div style={{ maxWidth: 1000, margin:'0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      <Link to="/skills" style={{ color: T.accent, fontSize: 13, marginBottom: 14, display:'inline-block' }}>← Back to Skills</Link>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', flexWrap:'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Badge color={T.accent}>{skill.category || 'General'}</Badge>
            <h1 style={{ fontFamily: T.fontHead, fontSize: isMobile ? 24 : 32, marginTop: 10, lineHeight: 1.2 }}>{skill.title}</h1>
            <p style={{ color: T.textSec, marginTop: 8, fontSize: 14 }}>{skill.description}</p>
            <div style={{ marginTop: 12, display:'flex', gap: 10, alignItems:'center', flexWrap: 'wrap' }}>
              <Badge color={skill.level === 'Advanced' ? T.red : skill.level === 'Intermediate' ? T.gold : T.green}>
                {skill.level || 'Beginner'}
              </Badge>
              {skill.duration && <span style={{ fontSize:12, color:T.textMut }}>⏱ {skill.duration}</span>}
              <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
                <RatingStars rating={avgRating} readonly size={14} />
                <span style={{ fontSize:12, color:T.textSec }}>({reviews.length})</span>
              </div>
            </div>
          </div>

          {user && !enrolled ? (
            <Btn onClick={enroll} style={{ flexShrink: 0 }}>Enroll Now</Btn>
          ) : enrolled && (
            <div style={{ minWidth: 160, flexShrink: 0 }}>
              <div style={{ fontSize:12, marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.textSec }}>Auto Progress</span>
                <span style={{ fontWeight: 600, color: progressPct >= 100 ? T.green : T.accent }}>{progressPct}%</span>
              </div>
              <div style={{ height: 8, background: T.border, borderRadius: 4 }}>
                <div style={{
                  width: `${progressPct}%`, height: '100%',
                  background: progressPct >= 100 ? T.green : T.accent,
                  borderRadius: 4, transition: 'width 0.6s ease'
                }} />
              </div>
              {progressPct >= 100 && (
                <div style={{ fontSize: 12, color: T.green, marginTop: 5, textAlign: 'center' }}>🎉 Course Complete!</div>
              )}
              <div style={{ fontSize: 11, color: T.textMut, marginTop: 4, textAlign: 'center' }}>
                Opens modules = tracks progress
              </div>
            </div>
          )}
        </div>
      </Card>

      {modules.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: T.fontHead, fontSize: isMobile ? 17 : 20 }}>📚 Course Modules</h2>
            {enrolled && (
              <span style={{ fontSize: 12, color: T.textSec }}>
                {[...Array(modules.length)].filter((_, i) => isModuleCompleted(modules[i]?.id)).length}/{modules.length} opened
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {modules.map((mod, idx) => {
              const done = enrolled && isModuleCompleted(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => handleModuleOpen(mod)}
                  className={`module-item ${done ? 'completed' : ''}`}
                  style={{
                    padding: isMobile ? '10px 12px' : '12px 16px',
                    background: done ? `${T.green}10` : T.bgMid,
                    borderRadius: T.radiusSm,
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer',
                    border: `1px solid ${done ? T.green + '40' : T.border}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: 20, flexShrink: 0 }}>
                    {done ? (
                      <span className="check-pop" style={{ display: 'inline-block' }}>✅</span>
                    ) : getMediaIcon(mod.content_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: done ? T.green : T.textPri, marginBottom: 2 }}>
                      {idx + 1}. {mod.title}
                    </div>
                    {mod.description && <div style={{ fontSize: 12, color: T.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.description}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: done ? T.green : T.accent, flexShrink: 0, fontFamily: T.fontHead }}>
                    {done ? 'Done ✓' : 'Open →'}
                  </div>
                </div>
              );
            })}
          </div>
          {enrolled && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: `${T.accent}10`, borderRadius: T.radiusSm, fontSize: 12, color: T.textSec, textAlign: 'center' }}>
              💡 Click any module to open it — progress updates automatically
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 style={{ fontFamily: T.fontHead, fontSize: isMobile ? 17 : 20, marginBottom: 16 }}>Reviews</h2>
        {user && (
          <div style={{ marginBottom: 24, padding: isMobile ? 14 : 16, background: T.bgMid, borderRadius: T.radiusSm }}>
            <p style={{ marginBottom: 8, fontSize: 14 }}>Your review</p>
            <RatingStars rating={userRating} onRate={setUserRating} />
            <textarea
              rows={2}
              value={userComment}
              onChange={e => setUserComment(e.target.value)}
              placeholder="Share your experience..."
              style={{ width:'100%', marginTop: 10, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '8px 10px', color: T.textPri, fontSize: 14 }}
            />
            <Btn small onClick={submitReview} disabled={submitting} style={{ marginTop: 10 }}>Submit Review</Btn>
            {message && <div style={{ marginTop: 6, fontSize: 12, color: T.green }}>{message}</div>}
          </div>
        )}
        {reviews.length === 0 ? (
          <p style={{ color: T.textSec, fontSize: 14 }}>No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map(rev => (
            <div key={rev.id} style={{ borderBottom: `1px solid ${T.border}`, padding: '12px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{rev.users?.email?.split('@')[0] || 'Anonymous'}</span>
                <RatingStars rating={rev.rating} readonly size={13} />
              </div>
              {rev.comment && <p style={{ color: T.textSec, marginTop: 5, fontSize: 13 }}>{rev.comment}</p>}
              <div style={{ fontSize: 11, color: T.textMut, marginTop: 4 }}>{new Date(rev.created_at).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

// ─── SKILLS BROWSER ───────────────────────────────────────────────────────────
function SkillsPage({ user }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [enrolling, setEnrolling] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ratings, setRatings] = useState({});
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  useEffect(() => {
    supabase.from('skills').select('*').order('created_at', { ascending: false })
      .then(async ({ data }) => {
        setSkills(data || []);
        const { data: reviews } = await supabase.from('reviews').select('skill_id, rating');
        if (reviews) {
          const avgMap = {};
          reviews.forEach(r => {
            if (!avgMap[r.skill_id]) avgMap[r.skill_id] = { sum: 0, count: 0 };
            avgMap[r.skill_id].sum += r.rating;
            avgMap[r.skill_id].count++;
          });
          const avgRatings = {};
          Object.entries(avgMap).forEach(([id, { sum, count }]) => {
            avgRatings[id] = (sum / count).toFixed(1);
          });
          setRatings(avgRatings);
        }
        setLoading(false);
      });
  }, []);

  const categories = ['All', ...new Set(skills.map(s => s.category).filter(Boolean))];

  const filtered = skills.filter(s => {
    const matchSearch = s.title?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || s.category === category;
    return matchSearch && matchCat;
  });

  const enroll = async (skillId) => {
    setEnrolling(skillId);
    const { error } = await supabase.from('user_progress').upsert({ user_id: user.id, skill_id: skillId, progress_pct: 0, completed: false });
    setEnrolling(null);
    setMsg(error ? { type:'error', text: error.message } : { type:'success', text:'Enrolled! Head to Workshop to start.' });
    setTimeout(() => setMsg(null), 3000);
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily:T.fontHead, fontWeight:700, fontSize: isMobile ? 22 : 28, letterSpacing:'-0.03em' }}>Skill Library</h1>
        <p style={{ color:T.textSec, marginTop:5, fontSize: 13 }}>Explore 50+ skills across academics and technology.</p>
      </div>

      {msg && <div style={{ marginBottom:14 }}><Alert message={msg.text} type={msg.type} onClose={() => setMsg(null)} /></div>}

      <div style={{ marginBottom: 20 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search skills…"
          style={{
            background:T.bgCard, border:`1.5px solid ${T.border}`,
            borderRadius:T.radiusSm, padding:'10px 14px',
            color:T.textPri, fontFamily:T.fontBody, fontSize:14,
            width: '100%', marginBottom: 12
          }}
        />
        <div className="nav-scroll" style={{ display:'flex', gap:8, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              fontFamily:T.fontHead, fontSize:12, fontWeight:600,
              padding:'6px 14px', borderRadius:99, border:'none', cursor:'pointer',
              background: category === c ? T.accent : T.bgCard,
              color: category === c ? T.bg : T.textSec,
              transition:'all 0.15s', flexShrink: 0
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
        {filtered.map((s, idx) => (
          <Card key={s.id} hover style={{ display:'flex', flexDirection:'column', gap:10, animation: `fadeUp 0.4s ease both ${idx * 0.02}s` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <Badge color={T.accent}>{s.category || 'General'}</Badge>
              <Badge color={s.level === 'Advanced' ? T.red : s.level === 'Intermediate' ? T.gold : T.green}>
                {s.level || 'Beginner'}
              </Badge>
            </div>
            <Link to={`/skill/${s.id}`}>
              <h3 style={{ fontFamily:T.fontHead, fontWeight:600, fontSize:16, color: T.textPri, lineHeight: 1.3 }}>{s.title}</h3>
            </Link>
            <p style={{ color:T.textSec, fontSize:13, lineHeight:1.6, flex:1 }}>{s.description?.substring(0, 90)}...</p>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
              <RatingStars rating={ratings[s.id] || 0} readonly size={13} />
              <Btn small onClick={() => enroll(s.id)} disabled={enrolling === s.id}>
                {enrolling === s.id ? 'Enrolling…' : 'Enroll'}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── WORKSHOP PAGE (with auto progress) ──────────────────────────────────────
function WorkshopPage({ user }) {
  const [enrolledSkills, setEnrolledSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const fetchEnrolledSkills = useCallback(async () => {
    try {
      setError(null);
      if (!user?.id) { setError('No user found'); setLoading(false); return; }

      const { data: progressData, error: progError } = await supabase
        .from('user_progress')
        .select('id, progress_pct, completed, skill_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (progError) throw new Error(`Progress fetch failed: ${progError.message}`);
      if (!progressData || progressData.length === 0) { setEnrolledSkills([]); setLoading(false); return; }

      const skillIds = progressData.map(p => p.skill_id).filter(id => id);
      const { data: skillsData, error: skillsError } = await supabase.from('skills').select('*').in('id', skillIds);
      if (skillsError) throw new Error(`Skills fetch failed: ${skillsError.message}`);

      const skillsMap = {};
      skillsData?.forEach(skill => { skillsMap[skill.id] = skill; });

      const skillsWithModules = await Promise.all(
        progressData.map(async (enrollment) => {
          const skill = skillsMap[enrollment.skill_id];
          if (!skill) return null;
          const { data: modules } = await supabase
            .from('skill_modules')
            .select('id, title, content_type, content_url, order_index')
            .eq('skill_id', enrollment.skill_id)
            .order('order_index', { ascending: true });
          return { id: enrollment.id, progress_pct: enrollment.progress_pct, completed: enrollment.completed, skill, modules: modules || [] };
        })
      );
      setEnrolledSkills(skillsWithModules.filter(Boolean));
    } catch (err) {
      setError(err.message || 'Failed to load enrolled skills.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchEnrolledSkills(); }, [fetchEnrolledSkills]);

  if (loading) return <Spinner />;

  if (error) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
      <Card>
        <Alert message={error} type="error" onClose={() => setError(null)} />
        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={() => { setRefreshing(true); fetchEnrolledSkills(); }} disabled={refreshing}>{refreshing ? '⟳ Retrying...' : '⟳ Retry'}</Btn>
          <Link to="/skills"><Btn variant="secondary">Browse Skills →</Btn></Link>
        </div>
      </Card>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: isMobile ? 22 : 28, letterSpacing: '-0.03em' }}>Your Workshop</h1>
          <p style={{ color: T.textSec, marginTop: 5, fontSize: 13 }}>
            Open modules to automatically track your progress.
          </p>
        </div>
        <Btn small variant="secondary" onClick={() => { setRefreshing(true); fetchEnrolledSkills(); }} disabled={refreshing}>
          {refreshing ? '⟳' : '⟳ Refresh'}
        </Btn>
      </div>

      {enrolledSkills.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <p style={{ color: T.textSec, fontSize: 15 }}>You haven't enrolled in any skills yet.</p>
            <Link to="/skills"><Btn style={{ marginTop: 20 }}>Browse Skills →</Btn></Link>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {enrolledSkills.map((enrollment) => (
            <WorkshopCard
              key={enrollment.id}
              enrollment={enrollment}
              isMobile={isMobile}
              onProgressUpdate={(newEnrollment) => {
                setEnrolledSkills(prev => prev.map(e => e.id === newEnrollment.id ? newEnrollment : e));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkshopCard({ enrollment, isMobile, onProgressUpdate }) {
  const { progressPct, markModuleComplete, isModuleCompleted } = useAutoProgress(
    enrollment.id,
    enrollment.modules,
    enrollment.progress_pct
  );

  const handleModuleOpen = async (module) => {
    window.open(module.content_url, '_blank', 'noopener,noreferrer');
    await markModuleComplete(module.id);
    const newPct = Math.round(([...enrollment.modules].filter(m => isModuleCompleted(m.id) || m.id === module.id).length / enrollment.modules.length) * 100);
    onProgressUpdate({ ...enrollment, progress_pct: newPct, completed: newPct >= 100 });
  };

  const getMediaIcon = (type) => {
    switch(type) {
      case 'video': return '🎥';
      case 'audio': return '🎧';
      default: return '📄';
    }
  };

  const completedCount = enrollment.modules.filter(m => isModuleCompleted(m.id)).length;
  const totalModules = enrollment.modules.length;

  return (
    <Card hover>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <h2 style={{ fontFamily: T.fontHead, fontSize: isMobile ? 17 : 20, margin: 0 }}>
              {enrollment.skill?.title || 'Unknown Skill'}
            </h2>
            {progressPct >= 100 && <Badge color={T.green}>✓ Complete</Badge>}
          </div>
          <p style={{ color: T.textSec, fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
            {enrollment.skill?.description?.substring(0, 120) || 'No description available.'}...
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge color={T.accent}>{enrollment.skill?.category || 'General'}</Badge>
            <Badge color={enrollment.skill?.level === 'Advanced' ? T.red : enrollment.skill?.level === 'Intermediate' ? T.gold : T.green}>
              {enrollment.skill?.level || 'Beginner'}
            </Badge>
            {enrollment.skill?.duration && <span style={{ fontSize: 12, color: T.textMut }}>⏱ {enrollment.skill.duration}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: isMobile ? '100%' : 150 }}>
          <div style={{ position: 'relative', width: 70, height: 70 }}>
            <svg viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)', width: 70, height: 70 }}>
              <circle cx="35" cy="35" r="28" fill="none" stroke={T.border} strokeWidth="6" />
              <circle
                cx="35" cy="35" r="28"
                fill="none"
                stroke={progressPct >= 100 ? T.green : T.accent}
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 14, color: progressPct >= 100 ? T.green : T.accent }}>{progressPct}%</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.textSec, textAlign: 'center' }}>
            {completedCount}/{totalModules} modules
          </div>
          <Link to={`/skill/${enrollment.skill?.id}`} style={{ width: '100%' }}>
            <Btn variant="primary" style={{ width: '100%', justifyContent: 'center', padding: '9px 16px', fontSize: 13 }}>
              Continue →
            </Btn>
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: T.textSec }}>Course Progress</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: progressPct >= 100 ? T.green : T.accent }}>{progressPct}%</span>
        </div>
        <div style={{ height: 6, background: T.border, borderRadius: 3 }}>
          <div className="auto-progress-bar" style={{
            '--target-width': `${progressPct}%`,
            width: `${progressPct}%`, height: '100%',
            background: progressPct >= 100
              ? T.green
              : `linear-gradient(90deg, ${T.accentDim}, ${T.accent})`,
            borderRadius: 3
          }} />
        </div>
      </div>

      {enrollment.modules.length > 0 && (
        <div>
          <h3 style={{ fontFamily: T.fontHead, fontSize: 14, marginBottom: 10, color: T.textSec }}>
            📖 Modules — click to open & auto-track progress
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {enrollment.modules.map((mod) => {
              const done = isModuleCompleted(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => handleModuleOpen(mod)}
                  className={`module-item ${done ? 'completed' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    background: done ? `${T.green}12` : T.bgMid,
                    borderRadius: T.radiusSm,
                    cursor: 'pointer',
                    border: `1px solid ${done ? T.green + '50' : T.border}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {done ? '✅' : getMediaIcon(mod.content_type)}
                  </span>
                  <span style={{ fontSize: 13, color: done ? T.green : T.textPri, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mod.order_index}. {mod.title}
                  </span>
                  <span style={{ fontSize: 11, color: done ? T.green : T.accentDim, flexShrink: 0 }}>
                    {done ? '✓' : '↗'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── ADMIN DASHBOARD (with all tabs) ─────────────────────────────────────────
function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const renderTab = () => {
    switch (activeTab) {
      case 'analytics': return <AnalyticsTab />;
      case 'users': return <UserManagementTab />;
      case 'content': return <ContentManagementTab />;
      case 'reviews': return <ReviewModerationTab />;
      case 'revenue': return <RevenueTab />;
      case 'health': return <SystemHealthTab />;
      default: return null;
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: isMobile ? 22 : 28, letterSpacing: '-0.03em' }}>Admin Dashboard</h1>
        <p style={{ color: T.textSec, marginTop: 4, fontSize: 13 }}>Manage platform, users, and content.</p>
      </div>

      <div className="nav-scroll" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 0, overflowX: 'auto' }}>
        {[
          { id: 'analytics', label: '📊 Analytics' },
          { id: 'users', label: '👥 Users' },
          { id: 'content', label: '📚 Content' },
          { id: 'reviews', label: '⭐ Reviews' },
          { id: 'revenue', label: '💰 Revenue' },
          { id: 'health', label: '🔧 System Health' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              fontFamily: T.fontHead,
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              padding: isMobile ? '8px 14px' : '10px 20px',
              borderRadius: `${T.radiusSm} ${T.radiusSm} 0 0`,
              background: activeTab === tab.id ? T.bgCard : 'transparent',
              color: activeTab === tab.id ? T.accent : T.textSec,
              border: activeTab === tab.id ? `1px solid ${T.border}` : '1px solid transparent',
              borderBottom: activeTab === tab.id ? `1px solid ${T.bgCard}` : 'none',
              marginBottom: -1,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTab()}
    </div>
  );
}

// ---------- Analytics Tab ----------
function AnalyticsTab() {
  const [data, setData] = useState({
    signups: [],
    activeUsers: { daily: 0, weekly: 0, monthly: 0 },
    enrollmentRate: [],
    completionRate: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const thirtyDaysAgo = startOfDay(subDays(new Date(), 30)).toISOString();
        const { data: signups } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: true });
        const signupsByDay = groupByDay(signups || []);

        const now = new Date();
        const dayAgo = subDays(now, 1);
        const weekAgo = subDays(now, 7);
        const monthAgo = subDays(now, 30);
        const { data: activities } = await supabase
          .from('user_activity')
          .select('user_id, created_at')
          .gte('created_at', monthAgo.toISOString());

        const activeUsers = {
          daily: new Set(activities?.filter(a => new Date(a.created_at) >= dayAgo).map(a => a.user_id)).size,
          weekly: new Set(activities?.filter(a => new Date(a.created_at) >= weekAgo).map(a => a.user_id)).size,
          monthly: new Set(activities?.map(a => a.user_id)).size
        };

        const { data: enrollments } = await supabase
          .from('user_progress')
          .select('skill_id, skills(title)')
          .not('skill_id', 'is', null);
        const enrollmentCount = {};
        enrollments?.forEach(e => {
          const title = e.skills?.title || 'Unknown';
          enrollmentCount[title] = (enrollmentCount[title] || 0) + 1;
        });
        const enrollmentRate = Object.entries(enrollmentCount).map(([name, count]) => ({ name, count }));

        const { data: completions } = await supabase
          .from('user_progress')
          .select('skill_id, skills(title), completed')
          .eq('completed', true);
        const completionCount = {};
        completions?.forEach(c => {
          const title = c.skills?.title || 'Unknown';
          completionCount[title] = (completionCount[title] || 0) + 1;
        });
        const completionRate = Object.entries(completionCount).map(([name, count]) => ({ name, count }));

        setData({ signups: signupsByDay, activeUsers, enrollmentRate, completionRate });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const groupByDay = (items) => {
    const groups = {};
    items.forEach(item => {
      const day = format(new Date(item.created_at), 'yyyy-MM-dd');
      groups[day] = (groups[day] || 0) + 1;
    });
    return Object.entries(groups).map(([date, count]) => ({ date, count })).slice(-30);
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card><h3>Daily Active</h3><div style={{ fontSize: 32, color: T.accent }}>{data.activeUsers.daily}</div></Card>
        <Card><h3>Weekly Active</h3><div style={{ fontSize: 32, color: T.accent }}>{data.activeUsers.weekly}</div></Card>
        <Card><h3>Monthly Active</h3><div style={{ fontSize: 32, color: T.accent }}>{data.activeUsers.monthly}</div></Card>
      </div>

      <Card>
        <h3>New Signups (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.signups}>
            <XAxis dataKey="date" tick={{ fill: T.textSec }} />
            <YAxis tick={{ fill: T.textSec }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke={T.accent} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3>Enrollment Rate per Skill</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.enrollmentRate}>
            <XAxis dataKey="name" tick={{ fill: T.textSec }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: T.textSec }} />
            <Tooltip />
            <Bar dataKey="count" fill={T.accent} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3>Completion Rate per Skill</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.completionRate}>
            <XAxis dataKey="name" tick={{ fill: T.textSec }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: T.textSec }} />
            <Tooltip />
            <Bar dataKey="count" fill={T.green} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ---------- User Management Tab ----------
function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('id, email, role, last_login, banned, email_confirmed');
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateUser = async (id, updates) => {
    setActionLoading(true);
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'User updated' });
      fetchUsers();
    }
    setActionLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    setActionLoading(true);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'User deleted' });
      fetchUsers();
    }
    setActionLoading(false);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Input placeholder="Search by email" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {message && <Alert message={message.text} type={message.type} onClose={() => setMessage(null)} />}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Last Login</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Banned</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
               </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ padding: '8px' }}>{user.email}</td>
                  <td style={{ padding: '8px' }}>
                    <select
                      value={user.role}
                      onChange={e => updateUser(user.id, { role: e.target.value })}
                      disabled={actionLoading}
                      style={{ background: T.bgCard, color: T.textPri, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '4px' }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px' }}>{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="checkbox"
                      checked={user.banned || false}
                      onChange={e => updateUser(user.id, { banned: e.target.checked })}
                      disabled={actionLoading}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <Btn small variant="danger" onClick={() => deleteUser(user.id)} disabled={actionLoading}>Delete</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------- Content Management Tab ----------
function ContentManagementTab() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', level: 'Beginner', duration: '' });

  const fetchSkills = useCallback(async () => {
    const { data, error } = await supabase.from('skills').select('*').order('created_at', { ascending: false });
    if (error) setMessage({ type: 'error', text: error.message });
    else setSkills(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const deleteSkill = async (id) => {
    if (!window.confirm('Delete this skill? All modules and progress will be lost.')) return;
    const { error } = await supabase.from('skills').delete().eq('id', id);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Skill deleted' });
      fetchSkills();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const updateSkill = async (id) => {
    const { error } = await supabase.from('skills').update(form).eq('id', id);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Skill updated' });
      setEditing(null);
      fetchSkills();
    }
  };

  const togglePublish = async (id, currentPublished) => {
    const { error } = await supabase.from('skills').update({ published: !currentPublished }).eq('id', id);
    if (error) setMessage({ type: 'error', text: error.message });
    else fetchSkills();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {message && <Alert message={message.text} type={message.type} onClose={() => setMessage(null)} />}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Title</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Level</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Published</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map(skill => (
                <tr key={skill.id}>
                  <td style={{ padding: '8px' }}>
                    {editing === skill.id ? (
                      <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    ) : (
                      skill.title
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {editing === skill.id ? (
                      <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                    ) : (
                      skill.category || '-'
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {editing === skill.id ? (
                      <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                        <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                      </select>
                    ) : (
                      skill.level
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="checkbox"
                      checked={skill.published !== false}
                      onChange={() => togglePublish(skill.id, skill.published)}
                    />
                  </td>
                  <td style={{ padding: '8px', display: 'flex', gap: '6px' }}>
                    {editing === skill.id ? (
                      <>
                        <Btn small variant="success" onClick={() => updateSkill(skill.id)}>Save</Btn>
                        <Btn small variant="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
                      </>
                    ) : (
                      <>
                        <Btn small variant="secondary" onClick={() => { setEditing(skill.id); setForm({ title: skill.title, description: skill.description, category: skill.category, level: skill.level, duration: skill.duration }); }}>Edit</Btn>
                        <Btn small variant="danger" onClick={() => deleteSkill(skill.id)}>Delete</Btn>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------- Review Moderation Tab ----------
function ReviewModerationTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const fetchReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, users(email), skills(title)')
      .order('created_at', { ascending: false });
    if (error) setMessage({ type: 'error', text: error.message });
    else setReviews(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const deleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Review deleted' });
      fetchReviews();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return <Spinner />;

  return (
    <Card>
      {message && <Alert message={message.text} type={message.type} onClose={() => setMessage(null)} />}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px' }}>User</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Skill</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Rating</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Comment</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(review => (
              <tr key={review.id}>
                <td style={{ padding: '8px' }}>{review.users?.email}</td>
                <td style={{ padding: '8px' }}>{review.skills?.title}</td>
                <td style={{ padding: '8px' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</td>
                <td style={{ padding: '8px', maxWidth: '200px', wordBreak: 'break-word' }}>{review.comment}</td>
                <td style={{ padding: '8px' }}>{new Date(review.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '8px' }}>
                  <Btn small variant="danger" onClick={() => deleteReview(review.id)}>Delete</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------- Revenue Tab (Placeholder) ----------
function RevenueTab() {
  return (
    <Card>
      <h3>Revenue Metrics (Mock Data)</h3>
      <p>This section will show MRR, churn, LTV, and subscription details when monetized.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
        <div><strong>Monthly Recurring Revenue</strong><br />$0.00</div>
        <div><strong>Churn Rate</strong><br />0%</div>
        <div><strong>Lifetime Value</strong><br />$0.00</div>
      </div>
      <Btn variant="secondary" style={{ marginTop: 20 }} disabled>Enable Payments (Coming Soon)</Btn>
    </Card>
  );
}

// ---------- System Health Tab ----------
function SystemHealthTab() {
  const [health, setHealth] = useState({ dbSize: '...', storageUsed: '...', errors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setHealth({
        dbSize: '124 MB',
        storageUsed: '45 MB',
        errors: [
          { time: '2025-03-25 10:23', message: 'Failed login attempt from 192.168.1.1' },
          { time: '2025-03-24 23:12', message: 'API timeout on /reviews endpoint' }
        ]
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <Spinner />;

  return (
    <Card>
      <h3>Supabase Usage</h3>
      <p><strong>Database Size:</strong> {health.dbSize}</p>
      <p><strong>Storage Used:</strong> {health.storageUsed}</p>
      <h3 style={{ marginTop: 20 }}>Recent API Errors / Failed Logins</h3>
      <ul style={{ marginTop: 8, listStyle: 'none', padding: 0 }}>
        {health.errors.map((err, i) => (
          <li key={i} style={{ borderBottom: `1px solid ${T.border}`, padding: '8px 0' }}>
            <strong>{err.time}</strong> – {err.message}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ─── PROTECTED ROUTE ─────────────────────────────────────────────────────────
function Protected({ user, loading, children }) {
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ─── ADMIN ROUTE ─────────────────────────────────────────────────────────────
function AdminRoute({ user, role, loading, children }) {
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App() {
  const { user, role, loading, signOut } = useAuth();

  useEffect(() => {
    seedSkillsIfNeeded();
    seedAdminUser();
  }, []);

  return (
    <BrowserRouter>
      <div style={{ minHeight:'100vh', background:T.bg, color:T.textPri, fontFamily:T.fontBody }}>
        <Routes>
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={
            <>
              <Navbar user={user} role={role} onSignOut={signOut} />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <Protected user={user} loading={loading}>
                      {role === 'admin' ? (
                        <AdminPage user={user} />
                      ) : (
                        <DashboardPage user={user} />
                      )}
                    </Protected>
                  }
                />
                <Route path="/workshop" element={<Protected user={user} loading={loading}><WorkshopPage user={user} /></Protected>} />
                <Route path="/skills" element={<Protected user={user} loading={loading}><SkillsPage user={user} /></Protected>} />
                <Route path="/skill/:skillId" element={<Protected user={user} loading={loading}><SkillDetailPage user={user} /></Protected>} />
                <Route path="/admin" element={
                  <Protected user={user} loading={loading}>
                    <AdminRoute user={user} role={role} loading={loading}>
                      <AdminPage user={user} />
                    </AdminRoute>
                  </Protected>
                } />
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
  );
}
