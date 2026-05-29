import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

const getSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Strip trailing /api if present to get root backend url for websockets
    return envUrl.endsWith("/api") ? envUrl.slice(0, -4) : envUrl;
  }
  return "http://localhost:3000";
};

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const socketUrl = getSocketUrl();
    const token = localStorage.getItem("ww_access_token") || localStorage.getItem("accessToken");
    
    socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    console.log(`[Chat Socket] Initialized connection to ${socketUrl}`);
  }
  return socketInstance;
};

export const useSocket = (handlers?: Record<string, (data: any) => void>) => {
  const socket = getSocket();

  useEffect(() => {
    if (!handlers) return;

    Object.entries(handlers).forEach(([event, callback]) => {
      socket.on(event, callback);
    });

    return () => {
      Object.entries(handlers).forEach(([event, callback]) => {
        socket.off(event, callback);
      });
    };
  }, [handlers, socket]);

  const emit = (event: string, data: any) => {
    socket.emit(event, data);
  };

  const joinChannel = (channelId: string) => {
    socket.emit("channel:join", { channelId });
  };

  const leaveChannel = (channelId: string) => {
    socket.emit("channel:leave", { channelId });
  };

  const startTyping = (channelId: string) => {
    socket.emit("typing:start", { channelId });
  };

  const stopTyping = (channelId: string) => {
    socket.emit("typing:stop", { channelId });
  };

  const markRead = (channelId: string) => {
    socket.emit("channel:read", { channelId });
  };

  return {
    emit,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
    markRead,
    socket
  };
};

export default useSocket;
