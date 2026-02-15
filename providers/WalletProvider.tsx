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

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const setup = async (attempt = 1) => {
      if (cancelled) return;

      if (!ready || !authenticated) {
        setEthersSigner(null);
        setEoaAddress(null);
        setSafeAddress(null);
        setIsReady(false);
        return;
      }

      const wallet = wallets.find((w) => w.walletClientType === "privy");
      if (!wallet) {
        if (attempt <= 10) {
          console.warn(
            `⚠️ No Privy embedded wallet found, retry ${attempt}/10...`
          );
          retryTimer = setTimeout(() => setup(attempt + 1), 500);
        } else {
          console.error("❌ Privy embedded wallet not found after 10 retries");
        }
        return;
      }

      try {
        // Явно переключаемся на Polygon
        try {
          await wallet.switchChain(polygon.id);
          console.log("🔗 Switched to Polygon (chainId: 137)");
        } catch (switchErr: any) {
          console.warn(
            "⚠️ Chain switch failed (may already be on Polygon):",
            switchErr?.message
          );
        }

        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.providers.Web3Provider(provider as any);
        const signer = ethersProvider.getSigner();
        const addr = await signer.getAddress();

        const network = await ethersProvider.getNetwork();
        if (network.chainId !== 137) {
          console.warn(
            `⚠️ Expected chainId 137, got ${network.chainId}. Retrying...`
          );
          if (attempt <= 5) {
            retryTimer = setTimeout(() => setup(attempt + 1), 1000);
            return;
          }
        }

        const config = getContractConfig(137);
        const safe = deriveSafe(
          addr as `0x${string}`,
          config.SafeContracts.SafeFactory
        );

        if (cancelled) return;

        console.log("🔑 Wallet initialized:");
        console.log("  EOA (signer):", addr);
        console.log("  Safe (funder):", safe);
        console.log("  Chain ID:", network.chainId);

        setEthersSigner(signer);
        setEoaAddress(addr);
        setSafeAddress(safe);
        setIsReady(true);
      } catch (e) {
        console.error("❌ Wallet setup error:", e);
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
      clearTimeout(retryTimer);
    };
  }, [ready, authenticated, wallets]);

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
