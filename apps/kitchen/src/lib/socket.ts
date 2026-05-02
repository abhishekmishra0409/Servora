import { io } from 'socket.io-client';

const realtimeUrl = (): string => {
  const url = new URL(import.meta.env.VITE_REALTIME_URL ?? 'http://localhost:4001');
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname) && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    url.hostname = window.location.hostname;
  }

  return url.toString();
};

export const kitchenSocket = (token?: string) =>
  io(realtimeUrl(), {
    autoConnect: false,
    auth: { token },
  });
