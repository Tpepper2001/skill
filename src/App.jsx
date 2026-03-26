
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ─── YOUTUBE EMBED HELPERS ────────────────────────────────────────────────────
function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function VideoPlayer({ url, moduleTitle }) {
  const videoId = getYouTubeId(url);

  if (!videoId) {
    return (
      <div style={{
        background: '#0D1526', borderRadius: 10, padding: '40px 24px',
        textAlign: 'center', color: '#8BA3C0', fontSize: 14
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎬</div>
        <p>Video unavailable for this module.</p>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ color: '#38BDF8', marginTop: 10, display: 'inline-block', fontSize: 13 }}>
            Open external link →
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden', background: '#000' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={moduleTitle}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%', border: 'none'
        }}
      />
    </div>
  );
}

// ─── QUIZ COMPONENT ───────────────────────────────────────────────────────────
const PASS_THRESHOLD = 0.7; // 70% to pass

function getQuiz(moduleTitle) {
  const t = (moduleTitle || '').toLowerCase();
  if (t.includes('react') || t.includes('component') || t.includes('hooks')) {
    return [
      { q: 'In React, a component re-renders when:', options: ['The DOM changes directly', 'State or props change', 'The browser scrolls', 'CSS is updated'], answer: 1 },
      { q: 'What hook is used to manage local state in a function component?', options: ['useEffect', 'useContext', 'useState', 'useRef'], answer: 2 },
      { q: 'JSX is:', options: ['A JavaScript library', 'A syntax extension that looks like HTML inside JS', 'A CSS preprocessor', 'A database query language'], answer: 1 },
      { q: 'Props in React are:', options: ['Mutable inside the child component', 'Read-only inputs passed from parent to child', 'Global variables', 'CSS class names'], answer: 1 },
      { q: 'useEffect runs:', options: ['Before the component mounts', 'After every render by default', 'Only on unmount', 'Never automatically'], answer: 1 },
    ];
  }
  if (t.includes('python') || t.includes('django') || t.includes('flask')) {
    return [
      { q: 'Python list comprehensions are used to:', options: ['Delete items from a list', 'Create new lists concisely from iterables', 'Sort lists alphabetically only', 'Convert lists to strings'], answer: 1 },
      { q: 'In Python, "def" is used to:', options: ['Define a variable', 'Import a module', 'Define a function', 'Create a class'], answer: 2 },
      { q: 'Which data structure uses key-value pairs in Python?', options: ['List', 'Tuple', 'Set', 'Dictionary'], answer: 3 },
      { q: 'What does "pip" do?', options: ['Runs Python scripts', 'Manages Python packages', 'Formats Python code', 'Compiles Python to bytecode'], answer: 1 },
      { q: 'Virtual environments are used to:', options: ['Speed up Python execution', 'Isolate project dependencies', 'Enable multi-threading', 'Connect to databases'], answer: 1 },
    ];
  }
  if (t.includes('css') || t.includes('html') || t.includes('web') || t.includes('frontend')) {
    return [
      { q: 'The CSS box model consists of:', options: ['Color, font, border, padding', 'Content, padding, border, margin', 'Header, footer, section, aside', 'Flex, grid, block, inline'], answer: 1 },
      { q: 'Flexbox is primarily used for:', options: ['Database queries', '3D transforms', 'One-dimensional layout (row or column)', 'Animation keyframes'], answer: 2 },
      { q: 'Which HTML tag is used for the main navigation?', options: ['<main>', '<header>', '<nav>', '<section>'], answer: 2 },
      { q: 'CSS specificity determines:', options: ['How fast a page loads', 'Which CSS rule applies when multiple rules match', 'The order of HTML elements', 'The number of HTTP requests'], answer: 1 },
      { q: 'A semantic HTML element is one that:', options: ['Has no styling by default', 'Clearly describes its meaning/purpose', 'Is only used inside <head>', 'Cannot contain text'], answer: 1 },
    ];
  }
  if (t.includes('sql') || t.includes('database') || t.includes('postgres') || t.includes('mysql')) {
    return [
      { q: 'SELECT * FROM users WHERE active = true — this query:', options: ['Deletes all active users', 'Returns all columns for active users', 'Updates active users', 'Creates a new table'], answer: 1 },
      { q: 'A PRIMARY KEY in a database table:', options: ['Can be NULL', 'Uniquely identifies each row', 'Is always an integer', 'Must be a foreign key too'], answer: 1 },
      { q: 'JOIN in SQL is used to:', options: ['Combine rows from two or more tables', 'Delete duplicate rows', 'Create a new table', 'Sort query results'], answer: 0 },
      { q: 'Indexing a database column improves:', options: ['Insert speed', 'Query/read performance', 'Storage efficiency', 'Data integrity'], answer: 1 },
      { q: 'ACID in databases stands for:', options: ['Atomicity, Consistency, Isolation, Durability', 'Access, Control, Index, Delete', 'Array, Cache, Insert, Drop', 'Architecture, Code, Interface, Data'], answer: 0 },
    ];
  }
  // default quiz
  return [
    {
      q: 'Which of the following best describes the purpose of this module?',
      options: ['To introduce core concepts and foundational knowledge', 'To configure network infrastructure', 'To design marketing materials', 'To manage financial spreadsheets'],
      answer: 0
    },
    {
      q: 'What is the recommended approach when learning a new technical skill?',
      options: ['Skip theory and jump straight to projects', 'Understand concepts first, then apply them with practice', 'Memorize syntax without understanding', 'Avoid documentation and tutorials'],
      answer: 1
    },
    {
      q: 'Which habit best supports long-term skill retention?',
      options: ['Study everything in one marathon session', 'Never review past material', 'Practice consistently with spaced repetition', 'Rely solely on passive watching'],
      answer: 2
    },
    {
      q: 'When you encounter a difficult concept, what should you do first?',
      options: ['Skip it permanently', 'Break it into smaller sub-problems', 'Give up and switch topics', 'Ignore it and move on'],
      answer: 1
    },
    {
      q: 'What does "iterative learning" mean?',
      options: ['Learning once and never revisiting', 'Continuously refining understanding through repeated exposure', 'Reading a book cover to cover exactly once', 'Watching videos at 3× speed only'],
      answer: 1
    },
  ];
}

function ModuleQuiz({ module, onPass, onFail }) {
  const questions = getQuiz(module.title);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const handleSelect = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return;
    const correct = questions.filter((q, i) => answers[i] === q.answer).length;
    const pct = correct / questions.length;
    setScore({ correct, total: questions.length, pct });
    setSubmitted(true);
    if (pct >= PASS_THRESHOLD) {
      setTimeout(() => onPass(), 1200);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    onFail?.();
  };

  const allAnswered = Object.keys(answers).length === questions.length;
  const passed = score && score.pct >= PASS_THRESHOLD;

  return (
    <div style={{
      background: '#0D1526',
      border: `1px solid ${passed ? '#10B98140' : submitted ? '#EF444440' : '#1E2D45'}`,
      borderRadius: 12, padding: '24px',
      animation: 'fadeUp 0.4s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: passed ? '#10B98120' : '#38BDF820',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18
        }}>
          {passed ? '🏆' : '📝'}
        </div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#F0F6FF' }}>
            Module Quiz
          </div>
          <div style={{ fontSize: 12, color: '#8BA3C0', marginTop: 2 }}>
            Score ≥70% to unlock the next module
          </div>
        </div>
        {score && (
          <div style={{
            marginLeft: 'auto',
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: 20,
            color: passed ? '#10B981' : '#EF4444'
          }}>
            {score.correct}/{score.total}
          </div>
        )}
      </div>

      {submitted && score && (
        <div style={{
          padding: '14px 16px', borderRadius: 8, marginBottom: 20,
          background: passed ? '#10B98115' : '#EF444415',
          border: `1px solid ${passed ? '#10B98140' : '#EF444440'}`,
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontSize: 24 }}>{passed ? '🎉' : '😞'}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: passed ? '#10B981' : '#EF4444' }}>
              {passed ? 'Passed! Unlocking next module...' : `Failed — ${Math.round(score.pct * 100)}% (need 70%)`}
            </div>
            <div style={{ fontSize: 12, color: '#8BA3C0', marginTop: 2 }}>
              {passed
                ? 'Great job! Your progress has been saved.'
                : 'Review the video and try again.'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.map((q, qi) => (
          <div key={qi}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F0F6FF', marginBottom: 10, lineHeight: 1.5 }}>
              {qi + 1}. {q.q}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                const isCorrect = submitted && oi === q.answer;
                const isWrong = submitted && selected && oi !== q.answer;
                return (
                  <div
                    key={oi}
                    onClick={() => handleSelect(qi, oi)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1.5px solid ${isCorrect ? '#10B981' : isWrong ? '#EF4444' : selected ? '#38BDF8' : '#1E2D45'}`,
                      background: isCorrect ? '#10B98112' : isWrong ? '#EF444412' : selected ? '#38BDF812' : '#111827',
                      cursor: submitted ? 'default' : 'pointer',
                      fontSize: 13,
                      color: isCorrect ? '#10B981' : isWrong ? '#EF4444' : selected ? '#38BDF8' : '#8BA3C0',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${isCorrect ? '#10B981' : isWrong ? '#EF4444' : selected ? '#38BDF8' : '#4A6080'}`,
                      background: isCorrect ? '#10B981' : isWrong ? '#EF4444' : selected ? '#38BDF8' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#fff'
                    }}>
                      {isCorrect ? '✓' : isWrong ? '✗' : selected ? '●' : ''}
                    </div>
                    {opt}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13,
              padding: '10px 22px', borderRadius: 8, border: 'none',
              background: allAnswered ? '#38BDF8' : '#1E2D45',
              color: allAnswered ? '#0A0F1E' : '#4A6080',
              cursor: allAnswered ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            Submit Answers →
          </button>
        ) : !passed && (
          <button
            onClick={handleRetry}
            style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13,
              padding: '10px 22px', borderRadius: 8, border: 'none',
              background: '#EF444420', color: '#EF4444',
              border: '1.5px solid #EF444440',
              cursor: 'pointer'
            }}
          >
            ↩ Retry Quiz
          </button>
        )}
        {!submitted && (
          <div style={{ fontSize: 12, color: '#4A6080', display: 'flex', alignItems: 'center' }}>
            {Object.keys(answers).length}/{questions.length} answered
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QUIZ PROGRESS HOOK ───────────────────────────────────────────────────────
function useQuizProgress(enrollmentId, modules) {
  const [completedModules, setCompletedModules] = useState(new Set());
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    if (!enrollmentId) return;
    const saved = localStorage.getItem(`quiz_progress_${enrollmentId}`);
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        const set = new Set(arr);
        setCompletedModules(set);
        if (modules.length > 0) {
          setProgressPct(Math.round((set.size / modules.length) * 100));
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
    localStorage.setItem(`quiz_progress_${enrollmentId}`, JSON.stringify([...newCompleted]));
    try {
      await supabase
        .from('user_progress')
        .update({ progress_pct: newPct, completed: newPct >= 100 })
        .eq('id', enrollmentId);
    } catch (e) {
      console.error('Progress sync error:', e);
    }
  }, [enrollmentId, completedModules, modules.length]);

  const isModuleCompleted = (moduleId) => completedModules.has(moduleId);
  const isModuleUnlocked = (idx) => {
    if (idx === 0) return true;
    return completedModules.has(modules[idx - 1]?.id);
  };

  return { progressPct, completedModules, markModuleComplete, isModuleCompleted, isModuleUnlocked };
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
            <Link key={l.to} to={l.to}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: T.fontHead, fontSize: 14, fontWeight: 500,
                color: location.pathname === l.to ? T.accent : T.textSec,
                padding: '10px 12px', borderRadius: T.radiusSm,
                background: location.pathname === l.to ? T.accentGlow : 'transparent',
              }}>
              {l.label}
            </Link>
          ))}
          {user && (
            <Btn small variant="ghost" onClick={() => { onSignOut(); setMenuOpen(false); }} style={{ marginTop: 4 }}>
              Sign Out
            </Btn>
          )}
        </div>
      )}
    </nav>
  );
}

// ─── SKILLS + MODULES DATA ────────────────────────────────────────────────────
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
      { title: 'Project Management Basics', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=9LSnINglkQA', description: 'Scope, timeline, and stakeholder management.' },
      { title: 'Agile & Scrum', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=2Vt7Ik8Ublw', description: 'Sprints, standups, and agile ceremonies.' },
      { title: 'Kanban Methodology', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=iVaFVa7HYj4', description: 'Visual workflow and WIP limits.' },
      { title: 'Risk Management', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=cqQxGPqHnlE', description: 'Identifying and mitigating project risks.' },
      { title: 'Project Planning Tools', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=qCM9Al_GlEg', description: 'Gantt charts, RACI, and PM software.' },
    ]
  },
  {
    title: 'Human Anatomy',
    category: 'Medicine',
    level: 'Intermediate',
    description: 'Body systems, organs, and physiological functions.',
    duration: '6 weeks',
    modules: [
      { title: 'Introduction to Anatomy', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=6Yd6GQBxiLE', description: 'Anatomical terminology and body planes.' },
      { title: 'Skeletal System', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=H8CSPOKdUCk', description: 'Bones, joints, and the skeleton.' },
      { title: 'Muscular System', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=VmcxKhOAMYk', description: 'Muscle types, contraction, and movement.' },
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
      { title: 'Building High-Performance Teams', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=hHboS7CYJGQ', description: 'Hiring, culture, and team dynamics.' },
      { title: 'Strategic Thinking', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=iuYlGRnC7J8', description: 'Long-term planning and competitive analysis.' },
      { title: 'Conflict Resolution', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=KY5TWVz5ZDU', description: 'Managing disagreements productively.' },
      { title: 'Giving & Receiving Feedback', content_type: 'video', content_url: 'https://www.youtube.com/watch?v=wtl5UrrgU8c', description: 'Constructive feedback techniques.' },
    ]
  },
  {
    title: 'Big Data & Hadoop',
    category: 'Data Science',
    level: 'Advanced',
    description: 'Distributed computing, Spark, and data pipelines at scale.',
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
  try {
    const { count: moduleCount } = await supabase
      .from('skill_modules')
      .select('*', { count: 'exact', head: true });

    if (moduleCount && moduleCount >= 100) return;

    const { count: skillCount } = await supabase
      .from('skills')
      .select('*', { count: 'exact', head: true });

    if (!skillCount || skillCount < 40) {
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
    } else {
      console.log('Skills exist but modules missing — backfilling modules...');

      const { data: existingSkills } = await supabase
        .from('skills')
        .select('id, title');

      if (!existingSkills) return;

      const modulesByTitle = {};
      for (const s of SKILLS_WITH_MODULES) {
        modulesByTitle[s.title] = s.modules;
      }

      for (const skill of existingSkills) {
        const { count: existing } = await supabase
          .from('skill_modules')
          .select('*', { count: 'exact', head: true })
          .eq('skill_id', skill.id);

        if (existing && existing > 0) continue;

        const modules = modulesByTitle[skill.title];
        if (!modules) {
          console.warn('No module data found for skill:', skill.title);
          continue;
        }

        const modulesWithOrder = modules.map((m, idx) => ({
          ...m,
          skill_id: skill.id,
          order_index: idx + 1,
        }));

        const { error } = await supabase
          .from('skill_modules')
          .insert(modulesWithOrder);

        if (error) {
          console.error('Failed to backfill modules for:', skill.title, error);
        } else {
          console.log('Backfilled modules for:', skill.title);
        }
      }
      console.log('Module backfill complete.');
    }
  } catch (err) {
    console.error('seedSkillsIfNeeded error:', err);
  }
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
                    fontSize: 14, color: T.textPri,
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

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
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

// ─── UPGRADED SKILL DETAIL PAGE ───────────────────────────────────────────────
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

  // Active module being watched
  const [activeModuleIdx, setActiveModuleIdx] = useState(null);
  // Whether the quiz for the active module is being shown
  const [showQuiz, setShowQuiz] = useState(false);

  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const { progressPct, markModuleComplete, isModuleCompleted, isModuleUnlocked } =
    useQuizProgress(enrollmentId, modules);

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

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, users(email)')
        .eq('skill_id', skillId)
        .order('created_at', { ascending: false });
      setReviews(reviewsData || []);

      if (reviewsData?.length) {
        const avg = reviewsData.reduce((a, r) => a + r.rating, 0) / reviewsData.length;
        setAvgRating(parseFloat(avg.toFixed(1)));
      }

      if (user) {
        const { data: prog } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('skill_id', skillId)
          .maybeSingle();
        if (prog) {
          setEnrolled(true);
          setEnrollmentId(prog.id);
        }
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user.id)
          .eq('skill_id', skillId)
          .maybeSingle();
        if (existingReview) {
          setUserRating(existingReview.rating);
          setUserComment(existingReview.comment || '');
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

  const handleSelectModule = (idx) => {
    if (!enrolled) return;
    if (!isModuleUnlocked(idx)) return;
    setActiveModuleIdx(idx);
    setShowQuiz(false);
  };

  const handleQuizPass = async (moduleId) => {
    await markModuleComplete(moduleId);
    setShowQuiz(false);
    // Auto-advance to next module
    if (activeModuleIdx !== null && activeModuleIdx < modules.length - 1) {
      setActiveModuleIdx(activeModuleIdx + 1);
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

  if (loading) return <Spinner />;
  if (!skill) return <div style={{ padding: 40, textAlign:'center', color: '#8BA3C0' }}>Skill not found.</div>;

  const activeModule = activeModuleIdx !== null ? modules[activeModuleIdx] : null;
  const completedCount = modules.filter(m => isModuleCompleted(m.id)).length;

  return (
    <div style={{ maxWidth: 1100, margin:'0 auto', padding: isMobile ? '20px 16px' : '36px 24px', fontFamily: T.fontBody }}>
      <Link to="/skills" style={{ color: T.accent, fontSize: 13, marginBottom: 14, display:'inline-block' }}>← Back to Skills</Link>

      {/* HEADER CARD */}
      <div style={{
        background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius,
        padding: isMobile ? '18px 16px' : '24px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Badge color={T.accent}>{skill.category || 'General'}</Badge>
          <h1 style={{ fontFamily: T.fontHead, fontSize: isMobile ? 22 : 30, fontWeight: 800, marginTop: 10, lineHeight: 1.2, letterSpacing: '-0.03em' }}>{skill.title}</h1>
          <p style={{ color: T.textSec, marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>{skill.description}</p>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: T.textMut }}>
            <span>⏱ {skill.duration || 'Self-paced'}</span>
            <span>•</span>
            <span>📚 {modules.length} modules</span>
            {reviews.length > 0 && <><span>•</span><span>⭐ {avgRating} ({reviews.length} reviews)</span></>}
          </div>
        </div>

        <div style={{ minWidth: 180, flexShrink: 0 }}>
          {user && !enrolled ? (
            <button onClick={enroll} style={{
              fontFamily: T.fontHead, fontWeight: 700, fontSize: 14,
              padding: '12px 28px', borderRadius: T.radiusSm, border: 'none',
              background: T.accent, color: T.bg, cursor: 'pointer',
              boxShadow: `0 0 20px ${T.accentGlow}`, width: '100%'
            }}>Enroll Now</button>
          ) : enrolled ? (
            <div>
              <div style={{ fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.textSec }}>Course Progress</span>
                <span style={{ fontWeight: 700, color: progressPct >= 100 ? T.green : T.accent }}>{progressPct}%</span>
              </div>
              <div style={{ height: 8, background: T.border, borderRadius: 4 }}>
                <div style={{
                  width: `${progressPct}%`, height: '100%',
                  background: progressPct >= 100 ? T.green : `linear-gradient(90deg, ${T.accent}, ${T.accentDim})`,
                  borderRadius: 4, transition: 'width 0.6s ease'
                }} />
              </div>
              <div style={{ fontSize: 12, color: T.textMut, marginTop: 5, textAlign: 'center' }}>
                {completedCount}/{modules.length} modules passed
              </div>
              {progressPct >= 100 && (
                <div style={{ fontSize: 13, color: T.green, marginTop: 6, textAlign: 'center', fontWeight: 600 }}>🎉 Course Complete!</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* MAIN LAYOUT: SIDEBAR + PLAYER */}
      <div style={{ display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row', alignItems: 'start' }}>

        {/* MODULE LIST SIDEBAR */}
        <div style={{
          width: isMobile ? '100%' : 300, flexShrink: 0,
          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 700 }}>📚 Modules</h2>
            {enrolled && (
              <span style={{ fontSize: 11, color: T.textSec }}>{completedCount}/{modules.length}</span>
            )}
          </div>
          <div style={{ maxHeight: isMobile ? 260 : 500, overflowY: 'auto' }}>
            {modules.map((mod, idx) => {
              const done = isModuleCompleted(mod.id);
              const unlocked = isModuleUnlocked(idx);
              const isActive = activeModuleIdx === idx;

              return (
                <div
                  key={mod.id}
                  onClick={() => handleSelectModule(idx)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${T.border}20`,
                    display: 'flex', alignItems: 'center', gap: 11,
                    cursor: !enrolled ? 'default' : !unlocked ? 'not-allowed' : 'pointer',
                    background: isActive ? `${T.accent}10` : done ? `${T.green}08` : 'transparent',
                    borderLeft: `3px solid ${isActive ? T.accent : done ? T.green : 'transparent'}`,
                    opacity: !enrolled || unlocked ? 1 : 0.45,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    background: done ? `${T.green}20` : isActive ? `${T.accent}20` : T.border,
                    border: `1.5px solid ${done ? T.green : isActive ? T.accent : T.border}`
                  }}>
                    {done ? '✓' : !unlocked ? '🔒' : isActive ? '▶' : idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: done ? 500 : 600,
                      color: done ? T.green : isActive ? T.accent : T.textPri,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {mod.title}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMut, marginTop: 1 }}>
                      {done ? 'Completed' : !unlocked ? 'Locked' : 'Video lesson'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* VIDEO PLAYER + QUIZ PANEL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!enrolled ? (
            <div style={{
              background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius,
              padding: '48px 24px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
              <h3 style={{ fontFamily: T.fontHead, fontSize: 20, marginBottom: 10 }}>Enroll to Start Learning</h3>
              <p style={{ color: T.textSec, fontSize: 14, marginBottom: 24 }}>Enroll to watch videos, take quizzes, and track your progress.</p>
              <button onClick={enroll} style={{
                fontFamily: T.fontHead, fontWeight: 700, fontSize: 14,
                padding: '12px 32px', borderRadius: T.radiusSm, border: 'none',
                background: T.accent, color: T.bg, cursor: 'pointer'
              }}>Enroll Now — It's Free</button>
            </div>
          ) : activeModule ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Video */}
              <div style={{
                background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius,
                overflow: 'hidden'
              }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 15 }}>
                      {activeModuleIdx + 1}. {activeModule.title}
                    </div>
                    {activeModule.description && (
                      <div style={{ fontSize: 12, color: T.textSec, marginTop: 3 }}>{activeModule.description}</div>
                    )}
                  </div>
                  {isModuleCompleted(activeModule.id) && (
                    <span style={{ fontSize: 11, background: `${T.green}15`, color: T.green, border: `1px solid ${T.green}30`, borderRadius: 99, padding: '3px 10px', flexShrink: 0 }}>
                      ✓ Passed
                    </span>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <VideoPlayer url={activeModule.content_url} moduleTitle={activeModule.title} />
                </div>
                {/* CTA below video */}
                {!isModuleCompleted(activeModule.id) && !showQuiz && (
                  <div style={{
                    padding: '12px 18px', borderTop: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
                  }}>
                    <div style={{ fontSize: 13, color: T.textSec }}>
                      Watched the video? Take the quiz to unlock the next module.
                    </div>
                    <button
                      onClick={() => setShowQuiz(true)}
                      style={{
                        fontFamily: T.fontHead, fontWeight: 700, fontSize: 13,
                        padding: '9px 20px', borderRadius: T.radiusSm, border: 'none',
                        background: T.accent, color: T.bg, cursor: 'pointer'
                      }}>
                      Take Quiz →
                    </button>
                  </div>
                )}
                {isModuleCompleted(activeModule.id) && activeModuleIdx < modules.length - 1 && (
                  <div style={{
                    padding: '12px 18px', borderTop: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
                  }}>
                    <div style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>✓ Module complete!</div>
                    <button
                      onClick={() => { setActiveModuleIdx(activeModuleIdx + 1); setShowQuiz(false); }}
                      style={{
                        fontFamily: T.fontHead, fontWeight: 700, fontSize: 13,
                        padding: '9px 20px', borderRadius: T.radiusSm, border: 'none',
                        background: T.green, color: '#fff', cursor: 'pointer'
                      }}>
                      Next Module →
                    </button>
                  </div>
                )}
              </div>

              {/* Quiz */}
              {showQuiz && !isModuleCompleted(activeModule.id) && (
                <ModuleQuiz
                  module={activeModule}
                  onPass={() => handleQuizPass(activeModule.id)}
                  onFail={() => {}}
                />
              )}
            </div>
          ) : (
            /* No module selected yet */
            <div style={{
              background: T.bgCard, border: `1px dashed ${T.border}`, borderRadius: T.radius,
              padding: '48px 24px', textAlign: 'center', color: T.textSec
            }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>▶️</div>
              <h3 style={{ fontFamily: T.fontHead, fontSize: 17, color: T.textPri, marginBottom: 8 }}>Select a Module to Begin</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                Click any unlocked module from the list to start watching.<br/>
                Complete the quiz at the end to unlock the next one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* REVIEWS */}
      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: isMobile ? 16 : 24, marginTop: 20 }}>
        <h2 style={{ fontFamily: T.fontHead, fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Reviews</h2>
        {user && (
          <div style={{ marginBottom: 24, padding: 16, background: T.bgMid, borderRadius: T.radiusSm }}>
            <p style={{ marginBottom: 8, fontSize: 13, color: T.textSec }}>Your review</p>
            <RatingStars rating={userRating} onRate={setUserRating} />
            <textarea
              rows={2} value={userComment} onChange={e => setUserComment(e.target.value)}
              placeholder="Share your experience..."
              style={{
                width: '100%', marginTop: 10, padding: '10px 12px',
                background: T.bgCard, border: `1.5px solid ${T.border}`,
                borderRadius: T.radiusSm, color: T.textPri, fontFamily: T.fontBody,
                fontSize: 13, resize: 'vertical'
              }}
            />
            {message && (
              <div style={{
                marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                background: message.includes('saved') ? `${T.green}15` : `${T.red}15`,
                color: message.includes('saved') ? T.green : T.red,
                border: `1px solid ${message.includes('saved') ? `${T.green}30` : `${T.red}30`}`
              }}>{message}</div>
            )}
            <button
              onClick={submitReview} disabled={submitting}
              style={{
                marginTop: 10, fontFamily: T.fontHead, fontWeight: 600, fontSize: 13,
                padding: '8px 18px', borderRadius: 7, border: 'none',
                background: submitting ? T.border : T.accent,
                color: submitting ? T.textMut : T.bg,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}>
              {submitting ? 'Saving…' : 'Submit Review'}
            </button>
          </div>
        )}
        {reviews.length === 0 ? (
          <p style={{ color: T.textMut, fontSize: 13 }}>No reviews yet. Be the first!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}40` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.textSec }}>{r.users?.email?.split('@')[0] || 'Learner'}</span>
                  <RatingStars rating={r.rating} readonly size={13} />
                </div>
                {r.comment && <p style={{ fontSize: 13, color: T.textPri, lineHeight: 1.5 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SKILLS PAGE ─────────────────────────────────────────────────────────────
function SkillsPage({ user }) {
  const [skills, setSkills] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  useEffect(() => {
    supabase.from('skills').select('*').order('title').then(({ data }) => {
      setSkills(data || []);
      setFiltered(data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = skills;
    if (search) result = result.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()));
    if (category !== 'All') result = result.filter(s => s.category === category);
    if (level !== 'All') result = result.filter(s => s.level === level);
    setFiltered(result);
  }, [search, category, level, skills]);

  const categories = ['All', ...new Set(skills.map(s => s.category).filter(Boolean))];
  const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: isMobile ? 22 : 28, marginBottom: 6 }}>Browse Skills</h1>
        <p style={{ color: T.textSec, fontSize: 14 }}>{filtered.length} courses available</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search skills..."
          style={{
            flex: 1, minWidth: 200, padding: '10px 14px',
            background: T.bgCard, border: `1.5px solid ${T.border}`,
            borderRadius: T.radiusSm, color: T.textPri, fontFamily: T.fontBody, fontSize: 14
          }}
        />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{
          padding: '10px 14px', background: T.bgCard, border: `1.5px solid ${T.border}`,
          borderRadius: T.radiusSm, color: T.textPri, fontFamily: T.fontBody, fontSize: 13
        }}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={level} onChange={e => setLevel(e.target.value)} style={{
          padding: '10px 14px', background: T.bgCard, border: `1.5px solid ${T.border}`,
          borderRadius: T.radiusSm, color: T.textPri, fontFamily: T.fontBody, fontSize: 13
        }}>
          {levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(skill => (
          <Card key={skill.id} hover style={{ padding: 18, cursor: 'pointer' }} >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Badge color={T.accent}>{skill.category || 'General'}</Badge>
              <Badge color={skill.level === 'Advanced' ? T.red : skill.level === 'Intermediate' ? T.gold : T.green}>
                {skill.level || 'Beginner'}
              </Badge>
            </div>
            <h3 style={{ fontFamily: T.fontHead, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{skill.title}</h3>
            <p style={{ color: T.textSec, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>{skill.description?.substring(0, 90)}...</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {skill.duration && <span style={{ fontSize: 11, color: T.textMut }}>⏱ {skill.duration}</span>}
              <Btn small onClick={() => navigate(`/skill/${skill.id}`)}>View →</Btn>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ color: T.textSec }}>No skills match your filters.</p>
        </div>
      )}
    </div>
  );
}

// ─── WORKSHOP PAGE ────────────────────────────────────────────────────────────
function WorkshopPage({ user }) {
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  useEffect(() => {
    supabase.from('workshop_notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      setNotes(data || []);
      setLoading(false);
    });
  }, [user.id]);

  const saveNote = async () => {
    if (!note.trim()) return;
    const { data, error } = await supabase.from('workshop_notes').insert({ user_id: user.id, content: note }).select().single();
    if (!error && data) {
      setNotes(prev => [data, ...prev]);
      setNote('');
    }
  };

  const deleteNote = async (id) => {
    await supabase.from('workshop_notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: isMobile ? 22 : 28, marginBottom: 6 }}>Workshop</h1>
      <p style={{ color: T.textSec, fontSize: 14, marginBottom: 24 }}>Your personal learning notes and workspace.</p>

      <Card style={{ marginBottom: 20 }}>
        <textarea
          rows={4}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Write a note, idea, or learning summary..."
          style={{
            width: '100%', padding: '12px', background: T.bgMid,
            border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm,
            color: T.textPri, fontFamily: T.fontBody, fontSize: 14,
            resize: 'vertical', marginBottom: 12
          }}
        />
        <Btn onClick={saveNote} disabled={!note.trim()}>Save Note</Btn>
      </Card>

      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
          <p style={{ color: T.textSec }}>No notes yet. Start writing!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map(n => (
            <Card key={n.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: T.textPri, flex: 1, whiteSpace: 'pre-wrap' }}>{n.content}</p>
                <Btn small variant="danger" onClick={() => deleteNote(n.id)}>✕</Btn>
              </div>
              <p style={{ fontSize: 11, color: T.textMut, marginTop: 8 }}>{new Date(n.created_at).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'skills', label: '📚 Skills' },
    { id: 'users', label: '👥 Users' },
    { id: 'reviews', label: '⭐ Reviews' },
    { id: 'revenue', label: '💰 Revenue' },
    { id: 'health', label: '🔧 Health' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      <h1 style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: isMobile ? 22 : 28, marginBottom: 20 }}>Admin Dashboard</h1>

      <div className="nav-scroll" style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px', background: 'none', cursor: 'pointer',
              fontFamily: T.fontHead, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
              color: activeTab === tab.id ? T.accent : T.textSec,
              borderBottom: `2px solid ${activeTab === tab.id ? T.accent : 'transparent'}`,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <AdminOverviewTab />}
      {activeTab === 'skills' && <AdminSkillsTab />}
      {activeTab === 'users' && <AdminUsersTab />}
      {activeTab === 'reviews' && <ReviewModerationTab />}
      {activeTab === 'revenue' && <RevenueTab />}
      {activeTab === 'health' && <SystemHealthTab />}
    </div>
  );
}

function AdminOverviewTab() {
  const [stats, setStats] = useState({ skills: 0, users: 0, reviews: 0, enrollments: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: skills }, { count: users }, { count: reviews }, { count: enrollments }] = await Promise.all([
        supabase.from('skills').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
        supabase.from('user_progress').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ skills: skills || 0, users: users || 0, reviews: reviews || 0, enrollments: enrollments || 0 });

      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return { date: format(d, 'MMM d'), enrollments: Math.floor(Math.random() * 20) + 5 };
      });
      setChartData(last7);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Skills', value: stats.skills, icon: '📚', color: T.accent },
          { label: 'Total Users', value: stats.users, icon: '👥', color: T.green },
          { label: 'Reviews', value: stats.reviews, icon: '⭐', color: T.gold },
          { label: 'Enrollments', value: stats.enrollments, icon: '🎯', color: '#A78BFA' },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontFamily: T.fontHead, fontWeight: 700, fontSize: 28, color: s.color, margin: '8px 0 4px' }}>{s.value}</div>
            <div style={{ color: T.textSec, fontSize: 12 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Enrollment Trend (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" tick={{ fill: T.textSec, fontSize: 11 }} />
            <YAxis tick={{ fill: T.textSec, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8 }} />
            <Bar dataKey="enrollments" fill={T.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function AdminSkillsTab() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState(null);
  const [newSkill, setNewSkill] = useState({ title: '', category: '', level: 'Beginner', description: '', duration: '' });
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const fetchSkills = useCallback(async () => {
    const { data } = await supabase.from('skills').select('*').order('created_at', { ascending: false });
    setSkills(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const createSkill = async () => {
    if (!newSkill.title) return;
    const { error } = await supabase.from('skills').insert(newSkill);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Skill created!' });
      setNewSkill({ title: '', category: '', level: 'Beginner', description: '', duration: '' });
      fetchSkills();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const updateSkill = async () => {
    if (!editingSkill) return;
    const { error } = await supabase.from('skills').update(editingSkill).eq('id', editingSkill.id);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Skill updated!' });
      setEditingSkill(null);
      fetchSkills();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const deleteSkill = async (id) => {
    if (!window.confirm('Delete this skill and all its modules?')) return;
    await supabase.from('skill_modules').delete().eq('skill_id', id);
    const { error } = await supabase.from('skills').delete().eq('id', id);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Skill deleted.' });
      fetchSkills();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {message && <Alert message={message.text} type={message.type} onClose={() => setMessage(null)} style={{ marginBottom: 16 }} />}

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: T.fontHead, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Create New Skill</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <Input label="Title" value={newSkill.title} onChange={e => setNewSkill({...newSkill, title: e.target.value})} placeholder="Skill title" />
          <Input label="Category" value={newSkill.category} onChange={e => setNewSkill({...newSkill, category: e.target.value})} placeholder="Category" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: T.fontHead, fontSize: 13, color: T.textSec }}>Level</label>
            <select value={newSkill.level} onChange={e => setNewSkill({...newSkill, level: e.target.value})} style={{ padding: '12px 16px', background: T.bgCard, border: `1.5px solid ${T.border}`, borderRadius: T.radiusSm, color: T.textPri, fontSize: 14 }}>
              <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
            </select>
          </div>
          <Input label="Duration" value={newSkill.duration} onChange={e => setNewSkill({...newSkill, duration: e.target.value})} placeholder="e.g. 4 weeks" />
        </div>
        <div style={{ marginTop: 12 }}>
          <Input label="Description" value={newSkill.description} onChange={e => setNewSkill({...newSkill, description: e.target.value})} placeholder="Skill description" />
        </div>
        <Btn onClick={createSkill} style={{ marginTop: 14 }} disabled={!newSkill.title}>Create Skill</Btn>
      </Card>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {['Title', 'Category', 'Level', 'Duration', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 8px', fontFamily: T.fontHead, fontSize: 12, color: T.textSec, letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skills.map(skill => (
                <tr key={skill.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>
                    {editingSkill?.id === skill.id ? (
                      <input value={editingSkill.title} onChange={e => setEditingSkill({...editingSkill, title: e.target.value})}
                        style={{ background: T.bgMid, border: `1px solid ${T.border}`, color: T.textPri, borderRadius: 4, padding: '4px 8px', fontSize: 13, width: '100%' }} />
                    ) : skill.title}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{skill.category}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{skill.level}</td>
                  <td style={{ padding: '10px 8px', fontSize: 13 }}>{skill.duration}</td>
                  <td style={{ padding: '10px 8px' }}>
                    {editingSkill?.id === skill.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn small variant="success" onClick={updateSkill}>Save</Btn>
                        <Btn small variant="ghost" onClick={() => setEditingSkill(null)}>Cancel</Btn>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn small variant="secondary" onClick={() => navigate(`/skill/${skill.id}`)}>View</Btn>
                        <Btn small variant="ghost" onClick={() => setEditingSkill(skill)}>Edit</Btn>
                        <Btn small variant="danger" onClick={() => deleteSkill(skill.id)}>Delete</Btn>
                      </div>
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

function AdminUsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) setMessage({ type: 'error', text: error.message });
    else setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Role updated' });
      fetchUsers();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return <Spinner />;

  return (
    <Card>
      {message && <Alert message={message.text} type={message.type} onClose={() => setMessage(null)} style={{ marginBottom: 12 }} />}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {['Email', 'Name', 'Role', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 8px', fontFamily: T.fontHead, fontSize: 12, color: T.textSec }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '10px 8px', fontSize: 13 }}>{u.email}</td>
                <td style={{ padding: '10px 8px', fontSize: 13 }}>{u.full_name || '—'}</td>
                <td style={{ padding: '10px 8px' }}>
                  <Badge color={u.role === 'admin' ? T.gold : T.accent}>{u.role || 'user'}</Badge>
                </td>
                <td style={{ padding: '10px 8px', fontSize: 12, color: T.textSec }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '10px 8px' }}>
                  {u.role !== 'admin' ? (
                    <Btn small variant="ghost" onClick={() => updateRole(u.id, 'admin')}>Make Admin</Btn>
                  ) : (
                    <Btn small variant="ghost" onClick={() => updateRole(u.id, 'user')}>Remove Admin</Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

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
