/**
 * Privy Server-side authentication helper
 * 
 * ВРЕМЕННОЕ решение для тестирования
 * TODO: Интегрировать Privy Server SDK
 */

import { NextRequest } from 'next/server';
import { ethers } from 'ethers';

export interface PrivyUserContext {
  userId: string;
  walletAddress: string;
  signer: ethers.Wallet;
}

/**
 * ВРЕМЕННАЯ заглушка для тестирования
 * 
 * Возвращает фиксированный signer для всех пользователей
 * В production заменить на Privy Server SDK
 */
export async function getPrivyUserContext(
  req: NextRequest,
  userId: string,
  walletAddress: string
): Promise<PrivyUserContext> {
  // ВРЕМЕННО: используем единый PRIVATE_KEY для всех
  // В production: получать реальный signer через Privy Server SDK
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error(
      'PRIVATE_KEY not set. Required for signing transactions. ' +
      'In production, use Privy Server SDK.'
    );
  }

  const signer = new ethers.Wallet(privateKey);

  console.log('👤 User context:', {
    userId,
    requestedWallet: walletAddress,
    signerAddress: signer.address,
  });

  // ВАЖНО: В production signer.address ДОЛЖЕН === walletAddress
  if (signer.address.toLowerCase() !== walletAddress.toLowerCase()) {
    console.warn('⚠️ WARNING: Signer mismatch! Orders may fail.');
    console.warn('Expected:', walletAddress);
    console.warn('Got:', signer.address);
  }

  return {
    userId,
    walletAddress,
    signer,
  };
}

/**
 * TODO: Production implementation с Privy Server SDK
 * 
 * npm install @privy-io/server-auth
 * 
 * import { PrivyClient } from '@privy-io/server-auth';
 * 
 * const privy = new PrivyClient(
 *   process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
 *   process.env.PRIVY_APP_SECRET!
 * );
 * 
 * export async function getPrivyUserContextProduction(req: NextRequest) {
 *   const authHeader = req.headers.get('authorization');
 *   const token = authHeader?.replace('Bearer ', '');
 *   
 *   const user = await privy.verifyAuthToken(token);
 *   const wallet = user.linkedAccounts.find(a => a.type === 'wallet');
 *   const signer = await privy.getSigner(user.id);
 *   
 *   return {
 *     userId: user.id,
 *     walletAddress: wallet.address,
 *     signer,
 *   };
 * }
 */
