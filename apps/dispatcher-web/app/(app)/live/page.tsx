'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { env } from '@/lib/env';

interface GpsEvent {
  courierId: string;
  latitude: number;
  longitude: number;
}

const LivePage = () => {
  const [events, setEvents] = useState<GpsEvent[]>([]);

  useEffect(() => {
    const socket: Socket = io(env.NEXT_PUBLIC_SOCKET_URL ?? env.NEXT_PUBLIC_API_URL, {
      path: '/socket.io',
      withCredentials: true,
    });

    socket.on('gps:updated', (payload: GpsEvent) => {
      setEvents((current) => [payload, ...current].slice(0, 20));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <section className="space-y-4">
      <Breadcrumbs items={[{ label: 'Operations' }, { label: 'Live Activity' }]} />
      <Card>
        <h2 className="text-lg font-semibold">Realtime Courier Feed</h2>
        <div className="mt-3 space-y-2 text-sm">
          {events.length === 0 ? (
            <p className="text-foreground/70">No live GPS events received yet.</p>
          ) : (
            events.map((event, index) => (
              <p key={`${event.courierId}-${index}`}>
                Courier {event.courierId} at {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
              </p>
            ))
          )}
        </div>
      </Card>
    </section>
  );
};

export default LivePage;
