"use client";

import { useState } from "react";
import { X, Copy, Check, QrCode, Wallet } from "lucide-react";

interface DepositModalProps {
  isOpen: boolean;
  eoaAddress: string;
  onClose: () => void;
  onRefreshBalance: () => void;
}

export function DepositModal({ isOpen, eoaAddress, onClose, onRefreshBalance }: DepositModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(eoaAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <h2 className="text-lg font-black uppercase tracking-wider">Deposit USDC</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-400 font-bold uppercase tracking-wider mb-2">
              Send USDC to your trading wallet
            </p>
            <p className="text-xs text-zinc-600 uppercase tracking-wide">
              Polygon Network Only
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
              Your Deposit Address
            </label>
            <div className="bg-[#111] border border-zinc-800 p-4 flex items-center gap-3">
              <code className="text-xs font-mono text-zinc-300 flex-1 break-all">
                {eoaAddress}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-colors flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="border border-zinc-800 bg-[#111] p-4">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              ⚠ Only send USDC on Polygon. Other tokens will be lost.
            </p>
          </div>

          <button
            onClick={() => { onRefreshBalance(); onClose(); }}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors"
          >
            I&apos;ve Sent USDC
          </button>
        </div>
      </div>
    </div>
  );
}
