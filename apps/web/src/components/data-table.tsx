'use client';

import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface DataColumn<Row> {
  /** Applied to both the header and body cells. */
  className?: string;
  header: ReactNode;
  /** Hidden on phones; the stacked card view uses `header` as its label. */
  hideOnMobile?: boolean;
  key: string;
  render: (row: Row) => ReactNode;
  /** Skeleton bar width for this column while loading, e.g. `w-24`. */
  skeleton?: string;
}

const skeletonWidths = ['w-40', 'w-24', 'w-20', 'w-16', 'w-28'];

/** Skeleton that mirrors the real table so the layout does not jump when data lands. */
export function DataTableSkeleton<Row>({
  className,
  columns,
  rows = 5,
}: {
  className?: string | undefined;
  columns: DataColumn<Row>[];
  rows?: number;
}): ReactNode {
  return (
    <div aria-busy="true" aria-label="Loading table" className={cn('overflow-hidden rounded-xl border bg-card shadow-card', className)} role="status">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((column) => (
                <TableHead className={cn('text-xs font-semibold uppercase tracking-wide', column.className)} key={column.key}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <TableRow className="hover:bg-transparent" key={rowIndex}>
                {columns.map((column, columnIndex) => (
                  <TableCell className={column.className} key={column.key}>
                    {columnIndex === 0 ? (
                      <div className="space-y-1.5 py-0.5">
                        <Skeleton className={cn('h-3.5', column.skeleton ?? 'w-40')} />
                        <Skeleton className="h-2.5 w-24 opacity-70" />
                      </div>
                    ) : (
                      <Skeleton
                        className={cn(
                          'h-3.5',
                          column.skeleton ?? skeletonWidths[(columnIndex + rowIndex) % skeletonWidths.length],
                          column.className?.includes('text-right') && 'ml-auto',
                        )}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y md:hidden">
        {Array.from({ length: Math.min(rows, 3) }, (_, rowIndex) => (
          <li className="grid gap-2.5 p-4" key={rowIndex}>
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex justify-between gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading</span>
    </div>
  );
}

/**
 * Tabular data with a real `<table>` on `md+` and stacked cards below, so rows
 * with any number of columns line up. Optional client-side search and
 * pagination, a table-shaped skeleton on first load, and a thin progress bar
 * while refreshing existing rows.
 */
export function DataTable<Row>({
  className,
  columns,
  empty,
  loading = false,
  pageSize,
  refreshing = false,
  rowClassName,
  rowKey,
  rows,
  searchPlaceholder = 'Search',
  searchText,
  skeletonRows = 5,
  toolbar,
}: {
  className?: string;
  columns: DataColumn<Row>[];
  empty?: ReactNode;
  loading?: boolean;
  /** Rows per page; omit to show everything. */
  pageSize?: number;
  /** True while existing rows are being re-fetched. */
  refreshing?: boolean;
  rowClassName?: (row: Row) => string | undefined;
  rowKey: (row: Row) => string;
  rows: Row[];
  searchPlaceholder?: string;
  /** Text to match against; providing it turns on the search box. */
  searchText?: (row: Row) => string;
  skeletonRows?: number;
  /** Extra controls rendered next to the search box. */
  toolbar?: ReactNode;
}): ReactNode {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || !searchText) return rows;
    return rows.filter((row) => searchText(row).toLowerCase().includes(needle));
  }, [query, rows, searchText]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const visible = pageSize ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const showToolbar = Boolean(searchText || toolbar) && (loading || rows.length > 0);

  const toolbarNode = showToolbar ? (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      {searchText ? (
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={searchPlaceholder}
            className="h-9 bg-card pl-9 pr-8"
            disabled={loading}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            value={query}
          />
          {query ? (
            <Button
              aria-label="Clear search"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setQuery('')}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          ) : null}
        </div>
      ) : null}
      {toolbar}
      {query && !loading ? (
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {rows.length}
        </span>
      ) : null}
    </div>
  ) : null;

  if (loading) {
    return (
      <div>
        {toolbarNode}
        <DataTableSkeleton className={className} columns={columns} rows={skeletonRows} />
      </div>
    );
  }

  if (rows.length === 0) {
    return empty ?? null;
  }

  return (
    <div>
      {toolbarNode}
      <div aria-busy={refreshing} className={cn('relative overflow-hidden rounded-xl border bg-card shadow-card', className)}>
        {refreshing ? (
          <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/15">
            <div className="h-full w-1/3 animate-progress-indeterminate bg-primary" />
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-semibold">No matches for “{query}”</p>
            <Button onClick={() => setQuery('')} size="sm" type="button" variant="outline">
              Clear search
            </Button>
          </div>
        ) : (
          <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {columns.map((column) => (
                      <TableHead className={cn('text-xs font-semibold uppercase tracking-wide', column.className)} key={column.key}>
                        {column.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((row) => (
                    <TableRow className={rowClassName?.(row)} key={rowKey(row)}>
                      {columns.map((column) => (
                        <TableCell className={cn('align-middle', column.className)} key={column.key}>
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y md:hidden">
              {visible.map((row) => (
                <li className={cn('grid gap-2 p-4', rowClassName?.(row))} key={rowKey(row)}>
                  {columns
                    .filter((column) => !column.hideOnMobile)
                    .map((column) => (
                      <div className="flex items-start justify-between gap-3 text-sm" key={column.key}>
                        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{column.header}</span>
                        <span className="min-w-0 text-right">{column.render(row)}</span>
                      </div>
                    ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pageSize && filtered.length > pageSize ? (
          <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-2.5">
            <p className="text-xs text-muted-foreground tabular-nums">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)} size="icon-sm" type="button" variant="outline">
                <ChevronLeft />
              </Button>
              <span className="min-w-14 text-center text-xs font-medium tabular-nums">
                {page} / {totalPages}
              </span>
              <Button aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage(page + 1)} size="icon-sm" type="button" variant="outline">
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
