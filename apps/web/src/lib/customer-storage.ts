import type { GuestSession, SubmittedOrder } from './api-client';

export interface GuestServiceRequest {
  createdAt: string;
  message?: string;
  requestId?: string;
  requestType: string;
  statusLabel: string;
  tableSessionId?: string;
}

const sessionKey = (qrToken: string): string => `restaurent:guest:${qrToken}`;
const orderKey = (qrToken: string): string => `restaurent:order:${qrToken}`;
const ordersKey = (qrToken: string): string => `restaurent:orders:${qrToken}`;
const serviceRequestKey = (qrToken: string): string => `restaurent:service-request:${qrToken}`;

export function readGuestSession(qrToken: string): GuestSession | null {
  const stored = window.sessionStorage.getItem(sessionKey(qrToken));
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as GuestSession;
  } catch {
    window.sessionStorage.removeItem(sessionKey(qrToken));
    return null;
  }
}

export function writeGuestSession(qrToken: string, session: GuestSession): void {
  window.sessionStorage.setItem(sessionKey(qrToken), JSON.stringify(session));
}

export function clearGuestSession(qrToken: string): void {
  window.sessionStorage.removeItem(sessionKey(qrToken));
}

export function readSubmittedOrder(qrToken: string): SubmittedOrder | null {
  const raw = window.sessionStorage.getItem(orderKey(qrToken));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SubmittedOrder;
  } catch {
    window.sessionStorage.removeItem(orderKey(qrToken));
    return null;
  }
}

export function writeSubmittedOrder(qrToken: string, order: SubmittedOrder): void {
  window.sessionStorage.setItem(orderKey(qrToken), JSON.stringify(order));
  writeSubmittedOrders(qrToken, [order, ...readSubmittedOrders(qrToken)]);
}

export function readSubmittedOrders(qrToken: string): SubmittedOrder[] {
  const raw = window.sessionStorage.getItem(ordersKey(qrToken));
  const legacyOrder = readSubmittedOrder(qrToken);

  if (!raw) {
    return legacyOrder ? [legacyOrder] : [];
  }

  try {
    const orders = JSON.parse(raw) as SubmittedOrder[];
    const mergedOrders = legacyOrder ? [legacyOrder, ...orders] : orders;
    return uniqueSubmittedOrders(mergedOrders);
  } catch {
    window.sessionStorage.removeItem(ordersKey(qrToken));
    return legacyOrder ? [legacyOrder] : [];
  }
}

function writeSubmittedOrders(qrToken: string, orders: SubmittedOrder[]): void {
  window.sessionStorage.setItem(ordersKey(qrToken), JSON.stringify(uniqueSubmittedOrders(orders)));
}

function uniqueSubmittedOrders(orders: SubmittedOrder[]): SubmittedOrder[] {
  const byId = new Map<string, SubmittedOrder>();

  for (const order of orders) {
    byId.set(order.orderId, order);
  }

  return [...byId.values()];
}

export function readRecentServiceRequest(qrToken: string): GuestServiceRequest | null {
  const raw = window.sessionStorage.getItem(serviceRequestKey(qrToken));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as GuestServiceRequest;
  } catch {
    window.sessionStorage.removeItem(serviceRequestKey(qrToken));
    return null;
  }
}

export function writeRecentServiceRequest(qrToken: string, request: GuestServiceRequest): void {
  window.sessionStorage.setItem(serviceRequestKey(qrToken), JSON.stringify(request));
}

export function clearRecentServiceRequest(qrToken: string): void {
  window.sessionStorage.removeItem(serviceRequestKey(qrToken));
}
