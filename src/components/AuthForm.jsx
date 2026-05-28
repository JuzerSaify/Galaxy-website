import React, { useState, useEffect } from 'react';

export default function AuthForm({ authMode, setAuthMode, onSignIn, onSignUp, onGoogleLogin, loading, lockoutUntil }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutTimeLeft(0);
      return;
    }
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutTimeLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0) return;

    if (authMode === 'signin') {
      onSignIn(email, password);
    } else {
      onSignUp(email, password);
    }
  };

  return (
    <section className="auth-page-container fade-in">
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
            disabled={loading}
          >
            Sign In
          </button>
          <button 
            type="button" 
            className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => setAuthMode('signup')}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {lockoutTimeLeft > 0 && (
            <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 12px', borderRadius: '4px', fontSize: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
              Too many failed attempts. Locked out for {lockoutTimeLeft} seconds.
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input 
              type="email" 
              className="auth-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" 
              required 
              disabled={loading || lockoutTimeLeft > 0}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input 
              type="password" 
              className="auth-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authMode === 'signin' ? '••••••••' : 'Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special'} 
              required 
              disabled={loading || lockoutTimeLeft > 0}
            />
          </div>

          <button type="submit" disabled={loading || lockoutTimeLeft > 0} className="auth-submit-btn">
            {loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', margin: '8px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-medium)' }}></div>
          <span style={{ padding: '0 10px' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-medium)' }}></div>
        </div>

        <button type="button" onClick={onGoogleLogin} disabled={loading} className="auth-google-btn">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 3C6.17 7.59 8.87 5.04 12 5.04z"/><path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.52z"/><path fill="#FBBC05" d="M5.24 14.56c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 6.94C.5 8.73 0 10.73 0 12.8s.5 4.07 1.39 5.86l3.85-3.1z"/><path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.52 1.18-4.3 1.18-3.13 0-5.83-2.55-6.76-5.52l-3.85 3C3.37 20.35 7.35 23 12 23z"/></svg>
          Continue with Google
        </button>
        
      </div>
    </section>
  );
}
