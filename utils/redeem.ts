import { encodeFunctionData } from "viem";

// Polymarket contract addresses on Polygon
const CTF_ADDRESS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const HASH_ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";

// For negRisk markets, use the NegRiskAdapter
const NEG_RISK_ADAPTER_ADDRESS = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296";

const REDEEM_ABI = [{
  name: "redeemPositions",
  type: "function",
  inputs: [
    { name: "collateralToken", type: "address" },
    { name: "parentCollectionId", type: "bytes32" },
    { name: "conditionId", type: "bytes32" },
    { name: "indexSets", type: "uint256[]" },
  ],
  outputs: [],
}] as const;

export interface RedeemParams {
  conditionId: string;
  negRisk?: boolean;
}

/**
 * Creates a redeem transaction for the RelayClient.
 * 
 * For standard binary markets: calls CTF.redeemPositions
 * For negRisk markets: calls NegRiskAdapter.redeemPositions
 * 
 * Both use the same function signature, just different contract addresses.
 * indexSets [1, 2] covers both Yes and No outcomes for binary markets.
 */
export function createRedeemTx(params: RedeemParams) {
  const { conditionId, negRisk } = params;
  
  const contractAddress = negRisk ? NEG_RISK_ADAPTER_ADDRESS : CTF_ADDRESS;
  
  return {
    to: contractAddress,
    data: encodeFunctionData({
      abi: REDEEM_ABI,
      functionName: "redeemPositions",
      args: [
        USDC_ADDRESS,
        HASH_ZERO as `0x${string}`,
        conditionId as `0x${string}`,
        [BigInt(1), BigInt(2)],
      ],
    }),
    value: "0",
  };
}

/**
 * Fetches the conditionId for a given token (asset) ID via our server proxy.
 * Direct Gamma API calls fail from browser due to CORS.
 */
export async function getConditionId(tokenId: string): Promise<{ conditionId: string; negRisk: boolean } | null> {
  try {
    const res = await fetch(
      `/api/polymarket/condition?token_id=${encodeURIComponent(tokenId)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.conditionId) return null;
    
    return { conditionId: data.conditionId, negRisk: data.negRisk || false };
  } catch (err) {
    console.error("Failed to fetch conditionId:", err);
    return null;
  }
}