"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Leaf, Zap, BarChart3 } from "lucide-react";
import { FormEvent, useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import { Logo } from "../../components/Logo";

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
    <div className="relative flex min-h-screen overflow-hidden bg-[#050a09]">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative">
        {/* Animated Aurora Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[128px] animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: "5s" }} />
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        
        <div className="relative z-10">
          <Logo size="lg" animated={true} />
        </div>
        
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Reduce your AI
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                carbon footprint
              </span>
            </h2>
            <p className="mt-4 text-lg text-white/60 max-w-md">
              Track, analyze, and optimize the environmental impact of your machine learning workloads.
            </p>
          </div>
          
          {/* Feature highlights */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                <Leaf className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="font-medium text-white">Carbon Tracking</div>
                <div className="text-sm text-white/50">Real-time emissions monitoring</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20">
                <Zap className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <div className="font-medium text-white">Energy Optimization</div>
                <div className="text-sm text-white/50">AI-powered efficiency suggestions</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <div className="font-medium text-white">ESG Reports</div>
                <div className="text-sm text-white/50">Compliance-ready documentation</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-white/40">
          © 2026 GreenAI. All rights reserved.
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-[#0a1210] to-[#050a09]">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <Logo size="lg" animated={true} />
          </div>
          
          {/* Progress bar */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ${
                loading ? "w-full animate-pulse" : success ? "w-full" : "w-0"
              }`}
            />
          </div>
          
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-white">Welcome back</h1>
            <p className="mt-2 text-white/50">Sign in to continue to your workspace</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                data-testid="login-email-input"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-500/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/70" htmlFor="password">
                  Password
                </label>
                <Link href="#" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                data-testid="login-password-input"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 translate-y-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-transform duration-300 group-hover:translate-y-0" />
              <span className="relative flex items-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {success && <CheckCircle2 className="h-4 w-4" />}
                {loading ? "Signing in..." : success ? "Success!" : "Sign in"}
              </span>
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a1210] px-4 text-white/40">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          <p className="text-center text-sm text-white/50">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
