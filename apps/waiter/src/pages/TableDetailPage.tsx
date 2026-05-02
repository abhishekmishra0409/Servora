import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  documentId,
  getLiveOrders,
  getServiceRequests,
  getTables,
  resolveServiceRequest,
  updateOrderStatus,
  type LiveOrder,
  type ServiceRequest,
  type TableSummary,
} from '../lib/api-client';
import { defaultBranchId, readSession } from '../lib/session';

const money = (value: number): string =>
  new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' }).format(value);

const statusColor: Record<string, string> = {
  pending: '#F59E0B',
  pending_confirmation: '#F59E0B',
  accepted: '#8d4b00',
  preparing: '#825100',
  ready: '#10B981',
  served: '#515f74',
};

export function TableDetailPage() {
  const { id: urlTableId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedTableId, setSelectedTableId] = useState(urlTableId ?? '');
  const [busyOrderId, setBusyOrderId] = useState('');
  const [busyRequestId, setBusyRequestId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const session = useMemo(() => readSession(), []);
  const branchId = useMemo(() => defaultBranchId(), []);

  async function load(): Promise<void> {
    if (!session?.accessToken || !branchId) {
      setMessage('Sign in first.');
      return;
    }
    try {
      const [nextTables, nextOrders, nextRequests] = await Promise.all([
        getTables(branchId, session.accessToken),
        getLiveOrders(branchId, session.accessToken),
        getServiceRequests(branchId, session.accessToken),
      ]);
      setTables(nextTables);
      setOrders(nextOrders);
      setRequests(nextRequests);
      if (!selectedTableId && nextTables.length > 0) {
        setSelectedTableId(documentId(nextTables[0]!));
      }
      setMessage('');
    } catch (error: any) {
      setMessage(error.message ?? 'Could not load table data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  // Keep URL in sync when user switches table from selector
  function switchTable(id: string) {
    setSelectedTableId(id);
    navigate(`/table-detail/${id}`, { replace: true });
  }

  async function markServed(order: LiveOrder): Promise<void> {
    if (!session?.accessToken) return;
    const id = documentId(order);
    setBusyOrderId(id);
    try {
      await updateOrderStatus(id, 'served', session.accessToken);
      await load();
    } catch (error: any) {
      setMessage(error.message ?? 'Could not mark served.');
    } finally {
      setBusyOrderId('');
    }
  }

  async function resolveRequest(req: ServiceRequest): Promise<void> {
    if (!session?.accessToken) return;
    const id = documentId(req);
    setBusyRequestId(id);
    try {
      await resolveServiceRequest(id, session.accessToken);
      await load();
    } catch (error: any) {
      setMessage(error.message ?? 'Could not resolve request.');
    } finally {
      setBusyRequestId('');
    }
  }

  const selectedTable = tables.find((t) => documentId(t) === selectedTableId);
  const tableOrders = orders.filter((o) => String(o.tableId) === selectedTableId);
  const tableRequests = requests.filter((r) => String(r.tableId) === selectedTableId);
  const grandTotal = tableOrders.reduce((s, o) => s + o.grandTotal, 0);
  const subTotal = tableOrders.reduce((s, o) => s + o.subtotal, 0);
  const taxTotal = tableOrders.reduce((s, o) => s + o.taxTotal, 0);

  return (
    <div className="flex flex-col" style={{ minHeight: '100%' }}>
      {/* ── Page header ── */}
      <header className="waiter-page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => navigate('/tables')} className="waiter-icon-button" title="Back to floor">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 style={{ margin: 0 }}>
              {selectedTable ? `Table ${selectedTable.tableNo}` : 'Table Detail'}
            </h1>
            <p style={{ margin: 0 }}>
              {selectedTable
                ? `${selectedTable.capacity} seats · ${selectedTable.status.replaceAll('_', ' ')}`
                : 'Select a table'}
            </p>
          </div>
        </div>

        <div className="waiter-toolbar">
          {/* Table switcher */}
          <select
            value={selectedTableId}
            onChange={(e) => switchTable(e.target.value)}
            style={{ border: '1px solid #dbc2b0', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#111c2d', background: '#fff' }}
          >
            {tables.map((t) => (
              <option key={documentId(t)} value={documentId(t)}>T{t.tableNo}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void load()}
            className="waiter-secondary-button"
          >
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>

          <button
            type="button"
            className="waiter-primary-button"
            style={{ minWidth: 120 }}
          >
            <span className="material-symbols-outlined">receipt_long</span>
            Print Bill
          </button>
        </div>
      </header>

      {message && <p className="waiter-notice" style={{ margin: '0 0 8px' }}>{message}</p>}

      {loading && !selectedTable && (
        <p className="waiter-empty">Loading table data…</p>
      )}

      {/* ── Detail grid ── */}
      {selectedTable && (
        <div className="waiter-detail-grid" style={{ flex: 1 }}>
          {/* Left: Orders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111c2d', paddingBottom: 12, borderBottom: '1px solid #d8e3fb' }}>
              Active Orders
              {tableOrders.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, background: '#e7eeff', color: '#3a485b', padding: '2px 10px', borderRadius: 999 }}>
                  {tableOrders.length}
                </span>
              )}
            </h2>

            {tableOrders.length === 0 && (
              <div className="waiter-empty" style={{ textAlign: 'center', padding: 32 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3, display: 'block', marginBottom: 8 }}>receipt_long</span>
                No active orders for this table.
              </div>
            )}

            {tableOrders.map((order) => {
              const oid = documentId(order);
              const accent = statusColor[order.status] ?? '#dbc2b0';
              return (
                <div key={oid} className="waiter-card" style={{ overflow: 'hidden', borderTop: `4px solid ${accent}` }}>
                  {/* Order header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f9f9ff', borderBottom: '1px solid rgba(219,194,176,0.3)' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.05em', color: '#554336', textTransform: 'uppercase' }}>
                      Order {order.orderNo}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: accent + '20', color: accent, textTransform: 'capitalize' }}>
                      {order.status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  {/* Items */}
                  <div>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 16px', borderBottom: '1px solid rgba(216,227,251,0.4)', background: '#fff', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: order.status === 'served' ? '#887364' : '#111c2d', textDecoration: order.status === 'served' ? 'line-through' : 'none' }}>
                            {item.quantity}× {item.name}
                          </span>
                          {item.variantLabel && (
                            <span style={{ display: 'block', fontSize: 12, color: '#515f74', marginTop: 2 }}>{item.variantLabel}</span>
                          )}
                          {item.notes && (
                            <span style={{ display: 'block', fontSize: 12, color: '#ba1a1a', marginTop: 2 }}>⚠ {item.notes}</span>
                          )}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111c2d', whiteSpace: 'nowrap' }}>
                          {money(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f9f9ff' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111c2d' }}>Total: {money(order.grandTotal)}</span>
                    {order.status === 'ready' && (
                      <button
                        type="button"
                        disabled={busyOrderId === oid}
                        onClick={() => void markServed(order)}
                        className="waiter-success-button"
                        style={{ minHeight: 36, padding: '6px 14px', fontSize: 12 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                        Mark Served
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Requests + Bill summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Active Requests */}
            <div className="waiter-card" style={{ overflow: 'hidden', borderTop: tableRequests.length > 0 ? '4px solid #ba1a1a' : '4px solid #dbc2b0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: tableRequests.length > 0 ? '#fff3f1' : '#f9f9ff', borderBottom: '1px solid rgba(219,194,176,0.3)' }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: tableRequests.length > 0 ? '#ba1a1a' : '#554336', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>campaign</span>
                  Active Requests
                </h3>
                <span style={{ fontSize: 12, fontWeight: 700, background: tableRequests.length > 0 ? '#ffdad6' : '#e7eeff', color: tableRequests.length > 0 ? '#ba1a1a' : '#515f74', padding: '2px 8px', borderRadius: 999 }}>
                  {tableRequests.length}
                </span>
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tableRequests.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#887364', textAlign: 'center', padding: '8px 0' }}>No open requests.</p>
                ) : tableRequests.map((req) => {
                  const rid = documentId(req);
                  return (
                    <div key={rid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', border: '1px solid #ffdad6', borderRadius: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111c2d', textTransform: 'capitalize' }}>
                        {req.requestType.replaceAll('_', ' ')}
                      </span>
                      <button
                        type="button"
                        disabled={busyRequestId === rid}
                        onClick={() => void resolveRequest(req)}
                        className="waiter-primary-button"
                        style={{ minHeight: 30, padding: '4px 10px', fontSize: 11 }}
                      >
                        Resolve
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="waiter-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(219,194,176,0.3)', background: '#f9f9ff' }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#554336', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
                  Bill Summary
                </h3>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#515f74' }}>
                  <span>Subtotal</span><span>{money(subTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#515f74' }}>
                  <span>Tax</span><span>{money(taxTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#111c2d', paddingTop: 10, borderTop: '1px solid #d8e3fb', marginTop: 4 }}>
                  <span>Total</span><span>{money(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
