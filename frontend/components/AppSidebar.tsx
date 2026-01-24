// GreenAI/frontend/components/AppSidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Activity,
  KeyRound,
  FileText,
  Scale,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Lightbulb,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Logo, LogoMark } from "./Logo";

type AppSidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;

  mobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/job-runs", label: "Job Runs", icon: Activity },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/compare", label: "Compare", icon: Scale },
  { href: "/suggestions", label: "Suggestions", icon: Lightbulb },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppSidebar({
  collapsed = false,
  onToggleCollapsed,
  mobile = false,
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "h-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70",
        mobile
          ? "w-full border-r border-border/60"
          : "hidden h-screen border-r border-border/60 md:block"
      )}
      style={
        mobile
          ? undefined
          : {
              width: collapsed ? "5.0rem" : "16.0rem",
              position: "sticky",
              top: 0,
              transition: "width 200ms ease",
            }
      }
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm">
              <span className="text-sm font-bold">GA</span>
            </div>

            <div
              className={cn(
                "min-w-0 transition-all duration-200",
                !mobile && collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              <div className="truncate text-sm font-semibold leading-tight">GreenAI</div>
              <div className="truncate text-xs text-muted-foreground leading-tight">
                Carbon-aware ML ops
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {mobile ? (
              <button
                type="button"
                onClick={() => onMobileClose?.()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background hover:bg-accent"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onToggleCollapsed?.()}
                className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background hover:bg-accent md:inline-flex"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3">
          <div className="space-y-1">
            {navItems.map((it) => {
              const Icon = it.icon;
              const active = isActive(it.href);

              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => {
                    if (mobileOpen) onMobileClose?.();
                  }}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />

                  <span
                    className={cn(
                      "min-w-0 truncate transition-all duration-200",
                      !mobile && collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}
                  >
                    {it.label}
                  </span>

                  {/* Hover label when collapsed (desktop only) */}
                  {!mobile && collapsed && (
                    <span className="pointer-events-none absolute left-[4.9rem] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1 text-xs text-foreground shadow-lg group-hover:block">
                      {it.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border/60 p-3">
          <div
            className={cn(
              "rounded-xl border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground",
              !mobile && collapsed && "px-2"
            )}
          >
            <div className={cn("font-medium text-foreground/90", !mobile && collapsed && "sr-only")}>
              Workspace
            </div>
            <div className={cn("truncate", !mobile && collapsed && "sr-only")}>Production</div>

            {!mobile && collapsed && (
              <div className="flex h-9 items-center justify-center rounded-lg">
                <span className="text-[10px] font-semibold">PROD</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
