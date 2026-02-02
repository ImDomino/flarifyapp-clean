// scripts/check-balances.ts
// Скрипт для диагностики: где ваши деньги?

import { createPublicClient, http, formatUnits } from "viem";
import { polygon } from "viem/chains";

const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

async function checkBalances() {
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http("https://polygon-rpc.com"),
  });

  console.log("🔍 Проверяем балансы...\n");

  // 1. Введите ваши адреса
  const EOA_ADDRESS = "YOUR_EOA_ADDRESS_HERE"; // Privy EOA
  const SAFE_ADDRESS = "YOUR_SAFE_ADDRESS_HERE"; // Safe proxy
  const BRIDGE_ADDRESS = "YOUR_BRIDGE_DEPOSIT_ADDRESS_HERE"; // Куда вы отправили

  console.log("📍 Адреса:");
  console.log("EOA:", EOA_ADDRESS);
  console.log("Safe:", SAFE_ADDRESS);
  console.log("Bridge:", BRIDGE_ADDRESS);
  console.log("");

  // 2. Проверяем балансы
  const erc20Abi = [
    {
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  try {
    // EOA баланс
    const eoaBalance = await publicClient.readContract({
      address: USDC_E_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [EOA_ADDRESS as `0x${string}`],
    });

    console.log("💰 EOA Balance:", formatUnits(eoaBalance, 6), "USDC.e");

    // Safe баланс
    const safeBalance = await publicClient.readContract({
      address: USDC_E_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [SAFE_ADDRESS as `0x${string}`],
    });

    console.log("💰 Safe Balance:", formatUnits(safeBalance, 6), "USDC.e");

    // Bridge адрес баланс
    const bridgeBalance = await publicClient.readContract({
      address: USDC_E_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [BRIDGE_ADDRESS as `0x${string}`],
    });

    console.log("💰 Bridge Address Balance:", formatUnits(bridgeBalance, 6), "USDC.e");
    console.log("");

    // 3. Диагностика
    if (parseFloat(formatUnits(bridgeBalance, 6)) > 0) {
      console.log("⚠️  ПРОБЛЕМА: Деньги застряли на bridge адресе!");
      console.log("Это значит что Polymarket bridge не обработал транзакцию.");
      console.log("");
      console.log("РЕШЕНИЕ:");
      console.log("1. Подождите 5-10 минут - bridge может обработать с задержкой");
      console.log("2. Проверьте статус: https://bridge.polymarket.com/status/" + BRIDGE_ADDRESS);
      console.log("3. Если не помогло - обратитесь в поддержку Polymarket");
    } else if (parseFloat(formatUnits(safeBalance, 6)) > 0) {
      console.log("✅ Деньги на Safe! Обновите страницу.");
    } else if (parseFloat(formatUnits(eoaBalance, 6)) > 0) {
      console.log("💡 Деньги на EOA - нужно перенести на Safe");
    } else {
      console.log("❓ Деньги не найдены ни на одном адресе");
      console.log("Проверьте в Polygonscan транзакцию отправки");
    }

  } catch (error) {
    console.error("❌ Ошибка:", error);
  }
}

checkBalances();

// Запуск:
// npx tsx scripts/check-balances.ts
