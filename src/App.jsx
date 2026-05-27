import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowDownToLine, LogIn, LogOut, User, CheckCircle2, ShieldAlert, Monitor, Terminal, Cpu, Database, Activity, RefreshCw, Trash2, History, ChevronRight } from 'lucide-react';
import './App.css';

// Initialize Supabase Client
const SUPABASE_URL = 'https://xhyocyifhugpyqvmwrne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeW9jeWlmaHVncHlxdm13cm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDg4MDEsImV4cCI6MjA5NTM4NDgwMX0.InqCT8evlNdTvzkSh3UpJIivORyZk-Pwbh4kBYuPalQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


export default function App() {
  const [page, setPage] = useState('landing'); // 'landing' | 'auth' | 'dashboard' | 'callback' | 'changelog'
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [callbackMsg, setCallbackMsg] = useState('Verifying authentication...');
  
  // Real-time states
  const [totalTokens, setTotalTokens] = useState(0);
  const [animatedTokens, setAnimatedTokens] = useState(0);
  
  // Interactive Mockup Tab Selection state
  const [activeMockupTab, setActiveMockupTab] = useState('workspace'); // 'workspace' | 'settings' | 'history' | 'auth'

  // Dashboard metrics states
  const [dbUsage, setDbUsage] = useState([]);
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview'); // 'overview' | 'queries' | 'models' | 'download'
  const [metrics, setMetrics] = useState({
    stats: { queryCount: 0, totalTokens: 0 },
    weeklyTrend: [],
    modelRuns: [],
    recentQueries: []
  });

  // App Mockup Animation Loop States
  const [mockupPhase, setMockupPhase] = useState('idle'); // 'idle' | 'searching' | 'scraped' | 'synthesizing' | 'done'
  const [mockupSearch] = useState('Market share of electric vehicles in Europe in 2025');

  // Handle URL deep linking, OAuth Callbacks, and global session check
  useEffect(() => {
    const hash = window.location.hash;
    const isDesktop = window.location.search.includes('desktop=true') || localStorage.getItem('auth_desktop_initiated') === 'true';

    // 1. Fetch initial total tokens global count
    supabase.rpc('get_total_tokens').then(({ data, error }) => {
      if (!error && data !== null) {
        setTotalTokens(Number(data));
      }
    });

    // 2. Subscribe to real-time updates on model_usage table
    const channel = supabase
      .channel('public:model_usage')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'model_usage' }, (payload) => {
        console.log('[realtime] New usage logged:', payload.new);
        const addedTokens = Number(payload.new.tokens_estimated || 0);
        setTotalTokens((prev) => prev + addedTokens);
      })
      .subscribe();

    if (hash && (hash.includes('access_token=') || hash.includes('error='))) {
      setPage('callback');
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const errorMsg = params.get('error_description');

      if (errorMsg) {
        setCallbackMsg(`OAuth Error: ${errorMsg}`);
        localStorage.removeItem('auth_desktop_initiated');
        return;
      }

      if (accessToken && refreshToken) {
        if (isDesktop) {
          setCallbackMsg('Authentication successful! Launching Knovant Desktop Application...');
          localStorage.removeItem('auth_desktop_initiated');
          setTimeout(() => {
            window.location.href = `knovant://auth-callback#access_token=${accessToken}&refresh_token=${refreshToken}`;
          }, 1500);
        } else {
          setCallbackMsg('Signing in to website profile dashboard...');
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          }).then(({ data, error }) => {
            if (error) {
              setCallbackMsg(`Sign-in failed: ${error.message}`);
            } else {
              setUser(data.user);
              setPage('dashboard');
              window.location.hash = ''; // clear hash
            }
          });
        }
      }
    } else {
      // PERSIST user session check on boot
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          setUser(session.user);
          // If loaded with explicit desktop trigger, redirect back to desktop app instantly!
          if (window.location.search.includes('desktop=true')) {
            setPage('callback');
            setCallbackMsg('User already authenticated on browser! Transferring secure session to Knovant Desktop...');
            setTimeout(() => {
              window.location.href = `knovant://auth-callback#access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
            }, 1200);
          }
        }
      });
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // HTML5 History API Routing support (Back/Forward browser buttons)
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.page) {
        setPage(event.state.page);
      } else {
        setPage('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ page }, '', page === 'landing' ? '/' : `/${page}`);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const pathName = page === 'landing' ? '/' : `/${page}`;
    if (window.location.pathname !== pathName) {
      window.history.pushState({ page }, '', pathName);
    }
  }, [page]);

  // Smooth count-up tweening for global tokens in navbar
  useEffect(() => {
    let startTimestamp = null;
    const startVal = animatedTokens;
    const endVal = totalTokens;
    if (startVal === endVal) return;
    const duration = 1200; // 1.2s

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const nextVal = Math.floor(startVal + (endVal - startVal) * easeProgress);
      setAnimatedTokens(nextVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [totalTokens]);

  // Fetch real-time usage metrics when user is authenticated on dashboard
  useEffect(() => {
    if (user && page === 'dashboard') {
      fetchUserUsage();
    }
  }, [user, page]);

  const fetchUserUsage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('model_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setDbUsage(data);
        processDatabaseMetrics(data);
      } else {
        setDbUsage([]);
        setMetrics({
          stats: { queryCount: 0, totalTokens: 0 },
          weeklyTrend: [],
          modelRuns: [],
          recentQueries: []
        });
      }
    } catch (e) {
      console.warn('Failed to load profile database stats:', e.message);
      setMetrics({
        stats: { queryCount: 0, totalTokens: 0 },
        weeklyTrend: [],
        modelRuns: [],
        recentQueries: []
      });
    } finally {
      setLoading(false);
    }
  };

  const processDatabaseMetrics = (rows) => {
    const queryCount = rows.length;
    const totalTokens = rows.reduce((acc, r) => acc + (r.tokens_estimated || 0), 0);

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendMap = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = daysOfWeek[d.getDay()] + (i === 0 ? ': Today' : '');
      const key = d.toDateString();
      trendMap[key] = { label, tokens: 0 };
    }

    rows.forEach(r => {
      const dateKey = new Date(r.created_at).toDateString();
      if (trendMap[dateKey]) {
        trendMap[dateKey].tokens += (r.tokens_estimated || 0);
      }
    });

    const weeklyTrend = Object.keys(trendMap).map(k => ({
      day: trendMap[k].label,
      tokens: trendMap[k].tokens
    }));

    const modelMap = {};
    rows.forEach(r => {
      const model = r.selected_model || 'unknown';
      modelMap[model] = (modelMap[model] || 0) + 1;
    });

    const modelRuns = Object.keys(modelMap).map(model => ({
      model,
      count: modelMap[model]
    })).sort((a, b) => b.count - a.count);

    const recentQueries = rows.slice(0, 5);

    setMetrics({
      stats: { queryCount, totalTokens },
      weeklyTrend,
      modelRuns,
      recentQueries
    });
  };

  // Mockup Interactive Phase Transitions Loop
  useEffect(() => {
    if (page !== 'landing') return;
    
    if (mockupPhase === 'idle') {
      const t = setTimeout(() => setMockupPhase('searching'), 2000);
      return () => clearTimeout(t);
    } else if (mockupPhase === 'searching') {
      const t = setTimeout(() => setMockupPhase('scraped'), 3000);
      return () => clearTimeout(t);
    } else if (mockupPhase === 'scraped') {
      const t = setTimeout(() => setMockupPhase('synthesizing'), 3000);
      return () => clearTimeout(t);
    } else if (mockupPhase === 'synthesizing') {
      const t = setTimeout(() => setMockupPhase('done'), 3000);
      return () => clearTimeout(t);
    } else if (mockupPhase === 'done') {
      const t = setTimeout(() => setMockupPhase('idle'), 7000);
      return () => clearTimeout(t);
    }
  }, [page, mockupPhase]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      setUser(data.user);
      setPage('dashboard');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      alert('Verification link sent! Please check your email inbox to activate your account.');
      setAuthMode('signin');
    }
  };

  const handleGoogleLogin = async () => {
    const isDesktopFlow = window.location.search.includes('desktop=true');
    if (isDesktopFlow) {
      localStorage.setItem('auth_desktop_initiated', 'true');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      alert('Google OAuth Error: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPage('landing');
  };

  // Render Line Area SVG Chart
  const renderWeeklyTrendChart = () => {
    const trend = metrics.weeklyTrend;
    if (!trend || trend.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '12px', gap: '8px' }}>
          <Activity size={24} style={{ opacity: 0.3 }} />
          <span>No Ingestion Data Available</span>
        </div>
      );
    }

    const maxVal = Math.max(...trend.map(t => t.tokens), 50000);
    
    const w = 400;
    const h = 140;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 10;
    const paddingBottom = 20;

    const chartWidth = w - paddingLeft - paddingRight;
    const chartHeight = h - paddingTop - paddingBottom;

    const points = trend.map((t, idx) => {
      const x = paddingLeft + (idx / (trend.length - 1)) * chartWidth;
      const y = h - paddingBottom - (t.tokens / maxVal) * chartHeight;
      return { x, y, val: t.tokens, day: t.day.split(':')[0] };
    });

    const linePath = points.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    }, '');

    const areaPath = linePath + 
      `L ${points[points.length - 1].x.toFixed(1)} ${(h - paddingBottom).toFixed(1)} ` +
      `L ${points[0].x.toFixed(1)} ${(h - paddingBottom).toFixed(1)} Z`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + ratio * chartHeight;
          const labelVal = Math.round(maxVal * (1 - ratio));
          const labelStr = labelVal >= 1000 ? `${(labelVal / 1000).toFixed(0)}k` : labelVal;
          return (
            <g key={idx}>
              <line className="chart-svg-grid-line" x1={paddingLeft} y1={y} x2={w - paddingRight} y2={y} />
              <text className="chart-svg-text" x={paddingLeft - 8} y={y + 3} textAnchor="end">{labelStr}</text>
            </g>
          );
        })}

        {points.map((p, idx) => (
          <text key={idx} className="chart-svg-text" x={p.x} y={h - 4} textAnchor="middle">{p.day}</text>
        ))}

        <path className="chart-svg-area" d={areaPath} />
        <path className="chart-svg-line chart-svg-line-animated" d={linePath} />

        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r={3} fill="#0F172A" stroke="#FFFFFF" strokeWidth={1} style={{ cursor: 'pointer' }}>
            <title>{p.day}: {p.val.toLocaleString()} tokens</title>
          </circle>
        ))}

        <line className="chart-svg-axis-line" x1={paddingLeft} y1={h - paddingBottom} x2={w - paddingRight} y2={h - paddingBottom} />
      </svg>
    );
  };

  // Render Horizontal Progress Bar SVG Chart
  const renderModelRunsChart = () => {
    const runs = metrics.modelRuns;
    if (!runs || runs.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '12px', gap: '8px' }}>
          <Cpu size={24} style={{ opacity: 0.3 }} />
          <span>No Model Runs Available</span>
        </div>
      );
    }

    const maxCount = Math.max(...runs.map(r => r.count), 1);
    
    const w = 400;
    const h = 140;
    const barHeight = 16;
    const barGap = 20;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        {runs.map((r, idx) => {
          const y = 15 + idx * (barHeight + barGap);
          const barWidth = 240 * (r.count / maxCount);
          return (
            <g key={idx}>
              <text className="chart-svg-text" x={80} y={y + 12} textAnchor="end" style={{ fontWeight: '500' }}>
                {r.model.split(':')[0]}
              </text>
              <rect className="chart-svg-bar-bg" x={90} y={y} width={240} height={barHeight} rx={2} />
              <rect className="chart-svg-bar" x={90} y={y} width={barWidth} height={barHeight} rx={2} />
              <text className="chart-svg-text" x={95 + barWidth} y={y + 12} style={{ fontWeight: '600' }}>
                {r.count} runs
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="website-container">
      
      {/* Site Header */}
      <header className="site-header">
        <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => setPage('landing')}>
          <img src="/knovant-logo-transparent.png" alt="Knovant logo" className="logo-icon" />
          <span className="logo-text">Knovant</span>
        </div>
        
        {/* Real-time Global Ingestion Volume indicator */}
        <div className="global-counter-container" title="Real-time global tokens processed by all desktop instances combined">
          <span className="counter-dot animate-pulse"></span>
          <span className="counter-label">Token Usage Globally:</span>
          <span className="counter-value">{animatedTokens.toLocaleString()} tokens</span>
        </div>
        
        <nav className="nav-links">
          <button onClick={() => setPage('changelog')} className={`nav-link-btn ${page === 'changelog' ? 'active' : ''}`}>Changelog</button>
          
          {user ? (
            <>
              <button onClick={() => setPage('dashboard')} className={`nav-link ${page === 'dashboard' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} /> Dashboard
              </button>
              <button onClick={handleSignOut} className="nav-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <button onClick={() => { setAuthMode('signin'); setPage('auth'); }} className="nav-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogIn size={14} /> Sign In
            </button>
          )}
        </nav>
      </header>

      {/* Main Page Routing */}
      {page === 'landing' && (
        <div className="fade-in">
          
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-tagline">Elite Intelligence Assistant</div>
            <h1 className="hero-title">Local-First Deep Web Research</h1>
            <p className="hero-subtitle">
              Knovant is an enterprise-grade local-first desktop intelligence system. It orchestrates parallel query-decomposition threads, scrapes DOM text using zero-dependency Cheerio pipelines, cross-checks source statements with cosine similarity semantic score filters, and drafts deep reports on your machine using local Ollama model context.
            </p>
            
            <div className="hero-actions">
              <a href="/Knovant.Setup.1.0.0.exe" className="btn-primary">
                <ArrowDownToLine size={18} />
                Download for Windows (v1.0.0)
              </a>
              {user ? (
                <button onClick={() => setPage('dashboard')} className="btn-secondary">
                  Open Dashboard
                </button>
              ) : (
                <button onClick={() => { setAuthMode('signup'); setPage('auth'); }} className="btn-secondary">
                  Create Account
                </button>
              )}
            </div>

            <div className="ollama-powered-banner">
              <svg className="ollama-banner-logo" viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                <title>Ollama</title>
                <path d="M16.361 10.26a.894.894 0 0 0-.558.47l-.072.148.001.207c0 .193.004.217.059.353.076.193.152.312.291.448.24.238.51.3.872.205a.86.86 0 0 0 .517-.436.752.752 0 0 0 .08-.498c-.064-.453-.33-.782-.724-.897a1.06 1.06 0 0 0-.466 0zm-9.203.005c-.305.096-.533.32-.65.639a1.187 1.187 0 0 0-.06.52c.057.309.31.59.598.667.362.095.632.033.872-.205.14-.136.215-.255.291-.448.055-.136.059-.16.059-.353l.001-.207-.072-.148a.894.894 0 0 0-.565-.472 1.02 1.02 0 0 0-.474.007Zm4.184 2c-.131.071-.223.25-.195.383.031.143.157.288.353.407.105.063.112.072.117.136.004.038-.01.146-.029.243-.02.094-.036.194-.036.222.002.074.07.195.143.253.064.052.076.054.255.059.164.005.198.001.264-.03.169-.082.212-.234.15-.525-.052-.243-.042-.28.087-.355.137-.08.281-.219.324-.314a.365.365 0 0 0-.175-.48.394.394 0 0 0-.181-.033c-.126 0-.207.03-.355.124l-.085.053-.053-.032c-.219-.13-.259-.145-.391-.143a.396.396 0 0 0-.193.032zm.39-2.195c-.373.036-.475.05-.654.086-.291.06-.68.195-.951.328-.94.46-1.589 1.226-1.787 2.114-.04.176-.045.234-.045.53 0 .294.005.357.043.524.264 1.16 1.332 2.017 2.714 2.173.3.033 1.596.033 1.896 0 1.11-.125 2.064-.727 2.493-1.571.114-.226.169-.372.22-.602.039-.167.044-.23.044-.523 0-.297-.005-.355-.045-.531-.288-1.29-1.539-2.304-3.072-2.497a6.873 6.873 0 0 0-.855-.031zm.645.937a3.283 3.283 0 0 1 1.44.514c.223.148.537.458.671.662.166.251.26.508.303.82.02.143.01.251-.043.482-.08.345-.332.705-.672.957a3.115 3.115 0 0 1-.689.348c-.382.122-.632.144-1.525.138-.582-.006-.686-.01-.853-.042-.57-.107-1.022-.334-1.35-.68-.264-.28-.385-.535-.45-.946-.03-.192.025-.509.137-.776.136-.326.488-.73.836-.963.403-.269.934-.46 1.422-.512.187-.02.586-.02.773-.002zm-5.503-11a1.653 1.653 0 0 0-.683.298C5.617.74 5.173 1.666 4.985 2.819c-.07.436-.119 1.04-.119 1.503 0 .544.064 1.24.155 1.721.02.107.031.202.023.208a8.12 8.12 0 0 1-.187.152 5.324 5.324 0 0 0-.949 1.02 5.49 5.49 0 0 0-.94 2.339 6.625 6.625 0 0 0-.023 1.357c.091.78.325 1.438.727 2.04l.13.195-.037.064c-.269.452-.498 1.105-.605 1.732-.084.496-.095.629-.095 1.294 0 .67.009.803.088 1.266.095.555.288 1.143.503 1.534.071.128.243.393.264.407.007.003-.014.067-.046.141a7.405 7.405 0 0 0-.548 1.873c-.062.417-.071.552-.071.991 0 .56.031.832.148 1.279L3.42 24h1.478l-.05-.091c-.297-.552-.325-1.575-.068-2.597.117-.472.25-.819.498-1.296l.148-.29v-.177c0-.165-.003-.184-.057-.293a.915.915 0 0 0-.194-.25 1.74 1.74 0 0 1-.385-.543c-.424-.92-.506-2.286-.208-3.451.124-.486.329-.918.544-1.154a.787.787 0 0 0 .223-.531c0-.195-.07-.355-.224-.522a3.136 3.136 0 0 1-.817-1.729c-.14-.96.114-2.005.69-2.834.563-.814 1.353-1.336 2.237-1.475.199-.033.57-.028.776.01.226.04.367.028.512-.041.179-.085.268-.19.374-.431.093-.215.165-.333.36-.576.234-.29.46-.489.822-.729.413-.27.884-.467 1.352-.561.17-.035.25-.04.569-.04.319 0 .398.005.569.04a4.07 4.07 0 0 1 1.914.997c.117.109.398.457.488.602.034.057.095.177.132.267.105.241.195.346.374.43.14.068.286.082.503.045.343-.058.607-.053.943.016 1.144.23 2.14 1.173 2.581 2.437.385 1.108.276 2.267-.296 3.153-.097.15-.193.27-.333.419-.301.322-.301.722-.001 1.053.493.539.801 1.866.708 3.036-.062.772-.26 1.463-.533 1.854a2.096 2.096 0 0 1-.224.258.916.916 0 0 0-.194.25c-.054.109-.057.128-.057.293v.178l.148.29c.248.476.38.823.498 1.295.253 1.008.231 2.01-.059 2.581a.845.845 0 0 0-.044.098c0 .006.329.009.732.009h.73l.02-.074.036-.134c.019-.076.057-.3.088-.516.029-.217.029-1.016 0-1.258-.11-.875-.295-1.57-.597-2.226-.032-.074-.053-.138-.046-.141.008-.005.057-.074.108-.152.376-.569.607-1.284.724-2.228.031-.26.031-1.378 0-1.628-.083-.645-.182-1.082-.348-1.525a6.083 6.083 0 0 0-.329-.7l-.038-.064.131-.194c.402-.604.636-1.262.727-2.04a6.625 6.625 0 0 0-.024-1.358 5.512 5.512 0 0 0-.939-2.339 5.325 5.325 0 0 0-.95-1.02 8.097 8.097 0 0 1-.186-.152.692.692 0 0 1 .023-.208c.208-1.087.201-2.443-.017-3.503-.19-.924-.535-1.658-.98-2.082-.354-.338-.716-.482-1.15-.455-.996.059-1.8 1.205-2.116 3.01a6.805 6.805 0 0 0-.097.726c0 .036-.007.066-.015.066a.96.96 0 0 1-.149-.078A4.857 4.857 0 0 0 12 3.03c-.832 0-1.687.243-2.456.698a.958.958 0 0 1-.148.078c-.008 0-.015-.03-.015-.066a6.71 6.71 0 0 0-.097-.725C8.997 1.392 8.337.319 7.46.048a2.096 2.096 0 0 0-.585-.041Zm.293 1.402c.248.197.523.759.682 1.388.03.113.06.244.069.292.007.047.026.152.041.233.067.365.098.76.102 1.24l.002.475-.12.175-.118.178h-.278c-.324 0-.646.041-.954.124l-.238.06c-.033.007-.038-.003-.057-.144a8.438 8.438 0 0 1 .016-2.323c.124-.788.413-1.501.696-1.711.067-.05.079-.049.157.013zm9.825-.012c.17.126.358.46.498.888.28.854.36 2.028.212 3.145-.019.14-.024.151-.057.144l-.238-.06a3.693 3.693 0 0 0-.954-.124h-.278l-.119-.178-.119-.175.002-.474c.004-.669.066-1.19.214-1.772.157-.623.434-1.185.68-1.382.078-.062.09-.063.159-.012z" />
              </svg>
              <span>Fully Supported & Powered by Ollama Local Inference Engines</span>
            </div>
          </section>

          {/* Alternating Showcase Series (One Screen after Next Screen Showcase) */}
          <section className="mockup-section">
            
            {/* Screen 1: Deep Research Workspace */}
            <div className="showcase-row">
              <div className="showcase-text-content">
                <span className="showcase-tag">Phase 01 / Cognitive Research Workspace</span>
                <h2 className="showcase-title">Parallel Deep Web Crawling & Synthesis</h2>
                <p className="showcase-desc">
                  Knovant deconstructs single queries into distinct, targeted sub-queries. An asynchronous network scraper fetches content in parallel, strips DOM boilerplate, and performs factual consensus audits to compile final reports using local LLM contexts.
                </p>
                <div className="showcase-bullets">
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Recursive Query Decomposition</div>
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Concurrent HTML/DOM Document Parsing</div>
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Factual Claim Consensus Checking</div>
                </div>
              </div>

              {/* Window 1: Workspace Chat & Status */}
              <div className="mockup-window workspace-window" style={{ flex: 1 }}>
                <header className="mockup-titlebar">
                  <div className="mockup-titlebar-left">
                    <span className="mockup-app-logo">Knovant</span>
                    <span className="mockup-version-badge">Workspace</span>
                  </div>
                  <div className="mockup-titlebar-right">
                    <div className="mockup-window-btn" title="Report a Bug">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px' }}><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg>
                    </div>
                    <div className="mockup-window-btn-close">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </div>
                  </div>
                </header>
                
                <div className="mockup-content">
                  {/* Left Panel: Research Chat */}
                  <div className="mockup-chat-panel">
                    <div className="mockup-panel-header">
                      <span>Research Chat</span>
                    </div>
                    
                    <div className="mockup-chat-history">
                      <div className="mockup-msg user">
                        <div className="mockup-msg-meta">Query</div>
                        <div className="mockup-msg-content">
                          {mockupSearch}
                        </div>
                      </div>

                      {mockupPhase !== 'idle' && (
                        <div className="mockup-msg assistant">
                          <div className="mockup-msg-meta">Knovant Agent</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                            
                            <div className="mockup-research-phases">
                              <div className={`mockup-phase-step ${mockupPhase === 'searching' ? 'active' : ''} ${['scraped', 'synthesizing', 'done'].includes(mockupPhase) ? 'completed' : ''}`}>
                                <div className="mockup-phase-dot"></div>
                                <span className="mockup-phase-label">Deconstruct</span>
                              </div>
                              
                              <div className={`mockup-phase-step ${mockupPhase === 'scraped' ? 'active' : ''} ${['synthesizing', 'done'].includes(mockupPhase) ? 'completed' : ''}`}>
                                <div className="mockup-phase-dot"></div>
                                <span className="mockup-phase-label">Scrape</span>
                              </div>
                              
                              <div className={`mockup-phase-step ${mockupPhase === 'synthesizing' ? 'active' : ''} ${['done'].includes(mockupPhase) ? 'completed' : ''}`}>
                                <div className="mockup-phase-dot"></div>
                                <span className="mockup-phase-label">Audit</span>
                              </div>
                              
                              <div className={`mockup-phase-step ${mockupPhase === 'done' ? 'active' : ''} ${mockupPhase === 'done' ? 'completed' : ''}`}>
                                <div className="mockup-phase-dot"></div>
                                <span className="mockup-phase-label">Synthesize</span>
                              </div>
                            </div>

                            {mockupPhase === 'searching' && (
                              <div className="mockup-sub-queries">
                                <span className="mockup-msg-meta">Decomposing Search Space</span>
                                <div className="mockup-sub-query-item"><ChevronRight size={10} /> EU electric vehicle market statistics 2025</div>
                                <div className="mockup-sub-query-item"><ChevronRight size={10} /> European automakers EV penetration figures</div>
                              </div>
                            )}

                            {mockupPhase === 'scraped' && (
                              <div className="mockup-scrape-console">
                                <div className="mockup-scrape-row">
                                  <span className="mockup-scrape-domain">reuters.com/business/autos/ev-sales-2025</span>
                                  <span className="mockup-scrape-status crawling">SCRAPING</span>
                                </div>
                                <div className="mockup-scrape-row">
                                  <span className="mockup-scrape-domain">acea.auto/files/registration-press-release-q4</span>
                                  <span className="mockup-scrape-status ok">COMPLETED</span>
                                </div>
                              </div>
                            )}

                            {mockupPhase === 'synthesizing' && (
                              <div className="mockup-sub-queries" style={{ borderBottom: 'none' }}>
                                <span className="mockup-msg-meta">Scoring Consensus and Context Synthesis</span>
                                <div className="mockup-sub-query-item">✓ Reuters dataset matches ACEA registration charts (HIGH Agreement)</div>
                              </div>
                            )}

                            {mockupPhase === 'done' && (
                              <div className="mockup-msg-content" style={{ fontSize: '13px', color: 'var(--mockup-text-secondary)' }}>
                                Synthesis complete. Factual consensus compiled and loaded in the preview pane.
                              </div>
                            )}

                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mockup-input-area">
                      <div className="mockup-input-box">
                        {mockupSearch}
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Research Preview */}
                  <div className="mockup-report-panel">
                    <div className="mockup-panel-header" style={{ borderBottom: '1px solid var(--mockup-border-medium)' }}>
                      <span>Research Preview</span>
                    </div>
                    
                    <div className="mockup-report-body">
                      {mockupPhase === 'done' ? (
                        <>
                          <h1 className="mockup-h1">Deep Research Report: EU EV Market</h1>
                          <div className="mockup-report-meta">
                            <span>Model: llama3.1:8b</span>
                            <span>Confidence: HIGH</span>
                          </div>
                          
                          <p className="mockup-p">
                            Factual consensus audit complete. Below is the cross-referenced market analysis of EU electric vehicle penetration rates for 2025.
                          </p>
                          
                          <table className="mockup-report-table">
                            <thead>
                              <tr>
                                <th>Region</th>
                                <th>Registrations</th>
                                <th>YOY Growth</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Nordics</td>
                                <td>248,500</td>
                                <td>+12.4%</td>
                              </tr>
                              <tr>
                                <td>Western Europe</td>
                                <td>612,000</td>
                                <td>+8.1%</td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--mockup-text-tertiary)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>
                          {mockupPhase === 'idle' && "Submit query to compile deep research report"}
                          {mockupPhase === 'searching' && "Phase 1: Compiling deconstructed sources..."}
                          {mockupPhase === 'scraped' && "Phase 2: Extracting clean markdown text..."}
                          {mockupPhase === 'synthesizing' && "Phase 3: Cross-referencing source claims..."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen 2: System Configuration (Alternating: Mockup left, Text right) */}
            <div className="showcase-row alternate">
              {/* Window 2: Engine Settings */}
              <div className="mockup-window settings-window" style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
                <header className="mockup-titlebar">
                  <div className="mockup-titlebar-left">
                    <span className="mockup-app-logo">Knovant</span>
                    <span className="mockup-version-badge">Settings</span>
                  </div>
                </header>
                <div className="mockup-content-vertical">
                  <div className="mockup-settings-view-mini">
                    <h3 className="mockup-settings-title-mini">Engine Configuration</h3>
                    
                    <div className="mockup-settings-group-mini">
                      <label className="mockup-settings-label-mini">Ollama Host Connection</label>
                      <input type="text" className="mockup-settings-input-mini" value="http://localhost:11434" readOnly />
                      <span className="mockup-settings-tip-mini">✓ Connected to local Ollama server</span>
                    </div>

                    <div className="mockup-settings-group-mini">
                      <label className="mockup-settings-label-mini">Active Research Model</label>
                      <select className="mockup-settings-select-mini" disabled>
                        <option>llama3.1:8b (Active)</option>
                      </select>
                    </div>

                    <div className="mockup-settings-group-mini">
                      <label className="mockup-settings-label-mini">Inference Temperature</label>
                      <div className="mockup-settings-slider-container">
                        <input type="range" className="mockup-settings-range-mini" value="20" min="0" max="100" readOnly />
                        <span className="mockup-settings-slider-value">0.20</span>
                      </div>
                    </div>

                    <div className="mockup-settings-group-mini">
                      <label className="mockup-settings-label-mini">Context Length</label>
                      <div className="mockup-settings-slider-container">
                        <input type="range" className="mockup-settings-range-mini" value="50" min="0" max="100" readOnly />
                        <span className="mockup-settings-slider-value">16k tokens</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="showcase-text-content">
                <span className="showcase-tag">Phase 02 / Local Model Infrastructure</span>
                <h2 className="showcase-title">Ollama Engine Integration</h2>
                <p className="showcase-desc">
                  Knovant routes all core LLM operations directly through your local Ollama connection. Select active model tags, tune model temperatures, and custom allocate contextual token budgets directly inside your desktop settings.
                </p>
                <div className="showcase-bullets">
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Host Connection Auto-Scanning</div>
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Custom Model Parameter Fine-Tuning</div>
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Context Length Expansion Allocation</div>
                </div>
              </div>
            </div>

            {/* Screen 3: History Vault & Auth (Alternating: Text left, Mockup right) */}
            <div className="showcase-row">
              <div className="showcase-text-content">
                <span className="showcase-tag">Phase 03 / Database Sync & Telemetry</span>
                <h2 className="showcase-title">Secure Historical Vault Syncing</h2>
                <p className="showcase-desc">
                  Review all previous local deep research sessions. Authenticate with Google Sign-in to securely synchronize session telemetry, model runs, and token ingestion logs to your real-time profile dashboard.
                </p>
                <div className="showcase-bullets">
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Encrypted Session History Logger</div>
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Google OAuth Security Protocol</div>
                  <div className="showcase-bullet-item"><CheckCircle2 size={14} className="showcase-bullet-icon" /> Automatic Token Telemetry Sync</div>
                </div>
              </div>

              {/* Window 3: Run History & Auth */}
              <div className="mockup-window settings-window" style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
                <header className="mockup-titlebar">
                  <div className="mockup-titlebar-left">
                    <span className="mockup-app-logo">Knovant</span>
                    <span className="mockup-version-badge">History & Access</span>
                  </div>
                </header>
                <div className="mockup-content-vertical">
                  <div className="mockup-history-view-mini">
                    <h3 className="mockup-settings-title-mini">Run History Logs</h3>
                    
                    <div className="mockup-history-item-mini">
                      <div className="mockup-history-title-mini">Superconductivity replication attempts</div>
                      <div className="mockup-history-meta-mini">May 26, 2026 • 41,220 tokens</div>
                    </div>

                    <div className="mockup-history-item-mini">
                      <div className="mockup-history-title-mini">Quantum error thresholds</div>
                      <div className="mockup-history-meta-mini">May 25, 2026 • 52,000 tokens</div>
                    </div>
                    
                    <h3 className="mockup-settings-title-mini" style={{ marginTop: '24px' }}>Access Control</h3>
                    <div className="mockup-auth-view-mini">
                      <span className="mockup-auth-desc-mini">Sync sessions securely to your user profile database.</span>
                      <button className="mockup-login-btn-mini">
                        <svg viewBox="0 0 24 24" width="12" height="12" style={{ marginRight: '6px' }}><path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 3C6.17 7.59 8.87 5.04 12 5.04z"/><path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.52z"/><path fill="#FBBC05" d="M5.24 14.56c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 6.94C.5 8.73 0 10.73 0 12.8s.5 4.07 1.39 5.86l3.85-3.1z"/><path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.52 1.18-4.3 1.18-3.13 0-5.83-2.55-6.76-5.52l-3.85 3C3.37 20.35 7.35 23 12 23z"/></svg>
                        Continue with Google
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* Typographic Features Grid */}
          <div className="section-header">
            <span className="section-tag">Capabilities Matrix</span>
            <h2 className="section-title">Core Processing Engines</h2>
          </div>

          <section className="features-grid">
            <div className="feature-item">
              <span className="feature-meta">Engine 01 / DECONSTRUCT</span>
              <h3 className="feature-title">Query Decomposition</h3>
              <p className="feature-desc">
                Knovant leverages a custom decomposition parser to analyze complex search instructions. It recursively splits single questions into 3 to 5 distinct, targeted sub-queries, creating a structured execution search tree.
              </p>
            </div>
            
            <div className="feature-item">
              <span className="feature-meta">Engine 02 / CRAWL</span>
              <h3 className="feature-title">Concurrent Page Scraper</h3>
              <p className="feature-desc">
                An asynchronous Cheerio-powered network crawler scrapes HTML nodes in parallel. It automatically strips styling block files, scripts, navigation widgets, advertisements, and cookie walls, returning clean structured DOM text.
              </p>
            </div>
            
            <div className="feature-item">
              <span className="feature-meta">Engine 03 / AUDIT</span>
              <h3 className="feature-title">Factual Scoring Auditor</h3>
              <p className="feature-desc">
                A custom semantic validator matches retrieved dates, percentages, and metrics. It computes a cosine similarity scoring consensus and flags claims as High, Medium, or Low confidence depending on global source verification.
              </p>
            </div>
            
            <div className="feature-item">
              <span className="feature-meta">Engine 04 / EXPORT</span>
              <h3 className="feature-title">High-Fidelity Document Builder</h3>
              <p className="feature-desc">
                Compiles synthesized insights into clean Markdown reports, generating inline responsive SVG graphics directly in markdown reports and printing them to PDF.
              </p>
            </div>
          </section>

          {/* Integration Timeline Workflow */}
          <div className="section-header">
            <span className="section-tag">Operations Timeline</span>
            <h2 className="section-title">Step-by-Step Execution Pipeline</h2>
          </div>

          <section className="timeline-container">
            <div className="timeline-line"></div>
            
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-step-num">01</span>
                <div className="timeline-details">
                  <h4 className="timeline-step-title">Query Entry and Initialization</h4>
                  <p className="timeline-step-desc">User submits a deep research query. The agent verifies the Ollama local connection status and prepares context windows.</p>
                </div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-step-num">02</span>
                <div className="timeline-details">
                  <h4 className="timeline-step-title">Multi-Agent Decomposition</h4>
                  <p className="timeline-step-desc">The core model evaluates the query and decomposes it into specialized queries to address all aspects of the report.</p>
                </div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-step-num">03</span>
                <div className="timeline-details">
                  <h4 className="timeline-step-title">Parallel Web Scans & Extraction</h4>
                  <p className="timeline-step-desc">The scraping engine runs HTTP operations concurrently. It scrapes pages with Cheerio and feeds clean text arrays into context memory.</p>
                </div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-step-num">04</span>
                <div className="timeline-details">
                  <h4 className="timeline-step-title">Fact-checking & Source Scoring</h4>
                  <p className="timeline-step-desc">The auditor filters conflicting metrics, scores domain reliability, and inserts verified sources directly into the document builder.</p>
                </div>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-step-num">05</span>
                <div className="timeline-details">
                  <h4 className="timeline-step-title">Synthesis & PDF Report Compile</h4>
                  <p className="timeline-step-desc">Knovant structures the final Markdown documentation and compiles high-fidelity reports, printing dynamic SVGs directly into files.</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      )}

      {page === 'changelog' && (
        <section className="changelog-page-container fade-in">
          <div className="changelog-content">
            <span className="section-tag">Release History</span>
            <h1 className="changelog-title">System Changelog</h1>
            <p className="changelog-subtitle">
              Track the development updates, engine optimizations, and security patches of the Knovant AI Deep Research platform.
            </p>
            
            <div className="changelog-timeline">
              <div className="changelog-item">
                <div className="changelog-version-header">
                  <span className="changelog-version-badge">v1.0.0</span>
                  <span className="changelog-version-date">May 27, 2026</span>
                </div>
                <h3 className="changelog-release-title">Public Launch & Local Inference Orchestrator</h3>
                <ul className="changelog-release-list">
                  <li><strong>Local Ollama Orchestrator:</strong> Direct link to local inference endpoints (`http://localhost:11434`) for offline-first privacy.</li>
                  <li><strong>Parallel Crawling Engine:</strong> Concurrent HTML DOM text scraping using Cheerio with aggressive asset filtering.</li>
                  <li><strong>Factual Scoring Auditor:</strong> Cosine similarity checks across source datasets to compute consensus confidence.</li>
                  <li><strong>Markdown & Document Exporter:</strong> Real-time rendered previews with inline SVG generation and PDF compiler integrations.</li>
                  <li><strong>Google Sign-in Deep Linking:</strong> Seamless auth handoff from website callbacks back to local Electron window protocols.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {page === 'auth' && (
        <section className="auth-page-container">
          <div className="auth-form-wrapper">
            
            <div className="auth-header">
              <h2 className="auth-title">
                {authMode === 'signin' ? 'Sign in to Knovant' : 'Create an Account'}
              </h2>
              <p className="auth-subtitle">
                Access your synced deep research dashboard
              </p>
            </div>

            <div className="auth-tabs">
              <button 
                type="button" 
                className={`auth-tab ${authMode === 'signin' ? 'active' : ''}`}
                onClick={() => setAuthMode('signin')}
              >
                Sign In
              </button>
              <button 
                type="button" 
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="auth-input-group">
                <label className="auth-label">Email Address</label>
                <input 
                  type="email" 
                  className="auth-input" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" 
                  required 
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <input 
                  type="password" 
                  className="auth-input" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                />
              </div>

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', margin: '8px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-medium)' }}></div>
              <span style={{ padding: '0 10px' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-medium)' }}></div>
            </div>

            <button type="button" onClick={handleGoogleLogin} className="auth-google-btn">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 3C6.17 7.59 8.87 5.04 12 5.04z"/><path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.52z"/><path fill="#FBBC05" d="M5.24 14.56c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 6.94C.5 8.73 0 10.73 0 12.8s.5 4.07 1.39 5.86l3.85-3.1z"/><path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.52 1.18-4.3 1.18-3.13 0-5.83-2.55-6.76-5.52l-3.85 3C3.37 20.35 7.35 23 12 23z"/></svg>
              Continue with Google
            </button>
            
          </div>
        </section>
      )}

      {page === 'dashboard' && user && (
        <div className="dashboard-container fade-in">
          
          {/* User Profile Header */}
          <div className="dashboard-header">
            <div className="dashboard-avatar">
              {(user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="dashboard-user-info">
              <span className="dashboard-email">{user.email}</span>
              <span className="dashboard-uid">User ID: {user.id}</span>
            </div>
          </div>

          <div className="dashboard-split-layout">
            
            {/* Left Sidebar Tabs */}
            <div className="dashboard-tab-sidebar">
              <button 
                onClick={() => setActiveDashboardTab('overview')} 
                className={`dashboard-tab-btn ${activeDashboardTab === 'overview' ? 'active' : ''}`}
              >
                <Activity size={15} />
                <span>Overview</span>
              </button>
              <button 
                onClick={() => setActiveDashboardTab('queries')} 
                className={`dashboard-tab-btn ${activeDashboardTab === 'queries' ? 'active' : ''}`}
              >
                <Terminal size={15} />
                <span>Intelligence Runs</span>
              </button>
              <button 
                onClick={() => setActiveDashboardTab('models')} 
                className={`dashboard-tab-btn ${activeDashboardTab === 'models' ? 'active' : ''}`}
              >
                <Cpu size={15} />
                <span>Model Analytics</span>
              </button>
              <button 
                onClick={() => setActiveDashboardTab('download')} 
                className={`dashboard-tab-btn ${activeDashboardTab === 'download' ? 'active' : ''}`}
              >
                <Monitor size={15} />
                <span>Download Client</span>
              </button>

              <div className="sidebar-sync-status">
                <span className="sync-dot active"></span>
                <span className="sync-text">Realtime Synced</span>
              </div>
            </div>

            {/* Right Pane Content */}
            <div className="dashboard-content-pane">
              {activeDashboardTab === 'overview' && (
                <div className="tab-pane-content fade-in">
                  <div className="pane-header">
                    <h2 className="pane-title">Performance Overview</h2>
                    <span className="pane-subtitle">Live real-time aggregation of local deep research session telemetry</span>
                  </div>

                  {/* Clean Minimalist Stats (No card borders, pure numbers) */}
                  <div className="dashboard-stats-minimal">
                    <div className="stat-item-minimal">
                      <span className="stat-label">Deep Research Sessions</span>
                      <span className="stat-value">{metrics.stats.queryCount}</span>
                      <span className="stat-desc">Completed research sequences executed on your nodes</span>
                    </div>
                    <div className="stat-item-minimal">
                      <span className="stat-label">Estimated Tokens Ingested</span>
                      <span className="stat-value">{metrics.stats.totalTokens.toLocaleString()}</span>
                      <span className="stat-desc">Contextual tokens loaded through local LLM architectures</span>
                    </div>
                  </div>

                  {/* Ingestion Trend */}
                  <div className="chart-wrapper-minimal">
                    <h3 className="chart-title">Contextual Ingestion Volume</h3>
                    <span className="chart-subtitle">7-day volume trend of loaded token contexts</span>
                    <div className="chart-container-minimal">
                      {renderWeeklyTrendChart()}
                    </div>
                  </div>
                </div>
              )}

              {activeDashboardTab === 'queries' && (
                <div className="tab-pane-content fade-in">
                  <div className="pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 className="pane-title">Recent Intelligence Runs</h2>
                      <span className="pane-subtitle">Secure, local deep research session runs synced from desktop application</span>
                    </div>
                    <button onClick={fetchUserUsage} className="sync-btn-minimal" title="Force sync database telemetry">
                      <RefreshCw size={13} className={loading ? "spin" : ""} />
                      <span>Sync telemetry</span>
                    </button>
                  </div>

                  <div className="queries-table-container-minimal">
                    <table className="queries-table-minimal">
                      <thead>
                        <tr>
                          <th>Research Query</th>
                          <th>Model Name</th>
                          <th>Est. Tokens</th>
                          <th>Web Sources</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.recentQueries.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="table-empty-cell">
                              No research runs logged. Open the Knovant desktop client and initiate a deep research run to sync.
                            </td>
                          </tr>
                        ) : (
                          metrics.recentQueries.map((q, idx) => (
                            <tr key={idx}>
                              <td className="query-text-cell" title={q.query}>{q.query}</td>
                              <td><span className="model-badge">{q.selected_model.split(':')[0]}</span></td>
                              <td>{q.tokens_estimated.toLocaleString()}</td>
                              <td>{q.sources_count || 0} sources</td>
                              <td>{new Date(q.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDashboardTab === 'models' && (
                <div className="tab-pane-content fade-in">
                  <div className="pane-header">
                    <h2 className="pane-title">Model Utilization</h2>
                    <span className="pane-subtitle">Telemetry analytics mapping local LLM model selection and run count share</span>
                  </div>

                  <div className="chart-wrapper-minimal" style={{ maxWidth: '560px' }}>
                    <h3 className="chart-title">Model Selection Share</h3>
                    <span className="chart-subtitle">Run frequency count distribution map</span>
                    <div className="chart-container-minimal">
                      {renderModelRunsChart()}
                    </div>
                  </div>
                </div>
              )}

              {activeDashboardTab === 'download' && (
                <div className="tab-pane-content fade-in">
                  <div className="pane-header">
                    <h2 className="pane-title">Standalone Client Download</h2>
                    <span className="pane-subtitle">Download and set up the premium local-first AI deep research desktop app</span>
                  </div>

                  <div className="download-guide-container">
                    <p className="download-intro-text">
                      To run local LLMs, parse deep web sources, compile comprehensive reports, and sync stats to your profile in real-time, install the standalone desktop client.
                    </p>

                    <div className="setup-steps-list">
                      <div className="setup-step">
                        <span className="step-num">01</span>
                        <div className="step-content">
                          <span className="step-heading">Download Installer</span>
                          <span className="step-description">Click below to fetch the desktop application installer executable (`Knovant Setup 1.0.0.exe`).</span>
                        </div>
                      </div>
                      <div className="setup-step">
                        <span className="step-num">02</span>
                        <div className="step-content">
                          <span className="step-heading">Run Setup</span>
                          <span className="step-description">Launch the installer. If Windows prompts with smart-screen, select "Run anyway". The app installs cleanly under your user profile.</span>
                        </div>
                      </div>
                      <div className="setup-step">
                        <span className="step-num">03</span>
                        <div className="step-content">
                          <span className="step-heading">Authenticate & Sync</span>
                          <span className="step-description">Open the application, sign in with your email `{user.email}`, and your metrics will automatically synchronize in real-time.</span>
                        </div>
                      </div>
                    </div>

                    <div className="download-action-row">
                      <a href="/Knovant.Setup.1.0.0.exe" className="btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', borderRadius: '4px', fontSize: '13px', width: 'fit-content', fontWeight: '500' }}>
                        <Monitor size={15} />
                        <span>Download Standalone Client (.exe)</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {page === 'callback' && (
        <section className="callback-loader-container">
          <div className="callback-spinner"></div>
          <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>{callbackMsg}</span>
        </section>
      )}

      {/* Footer */}
      <footer className="site-footer">
        <span>© 2026 Knovant AI Deep Research. All rights reserved.</span>
        <span>Secure Local-First Architecture</span>
      </footer>

    </div>
  );
}
