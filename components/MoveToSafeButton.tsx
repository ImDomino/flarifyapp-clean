"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useDepositToSafe } from "@/hooks/useDepositToSafe";

interface MoveToSafeButtonProps {
  eoaBalance: string;      // строка из useBalances
  onMoved?: () => void;    // например, refresh()
}

export function MoveToSafeButton({ eoaBalance, onMoved }: MoveToSafeButtonProps) {
  const { depositToSafe } = useDepositToSafe();
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eoaNum = parseFloat(eoaBalance || "0");
  const disabled = eoaNum <= 0 || isDepositing;

  const handleClick = async () => {
    if (eoaNum <= 0) return;

    setError(null);
    setIsDepositing(true);
    try {
      const amountStr = eoaNum.toFixed(6); // гоняем весь баланс; можно сделать инпут, если нужно частично
      console.log("🚀 Moving from EOA to Safe via relayer:", amountStr);

      await depositToSafe(amountStr);

      onMoved?.();
      alert("Funds moved to trading balance (Safe).");
    } catch (err: any) {
      console.error("Move to Safe error:", err);
      setError(err?.message || "Failed to move funds");
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={disabled}
        className="w-full bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white font-medium py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDepositing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Moving to trading balance...
          </>
        ) : (
          <>Move {eoaNum.toFixed(2)} USDC.e to trading balance</>
        )}
      </button>
      {error && (
        <p className="text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
