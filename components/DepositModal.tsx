// components/DepositModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Wallet,
  ArrowRight,
  ExternalLink,
  ArrowDownToLine,
} from "lucide-react";
import { useBalances } from "@/hooks/useBalances";
import { useDepositToSafe } from "@/hooks/useDepositToSafe";
import { useBridgeDeposit } from "@/hooks/useBridgeDeposit";

interface DepositModalProps {
  eoaAddress: string;
  safeAddress: string;
  onClose: () => void;
}

export function DepositModal({ eoaAddress, safeAddress, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("10");
  const [isDepositing, setIsDepositing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [bridgeAddress, setBridgeAddress] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);
  const [isCreatingDeposit, setIsCreatingDeposit] = useState(false);

  const { eoaBalance, safeBalance, refresh } = useBalances(eoaAddress, safeAddress);
  const { depositToSafe } = useDepositToSafe();
  const { createDeposit, getStatus } = useBridgeDeposit(eoaAddress);

  // Поллинг статуса для депо-адреса
  useEffect(() => {
    if (!bridgeAddress) return;

    const id = setInterval(async () => {
      try {
        const status = await getStatus(bridgeAddress);
        const last = status.transactions?.[0];
        if (last) {
          setBridgeStatus(last.status);
          if (last.status === "COMPLETED") {
            await refresh();
          }
        }
      } catch (e) {
        console.error("Bridge status error:", e);
      }
    }, 10_000);

    return () => clearInterval(id);
  }, [bridgeAddress, getStatus, refresh]);

  const handleCreateBridgeDeposit = async () => {
    setIsCreatingDeposit(true);
    try {
      const res = await createDeposit();
      const evmAddr = res.address?.evm;
      if (!evmAddr) {
        alert("No EVM deposit address returned");
        return;
      }
      setBridgeAddress(evmAddr);
      setBridgeStatus("PENDING");
    } catch (error: any) {
      console.error("Create deposit error:", error);
      alert(`Failed to create deposit: ${error.message || "Unknown error"}`);
    } finally {
      setIsCreatingDeposit(false);
    }
  };

  const handleDepositToSafe = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > parseFloat(eoaBalance || "0")) {
      alert("Insufficient balance in your wallet");
      return;
    }

    setIsDepositing(true);
    setTxHash(null);

    try {
      const result = await depositToSafe(amount);

      setTxHash(result.txHash);

      setTimeout(() => {
        refresh();
      }, 2000);

      alert(`Successfully deposited ${amount} USDC.e to your trading wallet!`);
    } catch (error: any) {
      console.error("Deposit error:", error);
      alert(`Failed to deposit: ${error.message || "Unknown error"}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(eoaBalance);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2" style={{ letterSpacing: "-1px" }}>
            Fund trading wallet
          </h2>
          <p className="text-sm text-gray-600">
            Add funds to your Wallet, then move USDC.e to Safe for gasless trading
          </p>
        </div>

        {/* Два кошелька — EOA и Safe */}
        <div className="mb-6 space-y-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Wallet (EOA)</div>
            <div className="text-2xl font-bold" style={{ letterSpacing: "-1px" }}>
              {parseFloat(eoaBalance).toFixed(2)} USDC.e
            </div>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              {eoaAddress.slice(0, 6)}...{eoaAddress.slice(-4)}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="text-gray-400" size={24} />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 mb-1 flex items-center gap-2">
              <Wallet size={16} />
              Trading wallet (Safe)
            </div>
            <div
              className="text-2xl font-bold text-blue-900"
              style={{ letterSpacing: "-1px" }}
            >
              {parseFloat(safeBalance).toFixed(2)} USDC.e
            </div>
            <div className="text-xs text-blue-600 mt-1 font-mono">
              {safeAddress.slice(0, 6)}...{safeAddress.slice(-4)}
            </div>
          </div>
        </div>

        {/* Шаг 1: пополнить Wallet через Bridge */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
              1
            </span>
            <span>Bridge funds to your Wallet</span>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs space-y-2">
            <div className="flex items-center gap-2 text-blue-800">
              <ArrowDownToLine size={14} />
              <span>Get a deposit address for your Wallet</span>
            </div>
            <p className="text-blue-700">
              We generate a one-time deposit address linked to your Wallet. Send
              supported assets there; they will be converted to USDC.e on Polygon
              and credited to your Wallet balance.
            </p>
          </div>

          {bridgeAddress ? (
            <div className="p-3 bg-gray-50 rounded-lg text-xs break-all space-y-2">
              <div className="font-medium text-gray-700">
                Deposit address (for your Wallet):
              </div>
              <div className="font-mono text-[11px]">
                {bridgeAddress}
              </div>
              <div className="text-gray-600">
                Status:{" "}
                <span className="font-semibold">
                  {bridgeStatus ?? "PENDING"}
                </span>
              </div>
              <div className="text-[11px] text-gray-500">
                Use any network/token supported on Polymarket Bridge. Funds arrive
                as USDC.e on Polygon to your Wallet above.
              </div>
            </div>
          ) : (
            <button
              onClick={handleCreateBridgeDeposit}
              disabled={isCreatingDeposit}
              className="w-full border border-gray-300 text-gray-800 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreatingDeposit ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Generating deposit address...
                </>
              ) : (
                <>
                  <ArrowDownToLine size={16} />
                  Generate deposit address for Wallet
                </>
              )}
            </button>
          )}

          <div className="mt-1 text-[11px] text-gray-500">
            After the bridge completes, your Wallet USDC.e balance above will update.
          </div>
        </div>

        {/* Шаг 2: перевести из Wallet в Safe */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
              2
            </span>
            <span>Move USDC.e from Wallet to Safe</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to deposit (USDC.e)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20"
                placeholder="10.00"
                disabled={isDepositing}
              />
              <button
                onClick={setMaxAmount}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded"
                disabled={isDepositing}
              >
                MAX
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Available in Wallet: {parseFloat(eoaBalance).toFixed(2)} USDC.e
            </div>
          </div>

          {txHash && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-800 mb-1">
                ✅ Deposit successful!
              </div>
              <a
                href={`https://polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                View on Polygonscan
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          <button
            onClick={handleDepositToSafe}
            disabled={isDepositing || !amount || parseFloat(amount) <= 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ letterSpacing: "-0.5px" }}
          >
            {isDepositing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Depositing...
              </>
            ) : (
              <>
                <Wallet size={20} />
                Deposit {amount} USDC.e to Safe
              </>
            )}
          </button>

          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
            <div>💡 Your Safe wallet holds funds for trading.</div>
            <div>🔒 Only your Privy EOA can control this Safe.</div>
            <div>⚡ All trades from Safe are gasless via Polymarket relayer.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
