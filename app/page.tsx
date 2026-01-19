import { PostCard } from "@/components/PostCard";
import type { PostWithUser } from "@/lib/types";

// Mock данные для демо
const mockPosts: PostWithUser[] = [
  {
    id: "1",
    user_id: "mock-user-1",
    title: "Bitcoin достигнет $100k в 2025?",
    content: "Институциональные инвесторы входят массово. ETF показывают рекордные притоки. Технический анализ указывает на бычий тренд. Что думаете о перспективах?",
    polymarket_url: "https://polymarket.com/market/will-btc-reach-100k-2025",
    market_title: "Will Bitcoin reach $100k in 2025?",
    yes_price: 68.5,
    no_price: 31.5,
    ref_code: "FLARIFYAPP",
    likes: 42,
    comments_count: 18,
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
  {
    id: "2",
    user_id: "mock-user-2",
    title: "Трамп vs Харрис 2024 - кто победит?",
    content: "Рынок показывает почти равные шансы. Swing states определят исход. Следим за опросами и делаем ставки! 🇺🇸",
    polymarket_url: "https://polymarket.com/market/2024-presidential-election",
    market_title: "2024 US Presidential Election Winner",
    yes_price: 54.0,
    no_price: 46.0,
    ref_code: "FLARIFYAPP",
    likes: 67,
    comments_count: 34,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    users: {
      id: "mock-user-2",
      email: "analyst@example.com",
      username: "PoliticalGuru",
      avatar_url: null,
      posts_count: 45,
      clicks_count: 892,
      wallet: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    hasLiked: true,
  },
  {
    id: "3",
    user_id: "mock-user-3",
    title: "AI обгонит людей в программировании",
    content: "GPT-4, Claude, и другие модели становятся всё лучше. Уже пишут production code. Думаю в 2025 увидим прорыв. Ваше мнение? 🤖",
    polymarket_url: "https://polymarket.com/market/ai-surpass-human-coding-2025",
    market_title: "Will AI surpass human coders by 2025?",
    yes_price: 42.0,
    no_price: 58.0,
    ref_code: "FLARIFYAPP",
    likes: 38,
    comments_count: 27,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    users: {
      id: "mock-user-3",
      email: "dev@example.com",
      username: "TechVisionary",
      avatar_url: null,
      posts_count: 19,
      clicks_count: 234,
      wallet: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    hasLiked: false,
  },
];

export default function Home() {
  // Mock user - всегда "залогинен" для demo
  const mockUser = { id: "current-user" };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Demo Notice */}
      <div className="text-center py-6 bg-gradient-to-r from-primary/10 to-green-500/10 rounded-lg border border-primary/30">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
            Flarifyapp + Polymarket
          </h1>
        </div>
        <p className="text-muted-foreground mb-2">
          <strong>Builder Attribution</strong> интегрирован
        </p>
        <p className="text-sm text-muted-foreground">
          Все ссылки содержат builder_id • Комиссии с торгов работают
        </p>
      </div>

      {/* Features List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">💰</div>
          <h3 className="font-semibold mb-1">Builder Attribution</h3>
          <p className="text-sm text-muted-foreground">
            Earn commissions from user trades
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">🔗</div>
          <h3 className="font-semibold mb-1">URL Tracking</h3>
          <p className="text-sm text-muted-foreground">
            All links include builder_id
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-semibold mb-1">Order API</h3>
          <p className="text-sm text-muted-foreground">
            Ready for real trading
          </p>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Latest Predictions</h2>
        {mockPosts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={mockUser.id} />
        ))}
      </div>
    </div>
  );
}
