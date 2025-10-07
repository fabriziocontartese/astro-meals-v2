// src/auth/providers/useProvider.jsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { AuthContext } from "../contexts/auth-context";

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
      });
      setReady(true);
      return () => sub.subscription.unsubscribe();
    })();
    return () => { mounted = false; };
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (error) throw error;
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const value = useMemo(
    () => ({ user: session?.user ?? null, ready, signInWithGoogle, logout }),
    [session, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
