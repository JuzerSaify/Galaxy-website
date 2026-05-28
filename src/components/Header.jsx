import React from 'react';
import { LogIn, LogOut, User } from 'lucide-react';

export default function Header({ page, setPage, user, animatedTokens, onSignOut }) {
  return (
    <header className="site-header">
      <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => setPage('landing')}>
        <img src="/knovant-logo-transparent.svg" alt="Knovant logo" className="logo-icon" />
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
            <button onClick={onSignOut} className="nav-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </>
        ) : (
          <button onClick={() => setPage('auth')} className="nav-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogIn size={14} /> Sign In
          </button>
        )}
      </nav>
    </header>
  );
}
