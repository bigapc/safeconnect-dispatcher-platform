'use client';

import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { calculateDistance, formatCoordinates } from '@safeconnect/maps';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingIndicator } from '@/components/ui/loading';
import { http } from '@/lib/http';
import { env } from '@/lib/env';
import { subscribeConnectionState, subscribeRealtimeEvents } from '@/lib/socket';

type CourierOperationalStatus = 'IDLE' | 'BUSY' | 'OFFLINE';
type CourierRealtimeStatus = 'ONLINE' | 'OFFLINE';
type CourierFilter = 'ALL' | 'ACTIVE' | 'IDLE' | 'BUSY';

interface CourierLocationEvent {
  courierId: string;
  latitude: number;
  longitude: number;
  organizationId: string;
  speed?: number;
  heading?: number;
  status?: CourierRealtimeStatus;
  updatedAt?: string;
}

interface CurrentAssignmentSummary {
  id: string;
  title: string;
  status: string;
}

interface CourierMapRecord {
  id: string;
  name: string;
  isOnline: boolean;
  status: CourierOperationalStatus;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastUpdatedAt: string | null;
  currentAssignment: CurrentAssignmentSummary | null;
}

interface AssignmentMapRecord {
  id: string;
  title: string;
  status: string;
  priority: string;
  courierId: string | null;
  pickupAddress: string | null;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffAddress: string | null;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  updatedAt: string;
}

interface MapStatePayload {
  couriers: CourierMapRecord[];
  assignments: AssignmentMapRecord[];
}

interface MapStateResponse {
  success: boolean;
  data: MapStatePayload;
}

const markerClassByStatus: Record<CourierOperationalStatus, string> = {
  IDLE: 'courier-marker courier-marker-online',
  BUSY: 'courier-marker courier-marker-busy',
  OFFLINE: 'courier-marker courier-marker-offline',
};

const toGeoPoint = (longitude: number, latitude: number): [number, number] => [longitude, latitude];

const hasCoordinates = (latitude: number | null, longitude: number | null): latitude is number => {
  return latitude !== null && longitude !== null;
};

const createEmptyLineFeature = (): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: [],
  },
});

const MapsPage = () => {
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [courierFilter, setCourierFilter] = useState<CourierFilter>('ALL');
  const [simulateMovement, setSimulateMovement] = useState(false);
  const [couriers, setCouriers] = useState<CourierMapRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMapRecord[]>([]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const markerRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const markerAnimationFrameRef = useRef<Map<string, number>>(new Map());

  const mapboxToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const mapStateQuery = useQuery({
    queryKey: ['courier-map-state'],
    queryFn: async () => {
      const response = await http.get<MapStateResponse>('/courier/map-state');
      return response.data;
    },
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (mapStateQuery.data?.success) {
      setCouriers(mapStateQuery.data.data.couriers);
      setAssignments(mapStateQuery.data.data.assignments);
    }
  }, [mapStateQuery.data]);

  const courierIndex = useMemo(() => {
    const byId = new Map<string, CourierMapRecord>();
    for (const courier of couriers) {
      byId.set(courier.id, courier);
    }

    return byId;
  }, [couriers]);

  const filteredCouriers = useMemo(() => {
    return couriers.filter((courier) => {
      if (courierFilter === 'ALL') {
        return true;
      }

      if (courierFilter === 'ACTIVE') {
        return courier.status !== 'OFFLINE';
      }

      if (courierFilter === 'IDLE') {
        return courier.status === 'IDLE';
      }

      return courier.status === 'BUSY';
    });
  }, [couriers, courierFilter]);

  const visibleAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      return (
        hasCoordinates(assignment.pickupLatitude, assignment.pickupLongitude) ||
        hasCoordinates(assignment.dropoffLatitude, assignment.dropoffLongitude)
      );
    });
  }, [assignments]);

  const selectedAssignment = useMemo(() => {
    if (!selectedAssignmentId) {
      return null;
    }

    return assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null;
  }, [assignments, selectedAssignmentId]);

  const selectedCourier = useMemo(() => {
    if (!selectedCourierId) {
      return null;
    }

    return couriers.find((courier) => courier.id === selectedCourierId) ?? null;
  }, [couriers, selectedCourierId]);

  useEffect(() => {
    const onRealtimeEvent = (payload: unknown): void => {
      const event = payload as Partial<CourierLocationEvent> & { data?: Partial<CourierLocationEvent> };
      const courierId = event.courierId ?? event.data?.courierId;
      const latitude = event.latitude ?? event.data?.latitude;
      const longitude = event.longitude ?? event.data?.longitude;
      const status = event.status ?? event.data?.status;

      if (courierId && latitude !== undefined && longitude !== undefined) {
        setCouriers((current) =>
          current.map((courier) => {
            if (courier.id !== courierId) {
              return courier;
            }

            const nextStatus: CourierOperationalStatus =
              status === 'OFFLINE'
                ? 'OFFLINE'
                : courier.currentAssignment
                  ? 'BUSY'
                  : 'IDLE';

            return {
              ...courier,
              status: nextStatus,
              isOnline: status === 'OFFLINE' ? false : true,
              lastLatitude: latitude,
              lastLongitude: longitude,
              lastUpdatedAt: event.updatedAt ?? event.data?.updatedAt ?? new Date().toISOString(),
            };
          }),
        );

        return;
      }

      void mapStateQuery.refetch();
    };

    const unsubscribeEvents = subscribeRealtimeEvents(
      [
        'courier.location_updated',
        'courier.status_changed',
        'assignment.created',
        'assignment.updated',
        'assignment.assigned',
        'assignment.status_changed',
        'assignment.completed',
      ],
      onRealtimeEvent,
    );

    const unsubscribeConnection = subscribeConnectionState(
      () => setSocketConnected(true),
      () => setSocketConnected(false),
    );

    return () => {
      unsubscribeEvents();
      unsubscribeConnection();
    };
  }, [mapStateQuery]);

  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-97.7431, 30.2672],
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      mapLoadedRef.current = true;

      map.addSource('pickup-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addSource('dropoff-points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addSource('assignment-route', {
        type: 'geojson',
        data: createEmptyLineFeature(),
      });

      map.addLayer({
        id: 'pickup-layer',
        type: 'circle',
        source: 'pickup-points',
        paint: {
          'circle-radius': 7,
          'circle-color': '#0ea5e9',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'dropoff-layer',
        type: 'circle',
        source: 'dropoff-points',
        paint: {
          'circle-radius': 7,
          'circle-color': '#ef4444',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'assignment-route-layer',
        type: 'line',
        source: 'assignment-route',
        paint: {
          'line-color': '#0f8b6d',
          'line-width': 5,
          'line-opacity': 0.9,
        },
      });
    });

    mapRef.current = map;

    return () => {
      for (const frameId of markerAnimationFrameRef.current.values()) {
        cancelAnimationFrame(frameId);
      }

      markerAnimationFrameRef.current.clear();

      for (const marker of markerRef.current.values()) {
        marker.remove();
      }

      markerRef.current.clear();
      mapLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) {
      return;
    }

    const pickupSource = map.getSource('pickup-points') as mapboxgl.GeoJSONSource | undefined;
    const dropoffSource = map.getSource('dropoff-points') as mapboxgl.GeoJSONSource | undefined;

    if (!pickupSource || !dropoffSource) {
      return;
    }

    const pickupFeatures: GeoJSON.Feature<GeoJSON.Point>[] = visibleAssignments
      .filter((assignment) => hasCoordinates(assignment.pickupLatitude, assignment.pickupLongitude))
      .map((assignment) => ({
        type: 'Feature',
        properties: {
          assignmentId: assignment.id,
          title: assignment.title,
          markerType: 'pickup',
        },
        geometry: {
          type: 'Point',
          coordinates: toGeoPoint(assignment.pickupLongitude as number, assignment.pickupLatitude as number),
        },
      }));

    const dropoffFeatures: GeoJSON.Feature<GeoJSON.Point>[] = visibleAssignments
      .filter((assignment) => hasCoordinates(assignment.dropoffLatitude, assignment.dropoffLongitude))
      .map((assignment) => ({
        type: 'Feature',
        properties: {
          assignmentId: assignment.id,
          title: assignment.title,
          markerType: 'dropoff',
        },
        geometry: {
          type: 'Point',
          coordinates: toGeoPoint(assignment.dropoffLongitude as number, assignment.dropoffLatitude as number),
        },
      }));

    pickupSource.setData({
      type: 'FeatureCollection',
      features: pickupFeatures,
    });

    dropoffSource.setData({
      type: 'FeatureCollection',
      features: dropoffFeatures,
    });
  }, [visibleAssignments]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) {
      return;
    }

    const animateMarker = (
      courierId: string,
      marker: mapboxgl.Marker,
      longitude: number,
      latitude: number,
    ): void => {
      const current = marker.getLngLat();
      const startLongitude = current.lng;
      const startLatitude = current.lat;
      const targetLongitude = longitude;
      const targetLatitude = latitude;
      const startTime = performance.now();
      const durationMs = 850;

      const previousFrame = markerAnimationFrameRef.current.get(courierId);
      if (previousFrame) {
        cancelAnimationFrame(previousFrame);
      }

      const tick = (frameTime: number): void => {
        const progress = Math.min((frameTime - startTime) / durationMs, 1);
        const easedProgress = progress * (2 - progress);
        const nextLongitude = startLongitude + (targetLongitude - startLongitude) * easedProgress;
        const nextLatitude = startLatitude + (targetLatitude - startLatitude) * easedProgress;

        marker.setLngLat([nextLongitude, nextLatitude]);

        if (progress < 1) {
          const frameId = requestAnimationFrame(tick);
          markerAnimationFrameRef.current.set(courierId, frameId);
          return;
        }

        markerAnimationFrameRef.current.delete(courierId);
      };

      const frameId = requestAnimationFrame(tick);
      markerAnimationFrameRef.current.set(courierId, frameId);
    };

    const activeMarkerIds = new Set<string>();

    for (const courier of couriers) {
      if (!hasCoordinates(courier.lastLatitude, courier.lastLongitude)) {
        continue;
      }

      activeMarkerIds.add(courier.id);

      const existingMarker = markerRef.current.get(courier.id);
      if (existingMarker) {
        animateMarker(courier.id, existingMarker, courier.lastLongitude as number, courier.lastLatitude as number);
        existingMarker.getElement().className = markerClassByStatus[courier.status];
        continue;
      }

      const element = document.createElement('button');
      element.type = 'button';
      element.className = markerClassByStatus[courier.status];
      element.ariaLabel = `Courier ${courier.name}`;
      element.title = `${courier.name} (${courier.status})`;
      element.addEventListener('click', () => {
        setSelectedCourierId(courier.id);
      });

      const marker = new mapboxgl.Marker({ element, anchor: 'center' })
        .setLngLat([courier.lastLongitude as number, courier.lastLatitude as number])
        .addTo(map);

      markerRef.current.set(courier.id, marker);
    }

    for (const [courierId, marker] of markerRef.current.entries()) {
      if (activeMarkerIds.has(courierId)) {
        continue;
      }

      marker.remove();
      markerRef.current.delete(courierId);
      const frameId = markerAnimationFrameRef.current.get(courierId);
      if (frameId) {
        cancelAnimationFrame(frameId);
        markerAnimationFrameRef.current.delete(courierId);
      }
    }
  }, [couriers]);

  useEffect(() => {
    if (!selectedAssignmentId || !mapboxToken) {
      return;
    }

    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) {
      return;
    }

    const assignment = assignments.find((item) => item.id === selectedAssignmentId);
    if (!assignment) {
      return;
    }

    if (!hasCoordinates(assignment.pickupLatitude, assignment.pickupLongitude)) {
      return;
    }

    if (!hasCoordinates(assignment.dropoffLatitude, assignment.dropoffLongitude)) {
      return;
    }

    if (!assignment.courierId) {
      return;
    }

    const courier = courierIndex.get(assignment.courierId);
    if (!courier) {
      return;
    }

    if (!hasCoordinates(courier.lastLatitude, courier.lastLongitude)) {
      return;
    }

    const source = map.getSource('assignment-route') as mapboxgl.GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    const points = [
      toGeoPoint(courier.lastLongitude as number, courier.lastLatitude as number),
      toGeoPoint(assignment.pickupLongitude as number, assignment.pickupLatitude as number),
      toGeoPoint(assignment.dropoffLongitude as number, assignment.dropoffLatitude as number),
    ];

    const coordinatesPath = points.map(([longitude, latitude]) => `${longitude},${latitude}`).join(';');
    const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesPath}?geometries=geojson&overview=full&access_token=${mapboxToken}`;

    const abortController = new AbortController();

    const renderRoute = async (): Promise<void> => {
      const response = await fetch(routeUrl, { signal: abortController.signal });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        routes?: Array<{ geometry?: GeoJSON.LineString }>;
      };

      const geometry = payload.routes?.[0]?.geometry;
      if (!geometry) {
        source.setData(createEmptyLineFeature());
        return;
      }

      source.setData({
        type: 'Feature',
        properties: {
          assignmentId: assignment.id,
        },
        geometry,
      });

      const routePoints = geometry.coordinates
        .map((position) => {
          const longitude = position[0];
          const latitude = position[1];
          if (longitude === undefined || latitude === undefined) {
            return null;
          }

          return [longitude, latitude] as [number, number];
        })
        .filter((point): point is [number, number] => point !== null);

      if (routePoints.length < 2) {
        return;
      }

      const bounds = routePoints.reduce(
        (currentBounds, [longitude, latitude]) => currentBounds.extend([longitude, latitude]),
        new mapboxgl.LngLatBounds(routePoints[0], routePoints[0]),
      );

      map.fitBounds(bounds, {
        padding: 60,
        duration: 700,
      });
    };

    void renderRoute();

    return () => {
      abortController.abort();
    };
  }, [assignments, courierIndex, mapboxToken, selectedAssignmentId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current || !selectedCourier) {
      return;
    }

    if (!hasCoordinates(selectedCourier.lastLatitude, selectedCourier.lastLongitude)) {
      return;
    }

    map.flyTo({
      center: [selectedCourier.lastLongitude as number, selectedCourier.lastLatitude as number],
      zoom: Math.max(map.getZoom(), 12),
      duration: 600,
      essential: true,
    });
  }, [selectedCourier]);

  useEffect(() => {
    if (!simulateMovement) {
      return;
    }

    const interval = setInterval(() => {
      const candidates = couriers.filter((courier) => hasCoordinates(courier.lastLatitude, courier.lastLongitude));
      if (candidates.length === 0) {
        return;
      }

      const randomIndex = Math.floor(Math.random() * candidates.length);
      const target = candidates[randomIndex];
      if (!target) {
        return;
      }

      const nextLatitude = (target.lastLatitude as number) + (Math.random() - 0.5) * 0.0018;
      const nextLongitude = (target.lastLongitude as number) + (Math.random() - 0.5) * 0.0018;

      void http.patch('/courier/location', {
        courierId: target.id,
        latitude: nextLatitude,
        longitude: nextLongitude,
        speed: 20 + Math.round(Math.random() * 30),
        heading: Math.round(Math.random() * 360),
      });
    }, 4_000);

    return () => {
      clearInterval(interval);
    };
  }, [couriers, simulateMovement]);

  if (mapStateQuery.isLoading) {
    return <LoadingIndicator label="Loading map operations" />;
  }

  if (mapStateQuery.isError) {
    return <ErrorState message="Unable to load map state" onRetry={() => void mapStateQuery.refetch()} />;
  }

  if (!mapboxToken) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={[{ label: 'Operations' }, { label: 'Maps' }]} />
        <ErrorState message="NEXT_PUBLIC_MAPBOX_TOKEN is missing. Add it to apps/dispatcher-web/.env and reload." />
      </section>
    );
  }

  return (
    <section className="space-y-4 animate-fade-up">
      <Breadcrumbs items={[{ label: 'Operations' }, { label: 'Maps' }]} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          Realtime: <span className={socketConnected ? 'text-primary' : 'text-amber-700'}>{socketConnected ? 'Connected' : 'Reconnecting...'}</span>
        </div>
        <Button variant="secondary" onClick={() => setSimulateMovement((current) => !current)}>
          {simulateMovement ? 'Stop GPS Simulation' : 'Start GPS Simulation'}
        </Button>
      </div>

      <div className="grid gap-4 lg:h-[calc(100vh-13rem)] lg:grid-cols-[22rem_1fr]">
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">Operations Feed</h2>
            <p className="text-xs text-foreground/70">Track couriers and assignments in real-time.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['ALL', 'ACTIVE', 'IDLE', 'BUSY'] as CourierFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setCourierFilter(filter)}
                  className={`rounded-full px-3 py-1 text-xs ${courierFilter === filter ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="mb-2 text-sm font-semibold">Couriers ({filteredCouriers.length})</h3>
            <div className="space-y-2">
              {filteredCouriers.map((courier) => (
                <button
                  key={courier.id}
                  type="button"
                  onClick={() => setSelectedCourierId(courier.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selectedCourierId === courier.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/40'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{courier.name}</span>
                    <span className="text-xs text-foreground/70">{courier.status}</span>
                  </div>
                  {hasCoordinates(courier.lastLatitude, courier.lastLongitude) ? (
                    <p className="mt-1 text-xs text-foreground/70">
                      {formatCoordinates({ latitude: courier.lastLatitude as number, longitude: courier.lastLongitude as number })}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-foreground/70">No location yet</p>
                  )}
                  {courier.currentAssignment ? (
                    <p className="mt-1 text-xs text-foreground/70">On assignment: {courier.currentAssignment.title}</p>
                  ) : null}
                </button>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Assignments ({visibleAssignments.length})</h3>
            <div className="space-y-2">
              {visibleAssignments.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => {
                    setSelectedAssignmentId(assignment.id);
                    if (assignment.courierId) {
                      setSelectedCourierId(assignment.courierId);
                    }
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${selectedAssignmentId === assignment.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/40'}`}
                >
                  <p className="font-medium">{assignment.title}</p>
                  <p className="text-xs text-foreground/70">{assignment.status} • {assignment.priority}</p>
                </button>
              ))}
            </div>

            {selectedAssignment && selectedCourier && hasCoordinates(selectedCourier.lastLatitude, selectedCourier.lastLongitude) && hasCoordinates(selectedAssignment.pickupLatitude, selectedAssignment.pickupLongitude) ? (
              <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3 text-xs text-foreground/80">
                <p className="font-semibold">Distance To Pickup</p>
                <p>
                  {(calculateDistance(
                    {
                      latitude: selectedCourier.lastLatitude as number,
                      longitude: selectedCourier.lastLongitude as number,
                    },
                    {
                      latitude: selectedAssignment.pickupLatitude as number,
                      longitude: selectedAssignment.pickupLongitude as number,
                    },
                  ) / 1000).toFixed(2)} km
                </p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="h-[65vh] overflow-hidden p-0 lg:h-full">
          <div ref={mapContainerRef} className="h-full w-full" />
        </Card>
      </div>
    </section>
  );
};

export default MapsPage;
