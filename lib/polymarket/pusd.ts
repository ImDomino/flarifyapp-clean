/**
 * pUSD (Polymarket USD) wrap/unwrap helpers.
 *
 * pUSD replaces USDC.e as the collateral for the V2 exchange. Users must wrap
 * USDC.e into pUSD before trading; unwrapping returns USDC.e.
 *
 *   wrap:   approve CollateralOnramp  to spend USDC.e → call wrap(USDC.e, to, amount)   → receive pUSD
 *   unwrap: approve CollateralOfframp to spend pUSD   → call unwrap(USDC.e, to, amount) → receive USDC.e
 *
 * Both pUSD and USDC.e are 6 decimals.
 */

import {
  createPublicClient,
  http,
  encodeFunctionData,
  maxUint256,
} from "viem";
import { polygon } from "viem/chains";
import { CONTRACTS, RPC_URLS } from "./contracts";

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
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const RAMP_ABI = [
  {
    name: "wrap",
    type: "function",
    inputs: [
      { name: "asset", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "unwrap",
    type: "function",
    inputs: [
      { name: "asset", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export interface SafeTx {
  to: string;
  data: string;
  value: string;
  operation?: number;
}

/** Build an ERC-20 approve tx (used for USDC.e → Onramp, pUSD → Offramp). */
export function buildApproveTx(
  token: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint = maxUint256
): SafeTx {
  return {
    to: token,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount],
    }),
    value: "0",
    operation: 0,
  };
}

/** Wrap USDC.e into pUSD via CollateralOnramp. */
export function buildWrapTx(safeAddress: `0x${string}`, amountUsdce: bigint): SafeTx {
  return {
    to: CONTRACTS.COLLATERAL_ONRAMP,
    data: encodeFunctionData({
      abi: RAMP_ABI,
      functionName: "wrap",
      args: [CONTRACTS.USDC_E, safeAddress, amountUsdce],
    }),
    value: "0",
    operation: 0,
  };
}

/** Unwrap pUSD into USDC.e via CollateralOfframp. */
export function buildUnwrapTx(safeAddress: `0x${string}`, amountPusd: bigint): SafeTx {
  return {
    to: CONTRACTS.COLLATERAL_OFFRAMP,
    data: encodeFunctionData({
      abi: RAMP_ABI,
      functionName: "unwrap",
      args: [CONTRACTS.USDC_E, safeAddress, amountPusd],
    }),
    value: "0",
    operation: 0,
  };
}

function getPublicClient(rpcUrl: string) {
  return createPublicClient({
    chain: polygon,
    transport: http(rpcUrl, { timeout: 8_000 }),
  });
}

async function readErc20BalanceWithFallback(
  token: `0x${string}`,
  account: `0x${string}`
): Promise<bigint> {
  let lastErr: unknown;
  for (const url of RPC_URLS) {
    try {
      const client = getPublicClient(url);
      return (await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account],
      })) as bigint;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("All RPCs failed");
}

export async function readPusdBalance(safe: `0x${string}`): Promise<bigint> {
  return readErc20BalanceWithFallback(CONTRACTS.PUSD, safe);
}

export async function readUsdceBalance(safe: `0x${string}`): Promise<bigint> {
  return readErc20BalanceWithFallback(CONTRACTS.USDC_E, safe);
}

async function readErc20AllowanceWithFallback(
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`
): Promise<bigint> {
  let lastErr: unknown;
  for (const url of RPC_URLS) {
    try {
      const client = getPublicClient(url);
      return (await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [owner, spender],
      })) as bigint;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("All RPCs failed");
}

/** Read the USDC.e allowance the Safe has granted to the Onramp. */
export function readUsdceOnrampAllowance(safe: `0x${string}`): Promise<bigint> {
  return readErc20AllowanceWithFallback(CONTRACTS.USDC_E, safe, CONTRACTS.COLLATERAL_ONRAMP);
}

/** Read the pUSD allowance the Safe has granted to the Offramp. */
export function readPusdOfframpAllowance(safe: `0x${string}`): Promise<bigint> {
  return readErc20AllowanceWithFallback(CONTRACTS.PUSD, safe, CONTRACTS.COLLATERAL_OFFRAMP);
}
