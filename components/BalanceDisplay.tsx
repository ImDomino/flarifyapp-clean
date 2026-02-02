// components/BalanceDisplay.tsx
"use client";

import { useState, useEffect } from "react";
import { Wallet, Plus } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";
import { useBalances } from "@/hooks/useBalances";
import { useSafeDeployment } from "@/hooks/useSafeDeployment";
import { DepositModal } from "./DepositModal";

export function BalanceDisplay() {
  const { eoaAddress } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [safeAddress, setSafeAddress] = useState<string | null>(null);

  const { ensureSafe } = useSafeDeployment();

  useEffect(() => {
    if (eoaAddress) {
      ensureSafe().then(setSafeAddress).catch(console.error);
    }
  }, [eoaAddress, ensureSafe]);

  const { safeBalance, isLoading } = useBalances(eoaAddress, safeAddress);

  if (!eoaAddress) return null;

  const displayBalance = isLoading
    ? "Loading..."
    : `${parseFloat(safeBalance).toFixed(2)} USDC.e`;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-secondary/30 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] flex items-center justify-center">
            <Wallet size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Trading Balance</div>
            <div
              className="text-sm sm:text-base font-bold text-foreground"
              style={{ letterSpacing: "-0.3px" }}
            >
              {displayBalance}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-xl hover:opacity-90 text-xs sm:text-sm font-medium transition-colors"
          title="Deposit to trading wallet"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Deposit</span>
        </button>
      </div>

      {showModal && (
        <DepositModal
          isOpen={showModal}
          eoaAddress={eoaAddress}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
