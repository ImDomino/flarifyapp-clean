import { ClobClient } from '@polymarket/clob-client';
import { createPolymarketClient, placeBuyOrder } from './builder-client';
import { ethers } from 'ethers';

/**
 * Singleton Polymarket CLOB Client
 * Инициализируется один раз при подключении wallet
 */
class PolymarketCLOBSingleton {
  private client: ClobClient | null = null;
  private signer: ethers.Signer | null = null;

  /**
   * Инициализирует CLOB client с signer от Privy wallet
   */
  async initialize(signer: ethers.Signer): Promise<boolean> {
    try {
      console.log('🔄 Initializing Polymarket CLOB client...');
      
      this.signer = signer;
      this.client = createPolymarketClient(signer);
      
      console.log('✅ Polymarket CLOB client initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize CLOB client:', error);
      return false;
    }
  }

  /**
   * Проверяет инициализирован ли client
   */
  isInitialized(): boolean {
    return this.client !== null && this.signer !== null;
  }

  /**
   * Получает CLOB client (выбрасывает ошибку если не инициализирован)
   */
  getClient(): ClobClient {
    if (!this.client) {
      throw new Error('CLOB client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Покупает YES outcome
   */
  async buyYes(tokenId: string, amount: number, price: number) {
    if (!this.client) {
      throw new Error('CLOB client not initialized');
    }

    const size = amount / price; // Конвертируем USDC в shares
    return placeBuyOrder(this.client, tokenId, price, size);
  }

  /**
   * Покупает NO outcome
   */
  async buyNo(tokenId: string, amount: number, price: number) {
    if (!this.client) {
      throw new Error('CLOB client not initialized');
    }

    const size = amount / price; // Конвертируем USDC в shares
    return placeBuyOrder(this.client, tokenId, price, size);
  }

  /**
   * Сбрасывает client (при logout)
   */
  reset() {
    this.client = null;
    this.signer = null;
    console.log('🔄 CLOB client reset');
  }
}

// Экспортируем singleton instance
export const polymarketCLOB = new PolymarketCLOBSingleton();
