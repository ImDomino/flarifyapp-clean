"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { useWallet } from "@/providers/WalletProvider";

interface WithdrawModalProps {
  isOpen: boolean;
  safeAddress: string;
  balance: string;
  onClose: () => void;
  onRefreshBalance: () => void;
}

const USDC_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const MIN_WITHDRAW = 1;
const POLYGON_EXPLORER = "https://polygonscan.com/tx/";

type WithdrawStep = "form" | "processing" | "success" | "error";

export function WithdrawModal({
  isOpen, safeAddress, balance, onClose, onRefreshBalance,
}: WithdrawModalProps) {
  const { eoaAddress } = useWallet();
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [step, setStep] = useState<WithdrawStep>("form");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balanceNum = useMemo(() => parseFloat(balance || "0"), [balance]);
  const amountNum = useMemo(() => parseFloat(amount || "0"), [amount]);

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setAmount("");
      setRecipientAddress(eoaAddress || "");
      setError(null);
      setTxHash(null);
    }
  }, [isOpen, eoaAddress]);

  const isValidAddress = useCallback(
    (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr),
    []
  );

  const canWithdraw = useMemo(
    () =>
      amountNum >= MIN_WITHDRAW &&
      amountNum <= balanceNum &&
      isValidAddress(recipientAddress) &&
      step === "form",
    [amountNum, balanceNum, recipientAddress, step, isValidAddress]
  );

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    setStep("processing");
    setError(null);

    try {
      const res = await fetch("/api/polymarket/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safe_address: safeAddress,
          to_address: recipientAddress,
          amount: amountNum.toString(),
          token_address: USDC_POLYGON,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Withdrawal failed");

      setTxHash(data.txHash || null);
      setStep("success");
      onRefreshBalance();
    } catch (err: any) {
      setError(err.message || "Withdrawal failed");
      setStep("error");
    }
  };

  const handleMaxAmount = () => setAmount(balanceNum.toFixed(2));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border-2 border-white w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-lg font-black uppercase tracking-wider">Withdraw USDC</h2>
          <button onClick={onClose} className="w-8 h-8 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === "form" && (
            <>
              {/* Balance */}
              <div className="bg-[#111] border border-zinc-800 p-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Available</span>
                <span className="text-2xl font-black text-white">${balanceNum.toFixed(2)}</span>
              </div>

              {/* Amount */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                  <input
                    type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" min={MIN_WITHDRAW} max={balanceNum} step="0.01"
                    className="w-full bg-[#111] border border-zinc-800 pl-8 pr-16 py-4 text-lg font-bold text-white focus:outline-none focus:border-white transition-all placeholder-zinc-700"
                  />
                  <button onClick={handleMaxAmount} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-white border border-zinc-700 hover:border-white px-2 py-1 transition-colors">
                    Max
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold mt-2">Min: ${MIN_WITHDRAW}</p>
              </div>

              {/* Recipient */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Recipient Address</label>
                <input
                  type="text" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#111] border border-zinc-800 p-3 text-xs font-mono text-white focus:outline-none focus:border-white transition-all placeholder-zinc-700"
                />
                {recipientAddress && !isValidAddress(recipientAddress) && (
                  <p className="text-xs text-red-400 font-bold mt-1">Invalid address</p>
                )}
              </div>

              {/* Warning */}
              <div className="border border-zinc-800 bg-[#111] p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  ⚠ Polygon network only. Withdrawals are irreversible.
                </p>
              </div>

              <button onClick={handleWithdraw} disabled={!canWithdraw}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Withdraw ${amountNum.toFixed(2)}
              </button>
            </>
          )}

          {step === "processing" && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-white" />
              <p className="text-sm font-black uppercase tracking-wider">Processing...</p>
              <p className="text-xs text-zinc-500 mt-2">This may take a moment</p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-white flex items-center justify-center">
                <span className="text-3xl font-black">✓</span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider mb-2">Sent</h3>
              <p className="text-sm text-zinc-500 font-bold mb-4">
                ${amountNum.toFixed(2)} USDC withdrawn
              </p>
              {txHash && (
                <a href={`${POLYGON_EXPLORER}${txHash}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider">
                  View on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button onClick={onClose}
                className="w-full mt-6 py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors">
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-red-800 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider mb-2">Failed</h3>
              <p className="text-sm text-red-400 font-bold mb-4">{error}</p>
              <button onClick={() => setStep("form")}
                className="w-full py-4 border-2 border-zinc-700 text-white font-black uppercase tracking-widest text-sm hover:border-white hover:bg-[#111] transition-colors">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
