import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpTrend, Users, FileText, Calendar, LayoutDashboard, Activity } from 'lucide-react';

// API service
const api = {
  getStats: () => fetch('/api/labels/stats').then(res => res.json()),
  getLabels: () => fetch('/api/labels').then(res => res.json()),
  getUsers: () => fetch('/api/users').then(res => res.json()),
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery(['stats'], api.getStats);
  const { data: labels, isLoading: labelsLoading } = useQuery(['labels'], api.getLabels);
  const { data: users, isLoading: usersLoading } = useQuery(['users'], api.getUsers);

  if (statsLoading || labelsLoading || usersLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((_, i) => (
            <Card key={i} className="h-24">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Loading...</h3>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Labels */}
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Total Labels</h3>
                <p className="text-2xl font-bold">{stats?.total_labels || 0}</p>
              </div>
            </div>
            <div className="h-8 w-8 bg-blue-500/10 rounded-flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
        </Card>

        {/* Total Users */}
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
                <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
              </div>
            </div>
            <div className="h-8 w-8 bg-green-500/10 rounded-flex items-center justify-center">
              <ArrowsUpDown className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
        </Card>

        {/* Total Earnings */}
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Total Earnings</h3>
                <p className="text-2xl font-bold">€{(stats?.total_labels || 0) * 4}.00</p>
              </div>
            </div>
            <div className="h-8 w-8 bg-yellow-500/10 rounded-flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </div>
          </CardHeader>
        </Card>

        {/* PDF Labels */}
        <Card className="hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Description className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">PDF Labels</h3>
                <p className="text-2xl font-bold">{stats?.pdf_labels || 0}</p>
              </div>
            </div>
            <div className="h-8 w-8 bg-purple-500/10 rounded-flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Labels */}
        <Card>
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold">Recent Labels</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {labels?.slice(0, 5).map((label) => (
              <div key={label.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-8 w-8 flex items-center justify-center bg-primary/20 rounded-lg">
                  {label.file_type === 'pdf' ? (
                    <FileText className="h-4 w-4 text-primary" />
                  ) : (
                    <Image className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{label.file_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    by {label.user_name || 'Unknown'} • {new Date(label.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right text-muted-foreground">
                  <Button variant="ghost" size="xs">
                    View
                  </Button>
                </div>
              </div>
            ))}
            {!labels || labels.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No labels found</p>
            ) : null}
          </CardContent>
        </Card>

        {/* Activity Chart */}
        <Card>
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold">Activity Overview</h2>
          </CardHeader>
          <CardContent className="h-48">
            <div className="w-full h-full bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground">
              Activity Chart Placeholder
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}