"use client";

import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { Logo } from "../../components/Logo";
import { apiFetch } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050a09] p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo size="lg" animated={true} />
        </div>

        {sent ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">Check your email</h1>
            <p className="text-white/60">
              If <span className="text-white font-medium">{email}</span> has an account, you'll receive a password reset link shortly.
            </p>
            <p className="text-sm text-white/40">
              Didn't get it? Check your spam folder or{" "}
              <button
                onClick={() => { setSent(false); }}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Reset your password</h1>
              <p className="mt-2 text-white/50">
                Enter your email and we'll send you a reset link.
              </p>
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
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-500/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
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
                className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 translate-y-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-transform duration-300 group-hover:translate-y-0" />
                <span className="relative flex items-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Sending..." : "Send reset link"}
                </span>
              </button>
            </form>

            <p className="text-center text-sm text-white/50">
              <Link href="/login" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
