/**
 * Скрипт для получения User API credentials (L2)
 * 
 * Запускается ОДИН РАЗ для генерации credentials:
 * npx tsx scripts/generate-user-creds.ts
 * 
 * Полученные credentials добавить в .env:
 * POLY_USER_API_KEY=...
 * POLY_USER_API_SECRET=...
 * POLY_USER_API_PASSPHRASE=...
 */

import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

async function generateUserCreds() {
  // Нужен любой Polygon wallet с минимальным балансом для подписи
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    console.error('❌ Set PRIVATE_KEY in .env');
    console.log('Generate one: npx ethers-cli wallet create');
    process.exit(1);
  }

  const signer = new Wallet(privateKey);
  console.log('🔑 Wallet address:', signer.address);

  // Создаём L1 клиента
  const l1Client = new ClobClient(HOST, CHAIN_ID, signer);

  console.log('📡 Requesting User API credentials from Polymarket...');

  // Получаем или создаём L2 credentials
  const userApiCreds = await l1Client.createOrDeriveApiKey();

  console.log('\n✅ User API Credentials generated!\n');
  console.log('Add these to your .env file:\n');
  console.log(`POLY_USER_API_KEY=${userApiCreds.apiKey}`);
  console.log(`POLY_USER_API_SECRET=${userApiCreds.secret}`);
  console.log(`POLY_USER_API_PASSPHRASE=${userApiCreds.passphrase}`);
  console.log('\n');
}

generateUserCreds().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
