"use client";

import { useState, useEffect } from "react";
import {
  X,
  ArrowUpRight,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
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
  const isValidAddress = toAddress.length > 0 && /^0x[0-9a-fA-F]{40}$/.test(toAddress);
  const isValidAmount = amountNum > 0 && amountNum <= balanceNum;
  const canSubmit = isValidAddress && isValidAmount && network === "polygon";

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setToAddress("");
      setAmount("");
      setNetwork("polygon");
      setTxHash(null);
      setErrorMsg(null);
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-base-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-rose-500/20 border border-white/10 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-orange-300" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Withdraw</h2>
                <p className="text-xs text-slate-500">
                  Send USDC from your trading balance
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* === FORM STEP === */}
            {step === "form" && (
              <div className="space-y-5">
                {/* Balance display */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-base-850/70 border border-white/5">
                  <div>
                    <div className="text-xs text-slate-500">
                      Available balance
                    </div>
                    <div className="text-2xl font-semibold mt-1">
                      ${balanceNum.toFixed(2)}
                    </div>
                  </div>
                  <Wallet className="w-8 h-8 text-slate-600" />
                </div>

                {/* Network selector */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">
                    Network
                  </label>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowNetworkDropdown(!showNetworkDropdown)
                      }
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-base-850/70 border border-white/5 hover:border-white/10 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            network === "polygon"
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {network === "polygon" ? "P" : "B"}
                        </div>
                        <span className="text-sm font-medium">
                          {network === "polygon"
                            ? "Polygon (USDC.e)"
                            : "Cross-chain Bridge"}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </button>

                    {showNetworkDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-base-850 border border-white/10 shadow-2xl z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            setNetwork("polygon");
                            setShowNetworkDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition ${
                            network === "polygon" ? "bg-white/5" : ""
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-300">
                            P
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Polygon
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Direct transfer, instant
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setNetwork("bridge");
                            setShowNetworkDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition ${
                            network === "bridge" ? "bg-white/5" : ""
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-300">
                            B
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-400">
                              Cross-chain Bridge
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Coming soon — Ethereum, Arbitrum, etc.
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {network === "bridge" && (
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-300 leading-relaxed">
                        Cross-chain bridging to Ethereum, Arbitrum, Base, and
                        other networks is coming soon. For now, withdraw to a
                        Polygon address and bridge manually via{" "}
                        <a
                          href="https://app.across.to"
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-blue-200"
                        >
                          Across
                        </a>{" "}
                        or{" "}
                        <a
                          href="https://jumper.exchange"
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-blue-200"
                        >
                          Jumper
                        </a>
                        .
                      </p>
                    </div>
                  )}
                </div>

                {/* Destination address */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">
                    Destination address
                  </label>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value.trim())}
                    placeholder="0x..."
                    className="w-full p-3 rounded-xl bg-base-850/70 border border-white/5 focus:border-blue-500/50 focus:outline-none text-sm font-mono placeholder:text-slate-600 transition"
                  />
                  {toAddress.length > 0 && !isValidAddress && (
                    <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Invalid Ethereum/Polygon address
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">
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
                      className="w-full p-3 pr-20 rounded-xl bg-base-850/70 border border-white/5 focus:border-blue-500/50 focus:outline-none text-sm transition"
                    />
                    <button
                      onClick={handleMaxAmount}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400 hover:bg-blue-500/20 transition"
                    >
                      MAX
                    </button>
                  </div>
                  {amountNum > balanceNum && (
                    <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Insufficient balance
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition hover:shadow-xl"
                >
                  {network === "bridge"
                    ? "Bridge Coming Soon"
                    : "Review Withdrawal"}
                </button>
              </div>
            )}

            {/* === CONFIRM STEP === */}
            {step === "confirm" && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <AlertTriangle className="w-12 h-12 mx-auto text-orange-400 mb-3" />
                  <h3 className="font-semibold text-lg">
                    Confirm Withdrawal
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Please review carefully — this cannot be undone
                  </p>
                </div>

                <div className="space-y-3 p-4 rounded-xl bg-base-850/70 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Amount</span>
                    <span className="text-sm font-semibold">
                      ${parseFloat(amount).toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Network</span>
                    <span className="text-sm font-medium text-purple-300">
                      Polygon
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">From</span>
                    <span className="text-xs font-mono text-slate-300">
                      {safeAddress.slice(0, 6)}...{safeAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">To</span>
                    <span className="text-xs font-mono text-slate-300">
                      {toAddress.slice(0, 6)}...{toAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Gas fee</span>
                    <span className="text-xs text-teal-400 font-medium">
                      Free (gasless)
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("form")}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg hover:shadow-xl transition"
                  >
                    Confirm & Send
                  </button>
                </div>
              </div>
            )}

            {/* === PENDING STEP === */}
            {step === "pending" && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 mx-auto text-orange-400 animate-spin mb-4" />
                <h3 className="font-semibold text-lg">
                  Processing Withdrawal
                </h3>
                <p className="text-sm text-slate-400 mt-2">
                  Signing and submitting transaction...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Please approve the signature in Privy
                </p>
              </div>
            )}

            {/* === SUCCESS STEP === */}
            {step === "success" && (
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="w-14 h-14 mx-auto text-teal-400" />
                <div>
                  <h3 className="font-semibold text-lg">
                    Withdrawal Successful!
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    ${parseFloat(amount).toFixed(2)} USDC sent to{" "}
                    {toAddress.slice(0, 6)}...{toAddress.slice(-4)}
                  </p>
                </div>

                {txHash && (
                  <a
                    href={`https://polygonscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    View on PolygonScan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition mt-4"
                >
                  Done
                </button>
              </div>
            )}

            {/* === ERROR STEP === */}
            {step === "error" && (
              <div className="text-center py-6 space-y-4">
                <AlertTriangle className="w-14 h-14 mx-auto text-rose-400" />
                <div>
                  <h3 className="font-semibold text-lg">Withdrawal Failed</h3>
                  <p className="text-sm text-rose-300 mt-2">
                    {errorMsg || withdrawError || "An unexpected error occurred"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("form")}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
