'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingIndicator } from '@/components/ui/loading';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { AiRecommendationCard } from '@/components/assignments/ai-recommendation-card';
import { http } from '@/lib/http';
import { subscribeConnectionState, subscribeRealtimeEvents } from '@/lib/socket';

type AssignmentStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type AssignmentPriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface CourierOption {
  id: string;
  name: string;
  isOnline: boolean;
}

interface AssignmentRecord {
  id: string;
  title: string;
  description: string;
  pickupAddress: string | null;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffAddress: string | null;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  createdAt: string;
  courier: CourierOption | null;
}

type CourierRecommendationStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';

interface CourierRecommendation {
  courierId: string;
  courierName: string;
  status: CourierRecommendationStatus;
  score: number;
  etaMinutes: number | null;
  distanceMeters: number | null;
  workload: number;
  performanceScore: number;
}

interface AiRecommendationResponse {
  assignmentId: string;
  recommendations: CourierRecommendation[];
  recommendedCourier: CourierRecommendation | null;
  message: string | null;
}

interface AssignmentCreateResponse extends AssignmentRecord {
  aiRecommendations?: CourierRecommendation[];
  aiRecommendedCourier?: CourierRecommendation | null;
  aiMessage?: string | null;
}

const statusClassMap: Record<AssignmentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ASSIGNED: 'bg-sky-100 text-sky-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

const AssignmentsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<AssignmentPriority>('MEDIUM');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLatitude, setPickupLatitude] = useState('');
  const [pickupLongitude, setPickupLongitude] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLatitude, setDropoffLatitude] = useState('');
  const [dropoffLongitude, setDropoffLongitude] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [latestRecommendationResult, setLatestRecommendationResult] = useState<AiRecommendationResponse | null>(null);

  const assignmentsQuery = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const response = await http.get<AssignmentRecord[]>('/assignments');
      return response.data;
    },
    refetchInterval: 15_000,
  });

  const couriersQuery = useQuery({
    queryKey: ['assignment-couriers'],
    queryFn: async () => {
      const response = await http.get<CourierOption[]>('/assignments/couriers');
      return response.data;
    },
  });

  const recommendationsQuery = useQuery({
    queryKey: ['ai-recommendations', selectedAssignmentId],
    enabled: Boolean(selectedAssignmentId),
    queryFn: async () => {
      const response = await http.get<AiRecommendationResponse>(
        `/ai/recommend-courier?assignmentId=${selectedAssignmentId}`,
      );

      return response.data;
    },
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const markUpdated = (payload: unknown): void => {
      const wrapped = payload as { data?: { id?: string } };
      if (wrapped.data?.id) {
        setHighlightedRowId(wrapped.data.id);
        setTimeout(() => setHighlightedRowId((current) => (current === wrapped.data?.id ? null : current)), 2000);
      }

      void assignmentsQuery.refetch();
    };

    const unsubscribeEvents = subscribeRealtimeEvents(
      [
        'assignment.created',
        'assignment.updated',
        'assignment.assigned',
        'assignment.status_changed',
        'assignment.completed',
      ],
      markUpdated,
    );

    const unsubscribeConnection = subscribeConnectionState(
      () => setSocketConnected(true),
      () => setSocketConnected(false),
    );

    return () => {
      unsubscribeEvents();
      unsubscribeConnection();
    };
  }, [assignmentsQuery]);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      priority: AssignmentPriority;
      pickupAddress?: string;
      pickupLatitude?: number;
      pickupLongitude?: number;
      dropoffAddress?: string;
      dropoffLatitude?: number;
      dropoffLongitude?: number;
    }) => {
      const response = await http.post<AssignmentCreateResponse>('/assignments/create', payload);
      return response.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['assignments'] });
      const previous = queryClient.getQueryData<AssignmentRecord[]>(['assignments']) ?? [];

      const optimistic: AssignmentRecord = {
        id: `optimistic-${Date.now()}`,
        title: payload.title,
        description: payload.description,
        pickupAddress: payload.pickupAddress ?? null,
        pickupLatitude: payload.pickupLatitude ?? null,
        pickupLongitude: payload.pickupLongitude ?? null,
        dropoffAddress: payload.dropoffAddress ?? null,
        dropoffLatitude: payload.dropoffLatitude ?? null,
        dropoffLongitude: payload.dropoffLongitude ?? null,
        priority: payload.priority,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        courier: null,
      };

      queryClient.setQueryData<AssignmentRecord[]>(['assignments'], [optimistic, ...previous]);
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['assignments'], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onSuccess: (created) => {
      setSelectedAssignmentId(created.id);
      setLatestRecommendationResult({
        assignmentId: created.id,
        recommendations: created.aiRecommendations ?? [],
        recommendedCourier: created.aiRecommendedCourier ?? null,
        message: created.aiMessage ?? null,
      });
      void queryClient.invalidateQueries({ queryKey: ['ai-recommendations', created.id] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: { assignmentId: string; courierId: string }) => {
      const response = await http.patch<AssignmentRecord>(
        `/assignments/${payload.assignmentId}/assign`,
        { courierId: payload.courierId },
      );
      return response.data;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { assignmentId: string; status: AssignmentStatus }) => {
      const response = await http.patch<AssignmentRecord>(
        `/assignments/${payload.assignmentId}/status`,
        { status: payload.status },
      );
      return response.data;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const rows = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);

  useEffect(() => {
    if (!selectedAssignmentId && rows.length > 0) {
      const firstAssignmentId = rows[0]?.id;
      if (firstAssignmentId) {
        setSelectedAssignmentId(firstAssignmentId);
      }
    }
  }, [rows, selectedAssignmentId]);

  useEffect(() => {
    if (recommendationsQuery.data) {
      setLatestRecommendationResult(recommendationsQuery.data);
    }
  }, [recommendationsQuery.data]);

  const filteredRows = rows.filter((row) => {
    const term = search.toLowerCase();
    return (
      row.title.toLowerCase().includes(term) ||
      row.description.toLowerCase().includes(term) ||
      row.status.toLowerCase().includes(term)
    );
  });

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const handleCreateAssignment = async (): Promise<void> => {
    if (!title.trim() || !description.trim()) {
      return;
    }

    const parsedPickupLatitude = pickupLatitude.trim() ? Number(pickupLatitude) : undefined;
    const parsedPickupLongitude = pickupLongitude.trim() ? Number(pickupLongitude) : undefined;
    const parsedDropoffLatitude = dropoffLatitude.trim() ? Number(dropoffLatitude) : undefined;
    const parsedDropoffLongitude = dropoffLongitude.trim() ? Number(dropoffLongitude) : undefined;

    const isInvalidCoordinate =
      (parsedPickupLatitude !== undefined && Number.isNaN(parsedPickupLatitude)) ||
      (parsedPickupLongitude !== undefined && Number.isNaN(parsedPickupLongitude)) ||
      (parsedDropoffLatitude !== undefined && Number.isNaN(parsedDropoffLatitude)) ||
      (parsedDropoffLongitude !== undefined && Number.isNaN(parsedDropoffLongitude));

    if (isInvalidCoordinate) {
      return;
    }

    await createMutation.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      priority,
      pickupAddress: pickupAddress.trim() || undefined,
      pickupLatitude: parsedPickupLatitude,
      pickupLongitude: parsedPickupLongitude,
      dropoffAddress: dropoffAddress.trim() || undefined,
      dropoffLatitude: parsedDropoffLatitude,
      dropoffLongitude: parsedDropoffLongitude,
    });

    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setPickupAddress('');
    setPickupLatitude('');
    setPickupLongitude('');
    setDropoffAddress('');
    setDropoffLatitude('');
    setDropoffLongitude('');
  };

  if (assignmentsQuery.isLoading || couriersQuery.isLoading) {
    return <LoadingIndicator label="Loading assignments" />;
  }

  if (assignmentsQuery.isError || couriersQuery.isError) {
    return (
      <ErrorState
        message="Unable to load assignments data"
        onRetry={() => {
          void assignmentsQuery.refetch();
          void couriersQuery.refetch();
        }}
      />
    );
  }

  return (
    <section className="space-y-4 animate-fade-up">
      <Breadcrumbs items={[{ label: 'Operations' }, { label: 'Assignments' }]} />
      <p className="text-xs text-foreground/70">
        Realtime: {socketConnected ? 'Connected' : 'Reconnecting...'}
      </p>
      <Card>
        <h2 className="text-lg font-semibold">Create Assignment</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_auto]">
          <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Input
            placeholder="Pickup address (optional)"
            value={pickupAddress}
            onChange={(event) => setPickupAddress(event.target.value)}
          />
          <Input
            placeholder="Dropoff address (optional)"
            value={dropoffAddress}
            onChange={(event) => setDropoffAddress(event.target.value)}
          />
          <Input
            placeholder="Pickup lat"
            value={pickupLatitude}
            onChange={(event) => setPickupLatitude(event.target.value)}
          />
          <Input
            placeholder="Pickup lng"
            value={pickupLongitude}
            onChange={(event) => setPickupLongitude(event.target.value)}
          />
          <Input
            placeholder="Dropoff lat"
            value={dropoffLatitude}
            onChange={(event) => setDropoffLatitude(event.target.value)}
          />
          <Input
            placeholder="Dropoff lng"
            value={dropoffLongitude}
            onChange={(event) => setDropoffLongitude(event.target.value)}
          />
          <select
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            value={priority}
            onChange={(event) => setPriority(event.target.value as AssignmentPriority)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <Button onClick={() => void handleCreateAssignment()} disabled={createMutation.isPending}>
            Create Assignment
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search title, description, status" />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Priority</TH>
              <TH>Status</TH>
              <TH>Courier</TH>
              <TH>Assign Courier</TH>
              <TH>Update Status</TH>
            </TR>
          </THead>
          <TBody>
            {pagedRows.map((assignment) => (
              <TR
                key={assignment.id}
                className={`${highlightedRowId === assignment.id ? 'bg-primary/10 transition-colors duration-500' : ''} ${selectedAssignmentId === assignment.id ? 'ring-1 ring-primary/40' : ''}`}
                onClick={() => {
                  setSelectedAssignmentId(assignment.id);
                  void recommendationsQuery.refetch();
                }}
              >
                <TD>
                  <p className="font-medium">{assignment.title}</p>
                  <p className="text-xs text-foreground/70">{assignment.description}</p>
                </TD>
                <TD>{assignment.priority}</TD>
                <TD>
                  <span className={`rounded-full px-2 py-1 text-xs ${statusClassMap[assignment.status]}`}>
                    {assignment.status}
                  </span>
                </TD>
                <TD>{assignment.courier?.name ?? 'Unassigned'}</TD>
                <TD>
                  <select
                    className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
                    value={assignment.courier?.id ?? ''}
                    onChange={(event) => {
                      const selectedCourierId = event.target.value;
                      if (!selectedCourierId) {
                        return;
                      }

                      void assignMutation.mutateAsync({
                        assignmentId: assignment.id,
                        courierId: selectedCourierId,
                      });
                    }}
                    disabled={assignment.status === 'COMPLETED' || assignMutation.isPending}
                  >
                    <option value="">Select courier</option>
                    {(couriersQuery.data ?? []).map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.name} {courier.isOnline ? '(Online)' : '(Offline)'}
                      </option>
                    ))}
                  </select>
                </TD>
                <TD>
                  <select
                    className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
                    value={assignment.status}
                    onChange={(event) => {
                      void statusMutation.mutateAsync({
                        assignmentId: assignment.id,
                        status: event.target.value as AssignmentStatus,
                      });
                    }}
                    disabled={statusMutation.isPending || assignment.status === 'COMPLETED' || assignment.status === 'CANCELLED'}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>

        <Card className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">AI Recommendations Panel</h3>
            <p className="text-xs text-foreground/70">
              {selectedAssignmentId ? `Assignment ${selectedAssignmentId.slice(0, 8)}` : 'Select an assignment'}
            </p>
          </div>

          {recommendationsQuery.isFetching && <p className="text-xs text-foreground/70">Refreshing recommendations...</p>}

          {!latestRecommendationResult || latestRecommendationResult.recommendations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-3 text-sm text-foreground/70">
              {latestRecommendationResult?.message ?? 'No recommendations yet. Create or select an assignment.'}
            </div>
          ) : (
            <div className="space-y-3">
              {latestRecommendationResult.recommendations.slice(0, 3).map((recommendation, index) => (
                <AiRecommendationCard
                  key={recommendation.courierId}
                  courierId={recommendation.courierId}
                  courierName={recommendation.courierName}
                  score={recommendation.score}
                  etaMinutes={recommendation.etaMinutes}
                  distanceMeters={recommendation.distanceMeters}
                  status={recommendation.status}
                  isBest={index === 0}
                  disabled={!selectedAssignmentId || assignMutation.isPending}
                  onSelect={(courierId) => {
                    if (!selectedAssignmentId) {
                      return;
                    }

                    void assignMutation.mutateAsync({
                      assignmentId: selectedAssignmentId,
                      courierId,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default AssignmentsPage;
