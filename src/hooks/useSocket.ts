import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;
let currentToken: string | null = null;

const getSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Strip trailing /api if present to get root backend url for websockets
    return envUrl.endsWith("/api") ? envUrl.slice(0, -4) : envUrl;
  }
  return "http://localhost:3000";
};

export const getSocket = (): Socket => {
  const token = localStorage.getItem("ww_access_token") || localStorage.getItem("accessToken");
  const socketUrl = getSocketUrl();

  if (!socketInstance || token !== currentToken) {
    if (socketInstance) {
      console.log("[Chat Socket] Token changed or socket reset, disconnecting old socket...");
      socketInstance.disconnect();
    }
    currentToken = token;
    socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socketInstance.on("connect_error", async (err) => {
      if (err.message === "Unauthorized" || err.message === "Invalid token") {
        console.warn("[Chat Socket] Authentication error on connection. Attempting token refresh...");
        const refreshToken = localStorage.getItem("ww_refresh_token") || localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
            const refreshUrl = baseUrl.endsWith("/api") ? `${baseUrl}/auth/refresh` : `${baseUrl}/api/auth/refresh`;
            
            const response = await fetch(refreshUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken })
            });
            if (response.ok) {
              const data = await response.json();
              if (data.accessToken) {
                localStorage.setItem("ww_access_token", data.accessToken);
                localStorage.setItem("accessToken", data.accessToken);
                if (data.refreshToken) {
                  localStorage.setItem("ww_refresh_token", data.refreshToken);
                  localStorage.setItem("refreshToken", data.refreshToken);
                }
                console.log("[Chat Socket] Token refreshed successfully. Reconnecting socket...");
                if (socketInstance) {
                  socketInstance.auth = { token: data.accessToken };
                  socketInstance.connect();
                }
                return;
              }
            }
          } catch (refreshErr) {
            console.error("[Chat Socket] Failed to refresh token on connection error", refreshErr);
          }
        }
        window.dispatchEvent(new Event("ww:logout"));
      }
    });

    console.log(`[Chat Socket] Initialized connection to ${socketUrl} with token: ${token ? "exists" : "none"}`);
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
