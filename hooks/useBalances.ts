"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { polygon } from "viem/chains";
import {
  CONTRACTS,
  USDC_E_DECIMALS,
  PUSD_DECIMALS,
  RPC_URLS,
} from "@/lib/polymarket/contracts";

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function createClient(rpcUrl: string) {
  return createPublicClient({
    chain: polygon,
    transport: http(rpcUrl, { timeout: 8_000 }),
  });
}

export const useBalances = (
  eoaAddress: string | null,
  safeAddress: string | null
) => {
  const [pusdBalance, setPusdBalance] = useState<string>("0");
  const [usdceBalance, setUsdceBalance] = useState<string>("0");
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
        const [pusdRaw, usdceRaw] = await Promise.all([
          client.readContract({
            address: CONTRACTS.PUSD,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [safeAddress as `0x${string}`],
          }),
          client.readContract({
            address: CONTRACTS.USDC_E,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [safeAddress as `0x${string}`],
          }),
        ]);

        const pusdFmt = formatUnits(pusdRaw as bigint, PUSD_DECIMALS);
        const usdceFmt = formatUnits(usdceRaw as bigint, USDC_E_DECIMALS);

        setPusdBalance(pusdFmt);
        setUsdceBalance(usdceFmt);
        setHasFetched(true);

        console.log("💰 Safe balances:", {
          pusd: pusdFmt,
          usdce: usdceFmt,
          rpc: RPC_URLS[i].split("/")[2],
        });
        break;
      } catch (error) {
        console.warn(
          `Balance fetch failed with RPC ${i + 1}/${RPC_URLS.length}:`,
          RPC_URLS[i].split("/")[2],
          error instanceof Error ? error.message.slice(0, 80) : "unknown"
        );
        if (i === RPC_URLS.length - 1) {
          console.warn("All RPCs failed for balance fetch — will retry");
        }
      }
    }

    setIsLoading(false);
    fetchingRef.current = false;
  }, [safeAddress, hasFetched]);

  useEffect(() => {
    if (!safeAddress) return;

    fetchBalances();
    const interval = setInterval(fetchBalances, 30_000);
    return () => clearInterval(interval);
  }, [safeAddress, fetchBalances]);

  // Combined display balance: pUSD is tradable, USDC.e is wrappable-and-then-tradable.
  // Users think of this as a single "on Polymarket" balance.
  const totalNum = parseFloat(pusdBalance || "0") + parseFloat(usdceBalance || "0");
  const safeBalance = totalNum.toString();

  return {
    safeBalance,
    pusdBalance,
    usdceBalance,
    isLoading,
    refresh: fetchBalances,
  };
};
