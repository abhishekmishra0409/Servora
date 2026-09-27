import type { ReactNode } from 'react';

import { LoadingRows } from '@/components/loading-state';
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
}

/**
 * Tabular data with a real `<table>` on `md+` and stacked cards below, so rows
 * with any number of columns line up and never wrap into phantom rows.
 */
export function DataTable<Row>({
  className,
  columns,
  empty,
  loading = false,
  rowClassName,
  rowKey,
  rows,
  skeletonRows = 4,
}: {
  className?: string;
  columns: DataColumn<Row>[];
  empty?: ReactNode;
  loading?: boolean;
  rowClassName?: (row: Row) => string | undefined;
  rowKey: (row: Row) => string;
  rows: Row[];
  skeletonRows?: number;
}): ReactNode {
  if (loading) {
    return <LoadingRows count={skeletonRows} />;
  }

  if (rows.length === 0) {
    return empty ?? null;
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-card', className)}>
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
            {rows.map((row) => (
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
        {rows.map((row) => (
          <li className={cn('grid gap-2 p-4', rowClassName?.(row))} key={rowKey(row)}>
            {columns
              .filter((column) => !column.hideOnMobile)
              .map((column) => (
                <div className="flex items-start justify-between gap-3 text-sm" key={column.key}>
                  <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {column.header}
                  </span>
                  <span className="min-w-0 text-right">{column.render(row)}</span>
                </div>
              ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
