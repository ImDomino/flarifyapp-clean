// Polymarket API Types
import type { Side } from '@polymarket/clob-client-v2';

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  active: boolean;
  closed: boolean;
  marketMakerAddress: string;
  conditionId: string;
  questionId: string;
  tokens: PolymarketToken[];
  clobTokenIds: string[];
  liquidityNum: number;
  endDate: string;
}

export interface PolymarketToken {
  token_id: string;
  outcome: string;
  price: string;
  winner: boolean;
}

export interface OrderArgs {
  tokenID: string;
  price: number;
  size: number;
  side: Side;              
  feeRateBps?: number;
  nonce?: number;
  expiration?: number;
  builderId?: string;
}

export interface PolymarketOrder {
  id: string;
  market: string;
  asset_id: string;
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
  status: 'LIVE' | 'MATCHED' | 'CANCELLED';
  maker: string;
  created_at: string;
}

export interface BuilderConfig {
  builderId: string;
  builderFeeRateBps: number; // basis points (100 = 1%)
}
