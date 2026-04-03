// Database types
export interface Profile {
  id: string;
  email: string;
  username: string | null;
  wallet_address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  polymarket_market_id?: string | null;
  market_data?: MarketData | null;
  yes_token_id?: string | null;
  no_token_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketData {
  question: string;
  outcomes: string[];
  prices: number[];
  volume: string;
  url: string;
  yesTokenId?: string;
  noTokenId?: string;
  tokens?: Array<{ token_id: string; outcome: string; price: string }>;
  negRisk?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Click {
  id: string;
  post_id: string;
  user_id: string | null;
  created_at: string;
}

// Joined types
export interface PostWithUser extends Post {
  profiles: Profile;
  likes_count?: number;
  comments_count?: number;
  reposts_count?: number;
  user_has_liked?: boolean;
  user_has_reposted?: boolean;
  user_has_bookmarked?: boolean;
  reposted_by?: string;
  repost_created_at?: string;
  quote_content?: string;
}

export interface CommentWithUser extends Comment {
  profiles: Profile;
}

// Legacy compatibility (for existing components)
export interface User extends Profile {
  posts_count?: number;
  clicks_count?: number;
  wallet?: string | null;
}

// Signals & Alerts
export interface PriceAlert {
  id: string;
  user_id: string;
  condition_id: string;
  token_id: string;
  outcome: string;
  direction: "above" | "below";
  threshold: number;
  market_question: string | null;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  condition_id: string;
  token_id: string;
  market_question: string | null;
  image_url: string | null;
  created_at: string;
}

export type { Profile as DBProfile, Post as DBPost };