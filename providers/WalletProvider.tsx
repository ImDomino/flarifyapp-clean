"use client";

import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { ethers } from "ethers";
import { polygon } from "viem/chains";

type WalletContextValue = {
  login: () => void;
  logout: () => Promise<void>;
  eoaAddress: string | null;
  ethersSigner: ethers.Signer | null;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProviderInner = ({ children }: { children: React.ReactNode }) => {
  const { login, logout, ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [eoaAddress, setEoaAddress] = useState<string | null>(null);
  const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const setup = async () => {
      if (!ready || !authenticated) {
        setEthersSigner(null);
        setEoaAddress(null);
        return;
      }

      // берем embedded privy-кошелек
      const wallet = wallets.find((w) => w.walletClientType === "privy");
      if (!wallet) {
        setEthersSigner(null);
        setEoaAddress(null);
        return;
      }

      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.providers.Web3Provider(provider as any);
      const signer = ethersProvider.getSigner();
      const addr = await signer.getAddress();

      setEthersSigner(signer);
      setEoaAddress(addr);
    };

    setup().catch((e) => {
      console.error("Wallet setup error", e);
      setEthersSigner(null);
      setEoaAddress(null);
    });
  }, [ready, authenticated, wallets]);

  const value: WalletContextValue = useMemo(
    () => ({
      login,
      logout,
      eoaAddress,
      ethersSigner,
    }),
    [login, logout, eoaAddress, ethersSigner]
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
