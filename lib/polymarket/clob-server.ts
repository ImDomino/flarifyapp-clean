/**
 * Multi-user CLOB Server
 * 
 * Каждый пользователь получает свои L2 credentials автоматически
 */

import { NextRequest } from 'next/server';
import { ClobClient } from '@polymarket/clob-client';
import { BuilderConfig, BuilderApiKeyCreds } from '@polymarket/builder-signing-sdk';
import { getPrivyUserContext } from '@/lib/auth/privy-server';
import { createClient } from '@/lib/supabase/server';

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

interface UserClobContext {
  client: ClobClient;
  userId: string;
  walletAddress: string;
}

/**
 * Получает или создаёт CLOB client для пользователя
 */
async function getServerClobClient(
  req: NextRequest,
  userId: string,
  walletAddress: string
): Promise<UserClobContext> {
  console.log('🔧 Initializing CLOB for user:', userId);

  // Получаем signer (ВРЕМЕННО единый для всех)
  const { signer } = await getPrivyUserContext(req, userId, walletAddress);

  const supabase = await createClient();

  // Ищем существующие L2 credentials
  const { data: existing } = await supabase
    .from('user_clob_creds')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  let apiKey: string;
  let secret: string;
  let passphrase: string;

  if (existing) {
    apiKey = existing.api_key;
    secret = existing.api_secret;
    passphrase = existing.api_passphrase;
    
    console.log('✅ Found existing L2 credentials');
  } else {
    // Создаём новые L2 credentials
    console.log('📡 Creating new L2 credentials...');

    const l1Client = new ClobClient(HOST, CHAIN_ID, signer);
    const userApiCreds = await l1Client.createOrDeriveApiKey();

    apiKey = userApiCreds.apiKey;
    secret = userApiCreds.secret;
    passphrase = userApiCreds.passphrase;

    // Сохраняем в Supabase
    const { error: insertError } = await supabase
      .from('user_clob_creds')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        api_key: apiKey,
        api_secret: secret,
        api_passphrase: passphrase,
      });

    if (insertError) {
      console.error('Failed to save L2 credentials:', insertError);
      throw new Error('Failed to save user credentials');
    }

    console.log('✅ Created and saved new L2 credentials');
  }

  const userApiCreds = { key: apiKey, secret, passphrase };

  // Builder configuration (опционально)
  let builderConfig: BuilderConfig | undefined;
  
  const builderApiKey = process.env.POLY_BUILDER_API_KEY;
  const builderSecret = process.env.POLY_BUILDER_SECRET;
  const builderPassphrase = process.env.POLY_BUILDER_PASSPHRASE;

  if (builderApiKey && builderSecret && builderPassphrase) {
    const builderCreds = new BuilderApiKeyCreds({
      key: builderApiKey,
      secret: builderSecret,
      passphrase: builderPassphrase,
    });

    builderConfig = new BuilderConfig({
      localBuilderCreds: builderCreds,
    });

    console.log('✅ Builder attribution enabled');
  }

  // Создаём CLOB client
  const signatureType = 0; // EOA
  const funderAddress = walletAddress;

  const client = new ClobClient(
    HOST,
    CHAIN_ID,
    signer,
    userApiCreds,
    signatureType,
    funderAddress,
    undefined,
    false,
    builderConfig
  );

  console.log('✅ CLOB client initialized');

  return {
    client,
    userId,
    walletAddress,
  };
}

/**
 * Размещает ордер для пользователя
 * 
 * ВАЖНО: body уже прочитан в route.ts и передаётся сюда
 */
export async function placeUserOrder(
  req: NextRequest,
  body: {
    userId: string;
    walletAddress: string;
    tokenId: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
  }
) {
  const { userId, walletAddress, tokenId, side, amount, price } = body;

  // Конвертируем USDC в shares
  const size = amount / price;

  console.log('📝 Creating order:', {
    userId: userId.slice(0, 10) + '...',
    wallet: walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4),
    tokenId: tokenId.slice(0, 10) + '...',
    side,
    amount,
    price,
    size: size.toFixed(2),
  });

  // Получаем CLOB client для этого пользователя
  const { client } = await getServerClobClient(req, userId, walletAddress);

  // Создаём ордер
  const order = await client.createOrder({
    tokenID: tokenId,
    price: price,
    side: side === 'BUY' ? 0 : 1,
    size: size,
  });

  console.log('✅ Order created:', order);

  // Размещаем в CLOB
  const response = await client.postOrder(order);

  console.log('🎉 Order posted successfully');

  return {
    success: true,
    order: response,
  };
}
