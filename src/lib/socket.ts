import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let currentToken: string | null = null;

export const getSocket = (): Socket => {
  const token = localStorage.getItem("ww_access_token") || localStorage.getItem("accessToken");

  if (!socket || token !== currentToken) {
    if (socket) {
      console.log("[Main Socket] Token changed or socket reset, disconnecting old socket...");
      socket.disconnect();
    }
    currentToken = token;
    socket = io("http://techmans.me/", {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on("connect_error", async (err) => {
      if (err.message === "Unauthorized" || err.message === "Invalid token") {
        console.warn("[Main Socket] Authentication error on connection. Attempting token refresh...");
        const refreshToken = localStorage.getItem("ww_refresh_token") || localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const response = await fetch("http://techmans.me//api/auth/refresh", {
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
                console.log("[Main Socket] Token refreshed successfully. Reconnecting socket...");
                if (socket) {
                  socket.auth = { token: data.accessToken };
                  socket.connect();
                }
                return;
              }
            }
          } catch (refreshErr) {
            console.error("[Main Socket] Failed to refresh token on connection error", refreshErr);
          }
        }
        window.dispatchEvent(new Event("ww:logout"));
      }
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
