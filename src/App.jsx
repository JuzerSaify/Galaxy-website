import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Monitor } from 'lucide-react';
import { supabase, useAuth } from './hooks/useAuth';
import { useMetrics } from './hooks/useMetrics';
import Header from './components/Header';
import './App.css';

// Lazy-loaded page components for maximum bundle optimization and fast load times
const LandingPage = lazy(() => import('./components/LandingPage'));
const Changelog = lazy(() => import('./components/Changelog'));
const AuthForm = lazy(() => import('./components/AuthForm'));
const Dashboard = lazy(() => import('./components/Dashboard'));

export default function App() {
  // Catch the desktop parameter immediately before any router or mount action strips it
  if (typeof window !== 'undefined' && window.location.search.includes('desktop=true')) {
    localStorage.setItem('auth_desktop_initiated', 'true');
  }

  const [page, setPage] = useState('landing'); // 'landing' | 'auth' | 'dashboard' | 'callback' | 'changelog'
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [callbackMsg, setCallbackMsg] = useState('Verifying authentication...');
  const [showLaunchBtn, setShowLaunchBtn] = useState(false);
  const [launchUrl, setLaunchUrl] = useState('');
  
  // Real-time states
  const [totalTokens, setTotalTokens] = useState(0);
  const [animatedTokens, setAnimatedTokens] = useState(0);
  
  // Dashboard metrics tab selection state
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview');

  const autoRedirectAttempted = useRef(false);

  // Instantiate custom authentication hook
  const {
    user,
    authLoading,
    lockoutUntil,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    initialSessionChecked
  } = useAuth(setPage, setCallbackMsg, setShowLaunchBtn, setLaunchUrl);

  // Instantiate custom metrics data loading hook
  const {
    loading: dbLoading,
    metrics,
    refresh: fetchUserUsage
  } = useMetrics(user, page);

  // Auto-trigger Google OAuth for desktop app flow
  useEffect(() => {
    const isDesktop = window.location.search.includes('desktop=true') || localStorage.getItem('auth_desktop_initiated') === 'true';
    if (isDesktop && initialSessionChecked && !user && !autoRedirectAttempted.current) {
      autoRedirectAttempted.current = true;
      setPage('callback');
      setCallbackMsg('Redirecting to Google for authentication...');
      signInWithGoogle().catch((e) => {
        console.error('[desktop-oauth] Auto-trigger failed:', e.message);
        setPage('auth');
      });
    }
  }, [user, initialSessionChecked]);

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

    // 2. Only subscribe to real-time updates on model_usage if the user is authenticated (Phase 3 Guard)
    if (!user) return;

    const channel = supabase
      .channel('public:model_usage')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'model_usage' }, (payload) => {
        console.log('[realtime] New usage logged:', payload.new);
        const addedTokens = Number(payload.new.tokens_estimated || 0);
        setTotalTokens((prev) => prev + addedTokens);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Handle OAuth callbacks and desktop redirect bridging
  useEffect(() => {
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
          const url = `knovant://auth-callback#access_token=${accessToken}&refresh_token=${refreshToken}`;
          setLaunchUrl(url);
          setCallbackMsg('Authentication successful! Transferring secure session to Knovant Desktop...');
          localStorage.removeItem('auth_desktop_initiated');
          setShowLaunchBtn(true);
          setTimeout(() => {
            window.location.href = url;
          }, 1000);
        } else {
          setCallbackMsg('Signing in to website profile dashboard...');
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          }).then(({ data, error }) => {
            if (error) {
              setCallbackMsg(`Sign-in failed: ${error.message}`);
            } else {
              setPage('dashboard');
              window.location.hash = ''; // clear hash
            }
          });
        }
      }
    }
  }, [page, user]);

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
    const pathName = page === 'landing' ? '/' : `/${page}`;
    const search = window.location.search;
    const hash = window.location.hash;
    window.history.replaceState({ page }, '', `${pathName}${search}${hash}`);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const pathName = page === 'landing' ? '/' : `/${page}`;
    if (window.location.pathname !== pathName) {
      const search = window.location.search;
      const hash = window.location.hash;
      window.history.pushState({ page }, '', `${pathName}${search}${hash}`);
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

  const handleSignIn = async (email, password) => {
    try {
      await signIn(email, password);
      setPage('dashboard');
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSignUp = async (email, password) => {
    try {
      await signUp(email, password);
      alert('Verification link sent! Please check your email inbox to activate your account.');
      setAuthMode('signin');
    } catch (e) {
      alert(e.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      alert('Google OAuth Error: ' + e.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setPage('landing');
  };

  const renderFallback = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-tertiary)', fontSize: '13px', gap: '8px' }}>
      <div className="status-spinner" style={{ width: '14px', height: '14px', border: '1.5px solid var(--border-medium)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <span>Loading assets...</span>
    </div>
  );

  return (
    <div className="website-container">
      
      {/* Site Header */}
      <Header
        page={page}
        setPage={setPage}
        user={user}
        animatedTokens={animatedTokens}
        onSignOut={handleSignOut}
      />

      {/* Main Page Routing with Suspense Boundaries */}
      <main style={{ flex: 1 }}>
        <Suspense fallback={renderFallback()}>
          {page === 'landing' && (
            <LandingPage setPage={setPage} user={user} />
          )}

          {page === 'changelog' && (
            <Changelog />
          )}

          {page === 'auth' && (
            <AuthForm
              authMode={authMode}
              setAuthMode={setAuthMode}
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
              onGoogleLogin={handleGoogleLogin}
              loading={authLoading}
              lockoutUntil={lockoutUntil}
            />
          )}

          {page === 'dashboard' && user && (
            <Dashboard
              user={user}
              loading={dbLoading}
              activeDashboardTab={activeDashboardTab}
              setActiveDashboardTab={setActiveDashboardTab}
              metrics={metrics}
              fetchUserUsage={fetchUserUsage}
            />
          )}

          {page === 'callback' && (
            <section className="callback-loader-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px 20px', textAlign: 'center' }}>
              {!showLaunchBtn && <div className="callback-spinner"></div>}
              <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)', maxWidth: '480px', lineHeight: '1.6' }}>{callbackMsg}</span>
              
              {showLaunchBtn && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', marginTop: '10px' }} className="fade-in">
                  <a 
                    href={launchUrl}
                    className="btn-primary" 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      alignItems: 'center', 
                      padding: '12px 28px', 
                      borderRadius: '4px', 
                      fontSize: '14.5px', 
                      fontWeight: '600', 
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(56, 189, 248, 0.2)'
                    }}
                  >
                    <Monitor size={16} />
                    <span>Launch Knovant Desktop</span>
                  </a>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-tertiary)', maxWidth: '320px' }}>
                    If the application didn't open automatically, click the button above to launch.
                  </span>
                </div>
              )}
            </section>
          )}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <span>© 2026 Knovant AI Deep Research. All rights reserved.</span>
        <span>Secure Local-First Architecture</span>
      </footer>

    </div>
  );
}
