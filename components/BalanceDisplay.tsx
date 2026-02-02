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

  const numeric = isLoading ? 0 : parseFloat(safeBalance) || 0;

  return (
    <>
      <div className="space-y-3">
        {/* Тёмная карточка с балансом */}
        <div className="bg-[#0F1119] border border-white/5 rounded-3xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 leading-none">
                Trading
              </span>
              <span className="text-xs text-gray-400 leading-none mb-1">
                Balance
              </span>
              <div className="flex flex-col">
                <span className="text-xl font-semibold text-white leading-tight">
                  {isLoading ? "0.00" : numeric.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-white/80 tracking-wide">
                  USDC.e
                </span>
              </div>
            </div>
          </div>

          {/* Малая градиентная кнопка +Deposit */}
          <button
            onClick={() => setShowModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white text-xs font-medium shadow-lg shadow-[#2A56F2]/30 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Deposit</span>
          </button>
        </div>

        {/* Большая градиентная кнопка как в макете */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-3.5 rounded-[999px] bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(19,37,109,0.7)]"
        >
          <Wallet className="w-5 h-5" />
          <span>Deposit</span>
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
