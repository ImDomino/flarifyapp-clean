"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Loader2, Wallet } from "lucide-react";
import { useBridgeDeposit } from "@/hooks/useBridgeDeposit";

interface DepositModalProps {
  isOpen: boolean;
  eoaAddress: string;
  onClose: () => void;
  onRefreshBalance?: () => void;
}

export function DepositModal({ isOpen, eoaAddress, onClose, onRefreshBalance }: DepositModalProps) {
  const [copied, setCopied] = useState(false);
  const [bridgeAddress, setBridgeAddress] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
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
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${evmAddr}&bgcolor=0a0a0a&color=ffffff&margin=0`;
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
      setIsLoading(false);
      setInitialized(false);
      setDepositStatus(null);
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!bridgeAddress) return;
    navigator.clipboard.writeText(bridgeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasPendingDeposits = depositStatus?.transactions?.some(
    (tx: any) => tx.status === "pending" || tx.status === "processing"
  );

  const hasCompletedDeposits = depositStatus?.transactions?.some(
    (tx: any) => tx.status === "completed" || tx.status === "confirmed"
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] border-2 border-white w-full max-w-md relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner accents */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-lg font-black uppercase tracking-wider">
            Deposit via Bridge
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">

          {/* Status */}
          {hasPendingDeposits && (
            <div className="border border-amber-500 bg-[#111] p-3 text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Deposit in progress (1–5 min)</span>
            </div>
          )}

          {hasCompletedDeposits && (
            <div className="border border-emerald-500 bg-[#111] p-3 text-xs uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Deposit completed</span>
            </div>
          )}

          {/* Title / description */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-300 font-bold uppercase tracking-wider mb-2">
              Send assets to bridge wallet
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
              Funds will be auto-routed to your trading safe
            </p>
          </div>

          {/* QR code only for bridge */}
          <div className="flex justify-center">
            <div className="bg-[#111] border border-zinc-800 p-3">
              {isLoading ? (
                <div className="w-56 h-56 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                </div>
              ) : qrCodeUrl && bridgeAddress ? (
                <img
                  src={qrCodeUrl}
                  alt="Bridge deposit QR"
                  className="w-56 h-56 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-zinc-500 text-center px-4">
                  Failed to load bridge address
                </div>
              )}
            </div>
          </div>

          {/* Bridge address */}
          {bridgeAddress && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                Bridge deposit address
              </label>
              <div className="bg-[#111] border border-zinc-800 p-4 flex items-center gap-3">
                <code className="text-xs font-mono text-zinc-300 flex-1 break-all">
                  {bridgeAddress}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-colors flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest text-center mt-2">
                  Address copied
                </p>
              )}
            </div>
          )}

          {/* Supported assets / networks */}
          <div className="border border-zinc-800 bg-[#111] p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Supported deposits
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-zinc-400">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Ethereum
              </p>
              <p>ETH, WETH, USDC, USDT and other popular ERC‑20 tokens.</p>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Polygon
              </p>
              <p>USDC, USDT, WETH, POL and other major assets.</p>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Arbitrum
              </p>
              <p>ETH, WETH, USDC, USDT, ARB and other supported tokens.</p>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Base
              </p>
              <p>ETH, WETH, USDC, USDT and other major assets.</p>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                Solana
              </p>
              <p>SOL, USDC, USDT and other supported SPL tokens.</p>
            </div>

            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                BNB Chain
              </p>
              <p>BNB, WBNB, BTCB, USDC, USDT and other BEP‑20 tokens.</p>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-3">
          Min deposit: $2–9 depending on chain. Other supported chains and tokens are available in the full list.
          </p>
        </div>

          {/* Manual refresh button (опционально) */}
          {onRefreshBalance && (
            <button
              onClick={() => {
                onRefreshBalance();
                onClose();
              }}
              className="w-full mt-2 py-3 bg-white text-black font-black uppercase tracking-widest text-xs border-2 border-white hover:bg-black hover:text-white transition-colors"
            >
              I&apos;ve sent funds
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
