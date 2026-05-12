import { io, type Socket } from 'socket.io-client';
import { API_BASE, getAccessToken } from './client';

// Strip "/api/v1" off the base for the socket URL.
const WS_URL = API_BASE.replace(/\/api\/v1\/?$/, '');

let socket: Socket | null = null;
type Handler = (payload: any) => void;
const handlers = new Map<string, Set<Handler>>();

function attachHandlers() {
  if (!socket) return;
  for (const [event, fns] of handlers.entries()) {
    socket.off(event);
    for (const fn of fns) socket.on(event, fn);
  }
}

export function connectRealtime() {
  if (socket?.connected) return;
  const token = getAccessToken();
  if (!token) return;
  socket?.disconnect();
  socket = io(`${WS_URL}/realtime`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
  });
  attachHandlers();
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

export function onRealtime(event: string, fn: Handler): () => void {
  let set = handlers.get(event);
  if (!set) { set = new Set(); handlers.set(event, set); }
  set.add(fn);
  socket?.on(event, fn);
  return () => {
    set!.delete(fn);
    socket?.off(event, fn);
  };
}

export function isConnected(): boolean {
  return !!socket?.connected;
}
