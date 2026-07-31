import { io } from "socket.io-client";

export const socket = io("http://127.0.0.1:8000", {
  transports: ["polling", "websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});