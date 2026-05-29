import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io("http://localhost:3000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
  }
  return socket;
};

export const joinWorkspace = (workspaceId: string) => {
  const s = getSocket();
  s.emit("join:workspace", workspaceId);
};

export const joinTask = (taskId: string) => {
  const s = getSocket();
  s.emit("join:task", taskId);
};
