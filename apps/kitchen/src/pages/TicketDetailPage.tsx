import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLiveOrders, orderId, updateOrderStatus, type LiveOrder } from '../lib/api-client';
import { defaultBranchId, readSession } from '../lib/session';

function elapsed(submittedAt?: string): string {
  if (!submittedAt) return '--';
  const mins = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 60000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<LiveOrder | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const session = useMemo(() => readSession(), []);
  const branchId = useMemo(() => defaultBranchId(), []);

  useEffect(() => {
    if (!session?.accessToken || !branchId) { setMessage('Sign in first.'); return; }
    getLiveOrders(branchId, session.accessToken)
      .then((orders) => {
        const found = orders.find(o => orderId(o) === id);
        if (found) setOrder(found);
        else setMessage('Ticket not found.');
      })
      .catch((err: any) => setMessage(err.message));
  }, [id]);

  async function markReady(): Promise<void> {
    if (!session?.accessToken || !order) return;
    setBusy(true);
    try {
      await updateOrderStatus(orderId(order), 'ready', session.accessToken);
      navigate('/board');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleItem(idx: number) {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  const readyCount = checkedItems.size;
  const totalCount = order?.items.length ?? 0;
  const progress = totalCount > 0 ? (readyCount / totalCount) * 100 : 0;
  const timeWaiting = elapsed(order?.submittedAt);

  const s = { fontFamily: "'Work Sans', sans-serif" };

  return (
    <div style={{ ...s, minHeight: '100vh', background: '#f9f9ff', display: 'flex', flexDirection: 'column' }}>
      {/* Header Actions */}
      <header style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'sticky', top: 0, zIndex: 40 }}>
        <button type="button" onClick={() => navigate('/board')} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#515f74', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          Back to Orders
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0f3ff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#515f74', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>print</span>
          </button>
          <button type="button" style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0f3ff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#515f74', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
          </button>
        </div>
      </header>

      {message && !order && (
        <div style={{ padding: 24, color: '#ba1a1a', background: '#ffdad6', margin: 24, borderRadius: 8 }}>{message}</div>
      )}

      {order && (
        <main style={{ flex: 1, maxWidth: 960, width: '100%', margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* On desktop: two columns */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Ticket Summary Card */}
              <section style={{ background: '#ffffff', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderTop: '4px solid #825100' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 36, fontWeight: 700, color: '#111c2d', margin: 0, marginBottom: 4 }}>Order {order.orderNo}</h1>
                    <p style={{ fontSize: 14, color: '#515f74', margin: 0 }}>Table {order.tableId?.slice(-3) ?? '--'} • {new Date().toLocaleTimeString()}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(130,81,0,0.1)', padding: '6px 14px', borderRadius: 999 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#825100', display: 'inline-block' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: '#825100', textTransform: 'uppercase' }}>{order.status}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(186,26,26,0.08)', padding: '12px 16px', borderRadius: 8, border: '1px solid #ffdad6' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: 20, fontVariationSettings: "'FILL' 1" }}>timer</span>
                  <span style={{ fontSize: 15, color: '#ba1a1a', fontWeight: 500 }}>{timeWaiting} waiting</span>
                </div>
              </section>

              {/* Items List */}
              <section style={{ background: '#ffffff', borderRadius: 12, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)', flex: 1 }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111c2d', margin: 0, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e7eeff' }}>Items</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {order.items.map((item, idx) => {
                    const checked = checkedItems.has(idx);
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: 16, borderRadius: 8, border: `1px solid ${checked ? 'rgba(141,75,0,0.2)' : '#e7eeff'}`, background: checked ? 'rgba(141,75,0,0.03)' : '#f9f9ff', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 20, fontWeight: 700, color: '#8d4b00' }}>{item.quantity}x</span>
                            <div>
                              <h3 style={{ fontSize: 16, fontWeight: 600, color: checked ? '#887364' : '#111c2d', margin: 0, textDecoration: checked ? 'line-through' : 'none' }}>{item.name}</h3>
                              {item.variantLabel && <p style={{ fontSize: 13, color: '#515f74', margin: '2px 0 0' }}>{item.variantLabel}</p>}
                            </div>
                          </div>
                          <button type="button" onClick={() => toggleItem(idx)} title={checked ? 'Unmark' : 'Mark ready'}
                            style={{ width: 32, height: 32, borderRadius: '50%', border: checked ? '1px solid rgba(141,75,0,0.3)' : '1px solid #dbc2b0', background: checked ? 'rgba(141,75,0,0.1)' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: checked ? '#8d4b00' : '#515f74', transition: 'all 0.2s' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: checked ? "'FILL' 1" : "'FILL' 0" }}>check</span>
                          </button>
                        </div>
                        {item.notes && (
                          <div style={{ marginLeft: 40, display: 'flex', alignItems: 'center', gap: 8, background: '#f0f3ff', padding: '4px 10px', borderRadius: 6 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#515f74' }}>edit_note</span>
                            <span style={{ fontSize: 13, color: '#554336', fontStyle: 'italic' }}>"{item.notes}"</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Action Panel */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: 0, marginBottom: 12, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: '#515f74', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>speaker_notes</span>Order Notes
                </h3>
                {order.notes ? (
                  <p style={{ margin: 0, fontSize: 14, color: '#111c2d', background: '#fff8eb', padding: 12, borderRadius: 6, border: '1px solid #f7d397' }}>
                    {order.notes}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: '#887364', fontStyle: 'italic' }}>No special notes for this order.</p>
                )}
              </div>

              <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: '#515f74' }}>Items Ready</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111c2d' }}>{readyCount} / {totalCount}</span>
                  </div>
                  <div style={{ background: '#e7eeff', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#825100', borderRadius: 999, width: `${progress}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
                <button type="button" disabled={busy} onClick={() => void markReady()}
                  style={{ width: '100%', padding: '20px 16px', background: busy ? '#b5895c' : '#8d4b00', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 18, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(141,75,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.2s' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, fontVariationSettings: "'FILL' 1" }}>local_dining</span>
                  Mark Order Ready
                </button>
              </div>
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
