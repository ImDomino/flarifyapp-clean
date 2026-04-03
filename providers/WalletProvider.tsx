"use client";

import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { ethers } from "ethers";
import { polygon } from "viem/chains";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";

type WalletContextValue = {
  login: () => void;
  logout: () => Promise<void>;
  eoaAddress: string | null;
  safeAddress: string | null;
  ethersSigner: ethers.Signer | null;
  isReady: boolean;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const WalletProviderInner = ({ children }: { children: React.ReactNode }) => {
  const { login, logout, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [eoaAddress, setEoaAddress] = useState<string | null>(null);
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Derive a stable key so the effect only re-runs when the wallet list
  // actually changes, not on every render.
  const walletsKey = wallets.map((w) => w.address).join(",");

  useEffect(() => {
    let cancelled = false;

    if (!ready || !authenticated) {
      setEthersSigner(null);
      setEoaAddress(null);
      setSafeAddress(null);
      setIsReady(false);
      return;
    }

    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (!wallet) {
      // Embedded wallet not available yet — the effect will re-run
      // automatically when `wallets` updates with the new wallet.
      return;
    }

    const setup = async () => {
      try {
        // Switch to Polygon
        try {
          await wallet.switchChain(polygon.id);
        } catch {
          // May already be on Polygon
        }

        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.providers.Web3Provider(provider as any);
        const signer = ethersProvider.getSigner();
        const addr = await signer.getAddress();

        const config = getContractConfig(137);
        const safe = deriveSafe(
          addr as `0x${string}`,
          config.SafeContracts.SafeFactory
        );

        if (cancelled) return;

        setEthersSigner(signer);
        setEoaAddress(addr);
        setSafeAddress(safe);
        setIsReady(true);
      } catch (e) {
        console.error("Wallet setup error:", e);
        if (!cancelled) {
          setEthersSigner(null);
          setEoaAddress(null);
          setSafeAddress(null);
          setIsReady(false);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, walletsKey]);

  const value: WalletContextValue = useMemo(
    () => ({ login, logout, eoaAddress, safeAddress, ethersSigner, isReady }),
    [login, logout, eoaAddress, safeAddress, ethersSigner, isReady]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        defaultChain: polygon,
        supportedChains: [polygon],
        loginMethods: ["google"],
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <WalletProviderInner>{children}</WalletProviderInner>
    </PrivyProvider>
  );
};
