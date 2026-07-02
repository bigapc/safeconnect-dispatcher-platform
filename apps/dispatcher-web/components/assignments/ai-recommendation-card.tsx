import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type CourierRecommendationStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';

interface AiRecommendationCardProps {
  courierId: string;
  courierName: string;
  score: number;
  etaMinutes: number | null;
  distanceMeters: number | null;
  status: CourierRecommendationStatus;
  isBest: boolean;
  onSelect: (courierId: string) => void;
  disabled?: boolean;
}

const statusClassMap: Record<CourierRecommendationStatus, string> = {
  ONLINE: 'bg-emerald-100 text-emerald-800',
  BUSY: 'bg-amber-100 text-amber-800',
  OFFLINE: 'bg-rose-100 text-rose-800',
};

const formatDistance = (distanceMeters: number | null): string => {
  if (distanceMeters === null) {
    return 'N/A';
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(2)} km`;
};

export const AiRecommendationCard = ({
  courierId,
  courierName,
  score,
  etaMinutes,
  distanceMeters,
  status,
  isBest,
  onSelect,
  disabled,
}: AiRecommendationCardProps) => {
  const scoreValue = Math.max(0, Math.min(100, score));

  return (
    <Card className={`space-y-3 ${isBest ? 'ring-2 ring-primary/50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm">{courierName}</p>
          <p className="text-xs text-foreground/70">Courier ID: {courierId.slice(0, 8)}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs ${statusClassMap[status]}`}>{status}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span>AI Score</span>
          <span>{scoreValue.toFixed(2)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${scoreValue}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-foreground/80">
        <p>ETA: {etaMinutes !== null ? `${etaMinutes} min` : 'N/A'}</p>
        <p>Distance: {formatDistance(distanceMeters)}</p>
      </div>

      <Button className="w-full" variant={isBest ? 'primary' : 'secondary'} disabled={disabled} onClick={() => onSelect(courierId)}>
        Select Courier
      </Button>
    </Card>
  );
};
