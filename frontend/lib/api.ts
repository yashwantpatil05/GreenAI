// GreenAI/frontend/lib/api.ts
export type FetcherOptions = {
  token?: string;
  apiKey?: string; // for SDK-style endpoints if you ever call them from UI
  baseUrl?: string; // optional override (defaults to NEXT_PUBLIC_API_BASE or localhost)
};

export class APIError extends Error {
  status: number;
  detail?: any;

  constructor(status: number, message: string, detail?: any) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.detail = detail;
  }
}

function getBaseUrl(override?: string) {
  const base = (override || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api").replace(/\/$/, "");
  return base;
}

async function parseResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
  options: FetcherOptions = {}
): Promise<T> {
  const url = `${getBaseUrl(options.baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(opts.headers || {});
  // Only set content-type if caller didn't set it and we're sending a body
  if (!headers.has("Content-Type") && opts.body != null) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.apiKey) headers.set("X-API-Key", options.apiKey);

  const res = await fetch(url, {
    ...opts,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = await parseResponse(res);
    const message =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
      (typeof payload === "string" && payload) ||
      `API error ${res.status}`;
    throw new APIError(res.status, String(message), payload);
  }

  return (await parseResponse(res)) as T;
}

export async function authLogin(email: string, password: string): Promise<string> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });

  if (!res.ok) {
    const payload = await parseResponse(res);
    const message =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) ||
      "Invalid credentials";
    throw new APIError(res.status, String(message), payload);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function authSignup(email: string, password: string, organization_name: string): Promise<void> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, organization_name }),
  });

  if (!res.ok) {
    const payload = await parseResponse(res);
    const message =
      (payload && typeof payload === "object" && (payload.detail || payload.message)) || "Signup failed";
    throw new APIError(res.status, String(message), payload);
  }
}
