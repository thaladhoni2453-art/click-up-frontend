import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";

export interface DashboardStats {
  completion_rate: number;
  tracked_hours: number;
  velocity: number;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    completion_rate: 0,
    tracked_hours: 0,
    velocity: 0,
  });
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent && isFirstLoad.current) {
      setLoading(true);
    }
    try {
      const { data } = await api.get<DashboardStats>("/dashboard/stats");
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats silently", err);
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, []);

  const refetch = useCallback(() => {
    fetchStats(true); // run silently (no spinner) to prevent flicker
  }, [fetchStats]);

  useEffect(() => {
    // Initial load
    fetchStats(false);

    // Dynamic polling every 10 seconds
    const interval = setInterval(() => {
      fetchStats(true); // Silent polling
    }, 10000);

    // Register a window-level custom event listener for immediate updates
    const handleRefetchEvent = () => {
      refetch();
    };
    window.addEventListener("refetch-dashboard-stats", handleRefetchEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refetch-dashboard-stats", handleRefetchEvent);
    };
  }, [fetchStats, refetch]);

  return { stats, loading, refetch };
};
