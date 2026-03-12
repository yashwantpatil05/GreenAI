"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Bell, ChevronRight, LogOut, Search } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type Breadcrumb = { label: string; href?: string };

type AppTopbarProps = {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  userEmail?: string | null;
  orgName?: string | null;
  onLogout?: () => void;
  rightSlot?: React.ReactNode;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
};

function initials(emailOrName?: string | null) {
  if (!emailOrName) return "U";
  const s = emailOrName.split("@")[0]?.trim() || emailOrName.trim();
  const parts = s.split(/[.\s_-]+/).filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

export default function AppTopbar({
  title = "Dashboard",
  breadcrumbs,
  userEmail,
  orgName,
  onLogout,
  rightSlot,
  onSearch,
  searchPlaceholder = "Search projects, runs, reports",
}: AppTopbarProps) {
  const pathname = usePathname();
  const [q, setQ] = React.useState("");

  const autoCrumbs = React.useMemo<Breadcrumb[]>(() => {
    const base: Breadcrumb[] = [{ label: "Home", href: "/" }];
    if (!pathname || pathname === "/") return base;

    const segs = pathname.split("/").filter(Boolean);
    let acc = "";
    for (const seg of segs) {
      acc += `/${seg}`;
      base.push({
        label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        href: acc,
      });
    }
    return base;
  }, [pathname]);

  const crumbs = breadcrumbs?.length ? breadcrumbs : autoCrumbs;

  const submitSearch = React.useCallback(() => {
    const v = q.trim();
    if (!v) return;
    onSearch?.(v);
  }, [q, onSearch]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {crumbs.map((c, idx) => (
              <React.Fragment key={`${c.label}-${idx}`}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {c.href ? (
                  <Link
                    href={c.href}
                    className="truncate transition-colors hover:text-foreground"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate">{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="truncate text-base font-semibold leading-6">
              {title}
            </h1>
            {orgName ? (
              <span className="hidden sm:inline-flex rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {orgName}
              </span>
            ) : null}
          </div>
        </div>

        <div className="hidden md:flex md:w-[360px] lg:w-[440px]">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
              placeholder={searchPlaceholder}
              className={cn(
                "h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none",
                "transition focus:ring-2 focus:ring-ring/40"
              )}
            />
          </div>
        </div>

        {rightSlot ? <div className="hidden lg:block">{rightSlot}</div> : null}

        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted/60 sm:inline-flex"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <ThemeToggle />

        <button
          type="button"
          onClick={() => onLogout?.()}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium",
            "bg-background transition hover:bg-muted/60 active:scale-[0.99]"
          )}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {initials(userEmail || orgName)}
          </span>
          <div className="hidden flex-col items-start text-left sm:flex">
            <span className="truncate text-xs font-medium leading-4">
              {userEmail || "Signed in"}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {orgName || "Organization"}
            </span>
          </div>
          <LogOut className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
      </div>
    </header>
  );
}
