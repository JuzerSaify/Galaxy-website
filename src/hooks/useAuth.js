import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xhyocyifhugpyqvmwrne.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeW9jeWlmaHVncHlxdm13cm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDg4MDEsImV4cCI6MjA5NTM4NDgwMX0.InqCT8evlNdTvzkSh3UpJIivORyZk-Pwbh4kBYuPalQ';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function useAuth(setPage, setCallbackMsg, setShowLaunchBtn, setLaunchUrl) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  // Check initial session
  useEffect(() => {
    const isDesktopFlow = window.location.search.includes('desktop=true') || localStorage.getItem('auth_desktop_initiated') === 'true';
    if (window.location.search.includes('desktop=true')) {
      localStorage.setItem('auth_desktop_initiated', 'true');
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && session.user) {
        try {
          // Perform a quick verification check with the server to ensure the session is active
          const { data: { user: serverUser }, error } = await supabase.auth.getUser();
          if (error) {
            // If the server returns an explicit auth error (e.g. status 400, 401, 403, or session invalid message), sign out
            if (error.status === 400 || error.status === 401 || error.status === 403 || error.message?.includes('session') || error.message?.includes('invalid')) {
              console.warn('[auth] Browser session invalid on server, signing out locally.', error.message);
              await supabase.auth.signOut();
              setUser(null);
              setInitialSessionChecked(true);
              return;
            }
          }
          
          if (!serverUser) {
            console.warn('[auth] Browser session missing user on server, signing out locally.');
            await supabase.auth.signOut();
            setUser(null);
            setInitialSessionChecked(true);
            return;
          }

          setUser(serverUser);
          if (isDesktopFlow) {
            setPage('callback');
            const url = `knovant://auth-callback#access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
            setLaunchUrl(url);
            setCallbackMsg('User already authenticated on browser! Transferring secure session to Knovant Desktop...');
            setShowLaunchBtn(true);
            localStorage.removeItem('auth_desktop_initiated');
            setTimeout(() => {
              window.location.href = url;
            }, 1000);
          }
        } catch (e) {
          console.warn('[auth] Error checking session with server:', e);
        }
      }
      setInitialSessionChecked(true);
    }).catch(() => {
      setInitialSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [setPage, setCallbackMsg, setShowLaunchBtn, setLaunchUrl]);

  const signIn = async (email, password) => {
    // Check rate limit lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      throw new Error(`Too many failed attempts. Please try again in ${remaining} seconds.`);
    }

    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format. Please enter a valid email address.');
    }

    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setFailedAttempts((prev) => {
          const next = prev + 1;
          if (next >= 5) {
            setLockoutUntil(Date.now() + 60000); // 60s lockout
          }
          return next;
        });
        throw new Error('Invalid email or password.');
      }
      setFailedAttempts(0);
      setLockoutUntil(null);
      setUser(data.user);
      return data.user;
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async (email, password) => {
    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format. Please enter a valid email address.');
    }

    // Password strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new Error('Password too weak. It must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw new Error(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithGoogle = async () => {
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

    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return {
    user,
    authLoading,
    lockoutUntil,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    initialSessionChecked
  };
}
