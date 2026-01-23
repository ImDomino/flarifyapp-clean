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
  title: string;
  content: string;
  polymarket_url: string;
  yes_price: number | null;
  no_price: number | null;
  ref_code: string;
  created_at: string;
  updated_at: string;
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
  user_has_liked?: boolean;
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

export { Profile as DBProfile, Post as DBPost };
