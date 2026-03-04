"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface BetaGateContextValue {
  isApproved: boolean;
  isLoading: boolean;
  inviteCodes: Array<{
    code: string;
    used_by: string | null;
    used_at: string | null;
  }>;
  refreshBetaStatus: () => Promise<void>;
  pendingInviteCode: string | null;
}

const BetaGateContext = createContext<BetaGateContextValue>({
  isApproved: false,
  isLoading: true,
  inviteCodes: [],
  refreshBetaStatus: async () => {},
  pendingInviteCode: null,
});

export function useBetaGate() {
  return useContext(BetaGateContext);
}

const INVITE_STORAGE_KEY = "flarify_invite_code";

export function BetaGateProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, ready, user } = usePrivy();
  const authFetch = useAuthFetch();

  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [redeemAttempted, setRedeemAttempted] = useState(false);

  // Capture invite code from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite && /^FL-[A-Z0-9]{6}$/i.test(invite)) {
      const normalized = invite.toUpperCase();
      localStorage.setItem(INVITE_STORAGE_KEY, normalized);
      setPendingInviteCode(normalized);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url.toString());
    } else {
      const stored = localStorage.getItem(INVITE_STORAGE_KEY);
      if (stored) setPendingInviteCode(stored);
    }
  }, []);

  const refreshBetaStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await authFetch("/api/beta/status");
      const data = await res.json();
      setIsApproved(data.approved || false);
      setInviteCodes(data.codes || []);
    } catch (err) {
      console.error("Failed to check beta status:", err);
    }
  }, [user?.id, authFetch]);

  // After auth, check status and attempt redeem if needed
  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      setIsApproved(false);
      setIsLoading(false);
      setRedeemAttempted(false);
      return;
    }

    const checkAndRedeem = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch("/api/beta/status");
        const data = await res.json();

        if (data.approved) {
          setIsApproved(true);
          setInviteCodes(data.codes || []);
          localStorage.removeItem(INVITE_STORAGE_KEY);
        } else if (pendingInviteCode && !redeemAttempted) {
          setRedeemAttempted(true);
          const redeemRes = await authFetch("/api/beta/redeem", {
            method: "POST",
            body: JSON.stringify({ code: pendingInviteCode }),
          });
          const redeemData = await redeemRes.json();

          if (redeemData.success) {
            setIsApproved(true);
            setInviteCodes(redeemData.codes || []);
            localStorage.removeItem(INVITE_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error("Beta gate error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Delay to allow ProfileSync to create profile first
    const timer = setTimeout(checkAndRedeem, 1500);
    return () => clearTimeout(timer);
  }, [ready, authenticated, user?.id, pendingInviteCode, redeemAttempted, authFetch]);

  return (
    <BetaGateContext.Provider
      value={{ isApproved, isLoading, inviteCodes, refreshBetaStatus, pendingInviteCode }}
    >
      {children}
    </BetaGateContext.Provider>
  );
}
