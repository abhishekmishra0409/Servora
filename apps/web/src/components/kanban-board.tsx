import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import type { StatusTone } from '@/lib/status-tone';
import { cn } from '@/lib/utils';

export interface KanbanColumn<Item> {
  items: Item[];
  key: string;
  title: string;
  tone?: StatusTone;
}

const toneBadge: Record<StatusTone, 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'default'> = {
  default: 'secondary',
  destructive: 'destructive',
  info: 'info',
  primary: 'default',
  success: 'success',
  warning: 'warning',
};

const toneRail: Record<StatusTone, string> = {
  default: 'border-t-border',
  destructive: 'border-t-destructive',
  info: 'border-t-info',
  primary: 'border-t-primary',
  success: 'border-t-success',
  warning: 'border-t-warning',
};

/**
 * Horizontal lanes that scroll sideways on narrow screens instead of stacking,
 * so the queue stays readable on a phone held at the pass.
 */
export function KanbanBoard<Item>({
  columns,
  emptyLabel = 'Nothing here',
  itemKey,
  renderCard,
}: {
  columns: KanbanColumn<Item>[];
  emptyLabel?: string;
  itemKey: (item: Item) => string;
  renderCard: (item: Item, column: KanbanColumn<Item>) => ReactNode;
}): ReactNode {
  return (
    <section className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div
        className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4"
        style={{ minWidth: `${columns.length * 280 + (columns.length - 1) * 16}px` }}
      >
        {columns.map((column) => {
          const tone = column.tone ?? 'default';
          return (
            <section
              aria-label={column.title}
              className={cn('flex min-h-[320px] flex-col gap-3 rounded-xl border border-t-4 bg-muted/40 p-3', toneRail[tone])}
              key={column.key}
            >
              <header className="flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-semibold capitalize">{column.title}</h2>
                <Badge variant={toneBadge[tone]}>{column.items.length}</Badge>
              </header>
              {column.items.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
              ) : (
                column.items.map((item) => <div key={itemKey(item)}>{renderCard(item, column)}</div>)
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
