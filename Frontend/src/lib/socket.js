import { io } from "socket.io-client";


const provideSocketAuthentication = (callback) => {
  callback({
    token: localStorage.getItem("token") || "",
  });
};


export const socket = io("http://127.0.0.1:8000", {
  transports: ["polling", "websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  auth: provideSocketAuthentication,
});


export const reconnectAuthenticatedSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }

  socket.connect();
};


export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};