import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabaseClient } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session ? data.session.user : null);
      setReady(true);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session ? session.user : null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback((email, password) =>
    supabaseClient.auth.signInWithPassword({ email, password }), []);
  const signUp = useCallback((email, password) =>
    supabaseClient.auth.signUp({ email, password }), []);
  const signOut = useCallback(() => supabaseClient.auth.signOut(), []);

  const value = { user, ready, isSignedIn: !!user, signIn, signUp, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
