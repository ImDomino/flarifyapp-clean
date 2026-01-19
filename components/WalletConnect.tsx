"use client";

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Wallet, LogOut, CircleDollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { polymarketCLOB } from '@/lib/polymarket/clob-client';

export function WalletConnect() {
  const { primaryWallet, setShowAuthFlow, handleLogOut, user } = useDynamicContext();
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function initializeCLOB() {
      if (primaryWallet) {
        try {
          setIsLoading(true);
          
          // Get ethers signer from Dynamic wallet
          const provider = await primaryWallet.connector.getWalletClient();
          const ethersProvider = new ethers.BrowserProvider(provider);
          const signer = await ethersProvider.getSigner();

          // Initialize Polymarket CLOB client
          await polymarketCLOB.initialize(signer);

          // Fetch USDC balance
          const balance = await polymarketCLOB.getUSDCBalance();
          setUsdcBalance(balance);
        } catch (error) {
          console.error('Error initializing wallet:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUsdcBalance(null);
        polymarketCLOB.disconnect();
      }
    }

    initializeCLOB();
  }, [primaryWallet]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (primaryWallet) {
    return (
      <div className="flex items-center space-x-3">
        {/* USDC Balance */}
        {usdcBalance !== null && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              ${usdcBalance.toFixed(2)} USDC
            </span>
          </div>
        )}

        {/* Wallet Address */}
        <div className="flex items-center space-x-2 px-3 py-2 bg-card rounded-lg border border-border">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {formatAddress(primaryWallet.address)}
          </span>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={handleLogOut}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Disconnect Wallet"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowAuthFlow(true)}
      disabled={isLoading}
      className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors glow-effect disabled:opacity-50"
    >
      <Wallet className="h-5 w-5" />
      <span>Connect Wallet</span>
    </button>
  );
}
