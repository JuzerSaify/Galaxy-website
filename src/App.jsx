import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowDownToLine, LogIn, LogOut, User, CheckCircle2, ShieldAlert, Monitor, Terminal } from 'lucide-react';
import './App.css';

// Initialize Supabase Client
const SUPABASE_URL = 'https://xhyocyifhugpyqvmwrne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeW9jeWlmaHVncHlxdm13cm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDg4MDEsImV4cCI6MjA5NTM4NDgwMX0.InqCT8evlNdTvzkSh3UpJIivORyZk-Pwbh4kBYuPalQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [page, setPage] = useState('landing'); // 'landing' | 'auth' | 'dashboard' | 'callback'
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ queryCount: 0, totalTokens: 0 });
  const [callbackMsg, setCallbackMsg] = useState('Verifying authentication...');
  
  // App Mockup Animation State
  const [mockupPhase, setMockupPhase] = useState('idle'); // 'idle' | 'searching' | 'scraped' | 'synthesizing' | 'done'
  const [mockupSearch, setMockupSearch] = useState('Market share of electric vehicles in Europe in 2025');

  // Handle URL deep linking and OAuth Callbacks
  useEffect(() => {
    // 1. Check if the URL has OAuth hash fragments
    const hash = window.location.hash;
    const isDesktop = window.location.search.includes('desktop=true') || localStorage.getItem('auth_desktop_initiated') === 'true';

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
          setCallbackMsg('Authentication successful! Launching Galaxy Desktop Application...');
          localStorage.removeItem('auth_desktop_initiated');
          // Trigger custom protocol redirect back to Electron app
          setTimeout(() => {
            window.location.href = `galaxy://auth-callback#access_token=${accessToken}&refresh_token=${refreshToken}`;
          }, 1500);
        } else {
          // Normal web login
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
      // 2. Normal check for active web session
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUser(user);
          setPage('dashboard');
        }
      });
    }
  }, []);

  // Fetch usage stats when user is authenticated on dashboard
  useEffect(() => {
    if (user && page === 'dashboard') {
      fetchUserStats();
    }
  }, [user, page]);

  const fetchUserStats = async () => {
    try {
      // Get query count
      const { count, error: countErr } = await supabase
        .from('model_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get sum of tokens
      const { data, error: sumErr } = await supabase
        .from('model_usage')
        .select('tokens_estimated')
        .eq('user_id', user.id);

      if (countErr || sumErr) throw countErr || sumErr;

      const totalTokens = data.reduce((acc, row) => acc + (row.tokens_estimated || 0), 0);
      setStats({
        queryCount: count || 0,
        totalTokens: totalTokens
      });
    } catch (e) {
      console.warn('Failed to load profile database stats:', e.message);
    }
  };

  // Mockup Interactive Loop
  useEffect(() => {
    if (page !== 'landing') return;
    
    // Auto loop mockup steps to make it look active and premium
    const timer1 = setTimeout(() => setMockupPhase('searching'), 2000);
    const timer2 = setTimeout(() => setMockupPhase('scraped'), 4500);
    const timer3 = setTimeout(() => setMockupPhase('synthesizing'), 7000);
    const timer4 = setTimeout(() => setMockupPhase('done'), 10000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [page]);

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
    // If the login was initiated from the landing or auth page to continue on web, isDesktop is false.
    // However, if we need it for desktop deep linking we can support the param.
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

  return (
    <div className="website-container">
      
      {/* Site Header */}
      <header className="site-header">
        <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => setPage('landing')}>
          <div className="logo-dot"></div>
          <span className="logo-text">Galaxy</span>
        </div>
        
        <nav className="nav-links">
          <a href="https://github.com/JuzerSaify/galaxy" target="_blank" rel="noreferrer" className="nav-link">GitHub Release</a>
          {user ? (
            <>
              <button onClick={() => setPage('dashboard')} className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            <div className="hero-gradient"></div>
            <div className="hero-tagline">Elite Intelligence Assistant</div>
            <h1 className="hero-title">Local-First Deep Web Research</h1>
            <p className="hero-subtitle">
              Galaxy is an elite desktop intelligence agent. Orchestrate target searches, scrape pages concurrently, cross-reference source reliability, and compile high-fidelity reports locally on your machine.
            </p>
            
            <div className="hero-actions">
              <a href="https://github.com/JuzerSaify/galaxy/releases/download/v3.0.0/Galaxy.Setup.3.0.0.exe" className="btn-primary">
                <ArrowDownToLine size={18} />
                Download for Windows (v3.0.0)
              </a>
              <button onClick={() => { setAuthMode('signup'); setPage('auth'); }} className="btn-secondary">
                Create Account
              </button>
            </div>
          </section>

          {/* Interactive CSS Mockup */}
          <section className="mockup-section">
            <div className="mockup-window">
              <div className="mockup-titlebar">
                <div className="mockup-dots">
                  <div className="mockup-dot"></div>
                  <div className="mockup-dot"></div>
                  <div className="mockup-dot"></div>
                </div>
                <div className="mockup-title">Galaxy Deep Research Workspace</div>
                <div style={{ width: '40px' }}></div>
              </div>
              
              <div className="mockup-content">
                
                {/* Left Simulated Chat Panel */}
                <div className="mockup-chat-panel">
                  <div className="mockup-panel-header">
                    <span>Research Chat</span>
                    <Terminal size={14} style={{ opacity: 0.5 }} />
                  </div>
                  
                  <div className="mockup-chat-history">
                    <div className="mockup-msg user">
                      <div className="mockup-msg-bubble">
                        {mockupSearch}
                      </div>
                    </div>

                    {mockupPhase !== 'idle' && (
                      <div className="mockup-msg assistant">
                        <div className="mockup-msg-bubble">
                          {mockupPhase === 'searching' && "Phase 1: Decomposing query and launching Google search scans..."}
                          {mockupPhase === 'scraped' && "Phase 2: Scraping and cleaning 8 target sources concurrently..."}
                          {mockupPhase === 'synthesizing' && "Phase 3: Factual scoring complete. Compiling intelligence report..."}
                          {mockupPhase === 'done' && "Phase 4: Synthesis complete. Final report loaded in preview pane."}
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

                {/* Right Simulated Report Panel */}
                <div className="mockup-report-panel">
                  <div className="mockup-panel-header" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <span>Research Preview (Live Markdown Rendering)</span>
                  </div>
                  
                  <div className="mockup-report-body">
                    <h1 className="mockup-h1">Deep Research Report: EV Market</h1>
                    <p className="mockup-p">
                      Factual agreement detection audit complete. Below is the cross-referenced market analysis of EU electric vehicle penetration rates for 2025:
                    </p>
                    
                    <h2 className="mockup-h2">EU EV Adoption Rates</h2>
                    <p className="mockup-p">
                      Current data indicators suggest a stabilized growth trajectory, driven by municipal emissions standards and local incentives.
                    </p>

                    <div className="mockup-chart-box">
                      <span className="mockup-chart-title">Market Penetration Percentage by Region</span>
                      <div className="mockup-chart-bars">
                        <div className="mockup-chart-bar" data-value="28%" style={{ height: mockupPhase === 'done' ? '70px' : '0px' }}></div>
                        <div className="mockup-chart-bar" data-value="19%" style={{ height: mockupPhase === 'done' ? '48px' : '0px', backgroundColor: '#555' }}></div>
                        <div className="mockup-chart-bar" data-value="12%" style={{ height: mockupPhase === 'done' ? '30px' : '0px', backgroundColor: '#888' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

        </div>
      )}

      {page === 'auth' && (
        <section className="auth-page-container">
          <div className="auth-form-wrapper">
            
            <div className="auth-header">
              <h2 className="auth-title">
                {authMode === 'signin' ? 'Sign in to Galaxy' : 'Create an Account'}
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

            <div style={{ display: 'flex', alignItems: 'center', textalign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', margin: '8px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></div>
              <span style={{ padding: '0 10px' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }}></div>
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
          
          <div className="dashboard-header">
            <div className="dashboard-avatar">
              {(user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="dashboard-user-info">
              <span className="dashboard-email">{user.email}</span>
              <span className="dashboard-uid">User ID: {user.id}</span>
            </div>
          </div>

          <div className="dashboard-stats">
            <div className="dashboard-stat-card">
              <span className="stat-label">Deep Research Sessions</span>
              <span className="stat-value">{stats.queryCount}</span>
              <span className="stat-desc">Total completed runs logged securely to database</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="stat-label">Estimated Tokens Processed</span>
              <span className="stat-value">{stats.totalTokens.toLocaleString()}</span>
              <span className="stat-desc">Active contextual load processed on Ollama engine</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Get the Desktop Client</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Ready to execute research agents? Download the standalone application and authenticate with your user credentials to sync history.
            </p>
            <div>
              <a href="https://github.com/JuzerSaify/galaxy/releases/download/v3.0.0/Galaxy.Setup.3.0.0.exe" className="btn-primary" style={{ width: 'fit-content' }}>
                <Monitor size={18} />
                Download Standalone Client (.exe)
              </a>
            </div>
          </div>

        </div>
      )}

      {page === 'callback' && (
        <section className="callback-loader-container">
          <div className="callback-spinner"></div>
          <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{callbackMsg}</span>
        </section>
      )}

      {/* Footer */}
      <footer className="site-footer">
        <span>© 2026 Galaxy AI Deep Research. All rights reserved.</span>
        <span>Secure Local-First Architecture</span>
      </footer>

    </div>
  );
}
