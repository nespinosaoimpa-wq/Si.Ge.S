'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Instant local hydration for mobile (<5ms FCP)
    if (typeof window !== 'undefined') {
      try {
        const localUserJson = localStorage.getItem('SIGPAD_user');
        if (localUserJson) {
          const localUser = JSON.parse(localUserJson);
          setUser(localUser);
          setRole(localUser.role || localUser.user_metadata?.role || null);
          setLoading(false);
        }
      } catch (e) {}
    }

    // 2. Get initial session
    const initAuth = async () => {
      // 🛡️ TACTICAL BRIDGE: Check for temporary auth cookie from OAuth callback
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
        return null;
      };

      const tempAuth = getCookie('SIGPAD_auth_temp');
      if (tempAuth) {
        try {
          const parsed = JSON.parse(tempAuth);
          localStorage.setItem('SIGPAD_user', tempAuth);
          setUser(parsed);
          setRole(parsed.role);
          // Clear the temp cookie
          document.cookie = "SIGPAD_auth_temp=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          console.log('[Tactical Auth] OAuth session bridged to local storage.');
          setLoading(false);
          return; // Skip standard init if bridged
        } catch (e) {}
      }

      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      const localUserJson = typeof window !== 'undefined' ? localStorage.getItem('SIGPAD_user') : null;
      const localUser = localUserJson ? JSON.parse(localUserJson) : null;

      // 🛡️ HANDOVER SAFEGUARD: Prevent Guard A's stale Supabase session from bleeding into Guard B's login
      if (supabaseSession && localUser) {
        const sessionEmail = supabaseSession.user?.email?.toLowerCase().trim();
        const localEmail = localUser.email?.toLowerCase().trim();
        if (sessionEmail && localEmail && sessionEmail !== localEmail) {
          console.warn('[AuthProvider] Handover identity mismatch detected! Clearing stale session:', sessionEmail);
          await supabase.auth.signOut().catch(() => {});
          setUser(localUser);
          setRole(localUser.role || localUser.user_metadata?.role || null);
          setLoading(false);
          return;
        }
      }
      
      if (supabaseSession) {
        setSession(supabaseSession);
        setUser(supabaseSession.user);
        
        const { data: profile } = await supabase
          .from('users')
          .select('role, tenant_id')
          .eq('id', supabaseSession.user.id)
          .maybeSingle();
        
        const finalRole = profile?.role || (supabaseSession.user.user_metadata?.role as string) || null;
        setRole(finalRole);

        const userData = {
          id: supabaseSession.user.id,
          email: supabaseSession.user.email,
          role: finalRole,
          tenant_id: profile?.tenant_id || supabaseSession.user.user_metadata?.tenant_id || null,
          user_metadata: {
            ...supabaseSession.user.user_metadata,
            role: finalRole
          }
        };
        localStorage.setItem('SIGPAD_user', JSON.stringify(userData));
        document.cookie = `SIGPAD_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=2592000`;
        document.cookie = "SIGPAD_bypass_active=true; path=/; max-age=2592000";
      } else if (localUser) {
        setUser(localUser);
        setRole(localUser.role || localUser.user_metadata?.role || null);
        document.cookie = `SIGPAD_user=${encodeURIComponent(JSON.stringify(localUser))}; path=/; max-age=2592000`;
        document.cookie = "SIGPAD_bypass_active=true; path=/; max-age=2592000";
      }
      
      setLoading(false);
    };

    initAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, tenant_id')
          .eq('id', session.user.id)
          .single();
        
        const finalRole = profile?.role || (session.user.user_metadata?.role as string) || null;
        setRole(finalRole);

        const userData = {
          id: session.user.id,
          email: session.user.email,
          role: finalRole,
          tenant_id: profile?.tenant_id || session.user.user_metadata?.tenant_id || null,
          user_metadata: {
            ...session.user.user_metadata,
            role: finalRole
          }
        };
        localStorage.setItem('SIGPAD_user', JSON.stringify(userData));
        document.cookie = `SIGPAD_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=2592000`;
        document.cookie = "SIGPAD_bypass_active=true; path=/; max-age=2592000";
      } else {
        // Fallback for tactical sessions during state changes
        const localUserJson = localStorage.getItem('SIGPAD_user');
        if (localUserJson) {
           const localUser = JSON.parse(localUserJson);
           setUser(localUser);
           setRole(localUser.role || localUser.user_metadata?.role || null);
           document.cookie = `SIGPAD_user=${encodeURIComponent(JSON.stringify(localUser))}; path=/; max-age=2592000`;
           document.cookie = "SIGPAD_bypass_active=true; path=/; max-age=2592000";
        } else {
           setRole(null);
        }
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('SIGPAD_user'); 
    // Clear cookies
    document.cookie = "SIGPAD_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "SIGPAD_bypass_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = '/login';
  };

  // Memoizar el valor del contexto para evitar re-renders innecesarios en todos los
  // consumidores de useAuth(). Sin esto, cada actualización de loading causa re-renders globales.
  const contextValue = useMemo(() => ({
    user, session, loading, role, signOut
  }), [user, session, loading, role]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
