import { PostCard } from "@/components/PostCard";
import { CommentSection } from "@/components/CommentSection";
import type { PostWithUser, CommentWithUser } from "@/lib/types";
import { notFound } from "next/navigation";

// Mock данные
const mockPosts = {
  "1": {
    id: "1",
    user_id: "mock-user-1",
    title: "Bitcoin достигнет $100k в 2025?",
    content: "Институциональные инвесторы входят массово. ETF показывают рекордные притоки. Технический анализ указывает на бычий тренд.",
    polymarket_url: "https://polymarket.com/market/will-btc-reach-100k-2025",
    market_title: "Will Bitcoin reach $100k in 2025?",
    yes_price: 68.5,
    no_price: 31.5,
    ref_code: "FLARIFYAPP",
    likes: 42,
    comments_count: 3,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    users: {
      id: "mock-user-1",
      email: "trader1@example.com",
      username: "CryptoWhale",
      avatar_url: null,
      posts_count: 23,
      clicks_count: 456,
      wallet: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    hasLiked: false,
  },
};

const mockComments: CommentWithUser[] = [
  {
    id: "c1",
    post_id: "1",
    user_id: "mock-user-2",
    content: "Согласен! Вижу сильный бычий сигнал. Уже купил на $1000.",
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    users: {
      id: "mock-user-2",
      email: "trader2@example.com",
      username: "BullMarket",
      avatar_url: null,
      posts_count: 12,
      clicks_count: 234,
      wallet: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: "c2",
    post_id: "1",
    user_id: "mock-user-3",
    content: "Не уверен. Макроэкономика выглядит шатко. Но может быть!",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    users: {
      id: "mock-user-3",
      email: "analyst@example.com",
      username: "CautiousTrader",
      avatar_url: null,
      posts_count: 45,
      clicks_count: 567,
      wallet: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];

// Next.js 16: params теперь async!
export default async function PostPage(props: { 
  params: Promise<{ id: string }> 
}) {
  // ✅ Next.js 16: await params
  const params = await props.params;
  const { id } = params;

  // Получаем пост
  const post = mockPosts[id as keyof typeof mockPosts];

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PostCard post={post as PostWithUser} currentUserId="current-user" />
      
      <CommentSection
        postId={id}
        comments={mockComments}
        currentUserId="current-user"
      />
    </div>
  );
}
