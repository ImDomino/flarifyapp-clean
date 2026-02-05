"use client";

import { useState, useCallback } from "react";
import { useRelayClient } from "./useRelayClient";
import { checkAllApprovals, createMissingApprovalTxs, ApprovalStatus } from "@/utils/approvals";

export const useTokenApprovals = () => {
  const relayClient = useRelayClient();
  const [isChecking, setIsChecking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Проверить текущий статус approvals
   */
  const checkApprovals = useCallback(async (safeAddress: string): Promise<ApprovalStatus> => {
    setIsChecking(true);
    setError(null);

    try {
      console.log("🔍 Checking token approvals for Safe:", safeAddress);
      const status = await checkAllApprovals(safeAddress);
      
      console.log("📋 Approval status:", {
        allApproved: status.allApproved,
        usdc: status.usdc,
        erc1155: status.erc1155,
      });

      setApprovalStatus(status);
      return status;
    } catch (err: any) {
      console.error("❌ Error checking approvals:", err);
      setError(err.message || "Failed to check approvals");
      throw err;
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Установить недостающие approvals через RelayClient
   */
  const setApprovals = useCallback(async (safeAddress: string): Promise<boolean> => {
    if (!relayClient) {
      setError("RelayClient not initialized");
      return false;
    }

    setIsApproving(true);
    setError(null);

    try {
      // Сначала проверяем какие approvals нужны
      console.log("🔍 Checking which approvals are needed...");
      const txs = await createMissingApprovalTxs(safeAddress);

      if (txs.length === 0) {
        console.log("✅ All approvals already set!");
        setApprovalStatus((prev) => prev ? { ...prev, allApproved: true } : null);
        return true;
      }

      console.log(`📝 Setting ${txs.length} missing approvals...`);

      // Выполняем все approvals через batch transaction
      const response = await relayClient.execute(txs as any);
      
      console.log("⏳ Waiting for approval transaction...");
      const result = await response.wait();

      if (!result) {
        throw new Error("Approval transaction failed");
      }

      console.log("✅ All approvals set successfully!");

      // Обновляем статус
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
  }, [relayClient]);

  /**
   * Проверить и установить approvals если нужно
   */
  const ensureApprovals = useCallback(async (safeAddress: string): Promise<boolean> => {
    try {
      const status = await checkApprovals(safeAddress);
      
      if (status.allApproved) {
        console.log("✅ Approvals already in place");
        return true;
      }

      console.log("⚠️ Some approvals missing, setting them now...");
      return await setApprovals(safeAddress);
    } catch (err: any) {
      console.error("❌ Error ensuring approvals:", err);
      return false;
    }
  }, [checkApprovals, setApprovals]);

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
