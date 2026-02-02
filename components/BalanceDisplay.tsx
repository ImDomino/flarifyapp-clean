// components/BalanceDisplay.tsx
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { useBalances } from "@/hooks/useBalances";
import { useSafeDeployment } from "@/hooks/useSafeDeployment";

export function BalanceDisplay() {
  const { eoaAddress } = useWallet();
  const [safeAddress, setSafeAddress] = useState<string | null>(null);

  const { ensureSafe } = useSafeDeployment();

  useEffect(() => {
    if (eoaAddress) {
      ensureSafe().then(setSafeAddress).catch(console.error);
    }
  }, [eoaAddress, ensureSafe]);

  const { safeBalance, isLoading } = useBalances(eoaAddress, safeAddress);

  if (!eoaAddress) return null;

  const numeric = isLoading ? 0 : parseFloat(safeBalance) || 0;

  return (
    <div className="bg-[#0F1119] border border-white/5 rounded-[28px] px-5 py-4 flex flex-col justify-center">
      <span className="text-sm text-gray-400 mb-2">Trading Balance</span>
      <span className="text-3xl font-bold text-white leading-tight">
        {isLoading ? "0.00" : numeric.toFixed(2)}
      </span>
    </div>
  );
}
