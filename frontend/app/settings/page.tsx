// GreenAI/frontend/app/settings/page.tsx
"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

import SectionHeader from "../../components/SectionHeader";
import StatCard from "../../components/StatCard";
import EmptyState from "../../components/EmptyState";

type Org = {
  id: string;
  name: string;
  region_preference?: string | null;
  created_at?: string;
  updated_at?: string;
};

function decodeJwtPayload(token?: string | null): Record<string, any> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const REGIONS = [
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { token, logout } = useAuth();

  const jwt = React.useMemo(() => decodeJwtPayload(token), [token]);
  const userEmail = (jwt?.email as string | undefined) ?? "";
  const userRole = (jwt?.role as string | undefined) ?? "";
  const orgId = (jwt?.org as string | undefined) ?? "";

  const orgQ = useQuery({
    queryKey: ["org-me"],
    queryFn: () => apiFetch<Org>("/organization/me", {}, { token: token || undefined }),
    enabled: !!token,
  });

  const [form, setForm] = React.useState<{ name: string; region_preference: string }>({
    name: "",
    region_preference: "ap-south-1",
  });

  React.useEffect(() => {
    if (!orgQ.data) return;
    setForm({
      name: orgQ.data.name ?? "",
      region_preference: (orgQ.data.region_preference || "ap-south-1") as string,
    });
  }, [orgQ.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        region_preference: form.region_preference || null,
      };
      return apiFetch<Org>(
        "/organization/me",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
        },
        { token: token || undefined }
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["org-me"] });
    },
  });

  const saving = saveM.isPending;
  const disabled = saving || !form.name.trim();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        subtitle="Manage your organization preferences and account details."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          title="Account"
          value={userEmail || "-"}
          subtitle={userRole ? `Role: ${userRole}` : " "}
        />
        <StatCard title="Organization ID" value={orgId || "-"} subtitle="Tenant scope" />
        <StatCard
          title="Environment"
          value={process.env.NODE_ENV === "production" ? "Production" : "Development"}
          subtitle="Current runtime"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Organization
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Update your org name and default region.
              </p>
            </div>

            <button
              type="button"
              onClick={() => orgQ.refetch()}
              className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
              disabled={orgQ.isFetching}
            >
              {orgQ.isFetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {orgQ.isLoading ? (
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : orgQ.isError ? (
            <EmptyState
              title="Couldn't load organization"
              description="Please try refresh. If it persists, check your token/session."
              actions={[{ label: "Retry", onClick: () => orgQ.refetch() }]}
            />
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!disabled) saveM.mutate();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Organization name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Your organization"
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-0 focus:border-border focus:outline-none"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  This appears across dashboards and reports.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Default region
                </label>
                <select
                  value={form.region_preference}
                  onChange={(e) => setForm((p) => ({ ...p, region_preference: e.target.value }))}
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-0 focus:border-border focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Used as a fallback for emissions factors and reporting.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={disabled}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!orgQ.data) return;
                    setForm({
                      name: orgQ.data.name ?? "",
                      region_preference: (orgQ.data.region_preference || "ap-south-1") as string,
                    });
                  }}
                  className="rounded-xl border border-border/60 bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent"
                >
                  Reset
                </button>

                {saveM.isError ? (
                  <span className="text-sm text-destructive">
                    Failed to save. Try again.
                  </span>
                ) : saveM.isSuccess ? (
                  <span className="text-sm text-emerald-500">
                    Saved.
                  </span>
                ) : null}
              </div>
            </form>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">
            Security
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your session and access.
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="text-sm font-semibold text-foreground">
                Session
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {userEmail || "Signed in"}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl border border-border/60 bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-accent"
                >
                  Sign out
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="text-sm font-semibold text-foreground">
                API keys
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Create project keys from the API Keys page and use them in SDK/CLI ingestion.
              </p>
              <a
                href="/api-keys"
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              >
                Go to API Keys
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
