/**
 * Token approvals for Polymarket V2 trading on Polygon.
 *
 * V2 collateral is pUSD (not USDC.e). USDC.e is only needed as input to the
 * CollateralOnramp (which wraps into pUSD).
 *
 * Required approvals:
 *
 *   USDC.e (ERC-20) →
 *     - CollateralOnramp           (so Safe can wrap USDC.e into pUSD)
 *
 *   pUSD (ERC-20) →
 *     - CTF Exchange V2            (spends collateral on buys)
 *     - Neg Risk CTF Exchange V2   (spends collateral on neg-risk buys)
 *     - Neg Risk Adapter           (splits collateral for neg-risk markets)
 *     - CollateralOfframp          (so Safe can unwrap pUSD back to USDC.e)
 *
 *   Outcome tokens (ERC-1155 CTF) →
 *     - CTF Exchange V2            (transfers outcome tokens on sells/matches)
 *     - Neg Risk CTF Exchange V2
 *     - Neg Risk Adapter
 *     - CtfCollateralAdapter       (redeems positions to pUSD)
 *     - NegRiskCtfCollateralAdapter
 */

import {
  createPublicClient,
  http,
  encodeFunctionData,
  maxUint256,
} from "viem";
import { polygon } from "viem/chains";
import { CONTRACTS } from "@/lib/polymarket/contracts";

// Re-export for callers that used to import CONTRACTS from this file.
export { CONTRACTS };

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const ERC1155_ABI = [
  {
    name: "setApprovalForAll",
    type: "function",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "isApprovedForAll",
    type: "function",
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

const MIN_ALLOWANCE = BigInt("1000000000000"); // 1M at 6 decimals

export interface SafeTransaction {
  to: string;
  data: string;
  value: string;
  operation: number; // 0 = Call
}

// Spenders that need to pull pUSD from the Safe.
const PUSD_SPENDERS: readonly `0x${string}`[] = [
  CONTRACTS.CTF_EXCHANGE,
  CONTRACTS.NEG_RISK_CTF_EXCHANGE,
  CONTRACTS.NEG_RISK_ADAPTER,
  CONTRACTS.COLLATERAL_OFFRAMP,
];

// Operators that need to move the Safe's CTF ERC-1155 outcome tokens.
const ERC1155_OPERATORS: readonly `0x${string}`[] = [
  CONTRACTS.CTF_EXCHANGE,
  CONTRACTS.NEG_RISK_CTF_EXCHANGE,
  CONTRACTS.NEG_RISK_ADAPTER,
  CONTRACTS.CTF_COLLATERAL_ADAPTER,
  CONTRACTS.NEG_RISK_CTF_COLLATERAL_ADAPTER,
];

export interface ApprovalStatus {
  allApproved: boolean;
  /** USDC.e → CollateralOnramp */
  usdceOnramp: boolean;
  /** pUSD → exchange/adapter/offramp, keyed by spender address */
  pusd: Record<string, boolean>;
  /** ERC-1155 CTF → operator, keyed by operator address */
  erc1155: Record<string, boolean>;
}

function getPublicClient() {
  return createPublicClient({
    chain: polygon,
    transport: http(
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL ||
        "https://polygon-bor-rpc.publicnode.com"
    ),
  });
}

export async function checkAllApprovals(
  safeAddress: string
): Promise<ApprovalStatus> {
  const publicClient = getPublicClient();
  const safe = safeAddress as `0x${string}`;

  const usdceOnrampAllowancePromise = publicClient.readContract({
    address: CONTRACTS.USDC_E,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [safe, CONTRACTS.COLLATERAL_ONRAMP],
  }) as Promise<bigint>;

  const pusdAllowancePromises = PUSD_SPENDERS.map(
    (spender) =>
      publicClient.readContract({
        address: CONTRACTS.PUSD,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [safe, spender],
      }) as Promise<bigint>
  );

  const erc1155ApprovalPromises = ERC1155_OPERATORS.map(
    (operator) =>
      publicClient.readContract({
        address: CONTRACTS.CTF,
        abi: ERC1155_ABI,
        functionName: "isApprovedForAll",
        args: [safe, operator],
      }) as Promise<boolean>
  );

  const [usdceOnrampAllowance, pusdAllowances, erc1155Approvals] =
    await Promise.all([
      usdceOnrampAllowancePromise,
      Promise.all(pusdAllowancePromises),
      Promise.all(erc1155ApprovalPromises),
    ]);

  const pusd: Record<string, boolean> = {};
  PUSD_SPENDERS.forEach((spender, i) => {
    pusd[spender] = pusdAllowances[i] >= MIN_ALLOWANCE;
  });

  const erc1155: Record<string, boolean> = {};
  ERC1155_OPERATORS.forEach((operator, i) => {
    erc1155[operator] = erc1155Approvals[i];
  });

  const usdceOnramp = usdceOnrampAllowance >= MIN_ALLOWANCE;
  const allApproved =
    usdceOnramp &&
    Object.values(pusd).every(Boolean) &&
    Object.values(erc1155).every(Boolean);

  return { allApproved, usdceOnramp, pusd, erc1155 };
}

function approveErc20Tx(
  token: `0x${string}`,
  spender: `0x${string}`
): SafeTransaction {
  return {
    to: token,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, maxUint256],
    }),
    value: "0",
    operation: 0,
  };
}

function setApprovalForAllTx(operator: `0x${string}`): SafeTransaction {
  return {
    to: CONTRACTS.CTF,
    data: encodeFunctionData({
      abi: ERC1155_ABI,
      functionName: "setApprovalForAll",
      args: [operator, true],
    }),
    value: "0",
    operation: 0,
  };
}

export function createAllApprovalTxs(): SafeTransaction[] {
  const txs: SafeTransaction[] = [];

  txs.push(approveErc20Tx(CONTRACTS.USDC_E, CONTRACTS.COLLATERAL_ONRAMP));

  for (const spender of PUSD_SPENDERS) {
    txs.push(approveErc20Tx(CONTRACTS.PUSD, spender));
  }

  for (const operator of ERC1155_OPERATORS) {
    txs.push(setApprovalForAllTx(operator));
  }

  return txs;
}

export async function createMissingApprovalTxs(
  safeAddress: string
): Promise<SafeTransaction[]> {
  const status = await checkAllApprovals(safeAddress);
  if (status.allApproved) return [];

  const txs: SafeTransaction[] = [];

  if (!status.usdceOnramp) {
    txs.push(approveErc20Tx(CONTRACTS.USDC_E, CONTRACTS.COLLATERAL_ONRAMP));
  }

  for (const spender of PUSD_SPENDERS) {
    if (!status.pusd[spender]) {
      txs.push(approveErc20Tx(CONTRACTS.PUSD, spender));
    }
  }

  for (const operator of ERC1155_OPERATORS) {
    if (!status.erc1155[operator]) {
      txs.push(setApprovalForAllTx(operator));
    }
  }

  return txs;
}
