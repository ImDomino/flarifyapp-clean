/**
 * Token Approvals для Polymarket Trading
 * 
 * Согласно документации, Safe должен одобрить следующие контракты:
 * 
 * USDC.e (ERC-20) Approvals:
 * - CTF Contract: 0x4d97dcd97ec945f40cf65f87097ace5ea0476045
 * - CTF Exchange: 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E
 * - Neg Risk CTF Exchange: 0xC5d563A36AE78145C45a50134d48A1215220f80a
 * - Neg Risk Adapter: 0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296
 * 
 * Outcome Token (ERC-1155) Approvals:
 * - CTF Exchange: 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E
 * - Neg Risk CTF Exchange: 0xC5d563A36AE78145C45a50134d48A1215220f80a
 * - Neg Risk Adapter: 0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296
 */

import { createPublicClient, http, encodeFunctionData, maxUint256 } from "viem";
import { polygon } from "viem/chains";

// Contract Addresses (Polygon Mainnet)
export const CONTRACTS = {
  // Token contracts
  USDC_E: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as `0x${string}`,
  CTF_CONTRACT: "0x4d97dcd97ec945f40cf65f87097ace5ea0476045" as `0x${string}`,
  
  // Exchange contracts (need approval)
  CTF_EXCHANGE: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as `0x${string}`,
  NEG_RISK_CTF_EXCHANGE: "0xC5d563A36AE78145C45a50134d48A1215220f80a" as `0x${string}`,
  NEG_RISK_ADAPTER: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296" as `0x${string}`,
};

// ABIs
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

// Minimum allowance threshold (1M USDC.e = 1000000 * 10^6)
const MIN_ALLOWANCE = BigInt("1000000000000");

export interface SafeTransaction {
  to: string;
  data: string;
  value: string;
  operation: number; // 0 = Call
}

export interface ApprovalStatus {
  allApproved: boolean;
  usdc: {
    ctfContract: boolean;
    ctfExchange: boolean;
    negRiskExchange: boolean;
    negRiskAdapter: boolean;
  };
  erc1155: {
    ctfExchange: boolean;
    negRiskExchange: boolean;
    negRiskAdapter: boolean;
  };
}

/**
 * Создаёт PublicClient для чтения данных из блокчейна
 */
function getPublicClient() {
  return createPublicClient({
    chain: polygon,
    transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"),
  });
}

/**
 * Проверяет все необходимые approvals для Safe
 */
export async function checkAllApprovals(safeAddress: string): Promise<ApprovalStatus> {
  const publicClient = getPublicClient();
  const safe = safeAddress as `0x${string}`;

  // Check USDC.e allowances
  const [ctfContractAllowance, ctfExchangeAllowance, negRiskExchangeAllowance, negRiskAdapterAllowance] =
    await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.USDC_E,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [safe, CONTRACTS.CTF_CONTRACT],
      }),
      publicClient.readContract({
        address: CONTRACTS.USDC_E,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [safe, CONTRACTS.CTF_EXCHANGE],
      }),
      publicClient.readContract({
        address: CONTRACTS.USDC_E,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [safe, CONTRACTS.NEG_RISK_CTF_EXCHANGE],
      }),
      publicClient.readContract({
        address: CONTRACTS.USDC_E,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [safe, CONTRACTS.NEG_RISK_ADAPTER],
      }),
    ]);

  // Check ERC-1155 approvals
  const [ctfExchange1155, negRiskExchange1155, negRiskAdapter1155] = await Promise.all([
    publicClient.readContract({
      address: CONTRACTS.CTF_CONTRACT,
      abi: ERC1155_ABI,
      functionName: "isApprovedForAll",
      args: [safe, CONTRACTS.CTF_EXCHANGE],
    }),
    publicClient.readContract({
      address: CONTRACTS.CTF_CONTRACT,
      abi: ERC1155_ABI,
      functionName: "isApprovedForAll",
      args: [safe, CONTRACTS.NEG_RISK_CTF_EXCHANGE],
    }),
    publicClient.readContract({
      address: CONTRACTS.CTF_CONTRACT,
      abi: ERC1155_ABI,
      functionName: "isApprovedForAll",
      args: [safe, CONTRACTS.NEG_RISK_ADAPTER],
    }),
  ]);

  const status: ApprovalStatus = {
    allApproved: false,
    usdc: {
      ctfContract: ctfContractAllowance >= MIN_ALLOWANCE,
      ctfExchange: ctfExchangeAllowance >= MIN_ALLOWANCE,
      negRiskExchange: negRiskExchangeAllowance >= MIN_ALLOWANCE,
      negRiskAdapter: negRiskAdapterAllowance >= MIN_ALLOWANCE,
    },
    erc1155: {
      ctfExchange: ctfExchange1155,
      negRiskExchange: negRiskExchange1155,
      negRiskAdapter: negRiskAdapter1155,
    },
  };

  status.allApproved =
    status.usdc.ctfContract &&
    status.usdc.ctfExchange &&
    status.usdc.negRiskExchange &&
    status.usdc.negRiskAdapter &&
    status.erc1155.ctfExchange &&
    status.erc1155.negRiskExchange &&
    status.erc1155.negRiskAdapter;

  return status;
}

/**
 * Создаёт транзакции для всех необходимых approvals
 */
export function createAllApprovalTxs(): SafeTransaction[] {
  const txs: SafeTransaction[] = [];

  // USDC.e approvals (ERC-20)
  const usdcSpenders = [
    CONTRACTS.CTF_CONTRACT,
    CONTRACTS.CTF_EXCHANGE,
    CONTRACTS.NEG_RISK_CTF_EXCHANGE,
    CONTRACTS.NEG_RISK_ADAPTER,
  ];

  for (const spender of usdcSpenders) {
    txs.push({
      to: CONTRACTS.USDC_E,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, maxUint256],
      }),
      value: "0",
      operation: 0, // Call
    });
  }

  // Outcome token approvals (ERC-1155)
  const erc1155Operators = [
    CONTRACTS.CTF_EXCHANGE,
    CONTRACTS.NEG_RISK_CTF_EXCHANGE,
    CONTRACTS.NEG_RISK_ADAPTER,
  ];

  for (const operator of erc1155Operators) {
    txs.push({
      to: CONTRACTS.CTF_CONTRACT,
      data: encodeFunctionData({
        abi: ERC1155_ABI,
        functionName: "setApprovalForAll",
        args: [operator, true],
      }),
      value: "0",
      operation: 0, // Call
    });
  }

  return txs;
}

/**
 * Создаёт только недостающие approval транзакции
 */
export async function createMissingApprovalTxs(safeAddress: string): Promise<SafeTransaction[]> {
  const status = await checkAllApprovals(safeAddress);
  
  if (status.allApproved) {
    return [];
  }

  const txs: SafeTransaction[] = [];

  // USDC.e approvals
  if (!status.usdc.ctfContract) {
    txs.push({
      to: CONTRACTS.USDC_E,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.CTF_CONTRACT, maxUint256],
      }),
      value: "0",
      operation: 0,
    });
  }

  if (!status.usdc.ctfExchange) {
    txs.push({
      to: CONTRACTS.USDC_E,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.CTF_EXCHANGE, maxUint256],
      }),
      value: "0",
      operation: 0,
    });
  }

  if (!status.usdc.negRiskExchange) {
    txs.push({
      to: CONTRACTS.USDC_E,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.NEG_RISK_CTF_EXCHANGE, maxUint256],
      }),
      value: "0",
      operation: 0,
    });
  }

  if (!status.usdc.negRiskAdapter) {
    txs.push({
      to: CONTRACTS.USDC_E,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.NEG_RISK_ADAPTER, maxUint256],
      }),
      value: "0",
      operation: 0,
    });
  }

  // ERC-1155 approvals
  if (!status.erc1155.ctfExchange) {
    txs.push({
      to: CONTRACTS.CTF_CONTRACT,
      data: encodeFunctionData({
        abi: ERC1155_ABI,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.CTF_EXCHANGE, true],
      }),
      value: "0",
      operation: 0,
    });
  }

  if (!status.erc1155.negRiskExchange) {
    txs.push({
      to: CONTRACTS.CTF_CONTRACT,
      data: encodeFunctionData({
        abi: ERC1155_ABI,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.NEG_RISK_CTF_EXCHANGE, true],
      }),
      value: "0",
      operation: 0,
    });
  }

  if (!status.erc1155.negRiskAdapter) {
    txs.push({
      to: CONTRACTS.CTF_CONTRACT,
      data: encodeFunctionData({
        abi: ERC1155_ABI,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.NEG_RISK_ADAPTER, true],
      }),
      value: "0",
      operation: 0,
    });
  }

  return txs;
}
