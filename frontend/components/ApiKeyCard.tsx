// GreenAI/frontend/components/ApiKeyCard.tsx
"use client";

import * as React from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ApiKeyShape = {
  id: string;
  name: string;
  prefix?: string | null; // e.g. "gai_"
  last4?: string | null;
  created_at?: string | null;
  revoked_at?: string | null;
  scopes?: string[] | null;
  project_id?: string | null;
};

type Props = {
  item: ApiKeyShape;

  /**
   * Only pass this immediately after create, if your API returns the plaintext key once.
   * We will NEVER attempt to fetch or reveal a key from stored DB values.
   */
  plaintextKey?: string | null;

  onCopy?: (id: string) => void;
  onRevoke?: (id: string) => void;
  revoking?: boolean;

  className?: string;
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function maskKey(prefix?: string | null, last4?: string | null) {
  const p = prefix?.trim() ? prefix : "gai_";
  const l4 = last4?.trim() ? last4 : "••••";
  return `${p}••••••••••••••••••••${l4}`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(el);
    }
  }
}

export default function ApiKeyCard({
  item,
  plaintextKey,
  onCopy,
  onRevoke,
  revoking,
  className,
}: Props) {
  const isRevoked = Boolean(item.revoked_at);
  const displayKey = plaintextKey?.trim()
    ? plaintextKey.trim()
    : maskKey(item.prefix, item.last4);

  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(displayKey);
    if (ok) {
      setCopied(true);
      onCopy?.(item.id);
      window.setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/70 backdrop-blur",
        "shadow-sm",
        "p-4 md:p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {item.name}
            </h3>
            {isRevoked ? (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border/60">
                Revoked
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border/60">
                Active
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Created:{" "}
            <span className="text-foreground/80">
              {formatDate(item.created_at) || "—"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-medium",
              "ring-1 ring-border/60",
              "bg-muted/60 hover:bg-muted/80",
              "text-foreground",
              "transition",
              isRevoked && "opacity-70"
            )}
            title="Copy API key"
          >
            {copied ? "Copied" : "Copy"}
          </button>

          {onRevoke ? (
            <button
              type="button"
              onClick={() => onRevoke(item.id)}
              disabled={isRevoked || Boolean(revoking)}
              className={cn(
                "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-medium",
                "ring-1 ring-border/60",
                "bg-background hover:bg-muted/40",
                "text-foreground",
                "transition",
                (isRevoked || revoking) && "cursor-not-allowed opacity-60"
              )}
              title={isRevoked ? "Already revoked" : "Revoke API key"}
            >
              {revoking ? "Revoking..." : "Revoke"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Key
              </div>
              <div className="mt-1 truncate font-mono text-xs text-foreground/90">
                {displayKey}
              </div>
            </div>
          </div>

          {plaintextKey?.trim() ? (
            <div className="mt-2 text-[11px] text-muted-foreground">
              This key is shown only once after creation. Store it securely.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Scopes:</span>
        {(item.scopes?.length ? item.scopes : ["ingest"]).map((s) => (
          <span
            key={s}
            className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-foreground/80 ring-1 ring-border/60"
          >
            {s}
          </span>
        ))}
      </div>

      {item.project_id ? (
        <div className="mt-3 text-xs text-muted-foreground">
          Project: <span className="font-mono text-foreground/80">{item.project_id}</span>
        </div>
      ) : null}
    </div>
  );
}
