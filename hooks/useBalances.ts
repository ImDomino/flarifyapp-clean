"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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

// Multiple RPC endpoints for fallback
const RPC_URLS = [
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL, // User's Alchemy (primary)
  "https://polygon-bor-rpc.publicnode.com",
  "https://polygon-rpc.com",
  "https://rpc.ankr.com/polygon",
].filter(Boolean) as string[];

function createClient(rpcUrl: string) {
  return createPublicClient({
    chain: polygon,
    transport: http(rpcUrl, { timeout: 15_000 }), // 15s timeout
  });
}

export const useBalances = (
  eoaAddress: string | null,
  safeAddress: string | null
) => {
  const [safeBalance, setSafeBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const fetchingRef = useRef(false);

  const fetchBalances = useCallback(async () => {
    if (!safeAddress || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);

    for (let i = 0; i < RPC_URLS.length; i++) {
      try {
        const client = createClient(RPC_URLS[i]);
        const safeBalanceRaw = await client.readContract({
          address: USDC_E_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [safeAddress as `0x${string}`],
        });
        const formatted = formatUnits(safeBalanceRaw, USDC_E_DECIMALS);
        setSafeBalance(formatted);
        console.log("💰 Safe balance fetched:", {
          safe: formatted,
          rpc: RPC_URLS[i].includes("alchemy") ? "alchemy" : RPC_URLS[i].split("/")[2],
        });
        break; // success, stop trying
      } catch (error) {
        console.warn(
          `Balance fetch failed with RPC ${i + 1}/${RPC_URLS.length}:`,
          RPC_URLS[i].split("/")[2],
          error instanceof Error ? error.message.slice(0, 80) : "unknown"
        );
        if (i === RPC_URLS.length - 1) {
          console.error("All RPCs failed for balance fetch");
        }
        // continue to next RPC
      }
    }

    setIsLoading(false);
    fetchingRef.current = false;
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
