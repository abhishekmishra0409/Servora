import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { documentId, getLiveOrders, getServiceRequests, getTables, type LiveOrder, type ServiceRequest, type TableSummary } from '../lib/api-client';
import { defaultBranchId, readSession } from '../lib/session';

const tableId = (table: TableSummary): string => documentId(table);
const tableLabel = (tableIdValue: string, tables: TableSummary[]): string =>
  tables.find((table) => tableId(table) === tableIdValue)?.tableNo ?? tableIdValue.slice(-4);

function tableState(table: TableSummary, orders: LiveOrder[], requests: ServiceRequest[]): 'request' | 'ready' | 'occupied' | 'available' {
  const id = tableId(table);
  if (requests.some((request) => String(request.tableId) === id)) return 'request';
  if (orders.some((order) => String(order.tableId) === id && order.status === 'ready')) return 'ready';
  if (orders.some((order) => String(order.tableId) === id) || ['occupied', 'preparing', 'waiting_confirmation'].includes(table.status)) return 'occupied';
  return 'available';
}

export function TablesPage() {
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [message, setMessage] = useState('Loading waiter floor...');
  const session = useMemo(() => readSession(), []);
  const branchId = useMemo(() => defaultBranchId(), []);

  async function load(): Promise<void> {
    if (!session?.accessToken || !branchId) {
      setMessage('Sign in first. Branch ID will be saved after login.');
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
      setMessage(nextTables.length ? '' : 'No tables found for this branch.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load waiter floor.');
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const counts = {
    available: tables.filter((table) => tableState(table, orders, requests) === 'available').length,
    occupied: tables.filter((table) => tableState(table, orders, requests) === 'occupied').length,
    ready: tables.filter((table) => tableState(table, orders, requests) === 'ready').length,
    requests: requests.length,
  };

  return (
    <>
      <header className="waiter-page-head">
        <div>
          <h1>Floor Plan</h1>
          <p>Live overview of table state, active orders, and service requests.</p>
          {message ? <p className="waiter-notice">{message}</p> : null}
        </div>
        <div className="waiter-toolbar">
          <span className="waiter-chip waiter-chip--active"><span className="material-symbols-outlined">table_restaurant</span>{tables.length} tables</span>
          <span className="waiter-chip"><span className="material-symbols-outlined">notifications_active</span>{counts.requests} requests</span>
          <button className="waiter-secondary-button" onClick={() => void load()} type="button">
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className="waiter-panel"><strong className="text-2xl">{counts.available}</strong><p className="text-sm text-on-surface-variant">Available</p></article>
        <article className="waiter-panel"><strong className="text-2xl">{counts.occupied}</strong><p className="text-sm text-on-surface-variant">Occupied</p></article>
        <article className="waiter-panel"><strong className="text-2xl">{counts.ready}</strong><p className="text-sm text-on-surface-variant">Ready</p></article>
        <article className="waiter-panel"><strong className="text-2xl">{counts.requests}</strong><p className="text-sm text-on-surface-variant">Needs service</p></article>
      </section>

      <section className="grid grid-cols-2 gap-gutter md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tables.map((table) => {
          const id = tableId(table);
          const state = tableState(table, orders, requests);
          const tableOrders = orders.filter((order) => String(order.tableId) === id);
          const tableRequests = requests.filter((request) => String(request.tableId) === id);
          const cardClass = {
            available: '',
            occupied: 'waiter-table-card--occupied',
            ready: 'waiter-table-card--ready',
            request: 'waiter-table-card--request',
          }[state];

          return (
            <article className={`waiter-card waiter-table-card ${cardClass}`} key={id}>
              <div className="waiter-table-card__head">
                <div>
                  <h3>T{table.tableNo}</h3>
                  <p className="mt-2 flex items-center gap-1 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    {table.capacity} seats
                  </p>
                </div>
                {state === 'request' ? (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-error" />
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col justify-center gap-3">
                {state === 'request' ? (
                  <span className="waiter-status waiter-status--danger">
                    <span className="material-symbols-outlined filled text-[16px]">notifications_active</span>
                    Service request
                  </span>
                ) : null}
                {state === 'ready' ? (
                  <span className="waiter-status waiter-status--success">
                    <span className="material-symbols-outlined text-[16px]">room_service</span>
                    Ready to serve
                  </span>
                ) : null}
                {state === 'occupied' ? (
                  <span className="waiter-status waiter-status--primary">
                    <span className="material-symbols-outlined text-[16px]">restaurant</span>
                    Active table
                  </span>
                ) : null}
                {state === 'available' ? (
                  <div className="grid justify-items-center gap-2 py-4">
                    <span className="material-symbols-outlined text-[34px] text-outline-variant">chair_alt</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">Available</span>
                  </div>
                ) : null}
                {tableOrders.length ? <p className="text-sm text-on-surface-variant">{tableOrders.length} active order(s)</p> : null}
                {tableRequests[0] ? <p className="text-sm text-error">{tableRequests[0].requestType.replaceAll('_', ' ')}</p> : null}
              </div>

              <Link className={state === 'available' ? 'waiter-secondary-button w-full' : 'waiter-primary-button w-full'} to={`/table-detail/${id}`}>
                <span className="material-symbols-outlined">{state === 'available' ? 'person_add' : 'manage_search'}</span>
                {state === 'available' ? 'Seat guests' : `Manage T${table.tableNo}`}
              </Link>
            </article>
          );
        })}
      </section>
    </>
  );
}
