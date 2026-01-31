"use client";

import { useState } from "react";
import { X, Loader2, Wallet, ArrowRight, ExternalLink } from "lucide-react";
import { useBalances } from "@/hooks/useBalances";
import { useDepositToSafe } from "@/hooks/useDepositToSafe";

interface DepositModalProps {
  eoaAddress: string;
  safeAddress: string;
  onClose: () => void;
}

export function DepositModal({ eoaAddress, safeAddress, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("10");
  const [isDepositing, setIsDepositing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { eoaBalance, safeBalance, refresh } = useBalances(eoaAddress, safeAddress);
  const { depositToSafe } = useDepositToSafe();

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > parseFloat(eoaBalance)) {
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

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ letterSpacing: '-1px' }}>
            Deposit to Trading Wallet
          </h2>
          <p className="text-sm text-gray-600">
            Transfer USDC.e from your wallet to your Safe for trading
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Your Wallet (EOA)</div>
            <div className="text-2xl font-bold" style={{ letterSpacing: '-1px' }}>
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
              Trading Wallet (Safe)
            </div>
            <div className="text-2xl font-bold text-blue-900" style={{ letterSpacing: '-1px' }}>
              {parseFloat(safeBalance).toFixed(2)} USDC.e
            </div>
            <div className="text-xs text-blue-600 mt-1 font-mono">
              {safeAddress.slice(0, 6)}...{safeAddress.slice(-4)}
            </div>
          </div>
        </div>

        <div className="mb-6">
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
            Available: {parseFloat(eoaBalance).toFixed(2)} USDC.e
          </div>
        </div>

        {txHash && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
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
          onClick={handleDeposit}
          disabled={isDepositing || !amount || parseFloat(amount) <= 0}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ letterSpacing: '-0.5px' }}
        >
          {isDepositing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Depositing...
            </>
          ) : (
            <>
              <Wallet size={20} />
              Deposit {amount} USDC.e
            </>
          )}
        </button>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 space-y-1">
            <div>💡 Your Safe wallet holds funds for trading</div>
            <div>🔒 Only you can access your Safe</div>
            <div>⚡ Gasless trading after deposit</div>
          </div>
        </div>
      </div>
    </div>
  );
}
