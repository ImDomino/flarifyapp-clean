"use client";

import { useState, useEffect } from "react";
import {
  X,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ChevronDown,
  Info,
} from "lucide-react";
import { useWithdraw } from "@/hooks/useWithdraw";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  safeAddress: string;
  balance: string; // Current USDC balance
  onRefreshBalance: () => void;
}

type WithdrawStep = "form" | "confirm" | "pending" | "success" | "error";
type NetworkOption = "polygon" | "bridge";

export function WithdrawModal({
  isOpen,
  onClose,
  safeAddress,
  balance,
  onRefreshBalance,
}: WithdrawModalProps) {
  const { withdrawUSDC, isWithdrawing, error: withdrawError } = useWithdraw();

  const [step, setStep] = useState<WithdrawStep>("form");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<NetworkOption>("polygon");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);

  const balanceNum = parseFloat(balance || "0");
  const amountNum = parseFloat(amount || "0");
  const isValidAddress =
    toAddress.length > 0 && /^0x[0-9a-fA-F]{40}$/.test(toAddress);
  const isValidAmount = amountNum > 0 && amountNum <= balanceNum;
  const canSubmit =
    isValidAddress && isValidAmount && network === "polygon" && !isWithdrawing;

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setToAddress("");
      setAmount("");
      setNetwork("polygon");
      setTxHash(null);
      setErrorMsg(null);
      setShowNetworkDropdown(false);
    }
  }, [isOpen]);

  const handleMaxAmount = () => {
    setAmount(balanceNum.toFixed(2));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setStep("pending");
    setErrorMsg(null);

    const result = await withdrawUSDC({
      toAddress,
      amount,
    });

    if (result.success) {
      setTxHash(result.txHash || result.transactionId || null);
      setStep("success");
      onRefreshBalance();
    } else {
      setErrorMsg(result.error || "Withdrawal failed");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] border-2 border-white w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner accents */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-lg font-black uppercase tracking-wider">
            Withdraw USDC
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* FORM */}
          {step === "form" && (
            <>
              {/* Balance */}
              <div className="bg-[#111] border border-zinc-800 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">
                    Available
                  </span>
                  <span className="text-2xl font-black text-white">
                    ${balanceNum.toFixed(2)}
                  </span>
                </div>
                <Wallet className="w-8 h-8 text-zinc-600" />
              </div>

              {/* Recipient */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Destination Address
                </label>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value.trim())}
                  placeholder="0x..."
                  className="w-full bg-[#111] border border-zinc-800 p-3 text-xs font-mono text-white focus:outline-none focus:border-white placeholder-zinc-700"
                />
                {toAddress.length > 0 && !isValidAddress && (
                  <p className="text-xs text-red-400 font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Invalid Ethereum/Polygon address
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Amount (USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-[#111] border border-zinc-800 pl-4 pr-16 py-3 text-sm text-white font-bold focus:outline-none focus:border-white placeholder-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={handleMaxAmount}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-white border border-zinc-700 hover:border-white px-2 py-1 transition-colors"
                  >
                    Max
                  </button>
                </div>
                {amountNum > balanceNum && (
                  <p className="text-xs text-red-400 font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Insufficient balance
                  </p>
                )}
              </div>

              {/* Warning */}
              <div className="border border-zinc-800 bg-[#111] p-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  ⚠ Polygon network only. Withdrawals are irreversible.
                </p>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {network === "bridge"
                  ? "Bridge coming soon"
                  : `Review withdrawal ${amountNum > 0 ? `$${amountNum.toFixed(2)}` : ""}`}
              </button>
            </>
          )}

          {/* CONFIRM */}
          {step === "confirm" && (
            <div className="space-y-5">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-orange-400 mb-3" />
                <h3 className="text-lg font-black uppercase tracking-wider">
                  Confirm Withdrawal
                </h3>
                <p className="text-xs text-zinc-500 font-bold mt-2">
                  Check details carefully — this cannot be undone.
                </p>
              </div>

              <div className="bg-[#111] border border-zinc-800 p-4 space-y-3 text-xs text-zinc-300">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    Amount
                  </span>
                  <span className="font-bold">
                    ${parseFloat(amount || "0").toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    Network
                  </span>
                  <span className="font-bold text-purple-300">
                    Polygon
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    From
                  </span>
                  <span className="font-mono">
                    {safeAddress.slice(0, 6)}...{safeAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    To
                  </span>
                  <span className="font-mono">
                    {toAddress.slice(0, 6)}...{toAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">
                    Gas fee
                  </span>
                  <span className="text-teal-400 font-bold">
                    Free (gasless)
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="flex-1 py-3 border-2 border-zinc-700 text-white font-black uppercase tracking-widest text-xs hover:border-white hover:bg-[#111] transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-white text-black font-black uppercase tracking-widest text-xs border-2 border-white hover:bg-black hover:text-white transition-colors"
                >
                  Confirm & Send
                </button>
              </div>
            </div>
          )}

          {/* PENDING */}
          {step === "pending" && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-white" />
              <p className="text-sm font-black uppercase tracking-wider">
                Processing...
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Signing and submitting transaction. Approve in Privy.
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-14 h-14 mx-auto text-teal-400" />
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider">
                  Withdrawal Successful
                </h3>
                <p className="text-sm text-zinc-500 font-bold mt-2">
                  ${parseFloat(amount || "0").toFixed(2)} USDC sent to{" "}
                  {toAddress.slice(0, 6)}...{toAddress.slice(-4)}
                </p>
              </div>

              {txHash && (
                <a
                  href={`https://polygonscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider"
                >
                  View on PolygonScan
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-4 py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* ERROR */}
          {step === "error" && (
            <div className="text-center py-8 space-y-4">
              <AlertTriangle className="w-14 h-14 mx-auto text-rose-400" />
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider">
                  Withdrawal Failed
                </h3>
                <p className="text-sm text-rose-300 mt-2">
                  {errorMsg || withdrawError || "An unexpected error occurred"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="flex-1 py-3 border-2 border-zinc-700 text-white font-black uppercase tracking-widest text-xs hover:border-white hover:bg-[#111] transition-colors"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border-2 border-zinc-700 text-white font-black uppercase tracking-widest text-xs hover:border-white hover:bg-[#111] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
