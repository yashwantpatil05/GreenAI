// GreenAI/frontend/components/DataTable.tsx
"use client";

import * as React from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: React.ReactNode;
  widthClassName?: string; // e.g. "w-[220px]"
  align?: "left" | "center" | "right";
  /** If provided, used for rendering cell; otherwise uses row[key] */
  cell?: (row: T) => React.ReactNode;
  /** If true, allow client sort on this column */
  sortable?: boolean;
  /** Optional accessor for sorting/searching if key is not a direct field */
  accessor?: (row: T) => unknown;
  /** Include this column in global search */
  searchable?: boolean;
};

export type DataTableProps<T> = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  columns: DataTableColumn<T>[];
  data: T[];
  /** Unique row id (recommended). If not provided, index is used. */
  getRowId?: (row: T, index: number) => string;
  /** Enable global search bar */
  enableSearch?: boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Default page size */
  pageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Loading state */
  loading?: boolean;
  /** Called on row click */
  onRowClick?: (row: T) => void;
  /** Empty state renderer */
  emptyState?: React.ReactNode;
  className?: string;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

function normalize(val: unknown) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.toLowerCase();
  if (typeof val === "number") return val;
  if (typeof val === "boolean") return val ? 1 : 0;
  if (val instanceof Date) return val.getTime();
  return String(val).toLowerCase();
}

export default function DataTable<T>({
  title,
  description,
  columns,
  data,
  getRowId,
  enableSearch = true,
  searchPlaceholder = "Search…",
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  loading = false,
  onRowClick,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortState>(null);
  const [size, setSize] = React.useState(pageSize);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [query, size, sort?.key, sort?.dir]);

  const searchableCols = React.useMemo(
    () => columns.filter((c) => c.searchable !== false),
    [columns]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!enableSearch || !q) return data;

    return data.filter((row) => {
      for (const c of searchableCols) {
        const key = String(c.key);
        const v = c.accessor ? c.accessor(row) : (row as any)[key];
        const s = normalize(v);
        if (typeof s === "number") {
          if (String(s).includes(q)) return true;
        } else {
          if (String(s).includes(q)) return true;
        }
      }
      return false;
    });
  }, [data, enableSearch, query, searchableCols]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => String(c.key) === sort.key);
    if (!col) return filtered;

    const dirMul = sort.dir === "asc" ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const av = normalize(col.accessor ? col.accessor(a) : (a as any)[sort.key]);
      const bv = normalize(col.accessor ? col.accessor(b) : (b as any)[sort.key]);

      // numeric compare when both are numbers
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dirMul;
      return String(av).localeCompare(String(bv)) * dirMul;
    });
  }, [filtered, sort, columns]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * size;
  const pageRows = sorted.slice(start, start + size);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null; // third click clears sort
    });
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-background shadow-sm",
        className
      )}
    >
      {(title || description || enableSearch) && (
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 md:flex-row md:items-end md:justify-between md:p-5">
          <div className="min-w-0">
            {title ? (
              <div className="text-sm font-semibold text-foreground">{title}</div>
            ) : null}
            {description ? (
              <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {enableSearch ? (
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={cn(
                    "h-10 w-full sm:w-[260px]",
                    "rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "shadow-sm outline-none",
                    "focus:border-border focus:ring-2 focus:ring-foreground/10"
                  )}
                />
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows</span>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className={cn(
                  "h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground",
                  "shadow-sm outline-none focus:ring-2 focus:ring-foreground/10"
                )}
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted/25">
            <tr className="border-b border-border/60">
              {columns.map((c) => {
                const key = String(c.key);
                const isSorted = sort?.key === key;
                const sortDir = isSorted ? sort?.dir : null;
                const align =
                  c.align === "center"
                    ? "text-center"
                    : c.align === "right"
                    ? "text-right"
                    : "text-left";

                return (
                  <th
                    key={key}
                    className={cn(
                      "px-4 py-3 text-xs font-semibold text-muted-foreground",
                      "whitespace-nowrap",
                      align,
                      c.widthClassName
                    )}
                  >
                    <div className={cn("flex items-center gap-2", align === "text-right" ? "justify-end" : align === "text-center" ? "justify-center" : "justify-start")}>
                      {c.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5",
                            "hover:bg-muted/40 hover:text-foreground transition"
                          )}
                          aria-label={`Sort by ${key}`}
                        >
                          <span>{c.header}</span>
                          <span className="text-[10px] opacity-80">
                            {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "↕"}
                          </span>
                        </button>
                      ) : (
                        <span>{c.header}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: Math.min(size, 8) }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border/40">
                  {columns.map((c, j) => (
                    <td key={`sk-${i}-${j}`} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10">
                  {emptyState ? (
                    emptyState
                  ) : (
                    <div className="grid place-items-center gap-2 text-center">
                      <div className="text-sm font-medium text-foreground">
                        No results
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Try adjusting your search or filters.
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => {
                const rid = getRowId ? getRowId(row, start + idx) : String(start + idx);
                const clickable = Boolean(onRowClick);

                return (
                  <tr
                    key={rid}
                    onClick={clickable ? () => onRowClick?.(row) : undefined}
                    className={cn(
                      "border-b border-border/40",
                      clickable
                        ? "cursor-pointer hover:bg-muted/30 transition"
                        : ""
                    )}
                  >
                    {columns.map((c) => {
                      const key = String(c.key);
                      const align =
                        c.align === "center"
                          ? "text-center"
                          : c.align === "right"
                          ? "text-right"
                          : "text-left";
                      const val = c.cell ? c.cell(row) : (row as any)[key];

                      return (
                        <td
                          key={`${rid}-${key}`}
                          className={cn(
                            "px-4 py-3 text-sm text-foreground",
                            "align-middle",
                            align,
                            c.widthClassName
                          )}
                        >
                          <div className="min-w-0 truncate">{val as any}</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="text-xs text-muted-foreground">
          {total === 0 ? "0" : start + 1}–{Math.min(start + size, total)} of {total}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={safePage <= 1}
            className={cn(
              "h-9 rounded-xl border border-border/60 bg-background px-3 text-sm shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:bg-muted/30 transition"
            )}
          >
            First
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className={cn(
              "h-9 rounded-xl border border-border/60 bg-background px-3 text-sm shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:bg-muted/30 transition"
            )}
          >
            Prev
          </button>

          <div className="px-2 text-xs text-muted-foreground">
            Page <span className="text-foreground">{safePage}</span> / {totalPages}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className={cn(
              "h-9 rounded-xl border border-border/60 bg-background px-3 text-sm shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:bg-muted/30 transition"
            )}
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            disabled={safePage >= totalPages}
            className={cn(
              "h-9 rounded-xl border border-border/60 bg-background px-3 text-sm shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:bg-muted/30 transition"
            )}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
