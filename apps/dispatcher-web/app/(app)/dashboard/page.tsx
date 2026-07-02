'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, DollarSign, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingIndicator } from '@/components/ui/loading';
import { TrendChart } from '@/components/ui/charts';
import { http } from '@/lib/http';
import { subscribeConnectionState, subscribeRealtimeEvents } from '@/lib/socket';

interface DashboardOverview {
  activeAssignments: number;
  assignedAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
}

const DashboardPage = () => {
  const [socketConnected, setSocketConnected] = useState(false);

  const overview = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await http.get<DashboardOverview>('/dashboard/overview');
      return response.data;
    },
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const unsubscribeEvents = subscribeRealtimeEvents(
      [
        'assignment.created',
        'assignment.updated',
        'assignment.assigned',
        'assignment.status_changed',
        'assignment.completed',
        'courier.status_changed',
      ],
      () => {
        void overview.refetch();
      },
    );

    const unsubscribeConnection = subscribeConnectionState(
      () => setSocketConnected(true),
      () => setSocketConnected(false),
    );

    return () => {
      unsubscribeEvents();
      unsubscribeConnection();
    };
  }, [overview]);

  if (overview.isLoading) {
    return <LoadingIndicator label="Loading dashboard" />;
  }

  if (overview.isError || !overview.data) {
    return <ErrorState message="Unable to load dashboard stats" onRetry={() => void overview.refetch()} />;
  }

  const cards = [
    { title: 'Active Assignments', value: overview.data.activeAssignments, icon: Activity },
    { title: 'Assigned Assignments', value: overview.data.assignedAssignments, icon: Truck },
    { title: 'Completed Assignments', value: overview.data.completedAssignments, icon: DollarSign },
    { title: 'Pending Assignments', value: overview.data.pendingAssignments, icon: AlertTriangle },
  ];

  return (
    <section className="space-y-5 animate-fade-up">
      <Breadcrumbs items={[{ label: 'Operations' }, { label: 'Dashboard' }]} />
      <h1 className="text-3xl font-semibold">SafeConnect Dispatcher Dashboard</h1>
      <p className="text-xs text-foreground/70">
        Realtime: {socketConnected ? 'Connected' : 'Reconnecting...'}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/70">{card.title}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <TrendChart
          data={[
            { label: 'Mon', value: 10 },
            { label: 'Tue', value: 12 },
            { label: 'Wed', value: 11 },
            { label: 'Thu', value: 14 },
            { label: 'Fri', value: 16 },
          ]}
        />
        <Card>
          {overview.data.pendingAssignments === 0 ? (
            <EmptyState title="No pending assignments" description="All assignments are currently staffed." />
          ) : (
            <div>
              <h3 className="text-lg font-semibold">Pending Queue</h3>
              <p className="mt-2 text-sm">
                {overview.data.pendingAssignments} assignments are waiting for courier assignment.
              </p>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default DashboardPage;
