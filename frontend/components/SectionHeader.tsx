// GreenAI/frontend/components/SectionHeader.tsx
"use client";

import * as React from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Crumb = {
  label: string;
  onClick?: () => void;
  href?: string;
};

export type SectionHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
  /** Optional left icon */
  icon?: React.ReactNode;
  /** Right side slot: buttons, filters, etc. */
  actions?: React.ReactNode;
  /** Breadcrumb-like small row above title */
  crumbs?: Crumb[];
  /** Optional badge/pill near title */
  badge?: React.ReactNode;
  className?: string;
};

function CrumbsRow({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {crumbs.map((c, i) => {
        const Node = c.href ? "a" : "button";
        const props: any = c.href
          ? { href: c.href }
          : { type: "button", onClick: c.onClick };

        return (
          <React.Fragment key={`${c.label}-${i}`}>
            <Node
              {...props}
              className={cn(
                "transition hover:text-foreground",
                c.href ? "underline-offset-4 hover:underline" : ""
              )}
            >
              {c.label}
            </Node>
            {i < crumbs.length - 1 ? <span className="opacity-60">/</span> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  actions,
  crumbs,
  badge,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm",
        "px-5 py-4 md:px-6 md:py-5",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70",
          "bg-[radial-gradient(900px_circle_at_25%_0%,rgba(99,102,241,0.07),transparent_45%),radial-gradient(700px_circle_at_85%_20%,rgba(16,185,129,0.07),transparent_40%)]"
        )}
      />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {crumbs?.length ? <CrumbsRow crumbs={crumbs} /> : null}

          <div className="mt-1 flex items-start gap-3">
            {icon ? (
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground">
                {icon}
              </div>
            ) : null}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-foreground md:text-xl">
                  {title}
                </h1>
                {badge ? (
                  <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                    {badge}
                  </div>
                ) : null}
              </div>

              {subtitle ? (
                <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
              ) : null}
            </div>
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { SectionHeader };
export default SectionHeader;
