import axios from 'axios';
import type { PolymarketMarket } from './types';

const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com';

export class PolymarketAPI {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get market data by condition ID
   */
  async getMarket(conditionId: string): Promise<PolymarketMarket | null> {
    try {
      const response = await axios.get(
        `${POLYMARKET_API_BASE}/markets/${conditionId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  }

  /**
   * Search markets by slug or question
   */
  async searchMarkets(query: string): Promise<PolymarketMarket[]> {
    try {
      const response = await axios.get(
        `${POLYMARKET_API_BASE}/markets`,
        {
          params: { q: query, limit: 10 }
        }
      );
      return response.data || [];
    } catch (error) {
      console.error('Error searching markets:', error);
      return [];
    }
  }

  /**
   * Extract market ID from Polymarket URL
   */
  extractMarketId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // URL formats:
      // /market/will-btc-reach-100k
      // /event/presidential-election/will-trump-win
      
      if (pathParts.includes('market')) {
        const marketIndex = pathParts.indexOf('market');
        return pathParts[marketIndex + 1] || null;
      }
      
      return pathParts[pathParts.length - 1] || null;
    } catch (error) {
      console.error('Error extracting market ID:', error);
      return null;
    }
  }

  /**
   * Get market by slug (from URL)
   */
  async getMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
    try {
      const response = await axios.get(
        `${POLYMARKET_API_BASE}/markets`,
        {
          params: { slug }
        }
      );
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching market by slug:', error);
      return null;
    }
  }

  /**
   * Get current prices for market outcomes
   */
  async getMarketPrices(conditionId: string): Promise<{ yes: number; no: number } | null> {
    try {
      const market = await this.getMarket(conditionId);
      
      if (!market || !market.tokens || market.tokens.length < 2) {
        return null;
      }

      // Typically tokens[0] = YES, tokens[1] = NO
      const yesToken = market.tokens.find(t => t.outcome.toLowerCase() === 'yes');
      const noToken = market.tokens.find(t => t.outcome.toLowerCase() === 'no');

      return {
        yes: yesToken ? parseFloat(yesToken.price) * 100 : 50,
        no: noToken ? parseFloat(noToken.price) * 100 : 50,
      };
    } catch (error) {
      console.error('Error fetching market prices:', error);
      return null;
    }
  }

  /**
   * Get orderbook for a token
   */
  async getOrderbook(tokenId: string) {
    try {
      const response = await axios.get(
        `${POLYMARKET_CLOB_API}/book`,
        {
          params: { token_id: tokenId }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching orderbook:', error);
      return null;
    }
  }
}

// Singleton instance
export const polymarketAPI = new PolymarketAPI();
