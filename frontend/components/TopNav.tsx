// GreenAI/frontend/components/TopNav.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, Command, LogOut, Search, User } from "lucide-react";

import { cn } from "../lib/utils";
import { ThemeToggle } from "./ThemeToggle";

type Breadcrumb = { label: string; href?: string };

type TopNavProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
};

function titleCase(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildCrumbs(pathname?: string | null): Breadcrumb[] {
  const base: Breadcrumb[] = [{ label: "Home", href: "/" }];

  if (!pathname || pathname === "/") {
    base[0].href = undefined; // avoid redundant link when already on home
    return base;
  }

  const segs = pathname.split("/").filter(Boolean);
  let acc = "";
  for (const seg of segs) {
    acc += `/${seg}`;
    base.push({ label: titleCase(seg), href: acc });
  }

  const last = base[base.length - 1];
  if (last) last.href = undefined; // last crumb not clickable
  return base;
}

function initials(email?: string | null) {
  if (!email) return "U";
  const name = email.split("@")[0] || email;
  const parts = name.split(/[.\s_-]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export function TopNav({ collapsed, onToggleSidebar, onOpenMobileSidebar }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [profileOpen, setProfileOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);

  const profileRef = React.useRef<HTMLDivElement | null>(null);

  const crumbs = React.useMemo(() => buildCrumbs(pathname), [pathname]);
  const pageTitle =
    crumbs.length > 0 ? crumbs[crumbs.length - 1]?.label ?? "Dashboard" : "Dashboard";

  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [orgName, setOrgName] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setUserEmail(localStorage.getItem("gai.user_email"));
      setOrgName(localStorage.getItem("gai.org_name"));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K");
      if (isCmdK) {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") {
        setProfileOpen(false);
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("gai.access_token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("gai.user_email");
      localStorage.removeItem("gai.org_name");
    } catch {
      // ignore
    }
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/50 bg-background/55 backdrop-blur supports-[backdrop-filter]:bg-background/45">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-3 px-4 md:h-16 md:px-8">
        {/* Left */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/60 hover:bg-accent md:hidden"
            aria-label="Open menu"
          >
            <span className="text-lg leading-none">☰</span>
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/60 hover:bg-accent md:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="text-lg leading-none">{collapsed ? "»" : "«"}</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {crumbs.map((c, idx) => (
                <React.Fragment key={`${c.label}-${idx}`}>
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                  {c.href ? (
                    <Link href={c.href} className="truncate transition-colors hover:text-foreground">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="truncate">{c.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-0.5 flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold md:text-base">{pageTitle}</h1>
              {orgName ? (
                <span className="hidden rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
                  {orgName}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Center search */}
        <div className="hidden md:flex md:w-[360px] lg:w-[440px]">
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className={cn(
              "group relative flex h-10 w-full items-center gap-2 rounded-2xl border border-border/60 bg-background/55 px-3",
              "text-sm text-muted-foreground shadow-sm",
              "hover:bg-accent/40 hover:text-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            )}
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
            <span className="truncate">Search runs, reports, projects…</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/25 px-2 py-1 text-[11px] text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/55 text-muted-foreground transition hover:bg-accent sm:inline-flex"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          <ThemeToggle />

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-2 py-1.5 hover:bg-accent"
              aria-label="Open profile menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/40 text-xs font-semibold text-muted-foreground">
                {initials(userEmail)}
              </div>
              <div className="hidden flex-col items-start text-left sm:flex">
                <span className="max-w-[160px] truncate text-xs font-medium leading-4">
                  {userEmail || "Account"}
                </span>
                <span className="max-w-[160px] truncate text-[11px] text-muted-foreground">
                  {orgName || "Organization"}
                </span>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-2xl">
                <div className="px-3 py-3">
                  <div className="text-sm font-semibold">Signed in</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {userEmail || "Local account"}
                  </div>
                </div>
                <div className="h-px bg-border/60" />

                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setProfileOpen(false)}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden">
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-3">
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex h-10 w-full items-center gap-2 rounded-2xl border border-border/60 bg-background/55 px-3 text-sm text-muted-foreground shadow-sm hover:bg-accent/40"
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
            <span className="truncate">Search…</span>
            <span className="ml-auto rounded-md border border-border/60 bg-muted/25 px-2 py-1 text-[11px]">
              ⌘K
            </span>
          </button>
        </div>
      </div>

      {/* Command palette */}
      <div
        className={cn("fixed inset-0 z-[60] transition", cmdOpen ? "" : "pointer-events-none")}
        aria-hidden={!cmdOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity",
            cmdOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setCmdOpen(false)}
        />
        <div
          className={cn(
            "absolute left-1/2 top-20 w-[92vw] max-w-xl -translate-x-1/2 rounded-2xl border border-border/60 bg-popover shadow-2xl",
            "transition-all duration-200 ease-out",
            cmdOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Type to search…"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Escape") setCmdOpen(false);
              }}
            />
            <span className="rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
              ESC
            </span>
          </div>

          <div className="p-2">
            {[
              { href: "/", label: "Dashboard" },
              { href: "/projects", label: "Projects" },
              { href: "/job-runs", label: "Job Runs" },
              { href: "/api-keys", label: "API Keys" },
              { href: "/reports", label: "Reports" },
              { href: "/compare", label: "Compare" },
              { href: "/settings", label: "Settings" },
            ].map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setCmdOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-accent"
              >
                <span>{it.label}</span>
                <span className="text-xs text-muted-foreground">↵</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
