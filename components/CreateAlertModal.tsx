"use client";

import { useState } from "react";
import { X, Bell, TrendingUp, TrendingDown } from "lucide-react";

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlert: (params: {
    condition_id: string;
    token_id: string;
    outcome: string;
    direction: "above" | "below";
    threshold: number;
    market_question: string;
  }) => Promise<boolean>;
  marketData: {
    conditionId: string;
    question: string;
    yesTokenId?: string;
    noTokenId?: string;
    yesPrice?: number | null;
    noPrice?: number | null;
  };
}

export function CreateAlertModal({
  isOpen,
  onClose,
  onCreateAlert,
  marketData,
}: CreateAlertModalProps) {
  const [outcome, setOutcome] = useState<"Yes" | "No">("Yes");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [thresholdCents, setThresholdCents] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentPrice =
    outcome === "Yes" ? marketData.yesPrice : marketData.noPrice;
  const currentPriceCents =
    currentPrice != null ? Math.round(currentPrice * 100) : null;

  const tokenId =
    outcome === "Yes" ? marketData.yesTokenId : marketData.noTokenId;

  const handleCreate = async () => {
    const cents = parseInt(thresholdCents);
    if (isNaN(cents) || cents < 1 || cents > 99) {
      setError("Enter a price between 1 and 99");
      return;
    }
    if (!tokenId) {
      setError("Token ID not available");
      return;
    }

    setIsCreating(true);
    setError("");

    const ok = await onCreateAlert({
      condition_id: marketData.conditionId,
      token_id: tokenId,
      outcome,
      direction,
      threshold: cents / 100,
      market_question: marketData.question,
    });

    setIsCreating(false);

    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setThresholdCents("");
      }, 1500);
    } else {
      setError("Failed to create alert");
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[9999]" onClick={onClose} />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-sm bg-[#0a0a0a] border-2 border-white pointer-events-auto relative overflow-hidden">
          {/* Corner accents */}
          <div className="absolute -top-px -left-px w-3 h-3 bg-white" />
          <div className="absolute -bottom-px -right-px w-3 h-3 bg-white" />

          {/* Header */}
          <div className="p-5 border-b border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white" />
                <h2 className="text-sm font-black uppercase tracking-wider">
                  Price Alert
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-500 hover:text-white border border-transparent hover:border-zinc-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed line-clamp-2">
              {marketData.question}
            </p>
          </div>

          {/* Success */}
          {success && (
            <div className="p-4 bg-white/5 border-b border-zinc-800/60">
              <p className="text-xs font-bold uppercase tracking-wider text-white text-center">
                Alert Created
              </p>
            </div>
          )}

          {!success && (
            <div className="p-5 space-y-5">
              {/* Outcome select */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Outcome
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOutcome("Yes")}
                    className={`py-2.5 text-xs font-black uppercase tracking-wider border-2 transition-all ${
                      outcome === "Yes"
                        ? "bg-white text-black border-white"
                        : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    Yes{" "}
                    {marketData.yesPrice != null &&
                      `${Math.round(marketData.yesPrice * 100)}¢`}
                  </button>
                  <button
                    onClick={() => setOutcome("No")}
                    className={`py-2.5 text-xs font-black uppercase tracking-wider border-2 transition-all ${
                      outcome === "No"
                        ? "bg-white text-black border-white"
                        : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    No{" "}
                    {marketData.noPrice != null &&
                      `${Math.round(marketData.noPrice * 100)}¢`}
                  </button>
                </div>
              </div>

              {/* Direction */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Alert When
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDirection("above")}
                    className={`py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-1.5 ${
                      direction === "above"
                        ? "bg-white text-black border-white"
                        : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Goes Above
                  </button>
                  <button
                    onClick={() => setDirection("below")}
                    className={`py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-1.5 ${
                      direction === "below"
                        ? "bg-white text-black border-white"
                        : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    Drops Below
                  </button>
                </div>
              </div>

              {/* Threshold */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                  Price Target
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={thresholdCents}
                    onChange={(e) => {
                      setThresholdCents(e.target.value);
                      setError("");
                    }}
                    placeholder={
                      currentPriceCents != null
                        ? `Current: ${currentPriceCents}¢`
                        : "1-99"
                    }
                    className="w-full bg-[#0e0e0e] border border-zinc-800 focus:border-zinc-600 px-4 py-3 text-sm font-bold text-white placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                    ¢
                  </span>
                </div>
                {currentPriceCents != null && (
                  <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">
                    Current {outcome} price: {currentPriceCents}¢
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-[11px] text-red-400 font-bold uppercase tracking-wider">
                  {error}
                </p>
              )}

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={isCreating || !thresholdCents}
                className="w-full py-3.5 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Create Alert"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
