// scripts/diagnose-balance.ts
/**
 * Скрипт для диагностики проблемы "not enough balance / allowance"
 * 
 * Проверяет:
 * 1. USDC баланс на EOA и Safe
 * 2. Allowance USDC → Exchange на обоих адресах
 * 3. Конфигурацию CLOB клиента
 * 
 * Запуск: npx tsx scripts/diagnose-balance.ts
 */

import { createPublicClient, http, formatUnits, parseUnits } from "viem";
import { polygon } from "viem/chains";

// Polygon USDC.e contract
const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_DECIMALS = 6;

// Polymarket Exchange contract (где нужен allowance)
const EXCHANGE_ADDRESS = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function diagnose() {
  console.log("🔍 Диагностика баланса и allowance для Polymarket\n");

  // ⚠️ ВВЕДИТЕ ВАШИ АДРЕСА ЗДЕСЬ:
  const EOA_ADDRESS = "0x01fc88E29a240feb317Afc38070e72648e7E815d"; // Из логов
  const SAFE_ADDRESS = "YOUR_SAFE_ADDRESS_HERE"; // Получить из useSafeDeployment

  console.log("📍 Адреса:");
  console.log("  EOA (signer):", EOA_ADDRESS);
  console.log("  Safe (funder):", SAFE_ADDRESS);
  console.log("  Exchange:", EXCHANGE_ADDRESS);
  console.log("");

  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"),
  });

  try {
    // ========================================
    // 1. ПРОВЕРКА БАЛАНСОВ
    // ========================================
    console.log("💰 1. Проверка USDC балансов:\n");

    // EOA баланс
    const eoaBalance = await publicClient.readContract({
      address: USDC_E_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [EOA_ADDRESS as `0x${string}`],
    });

    const eoaBalanceFormatted = formatUnits(eoaBalance, USDC_DECIMALS);
    console.log(`  EOA Balance: ${eoaBalanceFormatted} USDC.e`);

    // Safe баланс
    const safeBalance = await publicClient.readContract({
      address: USDC_E_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [SAFE_ADDRESS as `0x${string}`],
    });

    const safeBalanceFormatted = formatUnits(safeBalance, USDC_DECIMALS);
    console.log(`  Safe Balance: ${safeBalanceFormatted} USDC.e`);
    console.log("");

    // ========================================
    // 2. ПРОВЕРКА ALLOWANCE
    // ========================================
    console.log("🔐 2. Проверка allowance (USDC → Exchange):\n");

    // EOA allowance
    const eoaAllowance = await publicClient.readContract({
      address: USDC_E_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [EOA_ADDRESS as `0x${string}`, EXCHANGE_ADDRESS as `0x${string}`],
    });

    const eoaAllowanceFormatted = formatUnits(eoaAllowance, USDC_DECIMALS);
    console.log(`  EOA Allowance: ${eoaAllowanceFormatted} USDC.e`);

    // Safe allowance
    const safeAllowance = await publicClient.readContract({
      address: USDC_E_ADDRESS,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [SAFE_ADDRESS as `0x${string}`, EXCHANGE_ADDRESS as `0x${string}`],
    });

    const safeAllowanceFormatted = formatUnits(safeAllowance, USDC_DECIMALS);
    console.log(`  Safe Allowance: ${safeAllowanceFormatted} USDC.e`);
    console.log("");

    // ========================================
    // 3. ДИАГНОСТИКА
    // ========================================
    console.log("🔧 3. Диагностика проблемы:\n");

    const requiredAmount = 0.0079; // Из ошибки: makerAmount = 7900 = 0.0079 USDC

    console.log(`  Требуется для ордера: ${requiredAmount} USDC\n`);

    // Проверяем EOA
    console.log("  ❓ Если funder = EOA:");
    if (parseFloat(eoaBalanceFormatted) < requiredAmount) {
      console.log("    ❌ Недостаточно USDC на EOA");
      console.log(`       Есть: ${eoaBalanceFormatted}, нужно: ${requiredAmount}`);
    } else {
      console.log("    ✅ USDC баланс достаточный");
    }

    if (parseFloat(eoaAllowanceFormatted) < requiredAmount) {
      console.log("    ❌ Недостаточный allowance на EOA");
      console.log(`       Есть: ${eoaAllowanceFormatted}, нужно: ${requiredAmount}`);
      console.log("       Решение: Нужен approve USDC → Exchange");
    } else {
      console.log("    ✅ Allowance достаточный");
    }

    console.log("");

    // Проверяем Safe
    console.log("  ❓ Если funder = Safe (рекомендуется):");
    if (parseFloat(safeBalanceFormatted) < requiredAmount) {
      console.log("    ❌ Недостаточно USDC на Safe");
      console.log(`       Есть: ${safeBalanceFormatted}, нужно: ${requiredAmount}`);
      console.log("       Решение: Депозит через bridge в Safe");
    } else {
      console.log("    ✅ USDC баланс достаточный");
    }

    if (parseFloat(safeAllowanceFormatted) < requiredAmount) {
      console.log("    ❌ Недостаточный allowance на Safe");
      console.log(`       Есть: ${safeAllowanceFormatted}, нужно: ${requiredAmount}`);
      console.log("       Решение: Нужен approve через Safe (via relayer)");
    } else {
      console.log("    ✅ Allowance достаточный");
    }

    console.log("");

    // ========================================
    // 4. РЕКОМЕНДАЦИИ
    // ========================================
    console.log("💡 4. Рекомендации:\n");

    if (parseFloat(safeBalanceFormatted) > requiredAmount && parseFloat(safeAllowanceFormatted) > requiredAmount) {
      console.log("  ✅ Safe готов к торговле!");
      console.log("     Убедитесь что в ClobClient:");
      console.log("     - signatureType = 2");
      console.log("     - funder = SAFE_ADDRESS");
    } else if (parseFloat(eoaBalanceFormatted) > requiredAmount && parseFloat(eoaAllowanceFormatted) > requiredAmount) {
      console.log("  ✅ EOA готов к торговле!");
      console.log("     Убедитесь что в ClobClient:");
      console.log("     - signatureType = 0");
      console.log("     - funder = EOA_ADDRESS (или не указывать)");
    } else {
      console.log("  ❌ Нужно исправить:");
      
      if (parseFloat(safeBalanceFormatted) < requiredAmount && parseFloat(eoaBalanceFormatted) < requiredAmount) {
        console.log("     1. Пополнить баланс USDC");
      }
      
      if (parseFloat(safeAllowanceFormatted) === 0 || parseFloat(eoaAllowanceFormatted) === 0) {
        console.log("     2. Сделать approve USDC → Exchange");
        console.log("        Можно через UI Polymarket (автоматически)");
        console.log("        Или через код (см. примеры ниже)");
      }
    }

    console.log("");
    console.log("📚 Полезные ссылки:");
    console.log(`  - EOA на Polygonscan: https://polygonscan.com/address/${EOA_ADDRESS}`);
    console.log(`  - Safe на Polygonscan: https://polygonscan.com/address/${SAFE_ADDRESS}`);
    console.log(`  - USDC contract: https://polygonscan.com/token/${USDC_E_ADDRESS}`);
    console.log("");

  } catch (error) {
    console.error("❌ Ошибка при проверке:", error);
  }
}

diagnose().catch(console.error);

// ========================================
// ПРИМЕРЫ КАК ИСПРАВИТЬ
// ========================================

/**
 * Пример 1: Approve через UI
 * 
 * 1. Зайти на polymarket.com
 * 2. Подключить тот же wallet (Privy)
 * 3. Попробовать сделать любую маленькую сделку
 * 4. UI автоматически сделает approve
 */

/**
 * Пример 2: Approve через код (для EOA)
 * 
 * import { ethers } from "ethers";
 * 
 * const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
 * const EXCHANGE_ADDRESS = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";
 * 
 * const usdcContract = new ethers.Contract(
 *   USDC_ADDRESS,
 *   ["function approve(address spender, uint256 amount) returns (bool)"],
 *   signer
 * );
 * 
 * // Approve максимальную сумму (на будущее)
 * const tx = await usdcContract.approve(
 *   EXCHANGE_ADDRESS,
 *   ethers.constants.MaxUint256
 * );
 * await tx.wait();
 * 
 * console.log("✅ Approve done");
 */

/**
 * Пример 3: Approve через Safe (релеер)
 * 
 * import { RelayClient } from "@polymarket/builder-relayer-client";
 * 
 * const relayClient = new RelayClient(...);
 * 
 * // Создаём транзакцию approve
 * const approveCalldata = usdcInterface.encodeFunctionData("approve", [
 *   EXCHANGE_ADDRESS,
 *   ethers.constants.MaxUint256,
 * ]);
 * 
 * // Отправляем через релеер
 * const response = await relayClient.execute({
 *   to: USDC_ADDRESS,
 *   data: approveCalldata,
 *   value: "0",
 * });
 * 
 * await response.wait();
 * console.log("✅ Safe approve done");
 */
