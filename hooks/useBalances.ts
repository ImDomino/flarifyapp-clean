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

// Multiple RPC endpoints for fallback — publicnode first (fastest/most reliable)
const RPC_URLS = [
  "https://polygon-bor-rpc.publicnode.com",
  "https://rpc.ankr.com/polygon",
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL, // Alchemy (often times out)
].filter(Boolean) as string[];

function createClient(rpcUrl: string) {
  return createPublicClient({
    chain: polygon,
    transport: http(rpcUrl, { timeout: 8_000 }), // 8s timeout
  });
}

export const useBalances = (
  eoaAddress: string | null,
  safeAddress: string | null
) => {
  // Show loading while address hasn't resolved yet
  const [safeBalance, setSafeBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const fetchingRef = useRef(false);

  const fetchBalances = useCallback(async () => {
    if (!safeAddress || fetchingRef.current) return;
    fetchingRef.current = true;
    if (!hasFetched) setIsLoading(true);

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
        setHasFetched(true);
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
          console.warn("All RPCs failed for balance fetch — will retry");
        }
        // continue to next RPC
      }
    }

    setIsLoading(false);
    fetchingRef.current = false;
  }, [safeAddress, hasFetched]);

  // Fetch on mount and auto-refresh every 30s
  useEffect(() => {
    if (!safeAddress) return;

    fetchBalances();
    const interval = setInterval(fetchBalances, 30_000);
    return () => clearInterval(interval);
  }, [safeAddress, fetchBalances]);

  return {
    safeBalance,
    isLoading,
    refresh: fetchBalances,
  };
};
