"use client";

import { createContext, useContext } from "react";
import { usePrivy } from "@privy-io/react-auth";

interface BetaGateContextValue {
  isApproved: boolean;
  isLoading: boolean;
}

const BetaGateContext = createContext<BetaGateContextValue>({
  isApproved: false,
  isLoading: true,
});

export function useBetaGate() {
  return useContext(BetaGateContext);
}

export function BetaGateProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, ready } = usePrivy();

  return (
    <BetaGateContext.Provider
      value={{ isApproved: authenticated, isLoading: !ready }}
    >
      {children}
    </BetaGateContext.Provider>
  );
}
