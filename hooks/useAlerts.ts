"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { usePrivy } from "@privy-io/react-auth";
import type { PriceAlert } from "@/lib/types";

interface CreateAlertParams {
  condition_id: string;
  token_id: string;
  outcome: string;
  direction: "above" | "below";
  threshold: number;
  market_question?: string;
}

export function useAlerts() {
  const { authenticated } = usePrivy();
  const authFetch = useAuthFetch();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await authFetch("/api/alerts");
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error("Fetch alerts error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  const createAlert = useCallback(
    async (params: CreateAlertParams): Promise<boolean> => {
      try {
        const res = await authFetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (data.success) {
          setAlerts((prev) => [data.alert, ...prev]);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [authFetch]
  );

  const toggleAlert = useCallback(
    async (alertId: string) => {
      // Optimistic
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_active: !a.is_active } : a))
      );
      try {
        await authFetch("/api/alerts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alert_id: alertId, action: "toggle" }),
        });
      } catch {
        fetchAlerts();
      }
    },
    [authFetch, fetchAlerts]
  );

  const deleteAlert = useCallback(
    async (alertId: string) => {
      // Optimistic
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      try {
        await authFetch("/api/alerts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alert_id: alertId, action: "delete" }),
        });
      } catch {
        fetchAlerts();
      }
    },
    [authFetch, fetchAlerts]
  );

  const hasActiveAlert = useCallback(
    (conditionId: string) => {
      return alerts.some(
        (a) => a.condition_id === conditionId && a.is_active && !a.triggered_at
      );
    },
    [alerts]
  );

  useEffect(() => {
    if (authenticated) fetchAlerts();
  }, [authenticated, fetchAlerts]);

  return {
    alerts,
    isLoading,
    fetchAlerts,
    createAlert,
    toggleAlert,
    deleteAlert,
    hasActiveAlert,
  };
}
