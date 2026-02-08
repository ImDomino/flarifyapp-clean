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
  "https://polygon-bor-rpc.publicnode.com",      // Публичный RPC первым (быстрее на холодных запросах)
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL,       // Alchemy вторым
  "https://polygon-rpc.com",
  "https://rpc.ankr.com/polygon",
].filter(Boolean) as string[];

function createClient(rpcUrl: string) {
  return createPublicClient({
    chain: polygon,
    transport: http(rpcUrl, { 
      timeout: 30_000,  // 30s timeout (первый запрос часто медленный)
      retryCount: 2,    // Retry 2 раза
      retryDelay: 1000, // 1s между попытками
    }),
  });
}

export const useBalances = (
  eoaAddress: string | null,
  safeAddress: string | null
) => {
  const [safeBalance, setSafeBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const fetchingRef = useRef(false);
  const lastSuccessfulRpcRef = useRef<number>(0); // Запоминаем последний успешный RPC

  const fetchBalances = useCallback(async () => {
    if (!safeAddress || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);

    // Начинаем с последнего успешного RPC
    const startIndex = lastSuccessfulRpcRef.current;
    const orderedRpcs = [
      ...RPC_URLS.slice(startIndex),
      ...RPC_URLS.slice(0, startIndex)
    ];

    for (let i = 0; i < orderedRpcs.length; i++) {
      const rpcUrl = orderedRpcs[i];
      const originalIndex = RPC_URLS.indexOf(rpcUrl);
      
      try {
        const client = createClient(rpcUrl);
        const safeBalanceRaw = await client.readContract({
          address: USDC_E_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [safeAddress as `0x${string}`],
        });
        
        const formatted = formatUnits(safeBalanceRaw, USDC_E_DECIMALS);
        setSafeBalance(formatted);
        lastSuccessfulRpcRef.current = originalIndex; // Запоминаем успешный RPC
        
        console.log("💰 Safe balance fetched:", {
          safe: formatted,
          rpc: rpcUrl.includes("alchemy") ? "alchemy" : rpcUrl.split("/")[2],
        });
        
        break; // Успех, выходим
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message.slice(0, 80) : "unknown";
        console.warn(
          `Balance fetch failed with RPC ${i + 1}/${orderedRpcs.length}:`,
          rpcUrl.split("/")[2],
          errorMsg
        );
        
        if (i === orderedRpcs.length - 1) {
          console.error("❌ All RPCs failed for balance fetch");
          // Не сбрасываем баланс в 0, оставляем последнее значение
        }
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
