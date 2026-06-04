import axios from "axios";

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || "https://techmans.me";
  const cleanUrl = envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ww_access_token") || localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("ww_refresh_token") || localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
          const { accessToken: newToken, refreshToken: newRefreshToken } = response.data;

          if (newToken) {
            localStorage.setItem("ww_access_token", newToken);
            localStorage.setItem("accessToken", newToken);
          }
          if (newRefreshToken) {
            localStorage.setItem("ww_refresh_token", newRefreshToken);
            localStorage.setItem("refreshToken", newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem("ww_access_token");
          localStorage.removeItem("ww_refresh_token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.dispatchEvent(new Event("ww:logout"));
          return Promise.reject(refreshErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const setAccessToken = (token: string | null) => {
  if (token) {
    localStorage.setItem("ww_access_token", token);
    localStorage.setItem("accessToken", token);
  } else {
    localStorage.removeItem("ww_access_token");
    localStorage.removeItem("ww_refresh_token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
};

export default api;
