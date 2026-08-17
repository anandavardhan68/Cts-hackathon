import { io } from 'socket.io-client';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:4000';

export const socket = io(GATEWAY_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});