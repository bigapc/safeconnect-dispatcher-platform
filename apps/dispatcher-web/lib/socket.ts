import { io, type Socket } from 'socket.io-client';
import { env } from './env';

type RealtimeEventHandler = (payload: unknown) => void;

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (socketInstance) {
    return socketInstance;
  }

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('safeconnect_access_token') : null;

  socketInstance = io(env.NEXT_PUBLIC_SOCKET_URL ?? env.NEXT_PUBLIC_API_URL, {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4_000,
  });

  return socketInstance;
};

export const subscribeRealtimeEvents = (
  events: string[],
  handler: RealtimeEventHandler,
): (() => void) => {
  const socket = getSocket();

  for (const event of events) {
    socket.on(event, handler);
  }

  return () => {
    for (const event of events) {
      socket.off(event, handler);
    }
  };
};

export const subscribeConnectionState = (
  onConnected: () => void,
  onDisconnected: () => void,
): (() => void) => {
  const socket = getSocket();

  socket.on('connect', onConnected);
  socket.on('disconnect', onDisconnected);

  return () => {
    socket.off('connect', onConnected);
    socket.off('disconnect', onDisconnected);
  };
};
