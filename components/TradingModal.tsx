"use client";

import { useState, useEffect } from "react";
import { X, Loader2, TrendingUp } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { polymarketCLOB } from "@/lib/polymarket/clob-singleton";

interface MarketData {
  question: string;
  outcomes: string[];
  prices: number[];
  volume: string;
  url: string;
  yesTokenId?: string;
  noTokenId?: string;
  tokens?: Array<{ token_id: string; outcome: string; price: string }>;
}

interface TradingModalProps {
  marketId: string;
  marketData: MarketData;
  outcome: string;
  outcomeIndex: number;
  onClose: () => void;
}

export function TradingModal({ marketId, marketData, outcome, outcomeIndex, onClose }: TradingModalProps) {
  const { authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();
  const [amount, setAmount] = useState(10);
  const [isTrading, setIsTrading] = useState(false);
  const [isClobReady, setIsClobReady] = useState(false);

  // Инициализируем CLOB client при монтировании
  useEffect(() => {
    const initCLOB = async () => {
      if (!ready || !authenticated) {
        console.log('⏳ Waiting for auth...');
        return;
      }

      if (polymarketCLOB.isInitialized()) {
        setIsClobReady(true);
        return;
      }

      try {
        // Ищем embedded wallet Privy
        const embeddedWallet = wallets.find(
          (w: any) => w.walletClientType === 'privy'
        );

        if (!embeddedWallet) {
          console.warn('⚠️ No embedded Privy wallet found');
          return;
        }

        console.log('🔄 Initializing CLOB with Privy wallet...');

        // Получаем EIP-1193 provider
        const provider = await (embeddedWallet as any).getEthereumProvider();
        
        // ВАЖНО: ethers v5 - используем Web3Provider, НЕ BrowserProvider
        const ethersProvider = new ethers.providers.Web3Provider(provider as any);
        const signer = ethersProvider.getSigner();

        const success = await polymarketCLOB.initialize(signer);
        setIsClobReady(success);

        if (success) {
          console.log('✅ CLOB initialized with Privy embedded wallet');
        }
      } catch (error) {
        console.error('❌ Failed to initialize CLOB:', error);
      }
    };

    initCLOB();
  }, [ready, authenticated, wallets]);

  const price = marketData.prices[outcomeIndex];
  const shares = amount / price;
  const potentialWin = shares * 1;
  const profit = potentialWin - amount;

  const handleTrade = async () => {
    if (!authenticated) {
      login();
      return;
    }

    // Проверяем CLOB client
    if (!polymarketCLOB.isInitialized()) {
      alert('CLOB client not ready. Please wait a moment and try again.');
      return;
    }

    // Получаем tokenId для outcome
    let tokenId: string | undefined;
    
    if (outcomeIndex === 0) {
      tokenId = marketData.yesTokenId;
    } else if (outcomeIndex === 1) {
      tokenId = marketData.noTokenId;
    }

    // Fallback: ищем в tokens массиве
    if (!tokenId && marketData.tokens) {
      const token = marketData.tokens[outcomeIndex];
      tokenId = token?.token_id;
    }

    if (!tokenId) {
      console.error('Missing tokenId:', { outcomeIndex, marketData });
      alert(`Token ID not found for ${outcome}. This market may not support trading yet.`);
      return;
    }

    setIsTrading(true);

    try {
      console.log('🚀 Placing order:', {
        tokenId,
        outcome,
        amount,
        price,
        shares,
      });

      const order = outcomeIndex === 0
        ? await polymarketCLOB.buyYes(tokenId, amount, price)
        : await polymarketCLOB.buyNo(tokenId, amount, price);

      console.log('✅ Order placed:', order);
      alert(`Order placed successfully! ${amount} USDC on ${outcome}`);
      onClose();
    } catch (error: any) {
      console.error('Trading error:', error);
      alert(`Failed to place order: ${error.message || 'Unknown error'}`);
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-[30px] max-w-md w-full border border-border card-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight" style={{ color: '#140106', letterSpacing: '-1px' }}>
              {marketData.question}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Amount Input */}
        <div className="p-6">
          <div className="bg-background rounded-2xl p-4 mb-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl font-bold" style={{ color: '#140106' }}>
                ${amount}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAmount(Math.min(amount + 1, 1000))}
                  className="px-4 py-2 bg-card border border-border hover:bg-accent rounded-xl font-semibold transition-colors"
                  style={{ color: '#140106', fontSize: '16px', letterSpacing: '-1px' }}
                >
                  +1
                </button>
                <button
                  onClick={() => setAmount(Math.min(amount + 10, 1000))}
                  className="px-4 py-2 bg-card border border-border hover:bg-accent rounded-xl font-semibold transition-colors"
                  style={{ color: '#140106', fontSize: '16px', letterSpacing: '-1px' }}
                >
                  +10
                </button>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="1"
              max="100"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: '#22c55e' }}
            />
          </div>

          {/* CLOB Status */}
          {!isClobReady && authenticated && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-700" style={{ letterSpacing: '-1px' }}>
                ⏳ Initializing trading client...
              </p>
            </div>
          )}

          {/* Buy Button */}
          <button
            onClick={handleTrade}
            disabled={isTrading || !isClobReady}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              outcomeIndex === 0 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
            style={{ fontSize: '18px', letterSpacing: '-1px' }}
          >
            {isTrading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Placing Order...
              </span>
            ) : (
              <div>
                <div className="text-xl">Buy {outcome}</div>
                <div className="text-sm font-normal opacity-90">
                  To win ${potentialWin.toFixed(2)}
                </div>
              </div>
            )}
          </button>

          {/* Info */}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between" style={{ color: '#989898' }}>
              <span>Avg price</span>
              <span style={{ color: '#140106' }}>{(price * 100).toFixed(1)}¢</span>
            </div>
            <div className="flex justify-between" style={{ color: '#989898' }}>
              <span>Shares</span>
              <span style={{ color: '#140106' }}>{shares.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#989898' }}>
              <span>Potential return</span>
              <span style={{ color: '#140106' }}>${potentialWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#989898' }}>
              <span>Profit if win</span>
              <span className="text-green-500 font-semibold">+${profit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
