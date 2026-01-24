// GreenAI/frontend/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not configured. OAuth features will be disabled.");
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error("OAuth is not configured. Please use email/password login.");
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
    },
  });
  
  if (error) throw error;
  return data;
}

export async function signInWithGithub() {
  if (!supabase) {
    throw new Error("OAuth is not configured. Please use email/password login.");
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
    },
  });
  
  if (error) throw error;
  return data;
}

export async function getSession() {
  if (!supabase) return null;
  
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function signOut() {
  if (!supabase) return;
  
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
