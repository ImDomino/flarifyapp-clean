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

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-gray-600" />
          <div>
            <div className="text-xs text-gray-500">Trading Balance</div>
            <div
              className="text-sm font-bold"
              style={{ letterSpacing: "-0.5px" }}
            >
              {isLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                <span>{parseFloat(safeBalance).toFixed(2)} USDC.e</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          title="Deposit to trading wallet"
        >
          <Plus size={16} />
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
