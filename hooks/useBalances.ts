"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { polygon } from "viem/chains";

const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_E_DECIMALS = 6;

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const useBalances = (eoaAddress: string | null, safeAddress: string | null) => {
  const [safeBalance, setSafeBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);

  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"),
  });

  const fetchBalances = useCallback(async () => {
    if (!safeAddress) return;

    setIsLoading(true);
    try {
      const safeBalanceRaw = await publicClient.readContract({
        address: USDC_E_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [safeAddress as `0x${string}`],
      });

      setSafeBalance(formatUnits(safeBalanceRaw, USDC_E_DECIMALS));

      console.log("💰 Safe balance fetched:", {
        safe: formatUnits(safeBalanceRaw, USDC_E_DECIMALS),
      });
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [safeAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    safeBalance,
    isLoading,
    refresh: fetchBalances,
  };
};
