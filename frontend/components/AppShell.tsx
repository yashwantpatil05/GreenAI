// GreenAI/frontend/components/AppShell.tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { cn } from "../lib/utils";
import AppSidebar from "./AppSidebar";
import { TopNav } from "./TopNav";

type AppShellProps = {
  children: React.ReactNode;
};

const SIDEBAR_WIDTH_OPEN = 270;
const SIDEBAR_WIDTH_COLLAPSED = 84;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const isAuthRoute =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/auth");

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem("gai.sidebar.collapsed");
      if (v === "1") setCollapsed(true);
      if (v === "0") setCollapsed(false);
    } catch {}
  }, []);

  const setCollapsedSafe = React.useCallback((v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem("gai.sidebar.collapsed", v ? "1" : "0");
    } catch {}
  }, []);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  if (isAuthRoute) return <div className="min-h-screen">{children}</div>;

  const sidebarW = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_OPEN;

  return (
    <div
      className="min-h-screen w-full bg-background"
      style={{ ["--gai-sidebar-w" as any]: `${sidebarW}px` } as React.CSSProperties}
    >
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden md:block">
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsedSafe(!collapsed)}
        />
      </aside>

      {/* Mobile overlay + sidebar */}
      <div className={cn("md:hidden")}>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity",
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[320px] transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <AppSidebar
            mobile
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
            collapsed={false}
            onToggleCollapsed={() => {}}
          />
        </div>
      </div>

      {/* Main content */}
      <div
        className="flex min-h-screen flex-col"
        style={{
          paddingLeft: `var(--gai-sidebar-w)`,
          transition: "padding-left 200ms ease",
        }}
      >
        <TopNav
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsedSafe(!collapsed)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />

        <main className="min-h-[calc(100vh-64px)] px-4 pb-10 pt-6 md:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
