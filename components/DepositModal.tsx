// components/DepositModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Copy, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { useBridgeDeposit } from "@/hooks/useBridgeDeposit";

interface DepositModalProps {
  eoaAddress: string;
  onClose: () => void;
}

export function DepositModal({ eoaAddress, onClose }: DepositModalProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [bridgeAddress, setBridgeAddress] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [selectedChain, setSelectedChain] = useState('Polygon');
  const [isLoading, setIsLoading] = useState(false);

  const { createDeposit } = useBridgeDeposit(eoaAddress);

  // Автоматически создаём deposit address при открытии
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const res = await createDeposit();
        const evmAddr = res.address?.evm;
        if (evmAddr) {
          setBridgeAddress(evmAddr);
          
          // Генерируем QR код (темная тема)
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
      }
    };
    void init();
  }, [createDeposit]);

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-white/10 rounded-3xl max-w-md w-full overflow-hidden card-shadow backdrop-blur-xl">
        {/* Header */}
        <div className="relative p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-center text-foreground">Add funds</h2>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Token Selector */}
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

          {/* Chain Selector */}
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
              <option>Solana</option>
            </select>
          </div>

          {/* QR Code */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : qrCodeUrl && bridgeAddress ? (
            <div className="flex justify-center">
              <div className="p-4 bg-secondary/50 rounded-2xl border border-white/10">
                <img
                  src={qrCodeUrl}
                  alt="Deposit Address QR"
                  className="w-64 h-64 rounded-xl"
                />
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
                Deposit address
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
            </div>
          )}

          {/* Collapsible Details */}
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-3 bg-secondary/50 flex items-center justify-between text-foreground hover:bg-secondary/70 transition-colors"
            >
              <span className="text-sm font-medium">Details</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              />
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
              </div>
            )}
          </div>

          {/* Information */}
          <div className="bg-secondary/30 border border-white/10 rounded-xl p-4 text-xs text-muted-foreground">
            <p className="mb-2">
              Send <span className="text-foreground font-medium">{selectedToken}</span> on{' '}
              <span className="text-foreground font-medium">{selectedChain}</span> to this address.
            </p>
            <p>
              Funds usually arrive within a few minutes. Your trading balance will update
              automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
