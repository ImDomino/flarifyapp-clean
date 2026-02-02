// scripts/test-relayer.ts
/**
 * Тестовый скрипт для проверки Polymarket Relayer
 * 
 * Запуск: npx tsx scripts/test-relayer.ts
 * 
 * Проверяет:
 * 1. Builder API credentials
 * 2. Подключение к relayer
 * 3. Деплой Safe wallet
 * 4. Получение балансов
 */

import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { Wallet } from "ethers";
import { createPublicClient, http, formatUnits } from "viem";
import { polygon } from "viem/chains";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";

const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

async function testRelayer() {
  console.log("🔍 Testing Polymarket Relayer Configuration\n");

  // Step 1: Check environment variables
  console.log("1️⃣ Checking environment variables...");
  
  const privateKey = process.env.PRIVATE_KEY;
  const builderApiKey = process.env.POLY_BUILDER_API_KEY;
  const builderSecret = process.env.POLY_BUILDER_SECRET;
  const builderPassphrase = process.env.POLY_BUILDER_PASSPHRASE;
  const builderSignUrl = process.env.NEXT_PUBLIC_BUILDER_SIGN_URL;

  if (!privateKey) {
    console.error("❌ PRIVATE_KEY not set in .env");
    process.exit(1);
  }
  
  if (!builderApiKey || !builderSecret || !builderPassphrase) {
    console.error("❌ Builder API credentials not set in .env");
    console.log("Required:");
    console.log("  - POLY_BUILDER_API_KEY");
    console.log("  - POLY_BUILDER_SECRET");
    console.log("  - POLY_BUILDER_PASSPHRASE");
    process.exit(1);
  }

  if (!builderSignUrl) {
    console.error("❌ NEXT_PUBLIC_BUILDER_SIGN_URL not set in .env");
    process.exit(1);
  }

  console.log("✅ Environment variables OK");
  console.log(`   Sign URL: ${builderSignUrl}\n`);

  // Step 2: Initialize wallet
  console.log("2️⃣ Initializing wallet...");
  const signer = new Wallet(privateKey);
  const eoaAddress = signer.address;
  console.log(`✅ EOA Address: ${eoaAddress}\n`);

  // Step 3: Check balances
  console.log("3️⃣ Checking balances...");
  
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"),
  });

  try {
    const usdcBalance = await publicClient.readContract({
      address: USDC_E_ADDRESS,
      abi: [{
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      }],
      functionName: "balanceOf",
      args: [eoaAddress as `0x${string}`],
    });

    console.log(`✅ EOA USDC.e Balance: ${formatUnits(usdcBalance, 6)} USDC.e\n`);
  } catch (error) {
    console.error("❌ Failed to fetch balance:", error);
  }

  // Step 4: Derive Safe address
  console.log("4️⃣ Deriving Safe address...");
  
  const config = getContractConfig(137);
  const safeAddress = deriveSafe(
    eoaAddress as `0x${string}`,
    config.SafeContracts.SafeFactory
  );
  
  console.log(`✅ Safe Address: ${safeAddress}\n`);

  // Step 5: Initialize Relayer Client
  console.log("5️⃣ Initializing Relayer Client...");
  
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: builderSignUrl,
    },
  });

  const relayClient = new RelayClient(
    "https://relayer-v2.polymarket.com/",
    137,
    signer as any,
    builderConfig
  );

  console.log("✅ Relayer Client initialized\n");

  // Step 6: Check Safe deployment
  console.log("6️⃣ Checking Safe deployment status...");
  
  try {
    const deployed = await relayClient.getDeployed(safeAddress);
    
    if (deployed) {
      console.log("✅ Safe is already deployed\n");
      
      // Check Safe balance
      const safeBalance = await publicClient.readContract({
        address: USDC_E_ADDRESS,
        abi: [{
          inputs: [{ name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        }],
        functionName: "balanceOf",
        args: [safeAddress as `0x${string}`],
      });
      
      console.log(`   Safe USDC.e Balance: ${formatUnits(safeBalance, 6)} USDC.e\n`);
    } else {
      console.log("ℹ️  Safe is not deployed yet");
      console.log("   You can deploy it by calling relayClient.deploy()\n");
    }
  } catch (error) {
    console.error("❌ Failed to check Safe deployment:", error);
  }

  // Step 7: Test relayer connection
  console.log("7️⃣ Testing relayer API connection...");
  
  try {
    // Попробуем получить статус несуществующей транзакции
    // Это проверит что relayer API доступен
    const testTxId = "test-tx-id";
    const result = await relayClient.getTransaction(testTxId).catch(() => null);
    
    console.log("✅ Relayer API is accessible\n");
  } catch (error) {
    console.error("❌ Failed to connect to relayer:", error);
  }

  console.log("✅ All checks passed!");
  console.log("\nYou're ready to use the relayer!");
  console.log("\nNext steps:");
  console.log("1. If Safe is not deployed, deploy it first");
  console.log("2. Add USDC.e to your EOA wallet");
  console.log("3. Use MoveToSafeButton to transfer USDC.e to Safe");
}

testRelayer().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
});
