// components/DepositModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Copy, CheckCircle } from "lucide-react";
import { useBridgeDeposit } from "@/hooks/useBridgeDeposit";

interface DepositModalProps {
  eoaAddress: string;
  onClose: () => void;
}

export function DepositModal({ eoaAddress, onClose }: DepositModalProps) {
  const [bridgeAddress, setBridgeAddress] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  // QR под светлую тему
  useEffect(() => {
    if (bridgeAddress) {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
        bridgeAddress
      )}&bgcolor=ffffff&color=000000&margin=0`;
      setQrCodeUrl(url);
    }
  }, [bridgeAddress]);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2
            className="text-2xl font-bold mb-1"
            style={{ letterSpacing: "-1px" }}
          >
            Transfer crypto
          </h2>
          <p className="text-sm text-gray-600">
            Send supported tokens from an exchange or wallet to fund your trading
            balance.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* QR / loader */}
          {isLoading ? (
            <div className="aspect-square rounded-xl bg-gray-50 flex items-center justify-center">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : qrCodeUrl && bridgeAddress ? (
            <div className="aspect-square rounded-xl bg-gray-50 flex flex-col items-center justify-center p-4">
              <img
                src={qrCodeUrl}
                alt="Deposit QR Code"
                className="w-48 h-48"
              />
              <p className="mt-3 text-xs text-gray-500 text-center">
                Scan this QR code from your exchange or wallet to send crypto to
                your Polymarket deposit address.
              </p>
            </div>
          ) : (
            <div className="aspect-square rounded-xl bg-gray-50 flex items-center justify-center text-xs text-gray-400">
              Failed to load deposit address
            </div>
          )}

          {/* Deposit address */}
          {bridgeAddress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Your deposit address (EVM)
                </span>
                <span className="text-[11px] text-gray-400">
                  Linked to your Polymarket wallet
                </span>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="font-mono text-xs break-all mb-2 text-gray-800">
                  {bridgeAddress}
                </p>
                <button
                  onClick={handleCopy}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={16} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy address
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                You can deposit from Ethereum, Polygon, Arbitrum, Base and Solana using
                supported tokens such as USDC, ETH or BTC
              </p>
              <p className="text-xs text-gray-500 mt-1">
                For lower fees and smaller deposits, we recommend sending from networks like
                Polygon, Arbitrum, Base or Solana rather than Ethereum mainnet
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The exact minimum deposit depends on your token and network and is enforced
                by the bridge, but typical minimums are around 1–10&nbsp;USD
              </p>
            </div>
          )}

          {/* Info block */}
          <div className="mt-1 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
            <div>
              ⏱ Deposits usually complete within a few minutes, but can take
              longer depending on network conditions.
            </div>
            <div>
              💡 When the deposit completes, your trading balance will update
              automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
