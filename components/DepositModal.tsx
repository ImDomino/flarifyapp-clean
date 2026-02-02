// components/DepositModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, CheckCircle2, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { useBridgeDeposit } from "@/hooks/useBridgeDeposit";

interface DepositModalProps {
  eoaAddress: string; // This is actually the Safe address
  isOpen: boolean;
  onClose: () => void;
  onRefreshBalance?: () => void;
}

export function DepositModal({ eoaAddress, isOpen, onClose, onRefreshBalance }: DepositModalProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [bridgeAddress, setBridgeAddress] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [selectedChain, setSelectedChain] = useState("Polygon");
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [depositStatus, setDepositStatus] = useState<any>(null);

  const { createDeposit, getStatus } = useBridgeDeposit(eoaAddress);

  useEffect(() => {
    if (!isOpen || initialized) return;

    const init = async () => {
      setIsLoading(true);
      try {
        const res = await createDeposit();
        const evmAddr = res.address?.evm;
        if (evmAddr) {
          setBridgeAddress(evmAddr);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${evmAddr}&bgcolor=1a1d2e&color=ffffff&margin=0`;
          setQrCodeUrl(qrUrl);
        } else {
          console.error("No EVM address in bridge response", res);
        }
      } catch (error) {
        console.error("Failed to create deposit:", error);
        alert("Failed to create deposit address. Please try again.");
      } finally {
        setIsLoading(false);
        setInitialized(true);
      }
    };

    void init();
  }, [isOpen, initialized, createDeposit]);

  // Auto-check status every 10 seconds if bridge address exists
  useEffect(() => {
    if (!bridgeAddress || !isOpen) return;

    const checkStatus = async () => {
      try {
        setCheckingStatus(true);
        const status = await getStatus(bridgeAddress);
        setDepositStatus(status);
        
        // If we have completed transactions, refresh balance
        if (status?.transactions?.length > 0) {
          const hasCompleted = status.transactions.some(
            (tx: any) => tx.status === "completed" || tx.status === "confirmed"
          );
          if (hasCompleted && onRefreshBalance) {
            onRefreshBalance();
          }
        }
      } catch (error) {
        console.error("Failed to check deposit status:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Check immediately
    checkStatus();

    // Then check every 10 seconds
    const interval = setInterval(checkStatus, 10000);

    return () => clearInterval(interval);
  }, [bridgeAddress, isOpen, getStatus, onRefreshBalance]);

  useEffect(() => {
    if (!isOpen) {
      setBridgeAddress(null);
      setQrCodeUrl(null);
      setCopied(false);
      setShowDetails(false);
      setIsLoading(false);
      setInitialized(false);
      setDepositStatus(null);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    if (!bridgeAddress) return;
    try {
      await navigator.clipboard.writeText(bridgeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const hasPendingDeposits = depositStatus?.transactions?.some(
    (tx: any) => tx.status === "pending" || tx.status === "processing"
  );

  const hasCompletedDeposits = depositStatus?.transactions?.some(
    (tx: any) => tx.status === "completed" || tx.status === "confirmed"
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center px-3 sm:px-4"
          >
            <div className="w-full max-w-md max-h-[90vh] bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="relative p-6 border-b border-white/10 shrink-0">
                <h2 className="text-xl font-semibold text-center text-foreground">
                  Add funds
                </h2>
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Status Alert */}
                {hasPendingDeposits && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                    <Loader2 className="w-5 h-5 text-yellow-500 animate-spin mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-yellow-500 font-medium mb-1">
                        Processing deposit...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your funds are being transferred to your Safe. This usually takes 1-5 minutes.
                      </p>
                    </div>
                  </div>
                )}

                {hasCompletedDeposits && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-green-500 font-medium mb-1">
                        Deposit completed!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your funds have been transferred to your Safe. Refresh to see updated balance.
                      </p>
                    </div>
                  </div>
                )}

                {/* Important Info */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-blue-400 font-medium mb-2">
                    💡 How it works
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Send USDC to the bridge address below</li>
                    <li>Polymarket bridge processes your deposit</li>
                    <li>Funds arrive in your Safe (1-5 minutes)</li>
                    <li>Start trading!</li>
                  </ol>
                </div>

                {/* Token & Chain Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Token</label>
                    <select
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary/50 border border-white/10 rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option>USDC</option>
                      <option>ETH</option>
                      <option>USDT</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Network</label>
                    <select
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary/50 border border-white/10 rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option>Polygon</option>
                      <option>Ethereum</option>
                      <option>Arbitrum</option>
                      <option>Base</option>
                    </select>
                  </div>
                </div>

                {/* QR Code */}
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : qrCodeUrl && bridgeAddress ? (
                  <div className="flex justify-center">
                    <div className="p-4 bg-secondary/50 rounded-2xl border border-white/10">
                      <img src={qrCodeUrl} alt="Deposit Address QR" className="w-64 h-64 rounded-xl" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Failed to load deposit address
                  </div>
                )}

                {/* Deposit Address */}
                {bridgeAddress && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Bridge deposit address
                    </label>
                    <div className="relative">
                      <div className="bg-secondary/50 border border-white/10 rounded-xl p-4 pr-12 font-mono text-sm break-all text-foreground">
                        {bridgeAddress}
                      </div>
                      <button
                        onClick={handleCopy}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-5 h-5 text-chart-1" />
                        ) : (
                          <Copy className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-chart-1 text-center"
                      >
                        Address copied!
                      </motion.p>
                    )}
                  </div>
                )}

                {/* Your Safe Address */}
                <div className="bg-secondary/30 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Funds will be sent to your Safe:
                  </p>
                  <p className="text-xs font-mono text-foreground break-all">
                    {eoaAddress}
                  </p>
                </div>

                {/* Details */}
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full px-4 py-3 bg-secondary/50 flex items-center justify-between text-foreground hover:bg-secondary/70 transition-colors"
                  >
                    <span className="text-sm font-medium">Details</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                  </button>

                  {showDetails && (
                    <div className="px-4 py-3 bg-secondary/30 border-t border-white/10 space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Network fee</span>
                        <span className="text-foreground">~$0.50</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Min deposit</span>
                        <span className="text-foreground">$1.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing time</span>
                        <span className="text-foreground">1-5 min</span>
                      </div>
                      {checkingStatus && (
                        <div className="flex justify-between items-center">
                          <span>Status</span>
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
