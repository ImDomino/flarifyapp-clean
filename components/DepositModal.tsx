"use client";

import { useState, useEffect } from "react";
import { X, Copy, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { useBridgeDeposit } from "@/hooks/useBridgeDeposit";

interface DepositModalProps {
  eoaAddress: string;
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
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${evmAddr}&bgcolor=121318&color=ffffff&margin=0`;
          setQrCodeUrl(qrUrl);
        }
      } catch (error) {
        console.error("Failed to create deposit:", error);
      } finally {
        setIsLoading(false);
        setInitialized(true);
      }
    };

    void init();
  }, [isOpen, initialized, createDeposit]);

  useEffect(() => {
    if (!bridgeAddress || !isOpen) return;

    const checkStatus = async () => {
      try {
        setCheckingStatus(true);
        const status = await getStatus(bridgeAddress);
        setDepositStatus(status);
        
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

    checkStatus();
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md max-h-[90vh] bg-base-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="relative p-5 border-b border-white/5 shrink-0">
            <h2 className="font-display text-xl font-semibold text-center text-slate-100">
              Add funds
            </h2>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
            {/* Status Alerts */}
            {hasPendingDeposits && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-300 font-medium mb-1">Processing deposit...</p>
                  <p className="text-xs text-slate-400">Usually takes 1-5 minutes.</p>
                </div>
              </div>
            )}

            {hasCompletedDeposits && (
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-teal-300 font-medium mb-1">Deposit completed!</p>
                  <p className="text-xs text-slate-400">Your funds have been transferred.</p>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-sm text-blue-300 font-medium mb-2">💡 How it works</p>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Send USDC to the bridge address below</li>
                <li>Polymarket bridge processes your deposit</li>
                <li>Funds arrive in your Safe (1-5 minutes)</li>
                <li>Start trading!</li>
              </ol>
            </div>

            {/* Token & Chain Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Token</label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full px-4 py-3 bg-base-850/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option>USDC</option>
                  <option>ETH</option>
                  <option>USDT</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">Network</label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                  className="w-full px-4 py-3 bg-base-850/50 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : qrCodeUrl && bridgeAddress ? (
              <div className="flex justify-center">
                <div className="p-4 bg-base-850/50 rounded-xl border border-white/10">
                  <img src={qrCodeUrl} alt="Deposit Address QR" className="w-56 h-56 rounded-lg" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                Failed to load deposit address
              </div>
            )}

            {/* Deposit Address */}
            {bridgeAddress && (
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                  Bridge deposit address
                </label>
                <div className="relative">
                  <div className="bg-base-850/50 border border-white/10 rounded-xl p-4 pr-12 font-mono text-sm break-all text-slate-200">
                    {bridgeAddress}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-teal-400 text-center mt-2">Address copied!</p>
                )}
              </div>
            )}

            {/* Your Safe Address */}
            <div className="bg-base-850/30 border border-white/5 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-2">Funds will be sent to your Safe:</p>
              <p className="text-xs font-mono text-slate-300 break-all">{eoaAddress}</p>
            </div>

            {/* Details */}
            <div className="border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full px-4 py-3 bg-base-850/50 flex items-center justify-between text-slate-200 hover:bg-base-850/70 transition-colors"
              >
                <span className="text-sm font-medium">Details</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
              </button>

              {showDetails && (
                <div className="px-4 py-3 bg-base-850/30 border-t border-white/5 space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Network fee</span>
                    <span className="text-slate-200">~$0.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min deposit</span>
                    <span className="text-slate-200">$1.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing time</span>
                    <span className="text-slate-200">1-5 min</span>
                  </div>
                  {checkingStatus && (
                    <div className="flex justify-between items-center">
                      <span>Status</span>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}