import { io, type Socket } from 'socket.io-client';

const realtimeUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_REALTIME_URL || process.env.NEXT_PUBLIC_API_URL || '';
  if (configured) return configured;

  // Blank config → connect to the same origin as the page. In the browser this
  // rides the Next.js /socket.io proxy, so no host/IP is baked in. During SSR
  // (no window) fall back to the local API port.
  return typeof window === 'undefined' ? 'http://localhost:4000' : window.location.origin;
};

export const createSocketClient = (token?: string): Socket =>
  io(realtimeUrl(), {
    autoConnect: false,
    auth: { token },
  });
