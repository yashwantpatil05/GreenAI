"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!supabase) {
          throw new Error("OAuth is not configured");
        }
        
        // Get the session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          setMessage("Exchanging token with backend...");
          
          // Exchange Supabase token for our internal JWT
          const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";
          const response = await fetch(`${apiBase}/auth/oauth-exchange`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Failed to exchange token");
          }
          
          const data = await response.json();
          
          // Store our internal JWT token
          if (typeof window !== "undefined") {
            localStorage.setItem("greenai_token", data.access_token);
          }
          
          setStatus("success");
          setMessage("Authentication successful! Redirecting...");
          
          // Redirect to projects page after a short delay
          setTimeout(() => {
            router.push("/projects");
          }, 1500);
        } else {
          throw new Error("No session found");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setStatus("error");
        setMessage(err?.message || "Authentication failed. Please try again.");
        
        // Redirect to login after showing error
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050a09]">
      {/* Aurora background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-teal-500/15 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: "3s" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 p-8">
        <Logo size="lg" animated={true} />
        
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-8 min-w-[320px]">
          {status === "loading" && (
            <Loader2 className="h-12 w-12 text-emerald-400 animate-spin" />
          )}
          {status === "success" && (
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          )}
          {status === "error" && (
            <XCircle className="h-12 w-12 text-rose-400" />
          )}
          
          <div className="text-center">
            <h2 className={`text-xl font-semibold ${
              status === "error" ? "text-rose-400" : "text-white"
            }`}>
              {status === "loading" ? "Authenticating..." : 
               status === "success" ? "Welcome!" : "Authentication Failed"}
            </h2>
            <p className="mt-2 text-white/60 text-sm">{message}</p>
          </div>
          
          {status === "loading" && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
