import type { GuestSession, SubmittedOrder } from './api-client';

export interface GuestServiceRequest {
  createdAt: string;
  message?: string;
  requestType: string;
  statusLabel: string;
}

const sessionKey = (qrToken: string): string => `restaurent:guest:${qrToken}`;
const orderKey = (qrToken: string): string => `restaurent:order:${qrToken}`;
const ordersKey = (qrToken: string): string => `restaurent:orders:${qrToken}`;
const serviceRequestKey = (qrToken: string): string => `restaurent:service-request:${qrToken}`;
const cookieSafeToken = (qrToken: string): string => qrToken.replace(/[^a-zA-Z0-9_-]/g, '_');

export const guestSessionCookieName = (qrToken: string): string => `restaurent_guest_${cookieSafeToken(qrToken)}`;

const readCookie = (name: string): string | null => {
  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
};

export function readGuestSession(qrToken: string): GuestSession | null {
  const raw = window.localStorage.getItem(sessionKey(qrToken));
  const cookie = readCookie(guestSessionCookieName(qrToken));
  const stored = cookie ?? raw;
  if (!stored) {
    return null;
  }

  try {
    const session = JSON.parse(stored) as GuestSession;
    if (stored !== raw) {
      window.localStorage.setItem(sessionKey(qrToken), JSON.stringify(session));
    }
    return session;
  } catch {
    window.localStorage.removeItem(sessionKey(qrToken));
    return null;
  }
}

export function writeGuestSession(qrToken: string, session: GuestSession): void {
  const serialized = JSON.stringify(session);
  window.localStorage.setItem(sessionKey(qrToken), serialized);
  document.cookie = `${guestSessionCookieName(qrToken)}=${encodeURIComponent(serialized)}; Path=/; Max-Age=21600; SameSite=Lax`;
}

export function clearGuestSession(qrToken: string): void {
  window.localStorage.removeItem(sessionKey(qrToken));
  document.cookie = `${guestSessionCookieName(qrToken)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readSubmittedOrder(qrToken: string): SubmittedOrder | null {
  const raw = window.localStorage.getItem(orderKey(qrToken));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SubmittedOrder;
  } catch {
    window.localStorage.removeItem(orderKey(qrToken));
    return null;
  }
}

export function writeSubmittedOrder(qrToken: string, order: SubmittedOrder): void {
  window.localStorage.setItem(orderKey(qrToken), JSON.stringify(order));
  writeSubmittedOrders(qrToken, [order, ...readSubmittedOrders(qrToken)]);
}

export function readSubmittedOrders(qrToken: string): SubmittedOrder[] {
  const raw = window.localStorage.getItem(ordersKey(qrToken));
  const legacyOrder = readSubmittedOrder(qrToken);

  if (!raw) {
    return legacyOrder ? [legacyOrder] : [];
  }

  try {
    const orders = JSON.parse(raw) as SubmittedOrder[];
    const mergedOrders = legacyOrder ? [legacyOrder, ...orders] : orders;
    return uniqueSubmittedOrders(mergedOrders);
  } catch {
    window.localStorage.removeItem(ordersKey(qrToken));
    return legacyOrder ? [legacyOrder] : [];
  }
}

function writeSubmittedOrders(qrToken: string, orders: SubmittedOrder[]): void {
  window.localStorage.setItem(ordersKey(qrToken), JSON.stringify(uniqueSubmittedOrders(orders)));
}

function uniqueSubmittedOrders(orders: SubmittedOrder[]): SubmittedOrder[] {
  const byId = new Map<string, SubmittedOrder>();

  for (const order of orders) {
    byId.set(order.orderId, order);
  }

  return [...byId.values()];
}

export function readRecentServiceRequest(qrToken: string): GuestServiceRequest | null {
  const raw = window.localStorage.getItem(serviceRequestKey(qrToken));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as GuestServiceRequest;
  } catch {
    window.localStorage.removeItem(serviceRequestKey(qrToken));
    return null;
  }
}

export function writeRecentServiceRequest(qrToken: string, request: GuestServiceRequest): void {
  window.localStorage.setItem(serviceRequestKey(qrToken), JSON.stringify(request));
}
