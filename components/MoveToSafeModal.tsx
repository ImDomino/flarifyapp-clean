// components/MoveToSafeModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useDepositToSafe } from "@/hooks/useDepositToSafe";

interface MoveToSafeModalProps {
  eoaBalance: string; // из useBalances
  isOpen: boolean;
  onClose: () => void;
  onMoved?: () => void;
}

export function MoveToSafeModal({
  eoaBalance,
  isOpen,
  onClose,
  onMoved,
}: MoveToSafeModalProps) {
  const { depositToSafe } = useDepositToSafe();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = parseFloat(eoaBalance || "0") || 0;

  const handleSubmit = async () => {
    setError(null);

    const num = parseFloat(amount.replace(",", "."));
    if (!num || num <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (num > max) {
      setError("Amount exceeds available balance");
      return;
    }

    setIsSubmitting(true);
    try {
      const amountStr = num.toFixed(6); // 6 знаков для USDC.e
      await depositToSafe(amountStr);
      onMoved?.();
      onClose();
    } catch (e: any) {
      console.error("Move to Safe error:", e);
      setError(e?.message || "Failed to move funds");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center px-3 sm:px-4"
          >
            <div
              className="
                w-full max-w-md
                bg-card border border-white/10 rounded-3xl shadow-2xl
                overflow-hidden flex flex-col
              "
            >
              {/* Header */}
              <div className="relative p-6 border-b border-white/10 shrink-0">
                <h2 className="text-xl font-semibold text-center text-foreground">
                  Move funds to trading balance
                </h2>
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Choose how much USDC.e to move from your wallet to your Safe.
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Available</span>
                  <span className="text-foreground font-medium">
                    {max.toFixed(4)} USDC.e
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Amount to move
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={max}
                      step="0.000001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 px-4 py-3 bg-secondary/50 border border-white/10 rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAmount(
                          max > 0 ? (max - 0.000001).toFixed(6) : "0"
                        )
                      }
                      className="px-3 py-2 rounded-xl border border-white/10 text-xs text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      Max
                    </button>
                  </div>
                  {error && (
                    <p className="text-xs text-destructive mt-1">{error}</p>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || max <= 0}
                  className="w-full mt-2 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white font-medium py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Moving to trading balance...
                    </>
                  ) : (
                    <>Move USDC.e to trading balance</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
