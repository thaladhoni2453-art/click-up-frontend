import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api, setAccessToken } from "../lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface AuthContextType {
  user: any;
  workspaces: any[];
  loading: boolean;
  login: (credentials: any) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setWorkspaces(data.workspaces);
    } catch (e) {
      setUser(null);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleGlobalLogout = () => {
      setUser(null);
      setWorkspaces([]);
    };

    window.addEventListener("ww:logout", handleGlobalLogout);
    return () => window.removeEventListener("ww:logout", handleGlobalLogout);
  }, []);

  const login = async (credentials: any) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", credentials);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setWorkspaces(data.workspaces);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (regData: any) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", regData);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setWorkspaces([data.workspace]);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // Ignore errors on logout
    }
    setAccessToken(null);
    setUser(null);
    setWorkspaces([]);
  };

  const refreshWorkspaces = async () => {
    try {
      const { data } = await api.get("/workspaces");
      setWorkspaces(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, workspaces, loading, login, register, logout, refreshWorkspaces }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
export { queryClient };
