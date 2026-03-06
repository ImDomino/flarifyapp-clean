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

      // Trigger price check for user's active alerts in the background
      const hasActive = (data.alerts || []).some(
        (a: PriceAlert) => a.is_active && !a.triggered_at
      );
      if (hasActive) {
        authFetch("/api/alerts/check", { method: "POST" })
          .then(async (r) => {
            const result = await r.json();
            // If any alerts triggered, re-fetch to update state
            if (result.triggered > 0) {
              const res2 = await authFetch("/api/alerts");
              const data2 = await res2.json();
              setAlerts(data2.alerts || []);
            }
          })
          .catch(() => {});
      }
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
    if (!authenticated) return;
    fetchAlerts();
    // Poll every 5 minutes while tab is open
    const interval = setInterval(fetchAlerts, 5 * 60_000);
    return () => clearInterval(interval);
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
