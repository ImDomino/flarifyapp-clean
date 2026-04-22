import { encodeFunctionData } from "viem";
import { CONTRACTS } from "@/lib/polymarket/contracts";

const HASH_ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";

const REDEEM_ABI = [
  {
    name: "redeemPositions",
    type: "function",
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId", type: "bytes32" },
      { name: "indexSets", type: "uint256[]" },
    ],
    outputs: [],
  },
] as const;

export interface RedeemParams {
  conditionId: string;
  negRisk?: boolean;
}

/**
 * Build a redeem transaction.
 *
 * V2 routes through the CollateralAdapters so payouts settle in pUSD. The
 * adapters preserve the same redeemPositions signature as the underlying
 * CTF / NegRiskAdapter, so callers keep the same interface.
 *   - standard markets  → CtfCollateralAdapter
 *   - neg-risk markets  → NegRiskCtfCollateralAdapter
 *
 * indexSets [1, 2] covers both Yes and No for binary markets — the contract
 * pays only the winning outcomes, so passing both is safe and idempotent.
 */
export function createRedeemTx(params: RedeemParams) {
  const { conditionId, negRisk } = params;

  const contractAddress = negRisk
    ? CONTRACTS.NEG_RISK_CTF_COLLATERAL_ADAPTER
    : CONTRACTS.CTF_COLLATERAL_ADAPTER;

  return {
    to: contractAddress,
    data: encodeFunctionData({
      abi: REDEEM_ABI,
      functionName: "redeemPositions",
      args: [
        CONTRACTS.USDC_E,
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
export async function getConditionId(
  tokenId: string
): Promise<{ conditionId: string; negRisk: boolean } | null> {
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
