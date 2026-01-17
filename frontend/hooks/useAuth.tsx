"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authLogin, authSignup } from "../lib/api";

type AuthContextType = {
  token: string | null;
  setToken: (t: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, org: string) => Promise<void>;
  logout: () => void;
  ready: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("greenai_token") : null;
    if (stored) {
      setTokenState(stored);
    }
    setReady(true);
  }, []);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (typeof window !== "undefined") {
      if (t) localStorage.setItem("greenai_token", t);
      else localStorage.removeItem("greenai_token");
    }
  };

  const login = async (email: string, password: string) => {
    const tok = await authLogin(email, password);
    setToken(tok);
    router.push("/projects");
  };

  const signup = async (email: string, password: string, org: string) => {
    await authSignup(email, password, org);
    await login(email, password);
  };

  const logout = () => {
    setToken(null);
    router.push("/login");
  };

  const value = useMemo(() => ({ token, setToken, login, signup, logout, ready }), [token, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
