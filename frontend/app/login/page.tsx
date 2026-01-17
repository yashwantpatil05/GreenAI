"use client";

import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1b19] via-[#0c1f1d] to-[#0c1513] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.16),transparent_32%)]" />

      <div className="relative z-10 w-full max-w-lg space-y-8 rounded-3xl border border-white/10 bg-[#0f1716]/80 p-10 shadow-2xl backdrop-blur-xl">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500 ${
              loading ? "w-full animate-pulse" : success ? "w-full" : "w-0"
            }`}
          />
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-lg font-bold shadow-lg shadow-emerald-900/30">
            GA
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-white/70">Sign in to your GreenAI workspace</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/40 transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-emerald-400/50 disabled:opacity-60"
          >
            <span className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />
            <span className="relative flex items-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {success ? <CheckCircle2 className="h-4 w-4 text-emerald-900" /> : null}
              {loading ? "Signing in..." : success ? "Authenticated" : "Continue"}
            </span>
          </button>
        </form>

        <div className="text-center text-sm text-white/70">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-emerald-300 hover:text-emerald-200">
            Create one
          </Link>
        </div>

        <p className="text-center text-[11px] text-white/50">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
