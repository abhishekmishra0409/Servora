import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import type { LiveOrder } from '@/lib/api-client';
import { money, shortId } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { cn } from '@/lib/utils';

export function OrderTicket({
  actions,
  className,
  meta,
  order,
  showPrices = true,
}: {
  actions?: ReactNode;
  className?: string;
  /** Right-aligned text next to the order number, such as elapsed time. */
  meta?: ReactNode;
  order: LiveOrder;
  showPrices?: boolean;
}): ReactNode {
  return (
    <Card className={cn('gap-3 px-4 py-3 shadow-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{formatOrderNumber(order.orderNo)}</p>
          <p className="text-xs text-muted-foreground">Table ···{shortId(order.tableId)}</p>
        </div>
        {meta ? <span className="shrink-0 text-xs font-medium text-muted-foreground">{meta}</span> : null}
      </div>
      <ul className="divide-y text-sm">
        {order.items.map((item, index) => (
          <li className="flex items-start justify-between gap-3 py-1.5" key={`${item.menuItemId}-${index}`}>
            <span className="min-w-0">
              <span className="font-medium tabular-nums">{item.quantity}×</span> {item.name}
              {item.variantLabel ? <span className="block text-xs text-muted-foreground">{item.variantLabel}</span> : null}
              {item.notes ? <span className="block text-xs italic text-muted-foreground">“{item.notes}”</span> : null}
            </span>
            {showPrices ? (
              <span className="shrink-0 tabular-nums text-muted-foreground">{money(item.quantity * item.unitPrice)}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {showPrices ? (
        <p className="flex items-center justify-between border-t border-dashed pt-2 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">{money(order.grandTotal)}</span>
        </p>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
    </Card>
  );
}
