"use client";

import { useState, useCallback } from "react";
import { useRelayClient } from "./useRelayClient";
import {
  checkAllApprovals,
  createMissingApprovalTxs,
  ApprovalStatus,
} from "@/utils/approvals";

/**
 * Hook: useTokenApprovals
 *
 * Reference: Section 6 — Token Approvals
 *
 * Before trading, the Safe must approve multiple contracts to spend
 * USDC.e and manage outcome tokens:
 *
 * USDC.e (ERC-20) → CTF Contract, CTF Exchange, Neg Risk Exchange, Neg Risk Adapter
 * Outcome tokens (ERC-1155) → CTF Exchange, Neg Risk Exchange, Neg Risk Adapter
 *
 * Key points:
 * - Uses batch execution via relayClient.execute() for gas efficiency
 * - Sets unlimited approvals (MaxUint256) for ERC-20
 * - One-time setup per Safe (persists across sessions)
 * - User signs once for all approvals (Privy handles signature)
 * - Gasless for the user
 */
export const useTokenApprovals = () => {
  const relayClient = useRelayClient();
  const [isChecking, setIsChecking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check current approval status on-chain
   */
  const checkApprovals = useCallback(
    async (safeAddress: string): Promise<ApprovalStatus> => {
      setIsChecking(true);
      setError(null);
      try {
        const status = await checkAllApprovals(safeAddress);
        setApprovalStatus(status);
        return status;
      } catch (err: any) {
        setError(err.message || "Failed to check approvals");
        throw err;
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  /**
   * Set missing approvals via RelayClient batch transaction
   */
  const setApprovals = useCallback(
    async (safeAddress: string): Promise<boolean> => {
      if (!relayClient) {
        setError("RelayClient not initialized");
        return false;
      }

      setIsApproving(true);
      setError(null);

      try {
        // Get only the missing approval transactions
        const txs = await createMissingApprovalTxs(safeAddress);

        if (txs.length === 0) {
          setApprovalStatus((prev) =>
            prev ? { ...prev, allApproved: true } : null
          );
          return true;
        }

        console.log(`📝 Setting ${txs.length} missing approvals...`);

        // Execute all approvals in a single batch (reference: relayClient.execute())
        const response = await relayClient.execute(txs as any);
        const result = await response.wait();

        if (!result) {
          throw new Error("Approval transaction failed");
        }

        console.log("✅ All approvals set successfully");

        // Refresh status
        const newStatus = await checkAllApprovals(safeAddress);
        setApprovalStatus(newStatus);
        return newStatus.allApproved;
      } catch (err: any) {
        console.error("❌ Error setting approvals:", err);
        setError(err.message || "Failed to set approvals");
        return false;
      } finally {
        setIsApproving(false);
      }
    },
    [relayClient]
  );

  /**
   * Check and set approvals if needed (convenience method)
   */
  const ensureApprovals = useCallback(
    async (safeAddress: string): Promise<boolean> => {
      try {
        const status = await checkApprovals(safeAddress);
        if (status.allApproved) return true;
        return await setApprovals(safeAddress);
      } catch {
        return false;
      }
    },
    [checkApprovals, setApprovals]
  );

  return {
    approvalStatus,
    isChecking,
    isApproving,
    error,
    checkApprovals,
    setApprovals,
    ensureApprovals,
  };
};
