import { BarChart3, FileText, MousePointerClick, Users } from "lucide-react";

export default function AdminPage() {
  const mockStats = {
    totalPosts: 127,
    totalClicks: 3456,
    totalUsers: 89,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center py-4 bg-yellow-500/10 rounded-lg border border-yellow-500/50">
        <div className="text-yellow-500 font-semibold mb-1">
          🧪 DEMO MODE
        </div>
        <p className="text-muted-foreground text-sm">
          Mock analytics data
        </p>
      </div>

      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent mb-6">
        Admin Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-muted-foreground">Total Posts</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{mockStats.totalPosts}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center space-x-3 mb-2">
            <MousePointerClick className="h-6 w-6 text-primary" />
            <span className="text-muted-foreground">Total Clicks</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{mockStats.totalClicks}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <span className="text-muted-foreground">Total Users</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{mockStats.totalUsers}</p>
        </div>
      </div>

      <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-border">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Detailed analytics will appear here in production</p>
      </div>
    </div>
  );
}
