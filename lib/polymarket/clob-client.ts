import { ethers } from 'ethers';
import { ClobClient, Side } from '@polymarket/clob-client';
import type { OrderArgs, BuilderConfig } from './types';

// Polymarket CLOB configuration
const CLOB_API_URL = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon Mainnet

// Builder configuration
const BUILDER_CONFIG: BuilderConfig = {
  builderId: process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_ID || 'FLARIFYAPP',
  builderFeeRateBps: 0, // 0% fee (можно настроить)
};

export class PolymarketCLOBClient {
  private client: ClobClient | null = null;
  private signer: ethers.Signer | null = null;
  private address: string | null = null;

  /**
   * Initialize client with wallet signer
   */
  async initialize(signer: ethers.Signer) {
    try {
      this.signer = signer;
      this.address = await signer.getAddress();

      // Create CLOB client with signer
      this.client = new ClobClient(
        CLOB_API_URL,
        CHAIN_ID,
        signer as any
      );

      console.log('Polymarket CLOB Client initialized for:', this.address);
      return true;
    } catch (error) {
      console.error('Error initializing CLOB client:', error);
      return false;
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null && this.signer !== null;
  }

  /**
   * Get user's address
   */
  getAddress(): string | null {
    return this.address;
  }

  /**
   * Create and sign a market order
   * @param tokenId - Token ID for the outcome (YES or NO)
   * @param side - BUY or SELL
   * @param amount - Amount in USDC
   * @param price - Price per share (0-1, e.g., 0.55 for 55¢)
   */
  async createMarketOrder(
    tokenId: string,
    side: Side,
    amount: number,
    price: number
  ): Promise<any> {
    if (!this.client || !this.isInitialized()) {
      throw new Error('CLOB client not initialized');
    }

    try {
      // Calculate size (number of shares) from amount and price
      const size = amount / price;

      // Prepare order arguments with builder attribution
      const orderArgs: OrderArgs = {
        tokenID: tokenId,
        price: price, // Price in decimal (0.55 for 55¢)
        size: size,
        side: side,
        feeRateBps: BUILDER_CONFIG.builderFeeRateBps,
        builderId: BUILDER_CONFIG.builderId,
      };

      console.log('Creating order:', orderArgs);

      // Create and send the order
      const order = await this.client.createOrder(orderArgs);
      
      console.log('Order created successfully:', order);
      return order;
    } catch (error: any) {
      console.error('Error creating order:', error);
      throw new Error(error.message || 'Failed to create order');
    }
  }

  /**
   * Place a BUY order for YES outcome
   */
  async buyYes(
    tokenId: string,
    amount: number,
    price: number
  ): Promise<any> {
    return this.createMarketOrder(tokenId, Side.BUY, amount, price);
  }

  /**
   * Place a BUY order for NO outcome
   */
  async buyNo(
    tokenId: string,
    amount: number,
    price: number
  ): Promise<any> {
    return this.createMarketOrder(tokenId, Side.BUY, amount, price);
  }

  /**
   * Get user's open orders
   */
  async getOpenOrders(): Promise<any[]> {
  if (!this.client || !this.address) return [];
  console.warn('getOpenOrders not wired for current ClobClient version');
  return [];
}


  /**
   * Cancel an order
   */

async cancelOrder(orderId: string): Promise<boolean> {
  if (!this.client) return false;
  console.warn('cancelOrder not wired for current ClobClient version, id:', orderId);
  return false;
}


  /**
   * Get user's balance for a specific token
   */
  /**
 * Get user's balance for a specific token
 */
async getBalance(tokenId: string): Promise<number> {
  if (!this.client || !this.address) {
    return 0;
  }

  try {
    console.warn(
      'getBalance via ClobClient.getBalance is not implemented for this SDK version. tokenId:',
      tokenId
    );
    return 0;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
}

  /**
   * Get USDC balance
   */
  async getUSDCBalance(): Promise<number> {
  if (!this.signer) {
    return 0;
  }

  try {
    const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      this.signer
    );

    const balance = await usdcContract.balanceOf(this.address);
    return parseFloat(ethers.utils.formatUnits(balance, 6)); // ✅ v5
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
  }

  /**
   * Cleanup
   */
  disconnect() {
    this.client = null;
    this.signer = null;
    this.address = null;
  }
}

// Singleton instance
export const polymarketCLOB = new PolymarketCLOBClient();
