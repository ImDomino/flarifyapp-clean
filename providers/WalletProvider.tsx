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

export const WalletProviderInner = ({ children }: { children: React.ReactNode }) => {
  const { login, logout, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [eoaAddress, setEoaAddress] = useState<string | null>(null);
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      if (!ready || !authenticated) {
        setEthersSigner(null);
        setEoaAddress(null);
        setSafeAddress(null);
        setIsReady(false);
        return;
      }

      // Ищем embedded Privy wallet
      const wallet = wallets.find((w) => w.walletClientType === "privy");
      if (!wallet) {
        console.warn("⚠️ No Privy embedded wallet found");
        setEthersSigner(null);
        setEoaAddress(null);
        setSafeAddress(null);
        setIsReady(false);
        return;
      }

      try {
        // Получаем provider и создаём signer
        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.providers.Web3Provider(provider as any);
        const signer = ethersProvider.getSigner();
        const addr = await signer.getAddress();

        // Вычисляем Safe address детерминистически
        const config = getContractConfig(137); // Polygon
        const safe = deriveSafe(
          addr as `0x${string}`,
          config.SafeContracts.SafeFactory
        );

        console.log('🔑 Wallet initialized:');
        console.log('  EOA (signer):', addr);
        console.log('  Safe (funder):', safe);

        setEthersSigner(signer);
        setEoaAddress(addr);
        setSafeAddress(safe);
        setIsReady(true);
      } catch (e) {
        console.error("❌ Wallet setup error:", e);
        setEthersSigner(null);
        setEoaAddress(null);
        setSafeAddress(null);
        setIsReady(false);
      }
    };

    setup();
  }, [ready, authenticated, wallets]);

  const value: WalletContextValue = useMemo(
    () => ({
      login,
      logout,
      eoaAddress,
      safeAddress,
      ethersSigner,
      isReady,
    }),
    [login, logout, eoaAddress, safeAddress, ethersSigner, isReady]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProviderInner");
  return ctx;
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        defaultChain: polygon,
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
