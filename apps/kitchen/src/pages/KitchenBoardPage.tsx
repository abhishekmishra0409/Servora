import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLiveOrders, orderId, updateOrderStatus, type LiveOrder } from '../lib/api-client';
import { clearSession, defaultBranchId, readSession } from '../lib/session';
import { kitchenSocket } from '../lib/socket';

const LANES = [
  { status: 'accepted',  label: 'Accepted',  next: 'preparing', icon: 'inbox',                nextLabel: 'Start Preparing', mod: 'accepted'  },
  { status: 'preparing', label: 'Preparing', next: 'ready',     icon: 'local_fire_department', nextLabel: 'Mark Ready',      mod: 'preparing' },
  { status: 'ready',     label: 'Ready',     next: 'served',    icon: 'done_all',              nextLabel: 'Clear Ticket',    mod: 'ready'     },
];

function elapsed(submittedAt?: string): string {
  if (!submittedAt) return '--';
  const mins = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 60000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function isUrgent(submittedAt?: string): boolean {
  if (!submittedAt) return false;
  return Math.floor((Date.now() - new Date(submittedAt).getTime()) / 60000) > 10;
}

export function KitchenBoardPage() {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const session = useMemo(() => readSession(), []);
  const branchId = useMemo(() => defaultBranchId(), []);
  const navigate = useNavigate();

  async function load(): Promise<void> {
    if (!session?.accessToken || !branchId) { setMessage('Sign in first.'); return; }
    try {
      const all = await getLiveOrders(branchId, session.accessToken);
      setOrders(all.filter(o => ['accepted', 'preparing', 'ready'].includes(o.status)));
      setMessage('');
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 30000);
    const socket = session?.accessToken ? kitchenSocket(session.accessToken) : null;
    socket?.on('order.created', () => void load());
    socket?.on('order.status_updated', () => void load());
    socket?.connect();
    return () => {
      window.clearInterval(t);
      socket?.disconnect();
    };
  }, []);

  async function advance(order: LiveOrder, next: string): Promise<void> {
    if (!session?.accessToken) return;
    const id = orderId(order);
    setBusyId(id);
    try {
      await updateOrderStatus(id, next, session.accessToken);
      await load();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="kitchen-shell">
      {/* ── Top App Bar ── */}
      <header className="waiter-topbar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="material-symbols-outlined filled" style={{ color: '#b15f00' }}>soup_kitchen</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#111c2d' }}>Kitchen Display</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e7eeff', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#554336' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            LIVE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {message && <span style={{ fontSize: 12, color: '#ba1a1a', background: '#ffdad6', padding: '4px 10px', borderRadius: 6 }}>{message}</span>}
          <span style={{ fontSize: 13, color: '#515f74' }}>{orders.length} active</span>
          <Link to="/settings" className="waiter-icon-button" title="Settings" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined">settings</span>
          </Link>
          <button type="button" className="waiter-icon-button" onClick={() => { clearSession(); navigate('/'); }} title="Sign Out">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* ── Kanban Board ── */}
      <div className="kitchen-board">
        {LANES.map((lane) => {
          const laneOrders = orders.filter(o => o.status === lane.status);
          const isReady = lane.status === 'ready';
          const isPreparing = lane.status === 'preparing';

          return (
            <div key={lane.status} className={`kitchen-lane kitchen-lane--${lane.mod}`}>
              {/* Column Header */}
              <div className="kitchen-lane__header">
                <div className="kitchen-lane__title">
                  <span className="material-symbols-outlined" style={{ color: isReady ? '#16a34a' : isPreparing ? '#8d4b00' : '#554336' }}>
                    {lane.icon}
                  </span>
                  <h3>{lane.label}</h3>
                </div>
                <span className="kitchen-lane__count">{laneOrders.length}</span>
              </div>

              {/* Ticket scroll area */}
              <div className="kitchen-tickets">
                {laneOrders.map((order) => {
                  const id = orderId(order);
                  const urgent = isUrgent(order.submittedAt);
                  const time = elapsed(order.submittedAt);
                  const isBusy = busyId === id;

                  const ticketMod = isReady ? 'ready' : isPreparing ? 'preparing' : urgent ? 'urgent' : 'normal';

                  return (
                    <div key={id} className={`kitchen-ticket kitchen-ticket--${ticketMod}`}>
                      {urgent && <div className="kitchen-ticket__accent" />}

                      {/* Ticket Header */}
                      <div className="kitchen-ticket__head">
                        <div>
                          {urgent && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#ba1a1a', display: 'block', marginBottom: 4 }}>URGENT</span>}
                          {isPreparing && !urgent && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#825100', display: 'block', marginBottom: 4 }}>PREPARING</span>}
                          {isReady && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#16a34a', display: 'block', marginBottom: 4 }}>WAITING RUNNER</span>}
                          <span className="kitchen-ticket__table">T{order.tableId?.slice(-2) ?? '--'}</span>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                          <span className={`kitchen-ticket__badge kitchen-ticket__badge--${urgent ? 'urgent' : isReady ? 'ready' : 'normal'}`}>{time}</span>
                          <span style={{ fontSize: 11, color: '#887364', letterSpacing: '0.04em' }}>#{order.orderNo}</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        {order.items.map((item, i) => (
                          <div key={i} className="kitchen-item-row">
                            <span className="kitchen-item-row__qty">{item.quantity}</span>
                            <div style={{ flex: 1 }}>
                              <span className="kitchen-item-row__name">{item.name}</span>
                              {item.variantLabel && <span style={{ display: 'block', fontSize: 12, color: '#554336' }}>{item.variantLabel}</span>}
                              {item.notes && <span className="kitchen-item-row__note">"{item.notes}"</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      {isPreparing ? (
                        <div className="kitchen-ticket__actions" style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8 }}>
                          <button type="button" style={{ height: 44, borderRadius: 6, background: '#e7eeff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#554336' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span>
                          </button>
                          <Link to={`/ticket/${id}`} className="kitchen-btn-primary" style={{ textDecoration: 'none' }}>
                            View Ticket <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                          </Link>
                        </div>
                      ) : isReady ? (
                        <button type="button" disabled={isBusy} onClick={() => void advance(order, lane.next)} className="kitchen-btn-green">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                          Clear Ticket
                        </button>
                      ) : urgent ? (
                        <button type="button" disabled={isBusy} onClick={() => void advance(order, lane.next)} className="kitchen-btn-primary">
                          Start Preparing
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                        </button>
                      ) : (
                        <button type="button" disabled={isBusy} onClick={() => void advance(order, lane.next)} className="kitchen-btn-outline">
                          Start Preparing
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                {laneOrders.length === 0 && (
                  <div className="kitchen-empty">
                    <span className="material-symbols-outlined">inbox</span>
                    <span style={{ fontSize: 13 }}>No tickets</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
