'use client';

import { ConciergeBell, MessageSquareHeart, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { CustomerHeading, CustomerPage } from '@/components/customer-page';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingRows } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPublicOrderPayment, getPublicOrders, type OrderStatusSnapshot, type PaymentSnapshot } from '@/lib/api-client';
import { useCustomerRoute } from '@/lib/customer-route';
import { readGuestSession } from '@/lib/customer-storage';
import { money } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { createSocketClient } from '@/lib/socket';

type BillRow = {
  order: OrderStatusSnapshot;
  payment: PaymentSnapshot | null;
};

export default function CustomerBillPage(): ReactNode {
  const { basePath, qrToken } = useCustomerRoute();
  const [rows, setRows] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totals = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.order.grandTotal, 0);
    const capturedPayments = new Map<string, PaymentSnapshot>();
    for (const row of rows) {
      if (row.payment?.status === 'captured') {
        capturedPayments.set(row.payment.id ?? row.payment._id ?? row.order.id, row.payment);
      }
    }
    const paid = [...capturedPayments.values()].reduce((sum, payment) => sum + payment.amount, 0);
    return { due: Math.max(total - paid, 0), paid, total };
  }, [rows]);

  useEffect(() => {
    if (!qrToken) {
      setError('Open a full table link like /r/{tenant}/{branch}/t/{qrToken}.');
      setLoading(false);
      return;
    }

    let active = true;
    const load = (): void => {
      void getPublicOrders(qrToken)
        .then(async (orders) => {
          const payments = await Promise.all(orders.map((order) => getPublicOrderPayment(order.id, qrToken).catch(() => null)));
          if (!active) return;
          setRows(orders.map((order, index) => ({ order, payment: payments[index] ?? null })));
          setError('');
        })
        .catch((nextError: unknown) => {
          if (!active) return;
          setError(nextError instanceof Error ? nextError.message : 'Could not load bill status.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    load();
    const interval = window.setInterval(load, 30_000);
    const guest = readGuestSession(qrToken);
    const socket = guest?.guestToken ? createSocketClient(guest.guestToken) : null;
    socket?.on('order.created', load);
    socket?.on('order.status_updated', load);
    socket?.on('payment.status_updated', load);
    socket?.connect();

    return () => {
      active = false;
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, [qrToken]);

  const settled = rows.length > 0 && totals.due === 0;

  return (
    <CustomerPage>
      <CustomerHeading description="Every order on this table and what is still to pay." title="Your bill" />

      {error ? <ErrorState message={error} /> : null}

      <div className="grid grid-cols-3 gap-2">
        {[
          ['Table total', totals.total, 'text-foreground'],
          ['Paid', totals.paid, 'text-success'],
          ['Due', totals.due, totals.due > 0 ? 'text-primary' : 'text-success'],
        ].map(([label, value, tone]) => (
          <Card className="gap-1 px-3 py-3 shadow-card" key={label as string}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`font-display text-lg font-semibold tabular-nums ${tone as string}`}>{money(value as number)}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <LoadingRows count={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          action={
            <Button asChild>
              <Link href={`${basePath}/menu`}>Browse menu</Link>
            </Button>
          }
          description="Orders you submit will be totalled here."
          icon={ReceiptText}
          title="No orders yet"
        />
      ) : (
        <Card className="gap-0 px-4 py-1 shadow-card">
          <ul className="divide-y">
            {rows.map(({ order, payment }) => (
              <li className="flex items-center gap-3 py-3" key={order.id}>
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <ReceiptText aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{formatOrderNumber(order.orderNo)}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-xs text-muted-foreground">{order.items.length} items</span>
                    <StatusBadge className="text-[10px]" kind="order" value={order.status} />
                    <StatusBadge className="text-[10px]" kind="payment" label={payment?.status ? undefined : 'Bill not requested'} value={payment?.status ?? 'pending'} />
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{money(order.grandTotal)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {rows.length > 0 ? (
        <div className="grid gap-2">
          {!settled ? (
            <Button asChild className="h-12" size="lg">
              <Link href={`${basePath}/service`}>
                <ConciergeBell />
                Ask for the bill
              </Link>
            </Button>
          ) : null}
          <Button asChild className="h-12" size="lg" variant={settled ? 'default' : 'outline'}>
            <Link href={`${basePath}/feedback`}>
              <MessageSquareHeart />
              Leave feedback
            </Link>
          </Button>
        </div>
      ) : null}
    </CustomerPage>
  );
}
