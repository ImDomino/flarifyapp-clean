import { User, TrendingUp, FileText } from "lucide-react";

export default function ProfilePage() {
  const mockProfile = {
    username: "DemoUser",
    email: "demo@flarifyapp.com",
    posts_count: 5,
    clicks_count: 127,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-4 bg-yellow-500/10 rounded-lg border border-yellow-500/50">
        <div className="text-yellow-500 font-semibold mb-1">
          🧪 DEMO MODE
        </div>
        <p className="text-muted-foreground text-sm">
          Mock profile data
        </p>
      </div>

      {/* Profile Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start space-x-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-10 w-10 text-primary" />
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {mockProfile.username}
            </h1>
            <p className="text-muted-foreground mb-4">{mockProfile.email}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-2 mb-1">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Posts</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {mockProfile.posts_count}
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-2 mb-1">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Clicks</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {mockProfile.clicks_count}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border">
        Your posts will appear here in production
      </div>
    </div>
  );
}
