import { io, type Socket } from 'socket.io-client';

const realtimeUrl = (): string => {
  const value = process.env.NEXT_PUBLIC_REALTIME_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  if (typeof window === 'undefined') {
    return value;
  }

  const url = new URL(value);
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname) && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    url.hostname = window.location.hostname;
  }

  return url.toString();
};

export const createSocketClient = (token?: string): Socket =>
  io(realtimeUrl(), {
    autoConnect: false,
    auth: { token },
  });
