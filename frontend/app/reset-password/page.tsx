"use client";

import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../../components/Logo";
import { setSessionFromUrl, updatePassword } from "../../lib/supabase";

type PageState = "loading" | "form" | "success" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase sends the recovery token in the URL hash:
    // /reset-password#access_token=xxx&refresh_token=yyy&type=recovery
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken || type !== "recovery") {
      setPageState("invalid");
      return;
    }

    setSessionFromUrl(accessToken, refreshToken)
      .then(() => setPageState("form"))
      .catch(() => setPageState("invalid"));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setPageState("success");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update password. The link may have expired.");
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

        {pageState === "loading" && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        )}

        {pageState === "invalid" && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
            <h1 className="text-2xl font-bold text-white">Link expired or invalid</h1>
            <p className="text-white/60">
              This reset link is no longer valid. Password reset links expire after 1 hour.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            >
              Request a new link
            </Link>
          </div>
        )}

        {pageState === "success" && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">Password updated</h1>
            <p className="text-white/60">
              Your password has been changed successfully. Redirecting you to sign in...
            </p>
          </div>
        )}

        {pageState === "form" && (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Set new password</h1>
              <p className="mt-2 text-white/50">Choose a strong password for your account.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-500/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70" htmlFor="confirm">
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-500/20"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
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
                  {loading ? "Updating..." : "Update password"}
                </span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
