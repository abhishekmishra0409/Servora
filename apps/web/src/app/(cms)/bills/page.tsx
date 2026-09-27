'use client';

import { Banknote, CircleCheckBig, CreditCard, QrCode, ReceiptText, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useCmsSession } from '@/components/cms-session-provider';
import { useConfirm } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { LoadingCards, LoadingRows } from '@/components/loading-state';
import { PageShell } from '@/components/page-shell';
import { SectionCard } from '@/components/section-card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { documentId, getBills, markPaymentPaid, requestBill, type CmsBill, type PaymentSnapshot } from '@/lib/api-client';
import { errorMessage } from '@/lib/async-state';
import { money, shortId } from '@/lib/format';
import { formatOrderNumber } from '@/lib/order-number';
import { humanize } from '@/lib/status-tone';
import { readCmsContext, useCmsResource } from '@/lib/use-cms-resource';

const COMPLETED_PAGE_SIZE = 6;

const paymentMethods = [
  { icon: Banknote, label: 'Cash', method: 'cash' },
  { icon: CreditCard, label: 'Card', method: 'card' },
  { icon: QrCode, label: 'UPI', method: 'upi' },
];

export default function BillsPage() {
  const [busy, setBusy] = useState('');
  const [completedPage, setCompletedPage] = useState(1);
  const resource = useCmsResource<CmsBill[]>(({ branchId, token }) => getBills(branchId, token), {
    events: ['order.status_updated', 'payment.bill_requested', 'payment.status_updated', 'service_request.created'],
    initial: [],
    pollMs: 30000,
  });
  const bills = resource.data;
  const confirm = useConfirm();
  const { can } = useCmsSession();
  const canRequestBill = can('bills:request');
  const canCapturePayment = can('bills:mark-paid');
  const activeBills = useMemo(() => bills.filter((bill) => bill.status !== 'captured'), [bills]);
  const completedBills = useMemo(() => bills.filter((bill) => bill.status === 'captured'), [bills]);
  const completedTotalPages = Math.max(1, Math.ceil(completedBills.length / COMPLETED_PAGE_SIZE));
  const paginatedCompletedBills = useMemo(() => {
    const start = (completedPage - 1) * COMPLETED_PAGE_SIZE;
    return completedBills.slice(start, start + COMPLETED_PAGE_SIZE);
  }, [completedBills, completedPage]);

  useEffect(() => {
    if (completedPage > completedTotalPages) {
      setCompletedPage(completedTotalPages);
    }
  }, [completedPage, completedTotalPages]);

  function billKey(bill: CmsBill): string {
    return bill.paymentId ?? bill.id ?? bill._id ?? bill.tableSessionId;
  }

  function paymentIdFor(bill: CmsBill): string {
    return bill.paymentId ?? bill.id ?? bill._id ?? '';
  }

  async function ensureBillPayment(bill: CmsBill): Promise<PaymentSnapshot> {
    const existingPaymentId = paymentIdFor(bill);
    if (existingPaymentId) {
      return {
        amount: bill.amount,
        currency: bill.currency,
        id: existingPaymentId,
        method: bill.method,
        orderIds: bill.orderIds,
        provider: bill.provider,
        status: bill.status,
        tableId: bill.tableId,
        tableSessionId: bill.tableSessionId,
      };
    }

    const firstOrder = bill.orders[0];
    if (!firstOrder) {
      throw new Error('No orders found for this table bill.');
    }

    return requestBill(documentId(firstOrder), readCmsContext().token);
  }

  async function generateBill(bill: CmsBill): Promise<void> {
    const id = billKey(bill);
    setBusy(id);
    try {
      await ensureBillPayment(bill);
      await resource.reload();
      toast.success('Bill generated');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not generate the bill.'));
    } finally {
      setBusy('');
    }
  }

  async function markBillPaid(bill: CmsBill, method: string): Promise<void> {
    const entry = paymentMethods.find((item) => item.method === method);
    const label = entry?.label ?? method;
    const ok = await confirm({
      confirmLabel: `Mark paid by ${label}`,
      description: `Table ···${shortId(bill.tableId)} · ${money(bill.amount)} across ${bill.orders.length} ${bill.orders.length === 1 ? 'order' : 'orders'}.`,
      details: ['Only confirm once the money has been received.', 'The bill moves to completed and the table can be closed.'],
      ...(entry ? { icon: entry.icon } : {}),
      title: `Record ${money(bill.amount)} paid by ${label}?`,
    });
    if (!ok) return;
    const id = billKey(bill);
    setBusy(id);
    try {
      const payment = await ensureBillPayment(bill);
      await markPaymentPaid(documentId(payment), method, readCmsContext().token);
      await resource.reload();
      toast.success(`Payment captured by ${method}`);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not capture payment.'));
    } finally {
      setBusy('');
    }
  }

  function orderItemsSummary(bill: CmsBill): string {
    return bill.orders.flatMap((order) => order.items.map((item) => `${item.quantity}× ${item.name}`)).join(', ');
  }

  function itemDetailLabel(item: CmsBill['orders'][number]['items'][number]): string {
    const addonText = item.addonSnapshots.length ? ` + ${item.addonSnapshots.map((addon) => addon.label).join(', ')}` : '';
    const variantText = item.variantLabel ? ` (${item.variantLabel})` : '';
    return `${item.quantity}× ${item.name}${variantText}${addonText}`;
  }

  return (
    <PageShell
      description="Orders from the same table session, grouped into one closeout bill."
      eyebrow="Bills"
      title="Table bills"
      resource={resource}
      what="bills"
    >
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Pending bills</h2>
          <Badge variant={activeBills.length ? 'warning' : 'secondary'}>{activeBills.length} open</Badge>
        </div>

        {resource.status === 'loading' ? (
          <LoadingCards count={2} />
        ) : activeBills.length === 0 ? (
          <EmptyState compact description="Completed bills are listed below." icon={Wallet} title="No pending bills" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeBills.map((bill) => {
              const id = billKey(bill);
              const paymentRequested = bill.status !== 'not_requested';
              const isBusy = busy === id;
              return (
                <Card className="gap-4 px-5 py-4 shadow-card" key={id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Table ···{shortId(bill.tableId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {bill.orders.length} {bill.orders.length === 1 ? 'order' : 'orders'} in this table session
                      </p>
                    </div>
                    <StatusBadge kind="payment" label={humanize(bill.status)} value={bill.status} />
                  </div>

                  <ul className="divide-y rounded-lg border">
                    {bill.orders.map((order) => (
                      <li className="flex items-start gap-3 px-3 py-2.5" key={documentId(order)}>
                        <ReceiptText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{formatOrderNumber(order.orderNo)}</p>
                          <p className="text-xs text-muted-foreground">
                            {humanize(order.status)} · {order.items.length} items
                          </p>
                          {order.items.length ? (
                            <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                              {order.items.map((item) => (
                                <li key={`${item.menuItemId}-${item.name}-${item.quantity}-${item.unitPrice}`}>{itemDetailLabel(item)}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{money(order.grandTotal)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="grid">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total due</span>
                      <span className="font-display text-2xl font-semibold tabular-nums">{money(bill.amount)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {canRequestBill && !paymentRequested ? (
                        <Button disabled={isBusy} onClick={() => void generateBill(bill)} type="button">
                          <ReceiptText />
                          Generate bill
                        </Button>
                      ) : null}
                      {canCapturePayment && paymentRequested && bill.status !== 'captured'
                        ? paymentMethods.map(({ icon: Icon, label, method }) => (
                            <Button disabled={isBusy} key={method} onClick={() => void markBillPaid(bill, method)} type="button" variant="outline">
                              <Icon />
                              {label}
                            </Button>
                          ))
                        : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <SectionCard actions={<Badge variant="success">{completedBills.length} captured</Badge>} title="Completed bills">
        {resource.status === 'loading' ? (
          <LoadingRows count={3} />
        ) : completedBills.length === 0 ? (
          <EmptyState compact icon={CircleCheckBig} title="No completed bills yet" />
        ) : (
          <>
            <ul className="divide-y">
              {paginatedCompletedBills.map((bill) => (
                <li className="flex items-center gap-3 py-3" key={billKey(bill)}>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-foreground text-success">
                    <CircleCheckBig aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Table ···{shortId(bill.tableId)} · {money(bill.amount)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Paid by {humanize(bill.method)} · {bill.orders.length} orders · {orderItemsSummary(bill) || 'No items'}
                    </p>
                  </div>
                  <StatusBadge kind="payment" value="captured" />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <Button disabled={completedPage <= 1} onClick={() => setCompletedPage((current) => Math.max(1, current - 1))} size="sm" type="button" variant="outline">
                Previous
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {completedPage} of {completedTotalPages}
              </p>
              <Button
                disabled={completedPage >= completedTotalPages}
                onClick={() => setCompletedPage((current) => Math.min(completedTotalPages, current + 1))}
                size="sm"
                type="button"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </SectionCard>
    </PageShell>
  );
}
