export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  posts_count: number;
  clicks_count: number;
  wallet: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  polymarket_url: string;
  market_title: string | null;
  yes_price: number | null;
  no_price: number | null;
  ref_code: string;
  likes: number;
  comments_count: number;
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

export interface PostWithUser extends Post {
  users: User;
  hasLiked?: boolean;
}

export interface CommentWithUser extends Comment {
  users: User;
}
